import React, { useEffect } from "react";
import { SiteHeader } from "../sections/SiteHeader.jsx";
import { SiteFooter } from "../sections/SiteFooter.jsx";
import "./LegalPage.css";

export function PrivacyPage() {
  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="legal-layout">
      <SiteHeader />
      <main className="legal-container">
        <article className="legal-content">
          <h1>Privacy Policy</h1>
          <span className="last-updated">Last Updated: June 16, 2026</span>

          <p>
            At Statsparrot, brought to you by staticlabs, we are committed to protecting your privacy. This Privacy Policy describes how we collect, use, and share information in connection with your use of our platform, website, and services.
          </p>

          <h2>1. Information We Collect</h2>
          <p>
            We collect information that you provide directly to us when creating an account, setting up database connections, or interacting with our AI data agents. This may include:
          </p>
          <ul>
            <li>Account Information (Name, email address, password).</li>
            <li>Connection configuration details (excluding sensitive credentials which are encrypted and stored locally).</li>
            <li>Natural language prompts and queries sent to our database assistants.</li>
          </ul>

          <h2>2. How We Use Your Information</h2>
          <p>
            We use the collected information for purposes such as to:
          </p>
          <ul>
            <li>Provide, maintain, and optimize the Statsparrot data platform.</li>
            <li>Train and improve our local schema understanding and query generation models.</li>
            <li>Communicate with you about updates, features, and beta releases.</li>
          </ul>

          <h2>3. Data Projections and Local Storage</h2>
          <p>
            Unlike traditional ETL platforms, Statsparrot creates projections of cleaned data. These projections are stored in your selected environment. We do not store, cache, or sell your underlying transaction data or analytical databases.
          </p>

          <h2>4. Security</h2>
          <p>
            We implement industry-standard administrative, technical, and physical security measures to safeguard your information. However, no database or transmission over the Internet is entirely secure, and we cannot guarantee absolute security.
          </p>

          <h2>5. Contact Us</h2>
          <p>
            If you have any questions or concerns regarding this Privacy Policy, please reach out to us at <code>privacy@staticlabs.com</code>.
          </p>
        </article>
      </main>
      <SiteFooter />
    </div>
  );
}
