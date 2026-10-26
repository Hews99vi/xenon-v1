import type { Metadata } from "next";
import { getSiteContent } from "@/lib/content/server";
import { HomeSections } from "@/components/content/HomeSections";
export const metadata: Metadata = {
  title: "Xenon | Clothing & Accessories",
  description:
    "Discover the latest clothing and accessories from Xenon, Sri Lanka.",
};
export default async function Home() {
  const site = await getSiteContent();
  return <>{!site.sections.some(s=>s.enabled&&s.type==="hero")&&<h1 className="sr-only">Xenon clothing and accessories</h1>}<HomeSections sections={site.sections}/></>;
}
