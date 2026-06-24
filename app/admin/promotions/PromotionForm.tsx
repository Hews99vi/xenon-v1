"use client";

import { useActionState } from "react";
import {
  createPromotionAction,
  type PromotionActionState,
} from "./actions";

const initialState: PromotionActionState = {
  ok: false,
  message: "",
};

export function PromotionForm() {
  const [state, formAction, isPending] = useActionState(
    createPromotionAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-5 border border-black bg-white p-5">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Code">
          <input className="admin-input uppercase" name="code" required />
        </Field>
        <Field label="Discount type">
          <select className="admin-input" name="discountType" defaultValue="percentage">
            <option value="percentage">Percentage</option>
            <option value="fixed">Fixed</option>
          </select>
        </Field>
      </div>

      <Field label="Description">
        <input className="admin-input" name="description" />
      </Field>

      <div className="grid gap-4 md:grid-cols-3">
        <Field label="Discount value">
          <input
            className="admin-input"
            min="0"
            name="discountValue"
            required
            step="0.01"
            type="number"
          />
        </Field>
        <Field label="Minimum order">
          <input
            className="admin-input"
            defaultValue="0"
            min="0"
            name="minimumOrderAmount"
            step="0.01"
            type="number"
          />
        </Field>
        <Field label="Usage limit">
          <input className="admin-input" min="1" name="usageLimit" type="number" />
        </Field>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Starts at">
          <input className="admin-input" name="startsAt" type="datetime-local" />
        </Field>
        <Field label="Expires at">
          <input className="admin-input" name="expiresAt" type="datetime-local" />
        </Field>
      </div>

      <label className="flex items-center gap-3 text-sm font-medium">
        <input
          className="h-4 w-4 accent-black"
          defaultChecked
          name="isActive"
          type="checkbox"
        />
        Active promo code
      </label>

      {state.message ? (
        <p className="border border-black bg-neutral-100 px-4 py-3 text-sm">
          {state.message}
        </p>
      ) : null}

      <button className="admin-button" type="submit" disabled={isPending}>
        {isPending ? "Creating" : "Create promo code"}
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
