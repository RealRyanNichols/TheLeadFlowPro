import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import PurchasePing from "@/components/PurchasePing";
import styles from "../academy.module.css";

export const dynamic = "force-dynamic";

export default async function AcademyWelcomePage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id: sessionId } = await searchParams;
  return (
    <main className={styles.page}>
      <PurchasePing sessionId={sessionId} />
      <section className={styles.welcome}>
        <div className={styles.welcomeCard}>
          <CheckCircle2 aria-hidden="true" />
          <p className={styles.eyebrow}>Enrollment received</p>
          <h1>Your Operator Academy access is being connected.</h1>
          <p>Create or open your login with the exact email used at checkout. Stripe confirmation unlocks all ten courses in the training library.</p>
          <Link href="/login?mode=signup&next=/training">Open my training login <ArrowRight aria-hidden="true" /></Link>
        </div>
      </section>
    </main>
  );
}
