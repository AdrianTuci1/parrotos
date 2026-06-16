import React, { useState, useEffect } from "react";
import { CustomLink } from "../components/CustomLink.jsx";
import "./SiteHeader.css";

export function SiteHeader() {
  const [showBanner, setShowBanner] = useState(true);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 0) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    
    // Check scroll position on mount
    handleScroll();
    
    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <div className="header-sticky-wrapper">
      {showBanner && (
        <div className={`announcement-banner ${isScrolled ? "hidden" : ""}`}>
          <div className="banner-content">
            <span>🚀 Now live: Real-time Sentry data orchestration & AI analytics.</span>
            <a href="https://app.statsparrot.com/signup" className="banner-link">Try for free →</a>
          </div>
          <button className="banner-close" onClick={() => setShowBanner(false)} aria-label="Close announcement">
            ✕
          </button>
        </div>
      )}

      <header className="site-header-warp">
        <div className="header-container">
          <CustomLink className="brand" to="/" aria-label="Statsparrot home">
            <img src="/logo.png" alt="Statsparrot logo" className="brand-logo" />
            <span className="brand-name-text">statsparrot</span>
          </CustomLink>

          <div className="header-right-actions">
            <a className="btn-signin" href="https://app.statsparrot.com/signin">Sign In</a>
            <a className="btn-signup" href="https://app.statsparrot.com/signup">Sign Up</a>
          </div>
        </div>
      </header>
    </div>
  );
}
