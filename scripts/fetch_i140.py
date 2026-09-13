#!/usr/bin/env python3
"""
Fetch the I-140 case dataset behind the public Power BI report and write it out
as compact per-block JSON files consumed by pages/i140.html and pages/i140-case.html.

Data source: the "I-140 Application Tracker" Power BI report published to web by
anto58. A published-to-web report exposes an unauthenticated query endpoint, so we
issue one query per block, once a day.

Stdlib only (no pip install) so it runs both locally and on a GitHub Actions runner.

Usage:
    python scripts/fetch_i140.py                 # all blocks -> assets/data/i140/
    python scripts/fetch_i140.py --blocks 3      # first 3 blocks only (smoke test)
    python scripts/fetch_i140.py --only IOE09229 # a single named block
"""

import argparse
import datetime as dt
import gzip
import json
import os
import sys
import time
import urllib.error
import urllib.request

# -- Public report identity ----------------------------------------------------
# The resource key is the `k` field of the report's share URL; it is what makes
# the public endpoint accept our unauthenticated queries.
# The resource key is base64-encoded into the report's share URL (the `k` field).
# If the author ever republishes under a new link, set POWERBI_RESOURCE_KEY
# rather than editing code.
RESOURCE_KEY = os.environ.get("POWERBI_RESOURCE_KEY") or "39891ddf-f60f-42c9-9d3b-051301753316"
API_HOST = "https://wabi-south-central-us-c-primary-api.analysis.windows.net"
QUERY_URL = API_HOST + "/public/reports/querydata?synchronous=true"
META_URL = API_HOST + "/public/reports/{key}/modelsAndExploration?preferReadOnlySession=true"

ENTITY = "db_API"          # the report's single fact table
BLOCK_COL = "Grupo"        # receipt-number block, e.g. "IOE09229"

# Fallbacks used if metadata discovery fails: discovery keeps us working across
# republishes of the upstream report, these keep us working if it changes shape.
FALLBACK = {
    "model_id": 830318,
    "dataset_id": "e74d2f55-b3c0-4bba-9312-4a3867d21279",
    "report_id": "4ae3a1e9-1935-46d4-bf0e-1e574f2eadf6",
    "visual_id": "98188e7439fc1bba9c9d",
}

# All stored dates are integer offsets from this day, which keeps the JSON small
# and the daily git diff quiet.
EPOCH = dt.date(2000, 1, 1)
EPOCH_MS = int(dt.datetime(2000, 1, 1, tzinfo=dt.timezone.utc).timestamp() * 1000)

# DSR marks null cells with a key that is the literal Unicode slashed-O.
NULL_MASK_KEY = "Ø"

# Beyond this, the upstream dataset is treated as no longer maintained and the
# run emits a warning. (It froze on 2025-06-16 once already.)
STALE_AFTER_DAYS = 14

HEADERS = {
    "Accept": "application/json, text/plain, */*",
    "Content-Type": "application/json;charset=UTF-8",
    "X-PowerBI-ResourceKey": RESOURCE_KEY,
    "User-Agent": "Mozilla/5.0 (compatible; zhaomin1995.github.io i140 fetcher)",
}


# -- HTTP ----------------------------------------------------------------------
def _request(url, payload=None, retries=4):
    """POST (or GET when payload is None) with exponential backoff."""
    body = json.dumps(payload).encode("utf-8") if payload is not None else None
    last = None
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, data=body, headers=HEADERS)
            with urllib.request.urlopen(req, timeout=120) as resp:
                raw = resp.read()
                if resp.headers.get("Content-Encoding") == "gzip":
                    raw = gzip.decompress(raw)
                return json.loads(raw.decode("utf-8"))
        except Exception as exc:
            last = exc
            if attempt < retries - 1:
                wait = 2 ** attempt
                print("    request failed (%s), retrying in %ds" % (exc, wait), file=sys.stderr)
                time.sleep(wait)
    raise RuntimeError("request to %s failed after %d attempts: %s" % (url, retries, last))


def discover():
    """Read modelId / datasetId / reportId off the published report."""
    try:
        meta = _request(META_URL.format(key=RESOURCE_KEY))
        models = meta.get("models") or []
        exploration = meta.get("exploration") or {}
        sections = exploration.get("sections") or []

        visual_id = FALLBACK["visual_id"]
        if sections:
            containers = sections[0].get("visualContainers") or []
            if containers and containers[0].get("objectId"):
                visual_id = containers[0]["objectId"]

        model_id = models[0]["id"] if models else FALLBACK["model_id"]
        dataset_id = (models[0].get("dbName") if models else None) or FALLBACK["dataset_id"]
        found = {
            "model_id": model_id,
            "dataset_id": dataset_id,
            "report_id": exploration.get("reportId") or FALLBACK["report_id"],
            "visual_id": visual_id,
        }
        print("  discovered model=%s dataset=%s" % (found["model_id"], found["dataset_id"]))
        return found
    except Exception as exc:  # discovery is best-effort; the constants still work
        print("  metadata discovery failed (%s), using fallback ids" % exc, file=sys.stderr)
        return dict(FALLBACK)


# -- Query construction --------------------------------------------------------
def _col(prop):
    """A column reference in the semantic-query dialect."""
    return {"Column": {"Expression": {"SourceRef": {"Source": "d1"}}, "Property": prop}}


def _named(prop, name):
    """A column reference carrying the output name the response is keyed by."""
    ref = _col(prop)
    ref["Name"] = name
    return ref


def _envelope(ids, query, projections, window):
    """Wrap a semantic query in the payload shape the public endpoint expects."""
    return {
        "version": "1.0.0",
        "queries": [{
            "Query": {"Commands": [{"SemanticQueryDataShapeCommand": {
                "Query": query,
                "Binding": {
                    "Primary": {"Groupings": [{"Projections": projections}]},
                    # DataVolume 3 plus a window larger than the row count returns
                    # everything in one response (no restart-token paging needed).
                    "DataReduction": {"DataVolume": 3, "Primary": {"Window": {"Count": window}}},
                    "Version": 1,
                },
                "ExecutionMetricsKind": 1,
            }}]},
            "QueryId": "",
            "ApplicationContext": {
                "DatasetId": ids["dataset_id"],
                "Sources": [{"ReportId": ids["report_id"], "VisualId": ids["visual_id"]}],
            },
        }],
        "cancelQueries": [],
        "modelId": ids["model_id"],
    }


def _parse_dsr(response):
    """
    Decode Power BI's DSR wire format into plain rows.

    Three layers of compression are in play:
      * ValueDicts   - a column may send an index into a per-response string table
                       (the column's schema entry carries `DN`, the dict name).
      * `R` bitmask  - bit i set means "column i repeats the previous row's value",
                       and the value is omitted from `C`.
      * null bitmask - bit i set means "column i is null", also omitted from `C`.
    """
    ds = response["results"][0]["result"]["data"]["dsr"]["DS"][0]
    dicts = ds.get("ValueDicts") or {}
    rows_in = (ds.get("PH") or [{}])[0].get("DM0") or []
    if not rows_in:
        return []

    schema = rows_in[0].get("S") or []
    width = len(schema)
    dict_names = [c.get("DN") for c in schema]

    out = []
    previous = [None] * width
    for row in rows_in:
        values = row.get("C") or []
        repeat_mask = row.get("R", 0)
        null_mask = row.get(NULL_MASK_KEY, 0)
        current = [None] * width
        cursor = 0
        for i in range(width):
            bit = 1 << i
            if null_mask & bit:
                current[i] = None
            elif repeat_mask & bit:
                current[i] = previous[i]
            elif cursor < len(values):
                raw = values[cursor]
                cursor += 1
                name = dict_names[i]
                # A dictionary-encoded column sends an int index, but a value the
                # dictionary does not cover is sent inline as the literal itself.
                if name and isinstance(raw, int) and not isinstance(raw, bool):
                    table = dicts.get(name) or []
                    current[i] = table[raw] if 0 <= raw < len(table) else raw
                else:
                    current[i] = raw
        out.append(current)
        previous = current
    return out


def fetch_blocks(ids):
    """Distinct blocks with their case counts."""
    query = {
        "Version": 2,
        "From": [{"Name": "d1", "Entity": ENTITY, "Type": 0}],
        "Select": [
            _named(BLOCK_COL, "%s.%s" % (ENTITY, BLOCK_COL)),
            {"Aggregation": {"Expression": _col("caseId"), "Function": 2}, "Name": "count"},
        ],
    }
    rows = _parse_dsr(_request(QUERY_URL, _envelope(ids, query, [0, 1], 5000)))
    return [(r[0], int(r[1] or 0)) for r in rows if r[0]]


def fetch_block_rows(ids, block):
    """Every case in one block: caseId, status, USCIS status date, last-seen time."""
    query = {
        "Version": 2,
        "From": [{"Name": "d1", "Entity": ENTITY, "Type": 0}],
        "Select": [
            _named("caseId", "%s.caseId" % ENTITY),
            _named("status", "%s.status" % ENTITY),
            _named("date", "%s.date" % ENTITY),
            _named("updated_at", "%s.updated_at" % ENTITY),
        ],
        "Where": [{"Condition": {"In": {
            "Expressions": [_col(BLOCK_COL)],
            "Values": [[{"Literal": {"Value": "'%s'" % block}}]],
        }}}],
    }
    return _parse_dsr(_request(QUERY_URL, _envelope(ids, query, [0, 1, 2, 3], 200000)))


# -- Encoding ------------------------------------------------------------------
def _days(ms):
    """Epoch-ms -> whole days since EPOCH. Day resolution keeps diffs small."""
    if ms is None or isinstance(ms, bool) or not isinstance(ms, (int, float)):
        return None
    return int((ms - EPOCH_MS) // 86400000)


def encode_block(block, rows, status_index):
    """
    Compact one block into rows of [idSuffix, statusIdx, dateDays, seenDays].

    A caseId is 13 chars (8-char block prefix + 5 digits), so only the 5-digit
    tail is stored. Rows are sorted by case id so that a daily re-fetch produces a
    line-level diff instead of rewriting the whole file.
    """
    encoded = []
    for case_id, status, date_ms, seen_ms in rows:
        if not case_id:
            continue
        tail = case_id[len(block):]
        if case_id.startswith(block) and tail.isdigit():
            ident = int(tail)
        else:
            ident = case_id  # unexpected shape: keep it verbatim rather than drop it
        if status not in status_index:
            status_index[status] = len(status_index)
        encoded.append([ident, status_index[status], _days(date_ms), _days(seen_ms)])
    # Strings sort after ints so the two kinds never compare against each other.
    encoded.sort(key=lambda r: (1, str(r[0])) if isinstance(r[0], str) else (0, r[0]))
    return encoded


def write_block_file(path, block, encoded):
    """Write JSON with one case per line - valid JSON, and git-diff friendly."""
    lines = [
        "{",
        '"block": %s,' % json.dumps(block),
        '"count": %d,' % len(encoded),
        '"rows": [',
    ]
    last = len(encoded) - 1
    for i, row in enumerate(encoded):
        lines.append(json.dumps(row, separators=(",", ":")) + ("," if i < last else ""))
    lines.append("]}")
    with open(path, "w", encoding="utf-8") as fh:
        fh.write("\n".join(lines) + "\n")


def load_index(index_path):
    """Previous index.json, or an empty shell when there is none yet."""
    if os.path.exists(index_path):
        try:
            with open(index_path, encoding="utf-8") as fh:
                return json.load(fh)
        except (ValueError, OSError):
            pass
    return {}


def load_status_index(previous):
    """
    Reuse the status numbering from the previous run so a new status appended
    upstream does not renumber - and therefore rewrite - every block file.
    """
    return {name: i for i, name in enumerate(previous.get("statuses") or [])}


def main():
    parser = argparse.ArgumentParser(description="Fetch I-140 tracker data into static JSON.")
    parser.add_argument("--out", default="assets/data/i140", help="output directory")
    parser.add_argument("--blocks", type=int, default=0, help="limit to the first N blocks")
    parser.add_argument("--only", default="", help="fetch a single named block")
    args = parser.parse_args()

    print("Discovering report metadata...")
    ids = discover()

    print("Fetching block list...")
    blocks = fetch_blocks(ids)
    if args.only:
        blocks = [b for b in blocks if b[0] == args.only]
    if args.blocks:
        blocks = blocks[:args.blocks]
    print("  %d blocks, %d cases total" % (len(blocks), sum(n for _, n in blocks)))

    os.makedirs(args.out, exist_ok=True)
    index_path = os.path.join(args.out, "index.json")
    previous = load_index(index_path)

    # One global status dictionary shared by every block file; the pages load
    # index.json first, so block files only ever carry integer indices.
    status_index = load_status_index(previous)

    # Summaries for blocks we are not fetching this run must survive: a partial
    # run (--only / --blocks) must not drop the rest from index.json.
    kept = {b["block"]: b for b in (previous.get("blocks") or [])}

    for n, (block, expected) in enumerate(blocks, 1):
        print("[%d/%d] %s (%d cases)" % (n, len(blocks), block, expected))
        rows = fetch_block_rows(ids, block)
        encoded = encode_block(block, rows, status_index)
        write_block_file(os.path.join(args.out, block + ".json"), block, encoded)
        dates = [r[2] for r in encoded if r[2] is not None]
        seen = [r[3] for r in encoded if r[3] is not None]
        kept[block] = {
            "block": block,
            "count": len(encoded),
            "first": min(dates) if dates else None,
            "last": max(dates) if dates else None,
            "seen": max(seen) if seen else None,
        }
        time.sleep(0.4)  # be a polite neighbour to the upstream service

    summaries = [kept[b] for b in sorted(kept)]

    statuses = [name for name, _ in sorted(status_index.items(), key=lambda kv: kv[1])]

    # How current the DATA is, which is a different question from when we last
    # fetched it. The upstream tracker can keep serving a frozen dataset
    # indefinitely, so the pages must show this date, not generated_at.
    seen_days = [b["seen"] for b in summaries if b.get("seen") is not None]
    data_as_of = (EPOCH + dt.timedelta(days=max(seen_days))).isoformat() if seen_days else None
    age_days = (dt.date.today() - (EPOCH + dt.timedelta(days=max(seen_days)))).days if seen_days else None

    index = {
        "generated_at": dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "data_as_of": data_as_of,
        "data_age_days": age_days,
        "epoch": EPOCH.isoformat(),
        "source": "Power BI report 'I-140 Application Tracker' by anto58",
        "statuses": statuses,
        "blocks": summaries,
    }
    with open(index_path, "w", encoding="utf-8") as fh:
        json.dump(index, fh, indent=1)
        fh.write("\n")

    print("Wrote %d block files + index.json to %s" % (len(summaries), args.out))
    print("Data is current as of %s (%s days old)" % (data_as_of, age_days))

    # Surface staleness in the Actions run summary. The upstream dataset has
    # been frozen before; a silently frozen source looks exactly like "no news".
    if age_days is not None and age_days > STALE_AFTER_DAYS:
        print("::warning::Upstream I-140 data has not advanced since %s (%d days). "
              "The tracker's author may have stopped refreshing it."
              % (data_as_of, age_days))


if __name__ == "__main__":
    main()
