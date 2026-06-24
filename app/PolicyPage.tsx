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
    title: `${policy.title} | Xenon`,
    description: `${policy.title} for Xenon customers.`,
    alternates: {
      canonical: absoluteUrl(path),
    },
    openGraph: {
      title: `${policy.title} | Xenon`,
      description: `${policy.title} for Xenon customers.`,
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
      <div className="mx-auto w-full max-w-4xl px-6 py-12 sm:px-8">
        <header className="border-b border-black pb-8">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.32em] text-neutral-600">
            Updated{" "}
            {new Intl.DateTimeFormat("en-LK", {
              dateStyle: "medium",
            }).format(new Date(policy.updatedAt))}
          </p>
          <h1 className="text-4xl font-semibold leading-tight text-black sm:text-5xl">
            {policy.title}
          </h1>
        </header>

        <div
          className="markdown-content mt-8"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </article>
  );
}
