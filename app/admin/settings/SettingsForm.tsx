"use client";

import { useActionState } from "react";
import {
  saveSiteSettingsAction,
  type SettingsActionState,
} from "./actions";

type SettingsValue = {
  whatsappNumber?: string;
  instagramUrl?: string;
  tiktokUrl?: string;
  returnPolicyText?: string;
  shippingPolicyText?: string;
  supportEmail?: string;
  supportPhone?: string;
  announcementText?: string;
};

const initialState: SettingsActionState = {
  ok: false,
  message: "",
};

export function SettingsForm({ settings }: { settings: SettingsValue }) {
  const [state, formAction, isPending] = useActionState(
    saveSiteSettingsAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-6 border border-black bg-white p-6">
      <section>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.24em]">
          Contact and social
        </h2>
        <div className="grid gap-5 md:grid-cols-2">
          <Field label="WhatsApp number">
            <input
              className="admin-input"
              name="whatsappNumber"
              defaultValue={settings.whatsappNumber || ""}
            />
          </Field>
          <Field label="Support phone">
            <input
              className="admin-input"
              name="supportPhone"
              defaultValue={settings.supportPhone || ""}
            />
          </Field>
          <Field label="Support email">
            <input
              className="admin-input"
              name="supportEmail"
              type="email"
              defaultValue={settings.supportEmail || ""}
            />
          </Field>
          <Field label="Instagram URL">
            <input
              className="admin-input"
              name="instagramUrl"
              type="url"
              defaultValue={settings.instagramUrl || ""}
            />
          </Field>
          <Field label="TikTok URL">
            <input
              className="admin-input"
              name="tiktokUrl"
              type="url"
              defaultValue={settings.tiktokUrl || ""}
            />
          </Field>
          <Field label="Announcement text">
            <input
              className="admin-input"
              name="announcementText"
              defaultValue={settings.announcementText || ""}
            />
          </Field>
        </div>
      </section>

      <section className="border-t border-black pt-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.24em]">
          Policies
        </h2>
        <div className="grid gap-5">
          <Field label="Return policy text">
            <textarea
              className="admin-input min-h-40 py-3"
              name="returnPolicyText"
              defaultValue={settings.returnPolicyText || ""}
            />
          </Field>
          <Field label="Shipping policy text">
            <textarea
              className="admin-input min-h-40 py-3"
              name="shippingPolicyText"
              defaultValue={settings.shippingPolicyText || ""}
            />
          </Field>
        </div>
      </section>

      {state.message ? (
        <p className="border border-black bg-neutral-100 px-4 py-3 text-sm">
          {state.message}
        </p>
      ) : null}

      <button className="admin-button" type="submit" disabled={isPending}>
        {isPending ? "Saving" : "Save settings"}
      </button>
    </form>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-neutral-600">
        {label}
      </span>
      {children}
    </label>
  );
}
