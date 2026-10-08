import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ReportsView } from "../ReportsView";

describe("ReportsView", () => {
  it("renders the reports list with the mock reports and their schedules", () => {
    render(<ReportsView />);

    expect(screen.getByRole("heading", { name: "Reports" })).toBeTruthy();
    // Default mock reports are listed.
    expect(screen.getByText("Weekly revenue summary")).toBeTruthy();
    expect(screen.getByText("Monthly orders to finance")).toBeTruthy();
    expect(screen.getByText("Exec board PDF")).toBeTruthy();
    // Human-readable schedule is shown for each row.
    expect(screen.getByText("Weekly · Mon · 08:00")).toBeTruthy();
    // The never-run report shows a pending "Not run yet" last-run.
    expect(screen.getByText("Not run yet")).toBeTruthy();
  });

  it("creates a new report through the form", () => {
    render(<ReportsView />);

    // Open the create form.
    fireEvent.click(screen.getByRole("button", { name: /new report/i }));

    // Fill the report name and an email recipient (email is on by default).
    fireEvent.change(screen.getByPlaceholderText("e.g. Weekly revenue summary"), {
      target: { value: "Test report" },
    });
    fireEvent.change(screen.getByPlaceholderText("name@example.com"), {
      target: { value: "test@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /create report/i }));

    // The new report is now at the top of the list.
    expect(screen.getByText("Test report")).toBeTruthy();
    // The form closed, returning to the list view.
    expect(screen.queryByRole("button", { name: /create report/i })).toBeNull();
  });
});
