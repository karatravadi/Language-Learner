# Hugging Face reading data

Made by `scripts/process.py`. Rerun it to regenerate this file and `out/`.

## Spanish: `UniversalCEFR/hablacultura_es`

Columns: `title`, `lang`, `source_name`, `format`, `category`, `cefr_level`, `license`, `text`. Text = `text`, level = `cefr_level`. Splits: train (713).

| Level | Rows | Min | 25% | Median | 75% | Max | <20 | 20-80 | >80 |
|---|---|---|---|---|---|---|---|---|---|
| A2 | 33 | 16 | 28 | 39 | 67 | 111 | 3 | 27 | 3 |
| B | 18 | 16 | 36 | 73 | 95 | 134 | 1 | 9 | 8 |
| B1 | 271 | 13 | 41 | 59 | 96 | 913 | 16 | 171 | 84 |
| B2 | 273 | 13 | 44 | 67 | 100 | 338 | 12 | 162 | 99 |
| C1 | 118 | 13 | 34 | 64 | 113 | 250 | 9 | 64 | 45 |
| all | 713 | | | | | | | | |

Saved 145 rows to `out/spanish_a2_b1_20-80.jsonl` (A2 23, B1 122), shortest first.
Dropped: 18 duplicate, 13 fragment (numbered step), 9 fragment (starts lowercase), 6 fragment (no final punctuation), 4 audio, 2 interview, 1 fragment (unbalanced brackets/quotes).

Latin American vocabulary flagged in 0 of 145 saved rows (field `latam_flags`): none.
Manejar is left off the list: in Spain it means to handle or manage, and only means to drive in Latin America.
Word-list check only: it cannot spot grammar such as ustedes for vosotros, or regional meanings.

## French: `UniversalCEFR/kwiqiz_fr`

Columns: `title`, `lang`, `source_name`, `format`, `category`, `cefr_level`, `license`, `text`. Text = `text`, level = `cefr_level`. Splits: train (344).

| Level | Rows | Min | 25% | Median | 75% | Max | <20 | 20-80 | >80 |
|---|---|---|---|---|---|---|---|---|---|
| A1 | 11 | 59 | 103 | 203 | 233 | 297 | 0 | 1 | 10 |
| A2 | 24 | 45 | 164 | 195 | 251 | 614 | 0 | 1 | 23 |
| B1 | 131 | 60 | 220 | 279 | 360 | 816 | 0 | 2 | 129 |
| B2 | 126 | 72 | 280 | 400 | 560 | 1009 | 0 | 1 | 125 |
| C1 | 52 | 165 | 350 | 436 | 660 | 1251 | 0 | 0 | 52 |
| all | 344 | | | | | | | | |

Saved 2 rows to `out/french_a2_b1_20-80.jsonl` (A2 1, B1 1), shortest first.
Dropped: 1 fragment (no final punctuation).

## Latin: `grosenthal/latin_english_parallel`

Not downloaded: RuntimeError. The network policy blocks the hosts that serve its files (cas-server.xethub.hf.co, us.aws.cdn.hf.co). Allow them and rerun.

## Odd things

- Spanish: 45 duplicate texts (kept only one of each in the output).
- Spanish: unexpected level labels ['B'].
- Spanish: every saved row has title `na`, so there is no link back to the source article.
- Spanish: some saved rows are about Latin America as a topic (Mexico in 6 rows, Colombia 2, Argentina, Chile, Peru 1 each). The vocabulary checked looks like Spain's, but the content is not all about Spain.
- French: kwiziq rows are whole articles (median 195 to 280 words at A2 and B1), so only 2 fit 20 to 80 words. Their text also starts with the article heading followed by a blank line.
- Filters are heuristics: a dropped row may be fine, and a kept one may still be a fragment. Read before use.
