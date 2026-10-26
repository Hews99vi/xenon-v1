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
        <div className="w-full bg-[var(--x-smoke)] px-6 py-12 text-center sm:px-12">
          <h1 className="text-4xl font-normal tracking-tight text-black">Thank you</h1>
          <p className="mt-5 text-sm leading-7 text-neutral-700">
            Your order has been received. Pay on delivery; our team will contact you before dispatch.
          </p>
          {order ? (
            <p className="mt-6 border-y border-neutral-300 px-4 py-4 text-sm font-medium">
              Order number: {order}
            </p>
          ) : null}
          <Link
            href="/products"
            className="store-button mt-8"
          >
            Continue shopping
          </Link>
        </div>
      </div>
    </section>
  );
}
