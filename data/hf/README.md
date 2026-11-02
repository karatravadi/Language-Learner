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

Columns: `id`, `la`, `en`, `file`. Splits: train (99343), test (1014), valid (1014) (all splits counted together).

101371 pairs, 46 authors, 271 works (`file` values).

- **Caesar**: 3426 pairs, 11 files (includes the African, Alexandrian and Spanish Wars and Gallic War Book 8, which other writers wrote; Gallic War Books 1 to 7 are his)
- **Cicero**: 3398 pairs, 16 files
- **Catullus**: 825 pairs, 1 files (Catullus_Poems)
- **Ovid**: 43 pairs, 1 files (Ovid_Tristia)

### Pairs per author

| Author | Pairs | Works |
|---|---|---|
| Vulgate | 33036 | 1 |
| Tacitus | 7204 | 19 |
| Ammianus Marcellinus | 4298 | 18 |
| Quintus Curtius | 3876 | 8 |
| Statius | 3855 | 18 |
| Virgil | 3809 | 14 |
| Silius Italicus | 3787 | 17 |
| Caesar | 3426 | 11 |
| Cicero | 3398 | 16 |
| Valerius Maximus | 3089 | 9 |
| Bede | 3077 | 7 |
| Ausonius | 2880 | 20 |
| Vitruvius | 2486 | 10 |
| Sidonius | 2239 | 10 |
| Varro | 1622 | 3 |
| Lucretius | 1603 | 6 |
| Boethius | 1593 | 5 |
| Valerius Flaccus | 1553 | 8 |
| Apuleius | 1492 | 4 |
| Sallust | 1443 | 2 |
| Prudentius | 1291 | 6 |
| Tertullian | 1289 | 2 |
| Propertius | 1154 | 4 |
| Cato | 1141 | 1 |
| Velleius Paterculus | 893 | 1 |
| Catullus | 825 | 1 |
| Pliny Younger | 816 | 1 |
| Cornelius Nepos | 794 | 25 |
| Phaedrus | 739 | 5 |
| Tibullus | 648 | 1 |
| Minucius Felix | 424 | 1 |
| Calpernius Siculus | 263 | 1 |
| Rutilius Namatianus | 236 | 1 |
| Suetonius | 232 | 3 |
| Avianus | 213 | 1 |
| Manilius | 203 | 1 |
| Paulinus | 102 | 1 |
| Florus | 57 | 1 |
| Fescennine | 56 | 1 |
| Pentadius | 50 | 1 |
| Ovid | 43 | 1 |
| Tiberianus | 33 | 1 |
| Nemesianus | 33 | 1 |
| Servasius | 33 | 1 |
| Hadrian | 26 | 1 |
| Modestinus | 11 | 1 |

### Pairs per work

| Work | Pairs |
|---|---|
| Vulgate_Bible | 33036 |
| Cato_Agriculture | 1141 |
| Tertullian_Apology | 997 |
| Sallust_Jugurtha | 953 |
| Velleius_Paterculus_Compendium | 893 |
| Apuleius_Apologia | 833 |
| Catullus_Poems | 825 |
| Pliny_Younger_Panegyricus | 816 |
| Cicero_Philippic_2 | 810 |
| Quintus_Curtius_Alexander_Book4 | 683 |
| Tibullus_Elegies | 648 |
| Varro_Agriculture_Book1 | 640 |
| Ausonius_Epistles | 634 |
| Bede_Ecclesiastical_Book5 | 618 |
| Bede_Ecclesiastical_Book4 | 605 |
| Tacitus_Histories_Book4 | 605 |
| Quintus_Curtius_Alexander_Book8 | 584 |
| Tacitus_Histories_Book3 | 564 |
| Tacitus_Histories_Book2 | 557 |
| Bede_Ecclesiastical_Book3 | 552 |
| Quintus_Curtius_Alexander_Book7 | 536 |
| Bede_Ecclesiastical_Book1 | 529 |
| Caesar_African | 528 |
| Varro_Agriculture_Book2 | 524 |
| Caesar_DBG_Book7 | 522 |
| Virgil_Georgics | 521 |
| Tacitus_Histories_Book1 | 495 |
| Sallust_Catiline | 490 |
| Tacitus_Annals_Book1 | 476 |
| Tacitus_Annals_Book2 | 467 |
| Quintus_Curtius_Alexander_Book6 | 464 |
| Varro_Agriculture_Book3 | 458 |
| Tacitus_Annals_Book4 | 456 |
| Quintus_Curtius_Alexander_Book9 | 451 |
| Caesar_Alexandrian | 439 |
| Minucius_Felix_Octavius | 424 |
| Tacitus_Annals_Book3 | 419 |
| Quintus_Curtius_Alexander_Book5 | 418 |
| Tacitus_Annals_Book15 | 401 |
| Boethius_Philosophy_Book3 | 398 |
| Propertius_Elegies_Book2 | 392 |
| Bede_Ecclesiastical_Book2 | 386 |
| Quintus_Curtius_Alexander_Book10 | 376 |
| Valerius_Memorable_Book1 | 374 |
| Vitruvius_Architecture_Book_10 | 371 |
| Boethius_Philosophy_Book4 | 371 |
| Tacitus_Annals_Book14 | 369 |
| Valerius_Memorable_Book6 | 365 |
| Quintus_Curtius_Alexander_Book3 | 364 |
| Valerius_Memorable_Book5 | 361 |
| Valerius_Memorable_Book4 | 353 |
| Valerius_Memorable_Book8 | 348 |
| Tacitus_Annals_Book12 | 344 |
| Ammianus_Marcellinus_Book31 | 343 |
| Valerius_Memorable_Book9 | 342 |
| Ausonius_Epigrams | 341 |
| Sidonius_Letters_Book7 | 333 |
| Caesar_DBG_Book5 | 332 |
| Valerius_Memorable_Book3 | 330 |
| Virgil_Eclogues | 328 |
| Sidonius_Letters_Book4 | 326 |
| Tacitus_Annals_Book13 | 325 |
| Valerius_Memorable_Book2 | 319 |
| Tacitus_Annals_Book6 | 317 |
| Lucretius_De_Rerum_Natura_Book6 | 315 |
| Prudentius_Divinity_Of_Christ | 312 |
| Caesar_Spanish | 310 |
| Cicero_Philippic_13 | 307 |
| Ammianus_Marcellinus_Book22 | 306 |
| Lucretius_De_Rerum_Natura_Book4 | 304 |
| Propertius_Elegies_Book4 | 303 |
| Vitruvius_Architecture_Book_2 | 303 |
| Caesar_DBG_Book1 | 302 |
| Apuleius_Florida | 300 |
| Silius_Italicus_Punica_Book13 | 299 |
| Valerius_Memorable_Book7 | 297 |
| Tertullian_De_Spectaculis | 292 |
| Lucretius_De_Rerum_Natura_Book5 | 291 |
| Boethius_Philosophy_Book2 | 290 |
| Tacitus_Agricola | 290 |
| Statius_Achilleid | 290 |
| Boethius_Philosophy_Book1 | 287 |
| Virgil_Aeneid_Book10 | 285 |
| Sidonius_Letters_Book9 | 284 |
| Silius_Italicus_Punica_Book15 | 283 |
| Ausonius_Thanksgiving | 283 |
| Vitruvius_Architecture_Book_9 | 282 |
| Tacitus_Germania | 281 |
| Propertius_Elegies_Book3 | 281 |
| Sidonius_Letters_Book8 | 280 |
| Virgil_Aeneid_Book6 | 277 |
| Ammianus_Marcellinus_Book14 | 274 |
| Cicero_Philippic_5 | 274 |
| Prudentius_Reply_to_Symmachus_Book2 | 273 |
| Tacitus_Dialogus | 272 |
| Virgil_Aeneid_Book11 | 271 |
| Ammianus_Marcellinus_Book23 | 271 |
| Virgil_Aeneid_Book2 | 267 |
| Statius_Silvae_Book1 | 264 |
| Sidonius_Letters_Book1 | 264 |
| Virgil_Aeneid_Book12 | 264 |
| Calpernius_Siculus_Bucolics | 263 |
| Statius_Thebaid_Book6 | 262 |
| Silius_Italicus_Punica_Book4 | 259 |
| Virgil_Aeneid_Book5 | 255 |
| Ammianus_Marcellinus_Book28 | 253 |
| Cicero_Philippic_1 | 253 |
| Ammianus_Marcellinus_Book21 | 253 |
| Ammianus_Marcellinus_Book17 | 252 |
| Ammianus_Marcellinus_Book15 | 251 |
| Ammianus_Marcellinus_Book16 | 250 |
| Virgil_Aeneid_Book9 | 249 |
| Boethius_Philosophy_Book5 | 247 |
| Valerius_Flaccus_Argonautica_Book1 | 246 |
| Caesar_DBG_Book6 | 244 |
| Vitruvius_Architecture_Book_1 | 242 |
| Statius_Thebaid_Book10 | 242 |
| Ammianus_Marcellinus_Book29 | 242 |
| Silius_Italicus_Punica_Book12 | 241 |
| Caesar_DBG_Book8 | 241 |
| Silius_Italicus_Punica_Book7 | 241 |
| Vitruvius_Architecture_Book_7 | 240 |
| Virgil_Aeneid_Book3 | 238 |
| Vitruvius_Architecture_Book_5 | 237 |
| Prudentius_Origin_Of_Sin | 237 |
| Ammianus_Marcellinus_Book25 | 236 |
| Rutilius_Namatianus_De_Reditu_Suo | 236 |
| Silius_Italicus_Punica_Book3 | 236 |
| Statius_Silvae_Book3 | 235 |
| Prudentius_Psychomachia | 234 |
| Lucretius_De_Rerum_Natura_Book1 | 233 |
| Sidonius_Letters_Book5 | 232 |
| Lucretius_De_Rerum_Natura_Book2 | 230 |
| Lucretius_De_Rerum_Natura_Book3 | 230 |
| Virgil_Aeneid_Book8 | 227 |
| Statius_Silvae_Book5 | 226 |
| Ausonius_Eclogues | 226 |
| Cicero_Philippic_11 | 225 |
| Vitruvius_Architecture_Book_8 | 225 |
| Bede_Abbots | 224 |
| Silius_Italicus_Punica_Book16 | 224 |
| Ammianus_Marcellinus_Book20 | 222 |
| Sidonius_Letters_Book2 | 221 |
| Cicero_Philippic_3 | 221 |
| Valerius_Flaccus_Argonautica_Book4 | 220 |
| Valerius_Flaccus_Argonautica_Book5 | 218 |
| Ammianus_Marcellinus_Book27 | 217 |
| Silius_Italicus_Punica_Book6 | 217 |
| Virgil_Aeneid_Book7 | 217 |
| Statius_Silvae_Book2 | 216 |
| Phaedrus_Fables_Book5 | 216 |
| Silius_Italicus_Punica_Book14 | 214 |
| Vitruvius_Architecture_Book_6 | 213 |
| Avianus_Fables | 213 |
| Virgil_Aeneid_Book1 | 212 |
| Ammianus_Marcellinus_Book24 | 212 |
| Silius_Italicus_Punica_Book2 | 211 |
| Statius_Thebaid_Book7 | 211 |
| Silius_Italicus_Punica_Book8 | 210 |
| Statius_Thebaid_Book11 | 208 |
| Tacitus_Annals_Book11 | 208 |
| Statius_Thebaid_Book9 | 205 |
| Silius_Italicus_Punica_Book1 | 204 |
| Valerius_Flaccus_Argonautica_Book3 | 203 |
| Manilius_Astronomica_Book1 | 203 |
| Statius_Thebaid_Book12 | 202 |
| Apuleius_Metamorphoses_Book1 | 199 |
| Virgil_Aeneid_Book4 | 198 |
| Silius_Italicus_Punica_Book17 | 197 |
| Ammianus_Marcellinus_Book26 | 196 |
| Statius_Thebaid_Book5 | 196 |
| Vitruvius_Architecture_Book_4 | 195 |
| Caesar_DBG_Book4 | 194 |
| Valerius_Flaccus_Argonautica_Book6 | 192 |
| Silius_Italicus_Punica_Book10 | 192 |
| Silius_Italicus_Punica_Book5 | 192 |
| Statius_Silvae_Book4 | 191 |
| Ammianus_Marcellinus_Book30 | 191 |
| Statius_Thebaid_Book2 | 189 |
| Statius_Thebaid_Book1 | 188 |
| Statius_Thebaid_Book4 | 188 |
| Silius_Italicus_Punica_Book9 | 184 |
| Cicero_Philippic_12 | 184 |
| Statius_Thebaid_Book8 | 184 |
| Silius_Italicus_Punica_Book11 | 183 |
| Tacitus_Histories_Book5 | 181 |
| Valerius_Flaccus_Argonautica_Book2 | 181 |
| Cicero_Philippic_8 | 180 |
| Ausonius_Moselle | 179 |
| Propertius_Elegies_Book1 | 178 |
| Vitruvius_Architecture_Book_3 | 178 |
| Tacitus_Annals_Book16 | 177 |
| Ammianus_Marcellinus_Book19 | 175 |
| Cicero_Philippic_14 | 174 |
| Ausonius_Parentalia | 171 |
| Sidonius_Letters_Book3 | 170 |
| Prudentius_Reply_to_Symmachus_Book1 | 170 |
| Valerius_Flaccus_Argonautica_Book7 | 170 |
| Caesar_DBG_Book2 | 166 |
| Bede_Egbert | 163 |
| Apuleius_Socratis | 160 |
| Statius_Thebaid_Book3 | 158 |
| Phaedrus_Fables_Book4 | 157 |
| Phaedrus_Fables_Book3 | 156 |
| Ammianus_Marcellinus_Book18 | 154 |
| Phaedrus_Fables_Book1 | 151 |
| Suetonius_Grammarians | 150 |
| Caesar_DBG_Book3 | 148 |
| Ausonius_Bordeaux | 145 |
| Cicero_Post_Reditum_In_Senatu | 142 |
| Cicero_Philippic_10 | 137 |
| Cornelius_Nepos_Atticus | 126 |
| Valerius_Flaccus_Argonautica_Book8 | 123 |
| Cicero_Philippic_7 | 122 |
| Ausonius_Technopaegnion | 115 |
| Sidonius_Letters_Book6 | 114 |
| Cicero_Philippic_6 | 110 |
| Ausonius_Masque_Seven | 108 |
| Ausonius_Nuptial_Cento | 104 |
| Cicero_Post_Reditum_Ad_Quirites | 103 |
| Paulinus_Eucharisticus | 102 |
| Ausonius_Personal_Poems | 100 |
| Ausonius_Trojan | 99 |
| Cicero_Philippic_4 | 83 |
| Ausonius_Twelve_Caesars | 76 |
| Cicero_Philippic_9 | 73 |
| Ausonius_Riddle | 73 |
| Ausonius_Famous_Cities | 66 |
| Prudentius_History | 65 |
| Cornelius_Nepos_Alcibiades | 59 |
| Phaedrus_Fables_Book2 | 59 |
| Florus_Poems | 57 |
| Fescennine_Verses | 56 |
| Suetonius_Rhetoricians | 52 |
| Pentadius_Poems | 50 |
| Cornelius_Nepos_Eumenes | 49 |
| Ausonius_Daily_Round | 49 |
| Ausonius_Cupid | 47 |
| Cornelius_Nepos_Hannibal | 45 |
| Cornelius_Nepos_Datames | 44 |
| Ovid_Tristia | 43 |
| Cornelius_Nepos_Dion | 42 |
| Cornelius_Nepos_Militiades | 42 |
| Cornelius_Nepos_Epaminondas | 39 |
| Cornelius_Nepos_Themistocles | 39 |
| Cornelius_Nepos_Agesilous | 39 |
| Tiberianus_Poems | 33 |
| Nemesianus_Bucolica | 33 |
| Servasius_Poems | 33 |
| Ausonius_Prefatory_Pieces | 31 |
| Suetonius_Terence | 30 |
| Cornelius_Nepos_Pausanias | 29 |
| Cornelius_Nepos_Timoleon | 26 |
| Hadrian_Poems | 26 |
| Cornelius_Nepos_Pelopidas | 22 |
| Ausonius_Bissula | 21 |
| Cornelius_Nepos_Timotheus | 20 |
| Cornelius_Nepos_Cato | 20 |
| Cornelius_Nepos_Conon | 19 |
| Cornelius_Nepos_Thrasybulus | 18 |
| Cornelius_Nepos_Phocion | 17 |
| Cornelius_Nepos_Aristides | 16 |
| Cornelius_Nepos_Lysander | 16 |
| Cornelius_Nepos_Cimon | 16 |
| Sidonius_Poems | 15 |
| Cornelius_Nepos_Iphicles | 15 |
| Cornelius_Nepos_Hamilcar | 15 |
| Cornelius_Nepos_Chabrias | 14 |
| Ausonius_Conclusion | 12 |
| Modestinus_Cupid_Asleep | 11 |
| Cornelius_Nepos_On_Kings | 7 |

Saved 3808 pairs (Caesar 1211, Cicero 2597; Latin 6 to 25 words) to `out/latin_read_first_6-25.jsonl`, Caesar first, then shortest first. Caesar means Gallic War Books 1 to 7 only: the African, Alexandrian and Spanish Wars and Book 8 are by other writers and are left out. Cicero here is only speeches (Philippics, Post Reditum). Text as given: no macrons added, English left as the dataset's paraphrase.


## Odd things

- Spanish: 45 duplicate texts (kept only one of each in the output).
- Spanish: unexpected level labels ['B'].
- Latin: dropped 4 likely misaligned pairs (English holds two versions or is over 4 times the Latin).
- Latin: in the saved pairs, 152 have editors' brackets such as <et> (words an editor added), and 515 end in ; : or , because the dataset splits long sentences into clauses. Left as they are.
- Latin: the Caesar English is an old, literal 19th-century style; the Cicero English is modern and freer.
- Latin: the Vulgate Bible is 33036 of 101371 pairs, a third of the set. `file` paths use Windows backslashes. There is no Caesar Civil War and no Cicero letters or essays.
- Spanish: every saved row has title `na`, so there is no link back to the source article.
- Spanish: some saved rows are about Latin America as a topic (Mexico in 6 rows, Colombia 2, Argentina, Chile, Peru 1 each). The vocabulary checked looks like Spain's, but the content is not all about Spain.
- French: kwiziq rows are whole articles (median 195 to 280 words at A2 and B1), so only 2 fit 20 to 80 words. Their text also starts with the article heading followed by a blank line.
- Filters are heuristics: a dropped row may be fine, and a kept one may still be a fragment. Read before use.
