"""Audit our clinical data against outside sources (FIX_PLAN Phase 4). Needs the network (openFDA); results are committed so tests run offline.

  py data/audit_sources.py interrupts   -> src/engine/resolver/fixtures/ddi_interrupt_evidence.json
        for every curated pair that stops the pharmacist ("interrupt": true in public/data/ddi_supplement.json): the sentence in
        the FDA label of one drug that names the other drug or class, or an explicit "no confirmation found" with the reason.
  py data/audit_sources.py limits       -> data/reports/limits_label_check.csv
        for every adult daily maximum in src/engine/limits/limits.json: whether the FDA label text states the same number.
  py data/audit_sources.py gaps         -> data/reports/ddi_gaps.csv
        the most-used ingredients DDInter has no data for, and what (if anything) covers them instead.

openFDA is public domain (https://open.fda.gov/apis/drug/label/). Sleep between calls keeps us under the keyless rate limit.
"""
import csv, json, pathlib, re, sys, time, urllib.parse, urllib.request, collections

root = pathlib.Path(__file__).resolve().parent.parent
FIELDS = ['contraindications', 'boxed_warning', 'warnings', 'warnings_and_cautions', 'drug_interactions', 'dosage_and_administration']


def label_text(generic, fields=FIELDS):
    """Concatenated text of the chosen sections across up to 3 label records for a generic name, or ''."""
    q = urllib.parse.quote(f'openfda.generic_name:"{generic}"', safe='+:"_')
    try:
        d = json.load(urllib.request.urlopen(f'https://api.fda.gov/drug/label.json?search={q}&limit=3', timeout=30))
    except Exception:
        return ''
    out = []
    for r in d.get('results', []):
        for f in fields:
            out.append(' '.join(r.get(f, [])))
    time.sleep(0.4)
    return re.sub(r'\s+', ' ', ' '.join(out)).replace('�', '-')


def sentence_with(text, words):
    for m in re.finditer(r'[^.]*?(' + '|'.join(re.escape(w) for w in words) + r')[^.]*\.', text, re.I):
        return m.group(0).strip()[:300]
    return None


# What to look for, per curated rule: (drug whose label to read, words that name the partner or its class).
LOOK = {
    'sacubitril_acei': ('sacubitril', ['ACE inhibitor', 'angioedema']),
    'simvastatin_clarithromycin': ('simvastatin', ['clarithromycin']),
    'pde5_nitrate': ('sildenafil', ['nitrate']),
    'methotrexate_trimethoprim': ('methotrexate', ['trimethoprim', 'sulfamethoxazole']),
    'colchicine_strong_cyp3a4': ('colchicine', ['clarithromycin']),
    'tizanidine_cyp1a2': ('tizanidine', ['ciprofloxacin']),
    'ivabradine_rate_ccb': ('ivabradine', ['verapamil', 'diltiazem']),
    'amiodarone_sotalol': ('amiodarone', ['sotalol']),
    'linezolid_ssri': ('linezolid', ['serotonergic', 'SSRI', 'selective serotonin']),
    'onc_ssri_maoi': ('sertraline', ['monoamine oxidase', 'MAOI']),
    'onc_opioid_maoi': ('tramadol', ['monoamine oxidase', 'MAOI']),
    'onc_tca_maoi': ('amitriptyline', ['monoamine oxidase', 'MAOI']),
    'onc_stimulant_maoi': ('methylphenidate', ['monoamine oxidase', 'MAOI']),
    'onc_triptan_maoi': ('sumatriptan', ['monoamine oxidase', 'MAO-A']),
    'onc_febuxostat_azathioprine': ('febuxostat', ['azathioprine']),
    'onc_tranylcypromine_procarbazine': ('tranylcypromine', ['procarbazine']),
    'onc_ergot_cyp3a4': ('ergotamine', ['clarithromycin', 'ritonavir', 'CYP3A4']),
}
NO_US_LABEL = {
    'domperidone_strong_cyp3a4': 'domperidone is not approved in the US, so there is no FDA label; the contraindication is from the EMA 2014 domperidone review',
    'domperidone_qt': 'domperidone is not approved in the US, so there is no FDA label; the contraindication is from the EMA 2014 domperidone review',
}


def interrupts():
    rules = json.load(open(root / 'public/data/ddi_supplement.json', encoding='utf8'))['rules']
    out = []
    for r in rules:
        if not r.get('interrupt'):
            continue
        if r['id'] in NO_US_LABEL:
            out.append({'rule': r['id'], 'status': 'no_fda_label', 'reason': NO_US_LABEL[r['id']], 'basis': r.get('basis', '')})
            continue
        drug, words = LOOK[r['id']]
        text = label_text(drug)
        quote = sentence_with(text, words) if text else None
        if quote:
            out.append({'rule': r['id'], 'status': 'confirmed', 'label_of': drug, 'looked_for': words, 'quote': quote, 'basis': r.get('basis', '')})
        else:
            out.append({'rule': r['id'], 'status': 'not_found', 'label_of': drug, 'looked_for': words, 'reason': 'no sentence in the FDA label sections searched names the partner or class; the basis rests on the cited list or EMA text only', 'basis': r.get('basis', '')})
        print(r['id'], out[-1]['status'])
    note = ('For each curated Interrupt pair: the sentence in one drug\'s FDA label (openFDA, read ' + time.strftime('%d %b %Y') + ') that names the other drug or class, '
            'or "not_found" / "no_fda_label" with the reason. Quotes are verbatim, spacing normalised. A "not_found" is not proof the pair is safe: the label may be worded differently or the basis may be a guideline list.')
    path = root / 'src/engine/resolver/fixtures/ddi_interrupt_evidence.json'
    path.write_text(json.dumps({'_note': note, 'rules': out}, indent=2, ensure_ascii=False) + '\n', encoding='utf8')
    print(collections.Counter(x['status'] for x in out))


def number_forms(mg):
    n = float(mg)
    forms = {f'{n:,.0f} mg', f'{n:.0f} mg', f'{n:.0f}mg'}
    if n >= 1000:
        g = n / 1000
        forms |= {f'{g:g} g', f'{g:g} gram', f'{g:g} grams'}
    return {f.lower() for f in forms}


US_NAME = {'paracetamol': 'acetaminophen', 'chlorphenamine': 'chlorpheniramine', 'salbutamol': 'albuterol'}
NOT_IN_US = {'aceclofenac', 'domperidone', 'etoricoxib', 'nimesulide', 'thiocolchicoside'}


def limits():
    lim = json.load(open(root / 'src/engine/limits/limits.json', encoding='utf8'))['ingredients']
    rows = []
    for ing, v in lim.items():
        if 'adult' not in v:
            continue
        mx = v['adult']['max_mg_day']
        if ing in NOT_IN_US:
            rows.append([ing, mx, 'not approved in the US, so no FDA label (EMA/UK or Indian label needed)', ''])
            continue
        text = label_text(US_NAME.get(ing, ing.replace('_', ' ')), ['dosage_and_administration', 'dosage_forms_and_strengths', 'indications_and_usage', 'overdosage', 'warnings', 'information_for_patients']).lower()
        if not text:
            rows.append([ing, mx, 'no FDA label found', ''])
            continue
        hit = next((f for f in number_forms(mx) if f in text), None)
        rows.append([ing, mx, 'label text contains our number' if hit else 'our number not found in label text (may be worded differently, or differ)', hit or ''])
        print(ing, rows[-1][2][:40])
    path = root / 'data/reports/limits_label_check.csv'
    with open(path, 'w', newline='', encoding='utf8') as f:
        w = csv.writer(f)
        w.writerow(['ingredient', 'our_adult_max_mg_day', 'result', 'matched_text'])
        w.writerows(rows)
    print(collections.Counter(r[2].split(' (')[0] for r in rows))


def gaps():
    ddi = json.load(open(root / 'public/data/ddi.json', encoding='utf8'))
    covered = set(ddi['ddinter_ids'])
    b = json.load(open(root / 'public/data/brands.json', encoding='utf8'))
    use = collections.Counter()
    for disp, comp, form, flags, tier in b['brands']:
        if tier > 1 or b['forms'][form] not in ('tablet', 'capsule', 'dry_syrup', 'syrup'):
            continue
        for c in b['compositions'][comp]:
            use[b['ingredients'][c[0]]] += 1
    sup = json.load(open(root / 'public/data/ddi_supplement.json', encoding='utf8'))['rules']
    in_sup = {i for r in sup for i in r['a'] + r['b']}
    rules = json.load(open(root / 'public/data/alert_rules.json', encoding='utf8'))
    ingd = json.load(open(root / 'public/data/ingredients.json', encoding='utf8'))['ingredients']
    stack_cls = {c for s in rules['stack_rules'] for g in s['groups'] for c in g.get('classes', [])}
    stack_ids = {i for s in rules['stack_rules'] for g in s['groups'] for i in g.get('ingredients', [])}
    rows = []
    for ing, n in use.most_common():
        if ing in covered:
            continue
        cls = ingd.get(ing, {}).get('classes', [])
        how = [x for x in (('curated pair' if ing in in_sup else ''), ('stacking rule' if ing in stack_ids or set(cls) & stack_cls else '')) if x]
        rows.append([ing, n, ';'.join(cls), '+'.join(how) or 'nothing: a quiet result means unknown'])
    path = root / 'data/reports/ddi_gaps.csv'
    with open(path, 'w', newline='', encoding='utf8') as f:
        w = csv.writer(f)
        w.writerow(['ingredient', 'popular_oral_brands_containing_it', 'classes', 'covered_by'])
        w.writerows(rows)
    bare = [r for r in rows if r[3].startswith('nothing')]
    print(f'{len(rows)} common ingredients with no DDInter data; {len(bare)} have no other cover. Top 12 uncovered:')
    for r in bare[:12]:
        print('  ', r[0], r[1])


if __name__ == '__main__':
    {'interrupts': interrupts, 'limits': limits, 'gaps': gaps}[sys.argv[1]]()
