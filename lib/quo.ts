// Quo (OpenPhone) SMS: instant text-back on new leads. Fails closed — if the
// key is missing or the API errors, the lead flow continues untouched.

const QUO_API = "https://api.openphone.com/v1/messages";

export async function sendLeadText(to: string, content: string): Promise<boolean> {
  const key = process.env.QUO_API_KEY;
  const from = process.env.QUO_FROM_NUMBER || "+19035008898";
  if (!key || !to) return false;
  const digits = to.replace(/[^\d+]/g, "");
  const e164 = digits.startsWith("+") ? digits : `+1${digits.replace(/^1/, "")}`;
  if (e164.length < 12) return false;
  try {
    const r = await fetch(QUO_API, {
      method: "POST",
      headers: { Authorization: key, "Content-Type": "application/json" },
      body: JSON.stringify({ content, from, to: [e164] }),
    });
    if (!r.ok) console.error("Quo send failed:", r.status, await r.text().catch(() => ""));
    return r.ok;
  } catch (e) {
    console.error("Quo send error:", e);
    return false;
  }
}
