import React, { useState, useEffect } from "react";
import "./VisualSection.css";
import { VisualFlowMap } from "./VisualFlowMap.jsx";

// Adjustable rotation interval in milliseconds (e.g., 6000ms = 6 seconds)
const ROTATION_INTERVAL = 6000;

// PLACEHOLDERS: To replace the CSS mockups with your screenshots, put the image URLs below:
const SLIDE_IMAGE_1 = "/schema-modeler.png"; // e.g., "/images/screenshot-schema.jpg"
const SLIDE_IMAGE_2 = "/realtime-streams.png"; // e.g., "/images/screenshot-streams.jpg"

export function VisualSection() {
  const containerRef = React.useRef(null);
  const [scale, setScale] = useState(1);
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current) return;
      const parentWidth = containerRef.current.getBoundingClientRect().width;
      // Base layout is built for 1060px
      const baseWidth = 1060;
      
      if (parentWidth < baseWidth) {
        setScale(parentWidth / baseWidth);
      } else {
        setScale(1);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    const timer = setTimeout(handleResize, 100);

    return () => {
      window.removeEventListener("resize", handleResize);
      clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % 3);
    }, ROTATION_INTERVAL);

    return () => clearInterval(timer);
  }, []);

  const baseHeight = 575;
  const currentHeight = baseHeight * scale;

  return (
    <section className="visual-section" id="visualizer">
      <div className="visualizer-slides-container" ref={containerRef}>
        
        {/* Slide 0: Current Interactive Data Flow */}
        <div className={`visualizer-slide ${activeSlide === 0 ? "active" : ""}`}>
          <VisualFlowMap scale={scale} />
        </div>

        {/* Slide 1: Image Placeholder 1 */}
        <div className={`visualizer-slide ${activeSlide === 1 ? "active" : ""}`}>
          <div 
            className="visualizer-container-image"
            style={{ 
              height: `${currentHeight}px`,
              padding: SLIDE_IMAGE_1 ? "0" : "" 
            }}
          >
            {SLIDE_IMAGE_1 ? (
              <img src={SLIDE_IMAGE_1} alt="Data Schema Modeler" className="slide-image" />
            ) : (
              <div className="image-placeholder-content">
                <div className="placeholder-illustration">
                  <svg viewBox="0 0 100 60" width="80" height="48" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="2" width="96" height="56" rx="4" />
                    <line x1="2" y1="14" x2="98" y2="14" />
                    <circle cx="8" cy="8" r="2" fill="currentColor" />
                    <circle cx="16" cy="8" r="2" fill="currentColor" />
                    <circle cx="24" cy="8" r="2" fill="currentColor" />
                    
                    <rect x="10" y="22" width="36" height="12" rx="2" strokeDasharray="2 2" />
                    <rect x="54" y="22" width="36" height="26" rx="2" />
                    <circle cx="72" cy="35" r="5" />
                    <line x1="10" y1="42" x2="46" y2="42" />
                    <line x1="10" y1="48" x2="32" y2="48" />
                  </svg>
                </div>
                <h3 className="placeholder-title">Data Schema Modeler</h3>
                <p className="placeholder-subtitle">Visual UI to define pipelines and map database fields dynamically.</p>
                <span className="placeholder-tag">Placeholder for Screenshot 1</span>
              </div>
            )}
          </div>
        </div>

        {/* Slide 2: Image Placeholder 2 */}
        <div className={`visualizer-slide ${activeSlide === 2 ? "active" : ""}`}>
          <div 
            className="visualizer-container-image"
            style={{ 
              height: `${currentHeight}px`,
              padding: SLIDE_IMAGE_2 ? "0" : "" 
            }}
          >
            {SLIDE_IMAGE_2 ? (
              <img src={SLIDE_IMAGE_2} alt="Real-Time Data Streams" className="slide-image" />
            ) : (
              <div className="image-placeholder-content">
                <div className="placeholder-illustration">
                  <svg viewBox="0 0 100 60" width="80" height="48" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="2" width="96" height="56" rx="4" />
                    <line x1="2" y1="14" x2="98" y2="14" />
                    
                    <path d="M 10 48 L 30 32 L 50 40 L 70 20 L 90 28" />
                    <circle cx="10" cy="48" r="1.5" fill="currentColor" />
                    <circle cx="30" cy="32" r="1.5" fill="currentColor" />
                    <circle cx="50" cy="40" r="1.5" fill="currentColor" />
                    <circle cx="70" cy="20" r="1.5" fill="currentColor" />
                    <circle cx="90" cy="28" r="1.5" fill="currentColor" />
                  </svg>
                </div>
                <h3 className="placeholder-title">Real-Time Data Streams</h3>
                <p className="placeholder-subtitle">Analyze live pipeline throughput, logs, and error rates with sub-second latency.</p>
                <span className="placeholder-tag">Placeholder for Screenshot 2</span>
              </div>
            )}
          </div>
        </div>

      </div>
    </section>
  );
}
