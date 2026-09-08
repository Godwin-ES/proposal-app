import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
}));

import { AppSidebar } from "@/components/app-shell/app-sidebar";

describe("AppSidebar", () => {
  it("shows salesperson navigation without approval actions", () => {
    render(<AppSidebar role="salesperson" />);
    expect(screen.getByRole("link", { name: /dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /new proposal/i })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /^approvals$/i })).not.toBeInTheDocument();
  });

  it("shows approver navigation prioritizing the approval queue only", () => {
    render(<AppSidebar role="approver" />);
    expect(screen.getByRole("link", { name: /approvals/i })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /new proposal/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /^dashboard$/i })).not.toBeInTheDocument();
  });
});
