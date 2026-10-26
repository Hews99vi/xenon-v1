import { NextRequest, NextResponse } from "next/server";
import { cookies, draftMode } from "next/headers";
import { requireAdmin } from "@/lib/content/server";
import { contentPath } from "@/lib/content/schema";
export async function GET(request: NextRequest) {
  try {
    const { db } = await requireAdmin();
    const { data } = await db
      .from("content_documents")
      .select("id,kind,slug,draft_revision_id")
      .eq("key", request.nextUrl.searchParams.get("key") || "site")
      .maybeSingle();
    if (!data?.draft_revision_id)
      return new NextResponse("Save a draft before previewing.", {
        status: 404,
      });
    const revision = request.nextUrl.searchParams.get("revision");
    if (revision !== data.draft_revision_id)
      return new NextResponse(
        "This draft changed. Reload the editor before previewing.",
        { status: 409 },
      );
    (await draftMode()).enable();
    (await cookies()).set(
      "xenon-content-preview",
      JSON.stringify({
        key: request.nextUrl.searchParams.get("key") || "site",
        revision,
      }),
      {
        httpOnly: true,
        sameSite: "lax",
        secure: request.nextUrl.protocol === "https:",
        path: "/",
      },
    );
    // A relative redirect retains the browser's origin behind local/reverse proxies.
    const response = new NextResponse(null, {
      status: 307,
      headers: { Location: contentPath(data.kind, data.slug) },
    });
    response.headers.set("Cache-Control", "private, no-store");
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
    return response;
  } catch {
    return new NextResponse("Admin access required.", { status: 401 });
  }
}
