# Demo script (10 minutes: 3 screens)

For judges who are not pharmacists. Everything runs in the app on this repo; nothing is mocked. Round 1 gives 10 minutes for the deck, the prototype and questions together (HOLES H16), so the demo is **three screens and one fallback each**. Before presenting: load the app once online so it is cached, and have `#/check` open.

Say once, early: **Parchi informs, the pharmacist decides.** Limits and rules are drafts; the app says so on screen, with the data version. The one human review so far was an MBBS GP on 24 Oct 2026 (`docs/VERIFIED.md`); say exactly that.

## Screen 1: the error a doctor fears (1 min) `#/check`
Type `Folitrax 7.5 OD` (age 52). **Interrupt: methotrexate is a weekly medicine and the dosing reads daily.** This is the commonest fatal prescribing error with methotrexate. Now type `Folitrax 7.5 once weekly; Septran DS BD x7d`: **Interrupt: methotrexate with co-trimoxazole.** (Say: the second one stops on clinical consensus; the reviewer has it on the list.)

## Screen 2: the hidden ingredient, in one prescription (2 min) `#/check`, Load demo
Patient 68 years, 55 kg, creatinine 1.6. Press **Load demo**, then **Check prescription**.
- **Two Interrupts.** Paracetamol 4,100 mg/day from three brands (Dolo, Crocin Cold & Flu Max, Zerodol-P); nobody typed paracetamol three times. And **two NSAIDs** (aceclofenac inside Zerodol-P, ibuprofen as "Brufan", matched to Brufen) in a 68-year-old with aspirin and kidney function of about 34.
- The X-ray bar over its limit; the source on every alert; the "Not covered by the interaction data" list ("no alert" is not "no interaction").
- Optional, 30 s: tick **More about the patient**, enter allergy `penicillin`, type `Mox CV 625 BD` on a new line: **Interrupt: amoxicillin hidden inside the brand.**

## Screen 3: three doctors, one customer (3 min) `#/queue`
Open the top order (ORD-1087, Ramesh K.).
1. **Workings:** open the calendar and the timeline: three doctors, dates; bars that overlap add up.
2. **Kidney function:** a creatinine "from the platform lab" arrived. **Re-check with this result.** The **What changed** card lists the kidney caution that appeared.
3. **Status:** it reads **Needs pharmacist attention** (not "contact the doctor": Indian pharmacists rarely reach prescribers).
4. **Unverified brand:** open the second order (ORD-1089). An unknown brand is shown with its closest matches, marked unverified and left out of the totals. Press **Use this brand** on a match: the order is checked again, the line joins the totals and **What changed** lists the effect. **Undo** takes it back.
5. **Your decision:** on the first order, open **Message about this order (draft)**: a polite note for the prescriber, or for the customer (it quotes the alerts, adds no advice, and Parchi sends nothing). Then choose *Hold the order* (key 1), add a note, **Save and open next**. Open **Overrides**: the decision is there with its reason.

## Close (1 min) `#/benchmark` and `docs/VERIFIED.md`
Say what is **verified by whom**: ONC high-priority pairs, FDA labels, the National Formulary of India and Eka Care's brand list are outside sources; the 54 + 31 prescriptions are ours and unreviewed; nothing is pharmacist-approved. 1,100+ automated tests. Do not quote a chatbot number: none has been scored.

## If a judge types their own prescription
Anything we cannot read comes back as **not recognised, left out of the totals**, never as a confident guess. A line with no dosing is not guessed either: "dosing not entered". Brand not in the index: **unverified**, with its closest match.

## If something goes wrong
| Symptom | Say |
|---|---|
| The leaflet fails | "That one needs the server and a key; everything else you saw ran on this device." |
| A brand is not recognised | "That is the point: it is marked unverified and kept out of the totals until a pharmacist confirms." |
| Asked "is it approved?" | "No. Every limit and rule shows a source and `Not approved`. A GP reviewed the 24 Oct reviewer list; a pharmacist has not." |
| Asked "how accurate?" | "We do not claim accuracy. Outside checks: of the 16 US high-priority interaction pairs, 13 stop the pharmacist and 3 are documented exceptions, 5 of 5 comparable doses match the Indian formulary, and on Eka Care's list only 1.4% of the brands we name are confidently wrong (about half agree on composition; the rest are partial or differently listed). The benchmark is ours." |
| Asked about OCR | "Out of scope on purpose: buyers already digitise the prescription; we take their structured lines." |
| Asked "why not ChatGPT?" | "It invents interactions and grades severity wrongly in published studies; we give the same answer every time with a source. We have not scored a chatbot ourselves." |
| The network drops | "The check runs on this device, so nothing changes." (Turn Wi-Fi off to show it.) |
