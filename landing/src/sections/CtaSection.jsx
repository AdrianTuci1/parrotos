import { CONTACT_EMAIL } from "../config.js";

export function CtaSection() {
  return (
    <section className="cta-band" id="launch">
      <div>
        <span className="eyebrow">Ready to ship the pipeline</span>
        <h2>Bring product, marketing, and ops telemetry into one analysis layer.</h2>
      </div>
      <a className="primary-button" href={`mailto:${CONTACT_EMAIL}`}>Request private beta</a>
    </section>
  );
}
