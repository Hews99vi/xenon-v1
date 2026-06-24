import { NextResponse } from "next/server";
import { z } from "zod";
import { logActionError } from "@/lib/actionErrors";
import { createPayHereCheckoutPayload } from "@/lib/payhere";

const payhereCheckoutSchema = z.object({
  order_id: z.string().min(1),
  items: z.string().min(1),
  amount: z.coerce.number().positive(),
  currency: z.string().default("LKR"),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = payhereCheckoutSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        message: parsed.error.issues[0]?.message || "Invalid checkout payload.",
      },
      { status: 400 },
    );
  }

  try {
    const payload = createPayHereCheckoutPayload({
      orderId: parsed.data.order_id,
      items: parsed.data.items,
      amount: parsed.data.amount,
      currency: parsed.data.currency,
      firstName: parsed.data.first_name,
      lastName: parsed.data.last_name,
      email: parsed.data.email,
      phone: parsed.data.phone,
      address: parsed.data.address,
      city: parsed.data.city,
      country: parsed.data.country,
    });

    return NextResponse.json({
      ok: true,
      actionUrl: payload.actionUrl,
      ...payload.params,
    });
  } catch (error) {
    logActionError("payhereCheckoutRoute", error);
    return NextResponse.json(
      {
        ok: false,
        message: "Could not create PayHere checkout payload.",
      },
      { status: 500 },
    );
  }
}
