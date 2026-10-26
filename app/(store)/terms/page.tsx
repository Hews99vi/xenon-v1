import { generatePolicyMetadata, PolicyPage } from "../PolicyPage";

export const revalidate = 300;

export function generateMetadata() {
  return generatePolicyMetadata({
    slug: "terms",
    path: "/terms",
  });
}

export default function TermsPage() {
  return <PolicyPage slug="terms" path="/terms" />;
}
