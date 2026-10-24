# Demo script (about 4 minutes)

For judges and buyers who are not pharmacists. Everything below runs in the app on this repo; nothing is mocked. Open the installed app, or `npm run build && npm run preview`. Before presenting: load the app once online so it is cached, and have `#/check` open.

Say once, early: **Parchi informs, the pharmacist decides.** Limits and rules are drafts until a pharmacist signs them off; the app says so on screen.

## 1. One prescription: count doses, not brands (1 min) `#/check`

1. Press **Load demo**. The patient is 68 years old, 55 kg, creatinine 1.6.
   Rx: `Dolo 650 1-1-1 x5d; Crocin cold n flu max TDS; Zerodol P BD; Brufan 400 SOS; Ecosprin 75 OD; Pan D OD; Omez 20 OD`
2. **Check prescription.** Point at, in this order:
   - the paracetamol Interrupt: three brands, 4,100 mg a day. Nobody typed "paracetamol" three times; it is hidden in Dolo, Crocin Cold & Flu Max and Zerodol-P
   - the Prescription X-ray bar over its limit
   - "Brufan" matched to Brufen 400, shown as a corrected spelling with its confidence (open the line to see what else it could be; where a match is doubtful there is a **Use this brand** button)
   - the kidney Interrupt: creatinine was asked for only because NSAIDs are on the slip (CrCl about 34)
3. Open **Not covered by the interaction data**: "no alert" is not "no interaction". We say what we cannot see.

## 2. The same slip in a chatbot (30 s) `#/benchmark`

Paste the same text into a chatbot beforehand, or read `eval/report.md`. Show the Benchmark page: engine only, 54 labelled prescriptions, labels marked **draft** until a pharmacist reviews them. If chatbot answers have been saved in `eval/outputs/`, their alerts per prescription and false alarms on clean prescriptions sit beside the engine's. Do not quote a chatbot number that is not on the page.

## 3. The buyer's view: a customer with three doctors (2 min) `#/queue`

1. The **Review queue** ranks three orders. Open the top one (ORD-1087, Ramesh K.).
2. **Timeline:** three doctors, dated, bars overlap. Doses are added up only where the dates overlap. The Interrupt names the doctors and the days.
3. **Kidney function:** a creatinine result "arrived from the platform's lab". Press **Re-check with this result**. A **What changed** card lists the kidney alert that was added.
4. **Unverified brand:** open the second order (ORD-1089). An unknown brand is shown with its closest matches, marked unverified, and kept out of the totals. Press **Use this brand** on a match: the order is checked again, the line joins the totals and **What changed** lists the effect. **Undo** takes it back.
5. **Your decision:** on the first order, open **Query to the doctor (draft)** and show the polite message built from the findings (Parchi sends nothing). Then choose *Hold, contact the doctor* (key 1), add a note, and **Save and open next**. Open **Override log**: the decision is there, with a reason. This is the audit trail a buyer needs.
6. Optional: **Download as FHIR (draft)**, then **History > Import from FHIR** to show the file goes back in.

## 4. Offline and the customer (30 s)

- Turn off Wi-Fi. Run a check: it still works. The header shows Offline.
- Back online, open **Customer leaflet**: pick Hindi, add one point to tell the customer, **Write the leaflet**. It is a draft written only from the medicine names, how each is taken and the typed point; the pharmacist reads it first. (Needs the `/api/leaflet` function and a model key on the server; without them the button reports that leaflets are not set up.)

## If something goes wrong

| Symptom | Say |
|---|---|
| Leaflet fails | "That one needs the server and a key; everything else you saw ran on this device." |
| A brand is not recognised | "That is the point: it is marked unverified and kept out of the totals until a pharmacist confirms it. One button confirms it and the order is checked again." |
| Asked "is it approved?" | "No. Every limit and rule shows a source and `Not approved`; the pharmacist session signs them off." |
| Asked about OCR | "Out of scope on purpose: buyers already digitise the prescription; we take their structured lines." |
