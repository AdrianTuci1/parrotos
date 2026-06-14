import { useAppStore } from "@/stores/useAppStore";
import "@/styles/header.css";

export function PublicHeader({ projectName }) {
  return (
    <header className="app-header">
      <div className="app-header-inner">
        <div className="header-left-side">
          <div className="header-section-title">
            <div className="header-section-copy">
              <span className="header-section-text" style={{ fontWeight: 600 }}>
                Parrot
              </span>
              <span className="header-section-text" style={{ opacity: 0.5, margin: "0 8px" }}>
                /
              </span>
              <span className="header-section-text">
                {projectName}.analytics
              </span>
            </div>
          </div>
        </div>

        <div className="header-right-side">
        </div>
      </div>
    </header>
  );
}
