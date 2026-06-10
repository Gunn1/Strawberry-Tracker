"use client";

import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";

const ERRORS: Record<string, string> = {
  AccessDenied: "That account isn't on the staff list. Ask an admin to add you.",
  OAuthAccountNotLinked: "That email already signed in with the other provider — use that one.",
  Configuration: "Sign-in isn't fully set up yet. Please try again later.",
};

function LoginInner() {
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") || "/admin";
  const error = params.get("error");

  const go = (provider: "google" | "azure-ad") => signIn(provider, { callbackUrl });

  return (
    <main className="wrap">
      <div className="card">
        <Image className="logo" src="/Logo.webp" alt="Carter's Red Wagon Farm" width={240} height={147} priority />

        <h1>Staff sign in</h1>
        <p className="sub">Access the farm&apos;s admin &amp; till</p>

        {error && <p className="err">{ERRORS[error] || "Couldn't sign you in. Please try again."}</p>}

        <div className="buttons">
          <button type="button" className="oauth" onClick={() => go("google")}>
            <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
            </svg>
            Continue with Google
          </button>

          <button type="button" className="oauth" onClick={() => go("azure-ad")}>
            <svg width="18" height="18" viewBox="0 0 23 23" aria-hidden="true">
              <path fill="#F25022" d="M1 1h10v10H1z" />
              <path fill="#7FBA00" d="M12 1h10v10H12z" />
              <path fill="#00A4EF" d="M1 12h10v10H1z" />
              <path fill="#FFB900" d="M12 12h10v10H12z" />
            </svg>
            Continue with Microsoft
          </button>
        </div>

        <Link className="back" href="/">← Back to the website</Link>
      </div>

      <style jsx>{`
        .wrap { min-height: 100vh; display: grid; place-items: center; background: var(--paper); padding: 24px; font-family: var(--body); }
        .card { width: 100%; max-width: 400px; background: #fff; border: 1px solid var(--line); border-radius: var(--r-lg); padding: 40px 32px 28px; text-align: center; box-shadow: var(--shadow-lg); display: flex; flex-direction: column; align-items: center; }
        .logo { width: 200px; height: auto; margin: 0 0 8px; }
        h1 { font-family: var(--display); font-weight: 600; font-size: 1.7rem; color: var(--ink); margin: 14px 0 4px; }
        .sub { color: var(--muted); font-size: .95rem; margin: 0 0 24px; }
        .err { background: #fdeee7; border: 1px solid #f4d3c4; color: var(--wagon-deep); font-size: .88rem; font-weight: 500; padding: .7rem .9rem; border-radius: var(--r-md); margin: 0 0 18px; line-height: 1.45; width: 100%; box-sizing: border-box; }
        .buttons { display: flex; flex-direction: column; gap: 12px; width: 100%; }
        .oauth { display: flex; align-items: center; justify-content: center; gap: 12px; width: 100%; font-family: var(--body); font-weight: 600; font-size: 1rem; color: var(--ink); background: #fff; border: 1.5px solid var(--line); border-radius: var(--r-md); padding: .85rem 1rem; cursor: pointer; transition: border-color .12s ease, background .12s ease; }
        .oauth:hover { border-color: var(--wagon); background: var(--paper); }
        .back { display: inline-block; margin-top: 22px; font-family: var(--data); font-size: .82rem; color: var(--muted); text-decoration: none; }
        .back:hover { color: var(--wagon-deep); }
      `}</style>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}
