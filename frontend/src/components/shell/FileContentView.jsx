import { useMemo } from "react";
import { getMockFileContent } from "@/data/mockFileContents";
import "@/styles/file-view.css";

/**
 * Rill-style file content viewer for the `/files/{filePath}` route.
 *
 * Rill opens a project file in a CodeMirror editor (SQL, YAML, Markdown) or, for
 * data files such as CSV, a preview. In mock mode there is no runtime editor, so
 * this renders the file's content from the mock project (see mockFileContents.js)
 * in a light editor chrome: a header with the breadcrumb path + a file-type badge,
 * then a code surface (monospace, with a line-number gutter) for code files or a
 * small table for CSV.
 */
export function FileContentView({ filePath }) {
  const content = useMemo(() => getMockFileContent(filePath), [filePath]);

  const ext = (filePath?.split(".").pop() || "").toLowerCase();
  const isCsv = ext === "csv" || ext === "tsv";
  const isCode = !isCsv;
  const label = ext ? ext.toUpperCase() : "FILE";
  const fileName = filePath?.split("/").pop() || filePath;

  const csv = useMemo(() => parseCsv(content), [content, isCsv]);

  if (content === undefined) {
    return (
      <div className="file-view">
        <div className="file-view-header">
          <span className="file-view-path">{filePath}</span>
          <span className="file-view-badge">NO PREVIEW</span>
        </div>
        <div className="file-view-empty">
          No preview available for this file type in demo mode.
        </div>
      </div>
    );
  }

  return (
    <div className="file-view" data-testid="file-content">
      <div className="file-view-header">
        <span className="file-view-path" title={filePath}>{filePath}</span>
        <span className="file-view-badge">{label}</span>
      </div>

      {isCsv && csv.length > 0 ? (
        <div className="file-view-table-wrap">
          <table className="file-view-table">
            <thead>
              <tr>
                {csv[0].map((cell, i) => (
                  <th key={i}>{cell}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {csv.slice(1).map((row, ri) => (
                <tr key={ri}>
                  {row.map((cell, ci) => (
                    <td key={ci}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="file-view-code">
          <div className="file-view-gutter" aria-hidden="true">
            {content.split("\n").map((_, i) => (
              <span key={i}>{i + 1}</span>
            ))}
          </div>
          <pre className="file-view-pre">
            <code>{content}</code>
          </pre>
        </div>
      )}

      <div className="file-view-footer">
        <span>Demo file · no live runtime</span>
        <span className="file-view-name">{fileName}</span>
      </div>
    </div>
  );
}

function parseCsv(text) {
  if (typeof text !== "string") return [];
  return text
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line) => line.split(","));
}

export default FileContentView;
