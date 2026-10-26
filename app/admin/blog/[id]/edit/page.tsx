import { redirect, notFound } from "next/navigation";
import { requireAdmin } from "@/lib/content/server";
export default async function Page({params}:{params:Promise<{id:string}>}){const {id}=await params;const {db}=await requireAdmin();const {data}=await db.from("blog_posts").select("slug").eq("id",id).maybeSingle();if(!data)notFound();redirect(`/admin/website?key=${encodeURIComponent("journal:"+data.slug)}`);}
