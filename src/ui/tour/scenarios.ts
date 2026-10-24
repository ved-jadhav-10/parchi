/**
 * The guided stories on the Demo page. A story drives the real app: it moves between pages, types into the real fields and
 * lights up the real result, so what a visitor sees is what a pharmacist gets. Text here describes the sample data only;
 * nothing is a clinical statement beyond what the app itself shows.
 */

/** Finds an element: a CSS selector, optionally the `nth` match, optionally the first match whose text contains `text`. */
export interface Target {
  css: string
  text?: string
  nth?: number
}

export type Action = { click: Target } | { type: Target; text: string } | { wait: number }

export interface Step {
  /** Hash route to open first, e.g. `check` or `queue`. Omit to stay where the visitor is. */
  route?: string
  /** Done for the visitor when the step opens, in order, before the spotlight lands. */
  before?: Action[]
  /** What to light up. Omit for a centred card. */
  target?: Target
  title: string
  body: string
  /** The visitor does this click themselves (the lit area stays live); "Do it for me" is offered as a fallback. */
  userClicks?: Target
  /** Button at the end of the story. */
  cta?: { label: string; href: string }
}

export interface Scenario {
  id: string
  title: string
  blurb: string
  minutes: string
  steps: Step[]
}

const textarea: Target = { css: 'textarea.rx-input' }
const ageInput: Target = { css: 'input[type="number"]', nth: 0 }
const runCheck: Target = { css: 'button.btn--primary', text: 'Check' }
const firstInterrupt: Target = { css: '.alert[data-tier="interrupt"]' }

export const SCENARIOS: Scenario[] = [
  {
    id: 'hidden-dose',
    title: 'One drug, three brands',
    blurb: 'A 68-year-old is prescribed seven medicines. Nobody typed paracetamol three times, but the patient would take it three times.',
    minutes: '1 min',
    steps: [
      {
        route: 'check',
        title: 'It starts the way prescriptions arrive',
        body: 'Brand names, not ingredients, typed from a doctor’s slip. Parchi works from lines like these, so the buyer’s own order data is all it needs.',
      },
      {
        before: [{ click: { css: 'button', text: 'Load demo' } }, { wait: 500 }],
        target: textarea,
        title: 'Seven medicines, one prescription',
        body: 'Dolo 650, Crocin Cold & Flu Max, Zerodol-P and four more, with the patient’s age, weight and creatinine already filled in.',
      },
      {
        target: runCheck,
        userClicks: runCheck,
        title: 'Press Check prescription',
        body: 'It runs on this device. Turn the network off and it still works.',
      },
      {
        target: firstInterrupt,
        title: 'Interrupt: the one thing to look at first',
        body: 'Parchi added the same ingredient across brands and compared the daily total with the limit on file. Every alert shows its reason and its source.',
      },
      {
        before: [{ click: { css: '[role="tab"]', text: 'X-ray' } }, { wait: 300 }],
        target: { css: '[role="tabpanel"]' },
        title: 'The X-ray: every ingredient, one total',
        body: 'Brands on the left, the daily total on the right, with the limit as a bar. Anything Parchi has no limit for is said so, not guessed.',
      },
      {
        title: 'Parchi informs. The pharmacist decides.',
        body: 'Limits and rules are drafts until a pharmacist signs them off, and the app says so on screen.',
        cta: { label: 'Try your own prescription', href: '#/check' },
      },
    ],
  },
  {
    id: 'weekly-not-daily',
    title: 'Weekly, not daily',
    blurb: 'A methotrexate dose that reads “once a day”. Then a dose that reads weekly, with an antibiotic that should not join it.',
    minutes: '1 min',
    steps: [
      {
        route: 'check',
        before: [{ type: ageInput, text: '52' }, { type: textarea, text: 'Folitrax 7.5 OD' }],
        target: textarea,
        title: 'One short line',
        body: 'Folitrax is methotrexate, a medicine taken once a week. The line says OD, once daily. That mix-up is a well-known and serious prescribing error.',
      },
      {
        target: runCheck,
        userClicks: runCheck,
        title: 'Press Check prescription',
        body: 'Parchi reads the brand, the strength and the dosing text together.',
      },
      {
        target: firstInterrupt,
        title: 'Interrupt: a weekly medicine written as daily',
        body: 'It is raised at the highest tier, and it says what it saw. The pharmacist confirms with the prescriber.',
      },
      {
        before: [
          { type: textarea, text: 'Folitrax 7.5 once weekly; Septran DS BD x7d' },
          { click: runCheck },
          { wait: 700 },
        ],
        target: firstInterrupt,
        title: 'Fix the schedule, add an antibiotic',
        body: 'The dosing is now weekly. Methotrexate with co-trimoxazole (Septran) is still an Interrupt, a draft rule that rests on clinical consensus.',
      },
      {
        title: 'Same input, same answer, every time',
        body: 'The checks are rules and data, not a chatbot, so they do not drift, and they work offline.',
        cta: { label: 'Open the benchmark', href: '#/benchmark' },
      },
    ],
  },
  {
    id: 'three-doctors',
    title: 'Three doctors, one customer',
    blurb: 'Ramesh K. sees three doctors in a week. The review queue puts the order that needs a person at the top.',
    minutes: '2 min',
    steps: [
      {
        route: 'queue',
        target: { css: '.queue__row' },
        title: 'The review queue, ranked',
        body: 'Orders with Interrupts come first, then notes to check, then clean ones. The top row is the one to open.',
      },
      {
        target: { css: '.queue__open' },
        userClicks: { css: '.queue__open' },
        title: 'Open the first order',
        body: 'Press Review. Ramesh K. has prescriptions from three doctors.',
      },
      {
        target: firstInterrupt,
        title: 'What no single doctor could see',
        body: 'Dr Mehta and Dr Rao each wrote a paracetamol brand. Parchi merged both into one timeline and added them up.',
      },
      {
        before: [{ click: { css: '[role="tab"]', text: 'Timeline' } }, { wait: 400 }],
        target: { css: '.tl' },
        title: 'The timeline, by doctor and day',
        body: 'Where bars from different doctors overlap, the doses add up. A line with no written duration uses a default window, and says so.',
      },
      {
        target: { css: 'button', text: 'Re-check with this result' },
        userClicks: { css: 'button', text: 'Re-check with this result' },
        title: 'A new kidney result arrives',
        body: 'A creatinine value came in from the platform lab. Press Re-check with this result.',
      },
      {
        target: { css: '.decisionbar' },
        title: 'Your decision',
        body: 'Parchi suggests a status, and you choose. Choosing differently needs a reason. Every decision and override is logged.',
      },
      {
        title: 'That is the whole loop',
        body: 'Order in, merged history, ranked alerts, one human decision, and a log.',
        cta: { label: 'Open the review queue', href: '#/queue' },
      },
    ],
  },
]

export const scenarioById = (id: string) => SCENARIOS.find((s) => s.id === id)
