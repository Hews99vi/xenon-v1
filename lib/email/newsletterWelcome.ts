import "server-only";

const resendApiKey = process.env.RESEND_API_KEY;
const resendFromEmail = process.env.RESEND_FROM_EMAIL;
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export async function sendNewsletterWelcomeEmail(email: string) {
  if (!resendApiKey || !resendFromEmail) {
    return { ok: false, skipped: true, reason: "missing_provider_config" };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: resendFromEmail,
      to: email,
      subject: "Welcome to Xenon",
      html: `<div style="font-family:Arial,Helvetica,sans-serif;color:#0a0a0a;max-width:620px;margin:0 auto;padding:32px"><p style="font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:#666">Xenon</p><h1 style="font-size:32px;text-transform:uppercase">You are on the list.</h1><p style="line-height:1.6">Expect early access to new drops and private edits.</p><p><a href="${siteUrl}/products" style="color:#0a0a0a">Explore the collection</a></p></div>`,
      text: `Welcome to Xenon. You are on the list for early access to new drops and private edits. Explore the collection: ${siteUrl}/products`,
    }),
  });

  if (!response.ok) {
    throw new Error(`Newsletter email provider returned ${response.status}.`);
  }

  return { ok: true, skipped: false, reason: null };
}
