import { PolicyPage, generatePolicyMetadata } from "../PolicyPage";
export function generateMetadata() {
  return generatePolicyMetadata({ slug: "size-guide", path: "/size-guide" });
}
export default function Page() {
  return <PolicyPage slug="size-guide" path="/size-guide" />;
}
