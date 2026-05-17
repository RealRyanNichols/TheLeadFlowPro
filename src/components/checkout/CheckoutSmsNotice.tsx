import { MessageSquareText, Save } from "lucide-react";
import type { CheckoutSmsResult } from "@/lib/checkout-sms";

export function CheckoutSmsNotice({ sms }: { sms: CheckoutSmsResult }) {
  const sent = sms.status === "sent";
  const skipped = sms.status === "skipped_opt_out";

  return (
    <div className={`mt-5 rounded-2xl border p-4 text-left ${
      sent
        ? "border-cyan-200 bg-cyan-50 text-cyan-950"
        : "border-amber-200 bg-amber-50 text-amber-950"
    }`}>
      <div className="flex items-start gap-3">
        {sent ? (
          <MessageSquareText className="mt-0.5 h-5 w-5 shrink-0 text-cyan-700" />
        ) : (
          <Save className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
        )}
        <div>
          <div className="font-bold">
            {sent
              ? `Receipt text sent to ${sms.toPhone}.`
              : skipped
                ? "Save this page."
                : "Text receipt did not send. Save this page."}
          </div>
          <p className="mt-2 text-sm leading-relaxed">{sms.message}</p>
          {!sent && sms.error ? (
            <p className="mt-2 text-xs opacity-80">SMS fallback reason: {sms.error}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
