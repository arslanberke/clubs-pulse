"""Latest matches straight from EA, so the site doesn't wait for the archive job."""

import json
import os
import sys
from concurrent.futures import ThreadPoolExecutor
from http.server import BaseHTTPRequestHandler

sys.path.insert(0, os.path.dirname(__file__))
from fc_clubs_api import FC27API  # noqa: E402
from _ea import CLUB_ID, MATCH_TYPES, PLATFORM, convert  # noqa: E402


def latest():
    api = FC27API(platform=PLATFORM)

    def one(match_type):
        raw = api.get_json("clubs/matches", {"clubIds": CLUB_ID, "matchType": match_type, "maxResultCount": 10}) or []
        return [c for c in (convert(m, match_type) for m in raw) if c]

    with ThreadPoolExecutor(len(MATCH_TYPES)) as pool:
        return [m for ms in pool.map(one, MATCH_TYPES) for m in ms]


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        try:
            body, status, cache = {"matches": latest()}, 200, "public, s-maxage=120, stale-while-revalidate=600"
        except Exception as exc:
            body, status, cache = {"error": f"{type(exc).__name__}: {str(exc)[:200]}"}, 502, "no-store"
        data = json.dumps(body, ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", cache)
        self.end_headers()
        self.wfile.write(data)
