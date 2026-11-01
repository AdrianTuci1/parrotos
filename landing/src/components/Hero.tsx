import { CommandBox } from "./CommandBox";
import { HOSTED_URL, LOCAL_URL } from "./TopBar";

const TRY_CHIPS = ["Revenue", "Churn", "Retention", "Cohorts", "Inventory", "1998"];

export function Hero() {
  return (
    <section className="hero" id="top">
      <div className="container">
        <h1 className="display">
          <span className="display-line">Ask your data.</span>
          <span className="display-line is-muted">See the answer.</span>
        </h1>

        <p className="lede">
          Statsparrot is an open-source analytics app for your warehouse and your files. Describe a
          metric, get a dashboard, and let the agent explain what moved.
        </p>

        <div className="cta-row">
          <a className="btn-primary" href={LOCAL_URL} target="_blank" rel="noreferrer">
            Try it locally
          </a>
          <a className="btn-secondary" href={HOSTED_URL} target="_blank" rel="noreferrer">
            Deploy on a server
          </a>
        </div>

        <CommandBox />

        <p className="install-hint">
          Paste it in a terminal, then run <code>statsparrot init</code> and{" "}
          <code>statsparrot start</code>.{" "}
          <a className="link-underline" href={LOCAL_URL} target="_blank" rel="noreferrer">
            Local guide →
          </a>
        </p>

        <div className="try-strip">
          <span className="try-label">Ask the agent in the app. Try one:</span>
          <div className="chips">
            {TRY_CHIPS.map((chip) => (
              <span className="chip" key={chip}>
                {chip}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="container">
        <figure className="shot">
          <img
            className="shot-img"
            src="/app-dashboard.jpg"
            width={2000}
            height={1096}
            alt="The Statsparrot dashboard: signups, activation rate and onboarding completion tiles with trend sparklines above a completion funnel, activation by platform bars, and a weekly retention cohort grid."
          />
        </figure>
      </div>
    </section>
  );
}
