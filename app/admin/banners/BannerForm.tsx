"use client";

import { useActionState } from "react";
import { createBannerAction, type BannerActionState } from "./actions";

const initialState: BannerActionState = {
  ok: false,
  message: "",
};

export function BannerForm() {
  const [state, formAction, isPending] = useActionState(
    createBannerAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-5 border border-black bg-white p-5">
      <Field label="Title">
        <input className="admin-input" name="title" required />
      </Field>
      <Field label="Subtitle">
        <textarea className="admin-input min-h-24 py-3" name="subtitle" />
      </Field>
      <Field label="Image">
        <input
          className="admin-file"
          name="image"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          required
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Button text">
          <input className="admin-input" name="buttonText" />
        </Field>
        <Field label="Button link">
          <input className="admin-input" name="buttonLink" placeholder="/products" />
        </Field>
      </div>
      <Field label="Sort order">
        <input
          className="admin-input"
          defaultValue="0"
          min="0"
          name="sortOrder"
          type="number"
        />
      </Field>
      <label className="flex items-center gap-3 text-sm font-medium">
        <input
          className="h-4 w-4 accent-black"
          defaultChecked
          name="isActive"
          type="checkbox"
        />
        Active banner
      </label>
      {state.message ? (
        <p className="border border-black bg-neutral-100 px-4 py-3 text-sm">
          {state.message}
        </p>
      ) : null}
      <button className="admin-button" type="submit" disabled={isPending}>
        {isPending ? "Creating" : "Create banner"}
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
