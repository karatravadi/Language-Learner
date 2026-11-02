"""Download three Hugging Face datasets, report on them and write filtered JSONL files.

Run from data/hf:  .venv/bin/python -I scripts/process.py
Everything (cache included) stays inside data/hf.
"""
import json, os, re, statistics, sys
from collections import Counter, defaultdict
from pathlib import Path

HERE = Path(__file__).resolve().parent.parent          # data/hf
os.environ["HF_HOME"] = str(HERE / ".hf_cache")         # keep the cache in this folder
from datasets import load_dataset                       # noqa: E402

OUT = HERE / "out"
OUT.mkdir(exist_ok=True)
report = []                                              # lines for README.md
odd = []                                                 # things that looked odd

def say(s=""):
    print(s)
    report.append(s)

def words(t):
    return len(str(t or "").split())

def load_all(name):
    d = load_dataset(name)
    rows = []
    for split in d:
        print(f"{name} [{split}] {len(d[split])} rows, columns: {d[split].column_names}")
        for r in d[split]:
            r = dict(r); r["_split"] = split; rows.append(r)
    return d, rows

def pick(cols, *cands):
    for c in cands:
        if c in cols:
            return c
    sys.exit(f"None of {cands} in columns {cols}: look at the real names above and edit pick() calls")

# ---------- Spanish and French ----------
LATAM = {  # Latin American words with a different usual word in Spain
    "carro": "coche", "carros": "coches", "computadora": "ordenador", "computadoras": "ordenadores",
    "celular": "móvil", "celulares": "móviles", "manejar": "conducir", "maneja": "conduce",
    "jugo": "zumo", "jugos": "zumos", "departamento": "piso (flat)", "plata": "dinero (money)",
    "platicar": "charlar", "lindo": "bonito", "linda": "bonita", "enojado": "enfadado",
    "enojada": "enfadada", "durazno": "melocotón", "frijoles": "judías", "frijol": "judía",
    "boleto": "billete", "boletos": "billetes", "camión": "autobús (MX)", "elote": "mazorca",
    "chévere": "guay", "ahorita": "ahora", "recámara": "dormitorio", "cobija": "manta",
    "banqueta": "acera", "alberca": "piscina", "papas": "patatas", "cuadra": "manzana (block)",
    "vos": "tú", "ustedes": "vosotros (fine in Spain as formal plural; check context)",
    "pararse": "ponerse de pie", "lentes": "gafas", "anteojos": "gafas", "manejo": "conducción",
    "carpa": "tienda de campaña", "guagua": "autobús (Canaries/Caribbean)", "auto": "coche",
}
BAD = [
    (re.compile(r"https?://|www\.|\.(com|org|net|es|fr)\b", re.I), "url"),
    (re.compile(r"\.mp3|\baudio\b|\bpodcast\b|\bescucha\b|\bescuchar\b|\bécoute[rz]?\b|\bvídeo\b|\bvidéo\b", re.I), "audio"),
    (re.compile(r"\bentrevista\b|\binterview\b|^\s*[PRQ]\s*[:.-]|\n\s*[PRQ]\s*[:.-]|\n\s*[-–—]", re.I | re.M), "interview"),
]
END_OK = re.compile(r"[.!?…»\")]\s*$")

def reject_reason(t):
    t = str(t or "").strip()
    for rx, why in BAD:
        if rx.search(t):
            return why
    if not END_OK.search(t):
        return "fragment (no final punctuation)"
    first = t.lstrip("¿¡«\"'(—–- ")[:1]
    if first and first.islower():
        return "fragment (starts lowercase)"
    if t.count("(") != t.count(")") or t.count("«") != t.count("»"):
        return "fragment (unbalanced brackets/quotes)"
    return None

def cefr_lang(name, tag, latam):
    d, rows = load_all(name)
    cols = d[list(d)[0]].column_names
    tcol = pick(cols, "text", "sentence", "content")
    lcol = pick(cols, "cefr_level", "level", "cefr", "label")
    say(f"\n## {tag}: `{name}`\n")
    say(f"Columns: {', '.join('`'+c+'`' for c in cols)}. Text = `{tcol}`, level = `{lcol}`. "
        f"Splits: {', '.join(f'{s} ({len(d[s])})' for s in d)}.\n")

    by = defaultdict(list)
    for r in rows:
        by[str(r[lcol]).strip()].append(words(r[tcol]))
    say("| Level | Rows | Min | 25% | Median | 75% | Max | <20 | 20-80 | >80 |")
    say("|---|---|---|---|---|---|---|---|---|---|")
    for lv in sorted(by):
        n = sorted(by[lv])
        q = statistics.quantiles(n, n=4) if len(n) > 1 else [n[0]] * 3
        say(f"| {lv} | {len(n)} | {n[0]} | {q[0]:.0f} | {statistics.median(n):.0f} | {q[2]:.0f} | {n[-1]} | "
            f"{sum(x < 20 for x in n)} | {sum(20 <= x <= 80 for x in n)} | {sum(x > 80 for x in n)} |")
    say(f"| all | {len(rows)} | | | | | | | | |")

    texts = [str(r[tcol] or "").strip() for r in rows]
    empty = sum(1 for t in texts if not t)
    dups = len(texts) - len(set(texts))
    if empty: odd.append(f"{tag}: {empty} empty rows.")
    if dups: odd.append(f"{tag}: {dups} duplicate texts (kept only one of each in the output).")
    odd_levels = [lv for lv in by if lv.upper() not in {"A1", "A2", "B1", "B2", "C1", "C2"}]
    if odd_levels: odd.append(f"{tag}: unexpected level labels {odd_levels}.")

    keep, why, seen = [], Counter(), set()
    for r in rows:
        lv, t = str(r[lcol]).strip().upper(), str(r[tcol] or "").strip()
        if lv not in {"A2", "B1"} or not 20 <= words(t) <= 80:
            continue
        reason = reject_reason(t) or ("duplicate" if t in seen else None)
        if reason:
            why[reason] += 1; continue
        seen.add(t)
        rec = {"level": lv, "words": words(t), "text": t}
        for extra in ("title", "category", "source_name"):
            if extra in r and r[extra]:
                rec[extra] = r[extra]
        if latam:
            hits = sorted({w for w in re.findall(r"\w+", t.lower()) if w in LATAM})
            if hits:
                rec["latam_flags"] = {w: LATAM[w] for w in hits}
        keep.append(rec)
    keep.sort(key=lambda x: (x["words"], x["level"], x["text"]))
    path = OUT / f"{tag.lower()}_a2_b1_20-80.jsonl"
    with open(path, "w", encoding="utf-8") as f:
        for k in keep:
            f.write(json.dumps(k, ensure_ascii=False) + "\n")
    lv_counts = Counter(k["level"] for k in keep)
    say(f"\nSaved {len(keep)} rows to `out/{path.name}` "
        f"({', '.join(f'{a} {b}' for a, b in sorted(lv_counts.items()))}), shortest first.")
    say("Dropped: " + (", ".join(f"{b} {a}" for a, b in why.most_common()) or "none") + ".")
    if latam:
        flagged = [k for k in keep if "latam_flags" in k]
        wc = Counter(w for k in flagged for w in k["latam_flags"])
        say(f"\nLatin American vocabulary flagged in {len(flagged)} of {len(keep)} saved rows "
            f"(field `latam_flags`): " + (", ".join(f"{w} {c}" for w, c in wc.most_common()) or "none") + ".")
        say("Word-list check only: it cannot spot grammar such as ustedes for vosotros, or regional meanings.")

# ---------- Latin ----------
AUTHORS = {"Caesar": ["caesar"], "Cicero": ["cicero"], "Catullus": ["catull"], "Ovid": ["ovid"]}
READ_FIRST = ["Caesar", "Cicero"]   # plain classical prose; the usual first real authors

def latin(name):
    d, rows = load_all(name)
    cols = d[list(d)[0]].column_names
    la = pick(cols, "la", "latin", "lat")
    en = pick(cols, "en", "english", "eng")
    fc = pick(cols, "file")
    say(f"\n## Latin: `{name}`\n")
    say(f"Columns: {', '.join('`'+c+'`' for c in cols)}. Splits: {', '.join(f'{s} ({len(d[s])})' for s in d)}.\n")
    files = Counter(str(r[fc]) for r in rows)
    say(f"{len(rows)} pairs across {len(files)} distinct `file` values.\n")
    say("| file | pairs |"); say("|---|---|")
    for f_, c in files.most_common():
        say(f"| {f_} | {c} |")

    def author(f_):
        low = f_.lower()
        for a, keys in AUTHORS.items():
            if any(k in low for k in keys):
                return a
        return None
    say("")
    for a in AUTHORS:
        n = sum(c for f_, c in files.items() if author(f_) == a)
        say(f"- {a}: {'appears, ' + str(n) + ' pairs' if n else 'does not appear'}")

    keep = []
    for r in rows:
        a = author(str(r[fc]))
        if a in READ_FIRST and 6 <= words(r[la]) <= 25:
            keep.append({"author": a, "file": r[fc], "la_words": words(r[la]), "la": r[la], "en": r[en]})
    keep.sort(key=lambda x: (READ_FIRST.index(x["author"]), x["la_words"]))
    path = OUT / "latin_read_first_6-25.jsonl"
    with open(path, "w", encoding="utf-8") as f:
        for k in keep:
            f.write(json.dumps(k, ensure_ascii=False) + "\n")
    say(f"\nSaved {len(keep)} pairs ({', '.join(READ_FIRST)}, Latin 6 to 25 words) to `out/{path.name}`, "
        "text as given: no macrons added, English left as the dataset's paraphrase.")
    if not keep:
        odd.append("Latin: no Caesar or Cicero pairs matched; check the file names in the table.")
    blank = sum(1 for r in rows if not str(r[la] or "").strip() or not str(r[en] or "").strip())
    if blank: odd.append(f"Latin: {blank} pairs with an empty side.")
    if any(re.search(r"[āēīōū]", str(r[la] or "")) for r in rows[:5000]):
        odd.append("Latin: some rows do have macrons, unlike the dataset description.")

say("# Hugging Face reading data\n")
say("Made by `scripts/process.py`. Rerun it to regenerate this file and `out/`.")
cefr_lang("UniversalCEFR/hablacultura_es", "Spanish", latam=True)
cefr_lang("UniversalCEFR/kwiqiz_fr", "French", latam=False)
latin("grosenthal/latin_english_parallel")
say("\n## Odd things\n")
for o in odd or ["Nothing the script checks for (empty rows, duplicates, odd level labels, empty pairs)."]:
    say(f"- {o}")
say("- Filters are heuristics: a dropped row may be fine, and a kept one may still be a fragment. Read before use.")
(HERE / "README.md").write_text("\n".join(report) + "\n", encoding="utf-8")
