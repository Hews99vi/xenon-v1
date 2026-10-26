import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  maybeSingle: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  revalidatePath: vi.fn(),
}));
vi.mock("@/lib/content/server", () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/actionErrors", () => ({ logActionError: vi.fn(), getActionErrorMessage: () => "Could not save." }));

const id = "11111111-1111-4111-8111-111111111111";
function data(fields: Record<string, string>) {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) form.set(key, value);
  return form;
}

beforeEach(() => {
  vi.resetAllMocks();
  const query = {
    select: vi.fn(() => query), eq: vi.fn(() => query), neq: vi.fn(() => query),
    ilike: vi.fn(() => query), is: vi.fn(() => query),
    update: mocks.update.mockImplementation(() => query),
    delete: mocks.remove.mockImplementation(() => query),
    maybeSingle: mocks.maybeSingle,
  };
  mocks.requireAdmin.mockResolvedValue({ db: { from: vi.fn(() => query) } });
  mocks.maybeSingle.mockResolvedValue({ data: { id }, error: null });
});

describe("operational mutation feedback", () => {
  it("rejects malformed promotion IDs before authentication or mutation", async () => {
    const { togglePromotionAction } = await import("@/app/admin/promotions/actions");
    expect(await togglePromotionAction(data({ id: "broken" }))).toMatchObject({ ok: false });
    expect(mocks.requireAdmin).not.toHaveBeenCalled();
  });

  it("reports a failed promotion update without a success or invalidation", async () => {
    mocks.maybeSingle.mockResolvedValue({ data: null, error: { message: "database unavailable" } });
    const { togglePromotionAction } = await import("@/app/admin/promotions/actions");
    expect(await togglePromotionAction(data({ id, isActive: "true" }))).toMatchObject({ ok: false });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("rejects a deletion after admin access expires", async () => {
    mocks.requireAdmin.mockRejectedValue(new Error("Admin access required."));
    const { deletePromotionAction } = await import("@/app/admin/promotions/actions");
    expect(await deletePromotionAction(data({ id }))).toMatchObject({ ok: false });
    expect(mocks.remove).not.toHaveBeenCalled();
  });

  it("does not claim success when a delivery zone no longer exists", async () => {
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null });
    const { deleteDeliveryZoneAction } = await import("@/app/admin/delivery-zones/actions");
    expect(await deleteDeliveryZoneAction(data({ id }))).toMatchObject({ ok: false });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("keeps a duplicate delivery-zone edit from writing", async () => {
    const { updateDeliveryZoneAction } = await import("@/app/admin/delivery-zones/actions");
    const result = await updateDeliveryZoneAction(data({ id, district: "Colombo", city: "", deliveryFee: "250" }));
    expect(result).toMatchObject({ ok: false, message: expect.stringContaining("already exists") });
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("normalizes and confirms a saved delivery-zone edit", async () => {
    mocks.maybeSingle.mockResolvedValueOnce({ data: null, error: null }).mockResolvedValueOnce({ data: { id }, error: null });
    const { updateDeliveryZoneAction } = await import("@/app/admin/delivery-zones/actions");
    const result = await updateDeliveryZoneAction(data({ id, district: "  colombo  ", city: "", deliveryFee: "250.50", isActive: "on" }));
    expect(result).toMatchObject({ ok: true });
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ district: "Colombo", city: null, delivery_fee: 250.5, is_active: true }));
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin/delivery-zones");
  });
});
