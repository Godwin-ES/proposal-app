import { signOut } from "@/actions/auth";
import { MobileNav } from "@/components/app-shell/mobile-nav";
import { SignOutMenuItem } from "@/components/app-shell/sign-out-button";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { CurrentUser } from "@/lib/auth/current-user";

const ROLE_LABELS = { salesperson: "Salesperson", approver: "Approver" } as const;

export function AppHeader({ user }: { user: CurrentUser }) {
  const initials = user.fullName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="flex h-14 items-center justify-between border-b bg-background px-4">
      <div className="flex items-center gap-2">
        <MobileNav role={user.role} />
        <span className="font-semibold tracking-tight">Koya Proposal Studio</span>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="flex items-center gap-2 px-2">
            <span className="flex size-7 items-center justify-center rounded-full bg-secondary text-xs font-medium text-secondary-foreground">
              {initials}
            </span>
            <span className="hidden text-sm sm:inline">
              {user.fullName} <span className="text-muted-foreground">&middot; {ROLE_LABELS[user.role]}</span>
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>
            {user.fullName}
            <div className="text-xs font-normal text-muted-foreground">{user.email}</div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <SignOutMenuItem action={signOut} />
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
