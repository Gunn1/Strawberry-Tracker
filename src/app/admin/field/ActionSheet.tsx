"use client";

import { useEffect, useState } from "react";

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
  onClose,
}: {
  title: string;
  actions: MenuAction[];
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
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
        <button className="close" onClick={onClose}>Cancel</button>
        <style jsx>{`
          ${SHEET_CSS}
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
    <div className="overlay" onClick={onClose}>
      <form className="sheet" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
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
