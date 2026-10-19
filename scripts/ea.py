"""Shared EA match conversion for scripts/collect.py."""

from fc_clubs_api.assets import crest_url_candidates
from fc_clubs_api.events import decode_events

CLUB_ID = "654106"
PLATFORM = "common-gen5"
MATCH_TYPES = {"leagueMatch": "Lig", "playoffMatch": "Playoff", "friendlyMatch": "Hazırlık"}

INT_FIELDS = {
    "goals": "goals", "assists": "assists", "shots": "shots", "passattempts": "passAtt",
    "passesmade": "passMade", "tackleattempts": "tklAtt", "tacklesmade": "tklMade",
    "mom": "mom", "redcards": "red", "saves": "saves", "secondsPlayed": "sec",
}


def crests(details, team=None):
    kit = details.get("customKit", {})
    return crest_url_candidates(
        team=team,
        team_id=details.get("teamId"),
        crest_asset_id=kit.get("crestAssetId"),
        selected_kit_type=kit.get("selectedKitType"),
    )


def player(raw):
    row = {"name": raw.get("playername", "?"), "pos": raw.get("pos", ""), "arch": raw.get("archetypeid", ""),
           "rating": float(raw.get("rating") or 0)}
    for src, dst in INT_FIELDS.items():
        row[dst] = int(float(raw.get(src) or 0))
    row["ev"] = {k: v for k, v in decode_events(raw).items() if v}
    return row


def convert(m, match_type=None):
    clubs = m["clubs"]
    if CLUB_ID not in clubs or len(clubs) < 2:
        return None
    opp_id = next(c for c in clubs if c != CLUB_ID)
    us, them = clubs[CLUB_ID], clubs[opp_id]
    opp_details = them.get("details") or {}
    return {
        "id": m["matchId"],
        "ts": int(m["timestamp"]),
        "type": MATCH_TYPES.get(match_type or m.get("_matchType"), "Lig"),
        "gf": int(us.get("goals") or 0),
        "ga": int(them.get("goals") or 0),
        "dnf": "1" in (us.get("winnerByDnf"), them.get("winnerByDnf")),
        "opp": {"id": opp_id, "name": opp_details.get("name", "?"), "crest": crests(opp_details, them.get("TEAM"))},
        "us": [player(p) for p in m["players"].get(CLUB_ID, {}).values()],
        "them": [player(p) for p in m["players"].get(opp_id, {}).values()],
    }
