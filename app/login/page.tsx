import LoginForm from "./LoginForm";
import { Suspense } from "react";

export const metadata = { title: "Log In | The LeadFlow Pro" };

export default function LoginPage() {
  return (
    <section className="mx-auto max-w-md px-4 py-20">
      <h1 className="text-center text-3xl font-black text-white">
        The LeadFlow <span className="text-flow-400">Pro</span>
      </h1>
      <p className="mt-2 text-center text-slate-400">
        Log in or create your account.
      </p>
      <div className="card mt-8">
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </section>
  );
}
