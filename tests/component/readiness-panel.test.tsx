import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ReadinessPanel } from "@/components/shared/readiness-panel";

describe("ReadinessPanel", () => {
  it("shows a ready state when there are no blockers or warnings", () => {
    render(<ReadinessPanel title="Generation" blockers={[]} warnings={[]} />);
    expect(screen.getByText(/generation: ready/i)).toBeInTheDocument();
  });

  it("lists every blocker grouped under a clear heading", () => {
    render(<ReadinessPanel title="Approval" blockers={["Estimated Pricing", "Proposed Timeline"]} />);
    expect(screen.getByText(/approval: not ready/i)).toBeInTheDocument();
    expect(screen.getByText("Estimated Pricing")).toBeInTheDocument();
    expect(screen.getByText("Proposed Timeline")).toBeInTheDocument();
  });

  it("shows warnings distinctly from blockers", () => {
    render(<ReadinessPanel title="Approval" blockers={[]} warnings={["Missing supporting detail"]} />);
    expect(screen.getByText(/ready with warnings/i)).toBeInTheDocument();
    expect(screen.getByText("Missing supporting detail")).toBeInTheDocument();
  });
});
