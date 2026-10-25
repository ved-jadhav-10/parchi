import '../styles/demo.css'
import { TrailerVideo } from '../components/TrailerVideo'
import { Icon } from '../components/Icons'
import { PageIntro } from '../components/PageIntro'
import { SCENARIOS } from '../tour/scenarios'
import { startTour } from '../tour/store'

/** Watch the film, or pick a story: each one drives the real app, typing and clicking for you, and lights up what matters. */
export const DemoPage = () => (
  <>
    <PageIntro title="Demo" note="Watch it in thirty seconds, or let Parchi walk you through the real screens." />
    <div className="workspace workspace--single workspace--flat">
      <TrailerVideo />

      <section className="stories" aria-labelledby="stories-title">
        <h2 id="stories-title" className="stories__title">
          Pick a story
        </h2>
        <p className="hint">Each one runs on the real app and the sample account. Watch it play like a film, or drive it yourself and press the lit buttons. Either way a pointer shows what it is doing.</p>
        <ol className="stories__list">
          {SCENARIOS.map((s, i) => (
            <li key={s.id} className="story">
              <span className="story__num" aria-hidden="true">
                {i + 1}
              </span>
              <div className="story__text">
                <h3>{s.title}</h3>
                <p>{s.blurb}</p>
                <p className="story__meta">
                  {s.minutes} · {s.steps.length} steps
                </p>
              </div>
              <div className="story__go">
                <button type="button" className="btn btn--primary" onClick={() => startTour(s.id, true)}>
                  <Icon name="play" size={14} /> Watch it play<span className="sr-only">: {s.title}</span>
                </button>
                <button type="button" className="btn btn--secondary" onClick={() => startTour(s.id)}>
                  I'll drive<span className="sr-only">: {s.title}</span>
                </button>
              </div>
            </li>
          ))}
        </ol>
        <p className="hint">Press Esc at any time to leave a story. Nothing here is a real order, and nothing is saved except the decisions you choose to make.</p>
      </section>
    </div>
  </>
)
