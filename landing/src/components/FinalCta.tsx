import { CommandBox } from "./CommandBox";
import { LOCAL_URL, SETUP_URL } from "./TopBar";

export function FinalCta() {
  return (
    <section className="closing">
      <div className="container">
        <h2 className="display closing-display">
          <span className="display-line">Start with a question.</span>
          <span className="display-line is-muted">Ship a dashboard.</span>
        </h2>

        <div className="cta-row">
          <a className="btn-primary" href={LOCAL_URL} target="_blank" rel="noreferrer">
            Try it locally
          </a>
          <a className="btn-secondary" href={SETUP_URL} target="_blank" rel="noreferrer">
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
      </div>
    </section>
  );
}
