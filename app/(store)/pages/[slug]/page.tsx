import { PolicyPage, generatePolicyMetadata } from "../../PolicyPage";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return generatePolicyMetadata({ slug, path: `/pages/${slug}` });
}
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <PolicyPage slug={slug} path={`/pages/${slug}`} />;
}
