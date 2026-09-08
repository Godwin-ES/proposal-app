import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";

export default async function RootPage() {
  const user = await getCurrentUser();

  if (!user) redirect("/login");
  redirect(user.role === "approver" ? "/approvals" : "/dashboard");
}
