import Link from "next/link";

type CheckoutSuccessPageProps = {
  searchParams: Promise<{
    order?: string;
  }>;
};

export default async function CheckoutSuccessPage({
  searchParams,
}: CheckoutSuccessPageProps) {
  const { order } = await searchParams;

  return (
    <section className="bg-background">
      <div className="mx-auto flex min-h-[calc(100vh-10rem)] w-full max-w-3xl items-center px-6 py-16 sm:px-8">
        <div className="w-full border border-black bg-white p-8 text-center shadow-[12px_12px_0_#0a0a0a]">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.32em] text-neutral-600">
            Order received
          </p>
          <h1 className="text-4xl font-semibold text-black">Thank you</h1>
          <p className="mt-5 text-sm leading-7 text-neutral-700">
            Your order has been created. We will contact you with the next
            steps.
          </p>
          {order ? (
            <p className="mt-6 border border-black bg-neutral-100 px-4 py-3 text-sm font-semibold">
              Order number: {order}
            </p>
          ) : null}
          <Link
            href="/products"
            className="mt-8 inline-flex border border-black bg-black px-6 py-4 text-xs font-semibold uppercase tracking-[0.22em] text-white"
          >
            Continue shopping
          </Link>
        </div>
      </div>
    </section>
  );
}
