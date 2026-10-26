import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { absoluteUrl } from "@/lib/seo";
import { getPolicyBySlug, renderPolicyMarkdown } from "@/lib/policies";

type PolicyPageProps = {
  slug: string;
  path: string;
};

export async function generatePolicyMetadata({
  slug,
  path,
}: PolicyPageProps): Promise<Metadata> {
  const policy = await getPolicyBySlug(slug);

  if (!policy) {
    return {};
  }

  return {
    title: policy.seoTitle || `${policy.title} | Xenon`,
    description:
      policy.seoDescription || `${policy.title} for Xenon customers.`,
    alternates: {
      canonical: absoluteUrl(path),
    },
    openGraph: {
      title: policy.seoTitle || `${policy.title} | Xenon`,
      description:
        policy.seoDescription || `${policy.title} for Xenon customers.`,
      url: absoluteUrl(path),
      type: "website",
    },
  };
}

export async function PolicyPage({ slug }: PolicyPageProps) {
  const policy = await getPolicyBySlug(slug);

  if (!policy) {
    notFound();
  }

  const html = await renderPolicyMarkdown(policy.content);

  return (
    <article className="bg-background">
      <div className="x-container mx-auto max-w-4xl py-12 sm:py-16">
        <header className="border-b border-neutral-200 pb-8">
          <h1 className="text-4xl font-normal leading-tight tracking-[-0.035em] text-black sm:text-5xl">
            {policy.title}
          </h1>
          <p className="mt-5 text-sm text-neutral-600">
            Updated{" "}
            {new Intl.DateTimeFormat("en-LK", {
              dateStyle: "medium",
            }).format(new Date(policy.updatedAt))}
          </p>
        </header>

        <div
          className="markdown-content mt-8"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </article>
  );
}
