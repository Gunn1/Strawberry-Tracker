"use client";

import { useEffect, useState } from "react";

interface User {
  id: string;
  email: string;
  name: string | null;
  role: "ADMIN" | "STAFF";
  active: boolean;
  createdAt: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [meEmail, setMeEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState("");

  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState<"ADMIN" | "STAFF">("STAFF");
  const [adding, setAdding] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    try {
      const [uRes, meRes] = await Promise.all([fetch("/api/users"), fetch("/api/me")]);
      if (!uRes.ok) throw new Error();
      setUsers(await uRes.json());
      if (meRes.ok) setMeEmail((await meRes.json()).email ?? null);
    } catch {
      setError("Couldn't load users.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [uRes, meRes] = await Promise.all([fetch("/api/users"), fetch("/api/me")]);
        if (!uRes.ok) throw new Error();
        const list = await uRes.json();
        if (!active) return;
        setUsers(list);
        if (meRes.ok) setMeEmail((await meRes.json()).email ?? null);
      } catch {
        if (active) setError("Couldn't load users.");
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

  async function addUser(e: React.FormEvent) {
    e.preventDefault();
    if (adding) return;
    setAdding(true);
    setError(null);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newEmail, role: newRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "error");
      setNewEmail("");
      setNewRole("STAFF");
      setToast("User added");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't add that user.");
    } finally {
      setAdding(false);
    }
  }

  async function patch(id: string, body: { role?: string; active?: boolean }) {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      const updated: User = await res.json();
      setUsers((prev) => prev.map((u) => (u.id === id ? updated : u)));
    } catch {
      setError("Couldn't update that user.");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(u: User) {
    if (typeof window !== "undefined" && !window.confirm(`Remove ${u.email}? They'll lose access.`)) return;
    setBusyId(u.id);
    setError(null);
    try {
      const res = await fetch(`/api/users/${u.id}`, { method: "DELETE" });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d?.error ?? "error");
      }
      setUsers((prev) => prev.filter((x) => x.id !== u.id));
      setToast("User removed");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't remove that user.");
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
            <h1>Staff &amp; access</h1>
          </div>
        </header>
        <p className="intro">Add the people who can sign in. <b>Admins</b> can do everything, including managing users. <b>Staff</b> can run the till and set the status, but can&apos;t manage users.</p>

        {error && <p className="banner">{error}</p>}

        <form className="addrow" onSubmit={addUser}>
          <input
            type="email"
            required
            placeholder="name@email.com"
            aria-label="Email to add"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            disabled={adding}
          />
          <select value={newRole} onChange={(e) => setNewRole(e.target.value as "ADMIN" | "STAFF")} aria-label="Role" disabled={adding}>
            <option value="STAFF">Staff</option>
            <option value="ADMIN">Admin</option>
          </select>
          <button type="submit" className="add" disabled={adding}>{adding ? "Adding…" : "Add user"}</button>
        </form>

        {loading ? (
          <p className="status-msg">Loading…</p>
        ) : users.length === 0 ? (
          <p className="status-msg">No users yet.</p>
        ) : (
          <ul className="userlist">
            {users.map((u) => {
              const isMe = !!meEmail && u.email.toLowerCase() === meEmail.toLowerCase();
              return (
                <li className="user" key={u.id}>
                  <div className="who">
                    <b>{u.email}{isMe && <span className="you"> (you)</span>}</b>
                    {!u.active && <span className="pending">inactive</span>}
                  </div>
                  <select
                    className="role"
                    value={u.role}
                    onChange={(e) => patch(u.id, { role: e.target.value })}
                    disabled={busyId === u.id}
                  >
                    <option value="STAFF">Staff</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                  <button
                    className="rm"
                    onClick={() => remove(u)}
                    disabled={busyId === u.id || isMe}
                    title={isMe ? "You can't remove yourself" : "Remove user"}
                    aria-label="Remove user"
                  >
                    ×
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <p className="note">To stay an admin no matter what, keep your email in the <code>ADMIN_EMAILS</code> setting. New people you add here can sign in with the email magic link.</p>
      </div>

      {toast && <div className="toast">{toast}</div>}

      <style jsx>{`
        .admin { background: var(--paper); color: var(--ink); font-family: var(--body); padding: clamp(18px, 4vw, 44px) 16px 64px; }
        .shell { max-width: 640px; margin: 0 auto; }
        .back { display: inline-block; font-family: var(--data); font-size: .8rem; letter-spacing: .04em; color: var(--wagon-deep); text-decoration: none; margin-bottom: 16px; }
        .back:hover { color: var(--wagon); }
        .eyebrow { font-family: var(--data); font-size: .72rem; letter-spacing: .14em; text-transform: uppercase; color: var(--wagon-deep); }
        h1 { font-family: var(--display); font-weight: 600; font-size: clamp(1.9rem, 5vw, 2.7rem); letter-spacing: -.01em; margin: .3rem 0 0; }
        .intro { color: var(--muted); margin-top: .7rem; line-height: 1.55; }
        .intro b { color: var(--ink); }
        .banner { margin-top: 1.2rem; background: #fdeee7; border: 1px solid #f4d3c4; color: var(--wagon-deep); font-size: .9rem; font-weight: 500; padding: .8rem 1rem; border-radius: var(--r-md); }
        .status-msg { margin-top: 1.4rem; font-family: var(--data); color: var(--muted); }

        .addrow { display: flex; gap: .5rem; margin-top: 1.6rem; flex-wrap: wrap; }
        .addrow input { flex: 1; min-width: 12rem; font-family: var(--body); font-size: 1rem; padding: .7rem .9rem; border: 1.5px solid var(--line); border-radius: var(--r-sm); background: #fff; }
        .addrow input:focus, .addrow select:focus { outline: none; border-color: var(--wagon); }
        .addrow select { font-family: var(--body); font-size: 1rem; padding: .7rem .9rem; border: 1.5px solid var(--line); border-radius: var(--r-sm); background: #fff; }
        .add { font-family: var(--body); font-weight: 700; font-size: .95rem; padding: .7em 1.3em; border: none; border-radius: var(--r-pill); background: var(--wagon); color: #fff; cursor: pointer; }
        .add:hover:not(:disabled) { background: var(--wagon-deep); }
        .add:disabled { opacity: .6; cursor: default; }

        .userlist { list-style: none; margin: 1.6rem 0 0; padding: 0; display: flex; flex-direction: column; }
        .user { display: grid; grid-template-columns: 1fr auto auto; align-items: center; gap: .8rem; padding: .85rem 0; border-top: 1px solid var(--line); }
        .user:first-child { border-top: 0; }
        .who { min-width: 0; display: flex; align-items: center; gap: .6rem; flex-wrap: wrap; }
        .who b { font-weight: 700; font-size: .98rem; overflow: hidden; text-overflow: ellipsis; }
        .you { color: var(--muted); font-weight: 500; }
        .pending { font-family: var(--data); font-size: .68rem; letter-spacing: .05em; text-transform: uppercase; color: #845410; background: #fbeac9; padding: .2em .55em; border-radius: 999px; }
        .role { font-family: var(--body); font-size: .9rem; padding: .45rem .6rem; border: 1.5px solid var(--line); border-radius: var(--r-sm); background: #fff; cursor: pointer; }
        .role:focus { outline: none; border-color: var(--wagon); }
        .rm { width: 34px; height: 34px; flex: none; border: 1.5px solid var(--line); background: #fff; color: var(--muted); border-radius: var(--r-sm); font-size: 1.2rem; line-height: 1; cursor: pointer; }
        .rm:hover:not(:disabled) { border-color: var(--wagon); color: var(--wagon); background: #fdeee7; }
        .rm:disabled { opacity: .4; cursor: default; }

        .note { margin-top: 1.8rem; font-size: .85rem; color: var(--muted); line-height: 1.55; }
        .note code { font-family: var(--data); background: var(--paper-2); border: 1px solid var(--line); padding: .1em .4em; border-radius: 5px; }
        .toast { position: fixed; left: 50%; bottom: 22px; transform: translateX(-50%); background: var(--ink); color: #fff; font-weight: 600; font-size: .95rem; padding: .8rem 1.3rem; border-radius: var(--r-pill); box-shadow: var(--shadow-lg); }

        @media (max-width: 480px) { .addrow input { min-width: 0; } }
      `}</style>
    </div>
  );
}
