import BookForm from "./BookForm";
import { Suspense } from "react";

export const metadata = {
  title: "Book a Call | The LeadFlow Pro",
  description:
    "Thirty minutes. Your next three moves. Tell me about your business and what you are paying to rent your platform.",
};

export default function BookPage() {
  return (
    <section className="mx-auto max-w-2xl px-4 pb-24 pt-[22px] sm:pt-8">
      <h1 className="text-4xl font-black text-[var(--heading)]">Book your call</h1>
      <p className="mt-3 text-lg text-[var(--text)]">
        Tell me where your business is and what you are renting right now. I will
        come to the call with a plan: what to build, what it replaces, and what it
        saves you. Thirty minutes and you will know your next three moves.
      </p>
      <div className="card mt-8">
        <Suspense>
          <BookForm />
        </Suspense>
      </div>
    </section>
  );
}
