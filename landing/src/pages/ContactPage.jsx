import React, { useState, useEffect } from "react";
import { SiteHeader } from "../sections/SiteHeader.jsx";
import { SiteFooter } from "../sections/SiteFooter.jsx";
import "./ContactPage.css";

export function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: "",
    message: ""
  });
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Mock server submission
    setIsSubmitted(true);
  };

  return (
    <div className="contact-layout">
      <SiteHeader />
      <main className="contact-container">
        <div className="contact-header">
          <h1>Contact Sales</h1>
          <p>Let's discuss how Statsparrot can clean, project, and engineer Sentry data models for your team.</p>
        </div>

        {isSubmitted ? (
          <div className="success-message" aria-live="polite">
            <div className="success-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h2>Message Sent Successfully!</h2>
            <p>Thank you for reaching out. A representative from staticlabs will contact you shortly.</p>
          </div>
        ) : (
          <form className="contact-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="name">Full Name</label>
              <input
                type="text"
                id="name"
                name="name"
                required
                placeholder="John Doe"
                className="form-control"
                value={formData.name}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">Work Email</label>
              <input
                type="email"
                id="email"
                name="email"
                required
                placeholder="john@company.com"
                className="form-control"
                value={formData.email}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="company">Company</label>
              <input
                type="text"
                id="company"
                name="company"
                required
                placeholder="Company Inc."
                className="form-control"
                value={formData.company}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="message">Message</label>
              <textarea
                id="message"
                name="message"
                required
                placeholder="Tell us about your Sentry data volume and data engineering requirements..."
                className="form-control"
                value={formData.message}
                onChange={handleChange}
              />
            </div>

            <button type="submit" className="btn-submit">
              Send Message
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </form>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
