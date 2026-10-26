import { canonicalPageSlug } from "@/lib/content/legacy";
import { redirect, notFound } from "next/navigation";
import { requireAdmin } from "@/lib/content/server";
export default async function Page({params}:{params:Promise<{id:string}>}){const {id}=await params;const {db}=await requireAdmin();const {data}=await db.from("policy_pages").select("slug").eq("id",id).maybeSingle();if(!data)notFound();redirect(`/admin/website?key=${encodeURIComponent("page:"+canonicalPageSlug(data.slug))}`);}
