// Optional MailerLite mirror for season-update signups. Set these to turn it
// on; until then signups live only in our own `Subscriber` table.
//
//   MAILERLITE_API_KEY   — token from MailerLite -> Integrations -> API
//   MAILERLITE_GROUP_ID  — (optional) id of the "Season updates" group

const API_URL = "https://connect.mailerlite.com/api/subscribers";

/**
 * Mirror a signup into MailerLite. Never throws: a provider outage must not
 * fail the visitor's signup, which is already saved in our database.
 */
export async function addToMailingList(email: string): Promise<void> {
  const apiKey = process.env.MAILERLITE_API_KEY;
  if (!apiKey) return; // integration not configured

  const groupId = process.env.MAILERLITE_GROUP_ID;
  const payload: { email: string; groups?: string[] } = { email };
  if (groupId) payload.groups = [groupId];

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error(`MailerLite signup failed (${res.status}): ${detail}`);
    }
  } catch (err) {
    console.error("MailerLite request error:", err);
  }
}
