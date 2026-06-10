"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState } from "react";

// Admin chrome: a sticky top navbar (Tailwind), collapsing to a hamburger menu
// on smaller screens.
export default function AdminShell({
  email,
  role,
  children,
}: {
  email?: string | null;
  role?: "ADMIN" | "STAFF";
  children: React.ReactNode;
}) {
  const path = usePathname();
  const isAdmin = role === "ADMIN";
  const [open, setOpen] = useState(false);

  const tabs = [
    { href: "/admin", label: "Status" },
    ...(isAdmin ? [{ href: "/admin/sales", label: "Sales" }] : []),
    { href: "/till", label: "Till" },
    ...(isAdmin
      ? [
          { href: "/admin/prices", label: "Prices" },
          { href: "/admin/users", label: "Users" },
        ]
      : []),
  ];

  const tabCls = (href: string) =>
    `rounded-lg px-3.5 py-2 text-sm font-semibold no-underline whitespace-nowrap transition-colors ${
      path === href
        ? "bg-[#fdeee7] text-[color:var(--wagon-deep)]"
        : "text-[color:var(--muted)] hover:bg-[var(--paper)] hover:text-[color:var(--ink)]"
    }`;

  const who = email ? (
    <span className="flex flex-col leading-tight" style={{ fontFamily: "var(--data)" }}>
      <span className="text-[0.78rem] text-[color:var(--ink)]">{email}</span>
      <span className="text-[0.62rem] uppercase tracking-wider text-[color:var(--muted)]">
        {isAdmin ? "Admin" : "Staff"}
      </span>
    </span>
  ) : null;

  const signoutBtn = (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/" })}
      className="rounded-lg bg-[var(--paper)] px-3.5 py-2 text-sm font-semibold text-[color:var(--wagon-deep)] transition-colors hover:bg-[#fdeee7]"
    >
      Sign out
    </button>
  );

  return (
    <div className="min-h-screen bg-[var(--paper)]">
      <header className="sticky top-0 z-50 border-b border-[color:var(--line)] bg-white">
        <div className="mx-auto flex max-w-[1080px] items-center gap-4 px-4 py-3 sm:px-8">
          <Link
            href="/"
            title="Back to the website"
            className="inline-flex items-center gap-2 whitespace-nowrap text-[1.1rem] font-semibold text-[color:var(--ink)] no-underline hover:text-[color:var(--wagon-deep)]"
            style={{ fontFamily: "var(--display)" }}
          >
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--wagon)]" />
            Red Wagon Farm
            <span
              className="pt-0.5 text-[0.64rem] font-medium uppercase tracking-widest text-[color:var(--muted)]"
              style={{ fontFamily: "var(--data)" }}
            >
              Admin
            </span>
          </Link>

          {/* desktop nav */}
          <nav className="ml-3 hidden gap-2 lg:flex">
            {tabs.map((t) => (
              <Link key={t.href} href={t.href} className={tabCls(t.href)}>
                {t.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto hidden items-center gap-4 lg:flex">
            {who}
            {signoutBtn}
          </div>

          {/* hamburger (below lg) */}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            className="ml-auto inline-flex h-10 w-10 items-center justify-center rounded-lg text-[color:var(--ink)] transition-colors hover:bg-[var(--paper)] lg:hidden"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>

        {/* mobile dropdown */}
        {open && (
          <div className="border-t border-[color:var(--line)] bg-white px-4 py-3 sm:px-8 lg:hidden">
            <nav className="flex flex-col gap-2">
              {tabs.map((t) => (
                <Link key={t.href} href={t.href} onClick={() => setOpen(false)} className={tabCls(t.href)}>
                  {t.label}
                </Link>
              ))}
            </nav>
            <div className="mt-3 flex items-center justify-between gap-3 border-t border-[color:var(--line)] pt-3">
              {who}
              {signoutBtn}
            </div>
          </div>
        )}
      </header>

      <main>{children}</main>
    </div>
  );
}
