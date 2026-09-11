"use client";

import { useFormStatus } from "react-dom";
import { LogOut } from "lucide-react";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";

function SignOutButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="flex w-full items-center gap-2 disabled:opacity-50">
      <LogOut className="size-4" /> {pending ? "Signing out..." : "Sign out"}
    </button>
  );
}

/** The `onSelect` guard (keeping the menu open so the pending label is
 * visible) is an event handler, which can't be passed as a prop across the
 * Server→Client boundary from `AppHeader` — so this whole menu item,
 * including that guard, lives in its own client component. */
export function SignOutMenuItem({ action }: { action: (formData: FormData) => void | Promise<void> }) {
  return (
    <DropdownMenuItem asChild onSelect={(e) => e.preventDefault()}>
      <form action={action} className="w-full">
        <SignOutButton />
      </form>
    </DropdownMenuItem>
  );
}
