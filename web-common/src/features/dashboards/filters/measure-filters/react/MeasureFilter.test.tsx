import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MeasureFilter, {
  type MeasureFilterProps,
} from "./MeasureFilter";
import {
  MeasureFilterOperation,
  MeasureFilterType,
} from "../measure-filter-options";

function makeProps(overrides: Partial<MeasureFilterProps> = {}): MeasureFilterProps {
  return {
    filterData: {
      dimensionName: "country",
      name: "rev",
      label: "Revenue",
      measures: new Map([["mv1", { name: "rev" } as never]]),
      filter: {
        measure: "rev",
        operation: MeasureFilterOperation.GreaterThan,
        type: MeasureFilterType.Value,
        value1: "100",
        value2: "",
      },
    },
    allDimensions: [{ name: "country", displayName: "Country" } as never],
    onRemove: vi.fn(),
    onApply: vi.fn(),
    ...overrides,
  };
}

describe("MeasureFilter (React port)", () => {
  it("renders the chip trigger and opens the edit form on click", async () => {
    const user = userEvent.setup();
    render(<MeasureFilter {...makeProps()} />);

    // Chip shows the measure label.
    expect(screen.getByText("Revenue")).toBeTruthy();

    // Open the popover form and confirm the Apply button appears.
    await user.click(screen.getByRole("button", { name: /open/i }));
    expect(screen.getByRole("button", { name: /apply/i })).toBeTruthy();
  });

  it("calls onApply with the edited filter from the form", async () => {
    const user = userEvent.setup();
    const onApply = vi.fn();
    render(<MeasureFilter {...makeProps({ onApply })} />);

    await user.click(screen.getByRole("button", { name: /open/i }));

    // Find and submit the Apply button in the form.
    const applyButton = screen.getByRole("button", { name: /apply/i });
    await user.click(applyButton);

    expect(onApply).toHaveBeenCalled();
    const params = onApply.mock.calls[0][0];
    expect(params.measure ?? params.filter?.measure).toBeDefined();
  });

  it("calls onRemove from the chip remove button", async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();
    render(<MeasureFilter {...makeProps({ onRemove })} />);

    const removeButton = screen.getByRole("button", { name: /remove/i });
    await user.click(removeButton);

    expect(onRemove).toHaveBeenCalled();
  });
});
