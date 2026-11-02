import os, sys
from datasets import load_dataset
for name in ["UniversalCEFR/hablacultura_es","UniversalCEFR/kwiqiz_fr","grosenthal/latin_english_parallel"]:
    d = load_dataset(name)
    print("==", name, d)
    for split in d:
        print(split, d[split].features)
        for r in d[split].select(range(2)): print({k:(str(v)[:150]) for k,v in r.items()})
