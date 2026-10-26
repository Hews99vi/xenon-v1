import "server-only";

export type OrderConfirmationEmailItem = {
  name: string;
  variant: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type OrderConfirmationEmailInput = {
  to: string | null | undefined;
  orderNumber: string;
  customerName: string;
  total: number;
  paymentMethod: string;
  paymentStatus: string;
  items: OrderConfirmationEmailItem[];
};

const resendApiKey = process.env.RESEND_API_KEY;
const resendFromEmail = process.env.RESEND_FROM_EMAIL;
const supportEmail =
  process.env.SUPPORT_EMAIL || process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "support@xenon.local";
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export async function sendOrderConfirmationEmail(
  input: OrderConfirmationEmailInput,
) {
  if (!input.to || input.to.endsWith("@xenon.local")) {
    return { ok: false, skipped: true, reason: "missing_recipient" };
  }

  if (!resendApiKey || !resendFromEmail) {
    console.warn("[OrderConfirmationEmail] Resend env vars are not configured.");
    return { ok: false, skipped: true, reason: "missing_provider_config" };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: resendFromEmail,
        to: input.to,
        subject: `Xenon order ${input.orderNumber} confirmed`,
        html: renderOrderConfirmationHtml(input),
        text: renderOrderConfirmationText(input),
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.error("[OrderConfirmationEmail] Resend request failed.", {
        status: response.status,
        detail,
      });
      return { ok: false, skipped: false, reason: "provider_error" };
    }

    return { ok: true, skipped: false, reason: null };
  } catch (error) {
    console.error("[OrderConfirmationEmail]", {
      error: error instanceof Error ? error.message : "Unknown email error",
    });
    return { ok: false, skipped: false, reason: "send_failed" };
  }
}

function renderOrderConfirmationHtml(input: OrderConfirmationEmailInput) {
  const items = input.items
    .map(
      (item) => `
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #e5e5e5;">
            <strong>${escapeHtml(item.name)}</strong><br />
            <span style="color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;">${escapeHtml(item.variant)}</span>
          </td>
          <td align="center" style="padding:12px 0;border-bottom:1px solid #e5e5e5;">${item.quantity}</td>
          <td align="right" style="padding:12px 0;border-bottom:1px solid #e5e5e5;">${formatMoney(item.lineTotal)}</td>
        </tr>
      `,
    )
    .join("");

  return `
    <div style="margin:0;background:#f8f6f2;padding:32px;font-family:Arial,Helvetica,sans-serif;color:#0a0a0a;">
      <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #0a0a0a;padding:28px;">
        <p style="margin:0 0 10px;font-size:11px;text-transform:uppercase;letter-spacing:0.22em;color:#6b7280;">Xenon</p>
        <h1 style="margin:0 0 20px;font-size:32px;line-height:1;text-transform:uppercase;letter-spacing:0.02em;">Order confirmed</h1>
        <p style="margin:0 0 22px;line-height:1.6;">Hi ${escapeHtml(input.customerName)}, your order has been received. Our team will contact you before dispatch.</p>

        <div style="border-top:1px solid #0a0a0a;border-bottom:1px solid #0a0a0a;padding:16px 0;margin-bottom:20px;">
          <p style="margin:0 0 8px;"><strong>Order:</strong> ${escapeHtml(input.orderNumber)}</p>
          <p style="margin:0 0 8px;"><strong>Payment:</strong> ${escapeHtml(input.paymentMethod)}</p>
          <p style="margin:0;"><strong>Status:</strong> ${escapeHtml(input.paymentStatus)}</p>
        </div>

        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:20px;">
          <thead>
            <tr>
              <th align="left" style="padding-bottom:10px;font-size:11px;text-transform:uppercase;letter-spacing:0.16em;">Item</th>
              <th align="center" style="padding-bottom:10px;font-size:11px;text-transform:uppercase;letter-spacing:0.16em;">Qty</th>
              <th align="right" style="padding-bottom:10px;font-size:11px;text-transform:uppercase;letter-spacing:0.16em;">Total</th>
            </tr>
          </thead>
          <tbody>${items}</tbody>
        </table>

        <p style="margin:0 0 24px;text-align:right;font-size:18px;"><strong>Total: ${formatMoney(input.total)}</strong></p>
        <p style="margin:0;color:#525252;line-height:1.6;">Need help? Contact us at <a href="mailto:${escapeHtml(supportEmail)}" style="color:#0a0a0a;">${escapeHtml(supportEmail)}</a>.</p>
        <p style="margin:14px 0 0;color:#737373;font-size:12px;">${escapeHtml(siteUrl)}</p>
      </div>
    </div>
  `;
}

function renderOrderConfirmationText(input: OrderConfirmationEmailInput) {
  const itemLines = input.items
    .map(
      (item) =>
        `- ${item.name} (${item.variant}) x ${item.quantity}: ${formatMoney(item.lineTotal)}`,
    )
    .join("\n");

  return [
    `Xenon order confirmed`,
    `Order: ${input.orderNumber}`,
    `Customer: ${input.customerName}`,
    `Payment: ${input.paymentMethod}`,
    `Status: ${input.paymentStatus}`,
    "",
    itemLines,
    "",
    `Total: ${formatMoney(input.total)}`,
    `Need help? Contact ${supportEmail}`,
    siteUrl,
  ].join("\n");
}

function formatMoney(value: number) {
  return `LKR ${value.toLocaleString("en-LK", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
