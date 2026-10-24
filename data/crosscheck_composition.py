"""Cross-check our brand compositions against a second listing (Hugging Face 1-800-LLMs/indian-medicines, 11,825 brands).

Caveat that decides how to read the result: that listing carries 1mg image links, so it comes from the same upstream (1mg) as
our own brand data. It can show where OUR extraction dropped an ingredient or a strength, not where 1mg itself is wrong.
Independent checking of brands is done against the Eka Care list (src/engine/resolver/external.test.ts).

Usage:  py data/crosscheck_composition.py <indian-medicines_train.csv>
Writes: data/reports/composition_crosscheck.csv  (one row per disagreement)  and prints a summary.
"""
import csv, json, re, sys, collections, pathlib

root = pathlib.Path(__file__).resolve().parent.parent
brands = json.load(open(root / 'public/data/brands.json', encoding='utf8'))
ingd = json.load(open(root / 'public/data/ingredients.json', encoding='utf8'))
ings, alias = ingd['ingredients'], ingd['aliases']

def canon(name):
    k = re.sub(r'\s+', ' ', name.lower().strip())
    for c in (k, k.replace(' ', '_'), re.sub(r'\b(hydrochloride|hcl|sodium|potassium|calcium|besylate|maleate|tartrate|succinate|sulphate|sulfate|phosphate|acetate|citrate|mesylate|fumarate)\b', '', k).strip()):
        if c in ings: return c
        if c in alias: return alias[c]
        if c.replace(' ', '_') in alias: return alias[c.replace(' ', '_')]
    return None

FORM = re.compile(r'\b(tablet|capsule|syrup|suspension|injection|cream|gel|drops?|ointment|solution|lotion|powder|sachet|infusion|spray|inhaler|respules?|kit|strips?)s?\b', re.I)
def key(n): return re.sub(r'[^a-z0-9]', '', FORM.sub('', n.lower()))

# our side: brand key -> set of ingredient ids (a brand can have several listings; keep all)
ours = collections.defaultdict(list)
for disp, comp, *_ in brands['brands']:
    ours[key(disp)].append(frozenset(brands['ingredients'][c[0]] for c in brands['compositions'][comp]))

def parse(text):
    parts = [p for p in re.split(r'\s\+\s|\s\+|\+\s', text) if p.strip()]
    ids, unknown = set(), []
    for p in parts:
        name = re.sub(r'\(.*?\)', '', p).strip()
        c = canon(name)
        (ids.add(c) if c else unknown.append(name))
    return ids, unknown

rows = list(csv.DictReader(open(sys.argv[1], encoding='utf8', errors='replace')))
stats = collections.Counter()
out = []
for r in rows:
    k = key(r['name'])
    if k not in ours:
        stats['brand not in our index'] += 1
        continue
    theirs, unknown = parse(r['composition'])
    if unknown or not theirs:
        stats['their composition not fully readable'] += 1
        continue
    # compare with the closest listing of ours
    mine = min(ours[k], key=lambda s: len(s ^ theirs))
    if mine == theirs: stats['same ingredients'] += 1; continue
    kind = 'we are missing an ingredient' if mine < theirs else 'we list an extra ingredient' if mine > theirs else 'different ingredients'
    stats[kind] += 1
    out.append([r['name'], kind, '+'.join(sorted(mine)), '+'.join(sorted(theirs)), r['composition']])

(root / 'data/reports').mkdir(exist_ok=True)
with open(root / 'data/reports/composition_crosscheck.csv', 'w', newline='', encoding='utf8') as f:
    w = csv.writer(f)
    w.writerow(['brand', 'finding', 'our_ingredients', 'their_ingredients', 'their_text'])
    w.writerows(sorted(out, key=lambda x: (x[1], x[0])))
total = sum(v for k, v in stats.items() if k not in ('brand not in our index', 'their composition not fully readable'))
print(f'{len(rows)} brands in the second listing; {total} comparable')
for k, v in stats.most_common(): print(f'  {k}: {v}' + (f' ({v / total:.1%})' if k in ('same ingredients', 'we are missing an ingredient', 'we list an extra ingredient', 'different ingredients') else ''))
