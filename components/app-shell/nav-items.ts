import type { Role } from "@/lib/domain/types";
import { LayoutDashboard, FileText, ClipboardCheck } from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
};

export function navItemsForRole(role: Role): NavItem[] {
  if (role === "approver") {
    return [{ href: "/approvals", label: "Approvals", icon: ClipboardCheck }];
  }

  return [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/proposals/new", label: "New Proposal", icon: FileText },
  ];
}
