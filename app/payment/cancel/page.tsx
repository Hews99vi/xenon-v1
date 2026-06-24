import Link from "next/link";

type PaymentCancelPageProps = {
  searchParams: Promise<{
    order?: string;
  }>;
};

export default async function PaymentCancelPage({
  searchParams,
}: PaymentCancelPageProps) {
  const { order } = await searchParams;

  return (
    <section className="bg-background">
      <div className="mx-auto flex min-h-[calc(100vh-10rem)] w-full max-w-3xl items-center px-6 py-16 sm:px-8">
        <div className="w-full border border-black bg-white p-8 text-center shadow-[12px_12px_0_#0a0a0a]">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.32em] text-neutral-600">
            Payment cancelled
          </p>
          <h1 className="text-4xl font-semibold text-black">No charge was made</h1>
          <p className="mt-5 text-sm leading-7 text-neutral-700">
            You cancelled the PayHere payment flow. Your order remains pending
            until payment is completed or the order is cancelled.
          </p>
          {order ? (
            <p className="mt-6 border border-black bg-neutral-100 px-4 py-3 text-sm font-semibold">
              Order number: {order}
            </p>
          ) : null}
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/checkout"
              className="inline-flex justify-center border border-black bg-black px-6 py-4 text-xs font-semibold uppercase tracking-[0.22em] text-white"
            >
              Return to checkout
            </Link>
            <Link
              href="/products"
              className="inline-flex justify-center border border-black bg-white px-6 py-4 text-xs font-semibold uppercase tracking-[0.22em] text-black"
            >
              Continue shopping
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
