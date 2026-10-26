"use server";

import { z } from "zod";
import { sendNewsletterWelcomeEmail } from "@/lib/email/newsletterWelcome";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export type NewsletterActionState = {
  ok: boolean;
  message: string;
};

const newsletterSchema = z.object({
  email: z.string().trim().email("Enter a valid email address.").max(254),
});

export async function subscribeToNewsletter(
  previousState: NewsletterActionState,
  formData: FormData,
): Promise<NewsletterActionState> {
  void previousState;

  const website = String(formData.get("website") || "");

  // Treat the honeypot as a successful no-op so automated submissions do not
  // receive a useful signal that the trap was detected.
  if (website) {
    return { ok: true, message: "You are on the list." };
  }

  const parsed = newsletterSchema.safeParse({ email: formData.get("email") });

  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message || "Enter a valid email address.",
    };
  }

  const email = parsed.data.email.toLowerCase();
  const { data: existing, error: lookupError } = await supabaseAdmin
    .from("newsletter_subscribers")
    .select("id, status")
    .eq("email", email)
    .maybeSingle();

  if (lookupError) {
    console.error("[Newsletter] Could not check subscriber status.", {
      error: lookupError.message,
    });
    return { ok: false, message: "Could not join the list. Please try again." };
  }

  if (existing?.status === "active") {
    return { ok: true, message: "You are already on the list." };
  }

  const now = new Date().toISOString();
  const { error: saveError } = existing
    ? await supabaseAdmin
        .from("newsletter_subscribers")
        .update({ status: "active", subscribed_at: now, updated_at: now })
        .eq("id", existing.id)
    : await supabaseAdmin.from("newsletter_subscribers").insert({
        email,
        source: "storefront_footer",
        subscribed_at: now,
      });

  if (saveError) {
    console.error("[Newsletter] Could not save subscriber.", {
      error: saveError.message,
    });
    return { ok: false, message: "Could not join the list. Please try again." };
  }

  void sendNewsletterWelcomeEmail(email).catch((error) => {
    console.error("[Newsletter] Welcome email failed.", {
      error: error instanceof Error ? error.message : "Unknown email error",
    });
  });

  return { ok: true, message: "You are on the list." };
}
