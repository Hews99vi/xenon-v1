import { generatePolicyMetadata, PolicyPage } from "../PolicyPage";

export const revalidate = 300;

export function generateMetadata() {
  return generatePolicyMetadata({
    slug: "return-policy",
    path: "/return-policy",
  });
}

export default function ReturnPolicyPage() {
  return <PolicyPage slug="return-policy" path="/return-policy" />;
}
