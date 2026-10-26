import { NextResponse } from "next/server";
import { PAYHERE_DISABLED_MESSAGE } from "@/lib/payhere";

export const dynamic = "force-dynamic";

export async function GET() {
  return disabledPayHereResponse();
}

export async function POST() {
  return disabledPayHereResponse();
}

function disabledPayHereResponse() {
  return NextResponse.json(
    {
      ok: false,
      message: PAYHERE_DISABLED_MESSAGE,
    },
    { status: 501 },
  );
}
