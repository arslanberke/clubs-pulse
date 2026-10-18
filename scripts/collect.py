"""Fetch IONIA FC data from EA Pro Clubs, archive raw matches, build site/data.json."""

from __future__ import annotations

import json
import sys
import time
import urllib.request
from pathlib import Path

from fc_clubs_api import FC27API
from fc_clubs_api.assets import crest_url_candidates
from fc_clubs_api.events import decode_events

CLUB_ID = "654106"
PLATFORM = "common-gen5"
MATCH_TYPES = {"leagueMatch": "Lig", "playoffMatch": "Playoff", "friendlyMatch": "Hazırlık"}

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "raw"
MATCHES = RAW / "matches"
SITE = ROOT / "site"
OUT = SITE / "data.json"

INT_FIELDS = {
    "goals": "goals", "assists": "assists", "shots": "shots", "passattempts": "passAtt",
    "passesmade": "passMade", "tackleattempts": "tklAtt", "tacklesmade": "tklMade",
    "mom": "mom", "redcards": "red", "saves": "saves", "secondsPlayed": "sec",
}


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
    write_json(RAW / "club.json", club)
    print(f"new matches: {new}")


def crests(details: dict, team=None) -> list:
    kit = details.get("customKit", {})
    return crest_url_candidates(
        team=team,
        team_id=details.get("teamId"),
        crest_asset_id=kit.get("crestAssetId"),
        selected_kit_type=kit.get("selectedKitType"),
    )


def player(raw: dict) -> dict:
    row = {"name": raw.get("playername", "?"), "pos": raw.get("pos", ""), "arch": raw.get("archetypeid", ""),
           "rating": float(raw.get("rating") or 0)}
    for src, dst in INT_FIELDS.items():
        row[dst] = int(float(raw.get(src) or 0))
    row["ev"] = {k: v for k, v in decode_events(raw).items() if v}
    return row


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
        m = json.loads(path.read_text())
        clubs = m["clubs"]
        if CLUB_ID not in clubs or len(clubs) < 2:
            continue
        opp_id = next(c for c in clubs if c != CLUB_ID)
        us, them = clubs[CLUB_ID], clubs[opp_id]
        opp_details = them.get("details") or {}
        matches.append({
            "id": m["matchId"],
            "ts": int(m["timestamp"]),
            "type": MATCH_TYPES.get(m.get("_matchType"), "Lig"),
            "gf": int(us.get("goals") or 0),
            "ga": int(them.get("goals") or 0),
            "dnf": "1" in (us.get("winnerByDnf"), them.get("winnerByDnf")),
            "opp": {"id": opp_id, "name": opp_details.get("name", "?"),
                    "crest": crests(opp_details, them.get("TEAM"))},
            "us": [player(p) for p in m["players"].get(CLUB_ID, {}).values()],
            "them": [player(p) for p in m["players"].get(opp_id, {}).values()],
        })
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
        },
        "matches": matches,
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
