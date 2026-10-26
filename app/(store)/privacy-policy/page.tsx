import { generatePolicyMetadata, PolicyPage } from "../PolicyPage";

export const revalidate = 300;

export function generateMetadata() {
  return generatePolicyMetadata({
    slug: "privacy-policy",
    path: "/privacy-policy",
  });
}

export default function PrivacyPolicyPage() {
  return <PolicyPage slug="privacy-policy" path="/privacy-policy" />;
}
