import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TimeGrainSelector, {
  type TimeGrainSelectorProps,
} from "./TimeGrainSelector";
import { V1TimeGrain } from "@rilldata/web-common/runtime-client/gen/index.schemas";

function makeProps(overrides: Partial<TimeGrainSelectorProps> = {}): TimeGrainSelectorProps {
  return {
    activeTimeGrain: V1TimeGrain.TIME_GRAIN_DAY,
    timeStart: "2024-01-01T00:00:00Z",
    timeEnd: "2024-12-31T23:59:59Z",
    minTimeGrain: V1TimeGrain.TIME_GRAIN_HOUR,
    onTimeGrainSelect: vi.fn(),
    ...overrides,
  };
}

describe("TimeGrainSelector (React port)", () => {
  it("renders nothing when grain / ranges are missing", () => {
    const { container } = render(
      <TimeGrainSelector {...makeProps({ activeTimeGrain: undefined, timeStart: undefined, timeEnd: undefined, minTimeGrain: undefined })} />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders the trigger and opens the grain menu", async () => {
    const user = userEvent.setup();
    render(<TimeGrainSelector {...makeProps()} />);

    const trigger = screen.getByRole("button");
    await user.click(trigger);

    // Menu items are rendered as menuitemcheckbox buttons.
    expect(screen.getAllByRole("menuitemcheckbox").length).toBeGreaterThan(0);
  });

  it("calls onTimeGrainSelect when a grain is chosen", async () => {
    const user = userEvent.setup();
    const onTimeGrainSelect = vi.fn();
    render(<TimeGrainSelector {...makeProps({ onTimeGrainSelect })} />);

    await user.click(screen.getByRole("button"));
    const options = screen.getAllByRole("menuitemcheckbox");
    await user.click(options[0]);

    expect(onTimeGrainSelect).toHaveBeenCalled();
  });
});
