"use client";

import { useActionState } from "react";
import { createBannerAction, type BannerActionState } from "./actions";

const initialState: BannerActionState = {
  ok: false,
  message: "",
};

const placementOptions = [
  { value: "home_hero", label: "Home hero" },
  { value: "home_editorial", label: "Home editorial banner" },
  { value: "home_campaign_secondary", label: "Home secondary campaign" },
];

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
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Placement">
          <select className="admin-input" name="placement" defaultValue="home_hero">
            {placementOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Eyebrow">
          <input className="admin-input" name="eyebrow" placeholder="Xenon · SS26" />
        </Field>
      </div>
      <Field label="Subtitle">
        <textarea className="admin-input min-h-24 py-3" name="subtitle" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Desktop image">
          <input
            className="admin-file"
            name="image"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            required
          />
        </Field>
        <Field label="Mobile image optional">
          <input
            className="admin-file"
            name="mobileImage"
            type="file"
            accept="image/png,image/jpeg,image/webp"
          />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Primary button text">
          <input className="admin-input" name="buttonText" />
        </Field>
        <Field label="Primary button link">
          <input className="admin-input" name="buttonLink" placeholder="/products" />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Secondary button text">
          <input className="admin-input" name="secondaryButtonText" />
        </Field>
        <Field label="Secondary button link">
            <input className="admin-input" name="secondaryButtonLink" placeholder="/products?category=evening-wear" />
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
