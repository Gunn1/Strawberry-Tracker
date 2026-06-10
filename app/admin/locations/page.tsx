"use client";

import { useEffect, useState } from "react";

interface Loc {
  id: string;
  name: string;
  active: boolean;
}

export default function LocationsPage() {
  const [locations, setLocations] = useState<Loc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    try {
      const res = await fetch("/api/locations?all=1");
      if (!res.ok) throw new Error();
      setLocations(await res.json());
    } catch {
      setError("Couldn't load locations.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/locations?all=1");
        if (!res.ok) throw new Error();
        const list = await res.json();
        if (active) setLocations(list);
      } catch {
        if (active) setError("Couldn't load locations.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  async function addLocation(e: React.FormEvent) {
    e.preventDefault();
    if (adding) return;
    setAdding(true);
    setError(null);
    try {
      const res = await fetch("/api/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "error");
      setNewName("");
      setToast("Location added");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't add that location.");
    } finally {
      setAdding(false);
    }
  }

  async function patch(id: string, body: { active?: boolean }) {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/locations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      const updated: Loc = await res.json();
      setLocations((prev) => prev.map((l) => (l.id === id ? updated : l)));
    } catch {
      setError("Couldn't update that location.");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(l: Loc) {
    if (typeof window !== "undefined" && !window.confirm(`Remove "${l.name}"? Past sales keep their recorded location.`)) return;
    setBusyId(l.id);
    setError(null);
    try {
      const res = await fetch(`/api/locations/${l.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setLocations((prev) => prev.filter((x) => x.id !== l.id));
      setToast("Location removed");
    } catch {
      setError("Couldn't remove that location.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="admin">
      <div className="shell">
        <header className="head">
          <div>
            <span className="eyebrow">Admin</span>
            <h1>Locations</h1>
          </div>
        </header>
        <p className="intro">Where the till can ring up sales — the farm stand, farmers markets, pop-ups. Hide one to keep it off the register without losing its history.</p>

        {error && <p className="banner">{error}</p>}

        <form className="addrow" onSubmit={addLocation}>
          <input
            type="text"
            required
            placeholder="e.g. Park Rapids Farmers Market"
            aria-label="Location name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            disabled={adding}
          />
          <button type="submit" className="add" disabled={adding}>{adding ? "Adding…" : "Add location"}</button>
        </form>

        {loading ? (
          <p className="status-msg">Loading…</p>
        ) : locations.length === 0 ? (
          <p className="status-msg">No locations yet.</p>
        ) : (
          <ul className="loclist">
            {locations.map((l) => (
              <li className={`loc ${l.active ? "" : "off"}`} key={l.id}>
                <span className="name">{l.name}{!l.active && <span className="hidden-tag">hidden</span>}</span>
                <button className="toggle" onClick={() => patch(l.id, { active: !l.active })} disabled={busyId === l.id}>
                  {l.active ? "Hide" : "Show"}
                </button>
                <button className="rm" onClick={() => remove(l)} disabled={busyId === l.id} aria-label="Remove location" title="Remove">×</button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {toast && <div className="toast">{toast}</div>}

      <style jsx>{`
        .admin { background: var(--paper); color: var(--ink); font-family: var(--body); padding: clamp(18px, 4vw, 44px) 16px 64px; }
        .shell { max-width: 560px; margin: 0 auto; }
        .eyebrow { font-family: var(--data); font-size: .72rem; letter-spacing: .14em; text-transform: uppercase; color: var(--wagon-deep); }
        h1 { font-family: var(--display); font-weight: 600; font-size: clamp(1.9rem, 5vw, 2.7rem); letter-spacing: -.01em; margin: .3rem 0 0; }
        .intro { color: var(--muted); margin-top: .7rem; line-height: 1.55; }
        .banner { margin-top: 1.2rem; background: #fdeee7; border: 1px solid #f4d3c4; color: var(--wagon-deep); font-size: .9rem; font-weight: 500; padding: .8rem 1rem; border-radius: var(--r-md); }
        .status-msg { margin-top: 1.4rem; font-family: var(--data); color: var(--muted); }

        .addrow { display: flex; gap: .5rem; margin-top: 1.6rem; flex-wrap: wrap; }
        .addrow input { flex: 1; min-width: 12rem; font-family: var(--body); font-size: 1rem; padding: .7rem .9rem; border: 1.5px solid var(--line); border-radius: var(--r-sm); background: #fff; }
        .addrow input:focus { outline: none; border-color: var(--wagon); }
        .add { font-family: var(--body); font-weight: 700; font-size: .95rem; padding: .7em 1.3em; border: none; border-radius: var(--r-pill); background: var(--wagon); color: #fff; cursor: pointer; }
        .add:hover:not(:disabled) { background: var(--wagon-deep); }
        .add:disabled { opacity: .6; cursor: default; }

        .loclist { list-style: none; margin: 1.6rem 0 0; padding: 0; }
        .loc { display: flex; align-items: center; gap: .8rem; padding: .9rem 0; border-top: 1px solid var(--line); }
        .loc:first-child { border-top: 0; }
        .name { flex: 1; font-weight: 700; display: flex; align-items: center; gap: .6rem; }
        .loc.off .name { color: var(--muted); }
        .hidden-tag { font-family: var(--data); font-size: .66rem; letter-spacing: .05em; text-transform: uppercase; color: #845410; background: #fbeac9; padding: .2em .55em; border-radius: 999px; }
        .toggle { font-family: var(--body); font-weight: 600; font-size: .85rem; color: var(--wagon-deep); background: var(--paper-2); border: 1px solid var(--line); padding: .45em 1em; border-radius: var(--r-pill); cursor: pointer; }
        .toggle:hover:not(:disabled) { border-color: var(--wagon); }
        .rm { width: 34px; height: 34px; flex: none; border: 1.5px solid var(--line); background: #fff; color: var(--muted); border-radius: var(--r-sm); font-size: 1.2rem; line-height: 1; cursor: pointer; }
        .rm:hover:not(:disabled) { border-color: var(--wagon); color: var(--wagon); background: #fdeee7; }
        .rm:disabled, .toggle:disabled { opacity: .5; cursor: default; }
        .toast { position: fixed; left: 50%; bottom: 22px; transform: translateX(-50%); background: var(--ink); color: #fff; font-weight: 600; font-size: .95rem; padding: .8rem 1.3rem; border-radius: var(--r-pill); box-shadow: var(--shadow-lg); }

        @media (max-width: 480px) { .addrow input { min-width: 0; } }
      `}</style>
    </div>
  );
}
