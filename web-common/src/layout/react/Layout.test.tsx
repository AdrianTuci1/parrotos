import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import Header from "./Header";
import HeaderLogo from "./HeaderLogo";
import WorkspaceContainer from "./WorkspaceContainer";
import SurfaceControlButton from "./SurfaceControlButton";
import Footer from "./Footer";
import ApplicationHeader from "./ApplicationHeader";
import Navigation from "./Navigation";
import { Resizer } from "./Resizer";

describe("layout/react port", () => {
  it("Header renders children and toggles the border-bottom class", () => {
    const { container, rerender } = render(<Header>hello</Header>);
    const header = container.querySelector("header")!;
    expect(header).toHaveClass("border-b");
    expect(header).toHaveTextContent("hello");

    rerender(<Header borderBottom={false}>hello</Header>);
    expect(header).toHaveClass("border-transparent");
  });

  it("HeaderLogo renders the Rill mark when no logoUrl is supplied", () => {
    const { container } = render(<HeaderLogo />);
    expect(container.querySelector("a")).toHaveAttribute("href", "/");
    expect(container.querySelector("svg")).toBeTruthy();
  });

  it("HeaderLogo renders an image when logoUrl is supplied", () => {
    const { container } = render(<HeaderLogo logoUrl="/logo.png" />);
    expect(container.querySelector("img")).toHaveAttribute("src", "/logo.png");
  });

  it("WorkspaceContainer renders body, header and inspector surfaces", () => {
    render(
      <WorkspaceContainer
        header={<div>hdr</div>}
        inspectorContent={<aside>insp</aside>}
      >
        <div>body</div>
      </WorkspaceContainer>,
    );
    expect(screen.getByText("body")).toBeTruthy();
    expect(screen.getByText("hdr")).toBeTruthy();
    expect(screen.getByText("insp")).toBeTruthy();
  });

  it("WorkspaceContainer hides the inspector when inspector=false", () => {
    render(
      <WorkspaceContainer inspector={false} inspectorContent={<aside>insp</aside>}>
        <div>body</div>
      </WorkspaceContainer>,
    );
    expect(screen.queryByText("insp")).toBeNull();
    expect(screen.getByText("body")).toBeTruthy();
  });

  it("SurfaceControlButton calls onClick and reflects open state in the label", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<SurfaceControlButton navWidth={240} navOpen onClick={onClick} />);
    const btn = screen.getByRole("button", { name: "nav_close_sidebar" });
    await user.click(btn);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("Footer renders the version string and the report-issue link", () => {
    render(<Footer version="1.2.3" commitHash="abc123" />);
    expect(screen.getByText(/1\.2\.3/)).toBeTruthy();
    expect(screen.getByText(/abc123/)).toBeTruthy();
    const issueLink = screen.getByRole("link", { name: /footer_report_issue/ });
    expect(issueLink.getAttribute("href")).toContain(
      "https://github.com/rilldata/rill/issues/new",
    );
  });

  it("ApplicationHeader renders the mode tag and actions", () => {
    render(
      <ApplicationHeader mode="Developer" actions={<button>act</button>}>
        redundant
      </ApplicationHeader>,
    );
    expect(screen.getByText("Developer")).toBeTruthy();
    expect(screen.getByText("act")).toBeTruthy();
  });

  it("Resizer reports the basis size on double click", async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn();
    render(
      <Resizer dimension={240} basis={180} onUpdate={onUpdate}>
        <span>handle</span>
      </Resizer>,
    );
    await user.dblClick(screen.getByRole("button"));
    expect(onUpdate).toHaveBeenCalledWith(180);
  });

  it("Navigation renders the file-explorer slot and toggles via the surface control", async () => {
    const user = userEvent.setup();
    render(<Navigation fileExplorer={<div>FE</div>} />);
    // The file-explorer slot is always mounted (it lives in the scroll container).
    expect(screen.getByText("FE")).toBeTruthy();

    // Open by default → the control label is the "close" message key.
    const control = screen.getByRole("button", { name: "nav_close_sidebar" });
    await user.click(control);
    // After toggling closed, the sidebar is hidden and the label flips.
    expect(
      await screen.findByRole("button", { name: "nav_show_sidebar" }),
    ).toBeTruthy();
  });
});
