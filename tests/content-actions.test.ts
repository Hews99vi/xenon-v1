import { beforeEach, describe, expect, it, vi } from "vitest";
import { defaultSite, emptyImage } from "@/lib/content/schema";
const { admin, rpc, from, revalidate } = vi.hoisted(() => ({
  admin: vi.fn(),
  rpc: vi.fn(),
  from: vi.fn(),
  revalidate: vi.fn(),
}));
vi.mock("@/lib/content/server", () => ({ requireAdmin: admin }));
vi.mock("next/cache", () => ({ revalidatePath: revalidate }));
import {
  saveDraft,
  publishDraft,
  restoreDraft,
} from "@/app/admin/website/actions";
beforeEach(() => {
  vi.clearAllMocks();
  from.mockReturnValue({
    select: () => ({
      eq: () => ({
        not: () => ({
          maybeSingle: async () => ({ data: { id: "site" }, error: null }),
        }),
      }),
    }),
  });
  admin.mockResolvedValue({ db: { rpc, from } });
});
describe("website editing actions", () => {
  it("validates drafts before writing and preserves the expected revision", async () => {
    expect(
      (
        await saveDraft({
          kind: "site",
          slug: "site",
          payload: { version: 1 },
          expected: null,
        })
      ).ok,
    ).toBe(false);
    expect(rpc).not.toHaveBeenCalled();
    rpc.mockResolvedValue({ data: "revision-two", error: null });
    from.mockReturnValue({
      select: () => ({
        eq: () => ({
          not: () => ({
            maybeSingle: async () => ({ data: { id: "site" }, error: null }),
          }),
          single: async () => ({ data: { id: "document" }, error: null }),
        }),
      }),
    });
    const result = await saveDraft({
      kind: "site",
      slug: "site",
      payload: defaultSite,
      expected: "revision-one",
    });
    expect(result).toMatchObject({
      ok: true,
      revision: "revision-two",
      documentId: "document",
    });
    expect(rpc).toHaveBeenCalledWith(
      "save_content_draft",
      expect.objectContaining({ p_expected: "revision-one" }),
    );
    expect(rpc).not.toHaveBeenCalledWith("publish_content", expect.anything());
  });
  it("reports a concurrent save instead of treating it as successful", async () => {
    rpc.mockResolvedValue({
      data: null,
      error: { message: "CONTENT_CONFLICT" },
    });
    expect(
      await saveDraft({
        kind: "site",
        slug: "site",
        payload: defaultSite,
        expected: null,
      }),
    ).toMatchObject({
      ok: false,
      message: expect.stringContaining("Another editor"),
    });
    expect(revalidate).not.toHaveBeenCalled();
  });
  it("rejects unauthenticated publishing and restoration before any database write", async () => {
    admin.mockRejectedValue(new Error("Admin access required."));
    expect((await publishDraft("doc", "rev")).ok).toBe(false);
    expect((await restoreDraft("doc", "old", "rev")).ok).toBe(false);
    expect(rpc).not.toHaveBeenCalled();
  });
  it("publishes the selected revision and invalidates the shared storefront layout", async () => {
    const doc = { id: "doc", kind: "page", slug: "size-guide" };
    const payload = {
      version: 1,
      title: "Size guide",
      body: "Verified sizing content",
      excerpt: "",
      image: emptyImage,
      seoTitle: "",
      seoDescription: "",
    };
    from.mockImplementation((table: string) => {
      const query = {
        select: () => query,
        eq: () => query,
        single: async () => ({
          data: table === "content_documents" ? doc : { payload },
          error: null,
        }),
      };
      return query;
    });
    rpc.mockResolvedValue({ error: null });
    expect((await publishDraft("doc", "rev")).ok).toBe(true);
    expect(rpc).toHaveBeenCalledWith("publish_content", {
      p_document_id: "doc",
      p_expected: "rev",
    });
    expect(revalidate).toHaveBeenCalledWith("/", "layout");
  });
});
