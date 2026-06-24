"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getActionErrorMessage, logActionError } from "@/lib/actionErrors";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import {
  orderStatusOptions,
  paymentStatusOptions,
  type OrderStatus,
} from "./types";

const updateOrderStatusSchema = z.object({
  orderId: z.string().uuid(),
  orderStatus: z.enum(orderStatusOptions),
  paymentStatus: z.enum(paymentStatusOptions),
});

export type UpdateOrderState = {
  ok: boolean;
  message: string;
};

export async function updateOrderStatusesAction(
  _prevState: UpdateOrderState,
  formData: FormData,
): Promise<UpdateOrderState> {
  const parsed = updateOrderStatusSchema.safeParse({
    orderId: formData.get("orderId"),
    orderStatus: formData.get("orderStatus"),
    paymentStatus: formData.get("paymentStatus"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message || "Invalid order status.",
    };
  }

  const supabase = await createServerSupabaseClient();
  const { data: currentOrder, error: currentOrderError } = await supabase
    .from("orders")
    .select("order_status")
    .eq("id", parsed.data.orderId)
    .maybeSingle();

  if (currentOrderError || !currentOrder) {
    logActionError("updateOrderStatusesAction", currentOrderError);
    return {
      ok: false,
      message: "Order was not found.",
    };
  }

  if (
    !canTransitionOrderStatus(
      currentOrder.order_status as OrderStatus,
      parsed.data.orderStatus,
    )
  ) {
    return {
      ok: false,
      message: "This order status transition is not allowed.",
    };
  }

  const { error } = await supabase
    .from("orders")
    .update({
      order_status: parsed.data.orderStatus,
      payment_status: parsed.data.paymentStatus,
    })
    .eq("id", parsed.data.orderId);

  if (error) {
    logActionError("updateOrderStatusesAction", error);
    return {
      ok: false,
      message: getActionErrorMessage("update order statuses"),
    };
  }

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${parsed.data.orderId}`);

  return {
    ok: true,
    message: "Order statuses updated.",
  };
}

const allowedOrderTransitions: Record<OrderStatus, OrderStatus[]> = {
  pending: ["pending", "confirmed", "cancelled"],
  confirmed: ["confirmed", "processing", "cancelled"],
  processing: ["processing", "shipped", "cancelled"],
  shipped: ["shipped", "delivered"],
  delivered: ["delivered"],
  cancelled: ["cancelled"],
};

function canTransitionOrderStatus(from: OrderStatus, to: OrderStatus) {
  return allowedOrderTransitions[from]?.includes(to) || false;
}
