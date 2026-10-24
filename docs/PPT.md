# Parchi deck: final content (HYPNEXIS '26, HM-02)

The official template is the marking scheme: every prompt printed on a slide is answered on that slide, in order. Final file: `U6USN474_Plot_Armor_final.pptx` (untracked; rebuilt from this text by a script kept outside the repo). Slides 1 and 9 hold the team details only. Status of everything below: built and tested unless it says *proposed*. Nothing is pharmacist-approved (`docs/VERIFIED.md`).

Voice rule: short sentences, plain words, no "Label: text" on every line. Amber in the deck = the number or phrase to remember.

## Each point appears once

| Point | Slide | Point | Slide |
|---|---|---|---|
| Medzol (one name, two drugs) | 2 | Hidden-paracetamol diagram (4,100 mg) | 2 |
| 49% of older Indians on many medicines | 2 | Hospital alerts overridden 46-96% | 2 |
| Chatbots grade severity right 37% | 2 | 330 failed-quality samples (Sept 2026) | 2 |
| Counts doses, not pairs | 2 | Brand matcher forgives typos | 3 |
| Dose maths, SOS at daily maximum | 3 | Tech stack, PWA, API, where AI is used | 3 |
| Same answer every time | 3 | 31,978 brands, ~70,000 interactions | 3 |
| Admits what it can't see | 3 | Four screens, override log, copy notes | 4 |
| Accessibility | 4 | Timeline, kidney re-check, unverified brands | 4 |
| Informs, never decides | 4 | Real screenshot of the order page | 4 |
| 1,137 tests, speed, modular | 5 | Tested against outside lists: 3 to 13 of 16 | 5 |
| Cost: free tools, data licence | 5 | Offline, API, four risks with fixes | 5 |
| 28% risky medicines, 53.6% self-treat | 6 | Fair test labelling, 85 prescriptions, 480 gaps | 6 |
| Wasted strips, 3 MB | 6 | Pylokit example, Data page for students | 6 |
| Users, buyers, first adopters | 7 | Pilot, pricing, US$30B to 53B | 7 |
| Partners, next features, sharing | 7 | Papers, standards, datasets, links | 8 |

## Slide 2: PARCHI: COUNT DOSES, NOT BRANDS
**Problem statement** (template: 2-3 points; who is affected and how big; why existing solutions fall short)
- A brand name doesn't tell you what's inside. Combination pills hide repeats, and one name can even mean two drugs: Medzol is sold as a sedative in one pack and an acid-reducer in another. (Neelakantan 2024)
- The people with the most pills are hit hardest. 49% of older Indians take many medicines at once, often from doctors who each see only their own prescription. (Bhagavathula 2021)
- Today's tools don't close the gap. They check drugs two at a time, so a dose that adds up across three brands slips through. Hospital warning systems get overridden 46 to 96% of the time (Poly 2020), and chatbots grade how serious an interaction is correctly only 37% of the time (Thapa 2025, Nepal).
- Callout: In September 2026 alone, India's drug regulator flagged 330 medicine samples as not of standard quality. (CDSCO alert reported 23 Oct 2026)

**Our solution** (template: idea; how it addresses the problem; innovation)
- Parchi reads a prescription the way a careful pharmacist would. It works out what is really inside every brand, even a misspelt one, and adds up each ingredient across all brands and all doctors.
- Then it checks the total against the patient's age, weight and kidneys, and looks for repeats, clashes and banned combinations.
- What's different: it counts doses, not just pairs of drugs, and it is built for Indian brand names and the way Indian doctors write dosing.

Image: diagram, Dolo 650 1,950 mg + Crocin Cold&Flu 1,500 mg + Zerodol-P 650 mg = paracetamol 4,100 mg/day against the 4,000 mg limit, INTERRUPT.

## Slide 3: TECHNICAL APPROACH
**System architecture** (data flow; component; integration and output; flow chart): diagram (goes in, safety check, comes out) plus
- Data in. Every line passes a brand matcher that forgives typos and sound-alikes, so 'dollo' and 'Brufan' still land on Dolo and Brufen.
- Dose maths. A reader turns 1-0-1, TDS and SOS into doses a day, and a ledger adds up each ingredient, brand by brand. 'As needed' is counted at its daily maximum.
- Alerts out. Rules compare the totals with limits and look for clashes. What comes out is ranked, with a reason and a source on every alert.

**Core technologies** (languages; hardware; APIs, cloud, tools)
- TypeScript, React and Vite, packaged as an installable web app (PWA). One build runs on any phone, tablet or PC with a browser.
- Python cleans the public drug data once. Two libraries do the heavy lifting: fuse.js for fuzzy matching and Workbox to cache the app.
- A small Vercel API lets an e-pharmacy plug Parchi into its own system. An AI model (Gemini or Claude) only reads dosing text the rules could not, when online, and drafts customer leaflets. It never decides an alert: its answer is checked, sees only the dosing text, and the line is always marked for the pharmacist to confirm. The history check uses the rules only.

**Unique points** (what is different; what is hard to copy)
- Same slip, same answer. Rules decide, so a pharmacist can always ask why.
- Hard to copy: 31,978 Indian brand names cleaned down to ingredients and strengths, tied to about 70,000 drug-pair interactions. (DDInter pairs in `ddi.json`: 70,144)
- It admits what it can't see. Ingredients with no interaction data are listed, so a quiet result is never read as 'safe'.

## Slide 4: USER EXPERIENCE & DESIGN
**User interface** (key screens; main interactions; accessibility)
- Four screens. Check, for one prescription. Review queue, for many orders with the riskiest on top. Order, with each doctor's medicines laid out by date. Data, a look-up of every limit and rule.
- Open an alert to see why it fired. Overriding one needs a reason, and the reason goes into a log. One tap copies a note for the prescriber or the customer.
- Made to be read fast. Every alert has an icon and a word, never colour alone, and the whole app works from a keyboard.

**User flow** (starts; system responds; outcome)
1. An order lands in the queue. The pharmacist opens the top one and sees every doctor's medicines on one timeline.
2. Parchi adds up what overlaps and re-checks when a new kidney result arrives. Brands it doesn't know are marked unverified and left out of the totals.
3. The pharmacist holds or releases the order, and adds a short note if needed.

**Design goal:** In a few seconds the pharmacist sees whether to act, why, and where the warning comes from. Parchi informs. The pharmacist decides.
Screenshot: real order page (ORD-1087, Ramesh K.), cropped to the timeline. Caption: A real screen from the running app.

## Slide 5: FEASIBILITY AND VIABILITY
**Technical** (stack ready; hardware/software; modularity and scale)
- It's built, not a mock-up. 1,137 automated tests pass.
- We tested it against outside lists, not only our own. A US expert panel named 16 drug pairs that must always alert, and we missed most of them. So we fixed it. The doses we could compare also match India's national formulary. (Phansalkar 2012; `rules/oncEndToEnd.test.ts`; `limits/nfiDose.test.ts`)
- A check takes under 3 milliseconds on a laptop (p95 2.5 ms, `eval/scale.json`), and each part can be swapped without touching the rest.
- Callout: 3 → 13 of the 16 must-alert drug pairs now stop the pharmacist (3 are notes on purpose).

**Economic** (prototype cost; scaling cost; funding)
- Almost free to run. It is built on open tools, and a check runs on the pharmacist's own device.
- Cost grows slowly for the same reason. The one real cost is data: our interaction database is free only for non-commercial use, so a paid product needs a licensed one.
- No outside funding is needed to start. Revenue comes from the buyers on slide 7.

**Operational** (deployment; risks; strategies)
- It runs in a browser and works offline after the first load, which suits counters with patchy internet. An API connects it to an e-pharmacy's own review desk.
- Risk: it sounds like dose advice. Every alert ends 'pharmacist to review', and a test blocks any wording that names a dose. India's 2026 software rules put inform-only tools in the lowest-risk group.
- Risk: a wrong number hurts someone. Every limit stays marked 'not approved' until a pharmacist signs it. None has yet.
- Risk: patient privacy. We store nothing. The DPDP Act fines go up to ₹250 crore.
- Risk: more typing for a busy pharmacist. It reads the order data the buyer already has (CSV or FHIR).

## Slide 6: IMPACT AND BENEFITS
- **Social:** Safer for those most at risk. 28% of older Indians take medicines doctors advise against at their age, and 53.6% of Indians treat themselves. A check at the counter catches what no single doctor sees. A second pair of eyes for pharmacists, one that doesn't get tired at the end of a long queue.
- **Environmental:** A duplicate caught early is a strip that isn't sold, taken or thrown away. The whole app is about 3 MB, downloaded once. We haven't measured any of this. It is a likely benefit, not a result.
- **Technical:** A fair way to test a safety tool. Every test says who wrote its answer: a published source, or us. Ours are never called proof. 85 realistic Indian prescriptions (ours), plus a list of our own gaps, such as 480 brands where a second listing shows an ingredient our data lacks.
- **Educational:** Each alert names the brand that hides the ingredient. Pylokit looks like a stomach kit; it contains clarithromycin. Staff learn the hidden ones by seeing them. The Data page shows every limit and where it came from, so a pharmacy student can check our work.

## Slide 7: BUSINESS MODEL & SUSTAINABILITY
**Target users** (primary; institutions; early adopters) *proposed*
- Who uses it: the pharmacist who checks each order at an e-pharmacy or a chain's counter. Not doctors, not patients.
- Who buys it: e-pharmacies like Tata 1mg, whose pharmacists already review every prescription, and chains like Apollo and MedPlus. Hospitals come later.
- Who goes first: a chain's central review desk, where one team checks many orders.

**Revenue and cost** (pilot; pricing; growth) *proposed*
- Pilot: free at one partner pharmacy, to measure the minutes saved and the errors caught.
- Pricing: a small fee per check for e-pharmacies, a licence per store for chains, free for independent chemists.
- They would pay because reviews go faster and fewer risky products reach customers.
- Callout: US$30B → 53B, India's pharmacy retail, 2025 to 2031 (Ken Research estimate).

**Sustainability** (partnerships; expansion; open source)
- Partners: a panel of pharmacists signs off the limits and rules. Buyers share their own product catalogue.
- Next: breastfeeding checks, more rules for older patients, and the customer leaflet in more languages.
- Open to checking: we would share our test set and source list so anyone can test our claims. The licence is still to be decided.

## Slide 8: RESEARCH AND REFERENCES
Left, ten references: Poly 2020; Sicard 2025; Thapa 2025; Bhagavathula 2021; Neelakantan 2024; Rashid 2020; Phansalkar 2012; Lapi 2013 (BMJ 346:e8525, recalled; check before print); AGS Beers 2023; Cockcroft-Gault 1976.
Right: standards (HL7 FHIR for ABDM, Cockcroft-Gault, WHO AWaRe); datasets (DDInter 2.0: 302,516 interactions, 2,310 drugs; Kaggle A-Z and 1mg brand data; CDSCO lists: 156 combinations banned in 2024, 16 more in June 2026, plus monthly quality alerts; Jan Aushadhi; openFDA labels; Eka Care sets); existing solution (medThinks, public page checked 24 Oct); documentation links.

## Before presenting
- Re-run `npm test` and `npm run eval`; the deck states 1,137 tests, 3 → 13, 85 prescriptions, 480 brands, under 3 ms. Update the deck if they move.
- "India's 2026 software rules ... lowest-risk group" rests on secondary summaries of the CDSCO guidance (National Law Review, MedDeviceGuide). Confirm on cdsco.gov.in before saying a class letter aloud.
- The Lapi 2013 citation was written from memory. Look it up before the deck is printed.
- No chatbot has been scored. Do not say "beats ChatGPT". Slide 2 quotes published studies only.
- One human review so far: an MBBS GP, 24 Oct, covering `eval/reviewer_list.md` sections A-D. Say exactly that if asked.
- Open items: live prototype link and idea video link (slide 9 has none); open-source licence undecided; slide 7 is a proposal, not a signed pilot.
