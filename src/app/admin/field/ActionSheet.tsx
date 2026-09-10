"use client";

import { useEffect, useState } from "react";

import { useIsWide } from "./viewport";

export interface MenuAction {
  label: string;
  onSelect: () => void;
  danger?: boolean;
}

/**
 * A patch's actions, opened in place rather than floating over the page.
 *
 * A popover had to be positioned, which meant guessing at the room around the
 * button and getting it wrong near the edges of a short window. This is part
 * of the card it belongs to: it pushes the rest down, scrolls with the page,
 * and cannot end up anywhere it should not be.
 */
export function InlineMenu({ actions, onClose }: { actions: MenuAction[]; onClose: () => void }) {
  return (
    <div className="menu">
      {actions.map((a) => (
        <button
          key={a.label}
          type="button"
          className={a.danger ? "act danger" : "act"}
          onClick={() => {
            onClose();
            a.onSelect();
          }}
        >
          {a.label}
        </button>
      ))}

      <style jsx>{`
        .menu {
          display: grid;
          /* Fills whatever width the card has: one column on a phone, two or
             three on a desktop, without a breakpoint to maintain. */
          grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
          gap: 8px;
          margin: 0 0 14px;
          padding: 12px;
          background: var(--paper-2);
          border: 1px solid var(--line);
          border-radius: 16px;
        }
        .act {
          min-height: 48px;
          padding: 0 14px;
          text-align: left;
          font-family: var(--body);
          font-weight: 700;
          font-size: 0.88rem;
          color: var(--ink);
          background: #fff;
          border: 1.5px solid var(--line);
          border-radius: 12px;
          cursor: pointer;
        }
        .act:hover { border-color: var(--ink); }
        /* Destructive sits on its own line, away from the everyday actions. */
        .act.danger { grid-column: 1 / -1; color: var(--wagon-deep); }
        .act.danger:hover { border-color: var(--wagon); }
      `}</style>
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
  const centred = useIsWide();
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

      </form>
      <style jsx>{`

        .overlay { position: fixed; inset: 0; z-index: 70; background: rgba(39,31,23,.42); display: flex; align-items: flex-end; justify-content: center; }
        .sheet {
          background: var(--paper); width: 100%; max-width: 520px; border-radius: 28px 28px 0 0;
          padding: 20px 18px calc(22px + env(safe-area-inset-bottom));
          box-shadow: 0 -18px 50px -20px rgba(39,31,23,.5);
          /* Was the only overlay without these: with a soft keyboard up, the title
             and first field went above the top of the screen unreachable. */
          max-height: 92dvh; overflow-y: auto; overscroll-behavior: contain;
        }
        .sheet.dialog {
          border-radius: 22px; margin: 0 18px; max-height: 88dvh;
          box-shadow: 0 30px 60px -28px rgba(30,58,43,.45);
        }
        .title { font-family: var(--display); font-weight: 600; font-size: 1.3rem; margin: 0; }
        .message { margin: 8px 0 0; font-size: 0.9rem; color: var(--muted); line-height: 1.5; }
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
    </div>
  );
}
