import { PublicHeader } from "@/components/shell/PublicHeader";
import "@/styles/shell.css";

export function PublicShell({ children, projectName }) {
  return (
    <div className="public-shell">
      <PublicHeader projectName={projectName} />
      <div className="public-content-wrapper">
        <div className="public-content-inner">
          {children}
        </div>
      </div>
    </div>
  );
}
