import json, urllib.request
from http.server import BaseHTTPRequestHandler
from fc_clubs_api import HEADERS
U = "https://proclubs.ea.com/api/fc/clubs/info?platform=common-gen5&clubIds=654106"
EXTRA = {"origin": "https://proclubs.ea.com", "referer": "https://proclubs.ea.com/", "sec-fetch-mode": "cors",
         "sec-fetch-dest": "empty", "sec-ch-ua-mobile": "?0", "sec-ch-ua-platform": '"Windows"'}
def go(h):
    try:
        with urllib.request.urlopen(urllib.request.Request(U, headers=h), timeout=15) as r: return r.status
    except urllib.error.HTTPError as e: return e.code
    except Exception as e: return str(e)[:80]
class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        out = {"base": go(HEADERS), "extra": go({**HEADERS, **EXTRA})}
        try:
            out["ip"] = urllib.request.urlopen("https://api.ipify.org", timeout=5).read().decode()
        except Exception: pass
        self.send_response(200); self.send_header("Content-Type", "application/json"); self.send_header("Cache-Control", "no-store"); self.end_headers()
        self.wfile.write(json.dumps(out).encode())
