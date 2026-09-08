import "server-only";
import { redirect } from "next/navigation";
import { requireCurrentUser, type CurrentUser } from "@/lib/auth/current-user";

export async function requireSalesperson(): Promise<CurrentUser> {
  const user = await requireCurrentUser();
  if (user.role !== "salesperson") redirect("/approvals");
  return user;
}

export async function requireApprover(): Promise<CurrentUser> {
  const user = await requireCurrentUser();
  if (user.role !== "approver") redirect("/dashboard");
  return user;
}
