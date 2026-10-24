/**
 * The start screen: a short statement of what Parchi is, two ways in (check a prescription, see the worked example),
 * and a plain account of how a prescription is checked. It carries no figures; every number in the product is on the
 * pages that read it from data.
 *
 * Structure adapted from LiMap (https://github.com/PalashKurkute/LiMap, Apache License 2.0), home/HomePage.tsx and
 * home/RobotFit.tsx. Modified for Parchi: new copy, flat layout in our palette, no backdrop or team badge.
 * See docs/THIRD_PARTY.md.
 */
import { Icon, type IconName } from '../components/Icons'
import { isMock } from '../engine'

const STAGES: { id: string; title: string; icon: IconName; text: string }[] = [
  {
    id: 'read',
    title: 'Read the slip',
    icon: 'flask',
    text: 'Brand names and doses are matched the way they are written, misspellings included, and each medicine is split into its ingredients.',
  },
  {
    id: 'add',
    title: 'Add it up',
    icon: 'chart',
    text: 'Every ingredient is totalled per day across all brands, so a drug hidden inside a cold tablet still counts.',
  },
  {
    id: 'compare',
    title: 'Compare',
    icon: 'shield',
    text: 'Totals are held against dose limits and rules that come from data files, each with a source and whether a pharmacist approved it.',
  },
  {
    id: 'alert',
    title: 'Alert, sparingly',
    icon: 'inform',
    text: 'Three tiers: Interrupt, Inform and Silent. Interrupts are kept rare, and overriding one needs a reason that is logged.',
  },
]

const HOW_ID = 'how-it-works'

/** Brings the section into view; instant under reduced motion. A button, not a `#` link: `#` is the app's router. */
function scrollToHow() {
  const section = document.getElementById(HOW_ID)
  if (!section) return
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  section.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
  section.querySelector<HTMLElement>('h2')?.focus({ preventScroll: true })
}

export const HomePage = () => (
  <>
    <section className="hero" aria-labelledby="hero-title">
      <h1 id="hero-title" className="hero__title">
        Parchi
      </h1>
      <p className="hero__tag">A second look at every prescription</p>
      <p className="hero__text">
        Parchi reads a typed prescription, adds up each ingredient across every brand, and points a pharmacist to what is worth a second look:
        too much of one drug, doubled-up classes, interactions. It informs; the pharmacist decides.
      </p>
      <div className="actions hero__actions">
        <a className="btn btn--primary" href="#/check">
          Check a prescription <Icon name="arrowRight" size={16} />
        </a>
        <a className="btn btn--secondary" href="#/demo">
          See a worked example
        </a>
      </div>
      <button className="hero__more" onClick={scrollToHow}>
        How it works <Icon name="chevronDown" size={15} />
      </button>
      {isMock && <p className="hero__note">The checks you will see run on demo data until the engine is connected.</p>}
    </section>

    <section id={HOW_ID} className="how" aria-labelledby="how-title">
      <h2 id="how-title" tabIndex={-1} className="how__title">
        How a prescription is checked
      </h2>
      <ol className="how__list">
        {STAGES.map((s, i) => (
          <li key={s.id} className="how__stage card">
            <span className="how__num num" aria-hidden="true">
              {i + 1}
            </span>
            <h3 className="how__name">
              <Icon name={s.icon} size={16} /> {s.title}
            </h3>
            <p>{s.text}</p>
          </li>
        ))}
      </ol>
    </section>
  </>
)
