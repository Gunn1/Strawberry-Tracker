/**
 * Transactional email over Resend's HTTP API.
 *
 * Not nodemailer: this runs on Cloudflare Workers, which has no raw TCP
 * sockets, so SMTP is not an option. Set RESEND_API_KEY and EMAIL_FROM to turn
 * it on; until then sending is a no-op and the reservation still stands.
 */

const API_URL = "https://api.resend.com/emails";

export interface Mail {
  to: string;
  subject: string;
  /** Plain text; this farm's mail does not need to be a web page. */
  text: string;
}

/**
 * Send one message. Never throws: a mail outage must not fail the booking the
 * customer just made, which is already saved.
 */
export async function sendMail(mail: Mail): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    console.warn("Email not configured (RESEND_API_KEY / EMAIL_FROM); skipping send.");
    return false;
  }

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [mail.to], subject: mail.subject, text: mail.text }),
    });
    if (!res.ok) {
      console.error(`Resend failed (${res.status}): ${await res.text().catch(() => "")}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error("Resend request error:", err);
    return false;
  }
}
