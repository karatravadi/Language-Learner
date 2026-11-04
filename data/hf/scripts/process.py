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
    "celular": "móvil", "celulares": "móviles",
    "jugo": "zumo", "jugos": "zumos", "departamento": "piso (flat)", "plata": "dinero (money)",
    "platicar": "charlar", "lindo": "bonito", "linda": "bonita", "enojado": "enfadado",
    "enojada": "enfadada", "durazno": "melocotón", "frijoles": "judías", "frijol": "judía",
    "boleto": "billete", "boletos": "billetes", "camión": "autobús (MX)", "elote": "mazorca",
    "chévere": "guay", "ahorita": "ahora", "recámara": "dormitorio", "cobija": "manta",
    "banqueta": "acera", "alberca": "piscina", "papas": "patatas", "cuadra": "manzana (block)",
    "vos": "tú", "ustedes": "vosotros (fine in Spain as formal plural; check context)",
    "pararse": "ponerse de pie", "lentes": "gafas", "anteojos": "gafas",
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
    if re.match(r"\d+\s*[.)]", t):
        return "fragment (numbered step)"
    if re.match(r"[A-ZÀ-Ý][A-ZÀ-Ý .'-]{0,30}\s?:", t):
        return "interview"
    if re.match(r"[-–—]\s", t):
        return "dialogue line"
    first = t.lstrip("¿¡«\"'(—–- ")[:1]
    if first and first.islower():
        return "fragment (starts lowercase)"
    if t.count("(") != t.count(")") or t.count("«") != t.count("»"):
        return "fragment (unbalanced brackets/quotes)"
    return None

def cefr_lang(name, tag, latam, split=False):
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
    units = []   # (row, text, paragraph number or None)
    for r in rows:
        t = str(r[tcol] or "").strip()
        if split:
            paras = [x.strip() for x in re.split(r"\n\s*\n", t) if x.strip()]
            units += [(r, x, i) for i, x in enumerate(paras, 1)]
        else:
            units.append((r, t, None))
    if split:
        say(f"\nRows are whole articles, so they are split at blank lines into {len(units)} paragraphs "
            "before filtering. The first paragraph is usually the heading and is dropped as a fragment.")
    for r, t, para in units:
        lv = str(r[lcol]).strip().upper()
        if lv not in {"A2", "B1"} or not 20 <= words(t) <= 80:
            continue
        reason = reject_reason(t) or ("duplicate" if t in seen else None)
        if reason:
            why[reason] += 1; continue
        seen.add(t)
        rec = {"level": lv, "words": words(t), "text": t}
        if para:
            rec["paragraph"] = para
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
        say("Manejar is left off the list: in Spain it means to handle or manage, and only means to drive in Latin America.")
        say("Word-list check only: it cannot spot grammar such as ustedes for vosotros, or regional meanings.")

# ---------- Latin ----------
AUTHORS = ["Caesar", "Cicero", "Catullus", "Ovid"]
READ_FIRST = ["Cornelius Nepos", "Phaedrus", "Caesar", "Cicero"]   # usual reading order, simplest first
TWO_WORD = {"Quintus_Curtius", "Cornelius_Nepos", "Pliny_Younger", "Silius_Italicus", "Minucius_Felix",
            "Velleius_Paterculus", "Ammianus_Marcellinus", "Calpernius_Siculus", "Rutilius_Namatianus",
            "Valerius_Flaccus"}
RENAME = {"Valerius": "Valerius Maximus"}   # Valerius_Memorable_* files
# Caesar files that are not by Caesar: the African, Alexandrian and Spanish Wars were written by
# his officers, and Gallic War Book 8 by Aulus Hirtius.
NOT_CAESAR = ("Caesar_African", "Caesar_Alexandrian", "Caesar_Spanish", "Caesar_DBG_Book8")

def work(f_):
    return re.split(r"[\\/]", f_)[-1].removesuffix(".json")

def author(f_):
    w = work(f_)
    two = "_".join(w.split("_")[:2])
    a = two.replace("_", " ") if two in TWO_WORD else w.split("_")[0]
    return RENAME.get(a, a)

def latin(name):
    d, rows = load_all(name)
    cols = d[list(d)[0]].column_names
    la = pick(cols, "la", "latin", "lat")
    en = pick(cols, "en", "english", "eng")
    fc = pick(cols, "file")
    say(f"\n## Latin: `{name}`\n")
    say(f"Columns: {', '.join('`'+c+'`' for c in cols)}. Splits: {', '.join(f'{s} ({len(d[s])})' for s in d)} "
        "(all splits counted together).\n")
    files = Counter(str(r[fc]) for r in rows)
    by_author = Counter()
    for f_, c in files.items():
        by_author[author(f_)] += c
    say(f"{len(rows)} pairs, {len(by_author)} authors, {len(files)} works (`file` values).\n")
    for a in AUTHORS:
        n = by_author.get(a, 0)
        ws = sorted(work(f_) for f_ in files if author(f_) == a)
        say(f"- **{a}**: {str(n) + ' pairs, ' + str(len(ws)) + ' files' if n else 'does not appear'}"
            + (f" ({', '.join(ws)})" if ws and len(ws) <= 6 else "")
            + (" (includes the African, Alexandrian and Spanish Wars and Gallic War Book 8, "
               "which other writers wrote; Gallic War Books 1 to 7 are his)" if a == "Caesar" else ""))
    say("\n### Pairs per author\n")
    say("| Author | Pairs | Works |"); say("|---|---|---|")
    for a, c in by_author.most_common():
        say(f"| {a} | {c} | {sum(1 for f_ in files if author(f_) == a)} |")
    say("\n### Pairs per work\n")
    say("| Work | Pairs |"); say("|---|---|")
    for f_, c in files.most_common():
        say(f"| {work(f_)} | {c} |")

    keep, misaligned = [], 0
    for r in rows:
        a, w = author(str(r[fc])), work(str(r[fc]))
        if a in READ_FIRST and not w.startswith(NOT_CAESAR) and 6 <= words(r[la]) <= 25:
            if "\n\n" in str(r[en]) or words(r[en]) > 4 * words(r[la]):
                misaligned += 1; continue
            keep.append({"author": a, "work": w, "la_words": words(r[la]), "la": r[la], "en": r[en]})
    seen, dedup = set(), []
    for k in keep:
        if k["la"] not in seen:
            seen.add(k["la"]); dedup.append(k)
    if len(dedup) < len(keep):
        odd.append(f"Latin: {len(keep) - len(dedup)} repeated Latin lines among the saved pairs (kept the first).")
    keep = dedup
    if misaligned:
        odd.append(f"Latin: dropped {misaligned} likely misaligned pairs (English holds two versions or is over 4 times the Latin).")
    nb = sum(bool(re.search(r"[<>\[\]]", k["la"])) for k in keep)
    nc = sum(str(k["la"]).strip()[-1:] in ";:," for k in keep)
    odd.append(f"Latin: in the saved pairs, {nb} have editors' brackets such as <et> (words an editor added), "
               f"and {nc} end in ; : or , because the dataset splits long sentences into clauses. Left as they are.")
    nl = sum(1 for k in keep if k["author"] == "Phaedrus" and k["la"][:1].islower())
    odd.append(f"Latin: Phaedrus is verse, split into pieces of a fable; {nl} of his saved lines start lowercase "
               "because they continue a sentence. Nepos is short biographies of Greek and Roman generals (plus Atticus and Cato).")
    odd.append("Latin: the Caesar English is an old, literal 19th-century style; the Cicero English is modern and freer.")
    keep.sort(key=lambda x: (READ_FIRST.index(x["author"]), x["la_words"]))
    path = OUT / "latin_read_first_6-25.jsonl"
    with open(path, "w", encoding="utf-8") as f:
        for k in keep:
            f.write(json.dumps(k, ensure_ascii=False) + "\n")
    per = Counter(k["author"] for k in keep)
    say(f"\nSaved {len(keep)} pairs ({', '.join(f'{a} {per[a]}' for a in READ_FIRST)}; Latin 6 to 25 words) "
        f"to `out/{path.name}`, in that author order, then shortest first. Caesar means Gallic War Books 1 to 7 only: "
        "the African, Alexandrian and Spanish Wars and Book 8 are by other writers and are left out. "
        "Cicero here is only speeches (Philippics, Post Reditum). "
        "Text as given: no macrons added, English left as the dataset's paraphrase.")
    say("")
    if not keep:
        odd.append("Latin: no read-first pairs matched; check the file names in the table.")
    odd.append(f"Latin: the Vulgate Bible is {files.most_common(1)[0][1]} of {len(rows)} pairs, a third of the set. "
               "`file` paths use Windows backslashes. There is no Caesar Civil War and no Cicero letters or essays.")
    blank = sum(1 for r in rows if not str(r[la] or "").strip() or not str(r[en] or "").strip())
    if blank: odd.append(f"Latin: {blank} pairs with an empty side.")
    if any(re.search(r"[āēīōū]", str(r[la] or "")) for r in rows[:5000]):
        odd.append("Latin: some rows do have macrons, unlike the dataset description.")

say("# Hugging Face reading data\n")
say("Made by `scripts/process.py`. The passages in `out/` are not committed: rerun the script to regenerate them (and this file). From this folder: `python -m venv .venv`, then `.venv/bin/pip install datasets`, then `.venv/bin/python -I scripts/process.py` (on Windows use `.venv\\Scripts\\` instead of `.venv/bin/`). Downloads and cache stay in this folder.")
cefr_lang("UniversalCEFR/hablacultura_es", "Spanish", latam=True)
cefr_lang("UniversalCEFR/kwiqiz_fr", "French", latam=False, split=True)
try:
    latin("grosenthal/latin_english_parallel")
except Exception as e:
    say("\n## Latin: `grosenthal/latin_english_parallel`\n")
    say(f"Not downloaded: {type(e).__name__}. The network policy blocks the hosts that serve its files "
        "(cas-server.xethub.hf.co, us.aws.cdn.hf.co). Allow them and rerun.")
odd += [
    "Spanish: every saved row has title `na`, so there is no link back to the source article.",
    "Spanish: some saved rows are about Latin America as a topic (Mexico in 6 rows, Colombia 2, Argentina, Chile, Peru 1 each). "
    "The vocabulary checked looks like Spain's, but the content is not all about Spain.",
    "French: kwiziq rows are whole articles (median 195 to 280 words at A2 and B1), so only 2 fit 20 to 80 words "
    "as whole rows. The output uses paragraphs instead, with `title` and `paragraph` to find the article. "
    "Many articles are dialogues, whose lines are dropped. Some text has a no-break space before ! ? : (French typography), left as is.",
]
say("\n## Odd things\n")
for o in odd or ["Nothing the script checks for (empty rows, duplicates, odd level labels, empty pairs)."]:
    say(f"- {o}")
say("- Filters are heuristics: a dropped row may be fine, and a kept one may still be a fragment. Read before use.")
say("\n## Glossary gaps\n")
say("`node data/hf/scripts/glossary-gaps.js` (from the repo root, after the script above) counts the words in each")
say("saved Spanish passage that have no entry in `public/courses/es-ES/glossary.json`, and writes `out/spanish_glossary_gaps.json`.")
(HERE / "README.md").write_text("\n".join(report) + "\n", encoding="utf-8")
