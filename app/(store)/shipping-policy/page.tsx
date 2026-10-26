import { generatePolicyMetadata, PolicyPage } from "../PolicyPage";

export const revalidate = 300;

export function generateMetadata() {
  return generatePolicyMetadata({
    slug: "shipping-policy",
    path: "/shipping-policy",
  });
}

export default function ShippingPolicyPage() {
  return <PolicyPage slug="shipping-policy" path="/shipping-policy" />;
}
