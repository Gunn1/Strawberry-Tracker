"use client";

import { useEffect, useState, type CSSProperties } from "react";

/**
 * Below this width a sheet rises from the bottom, which is where a thumb is.
 * Above it that would put the menu miles from the button that opened it, so it
 * hangs off the button instead.
 */
const ANCHORED_FROM = 700;

function isWide(): boolean {
  return typeof window !== "undefined" && window.innerWidth >= ANCHORED_FROM;
}

/** Place a popover under its button, kept inside the viewport. */
function popoverStyle(anchor: DOMRect, itemCount: number): CSSProperties {
  const width = 264;
  const gap = 8;
  const estimated = 92 + itemCount * 60;
  const left = Math.min(Math.max(gap, anchor.right - width), window.innerWidth - width - gap);
  const belowFits = anchor.bottom + gap + estimated <= window.innerHeight;
  return belowFits
    ? { position: "fixed", top: anchor.bottom + gap, left, width }
    : { position: "fixed", bottom: window.innerHeight - anchor.top + gap, left, width };
}

/** Shared chrome for the small sheets that slide up from the bottom. */
const SHEET_CSS = `
  .overlay { position: fixed; inset: 0; z-index: 70; background: rgba(39,31,23,.42); display: flex; align-items: flex-end; justify-content: center; }
  .sheet {
    background: var(--paper); width: 100%; max-width: 520px; border-radius: 28px 28px 0 0;
    padding: 20px 18px calc(22px + env(safe-area-inset-bottom));
    box-shadow: 0 -18px 50px -20px rgba(39,31,23,.5);
  }
  .title { font-family: var(--display); font-weight: 600; font-size: 1.3rem; margin: 0; }
  .message { margin: 8px 0 0; font-size: 0.9rem; color: var(--muted); line-height: 1.5; }
`;

export interface MenuAction {
  label: string;
  onSelect: () => void;
  danger?: boolean;
}

/** A list of actions, replacing a cramped row of tiny buttons. */
export function MenuSheet({
  title,
  actions,
  anchor,
  onClose,
}: {
  title: string;
  actions: MenuAction[];
  /** Where the button that opened this sits, so the menu can hang off it. */
  anchor?: DOMRect;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const [anchored] = useState(() => !!anchor && isWide());
  const style = anchored && anchor ? popoverStyle(anchor, actions.length) : undefined;

  return (
    <div
      className="overlay"
      style={anchored ? { background: "transparent", display: "block" } : undefined}
      onClick={onClose}
    >
      <div
        className={anchored ? "sheet popover" : "sheet"}
        style={style}
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="title">{title}</h3>
        <div className="actions">
          {actions.map((a) => (
            <button
              key={a.label}
              className={a.danger ? "act danger" : "act"}
              onClick={() => {
                onClose();
                a.onSelect();
              }}
            >
              {a.label}
            </button>
          ))}
        </div>
        {!anchored && <button className="close" onClick={onClose}>Cancel</button>}
        <style jsx>{`
          ${SHEET_CSS}
          /* Anchored: a plain popover by the button. The overlay's own
             dimming and flex layout are switched off inline, since it still
             has to cover the screen to catch the click that closes this. */
          .sheet.popover {
            max-width: none; border-radius: 16px; padding: 14px;
            border: 1px solid var(--line);
            box-shadow: 0 18px 40px -18px rgba(39, 31, 23, 0.45);
            max-height: 80vh; overflow-y: auto;
          }
          .sheet.popover .title { font-size: 1.05rem; }
          .sheet.popover .actions { margin-top: 12px; gap: 6px; }
          .sheet.popover .act { min-height: 44px; font-size: 0.88rem; border-radius: 10px; }
          .actions { display: flex; flex-direction: column; gap: 8px; margin-top: 16px; }
          .act {
            min-height: 52px; padding: 0 16px; text-align: left; font-weight: 700; font-size: 0.95rem;
            color: var(--ink); background: #fff; border: 1.5px solid var(--line); border-radius: 14px; cursor: pointer;
          }
          .act:hover { border-color: var(--ink); }
          /* Destructive actions sit apart, not beside a rename at the same weight. */
          .act.danger { margin-top: 10px; color: var(--wagon-deep); }
          .act.danger:hover { border-color: var(--wagon); }
          .close {
            width: 100%; margin-top: 14px; height: 48px; font-weight: 700; font-size: 0.92rem; color: var(--muted);
            background: transparent; border: 1.5px solid var(--line); border-radius: var(--r-pill); cursor: pointer;
          }
        `}</style>
      </div>
    </div>
  );
}

export interface AskConfig {
  title: string;
  message?: string;
  /** Omit for a plain confirm. */
  input?: { label: string; defaultValue?: string; placeholder?: string; allowEmpty?: boolean };
  /** A second field, for the pair of landmarks on a field. */
  input2?: { label: string; defaultValue?: string; placeholder?: string };
  confirmLabel: string;
  danger?: boolean;
  onConfirm: (value: string, value2: string) => void;
}

/** One typed answer, or a confirmation. Replaces window.prompt / window.confirm. */
export function AskSheet({ config, onClose }: { config: AskConfig; onClose: () => void }) {
  const [centred] = useState(isWide);
  const [value, setValue] = useState(config.input?.defaultValue ?? "");
  const [value2, setValue2] = useState(config.input2?.defaultValue ?? "");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const blocked = !!config.input && !config.input.allowEmpty && value.trim() === "";

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (blocked) return;
    onClose();
    config.onConfirm(value.trim(), value2.trim());
  }

  return (
    <div className="overlay" style={centred ? { alignItems: "center" } : undefined} onClick={onClose}>
      <form className={centred ? "sheet dialog" : "sheet"} onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <h3 className="title">{config.title}</h3>
        {config.message && <p className="message">{config.message}</p>}

        {config.input && (
          <label className="field">
            <span>{config.input.label}</span>
            <input
              autoFocus
              value={value}
              placeholder={config.input.placeholder}
              onChange={(e) => setValue(e.target.value)}
            />
          </label>
        )}
        {config.input2 && (
          <label className="field">
            <span>{config.input2.label}</span>
            <input value={value2} placeholder={config.input2.placeholder} onChange={(e) => setValue2(e.target.value)} />
          </label>
        )}

        <div className="row">
          <button type="button" className="cancel" onClick={onClose}>Cancel</button>
          <button type="submit" className={config.danger ? "go danger" : "go"} disabled={blocked}>
            {config.confirmLabel}
          </button>
        </div>

        <style jsx>{`
          ${SHEET_CSS}
          .sheet.dialog { border-radius: 20px; margin: 0 18px; box-shadow: 0 30px 60px -28px rgba(30, 58, 43, 0.45); }
          .field { display: block; margin-top: 16px; }
          .field span { font-family: var(--data); font-size: 0.7rem; letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); }
          .field input {
            display: block; width: 100%; margin-top: 8px; height: 50px; font-size: 1rem; padding: 0 14px;
            border: 1.5px solid var(--line); border-radius: 12px; background: #fff; color: var(--ink);
          }
          .field input:focus { outline: none; border-color: var(--wagon); }
          .row { display: flex; gap: 10px; margin-top: 22px; }
          .cancel {
            flex: none; padding: 0 22px; height: 52px; font-weight: 700; font-size: 0.95rem; color: var(--muted);
            background: transparent; border: 1.5px solid var(--line); border-radius: var(--r-pill); cursor: pointer;
          }
          .go {
            flex-grow: 1; height: 52px; font-weight: 700; font-size: 1rem; color: #fff;
            background: var(--wagon); border: none; border-radius: var(--r-pill); cursor: pointer;
          }
          .go:hover:not(:disabled) { background: var(--wagon-deep); }
          .go:disabled { opacity: 0.55; cursor: default; }
        `}</style>
      </form>
    </div>
  );
}
