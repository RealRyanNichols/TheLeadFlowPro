// This retired URL has a reviewed equivalent. Never carry legacy request,
// product, or personal query values into the public destination or its referrer.
export function GET() {
  return new Response(null, {
    status: 308,
    headers: {
      Location: "https://www.theleadflowpro.com/diagnostic",
      "Referrer-Policy": "no-referrer",
    },
  });
}
