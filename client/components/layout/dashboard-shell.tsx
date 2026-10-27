"use client";

import { ChevronsUpDown, LogOut, Menu } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { RoleGuard } from "@/components/auth/role-guard";
import { Logo } from "@/components/common/logo";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useAuth } from "@/features/auth/auth-provider";
import { fullName, initials } from "@/lib/format";
import { NAV } from "@/lib/nav";
import { ROLE_HOME, ROLE_LABEL } from "@/lib/roles";
import type { Role } from "@/types/api";
import { cn } from "cn";

function SidebarNav({ role, onNavigate }: { role: Role; onNavigate?: () => void }) {
  const pathname = usePathname();
  const items = NAV[role];

  return (
    <nav aria-label="Main" className="flex flex-col gap-1 px-3">
      {items.map((item) => {
        const active =
          item.href === ROLE_HOME[role]
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-white",
            )}
          >
            <item.icon className="size-4 shrink-0" aria-hidden />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarContent({ role, onNavigate }: { role: Role; onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col bg-sidebar">
      <div className="flex h-14 items-center px-6">
        <Logo href={ROLE_HOME[role]} inverted />
      </div>
      <div className="px-6 pt-4 pb-2 text-[11px] font-semibold tracking-wider text-sidebar-foreground/60 uppercase">
        {ROLE_LABEL[role]}
      </div>
      <SidebarNav role={role} onNavigate={onNavigate} />
      <p className="mt-auto px-6 py-4 text-[11px] leading-relaxed text-sidebar-foreground/60">
        Prototype · synthetic demo data. Not a medical service.
      </p>
    </div>
  );
}

function AccountMenu() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  if (!user) return null;

  const handleSignOut = async () => {
    await signOut();
    router.replace("/login");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Account menu"
        className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-left outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <Avatar className="size-8">
          <AvatarFallback className="bg-accent text-xs font-semibold text-accent-foreground">
            {initials(user.firstName, user.lastName)}
          </AvatarFallback>
        </Avatar>
        <span className="hidden text-sm font-medium sm:block">
          {fullName(user.firstName, user.lastName)}
        </span>
        <ChevronsUpDown className="hidden size-3.5 text-muted-foreground sm:block" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="space-y-0.5">
            <span className="block text-sm font-medium text-foreground">
              {fullName(user.firstName, user.lastName)}
            </span>
            <span className="block truncate text-xs font-normal text-muted-foreground">
              {user.email}
            </span>
            <span className="block text-xs font-normal text-muted-foreground">
              {ROLE_LABEL[user.role]}
            </span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => void handleSignOut()}>
          <LogOut aria-hidden />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Shell({ role, children }: { role: Role; children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 hidden w-60 lg:block">
        <SidebarContent role={role} />
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-64 border-0 bg-sidebar p-0 sm:max-w-64">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SidebarContent role={role} onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="lg:pl-60">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b bg-card px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              aria-label="Open navigation"
              onClick={() => setMobileOpen(true)}
            >
              <Menu />
            </Button>
            <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-800">
              Demo environment
            </span>
          </div>
          <AccountMenu />
        </header>
        <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
      </div>
    </div>
  );
}

export function DashboardShell({ role, children }: { role: Role; children: ReactNode }) {
  return (
    <RoleGuard roles={[role]}>
      <Shell role={role}>{children}</Shell>
    </RoleGuard>
  );
}
