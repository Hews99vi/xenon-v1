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
        <div className="w-full bg-[var(--x-smoke)] px-6 py-12 text-center sm:px-12">
          <h1 className="text-4xl font-normal tracking-tight text-black">Checkout not completed</h1>
          <p className="mt-5 text-sm leading-7 text-neutral-700">
            Return to checkout to place your order and pay on delivery.
          </p>
          {order ? (
            <p className="mt-6 border-y border-neutral-300 px-4 py-4 text-sm font-medium">
              Order number: {order}
            </p>
          ) : null}
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/checkout"
              className="store-button"
            >
              Return to checkout
            </Link>
            <Link
              href="/products"
              className="admin-secondary"
            >
              Continue shopping
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
