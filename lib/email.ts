// Send the NextAuth sign-in (magic link) email via Resend's HTTP API.
// Uses fetch(), so it works on Cloudflare Workers — no SMTP / nodemailer.
export async function sendMagicLink({ to, url, from }: { to: string; url: string; from: string }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not set — cannot send the sign-in email.");
  }

  const html = `
  <div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;color:#2b2117">
    <h1 style="font-size:20px;margin:0 0 6px">Carter's Red Wagon Farm</h1>
    <p style="color:#6b6051;margin:0 0 24px">Click below to sign in to the staff tools.</p>
    <a href="${url}" style="display:inline-block;background:#C5392C;color:#fff;text-decoration:none;font-weight:600;padding:12px 26px;border-radius:999px">Sign in</a>
    <p style="color:#9a8f7e;font-size:13px;margin:26px 0 0">If you didn't request this, you can safely ignore this email.</p>
  </div>`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from,
      to,
      subject: "Sign in to Carter's Red Wagon Farm",
      text: `Sign in to Carter's Red Wagon Farm:\n\n${url}\n\nIf you didn't request this, you can ignore this email.`,
      html,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Resend failed (${res.status}): ${body}`);
  }
}
