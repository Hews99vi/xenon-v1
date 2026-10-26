import type { Metadata } from "next";
import { CollectionPage,type CollectionParams } from "@/components/storefront/CollectionPage";
import { getCategoryBySlug } from "@/lib/storefront";
type Props={params:Promise<{slug:string}>;searchParams:Promise<CollectionParams>};
export async function generateMetadata({params}:Props):Promise<Metadata>{const c=await getCategoryBySlug((await params).slug);return {title:c?`${c.name} | Xenon`:"Category | Xenon"};}
export default async function Page({params,searchParams}:Props){return <CollectionPage params={await searchParams} categorySlug={(await params).slug}/>;}
