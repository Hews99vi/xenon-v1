import { Suspense } from "react";
import { LoginForm } from "./LoginForm";

export default function AdminLoginPage() {
  return (
    <section className="min-h-screen bg-[#f7f7f6]">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl items-center justify-center px-6 py-16 sm:px-8">
        <Suspense
          fallback={
            <div className="w-full max-w-md border border-black bg-white p-8 text-sm uppercase tracking-[0.22em]">
              Loading admin access
            </div>
          }
        >
          <LoginForm />
        </Suspense>
      </div>
    </section>
  );
}
