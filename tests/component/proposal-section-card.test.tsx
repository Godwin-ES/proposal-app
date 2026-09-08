import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProposalSectionCard } from "@/components/proposals/proposal-section-card";

describe("ProposalSectionCard", () => {
  it("renders the title and content", () => {
    render(<ProposalSectionCard title="Introduction" content="Hello proposal." />);
    expect(screen.getByText("Introduction")).toBeInTheDocument();
    expect(screen.getByText("Hello proposal.")).toBeInTheDocument();
  });

  it("renders provided actions", () => {
    render(<ProposalSectionCard title="Pricing" content="$1,000" actions={<button>Edit</button>} />);
    expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
  });

  it("renders nothing extra when no actions are provided", () => {
    render(<ProposalSectionCard title="Timeline" content="6 weeks" />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
