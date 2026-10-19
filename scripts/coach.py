"""AI coach: builds per-player findings from site/data.json and writes site/coach.json.

Uses Gemini when GEMINI_API_KEY is set; otherwise (or on error) falls back to rule-based tips.
Advice is only regenerated when a player has played new matches.
"""
import hashlib
import json
import os
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "site" / "data.json"
OUT = ROOT / "site" / "coach.json"
MODELS = [m for m in [os.environ.get("GEMINI_MODEL"), "gemini-flash-latest", "gemini-3.8-flash"] if m]
VERSION = 2

ARCH = {"1": "Shot Stopper", "2": "Sweeper Keeper", "3": "Progressor", "4": "Boss", "5": "Disruptor",
        "6": "Marauder", "7": "Recycler", "8": "Maestro", "9": "Creator", "10": "Spark",
        "11": "Magician", "12": "Finisher", "13": "Target"}
POS = {"forward": "Forvet", "midfielder": "Orta saha", "defender": "Defans", "goalkeeper": "Kaleci"}
GRP = {"forward": "fw", "midfielder": "mf", "defender": "df", "goalkeeper": "gk"}


def ev(p, *keys):
    return sum(p["ev"].get(k, 0) for k in keys)


LOST = ("possessionLostDefensiveThird", "possessionLostMiddleThird", "possessionLostAttackingThird")
WON = ("possessionWonDefensiveThird", "possessionWonMiddleThird", "possessionWonAttackingThird")

# key: (label, value fn, direction, groups, kind) — kind "rate" = (num, den) summed over matches
METRICS = {
    "goals": ("Gol", lambda p: p["goals"], 1, "fw mf", None),
    "assists": ("Asist", lambda p: p["assists"], 1, "fw mf", None),
    "sa": ("2. asist", lambda p: ev(p, "secondAssists"), 1, "fw mf", None),
    "shots": ("Şut", lambda p: p["shots"], 1, "fw", None),
    "shotAcc": ("Şut isabeti %", lambda p: (ev(p, "shotsOnTarget"), p["shots"]), 1, "fw mf", "rate"),
    "passAcc": ("Pas isabeti %", lambda p: (ev(p, "passesCompleted"), ev(p, "passesCompleted", "passesFailed")), 1, "fw mf df gk", "rate"),
    "tp": ("Ara pas", lambda p: ev(p, "throughPasses"), 1, "mf", None),
    "drb": ("Dribbling", lambda p: ev(p, "dribblesCompleted"), 1, "fw mf", None),
    "aerial": ("Hava topu", lambda p: ev(p, "aerialDuelsWonAttacking", "aerialDuelsWonDefending"), 1, "fw df", None),
    "int": ("Interception", lambda p: ev(p, "interceptions"), 1, "mf df", None),
    "tw": ("Kazanılan tackle", lambda p: ev(p, "tacklesWon"), 1, "mf df", None),
    "won": ("Top kazanma", lambda p: ev(p, *WON), 1, "mf df", None),
    "lost": ("Top kaybı", lambda p: ev(p, *LOST), -1, "fw mf df", None),
    "lostDef": ("Kendi yarı sahada top kaybı", lambda p: ev(p, "possessionLostDefensiveThird"), -1, "mf df", None),
    "failFwd": ("Başarısız ileri pas", lambda p: ev(p, "passesFailedForward"), -1, "mf df", None),
    "oop": ("Pozisyon dışı", lambda p: ev(p, "outOfPosition"), -1, "fw mf df", None),
    "oopBad": ("Ciddi pozisyon hatası", lambda p: ev(p, "outOfPositionSeverity3"), -1, "mf df", None),
    "elsewhere": ("'Başka yere pas vermeliydin'", lambda p: ev(p, "feedbackShouldHavePassedElsewhere"), -1, "fw mf df", None),
    "useBall": ("'Topu kullan' uyarısı", lambda p: ev(p, "feedbackUseTheBall"), -1, "fw mf df", None),
    "offside": ("Ofsayta düşen pas", lambda p: ev(p, "offsidePasses"), -1, "mf", None),
    "tklLost": ("Kaybedilen tackle", lambda p: ev(p, "tacklesLost"), -1, "mf df", None),
    "danger": ("Tehlikeli müdahale", lambda p: ev(p, "dangerousTackles"), -1, "mf df", None),
    "saves": ("Kurtarış", lambda p: p.get("saves", 0), 1, "gk", None),
}

RULES = {
    "lost": ("Baskı altındayken çalıma girme, topu kaptırıyorsun.", "Rakip yaklaşınca tek-iki dokunuşla en yakın arkadaşına ver, çalımı boş alana sakla."),
    "lostDef": ("Kendi yarı sahanda riskli pas ve çalım deneme.", "Geride güvenli oyna: kenara ya da kaleciye ver, top ileride kaybedilsin."),
    "passAcc": ("Kapalı arkadaşa zorlama pas atma.", "Pası atmadan önce kafayı kaldır, açıkta olana kısa pas ver."),
    "failFwd": ("Her topu ileriye zorlama.", "İleri pas kapalıysa yana ya da geriye ver, oyunu yeniden kur."),
    "shotAcc": ("Kötü açıdan ve uzaktan şut çekme.", "Bir pas daha yap, ceza sahasında açı bulunca vur."),
    "shots": ("Topu alınca hep pasa bakma.", "Ceza sahası çevresinde fırsat bulunca kaleyi dene, forvetten şut bekleniyor."),
    "oop": ("Topsuzken yerini bırakıp topun peşine koşma.", "Mevkinde kal, rakip top kaybedince boşlukta hazır ol."),
    "oopBad": ("Savunmada çizgini bozma.", "Top kaybında hemen kendi bölgene dön, arkadaşının yerini kapatmaya çalışma."),
    "elsewhere": ("İlk gördüğün arkadaşa pas verme.", "Pas öncesi sahayı tara, daha iyi pozisyondaki oyuncuyu ara."),
    "useBall": ("Topu ayağında bekletme.", "Topu alınca hemen karar ver: pas, şut ya da boş alana sür."),
    "offside": ("Arkadaş çizgiyi beklemeden ara pas atma.", "Ara pası arkadaşın koşuya çıkarken at."),
    "tklLost": ("Her topa dalarak girme.", "Önünü kapat, rakip topu açınca müdahale et."),
    "danger": ("Arkadan ve yandan sert müdahale yapma.", "Kademeli savunma yap, faul vermeden yolu kapat."),
    "int": ("Adam markajına takılıp kalma.", "Pas yolunu oku, top gelmeden araya gir."),
    "won": ("Topu kaybedince yürüme.", "Top kaybından sonra 3 saniye bas, topu geri kazan."),
    "tw": ("Topu rakibe bırakma.", "İkili mücadelede zamanlamayla gir, kazandığın topu hemen arkadaşa ver."),
    "aerial": ("Hava topunda geride bekleme.", "Topun düşeceği yere erken git, gövdeyle pozisyon al."),
    "tp": ("Hep yana pas verme.", "Forvet koşuya çıkınca ara pası dene."),
    "drb": ("Boş alanda topu hemen verme.", "Önün açıksa topu sür, savunmayı üstüne çek."),
    "sa": ("Son pası hep kendin atmaya çalışma.", "Asisti yapacak arkadaşa ver, ön pası hazırla."),
    "goals": ("Pozisyonu harcayan acele vuruşlar yapma.", "Kaleciyle karşı karşıyayken plase vur."),
    "assists": ("Ceza sahasında topu tutma.", "Daha iyi pozisyondaki arkadaşa son pası ver."),
    "saves": ("Çizgide geç tepki verme.", "Şut gelmeden kalecini doğru açıya yerleştir."),
}


def val(fn, kind, players):
    if not players:
        return None
    if kind == "rate":
        num = den = 0
        for p in players:
            a, b = fn(p)
            num, den = num + a, den + b
        return num / den * 100 if den else None
    return sum(fn(p) for p in players) / len(players)


def sessions(matches):
    out = []
    for m in sorted(matches, key=lambda x: -x["ts"]):
        if out and out[-1]["start"] - m["ts"] < 3 * 3600:
            out[-1]["ms"].append(m)
            out[-1]["start"] = m["ts"]
        else:
            out.append({"ms": [m], "start": m["ts"], "end": m["ts"]})
    return out


def compare(me, base, keys):
    rows = []
    for k in keys:
        label, fn, d, _, kind = METRICS[k]
        a, b = val(fn, kind, me), val(fn, kind, base)
        if a is None or b is None or (b == 0 and a == 0):
            continue
        diff = ((a - b) / b * 100 * d) if b else (100.0 * d if a else 0.0)
        rows.append({"k": k, "l": label, "me": round(a, 2), "av": round(b, 2), "diff": round(diff), "dir": d})
    return rows


def findings(name, matches):
    mine = [(m, p) for m in matches for p in m["us"] if p["name"] == name]
    if not mine:
        return None
    arch_count, pos_count = {}, {}
    for _, p in mine:
        arch_count[p["arch"]] = arch_count.get(p["arch"], 0) + 1
        pos_count[p["pos"]] = pos_count.get(p["pos"], 0) + 1
    arch = max(arch_count, key=arch_count.get)
    pos = max(pos_count, key=pos_count.get)
    grp = GRP.get(pos, "fw")
    keys = [k for k, v in METRICS.items() if grp in v[3].split()]
    me = [p for _, p in mine]
    peers = [p for m in matches for p in m["us"] + m["them"] if p["arch"] == arch and p["name"] != name]
    same = [p for p in peers if p["pos"] == pos]
    bench = same if len(same) >= 5 else peers or [p for m in matches for p in m["us"] + m["them"] if p["pos"] == pos and p["name"] != name]
    vs_arch = compare(me, bench, keys)
    ordered = sorted(mine, key=lambda x: -x[0]["ts"])
    recent = [p for _, p in ordered[:5]]
    older = [p for _, p in ordered[5:]]
    trend = compare(recent, older, keys) if len(older) >= 3 else []
    rating = lambda ps: round(sum(p["rating"] for p in ps) / len(ps), 2) if ps else None
    ss = sessions(matches)
    night = None
    if ss:
        nm = [p for m in ss[0]["ms"] for p in m["us"] if p["name"] == name]
        rest = [p for m in matches if m not in ss[0]["ms"] for p in m["us"] if p["name"] == name]
        if nm:
            night = {"start": ss[0]["start"], "n": len(nm), "rating": rating(nm), "baseRating": rating(rest),
                     "goals": sum(p["goals"] for p in nm), "assists": sum(p["assists"] for p in nm),
                     "vsSelf": compare(nm, rest, keys) if len(rest) >= 3 else []}
    other = {ARCH.get(a, a): c for a, c in arch_count.items() if a != arch}
    return {"name": name, "n": len(mine), "arch": ARCH.get(arch, arch), "pos": POS.get(pos, pos),
            "otherArch": other, "bench": len(bench), "rating": rating(me), "recentRating": rating(recent),
            "vsArch": vs_arch, "trend": trend, "night": night,
            "hash": hashlib.sha1(json.dumps(sorted(m["id"] for m, _ in mine)).encode()).hexdigest()[:12]}


def rule_tips(f):
    weak = sorted([r for r in f["vsArch"] if r["diff"] <= -10 and r["k"] in RULES], key=lambda r: r["diff"])[:3]
    strong = sorted([r for r in f["vsArch"] if r["diff"] >= 10], key=lambda r: -r["diff"])[:2]
    num = lambda r: f"{r['me']:.1f}".rstrip("0").rstrip(".")
    dont = [f"{RULES[r['k']][0]} ({r['l']}: maç başı {num(r)}, {f['arch']} ortalaması {r['av']:.1f})" for r in weak[:2]]
    do = [RULES[r["k"]][1] for r in weak]
    keep = [f"{r['l'].replace(' %', '')} güçlü yanın ({f['arch']}'lardan %{abs(r['diff'])} iyi), böyle devam." for r in strong]
    if weak:
        w = weak[0]
        gap = (f"{f['arch']}'ların {w['me'] / w['av']:.1f} katı" if w["dir"] == -1 and w["av"] and w["me"] / w["av"] >= 2
               else f"{f['arch']}'lara göre %{abs(w['diff'])} geride")
        summary = f"En büyük eksiğin {w['l'].lower()}: {gap}."
    else:
        summary = f"{f['arch']} olarak ortalamanın altında kaldığın belirgin bir alan yok."
    night = None
    if f["night"]:
        nt = f["night"]
        base = f" (normalde {nt['baseRating']:.1f})" if nt["baseRating"] else ""
        night = f"{nt['n']} maçta ortalama {nt['rating']:.1f} puan{base}, {nt['goals']} gol {nt['assists']} asist."
        worst = sorted([r for r in nt["vsSelf"] if r["diff"] <= -20], key=lambda r: r["diff"])
        if worst:
            night += f" {worst[0]['l']} normalinden kötüydü ({worst[0]['me']:.1f}, normalde {worst[0]['av']:.1f})."
    return {"summary": summary, "dont": dont, "do": do or ["Oynadığın gibi devam et, maç biriktikçe öneriler netleşecek."], "keep": keep, "night": night}


PROMPT = """Sen EA SPORTS FC 27 Pro Clubs için bir futbol hocasısın. Türkçe, samimi ve kısa konuş, oyuncuya "sen" diye hitap et.
Aşağıda {name} adlı oyuncunun kayıtlı maç istatistikleri var. Arketip: {arch}, mevki: {pos}, {n} maç.
Kıyas: aynı arketiple oynayan {bench} oyuncu-maç (rakipler dahil). diff: + iyi, - kötü (az olması iyi olanlarda yön çevrildi).

ARKETİP KIYASI (maç başı):
{vs_arch}

SON 5 MAÇ, ÖNCEKİLERE GÖRE:
{trend}

SON GECE:
{night}

Kurallar:
- Sadece yukarıdaki sayılara dayan, veri uydurma. Sayı verirken buradakileri kullan.
- Tavsiyeler maçta uygulanabilir somut kararlar olsun (pas, pozisyon, şut, savunma davranışı). Tuş kombinasyonu ya da oyunda olmayan özellik uydurma.
- Örnek az ise (10 maçtan az) bunu bir kez kısaca belirt.
- Sayıları en fazla 1 ondalıkla yaz (7.3 gibi), yüzdeleri tam sayı yaz (%72 gibi).
- "Dün" deme, "son gece" de.
- Hakaret yok, hafif takılma serbest.

JSON döndür:
summary: tek cümle genel durum
dont: "bunu yapma" maddeleri (en fazla 3, her biri tek cümle)
do: "bunu yap" maddeleri (en fazla 3, her biri tek cümle)
keep: güçlü yanlar, böyle devam (en fazla 2)
night: son gece için tek cümle not (son gece oynamadıysa boş string)"""

SCHEMA = {"type": "OBJECT", "properties": {
    "summary": {"type": "STRING"}, "dont": {"type": "ARRAY", "items": {"type": "STRING"}},
    "do": {"type": "ARRAY", "items": {"type": "STRING"}}, "keep": {"type": "ARRAY", "items": {"type": "STRING"}},
    "night": {"type": "STRING"}}, "required": ["summary", "dont", "do", "keep", "night"]}


def lines(rows):
    return "\n".join(f"- {r['l']}: {r['me']:.1f} (kıyas {r['av']:.1f}, diff {r['diff']:+d}%)" for r in rows) or "- veri yok"


def prompt(f):
    nt = f["night"]
    night = "Son gece oynamadı." if not nt else (
        f"{nt['n']} maç, ort. puan {nt['rating']} (normalde {nt['baseRating']}), {nt['goals']} gol, {nt['assists']} asist.\n"
        f"Kendi normaline göre:\n{lines(nt['vsSelf'])}")
    return PROMPT.format(name=f["name"], arch=f["arch"], pos=f["pos"], n=f["n"], bench=f["bench"],
                         vs_arch=lines(f["vsArch"]), trend=lines(f["trend"]) if f["trend"] else "- yeterli maç yok", night=night)


def ask_gemini(text, key):
    errors = []
    for model in MODELS:
        for attempt in range(3):
            try:
                return ask_model(model, text, key), model
            except urllib.error.HTTPError as exc:
                try:
                    msg = json.load(exc)["error"]["message"]
                except Exception:
                    msg = ""
                err = f"{model} HTTP {exc.code}: {msg[:160]}"
                if exc.code in (429, 500, 503) and attempt < 2:
                    time.sleep(20 * (attempt + 1))
                    continue
                errors.append(err)
                if exc.code in (400, 401, 403):
                    raise RuntimeError(err)
                break
            except (urllib.error.URLError, TimeoutError, ValueError, KeyError) as exc:
                if attempt < 2:
                    time.sleep(10)
                    continue
                errors.append(f"{model} {type(exc).__name__}: {str(exc)[:120]}")
                break
    raise RuntimeError(" | ".join(errors))


def ask_model(model, text, key):
    body = {"contents": [{"role": "user", "parts": [{"text": text}]}],
            "generationConfig": {"temperature": 0.6, "responseMimeType": "application/json", "responseSchema": SCHEMA}}
    req = urllib.request.Request(
        f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
        data=json.dumps(body).encode(), headers={"Content-Type": "application/json", "x-goog-api-key": key})
    with urllib.request.urlopen(req, timeout=180) as r:
        res = json.load(r)
    out = json.loads(res["candidates"][0]["content"]["parts"][0]["text"])
    return {k: (out.get(k) or ([] if k in ("dont", "do", "keep") else "")) for k in SCHEMA["required"]}


def main():
    data = json.loads(DATA.read_text())
    prev = json.loads(OUT.read_text()) if OUT.exists() else {}
    prev_p = prev.get("players", {}) if prev.get("v") == VERSION else {}
    key = os.environ.get("GEMINI_API_KEY", "").strip()
    force = "--force" in sys.argv
    names = sorted({p["name"] for m in data["matches"] for p in m["us"]})
    players, errors = {}, []
    for n in names:
        f = findings(n, data["matches"])
        if not f:
            continue
        old = prev_p.get(n)
        if old and old.get("hash") == f["hash"] and not force and (old.get("source") == "ai" or not key):
            players[n] = old
            continue
        tips, source, model = rule_tips(f), "rules", None
        if key:
            try:
                (tips, model), source = ask_gemini(prompt(f), key), "ai"
            except Exception as exc:
                err = f"{type(exc).__name__}: {str(exc)[:240]}".replace(key, "***")
                errors.append(err)
                print(f"gemini failed for {n}: {err}", file=sys.stderr)
        if not f["night"]:
            tips["night"] = ""
        players[n] = {**tips, "source": source, "model": model, "hash": f["hash"],
                      "n": f["n"], "arch": f["arch"], "pos": f["pos"], "nightStart": f["night"]["start"] if f["night"] else None,
                      "updated": int(time.time())}
    ai_error = errors[0] if errors else None
    if prev.get("v") == VERSION and prev.get("players") == players and prev.get("aiError") == ai_error:
        print("coach: no changes")
        return
    OUT.write_text(json.dumps({"v": VERSION, "updated": int(time.time()), "aiError": ai_error, "players": players}, ensure_ascii=False, indent=1) + "\n")
    print(f"coach: {len(players)} players, " + ", ".join(f"{n}={p['source']}" for n, p in players.items()))


if __name__ == "__main__":
    if "--prompt" in sys.argv:
        d = json.loads(DATA.read_text())
        print(prompt(findings(sys.argv[sys.argv.index("--prompt") + 1], d["matches"])))
    else:
        main()
