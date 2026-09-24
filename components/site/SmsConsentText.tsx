import { PRIVACY_HREF, SMS_TERMS_HREF, smsConsentLabel } from "@/lib/site/smsConsent";

/** The label text for an sms_consent checkbox. Links open in a new tab so a half filled form is never lost. */
export function SmsConsentText({ topic }: { topic?: string }) {
  return (
    <>
      {smsConsentLabel(topic)} See the{" "}
      <a href={SMS_TERMS_HREF} target="_blank" rel="noopener noreferrer">
        text message terms
      </a>{" "}
      and{" "}
      <a href={PRIVACY_HREF} target="_blank" rel="noopener noreferrer">
        privacy policy
      </a>
      .
    </>
  );
}
