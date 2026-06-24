"use client";

import { useActionState } from "react";
import {
  createDeliveryZoneAction,
  type DeliveryZoneActionState,
} from "./actions";

const initialState: DeliveryZoneActionState = {
  ok: false,
  message: "",
};

export function DeliveryZoneForm() {
  const [state, formAction, isPending] = useActionState(
    createDeliveryZoneAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-5 border border-black bg-white p-5">
      <Field label="District">
        <input className="admin-input" name="district" required />
      </Field>
      <Field label="City optional">
        <input className="admin-input" name="city" />
      </Field>
      <Field label="Delivery fee">
        <input
          className="admin-input"
          min="0"
          name="deliveryFee"
          required
          step="0.01"
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
        Active zone
      </label>

      {state.message ? (
        <p className="border border-black bg-neutral-100 px-4 py-3 text-sm">
          {state.message}
        </p>
      ) : null}

      <button className="admin-button" type="submit" disabled={isPending}>
        {isPending ? "Creating" : "Create delivery zone"}
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
