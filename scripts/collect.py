"""Fetch IONIA FC data from EA Pro Clubs, archive raw matches, build site/data.json."""

from __future__ import annotations

import json
import sys
import time
import urllib.request
from pathlib import Path

from fc_clubs_api import FC27API

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "site" / "api"))
from _ea import CLUB_ID, MATCH_TYPES, PLATFORM, convert, crests  # noqa: E402

CLUB_NAME = "IONIA FC"
RAW = ROOT / "data" / "raw"
MATCHES = RAW / "matches"
OPPS = RAW / "opponents"
SITE = ROOT / "site"
OUT = SITE / "data.json"


def write_json(path: Path, data) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, sort_keys=True, indent=1) + "\n")


def fetch(api: FC27API) -> None:
    club = {
        "info": api.get_json("clubs/info", {"clubIds": CLUB_ID}),
        "overall": api.get_json("clubs/overallStats", {"clubIds": CLUB_ID}),
        "members": api.get_json("members/stats", {"clubId": CLUB_ID}),
        "career": api.get_json("members/career/stats", {"clubId": CLUB_ID}),
    }
    new = 0
    for match_type in MATCH_TYPES:
        time.sleep(1)
        matches = api.get_json(
            "clubs/matches", {"clubIds": CLUB_ID, "matchType": match_type, "maxResultCount": 10}
        ) or []
        for match in matches:
            path = MATCHES / f"{match['matchId']}.json"
            if not path.exists():
                match["_matchType"] = match_type
                write_json(path, match)
                new += 1
    extras = {
        "season": lambda: [c for c in api.search_club_by_name(CLUB_NAME, scope="current_season", output="raw")
                           if str(c.get("clubId")) == CLUB_ID],
        "playoffs": lambda: api.get_playoff_achievements(int(CLUB_ID), output="raw"),
    }
    for key, call in extras.items():
        time.sleep(1)
        try:
            club[key] = call()
        except Exception as exc:  # optional data; keep going
            print(f"{key} failed: {exc}")
    write_json(RAW / "club.json", club)
    print(f"new matches: {new}")
    fetch_opponents(api)


def fetch_opponents(api: FC27API, limit: int = 12, max_age: int = 86400) -> None:
    ids = set()
    for path in MATCHES.glob("*.json"):
        ids.update(c for c in json.loads(path.read_text()).get("clubs", {}) if c != CLUB_ID)
    now, done = int(time.time()), 0
    for cid in sorted(ids):
        path = OPPS / f"{cid}.json"
        if path.exists() and now - json.loads(path.read_text()).get("_fetched", 0) < max_age:
            continue
        if done >= limit:
            break
        time.sleep(1)
        try:
            stats = (api.get_json("clubs/overallStats", {"clubIds": cid}) or [{}])[0]
        except Exception as exc:
            print(f"opponent {cid} failed: {exc}")
            continue
        stats["_fetched"] = now
        write_json(path, stats)
        done += 1
    print(f"opponents refreshed: {done}")


def opponents() -> dict:
    out = {}
    for path in OPPS.glob("*.json"):
        o = json.loads(path.read_text())
        num = lambda k: int(float(o.get(k) or 0))
        out[path.stem] = {"sr": num("skillRating"), "div": num("bestDivision"), "gp": num("gamesPlayed"),
                          "w": num("wins"), "d": num("ties"), "l": num("losses")}
    return out


def download_crest(urls: list) -> None:
    for url in urls:
        try:
            req = urllib.request.Request(url, headers={"user-agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=20) as resp:
                body = resp.read()
            if body[:4] == b"\x89PNG":
                (SITE / "crest.png").write_bytes(body)
                return
        except OSError:
            continue


def build(fetch_error: str | None = None) -> None:
    club_raw = json.loads((RAW / "club.json").read_text())
    info = club_raw["info"][CLUB_ID]
    matches = []
    for path in MATCHES.glob("*.json"):
        m = convert(json.loads(path.read_text()))
        if m:
            matches.append(m)
    matches.sort(key=lambda x: -x["ts"])
    overall = (club_raw["overall"] or [{}])[0]
    data = {
        "updated": int(time.time()),
        "fetchError": fetch_error,
        "club": {
            "name": info["name"],
            "stadium": info.get("customKit", {}).get("stadName", ""),
            "crest": crests(info),
            "overall": overall,
            "members": (club_raw["members"] or {}).get("members", []),
            "career": (club_raw["career"] or {}).get("members", []),
            "kit": info.get("customKit", {}),
            "season": {k: (club_raw.get("season") or [{}])[0].get(k) for k in ("points", "cleanSheets", "reputationtier", "currentDivision")},
            "playoffs": club_raw.get("playoffs") or [],
        },
        "matches": matches,
        "opps": opponents(),
    }
    download_crest(data["club"]["crest"])
    OUT.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")))
    print(f"built {OUT.relative_to(ROOT)}: {len(matches)} matches")


if __name__ == "__main__":
    error = None
    if "--build-only" not in sys.argv:
        try:
            fetch(FC27API(platform=PLATFORM))
        except Exception as exc:  # keep the site up with archived data
            error = f"{type(exc).__name__}: {exc}"[:300]
            print(f"fetch failed: {error}", file=sys.stderr)
    build(error)
