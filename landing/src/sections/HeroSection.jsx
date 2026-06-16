import React from "react";
import { CustomLink } from "../components/CustomLink.jsx";
import "./HeroSection.css";

export function HeroSection() {
  return (
    <section className="hero-section" id="top">
      <div className="hero-content">
        <h1>Decisions as fast as thought</h1>
        
        <p className="hero-subtitle">
          A new era of data engineering, designed in natural language.
          Don't lose time managing ETL pipelines. Our system creates a projection of the cleaned data so everything feels almost instant.
        </p>

        <div className="hero-actions-container">
          <a className="btn-download" href="https://app.statsparrot.com/signup">
            <span>Try for free</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: "6px" }}>
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </a>

          <CustomLink className="btn-contact-sales" to="/contact">
            Contact sales
          </CustomLink>
        </div>
      </div>
    </section>
  );
}
