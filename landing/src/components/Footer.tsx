import { DOCS_URL, GITHUB_URL, LICENSE_URL } from "./TopBar";

export function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <span>made by staticlabs</span>
        <nav className="footer-links" aria-label="Footer">
          <a href={GITHUB_URL} target="_blank" rel="noreferrer">
            GitHub
          </a>
          <a href={DOCS_URL} target="_blank" rel="noreferrer">
            Docs
          </a>
          <a href={LICENSE_URL} target="_blank" rel="noreferrer">
            License
          </a>
        </nav>
      </div>
    </footer>
  );
}
