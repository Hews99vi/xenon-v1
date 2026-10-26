import { cookies, draftMode } from "next/headers";
import { NextResponse } from "next/server";
export async function POST() {
  (await draftMode()).disable();
  (await cookies()).delete("xenon-content-preview");
  return new NextResponse(null, { status: 303, headers: { Location: "/" } });
}
