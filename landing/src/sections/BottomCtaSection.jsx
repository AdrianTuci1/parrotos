import React from "react";
import { CustomLink } from "../components/CustomLink.jsx";
import "./BottomCtaSection.css";

export function BottomCtaSection() {
  return (
    <section className="bottom-cta-section">
      {/* Background Image/Gradient Placeholder */}
      <div className="cta-background-placeholder" aria-hidden="true"></div>

      <div className="cta-content-container">
        <h2 className="cta-title">Get instant insights with Statsparrot.</h2>

        <div className="cta-button-group">
          <a href="https://app.statsparrot.com/signup" className="btn-cta-download">
            Try for free
            <span className="arrow-icon" style={{ display: "flex", alignItems: "center" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </span>
          </a>

          <CustomLink to="/contact" className="btn-cta-contact">
            Contact Sales
          </CustomLink>
        </div>
      </div>
    </section>
  );
}
