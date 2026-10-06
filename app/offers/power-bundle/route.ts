// The retired managed social/content offer continues at the current content
// service. A fixed destination never forwards old product or personal inputs.
export function GET() {
  return new Response(null, {
    status: 308,
    headers: {
      Location: "https://www.theleadflowpro.com/agency/content",
      "Referrer-Policy": "no-referrer",
    },
  });
}
