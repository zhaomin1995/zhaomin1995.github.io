#!/usr/bin/env python3
"""
Client for the official USCIS Torch "Case Status" API.

This is the path off the third-party Power BI dataset: for Zhaomin's own case
USCIS itself serves the status, the notice text and the update history, so the
tracker stops depending on anyone else's service.

Credentials are read from the environment (a local .env is loaded as a
convenience, and real environment variables win over it). They are never
printed, never passed on a command line, and .env is gitignored.

    USCIS_CLIENT_ID      from developer.uscis.gov -> your Developer Team App
    USCIS_CLIENT_SECRET  same place; treat as a password
    USCIS_ENV            "sandbox" (default) or "production"

Sandbox only resolves USCIS's own staging receipt numbers (EAC9999103403 and
friends); real receipts work only once production access is granted.

Usage:
    python scripts/uscis_case_status.py --receipt EAC9999103403
    python scripts/uscis_case_status.py --receipt EAC9999103403 --json
"""

import argparse
import datetime as dt
import gzip
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

# -- Endpoints -----------------------------------------------------------------
# Sandbox is api-int; the production host is issued with production access, so it
# is overridable rather than guessed at.
ENVIRONMENTS = {
    "sandbox": {
        "token": "https://api-int.uscis.gov/oauth/accesstoken",
        "case": "https://api-int.uscis.gov/case-status/",
    },
    "production": {
        "token": os.environ.get("USCIS_PROD_TOKEN_URL", "https://api.uscis.gov/oauth/accesstoken"),
        "case": os.environ.get("USCIS_PROD_CASE_URL", "https://api.uscis.gov/case-status/"),
    },
}

USER_AGENT = "zhaomin1995.github.io case tracker"


# -- Credentials ---------------------------------------------------------------
def load_dotenv(path=".env"):
    """
    Read KEY=VALUE lines from .env into os.environ without overwriting anything
    already set, so CI secrets take precedence over a stale local file.
    """
    if not os.path.exists(path):
        return
    with open(path, encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, value = line.partition("=")
            os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


def credentials():
    """The configured client id/secret, or a clear error naming what is missing."""
    load_dotenv()
    client_id = os.environ.get("USCIS_CLIENT_ID", "").strip()
    client_secret = os.environ.get("USCIS_CLIENT_SECRET", "").strip()
    missing = [name for name, value in
               (("USCIS_CLIENT_ID", client_id), ("USCIS_CLIENT_SECRET", client_secret))
               if not value]
    if missing:
        raise SystemExit(
            "Missing %s. Put them in .env (gitignored) or set them in the "
            "environment. See developer.uscis.gov -> your Developer Team App."
            % " and ".join(missing)
        )
    return client_id, client_secret


def endpoints():
    name = os.environ.get("USCIS_ENV", "sandbox").strip().lower()
    if name not in ENVIRONMENTS:
        raise SystemExit("USCIS_ENV must be 'sandbox' or 'production', got %r" % name)
    return name, ENVIRONMENTS[name]


# -- HTTP ----------------------------------------------------------------------
def _read(response):
    raw = response.read()
    if response.headers.get("Content-Encoding") == "gzip":
        raw = gzip.decompress(raw)
    return raw.decode("utf-8")


# The sandbox answers 503 with this explanation outside its service window.
# It is a schedule, not a fault, so there is nothing to retry.
CLOSED_HINT = "normal operation hours"


def _request(url, data=None, headers=None, retries=3):
    """
    One HTTP call with backoff.

    4xx responses are returned rather than retried: they are answers (bad
    receipt, expired token), not transport failures. 5xx responses are retried,
    but the last one is still returned with its body so the caller can show
    what the server actually said. Only a total transport failure raises.
    """
    body = data.encode("utf-8") if isinstance(data, str) else data
    last_status, last_text, last_error = None, None, None

    for attempt in range(retries):
        req = urllib.request.Request(url, data=body, headers=headers or {})
        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                return resp.status, _read(resp)
        except urllib.error.HTTPError as exc:
            text = _read(exc)
            if 400 <= exc.code < 500:
                return exc.code, text
            last_status, last_text = exc.code, text
            last_error = "HTTP %d" % exc.code
            # Closed for the day: retrying just burns six seconds.
            if CLOSED_HINT in text:
                return exc.code, text
        except Exception as exc:
            last_error = str(exc)
        if attempt < retries - 1:
            time.sleep(2 ** attempt)

    if last_status is not None:
        return last_status, last_text
    raise RuntimeError("request to %s failed: %s" % (url, last_error))


# -- API -----------------------------------------------------------------------
def get_token():
    """
    Exchange client credentials for a bearer token.

    Tokens last 30 minutes and there is no refresh token (USCIS returns
    refresh_token_expires_in: 0), so callers just ask for a new one.
    Returns (access_token, expires_at_epoch_seconds).
    """
    client_id, client_secret = credentials()
    _, urls = endpoints()

    payload = urllib.parse.urlencode({
        "grant_type": "client_credentials",
        "client_id": client_id,
        "client_secret": client_secret,
    })
    status, text = _request(
        urls["token"],
        data=payload,
        headers={"Content-Type": "application/x-www-form-urlencoded", "User-Agent": USER_AGENT},
    )

    if status != 200:
        # Deliberately does not echo the payload: it contains the secret.
        raise SystemExit(
            "Token request rejected (HTTP %d). Check the client id/secret and that "
            "the app is subscribed to the Case Status API.\nResponse: %s" % (status, text[:400])
        )

    data = json.loads(text)
    token = data.get("access_token")
    if not token:
        raise SystemExit("Token response had no access_token: %s" % text[:400])
    return token, time.time() + int(data.get("expires_in", 1799))


def get_case(receipt, token):
    """Current status for one receipt number. Returns (http_status, parsed_body)."""
    _, urls = endpoints()
    status, text = _request(
        urls["case"] + urllib.parse.quote(receipt),
        headers={"Authorization": "Bearer " + token, "Accept": "application/json",
                 "User-Agent": USER_AGENT},
    )
    try:
        return status, json.loads(text)
    except ValueError:
        return status, {"raw": text[:600]}


# -- Presentation --------------------------------------------------------------
def _fmt(value):
    """USCIS sends dates as 'DD-MM-YYYY HH:MM:SS'; fall back to the raw string."""
    if not value:
        return "—"
    for pattern in ("%d-%m-%Y %H:%M:%S", "%m-%d-%Y %H:%M:%S", "%Y-%m-%d"):
        try:
            return dt.datetime.strptime(value, pattern).strftime("%b %d, %Y")
        except (ValueError, TypeError):
            continue
    return value


def summarize(body):
    """Print the fields the case page cares about, including history if present."""
    case = body.get("case_status") or body
    print("  receipt : %s" % case.get("receiptNumber", "—"))
    print("  form    : %s" % case.get("formType", "—"))
    print("  filed   : %s" % _fmt(case.get("submittedDate")))
    print("  updated : %s" % _fmt(case.get("modifiedDate")))
    print("  status  : %s" % case.get("current_case_status_text_en", "—"))

    desc = case.get("current_case_status_desc_en") or ""
    if desc:
        flat = " ".join(desc.replace("<", " <").split())
        print("  detail  : %s%s" % (flat[:200], "…" if len(flat) > 200 else ""))

    history = case.get("hist_case_status") or case.get("hist_case_data") or []
    if isinstance(history, dict):
        history = [history]
    print("  history : %d entr%s" % (len(history), "y" if len(history) == 1 else "ies"))
    for item in history:
        if not isinstance(item, dict):
            continue
        print("      - %s  %s" % (
            _fmt(item.get("date") or item.get("completed_text_en")),
            (item.get("hist_case_status_text_en") or item.get("completed_text_en") or "")[:70]
        ))


def main():
    parser = argparse.ArgumentParser(description="Query the official USCIS Case Status API.")
    parser.add_argument("--receipt", required=True, help="receipt number, e.g. EAC9999103403")
    parser.add_argument("--json", action="store_true", help="print the raw JSON response")
    args = parser.parse_args()

    env_name, _ = endpoints()
    token, expires_at = get_token()
    # Never print the token itself, only enough to tell two tokens apart.
    print("environment : %s" % env_name)
    print("token       : ok (%d chars, ...%s, expires in %ds)"
          % (len(token), token[-4:], int(expires_at - time.time())))

    status, body = get_case(args.receipt, token)
    print("case request: HTTP %d" % status)

    if args.json:
        print(json.dumps(body, indent=2)[:4000])
    elif status == 200:
        summarize(body)
    else:
        message = ((body.get("error") or {}).get("message")
                   if isinstance(body.get("error"), dict) else None)
        print("  %s" % (message or json.dumps(body)[:400]))
        # Distinguish "closed right now" from "something is wrong", so a
        # scheduled run outside the window does not look like a failure.
        if status == 503 and message and CLOSED_HINT in message:
            print("  (the sandbox keeps business hours: Mon-Fri 07:00-20:00 US Eastern)")
            return 2

    return 0 if status == 200 else 1


if __name__ == "__main__":
    sys.exit(main())
