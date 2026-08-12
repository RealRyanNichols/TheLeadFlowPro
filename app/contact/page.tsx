import ContactForm from "./ContactForm";

export const metadata = {
  title: "Contact | The LeadFlow Pro",
  description: "Send a message. I read every one myself.",
};

export default function ContactPage() {
  return (
    <section className="mx-auto max-w-2xl px-4 pb-24 pt-[22px] sm:pt-8">
      <h1 className="text-4xl font-black text-white">Send a message</h1>
      <p className="mt-3 text-lg text-slate-300">
        Question about a build, an event, the training, or whether this fits your
        business? Ask it straight. I read every message myself.
      </p>
      <div className="card mt-8">
        <ContactForm />
      </div>
    </section>
  );
}
