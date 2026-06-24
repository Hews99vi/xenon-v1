import { NextResponse } from "next/server";
import {
  generatePayHereNotificationHash,
  getPayHereMerchantId,
  getPayHereMerchantSecret,
} from "@/lib/payhere";
import { logActionError } from "@/lib/actionErrors";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request: Request) {
  const formData = await request.formData();
  const payload = Object.fromEntries(
    Array.from(formData.entries()).map(([key, value]) => [key, String(value)]),
  );
  const merchantId = payload.merchant_id;
  const orderId = payload.order_id;
  const payhereAmount = payload.payhere_amount;
  const payhereCurrency = payload.payhere_currency;
  const statusCode = payload.status_code;
  const md5sig = payload.md5sig;

  if (
    !merchantId ||
    !orderId ||
    !payhereAmount ||
    !payhereCurrency ||
    !statusCode ||
    !md5sig
  ) {
    return NextResponse.json(
      { ok: false, message: "Missing PayHere notification fields." },
      { status: 400 },
    );
  }

  const configuredMerchantId = getPayHereMerchantId();

  if (merchantId !== configuredMerchantId) {
    return NextResponse.json(
      { ok: false, message: "Invalid merchant ID." },
      { status: 400 },
    );
  }

  const localSignature = generatePayHereNotificationHash({
    merchantId,
    orderId,
    amount: payhereAmount,
    currency: payhereCurrency,
    statusCode,
    merchantSecret: getPayHereMerchantSecret(),
  });

  if (localSignature !== md5sig.toUpperCase()) {
    return NextResponse.json(
      { ok: false, message: "Invalid PayHere signature." },
      { status: 400 },
    );
  }

  const { data: order, error: orderError } = await supabaseAdmin
    .from("orders")
    .select("id")
    .eq("order_number", orderId)
    .maybeSingle();

  if (orderError || !order) {
    return NextResponse.json(
      { ok: false, message: "Order was not found." },
      { status: 404 },
    );
  }

  const isPaid = statusCode === "2";
  const paymentStatus = isPaid ? "paid" : "failed";
  const orderStatus = isPaid ? "confirmed" : "pending";
  const providerTransactionId =
    payload.payhere_payment_id ||
    payload.payment_id ||
    `${orderId}-${statusCode}-${md5sig.toUpperCase()}`;

  const { error: updateError } = await supabaseAdmin
    .from("orders")
    .update({
      payment_status: paymentStatus,
      order_status: orderStatus,
    })
    .eq("id", order.id);

  if (updateError) {
    logActionError("payhereNotifyUpdateOrder", updateError);
    return NextResponse.json(
      { ok: false, message: "Could not update order payment status." },
      { status: 500 },
    );
  }

  const { error: transactionError } = await supabaseAdmin
    .from("payment_transactions")
    .upsert({
      order_id: order.id,
      provider: "payhere",
      provider_transaction_id: providerTransactionId,
      merchant_id: merchantId,
      payment_id: payload.payment_id || payload.payhere_payment_id || null,
      amount: Number(payhereAmount),
      currency: payhereCurrency,
      status: paymentStatus,
      raw_payload: payload,
      received_at: new Date().toISOString(),
    }, {
      onConflict: "provider,provider_transaction_id",
    });

  if (transactionError) {
    logActionError("payhereNotifyTransaction", transactionError);
    return NextResponse.json(
      { ok: false, message: "Could not record payment notification." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    order_id: orderId,
    payment_status: paymentStatus,
    order_status: orderStatus,
  });
}
