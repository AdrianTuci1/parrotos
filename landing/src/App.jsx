import React, { useState, useEffect } from "react";
import { LandingPage } from "./pages/LandingPage.jsx";
import { PrivacyPage } from "./pages/PrivacyPage.jsx";
import { TermsPage } from "./pages/TermsPage.jsx";
import { ContactPage } from "./pages/ContactPage.jsx";

export function App() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname);
    };
    
    window.addEventListener("popstate", handleLocationChange);
    return () => {
      window.removeEventListener("popstate", handleLocationChange);
    };
  }, []);

  switch (currentPath) {
    case "/privacy":
      return <PrivacyPage />;
    case "/terms":
      return <TermsPage />;
    case "/contact":
      return <ContactPage />;
    default:
      return <LandingPage />;
  }
}
