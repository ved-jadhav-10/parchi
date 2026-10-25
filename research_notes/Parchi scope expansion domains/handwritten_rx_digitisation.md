# Handwritten Rx Digitisation for Parchi (feasibility, accuracy, safety, design), as of Oct 2026

Scope note: research done 25 Oct 2026 with web search and fetch. Items older than 2024 are marked **(pre-2024)**. Effort estimates and design proposals are my inferences, labelled as such. Parchi's current position (`docs/PLAN.md`, "Not doing") is: no OCR, because buyers already digitise Rx and an earlier check found no commercial Indian Rx-digitisation API and only a Google research prototype. The findings below show that this rationale needs one factual correction (Q3).

## Q1. How accurate are current OCR/HTR and vision-language models on handwritten prescriptions, especially Indian ones?

### Takeaway
No published benchmark tests 2026 frontier VLMs (GPT 5.x, Gemini 3.x, Claude 4.x) on real Indian doctor handwriting. The closest evidence points one way. On tidy handwriting, frontier models get roughly 85-96% of fields right. On real "wild" handwriting the best model scores below humans, and most model errors come from language priors: the model "corrects" what it sees into a plausible word. The only Indian-specific study (MIRAGE, 2024 models) found zero-shot GPT-4o and Gemini 1.5 Pro nearly useless (F1 about 6-8%). Its fine-tuned model reached 82% F1, which the authors call "in no way deployable".

### Cited Findings
**Prescription and medication-list studies**
- **Netherlands, 2026 (closest direct test of GPT vision on handwritten medication lists).** Design: 33 handwritten lists of 10 medications each, written by 33 pharmacy technicians and pharmacists, in Dutch. Scoring: 4 points per drug (name, dose, frequency, route), 40 per list.
  - Median scores out of 40: GPT-4o-mini 34.0 (SD 4.50), GPT-4o 38.0 (SD 3.83), GPT-4.1 38.5 (SD 3.26). GPT-4o and 4.1 beat 4o-mini (p<0.001); 4o vs 4.1 was not significant (p=0.062). — [Exploratory Research in Clinical and Social Pharmacy, vol 23, 100807, online 27 May 2026](https://pmc.ncbi.nlm.nih.gov/articles/PMC13241658/)
  - GPT-4.1 misread dose or frequency in 35% of "as needed" (PRN) entries, 27% of entries with specific timing and 14% of entries with no strength, against 3% of simple entries. — [same](https://pmc.ncbi.nlm.nih.gov/articles/PMC13241658/)
  - Word-level substitution happened: ciprofloxacin 500 mg was misread as 30 mg and the drug replaced with gliclazide. Ciprofloxacin, Microgynon and carbamazepine each had word-level errors in two lists. — [same](https://pmc.ncbi.nlm.nih.gov/articles/PMC13241658/)
  - Legibility correlated with recognition (GPT-4.1 ρ=0.655, p<0.001). Print handwriting beat cursive, and blue ink beat black. Conclusion: "human oversight remains essential to ensure medication safety." — [same](https://pmc.ncbi.nlm.nih.gov/articles/PMC13241658/)
  - Reporting inconsistency: the Methods name "GPT-o4, GPT-o4-mini and GPT-4.1" while the Results name GPT-4o-mini, GPT-4o and GPT-4.1. — [same](https://pmc.ncbi.nlm.nih.gov/articles/PMC13241658/)
- **MIRAGE (India, arXiv v2 Nov 2024; IIT Bombay with Medyug Technology).**
  - Data: 743,118 *simulated* handwritten records written by 1,133 doctors across 52 specialties, covering 21,075 unique brand names. 513,407 records were used for training and 15,000 for testing. Only 100 prescriptions are public (Hugging Face). — [arXiv 2410.09729](https://arxiv.org/html/2410.09729)
  - Zero-shot precision/recall/F1 for medicine name plus dosage: GPT-4o 7.57/7.57/7.57; Gemini 1.5 Pro 5.65/5.46/5.53; LLaVA 1.6 2.00/2.00/2.00. — [same](https://arxiv.org/html/2410.09729)
  - Fine-tuned: Idefics2 reached F1 82% and LLaVA 79.8% (name and dose both had to be correct). Both struggle with rarer medicines. Authors: "Our accuracy is in no way deployable and should not be deployed." — [same](https://arxiv.org/html/2410.09729)
  - The paper says handwritten Rx "dominate medical records in India, despite known high error rates" and are "often impossible for untrained individuals to decipher without the help of a pharmacist." — [same](https://arxiv.org/html/2410.09729)
- **Frontiers in Medicine, published 5 Oct 2026.**
  - Data: 508 images (175 handwritten), web-crawled plus phone shots. Many contain Arabic script; not Indian.
  - Results: the hybrid pipeline (GhostNetV2 router, then PaddleOCR or Tesseract) got CER 4.1% and WER 7.6%. GPT-4o did better at CER 3.4% and WER 6.8%.
  - The medicine-name step "has not been quantitatively evaluated", and high-divergence cases go to human review. — [Frontiers in Medicine 10.3389/fmed.2026.1856485](https://www.frontiersin.org/journals/medicine/articles/10.3389/fmed.2026.1856485/full)
- **IJRTI 2026 (Indian clinics; secondary, unverified).** A paper reportedly found 84.6% medicine-level accuracy for an OCR plus language-model pipeline on 50 real handwritten prescriptions from Indian outpatient clinics. I could not open the PDF, so this comes from a search-engine summary only. — [IJRTI2605060](https://www.ijrti.org/papers/IJRTI2605060.pdf)

**General handwriting benchmarks for frontier models**
- **Handwritten medical forms, Apr 2026.**
  - Scope: 17 frontier and open models on one hard real-world medical form (South African authors).
  - Results: on discrete fields, the latest Google and OpenAI models reach "accuracies around 85%" with weighted F1 ≃ 90%. On free text, Gemini 3.1 had WER 0.50 and CER 0.31. GPT 5.4 had the lowest hallucination rate (6%), and Claude Sonnet 4.6 was best on formatted fields (dates, numbers).
  - "None of the smaller or older models perform well." — [arXiv 2604.16504](https://arxiv.org/abs/2604.16504)
- **WildHandBench, Aug 2026.**
  - Scope: 500 handwritten documents in 4 languages and 9 scenarios, 18 models.
  - Results: the best model scored 71.85% against 77.09% for humans. 63-91% of model errors are "prior-driven" (coming from language priors rather than visual evidence), against 49% for humans. — [arXiv 2608.22959](https://arxiv.org/abs/2608.22959)

**Vendor OCR**
- Azure AI Read (Document Intelligence) lists handwriting OCR for only 9 languages: English, Chinese Simplified, French, German, Italian, Japanese, Korean, Portuguese and Spanish. Hindi handwriting is absent, though printed Devanagari is supported. — [Microsoft Learn: language support](https://learn.microsoft.com/en-my/Azure/ai-services/computer-vision/language-support)

**A small local-model experiment**
- **kotewar/parchi (Oct 2026).** A local `gemma3:4b` after macOS Vision OCR was given 20 synthetic OCR-corrupted Indian brand lines. 9 of 20 came back wrong, all at 0.95 confidence; of the 18 answers at ≥0.90 confidence, 9 were wrong. "The confidence column carried no signal whatsoever." The model also swapped brands for other drugs (Pan 4O → Panadol, Glycomet → Metformin). — [DEV post, Kotewar](https://dev.to/sankalpkotewar/i-poisoned-20-drug-names-to-find-out-whether-a-local-model-belongs-in-a-pharmacy-5ekh)

**Indian datasets that exist**
- MIRAGE public subset: 100 simulated Indian Rx on Hugging Face. — [arXiv 2410.09729](https://arxiv.org/html/2410.09729)
- Eka Care `medical_records_parsing_validation_set`: 288 images of lab reports and prescriptions from Indian healthcare settings. — [Hugging Face](https://huggingface.co/datasets/ekacare/medical_records_parsing_validation_set)
- "Doctor's Handwritten Prescription BD": Bangladesh, 4,680 word images, 78 medicine classes, educational and research use only. — [Mendeley](https://data.mendeley.com/datasets/zjjtptvn6f/2)
- "Handwritten Medical Prescriptions Collection" on Kaggle: illegible Rx images; labels and origin not described. — [Kaggle](https://www.kaggle.com/datasets/mehaksingal/illegible-medical-prescription-images-dataset)
- MIRAGE describes a prior Indian online-handwriting dataset (Tabassum et al. 2024): 17,431 samples of 480 medical words from 39 doctors. MIRAGE calls it "small, unrealistic". — [arXiv 2410.09729](https://arxiv.org/html/2410.09729)

**Humans also fail on illegible scripts**
- In a South African pilot study **(pre-2024)**, all participants made errors on an illegible Rx. Medication names and dosages were identified correctly by only 20% and 18% of participants. — [PMC9609295](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9609295/)

### Inferences
- **Model choice.** Frontier VLMs have improved a lot since MIRAGE's 2024 zero-shot results. The 2026 forms benchmark and the Dutch study both show frontier models in the 85-96% field range on reasonably legible handwriting. Indian OPD scrawl with brand names is probably harder: the Dutch lists were written by pharmacy staff, not doctors, and MIRAGE's simulated Indian Rx floored older models. Expect clearly lower line-level accuracy on real Indian doctor handwriting, and **measure it before claiming any number.**
- **Wrong drug, not garbled text, is the main safety risk.** The "prior-driven error" finding, the ciprofloxacin → gliclazide substitution and the Pan 40 → Panadol swap all show models confidently producing a *real but wrong* drug. A deterministic resolver that only fuzzy-matches to a real brand would be fooled by exactly this, because the misread already looks like a valid brand.
- **Model self-confidence must not be a gate.** kotewar's run and the Dutch study's 35% PRN error rate both support this.
- **Azure Read is the wrong base.** It has no handwritten Hindi or Indic support, and Indian Rx often mix English brand names with Hindi or regional-language instructions. A multimodal LLM (Gemini, GPT or Claude) is the practical choice for a hackathon. The open models (Qwen-VL, Idefics2, TrOCR, PaddleOCR) need fine-tuning on Indian data to be useful (MIRAGE).

### Gaps
- No published accuracy for GPT 5.x, Gemini 3.x or Claude 4.x on *real Indian* handwritten Rx. No vendor-published handwriting accuracy for Google Cloud Vision or Document AI, or AWS Textract, on prescriptions.
- The IJRTI 84.6% figure is unverified (PDF unreadable to my tools).
- I found no TrOCR, PaddleOCR or Qwen2.5-VL numbers on Indian Rx specifically.
- The licence of Eka Care's HF dataset was not checked.

## Q2. How do Indian e-pharmacies digitise Rx images today?

### Takeaway
Public evidence says digitisation is human: the customer uploads a photo, then a pharmacist (sometimes a doctor) reads it and confirms by phone. No 1mg, PharmEasy, Apollo, Truemeds, MedPlus or Netmeds engineering post describes production Rx OCR. Verification standards are not uniform, and an unregulated area (no notified e-pharmacy rules) produced a 2026 scandal over AI-generated fake Rx being accepted.

### Cited Findings
- **PharmEasy.** Prescriptions are verified, routed to a partner pharmacy and handled under a pharmacist's supervision. Where an Rx lists salts instead of brands, the pharmacist calls the customer about substitutes. (From search summary of PharmEasy's own blog.) — [PharmEasy: How PharmEasy works](https://pharmeasy.in/blog/how-pharmeasy-works/)
- **Truemeds.** "A pharmacist will call to confirm the medicines in your prescription." Another Truemeds page mentions a doctor confirmation call. Uploads must show doctor, patient, date and medicine details, max 5 MB. (Search summary.) — [Truemeds upload page](https://www.truemeds.in/upload-prescription)
- **Third-party view (2026).** An academic paper describes PharmEasy as allowing uploads "but it depends on human pharmacists to read and verify prescriptions", and says 1mg and Practo "require manual input of medicine names". — [IJSAT 2026](https://www.ijsat.org/papers/2026/2/10892.pdf)
- **mChemist (2015, pre-2024).** Had "a team of dedicated pharmacists who read, transcribe and parse the uploaded prescriptions in real time". — [Medianama 2015](https://www.medianama.com/2015/07/223-mchemist-launches-online-pharmacy-in-india/)
- **Eka Care.** Says its models parse unstructured prescriptions and lab reports into structured, interoperable records. A competitor (Ayu, 2026) claims Eka's OCR targets typed documents and that handwriting is "not a primary feature"; that claim is not independent. — [YourStory, Nov 2025](https://yourstory.com/2025/11/healthtech-startup-eka-care-ai-standardise-medical-records-doctor-patient); [Ayu comparison blog](https://ayuapp.com/blog/eka-care-vs-ayu)
- **Regulatory and verification context (May 2026).**
  - Physical chemists must verify prescriptions under Drug Rule 65 (Drugs and Cosmetics Rules, 1945). Online pharmacies have no equivalent notified obligation.
  - The Aug 2018 draft e-pharmacy rules remain unnotified as of May 2026.
  - A Times of India investigation (Feb 2026) found online pharmacies accepted AI-generated prescriptions with fabricated hospital and doctor details. Drugs dispensed included psychotropics, opioids, antibiotics and some banned medicines.
  - AIOCD called a nationwide shutdown of over 12.4 lakh chemists on 20 May 2026, citing fake and reused scanned Rx. — [Medianama, 14 May 2026](https://www.medianama.com/2026/05/223-chemist-strike-against-e-pharmacies-may-20-ai-generated-prescriptions/)
- **Pharmacists' attitudes.** In a survey of 122 Bangalore pharmacists, 47.54% suggested mandatory prescription verification for online pharmacies. — [WHO IMSEAR record](https://imsear.searo.who.int/items/2bca5708-02a4-4d26-94a5-ba6a259ce939)

### Inferences
- **Buyers already pay pharmacists to read Rx images.** That validates Parchi's current premise ("buyers already digitise Rx"). It also means a scan feature competes with a human step the buyer already has. Its value is speed plus a second-reader safety check, not replacing the pharmacist.
- **The live 2026 pain is authenticity and reuse, not only legibility.** That is a different problem: OCR does not detect a forged Rx. A narrower, high-value check is "order lines vs what is on the Rx image": catch items added to a cart that the Rx does not support, especially Schedule H/H1 and habit-forming drugs.

### Gaps
- No primary public statement from Tata 1mg, PharmEasy, Apollo 24|7, Netmeds, MedPlus or Practo on whether they use ML or OCR internally, or a BPO, for Rx transcription. No numbers on Rx volume per pharmacist or time per Rx. A pharmacist-session question for the team could fill this.

## Q3. Is there now (2025-2026) any commercial or open Indian Rx-digitisation API or product?

### Takeaway
Yes, but nothing validated. The PLAN.md claim that there is "no commercial ... API" is now out of date:
- **PrescriptoAI** sells a handwritten-Rx OCR API, plus an "order vs Rx" validation API aimed at e-pharmacies. Country is not stated, and it publishes no benchmarks and no DPDP or retention statement.
- **An MIT-licensed open-source project also named "Parchi"** (kotewar/parchi, Hacktoberfest 2026) does local-first handwritten Rx reading for Indian chemists, gated by deterministic code.

Google's Dec 2022 Lens prescription prototype has no public launch that I could find.

### Cited Findings
- **PrescriptoAI.** Its "Prescription Data Extraction API" returns medicine, dosage, frequency, duration, doctor name and licence, patient, date and a confidence score as JSON. Its "Medicine–Prescription Validation API" checks that ordered medicines are on the Rx.
  - Pricing: free tier of 100 calls/month; $0.12 per call pay-as-you-go.
  - Not stated: benchmarks, country, named customers, and DPDP/HIPAA/retention statements. — [prescriptoai.com](https://www.prescriptoai.com/)
- **kotewar/parchi (MIT).** A "local-first prescription reader for a neighbourhood medical shop in India".
  - Pipeline: macOS Vision OCR (about 1.8 s/page), then `gemma3:4b` via Ollama, then a deterministic gate with no model and no network. Only the lines the gate refuses go to a human.
  - Gate checks: is the name present on the page (grounding), strength format, the morning-afternoon-night pattern, quantity × dosing × duration arithmetic, and stock. OCR confidence is explicitly discarded as a safety signal.
  - The README says: "It is not a medical device, and it does not decide anything clinically." — [GitHub kotewar/parchi](https://github.com/kotewar/parchi)
- **Google Lens prescription prototype (Dec 2022, pre-2024).** Announced at Google for India as a research prototype built with pharmacists, "not set for a public launch". Google said no decision would rest solely on its output. — [9to5Google](https://9to5google.com/2022/12/19/google-lens-will-soon-be-able-to-decipher-prescriptions-from-your-doctors-bad-handwriting/); [TechCrunch](https://techcrunch.com/2022/12/18/google-can-now-decode-doctors-bad-handwriting)
  - A later search turned up no 2025-2026 launch, only 2022 coverage. — [search results incl. Gigazine](https://gigazine.net/gsc_news/en/20221220-google-digitizing-doctor-penmanship)
- **Eka Care.** Parses prescriptions into structured records and released a 288-image Indian Rx and lab-report parsing validation set. Handwriting support is not confirmed by Eka itself. — [Hugging Face](https://huggingface.co/datasets/ekacare/medical_records_parsing_validation_set); [YourStory](https://yourstory.com/2025/11/healthtech-startup-eka-care-ai-standardise-medical-records-doctor-patient)
- **Veryfi.** Sells a prescription *medication label* OCR API (printed pharmacy labels, not handwritten Rx). — [Veryfi](https://www.veryfi.com/prescription-medication-label-ocr-api/)
- **Student and GitHub prototypes.** These exist, e.g. an OCR plus DDI plus fake-Rx-flag system, but none is validated. — [GitHub abhi2004-dev](https://github.com/abhi2004-dev/prescription-digitization-system)

### Inferences
- **Fix the "Not doing" rationale.** The claim "no commercial API exists" should become "commercial and open tools exist, but none publishes validated accuracy on Indian handwritten Rx".
- **Name collision.** An open-source "Parchi" with an almost identical philosophy ("The OCR reads. The model understands. The gate decides.") exists publicly. Judges or mentors may find it. The team should know it exists, differentiate clearly (e-pharmacy and chain verifying pharmacist, a 32k-brand resolver, a cumulative mg/day ledger, multi-doctor history), and avoid being seen as derivative.

### Gaps
- No 2025-2026 information on Qure.ai, Practo or other Indian startups offering Rx handwriting digitisation. I searched; none surfaced.
- PrescriptoAI's jurisdiction, data residency and accuracy are unknown.

## Q4. What are the safety failure modes, the evidence on transcription error rates, and the recommended human-in-the-loop patterns?

### Takeaway
The dangerous failure is a **confident, plausible, wrong drug or strength**, not unreadable text. Language-model priors push misreads toward common real drugs. Self-reported confidence does not predict correctness. PRN/SOS and timing instructions are misread far more than simple lines. Human transcription is also error-prone (about 2% in an Indian hospital order-entry audit; much higher where legibility is poor). The evidence supports four patterns:
- grounding checks;
- deterministic format and catalogue checks;
- line-by-line pharmacist confirmation against the image;
- never auto-dispensing.

### Cited Findings
**Failure modes**
- **Prior-driven errors.** 63-91% of MLLM handwriting errors are "prior-driven" (from language priors, not visual evidence), against 49% for humans. — [WildHandBench](https://arxiv.org/abs/2608.22959)
- **Wrong drug substituted.**
  - Dutch study: ciprofloxacin read as gliclazide. — [PMC13241658](https://pmc.ncbi.nlm.nih.gov/articles/PMC13241658/)
  - kotewar: Glycomet → Metformin, Pan 4O → Panadol, Atorva 1O → Atorvastatin. A "name appears on the page" grounding check caught all five. — [DEV post](https://dev.to/sankalpkotewar/i-poisoned-20-drug-names-to-find-out-whether-a-local-model-belongs-in-a-pharmacy-5ekh)
- **Strength misreads.** Four wrong strengths (e.g., "5Omcg", "7S") passed until a strength-format check was added. — [same](https://dev.to/sankalpkotewar/i-poisoned-20-drug-names-to-find-out-whether-a-local-model-belongs-in-a-pharmacy-5ekh)
- **Correction-history regressions.** Adding the shop's history improved accuracy (wrong fell from 9/20 to 6/20) but caused 3 new errors where the model "snap[ped] to the nearest familiar name" and dropped suffixes. — [same](https://dev.to/sankalpkotewar/i-poisoned-20-drug-names-to-find-out-whether-a-local-model-belongs-in-a-pharmacy-5ekh)
- **OCR confidence is not reliable.** Example: a line read at confidence 1.00 contained "T2OM" for "T2DM". — [kotewar/parchi README](https://github.com/kotewar/parchi)
- **Hallucination still occurs in the best models.** GPT 5.4 had a 6% hallucination rate on a handwritten medical form. — [arXiv 2604.16504](https://arxiv.org/abs/2604.16504)

**LASA in India**
- Earlier research put LASA incidents at about 2.67% of medication errors reported in Indian hospitals, with identical brand names the main contributor. (Secondary reporting of a Lancet viewpoint.) — [The South First](https://thesouthfirst.com/news/look-alike-sound-alike-medicine-in-indian-market-can-cause-significant-health-threat-lancet)
- In Jan 2024, DTAB recommended prohibiting different drugs under the same brand name. In July 2026, CDSCO opened a consultation on brand-name extensions. — [The South First](https://thesouthfirst.com/health/why-one-drug-brand-can-no-longer-mean-one-medicine-cdsco-moves-to-tackle-confusing-brand-name-extensions/)
- A Delhi hospital study **(pre-2024, 2007)** found that order software listing brand names alphabetically raised the risk of selecting the wrong drug. — [J Risk & Safety in Medicine 2007](https://sage.cnpereading.com/doi/10.3233/JRS-2007-416)

**Human transcription and legibility baselines**
- **Indian multi-specialty hospital (pre-2024).** Over about 18,000 prescriptions, 380 (2.11%) had a transcription error when nurses' computer entries were checked against doctors' handwritten Rx; anti-TB combinations were the top wrong-combination category. This came from a search-engine summary; I could not open the full text to confirm. — [Pharmacologyonline 2007 (Joshi)](https://pharmacologyonline.silae.it/files/newsletter/2007/vol1/13.JoshiNewsletter2.pdf)
- **Tehran teaching hospital (pre-2024, 2009).** 29.9% of 558 transcription opportunities had an error; omissions were 52%. — [search summary, BVS record](https://search.bvsalud.org/gim/resource/en/emr-90954)
- **Indian legibility audits (pre-2024).**
  - Anantapur, Andhra Pradesh community pharmacies (2016): 41% of Rx were Grade 2 ("most words illegible") and 51.5% Grade 3. — [J Health Res Rev 2016](http://www.jhrr.org/article.asp?aulast=Vigneshwaran&epage=76&issn=2394-2010&issue=2&spage=72&volume=3&year=2016)
  - North-East India teaching hospital: about 8% illegible and 66.8% legible with difficulty. — [ResearchGate](https://www.researchgate.net/publication/324067009_Prescription_audit_in_outpatient_department_of_a_teaching_hospital_of_North_East_India)
- **Computerised vs handwritten (pre-2024).** A 2008 systematic review found computerised orders associated with a 66% reduction in total prescribing errors in adults vs handwritten orders. — [search summary; PMC2323150](https://pmc.ncbi.nlm.nih.gov/articles/PMC2323150)

**Human-in-the-loop patterns found**
- **Google's framing (2022, pre-2024).** Assistive only; "no decision will be made based solely on the output". — [9to5Google](https://9to5google.com/2022/12/19/google-lens-will-soon-be-able-to-decipher-prescriptions-from-your-doctors-bad-handwriting/)
- **kotewar gate design.**
  - Grounding (name on page), strength-format validation, sig-pattern check, quantity arithmetic, then a human for anything refused.
  - Result: the gate caught 9/9 dangerous answers with 0 over-flags, and 0/20 dangerous outputs reached the counter. This is a synthetic set of 20 written by the author, so it is indicative only.
  - Sources: [DEV post](https://dev.to/sankalpkotewar/i-poisoned-20-drug-names-to-find-out-whether-a-local-model-belongs-in-a-pharmacy-5ekh); [GitHub](https://github.com/kotewar/parchi)
- **Frontiers 2026 pipeline.** High-divergence cases between two readers (pipeline vs GPT-4o) are flagged for human review. — [Frontiers](https://www.frontiersin.org/journals/medicine/articles/10.3389/fmed.2026.1856485/full)
- **Dutch 2026 study.** "Human oversight remains essential to ensure medication safety." — [PMC13241658](https://pmc.ncbi.nlm.nih.gov/articles/PMC13241658/)

### Inferences
**HITL rules suggested by the evidence (my synthesis):**
1. Ask the model for a *verbatim* transcription (`as_written`) separate from any normalised guess. Leave matching to Parchi's deterministic resolver, so priors cannot silently rewrite the brand.
2. Gate on deterministic signals, never on model confidence. The signals are:
   - resolver confidence and margin between the top two candidates;
   - a LASA ambiguity flag;
   - strength exists for that brand in the catalogue;
   - sig parses deterministically;
   - two independent reads agree (e.g. two models, or OCR tokens vs VLM).
3. Every line needs explicit pharmacist confirmation next to the cropped image region. No "accept all". Unreadable fields stay blank and must be typed.
4. Force review of SOS/PRN, timing and strength fields; these are the high-error zones.
5. The engine runs only on confirmed lines. Never auto-dispense or auto-clear.
6. Log proposed vs confirmed values to measure the real correction rate.

**Why this protects Parchi:** misread risk is asymmetric. A misread that turns a dangerous drug into a safe one hides an alert, and the engine cannot recover from that. Confirmation of the *input* is therefore the critical safety step, not the alert logic.

### Gaps
- No Indian community or e-pharmacy study measuring pharmacist misreading rates on real Rx images.
- No study measuring whether a side-by-side confirm UI actually reduces errors versus manual typing. Automation bias (rubber-stamping AI proposals) is a known risk, but I found no Rx-specific measurement.

## Q5. What does Indian regulation say: NMC legibility and generic names, court orders, e-pharmacy rules, and DPDP for sending Rx images to a cloud LLM?

### Takeaway
Courts and the NMC are pushing hard on legibility and typed prescriptions:
- The Punjab & Haryana HC (27 Aug 2025) held that a legible prescription is part of the Article 21 right to health. It ordered capital letters until typed Rx arrive, and typed Rx within 2 years in Punjab, Haryana and PGIMER.
- The NMC (Dec 2025) told all medical colleges to monitor legibility and generic prescribing.

That makes the handwriting problem real but *shrinking* over a 2-3 year horizon. DPDP does not ban cross-border processing of health data by default, but consent, purpose limitation, processor contracts and security apply. Some Rules phase in later, reportedly by about May 2027.

### Cited Findings
**Courts**
- **Punjab & Haryana High Court, Justice Jasgurpreet Singh Puri, order 27 Aug 2025.** Raised suo motu in a bail matter after an illegible medico-legal report "shook the conscience of this Court as not even a word or a letter was legible." — [LawBeat](https://lawbeat.in/top-stories/messy-handwriting-on-docs-prescriptions-hc-says-it-violates-your-fundamental-right-1516607)
  - Holding: a "legible medical prescription and diagnosis" is part of the right to health under Article 21.
  - Directions:
    - Punjab, Haryana and Chandigarh: enforce capital-letter handwriting until typed or computerised Rx are fully adopted.
    - Union of India: issue a Gazette notification of minimum Rx standards (following its 28 May 2025 letter).
    - PGIMER: e-prescription "Doctor Desk Module", preferably within 2 years.
    - Punjab and Haryana: move to typed Rx within 2 years.
    - NMC: put legible handwriting into the curriculum. — [LawBeat](https://lawbeat.in/top-stories/messy-handwriting-on-docs-prescriptions-hc-says-it-violates-your-fundamental-right-1516607)
  - The court also noted that illegible handwriting stops patients from checking prescriptions "online or with AI tools", while stressing this is not about replacing doctors. — [same](https://lawbeat.in/top-stories/messy-handwriting-on-docs-prescriptions-hc-says-it-violates-your-fundamental-right-1516607)
  - Sources name the case differently: "Yogesh vs State of Haryana" ([Careers360](https://news.careers360.com/nmc-medical-colleges-directive-sub-committee-dtc-monitor-prescription-legible-handwriting-generic-drugs-right-to-health/amp)) vs an anonymised "XXXXX Versus State of Haryana" (LawBeat).
  - A Tribune report links Punjab's capital-letter instruction to a "May 26" directive, which conflicts with the 27 Aug order date. It may be the earlier advisory. — [Tribune](https://www.tribuneindia.com/news/amritsar/doctors-to-write-prescriptions-in-capital-letters)
- **Earlier courts.** Allahabad HC judges had earlier criticised reports "in such shabby handwriting that they are not decipherable" (no date given). A Telangana pharmacist filed a 2014 PIL after a child's death from a wrong injection. India has "no robust data" on harm from poor handwriting. — [MedicalBrief, Oct 2025](https://www.medicalbrief.co.za/indian-court-orders-handwriting-lessons-for-doctors/)

**NMC and MCI**
- **NMC, Dec 2025.** Every medical college must set up a sub-committee under its Drugs and Therapeutics Committee to monitor prescriptions, and teach "Importance of Legible and Clear Handwriting in Medical Prescriptions". The NMC quoted: "Every physician should prescribe drugs with generic names legibly and preferably in capital letters." — [Careers360, 15 Dec 2025](https://news.careers360.com/nmc-medical-colleges-directive-sub-committee-dtc-monitor-prescription-legible-handwriting-generic-drugs-right-to-health/amp)
- **MCI, 2016 (pre-2024).** The Medical Council of India's 2016 amendment introduced the same "generic names legibly and preferably in capital letters" wording. — [MedicalBrief](https://www.medicalbrief.co.za/indian-court-orders-handwriting-lessons-for-doctors/)
- **NMC RMP Regulations 2023 (pre-2024).** Notified 2 Aug 2023; mandated generic-name prescribing and, per one summary, legible capital letters. Held in abeyance from 23-24 Aug 2023, with the 2002 Regulations restored. — [The South First](https://thesouthfirst.com/health/nmc-puts-on-hold-the-regulation-that-made-it-mandatory-for-doctors-to-prescribe-generic-drugs/); [BW Healthcare World](https://www.bwhealthcareworld.com/article/nmc-puts-new-regulations-on-docs-in-abeyance-directs-to-follow-old-guidelines-from-2002-488890); [Drishti IAS](https://www.drishtiias.com/daily-updates/daily-news-analysis/nmc-registered-medical-practitioner-professional-conduct-regulations-2023)

**E-pharmacy rules**
- Drug Rule 65 obliges physical chemists to verify Rx. The draft e-pharmacy rules (Aug 2018) were still unnotified in May 2026. The Delhi HC's Dec 2018 ban on unlicensed online sales technically stands. The Drugs, Medical Devices and Cosmetics Bill 2023 did not pass. — [Medianama, May 2026](https://www.medianama.com/2026/05/223-chemist-strike-against-e-pharmacies-may-20-ai-generated-prescriptions/)

**DPDP Act 2023 and Rules 2025**
- **Notification date (conflict).** Rule 15 is cited as notified via G.S.R. 846(E) on 13 Nov 2025 ([dpdpa.com Rule 15](https://www.dpdpa.com/dpdparules/rule15.html)); Wikipedia says 14 Nov 2025 ([Wikipedia](https://en.wikipedia.org/wiki/Digital_Personal_Data_Protection_Rules,_2025)).
- **Cross-border transfer.** Section 16(1) permits transfer outside India unless the government notifies a restricted country (a negative list). Section 16(2) preserves stricter sectoral laws. — [Legal500](https://www.legal500.com/intelligence/india/food-drugs-healthcare-life-sciences/healthcare-data-across-borders-reconciling-indias-dpdp-framework-with-the-gdpr); [Vidhi](https://vidhilegalpolicy.in/blog/cross-border-data-transfers-and-data-localization-mandate-under-the-data-protection-regime/)
- **No special category for health data.** The enacted Act has no GDPR-style "special category". Healthcare consent language should reportedly say whether data is stored abroad or "processed by artificial-intelligence systems". — [Legal500](https://www.legal500.com/intelligence/india/food-drugs-healthcare-life-sciences/healthcare-data-across-borders-reconciling-indias-dpdp-framework-with-the-gdpr)
- **Processor contracts.** A fiduciary may engage a processor only under a valid contract. — [Legal500](https://www.legal500.com/intelligence/india/food-drugs-healthcare-life-sciences/healthcare-data-across-borders-reconciling-indias-dpdp-framework-with-the-gdpr)
- **Localisation.** No SDF class requiring health data localisation had been notified as of Aug 2026 (per one commentary). — [advaslam.com](https://www.advaslam.com/writing/dpdp-cross-border-data-transfer-section-16/)
- **Phase-in (unverified).** One source says cross-border compliance is fully operational 18 months after Nov 2025, i.e. about May 2027. I did not verify this against the Gazette. — [ksandk.com](https://ksandk.com/data-protection-and-data-privacy/indias-new-cross-border-data-transfer-framework/)

### Inferences
- **The regulatory direction favours typed and e-prescriptions.** That supports Parchi's structured-input core as the long-term path. Handwriting scanning is a bridge feature for 2026-2028, valuable mainly outside Punjab, Haryana and PGIMER and in the long tail of small clinics.
- **The P&H order gives a strong pitch line.** The court itself named checking prescriptions with AI tools as a benefit of legibility.
- **DPDP roles.** Under DPDP the e-pharmacy (buyer) is most likely the Data Fiduciary and Parchi plus the LLM vendor are processors. A production version needs:
  - a processor contract;
  - consent wording that mentions AI processing;
  - data minimisation (crop out the patient and doctor block before upload);
  - no server-side retention;
  - breach handling.

  None of this blocks a hackathon demo that uses synthetic Rx only.

### Gaps
- Whether Rx-reading software that feeds dispensing decisions would count as Software as a Medical Device under CDSCO's Medical Devices Rules 2017 was not researched.
- No full text of the P&H judgment was read.
- The Orissa (Odisha) HC order on illegible handwriting (said to be 2020) was not found in sources I could open.
- Whether Gemini, OpenAI or Anthropic offer India-region processing or zero-retention for vision calls as of Oct 2026 was not checked.

## Q6. What concrete design fits Parchi's rules, what does a hackathon demo look like vs production, and what is the effort?

### Takeaway
Add handwriting as an **online-only "input assist" that proposes lines, never decides**. The LLM reads the image into verbatim text. The existing deterministic resolver and sig parser normalise it and score it. The pharmacist confirms each line beside the image crop. Only confirmed lines enter the unchanged engine.

The lowest-risk, highest-value first version is **"Verify" mode**: compare the buyer's already-digitised order lines against the Rx image and flag mismatches. This keeps the "buyers digitise" premise and targets the 2026 fake and reused Rx and cart-padding concern.

Hackathon effort is about 6-10 h for one developer. Production is months, gated on a consented Indian Rx dataset and DPDP work. (All effort figures here are my estimates.)

### Cited Findings
- Parchi's existing rules and architecture:
  - the engine is deterministic and offline;
  - `api/` serverless functions are online-only and hide themselves offline;
  - an LLM may parse messy text, never decide alerts;
  - the resolver contract `{raw, brand, confidence, ingredients, form, flags}` includes `lasa`;
  - there is an override log in IndexedDB and a "confirm an unverified brand" UI.

  — [docs/PLAN.md](C:/Coding/PROJECTS/Personal/plot-armor-hm-02-hypnexis/docs/PLAN.md)
- The closest working design (kotewar/parchi): OCR, then model, then deterministic gate (grounding, strength format, sig pattern, arithmetic, stock), then a human for refused lines. — [GitHub](https://github.com/kotewar/parchi)
- PrescriptoAI's "Medicine–Prescription Validation API" is a commercial signal that "order vs Rx" checking is a product e-pharmacies buy. — [prescriptoai.com](https://www.prescriptoai.com/)
- Frontier VLMs reach about 85% field accuracy on hard handwritten medical forms, with 6% hallucination for the best model. — [arXiv 2604.16504](https://arxiv.org/abs/2604.16504)
- Online pharmacies accepted AI-generated fake Rx (TOI, Feb 2026), and reuse of scanned Rx is a stated AIOCD concern. — [Medianama](https://www.medianama.com/2026/05/223-chemist-strike-against-e-pharmacies-may-20-ai-generated-prescriptions/)
- Benchmark data for a quick measured claim: MIRAGE's 100 public simulated Indian Rx ([arXiv](https://arxiv.org/html/2410.09729)) and Eka Care's 288-image Indian set ([HF](https://huggingface.co/datasets/ekacare/medical_records_parsing_validation_set)). Licence not checked.

### Inferences

#### Proposed pipeline (fits all CLAUDE.md rules)
1. **Capture (UI).** The pharmacist uploads or opens the Rx image the buyer already holds. Before upload, an optional client-side crop to the medicines block strips the patient and doctor header, and EXIF is stripped. Online only; offline, the button hides, matching existing `api/` behaviour.
2. **Read (new `api/scan-rx`, server-side, key in env).** One vision call to Gemini, GPT or Claude with a strict JSON schema. Per line it returns:
   - `as_written` (verbatim characters, `?` for unreadable, "do not correct spelling or substitute known drugs");
   - `strength_as_written` and `sig_as_written`;
   - a `bbox`;
   - a per-field `legible: yes/partly/no`.

   Optionally make a second independent read (a second model, or a second prompt) to get an agreement signal. The function never returns ingredients or alerts.
3. **Normalise (existing deterministic code, offline-capable).**
   - Run `as_written` through the Track A resolver, returning top-k candidates, confidence and the gap between candidates, plus `lasa` and `discontinued` flags.
   - Check that the strength exists for the chosen brand in the 32k index, and reject non-standard formats such as "5O", "1O" or "7S".
   - Run the sig through the Track B parser; a parse failure marks the line.
4. **Gate (deterministic, new small module).** A line is "needs pick" when any of these hold:
   - resolver confidence is below a threshold, or the top-2 margin is small;
   - `lasa` is set;
   - the two reads disagree;
   - the strength is not in the catalogue;
   - the sig contains SOS/PRN or timing;
   - any field is `legible != yes`.

   Model confidence is ignored. Following the evidence, *every* line still needs a confirm; the gate only decides how much friction the line gets (pre-filled vs forced choice among candidates vs blank).
5. **Confirm (UI, Track D).**
   - The image crop sits beside each proposed line. The pharmacist confirms, edits or picks from candidates line by line. There is no "accept all".
   - An "add a missed line" action is always visible.
   - Confirmed lines are tagged `source: "scan"` and `confirmed_by`.
6. **Check (unchanged engine).** Confirmed lines go to `pipeline.ts` exactly like typed lines. Alerts stay 100% deterministic.
7. **Audit.** The existing IndexedDB override log stores proposed vs confirmed values per field, the model id and a prompt version. This gives a live "AI proposal correction rate" metric and a growing local eval set. Do not store images server-side.

**Verify mode** (same parts, different entry):
- **Input:** the buyer's typed order lines plus the Rx image.
- **Comparison:** deterministic, after both sides are resolved to canonical ingredient ids.
- **Output, as a review checklist rather than an alert tier:**
  - "on order, not found on Rx image";
  - "on Rx image, not on order";
  - "strength differs";
  - "frequency differs".

  The engine's alert logic is untouched; the LLM only reads.

**Contracts (additive only):** optional fields on the input line or `Prescription`:
- `source?: "typed"|"scan"|"import"`
- `scan?: {as_written, bbox?, legible?, model, prompt_version, confirmed_by?, confirmed_at?}`

No renames.

**Owners per PLAN layout:** `api/scan-rx` (B), resolver top-k plus strength-in-catalogue check (A), gate module (C or A), confirm UI and capture (D), fixtures (shared, additive).

#### Recommendations
For each recommendation: evidence of need / how it plugs in / effort / risks / pitch value.

1. **Correct the "Not doing" rationale now (doc-only).**
   - Need: PrescriptoAI and kotewar/parchi exist (Q3).
   - Plugs in: one line in PLAN.md.
   - Effort: 10 min.
   - Risk: none.
   - Pitch: avoids a judge's "but X exists" gotcha, and lets the team say "we chose not to *trust* OCR, here is why".
2. **Hackathon: Verify mode first (recommended).**
   - Need:
     - e-pharmacies already transcribe manually (Q2);
     - human transcription errors exist (2.11% in an Indian hospital audit, pre-2024);
     - fake and reused Rx are a live 2026 controversy.
   - Plugs in: `api/scan-rx` plus deterministic ingredient-level diff plus a checklist panel on the existing order page. The engine is unchanged.
   - Effort (one dev): about 5-7 h. API function 1.5 h, diff using the resolver 1.5 h, UI panel 2 h, 10-15 synthetic test images 1 h.
   - Risks:
     - VLM misreads cause false "mismatch" items (noise rather than missed harm, since the typed order is still checked by the engine);
     - online-only;
     - the demo must use synthetic handwritten Rx, never real patient images.
   - Pitch: high. "Your pharmacist typed it; Parchi reads the paper again and shows what doesn't match." It keeps the "we take structured lines" story intact.
3. **Hackathon: Scan-assist mode (optional, behind a flag).**
   - Need: small chains and long-tail buyers without a transcription team. Also directly answers the "what about handwritten Rx?" judge question.
   - Plugs in: as in the pipeline above.
   - Effort: about 6-10 h on top of (2), mostly the line-by-line confirm UI with image crops and candidate pickers.
   - Risks:
     - automation bias (rubber-stamping);
     - real Indian scrawl accuracy is unmeasured (MIRAGE zero-shot was about 7% with 2024 models);
     - scope creep against core items still open in PLAN.md status rows.
   - Pitch: the strongest live-demo moment if paired with a designed **LASA trap**: a deliberately ambiguous brand where the VLM proposes the wrong look-alike confidently and Parchi forces a pick. That shows "AI reads, pharmacist confirms, code decides".
4. **Measure, don't claim.**
   - Run the scan path on about 20-30 team-written synthetic Rx: the demo patient's brands written in "doctor style" by several team members, including PRN/SOS and a LASA pair. Add the MIRAGE public subset if its licence allows.
   - Report:
     - % lines proposed correctly (brand, strength, sig separately);
     - % lines the gate forced to review;
     - count of silent wrong-drug proposals that reached a pre-filled state (target 0);
     - time per Rx vs typing.
   - Effort: 2-3 h with the existing `eval/` harness pattern.
   - Pitch: fits the "measured, beat the chatbot" story. A raw chatbot reading the photo and deciding alerts is the comparison.
5. **Production version (post-hackathon).**
   - Build items:
     - a consented, pharmacist-double-annotated Indian Rx image set (about 1-2k images across specialties and regions; estimate);
     - per-field metrics and per-model regression suite with pinned model versions;
     - a two-reader agreement policy;
     - DPDP work (processor contracts, AI-processing consent wording, data minimisation crop, zero retention, India-region processing if available);
     - SaMD classification check with CDSCO;
     - monitoring of correction rate and drift.
   - Effort: about 3-6 months for 2-3 engineers plus pharmacist annotators (estimate).
   - Alternative: integrate the buyer's existing OCR or transcription output and offer only Verify mode as an API (`api/check` already exists), which avoids owning OCR quality.
   - Risks:
     - accuracy on regional handwriting and Hindi or regional sig text (Azure Read has no handwritten Hindi);
     - medico-legal liability if a confirmed misread leads to harm;
     - typed-Rx mandates (P&H HC 2-year horizon; NMC push) shrink the market over time.
   - Pitch: a credible roadmap slide, not a demo item.
6. **Do not** let the LLM output ingredients, doses or alerts. Do not use model or OCR confidence as a gate. Do not auto-fill and auto-check without per-line confirmation. Do not ship any offline OCR claim, since on-device models are slow (kotewar: about 57 s/page on a CPU laptop) and weaker.

#### Bottom line for the team
Adding handwritten Rx scanning is feasible at hackathon scope **as an assistive, online-only input step with mandatory line-by-line confirmation**, and it fits every Parchi rule if the LLM is limited to verbatim reading. Verify mode is the safer and more on-strategy first build. Full "scan replaces typing" claims are not supported by any Indian accuracy evidence as of Oct 2026.

### Gaps
- Per-image cost and latency of Gemini, GPT or Claude vision as of Oct 2026 were not researched. PrescriptoAI's $0.12/call is the only price point found.
- No evidence on how pharmacists actually behave with AI-prefilled Rx lines (automation bias rates) in India.
- No pharmacist input yet on whether Verify mode or Scan-assist matters more to e-pharmacy verification desks. This is a question for the team's pharmacist session.
