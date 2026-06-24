"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getActionErrorMessage, logActionError } from "@/lib/actionErrors";
import { createServerSupabaseClient } from "@/lib/supabaseServer";

const policySchema = z.object({
  title: z.string().trim().min(2, "Title is required."),
  slug: z
    .string()
    .trim()
    .min(2, "Slug is required.")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use a URL-safe slug."),
  content: z.string().trim().min(1, "Content is required."),
});

export type PolicyActionState = {
  ok: boolean;
  message: string;
};

const defaultState: PolicyActionState = {
  ok: false,
  message: "",
};

export async function createPolicyAction(
  prevState: PolicyActionState = defaultState,
  formData: FormData,
): Promise<PolicyActionState> {
  void prevState;
  const parsed = policySchema.safeParse({
    title: formData.get("title"),
    slug: formData.get("slug"),
    content: formData.get("content"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message || "Invalid policy page.",
    };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("policy_pages").insert({
    title: parsed.data.title,
    slug: parsed.data.slug,
    content: parsed.data.content,
    status: "published",
    published_at: new Date().toISOString(),
  });

  if (error) {
    logActionError("createPolicyAction", error);
    return {
      ok: false,
      message: getActionErrorMessage("create policy page"),
    };
  }

  revalidatePolicyPaths(parsed.data.slug);
  revalidatePath("/admin/policies");
  return {
    ok: true,
    message: "Policy page created.",
  };
}

export async function updatePolicyAction(
  id: string,
  prevState: PolicyActionState = defaultState,
  formData: FormData,
): Promise<PolicyActionState> {
  void prevState;
  const parsed = policySchema.safeParse({
    title: formData.get("title"),
    slug: formData.get("slug"),
    content: formData.get("content"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message || "Invalid policy page.",
    };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("policy_pages")
    .update({
      title: parsed.data.title,
      slug: parsed.data.slug,
      content: parsed.data.content,
      status: "published",
      published_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    logActionError("updatePolicyAction", error);
    return {
      ok: false,
      message: getActionErrorMessage("update policy page"),
    };
  }

  revalidatePolicyPaths(parsed.data.slug);
  revalidatePath("/admin/policies");
  revalidatePath(`/admin/policies/${id}/edit`);
  return {
    ok: true,
    message: "Policy page updated.",
  };
}

export async function deletePolicyAction(formData: FormData) {
  const id = String(formData.get("id") || "");

  if (!id) {
    return;
  }

  const supabase = await createServerSupabaseClient();
  await supabase.from("policy_pages").delete().eq("id", id);
  revalidatePath("/admin/policies");
  redirect("/admin/policies");
}

function revalidatePolicyPaths(slug: string) {
  revalidatePath(`/${slug}`);
  revalidatePath("/return-policy");
  revalidatePath("/shipping-policy");
  revalidatePath("/privacy-policy");
  revalidatePath("/terms");
}
