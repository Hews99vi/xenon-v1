import type { Metadata } from "next";
import { CollectionPage,type CollectionParams } from "@/components/storefront/CollectionPage";
export const metadata:Metadata={title:"Shop the collection | Xenon"};
export default async function Page({searchParams}:{searchParams:Promise<CollectionParams>}){return <CollectionPage params={await searchParams}/>;}
