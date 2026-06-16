import React, { useEffect } from "react";
import { SiteHeader } from "../sections/SiteHeader.jsx";
import { SiteFooter } from "../sections/SiteFooter.jsx";
import "./LegalPage.css";

export function TermsPage() {
  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="legal-layout">
      <SiteHeader />
      <main className="legal-container">
        <article className="legal-content">
          <h1>Terms of Service</h1>
          <span className="last-updated">Last Updated: June 16, 2026</span>

          <p>
            Welcome to Statsparrot, a service brought to you by staticlabs. By accessing or using our platform, website, or APIs, you agree to comply with and be bound by these Terms of Service.
          </p>

          <h2>1. Use of the Service</h2>
          <p>
            You agree to use Statsparrot only for lawful purposes and in accordance with these Terms. You are responsible for ensuring that all data connected to or analyzed by our platform is obtained and used in compliance with applicable local and international laws.
          </p>

          <h2>2. Account Security</h2>
          <p>
            To use certain features, you must register for an account. You are solely responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. Notify us immediately of any unauthorized use.
          </p>

          <h2>3. Intellectual Property</h2>
          <p>
            The platform, including its codebase, logo designs, custom charts, interfaces, and proprietary AI agent frameworks, is the intellectual property of staticlabs. You may not copy, reverse-engineer, modify, or distribute any part of the service without explicit written permission.
          </p>

          <h2>4. Limitation of Liability</h2>
          <p>
            Statsparrot provides instant data projections and data cleaning services. To the maximum extent permitted by law, staticlabs is provided "as is" and shall not be liable for any indirect, incidental, or consequential damages resulting from data loss, connection issues, or erroneous query projections.
          </p>

          <h2>5. Termination</h2>
          <p>
            We reserve the right to suspend or terminate your access to the service at our sole discretion, without notice, if we believe you are violating these Terms or engaging in unauthorized or harmful activities.
          </p>

          <h2>6. Changes to Terms</h2>
          <p>
            We may modify these Terms of Service from time to time. We will notify you of any changes by updating the "Last Updated" date at the top of this page. Your continued use of the platform constitutes acceptance of the new Terms.
          </p>
        </article>
      </main>
      <SiteFooter />
    </div>
  );
}
