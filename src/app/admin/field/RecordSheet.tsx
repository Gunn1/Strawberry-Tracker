"use client";

import { useEffect, useState } from "react";

import type { FieldRow } from "@/types/domain";
import { STATUS_META, STEP, freshPct } from "./shared";
import { useIsWide } from "./viewport";

function clamp(value: number, max: number): number {
  return Math.max(0, Math.min(max, value));
}

/**
 * Recording how much of a row has been picked. Deliberately not a drag: one end
 * at a time, in steps, and nothing is written until Save. A mis-tap on a narrow
 * strip is visible here before it changes anything.
 */
export default function RecordSheet({
  row,
  patchName,
  fieldName,
  saving,
  error,
  canEdit,
  onCancel,
  onSave,
  onSettings,
}: {
  row: FieldRow;
  patchName: string;
  fieldName: string;
  saving: boolean;
  /** A failed save. Shown here because the page's banner sits behind this. */
  error: string | null;
  canEdit: boolean;
  onCancel: () => void;
  /** Also reports the reading the sheet opened with, so the server can
   *  refuse a save built on a row someone else has since moved. */
  onSave: (pickedStart: number, pickedEnd: number, fromStart: number, fromEnd: number) => void;
  onSettings: () => void;
}) {
  const [start, setStart] = useState(row.pickedStart);
  const [end, setEnd] = useState(row.pickedEnd);
  // What the row read when this sheet opened. Held so a background refresh
  // cannot quietly change what the save claims to be based on.
  const [from] = useState({ start: row.pickedStart, end: row.pickedEnd });

  const centred = useIsWide();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCancel();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  // The two ends share one row, so neither can be pushed past what the other
  // has left.
  const bumpStart = (delta: number) => setStart((s) => clamp(s + delta, 100 - end));
  const bumpEnd = (delta: number) => setEnd((e) => clamp(e + delta, 100 - start));

  const middle = Math.max(0, 100 - start - end);
  const fill = STATUS_META[row.status].fill;
  const dirty = start !== from.start || end !== from.end;

  return (
    <div className="overlay" style={centred ? { alignItems: "center" } : undefined} onClick={onCancel}>
      <div className={centred ? "sheet dialog" : "sheet"} role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <span className="grab" />

        <div className="head">
          <div className="headtext">
            <h2>{row.label}</h2>
            <span className="where">
              {fieldName} &middot; {patchName}
              {row.variety ? ` · ${row.variety}` : ""}
            </span>
          </div>
          {canEdit && (
            <button className="settings" onClick={onSettings} aria-label={`Settings and history for ${row.label}`}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </button>
          )}
        </div>

        <div className="preview">
          <div className="bar">
            {start > 0 && <span className="seg straw" style={{ width: `${start}%` }} />}
            {middle > 0 && <span className="seg" style={{ width: `${middle}%`, background: fill }} />}
            {end > 0 && <span className="seg straw" style={{ width: `${end}%` }} />}
          </div>
          <div className="scale">
            <span style={{ width: `${start}%` }}>{start > 8 ? `${start}%` : ""}</span>
            <span className="mid" style={{ width: `${middle}%` }}>{middle >= 22 ? `${middle}% fresh` : middle >= 12 ? `${middle}%` : ""}</span>
            <span style={{ width: `${end}%` }}>{end > 8 ? `${end}%` : ""}</span>
          </div>
        </div>

        <div className="control">
          <div className="clabel">
            <span>Picked from the near end</span>
            <span className="was">was {from.start}%</span>
          </div>
          <div className="stepper">
            <button onClick={() => bumpStart(-STEP)} disabled={start === 0} aria-label="Less picked from the near end">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M5 12h14" /></svg>
            </button>
            <span className="value">{start}%</span>
            <button onClick={() => bumpStart(STEP)} disabled={start + end >= 100} aria-label="More picked from the near end">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
            </button>
          </div>
        </div>

        <div className="control">
          <div className="clabel">
            <span>Picked from the far end</span>
            <span className="was">was {from.end}%</span>
          </div>
          <div className="stepper">
            <button onClick={() => bumpEnd(-STEP)} disabled={end === 0} aria-label="Less picked from the far end">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M5 12h14" /></svg>
            </button>
            <span className="value">{end}%</span>
            <button onClick={() => bumpEnd(STEP)} disabled={start + end >= 100} aria-label="More picked from the far end">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
            </button>
          </div>
        </div>

        <div className="jump">
          <span className="jlabel">Or jump to</span>
          <div className="jumps">
            <button onClick={() => { setStart(50); setEnd(0); }}>Half gone</button>
            <button onClick={() => { setStart(100); setEnd(0); }}>Picked out</button>
            <button onClick={() => { setStart(0); setEnd(0); }}>All fresh</button>
          </div>
        </div>

        {error && <p className="failed">{error}</p>}

        <div className="actions">
          <button className="cancel" onClick={onCancel} disabled={saving}>Cancel</button>
          <button className="save" onClick={() => onSave(start, end, from.start, from.end)} disabled={saving || !dirty}>
            {saving ? "Saving…" : dirty ? `Save ${row.label}` : "No change"}
          </button>
        </div>
        <p className="hint">Nothing is recorded until you save. Now {freshPct({ pickedStart: start, pickedEnd: end })}% fresh.</p>
      </div>
      <style jsx>{`

        .sheet.dialog, .panel.dialog {
          border-radius: 22px; margin: 0 18px; max-height: 88vh;
          box-shadow: 0 30px 60px -28px rgba(30, 58, 43, 0.45);
        }
        .overlay {
          position: fixed; inset: 0; z-index: 60; background: rgba(39, 31, 23, 0.42);
          display: flex; align-items: flex-end; justify-content: center;
        }
        .sheet {
          background: var(--paper); width: 100%; max-width: 520px; max-height: 92dvh; overflow-y: auto; overscroll-behavior: contain;
          border-radius: 28px 28px 0 0; padding: 10px 18px calc(22px + env(safe-area-inset-bottom));
          box-shadow: 0 -18px 50px -20px rgba(39, 31, 23, 0.5);
        }
        .grab { display: block; width: 40px; height: 4px; border-radius: 999px; background: #cdb892; margin: 0 auto 16px; }
        .head { display: flex; align-items: center; gap: 12px; }
        .headtext { display: flex; flex-direction: column; gap: 1px; flex-grow: 1; min-width: 0; }
        .settings {
          width: 44px; height: 44px; flex: none; display: inline-flex; align-items: center; justify-content: center;
          border: 1px solid var(--line); background: #fff; border-radius: var(--r-pill); color: var(--muted); cursor: pointer;
        }
        .settings:hover { color: var(--ink); border-color: var(--muted); }
        .head h2 { font-family: var(--display); font-weight: 600; font-size: 1.6rem; margin: 0; }
        .where { font-family: var(--data); font-size: 0.76rem; color: var(--muted); }

        .preview { margin-top: 18px; display: flex; flex-direction: column; gap: 7px; }
        .bar { display: flex; height: 56px; border-radius: 6px; overflow: hidden; background: #d9c7a6; box-shadow: inset 0 0 0 1px rgba(0,0,0,.06); }
        .seg { display: block; height: 100%; }
        .seg.straw { --straw-angle: 90deg; background: var(--straw); }
        .scale { display: flex; }
        .scale span {
          font-family: var(--data); font-size: 0.68rem; color: var(--muted); text-align: center;
          overflow: hidden; white-space: nowrap; text-overflow: ellipsis;
        }
        .scale .mid { color: #4f7a33; }

        .control { margin-top: 20px; display: flex; flex-direction: column; gap: 10px; }
        .clabel { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }
        .clabel span:first-child { font-weight: 700; font-size: 0.95rem; }
        .was { font-family: var(--data); font-size: 0.7rem; color: var(--muted); }
        .stepper { display: flex; align-items: stretch; gap: 10px; }
        .stepper button {
          width: 64px; height: 56px; flex: none; display: inline-flex; align-items: center; justify-content: center;
          border: 1.5px solid var(--line); background: #fff; border-radius: 14px; color: var(--ink); cursor: pointer;
        }
        .stepper button:hover:not(:disabled) { border-color: var(--ink); }
        .stepper button:disabled { opacity: 0.4; cursor: default; }
        .value {
          flex-grow: 1; display: flex; align-items: center; justify-content: center; height: 56px;
          background: #fff; border: 1.5px solid var(--line); border-radius: 14px;
          font-family: var(--display); font-weight: 600; font-size: 1.6rem;
        }

        .jump { margin-top: 20px; display: flex; flex-direction: column; gap: 9px; }
        .jlabel { font-family: var(--data); font-size: 0.7rem; letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted); }
        .jumps { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
        .jumps button {
          height: 46px; font-weight: 700; font-size: 0.84rem; color: var(--ink);
          background: var(--paper-2); border: 1.5px solid var(--line); border-radius: 12px; cursor: pointer;
        }
        .jumps button:hover { border-color: var(--ink); }

        .failed {
          margin: 20px 0 0; background: #fdeee7; border: 1px solid #f4d3c4;
          color: var(--wagon-deep); font-size: 0.86rem; font-weight: 500;
          padding: 0.75rem 0.9rem; border-radius: var(--r-md); line-height: 1.5;
        }
        .actions { margin-top: 22px; padding-top: 18px; border-top: 1px solid var(--line); display: flex; align-items: center; gap: 10px; }
        .cancel {
          flex: none; padding: 0 22px; height: 52px; font-weight: 700; font-size: 0.95rem; color: var(--muted);
          background: transparent; border: 1.5px solid var(--line); border-radius: var(--r-pill); cursor: pointer;
        }
        .save {
          flex-grow: 1; height: 52px; font-weight: 700; font-size: 1rem; color: #fff;
          background: var(--wagon); border: none; border-radius: var(--r-pill); cursor: pointer;
        }
        .save:hover:not(:disabled) { background: var(--wagon-deep); }
        .save:disabled, .cancel:disabled { opacity: 0.55; cursor: default; }
        .hint { margin: 12px 0 0; font-size: 0.78rem; color: var(--muted); text-align: center; line-height: 1.45; }
      `}</style>
    </div>
  );
}
