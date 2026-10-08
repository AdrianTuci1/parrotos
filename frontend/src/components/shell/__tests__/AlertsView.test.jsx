import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AlertsView } from "../AlertsView";

describe("AlertsView", () => {
  it("renders the alerts list with the mock alerts and threshold summaries", () => {
    render(<AlertsView />);

    expect(screen.getByRole("heading", { name: "Alerts" })).toBeTruthy();
    // Default mock alerts are listed.
    expect(screen.getByText("High-value orders")).toBeTruthy();
    expect(screen.getByText("Daily revenue drop")).toBeTruthy();
    expect(screen.getByText("Order count anomaly")).toBeTruthy();
    // Human-readable thresholds render in the condition column.
    expect(screen.getByText("Total Revenue >= 15000")).toBeTruthy();
    expect(screen.getByText("Not run yet")).toBeTruthy(); // pending alert row
  });

  it("creates a new alert through the 3-tab form", () => {
    render(<AlertsView />);

    // Open the create form.
    fireEvent.click(screen.getByRole("button", { name: /new alert/i }));

    // Data tab (a measure is pre-selected) -> Next to Criteria.
    fireEvent.click(screen.getByRole("button", { name: /next/i }));

    // Criteria tab: type a numeric threshold, then Next to Delivery.
    fireEvent.change(screen.getByPlaceholderText("0"), { target: { value: "12345" } });
    fireEvent.click(screen.getByRole("button", { name: /next/i }));

    // Delivery tab: name the alert, add an email recipient (email is on by
    // default), then submit.
    fireEvent.change(screen.getByPlaceholderText(/revenue above target/i), {
      target: { value: "Test alert" },
    });
    fireEvent.change(screen.getByPlaceholderText("name@example.com"), {
      target: { value: "test@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /create alert/i }));

    // The new alert is now at the top of the list.
    expect(screen.getByText("Test alert")).toBeTruthy();
    // The form closed, returning to the list view.
    expect(screen.queryByRole("button", { name: /create alert/i })).toBeNull();
  });
});
