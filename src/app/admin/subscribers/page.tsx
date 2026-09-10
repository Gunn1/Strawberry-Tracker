"use client";

import { useCallback, useEffect, useState } from "react";

import { api, errorMessage } from "@/lib/api-client";
import { formatDate } from "@/lib/format/datetime";
import type { Subscriber } from "@/types/domain";

/** One address per line, quoted, so a spreadsheet or a mail tool can read it. */
function toCsv(list: Subscriber[]): string {
  const rows = list.map((s) => `"${s.email.replace(/"/g, '""')}","${s.createdAt}"`);
  return ["email,signed_up", ...rows].join("\n");
}

export default function SubscribersPage() {
  const [list, setList] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [filter, setFilter] = useState("");

  const load = useCallback(async () => {
    try {
      setList(await api.get<Subscriber[]>("/api/subscribers"));
    } catch (err) {
      setError(errorMessage(err, "Couldn't load the mailing list."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2400);
    return () => clearTimeout(t);
  }, [toast]);

  async function remove(s: Subscriber) {
    if (!window.confirm(`Take ${s.email} off the list?`)) return;
    setBusyId(s.id);
    setError(null);
    try {
      await api.delete(`/api/subscribers/${s.id}`);
      setList((prev) => prev.filter((x) => x.id !== s.id));
      setToast("Removed");
    } catch (err) {
      setError(errorMessage(err, "Couldn't remove that address."));
    } finally {
      setBusyId(null);
    }
  }

  function download() {
    const blob = new Blob([toCsv(list)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `red-wagon-farm-mailing-list-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const needle = filter.trim().toLowerCase();
  const shown = needle ? list.filter((s) => s.email.toLowerCase().includes(needle)) : list;

  return (
    <div className="admin">
      <div className="shell">
        <header className="head">
          <div className="titles">
            <span className="eyebrow">Admin</span>
            <h1>Mailing list</h1>
          </div>
          {!loading && list.length > 0 && (
            <span className="count">{list.length.toLocaleString()}</span>
          )}
        </header>
        <p className="intro">
          Everyone who asked to hear when picking opens, newest first. They signed up from the
          form at the bottom of the website.
        </p>

        {error && <p className="banner">{error}</p>}

        {loading ? (
          <p className="status-msg">Loading…</p>
        ) : list.length === 0 ? (
          <p className="status-msg">Nobody has signed up yet.</p>
        ) : (
          <>
            <div className="tools">
              <input
                className="search"
                value={filter}
                placeholder="Search addresses"
                onChange={(e) => setFilter(e.target.value)}
                aria-label="Search addresses"
              />
              <button className="export" onClick={download}>
                Download CSV
              </button>
            </div>

            {shown.length === 0 ? (
              <p className="status-msg">Nothing matches &ldquo;{filter.trim()}&rdquo;.</p>
            ) : (
              <ul className="list">
                {shown.map((s) => (
                  <li key={s.id}>
                    <a className="mail" href={`mailto:${s.email}`}>{s.email}</a>
                    <span className="when">{formatDate(s.createdAt)}</span>
                    <button
                      className="drop"
                      onClick={() => remove(s)}
                      disabled={busyId === s.id}
                      aria-label={`Remove ${s.email}`}
                    >
                      {busyId === s.id ? "…" : "Remove"}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>

      {toast && <div className="toast">{toast}</div>}

      <style jsx>{`
        .admin { background: var(--paper); color: var(--ink); font-family: var(--body); padding: clamp(18px, 4vw, 44px) 16px 64px; }
        .shell { max-width: 640px; margin: 0 auto; }
        .head { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; }
        .titles { display: flex; flex-direction: column; gap: 2px; }
        .eyebrow { font-family: var(--data); font-size: 0.72rem; letter-spacing: 0.14em; text-transform: uppercase; color: var(--wagon-deep); }
        h1 { font-family: var(--display); font-weight: 600; font-size: clamp(1.9rem, 5vw, 2.7rem); letter-spacing: -0.01em; margin: 0; }
        .count { font-family: var(--display); font-weight: 600; font-size: 1.8rem; color: var(--wagon-deep); padding-bottom: 4px; }
        .intro { color: var(--muted); margin-top: 10px; line-height: 1.55; font-size: 0.94rem; }
        .banner { margin-top: 16px; background: #fdeee7; border: 1px solid #f4d3c4; color: var(--wagon-deep); font-size: 0.9rem; font-weight: 500; padding: 0.8rem 1rem; border-radius: var(--r-md); }
        .status-msg { margin-top: 1.6rem; font-family: var(--data); color: var(--muted); font-size: 0.9rem; }

        .tools { display: flex; gap: 8px; margin-top: 18px; flex-wrap: wrap; }
        .search {
          flex: 1 1 12rem; min-height: 44px; font-family: var(--body); font-size: 0.95rem; padding: 0 14px;
          border: 1.5px solid var(--line); border-radius: var(--r-pill); background: #fff; color: var(--ink);
        }
        .search:focus { outline: none; border-color: var(--wagon); }
        .export {
          flex: none; min-height: 44px; padding: 0 18px; font-family: var(--body); font-weight: 700;
          font-size: 0.9rem; color: #fff; background: var(--wagon); border: none;
          border-radius: var(--r-pill); cursor: pointer;
        }
        .export:hover { background: var(--wagon-deep); }

        .list { list-style: none; margin: 16px 0 0; padding: 0; background: #fff; border: 1px solid var(--line); border-radius: var(--r-md); overflow: hidden; }
        .list li { display: flex; align-items: center; gap: 12px; padding: 11px 14px; border-top: 1px solid var(--line); min-height: 52px; }
        .list li:first-child { border-top: none; }
        .mail { flex-grow: 1; min-width: 0; font-size: 0.92rem; color: var(--ink); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .mail:hover { color: var(--wagon-deep); }
        .when { font-family: var(--data); font-size: 0.72rem; color: var(--muted); white-space: nowrap; flex: none; }
        .drop {
          flex: none; font-family: var(--body); font-weight: 700; font-size: 0.75rem; color: var(--muted);
          background: transparent; border: 1px solid var(--line); border-radius: var(--r-pill);
          padding: 7px 12px; cursor: pointer;
        }
        .drop:hover:not(:disabled) { color: var(--wagon-deep); border-color: var(--wagon); }
        .drop:disabled { opacity: 0.5; cursor: default; }

        .toast { position: fixed; left: 50%; bottom: calc(22px + env(safe-area-inset-bottom)); transform: translateX(-50%); background: var(--ink); color: #fff; font-weight: 600; font-size: 0.95rem; padding: 0.8rem 1.3rem; border-radius: var(--r-pill); box-shadow: var(--shadow-lg); }
      `}</style>
    </div>
  );
}
