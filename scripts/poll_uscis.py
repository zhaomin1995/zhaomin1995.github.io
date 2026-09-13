#!/usr/bin/env python3
"""
Daily poll of the official USCIS Case Status API.

Two jobs, depending on which environment is configured:

  sandbox (now)      Calls the API with USCIS's staging receipt numbers. Nothing
                     is written to the site - staging data is fictional and has
                     no business appearing on a page about a real case. The point
                     is to prove the integration and to accumulate the API traffic
                     USCIS requires before granting production access.

  production (later) Calls the API with the real receipt numbers in USCIS_RECEIPTS
                     and writes assets/data/uscis/<receipt>.json, which the case
                     page can then prefer over the third-party dataset.

Exit codes:
  0  success
  2  the sandbox is outside its service window (Mon-Fri 07:00-20:00 US Eastern);
     a scheduled run that hits this is skipped, not failed
  1  anything actually wrong
"""

import datetime as dt
import json
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import uscis_case_status as api  # noqa: E402  (path set up immediately above)

# USCIS's published staging receipts. The first has history in its payload, which
# is the shape the case page's timeline consumes.
SANDBOX_RECEIPTS = ["EAC9999103403", "EAC9999103402"]

OUT_DIR = os.path.join("assets", "data", "uscis")


def receipts(env_name):
    """Receipts to poll: USCIS_RECEIPTS if set, else the staging defaults."""
    configured = os.environ.get("USCIS_RECEIPTS", "").strip()
    if configured:
        return [r.strip().upper() for r in configured.split(",") if r.strip()]
    if env_name == "production":
        raise SystemExit(
            "USCIS_ENV=production but USCIS_RECEIPTS is empty. Set it to the "
            "receipt number(s) to track, comma separated."
        )
    return SANDBOX_RECEIPTS


def normalize(body):
    """
    Reduce a Case Status response to the fields the case page renders.

    USCIS has shipped the history under more than one key, so both are accepted
    and anything unrecognised is kept verbatim rather than dropped.
    """
    case = body.get("case_status") or body
    history_raw = case.get("hist_case_status") or case.get("hist_case_data") or []
    if isinstance(history_raw, dict):
        history_raw = [history_raw]

    history = []
    for item in history_raw:
        if not isinstance(item, dict):
            continue
        history.append({
            "date": item.get("date") or item.get("completed_text_en"),
            "status": item.get("hist_case_status_text_en") or item.get("completed_text_en"),
            "detail": item.get("hist_case_status_desc_en"),
        })

    return {
        "receipt": case.get("receiptNumber"),
        "form": case.get("formType"),
        "submitted": case.get("submittedDate"),
        "modified": case.get("modifiedDate"),
        "status": case.get("current_case_status_text_en"),
        "detail": case.get("current_case_status_desc_en"),
        "history": history,
        "fetched_at": dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "source": "USCIS Case Status API",
    }


def write_case(record):
    """Persist one case, leaving fetched_at out of the comparison.

    Rewriting the file every day purely because the timestamp moved would make a
    commit a day and bury real status changes in the noise.
    """
    os.makedirs(OUT_DIR, exist_ok=True)
    path = os.path.join(OUT_DIR, record["receipt"] + ".json")

    if os.path.exists(path):
        try:
            with open(path, encoding="utf-8") as fh:
                existing = json.load(fh)
            comparable = dict(record, fetched_at=existing.get("fetched_at"))
            if comparable == existing:
                return path, False
        except (ValueError, OSError):
            pass  # unreadable or malformed: just overwrite it

    with open(path, "w", encoding="utf-8") as fh:
        json.dump(record, fh, indent=1, ensure_ascii=False)
        fh.write("\n")
    return path, True


def main():
    env_name, _ = api.endpoints()
    targets = receipts(env_name)
    print("environment : %s" % env_name)
    print("receipts    : %d" % len(targets))

    token, expires_at = api.get_token()
    print("token       : ok (%d chars, expires in %ds)" % (len(token), int(expires_at - time.time())))

    failures = 0
    closed = False
    changed = []

    for receipt in targets:
        # A token lasts 30 minutes and there is no refresh token, so for a long
        # list just fetch a fresh one when the current one is nearly spent.
        if time.time() > expires_at - 60:
            token, expires_at = api.get_token()

        status, body = api.get_case(receipt, token)
        message = ((body.get("error") or {}).get("message")
                   if isinstance(body.get("error"), dict) else None)

        if status == 200:
            record = normalize(body)
            print("  %s  HTTP 200  %s" % (receipt, record["status"] or "—"))
            # Staging cases are fictional; never let them onto the site.
            if env_name == "production":
                path, wrote = write_case(record)
                if wrote:
                    changed.append(path)
                    print("      wrote %s" % path)
        elif status == 503 and message and api.CLOSED_HINT in message:
            print("  %s  HTTP 503  outside the sandbox service window" % receipt)
            closed = True
            break
        else:
            failures += 1
            print("  %s  HTTP %d  %s" % (receipt, status, message or json.dumps(body)[:160]))

        time.sleep(0.2)  # stay far under the 10 TPS ceiling

    if closed:
        print("Sandbox is closed (Mon-Fri 07:00-20:00 US Eastern); nothing to do.")
        return 2
    if failures:
        print("%d receipt(s) failed." % failures)
        return 1

    print("Done. %d file(s) changed." % len(changed))
    return 0


if __name__ == "__main__":
    sys.exit(main())
