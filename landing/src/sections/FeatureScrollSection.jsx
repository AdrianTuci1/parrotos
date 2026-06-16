import React, { useState, useEffect, useRef } from "react";
import "./FeatureScrollSection.css";

const CATEGORIES = [
  {
    id: "category-1",
    label: "Agents",
    eyebrow: "AGENTS",
    heading: "Chat-based pipeline assistants",
    description: "Chat-based agents that help you define, customize, and choose exactly what you want to visualize in your analytics views. Interact with them using natural language to query and transform raw data on the fly. They act as your personal data co-pilot, eliminating the need for complex manual query writing.",
    imageUrl: "/features-agents.png",
    placeholderText: "Agents Chat Interface"
  },
  {
    id: "category-2",
    label: "Mind Map",
    eyebrow: "MIND MAP",
    heading: "Node-based relationship view",
    description: "An interactive, node-based layout designed to visualize data assimilations, fields mapping, and database schemas at a glance. Easily trace how raw events are ingested and transformed into clean projections. It provides a clear, high-level map of your entire data structure in real time.",
    imageUrl: "/features-mindmap.png",
    placeholderText: "Mind Map Node Graph"
  },
  {
    id: "category-3",
    label: "Analytics",
    eyebrow: "ANALYTICS",
    heading: "Interactive charts and dashboards",
    description: "A centralized dashboard view where you can inspect real-time performance metrics, trend lines, and data insights. All reports are rendered instantly to help you make decisions as fast as thought. Customize your layouts dynamically based on recommendations from your agents.",
    imageUrl: "/features-analytics.png",
    placeholderText: "Analytics Dashboard"
  },
  {
    id: "category-4",
    label: "Connectors",
    eyebrow: "CONNECTORS",
    heading: "Bidirectional data pipelines",
    description: "High-speed bidirectional integrations engineered to receive raw source data and pipe processed datasets back out. Seamlessly link your existing databases, warehouses, APIs, and communication tools. Ensure data flows smoothly across your entire software stack without writing custom sync scripts.",
    imageUrl: "/features-connectors.png",
    placeholderText: "Bidirectional Connectors Dashboard"
  }
];

function getCategoryIcon(id) {
  switch (id) {
    case "category-1": // Agents
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
      );
    case "category-2": // Mind Map
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3"/>
          <path d="M12 2v7M12 15v7M2 12h7M15 12h7"/>
        </svg>
      );
    case "category-3": // Analytics
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="20" x2="18" y2="10"/>
          <line x1="12" y1="20" x2="12" y2="4"/>
          <line x1="6" y1="20" x2="6" y2="14"/>
        </svg>
      );
    case "category-4": // Connectors
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="17 1 21 5 17 9"/>
          <path d="M3 11V9a4 4 0 0 1 4-4h14"/>
          <polyline points="7 23 3 19 7 15"/>
          <path d="M21 13v2a4 4 0 0 1-4 4H3"/>
        </svg>
      );
    default:
      return null;
  }
}

export function FeatureScrollSection() {
  const [activeId, setActiveId] = useState("category-1");
  const sectionRefs = {
    "category-1": useRef(null),
    "category-2": useRef(null),
    "category-3": useRef(null),
    "category-4": useRef(null)
  };

  useEffect(() => {
    const handleIntersect = (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveId(entry.target.id);
        }
      });
    };

    const observerOptions = {
      root: null,
      rootMargin: "-45% 0px -45% 0px",
      threshold: 0.1
    };

    const observer = new IntersectionObserver(handleIntersect, observerOptions);

    CATEGORIES.forEach((cat) => {
      const currentRef = sectionRefs[cat.id].current;
      if (currentRef) {
        observer.observe(currentRef);
      }
    });

    return () => {
      CATEGORIES.forEach((cat) => {
        const currentRef = sectionRefs[cat.id].current;
        if (currentRef) {
          observer.unobserve(currentRef);
        }
      });
    };
  }, []);

  const scrollToSection = (id) => {
    const targetRef = sectionRefs[id].current;
    if (targetRef) {
      const yOffset = -170; // offset for sticky navbar + sidebar gap
      const y = targetRef.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  };

  return (
    <section className="feature-scroll-section">
      <div className="feature-scroll-header">
        <span className="section-eyebrow">FEATURES</span>
        <h2>Be more productive. Stay in control.</h2>
      </div>

      <div className="feature-scroll-layout">
        
        {/* Left Sticky Sidebar List (Hidden on Mobile) */}
        <aside className="feature-scroll-sidebar">
          <div className="sidebar-nav-sticky">
            {CATEGORIES.map((cat) => {
              const isActive = activeId === cat.id;
              return (
                <button
                  key={cat.id}
                  className={`sidebar-nav-link ${isActive ? "active" : ""}`}
                  onClick={() => scrollToSection(cat.id)}
                >
                  <span className="nav-link-icon-wrapper">
                    {getCategoryIcon(cat.id)}
                  </span>
                  <span className="nav-link-text">{cat.label}</span>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Right Scrolling Column */}
        <div className="feature-scroll-content">
          {CATEGORIES.map((cat) => (
            <div
              key={cat.id}
              id={cat.id}
              ref={sectionRefs[cat.id]}
              className="feature-card-block"
            >
              <div className="feature-card-header">
                <div className="feature-card-eyebrow">
                  <span className="eyebrow-icon">
                    {getCategoryIcon(cat.id)}
                  </span>
                  <span>{cat.eyebrow}</span>
                </div>
                <h3>{cat.heading}</h3>
                
                <div className="feature-card-header-body">
                  <p>{cat.description}</p>
                </div>
              </div>

              {/* Image Placeholder or Actual Image */}
              <div className="feature-card-mockup-wrapper">
                <ImagePlaceholder imageUrl={cat.imageUrl} text={cat.placeholderText} />
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}

/* ==========================================================================
   Mockup Render Helpers (Flat, Crisp, Clean Style)
   ========================================================================== */

function ImagePlaceholder({ imageUrl, text }) {
  if (imageUrl) {
    return (
      <div className="mockup-window image-loaded">
        <img src={imageUrl} alt={text} className="slide-image-element" />
      </div>
    );
  }

  return (
    <div className="image-placeholder">
      <div className="placeholder-icon">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>
      </div>
      <span className="placeholder-text">{text}</span>
    </div>
  );
}
