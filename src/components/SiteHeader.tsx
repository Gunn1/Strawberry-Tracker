"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { api } from "@/lib/api-client";
import { STATUS_LABEL, type OpenStatus } from "@/lib/hours";

/** Sections of the marketing page. They are anchors, so off the home page they need it prefixing. */
const NAV: { href: string; label: string }[] = [
  { href: "#places", label: "U-Pick" },
  { href: "#season", label: "In Season" },
  { href: "#story", label: "Our Family" },
  { href: "#contact", label: "Contact" },
];

const PHONE = "(218) 732-4979";
const PHONE_HREF = "tel:+12187324979";

export interface FarmStatus {
  openStatus: OpenStatus;
  statusNote: string;
}

/**
 * The public site's header, shared by every customer-facing page so booking
 * does not look like a different website. Class names are prefixed `sh-`
 * because the marketing page styles itself globally and would otherwise
 * collide with this component's own rules.
 */
export default function SiteHeader({ status }: { status?: FarmStatus | null }) {
  const pathname = usePathname();
  const onHome = pathname === "/";
  const [open, setOpen] = useState(false);

  // The home page already has the status for its own use and passes it in;
  // anywhere else the header fetches its own rather than going without.
  const [fetched, setFetched] = useState<FarmStatus | null>(null);
  useEffect(() => {
    if (status !== undefined) return;
    let active = true;
    api
      .get<FarmStatus>("/api/status")
      .then((data) => active && setFetched({ openStatus: data.openStatus, statusNote: data.statusNote }))
      .catch(() => {
        // No chip is better than a broken one.
      });
    return () => {
      active = false;
    };
  }, [status]);

  const shown = status ?? fetched;
  const label = shown && shown.openStatus !== "hidden" ? STATUS_LABEL[shown.openStatus] : undefined;
  const href = (anchor: string) => (onHome ? anchor : `/${anchor}`);

  return (
    <header className="sh-bar">
      <div className="sh-wrap">
        <div className="sh-brandgroup">
          <a
            className="sh-brand"
            href={onHome ? "#" : "/"}
            aria-label="Carter's Red Wagon Farm — home"
            onClick={() => setOpen(false)}
          >
            <Image className="sh-mark" src="/Logo.webp" alt="Carter's Red Wagon Farm" width={240} height={147} priority />
          </a>
          {label && (
            <span className={`sh-status sh-${shown!.openStatus}`} title={shown!.statusNote || undefined}>
              <span className="sh-dot" />
              {label}
            </span>
          )}
        </div>

        <nav className="sh-nav">
          {NAV.map((n) => (
            <a key={n.href} href={href(n.href)}>{n.label}</a>
          ))}
          <a className="sh-cta" href={PHONE_HREF}>Call {PHONE}</a>
        </nav>

        <button
          className={open ? "sh-menubtn open" : "sh-menubtn"}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <span /><span /><span />
        </button>
      </div>

      <div className={open ? "sh-mobile open" : "sh-mobile"}>
        {NAV.map((n) => (
          <a key={n.href} href={href(n.href)} onClick={() => setOpen(false)}>{n.label}</a>
        ))}
        <a className="sh-cta" href={PHONE_HREF} onClick={() => setOpen(false)}>Call {PHONE}</a>
      </div>

      <style jsx>{`
        .sh-bar {
          position: sticky; top: 0; z-index: 50;
          background: color-mix(in srgb, var(--paper) 86%, transparent);
          backdrop-filter: blur(10px);
          border-bottom: 1px solid var(--line);
          font-family: var(--body); color: var(--ink);
        }
        .sh-wrap {
          max-width: 1180px; margin: 0 auto; padding-inline: clamp(20px, 5vw, 64px);
          display: flex; align-items: center; justify-content: space-between; padding-block: 0.85rem;
        }
        .sh-brandgroup { display: flex; align-items: center; gap: 0.7rem; min-width: 0; }
        .sh-brand { display: flex; align-items: center; gap: 0.65rem; text-decoration: none; }
        .sh-brand :global(.sh-mark) { width: auto; height: 54px; flex: none; display: block; }

        .sh-status {
          display: inline-flex; align-items: center; gap: 0.42rem;
          font-family: var(--display); font-weight: 600; font-size: 0.9rem; letter-spacing: -0.01em;
          padding: 0.28em 0.8em; border-radius: 999px; white-space: nowrap;
          box-shadow: inset 0 0 0 1px rgba(39, 31, 23, 0.08);
        }
        .sh-dot { width: 8px; height: 8px; border-radius: 50%; background: currentColor; flex: none; }
        .sh-open { background: #e3f1da; color: #265020; }
        .sh-open .sh-dot { animation: shpulse 2.2s ease-in-out infinite; }
        @keyframes shpulse {
          0% { box-shadow: 0 0 0 0 rgba(38, 80, 32, 0.55); }
          70% { box-shadow: 0 0 0 5px rgba(38, 80, 32, 0); }
          100% { box-shadow: 0 0 0 0 rgba(38, 80, 32, 0); }
        }
        @media (prefers-reduced-motion: reduce) { .sh-open .sh-dot { animation: none; } }
        .sh-closed { background: #fbe4da; color: var(--wagon-deep); }
        .sh-pickedout { background: #fbeac9; color: #845410; }
        @media (max-width: 380px) { .sh-status { font-size: 0.82rem; padding: 0.25em 0.65em; } }

        .sh-nav { display: flex; align-items: center; gap: 1.7rem; }
        .sh-nav a { font-weight: 500; font-size: 0.96rem; position: relative; color: inherit; text-decoration: none; }
        .sh-nav a::after {
          content: ""; position: absolute; left: 0; bottom: -5px; width: 0; height: 2px;
          background: var(--wagon); transition: width 0.2s ease;
        }
        .sh-nav a:hover::after { width: 100%; }
        .sh-cta {
          display: inline-flex; align-items: center; gap: 0.55em; margin-left: 0.4rem;
          font-family: var(--body); font-weight: 700; font-size: 0.98rem;
          padding: 0.82em 1.4em; border-radius: var(--r-pill);
          background: var(--wagon); color: #fff; border: 1.5px solid transparent;
          box-shadow: 0 8px 20px -10px var(--wagon-deep);
          transition: transform 0.18s ease, background 0.18s ease;
        }
        .sh-cta:hover { background: var(--wagon-deep); transform: translateY(-2px); }
        .sh-cta::after { display: none; }

        .sh-menubtn { display: none; background: none; border: 0; cursor: pointer; padding: 8px; }
        .sh-menubtn span {
          display: block; width: 24px; height: 2px; background: var(--ink); margin: 5px 0;
          transition: transform 0.2s ease, opacity 0.2s ease; transform-origin: center;
        }
        .sh-menubtn.open span:nth-child(1) { transform: translateY(7px) rotate(45deg); }
        .sh-menubtn.open span:nth-child(2) { opacity: 0; }
        .sh-menubtn.open span:nth-child(3) { transform: translateY(-7px) rotate(-45deg); }

        .sh-mobile { display: none; }
        @media (max-width: 920px) {
          .sh-nav { display: none; }
          .sh-menubtn { display: block; }
          .sh-mobile.open {
            display: flex; flex-direction: column;
            padding: 0.4rem clamp(20px, 5vw, 64px) 1.2rem;
            background: var(--paper); border-top: 1px solid var(--line);
          }
          .sh-mobile.open a {
            padding: 0.95rem 0.2rem; font-weight: 700; font-size: 1.08rem; color: var(--ink);
            text-decoration: none; border-bottom: 1px solid var(--line);
          }
          .sh-mobile.open a:last-of-type { border-bottom: 0; }
          .sh-mobile.open .sh-cta { margin-top: 0.9rem; margin-left: 0; justify-content: center; color: #fff; border-bottom: 0; }
        }
      `}</style>
    </header>
  );
}
