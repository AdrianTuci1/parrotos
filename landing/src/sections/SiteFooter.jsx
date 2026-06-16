import React from "react";
import { CustomLink } from "../components/CustomLink.jsx";
import "./SiteFooter.css";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-container">
        <div className="footer-left">
          <div className="footer-brand">
            <img src="/logo.png" alt="Statsparrot logo" className="footer-logo-img" />
            <span className="footer-logo-text">statsparrot</span>
          </div>
          <div className="footer-credits-container">
            <span className="footer-copyright">
              © {new Date().getFullYear()} Statsparrot. All rights reserved.
            </span>
            <span className="footer-byline">
              brought to you by <a href="https://staticlabs.ro" target="_blank" rel="noopener noreferrer" className="footer-byline-link">staticlabs</a>
            </span>
          </div>
        </div>
        
        <div className="footer-right">
          <a href="#docs" className="footer-link">Docs</a>
          <CustomLink to="/privacy" className="footer-link">Privacy</CustomLink>
          <CustomLink to="/terms" className="footer-link">Terms</CustomLink>
        </div>
      </div>
    </footer>
  );
}
