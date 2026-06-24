"use client";

import { useActionState } from "react";
import { updateOrderStatusesAction, type UpdateOrderState } from "./actions";
import {
  orderStatusOptions,
  paymentStatusOptions,
  titleCase,
  type OrderStatus,
  type PaymentStatus,
} from "./types";

type OrderStatusFormProps = {
  orderId: string;
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
};

const initialState: UpdateOrderState = {
  ok: false,
  message: "",
};

export function OrderStatusForm({
  orderId,
  orderStatus,
  paymentStatus,
}: OrderStatusFormProps) {
  const [state, formAction, isPending] = useActionState(
    updateOrderStatusesAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-5 border border-black bg-white p-5">
      <input type="hidden" name="orderId" value={orderId} />
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-neutral-700">
            Order status
          </span>
          <select
            className="admin-input"
            name="orderStatus"
            defaultValue={orderStatus}
          >
            {orderStatusOptions.map((option) => (
              <option key={option} value={option}>
                {titleCase(option)}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-neutral-700">
            Payment status
          </span>
          <select
            className="admin-input"
            name="paymentStatus"
            defaultValue={paymentStatus}
          >
            {paymentStatusOptions.map((option) => (
              <option key={option} value={option}>
                {titleCase(option)}
              </option>
            ))}
          </select>
        </label>
      </div>

      {state.message ? (
        <p className="border border-black bg-neutral-100 px-4 py-3 text-sm">
          {state.message}
        </p>
      ) : null}

      <button className="admin-button" type="submit" disabled={isPending}>
        {isPending ? "Saving" : "Save statuses"}
      </button>
    </form>
  );
}
