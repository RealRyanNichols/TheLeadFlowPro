const EXPECTED_TOKEN_HASH = "a867f141330a12ab4bda48a6c347f3fc4032c60993f68a08ef1cf51e2fca9525";
const EXPECTED_ASSET_HASH = "c6c0b460b4dd71383e5601f53275066e2f839764ff417f270fb2804ef103c651";
const EXPECTED_SIZE = 2523906;
const EXPIRES = 1788570305;
const ORIGIN = "https://hpzpwfymwfgwspaixrxi.supabase.co";
const OBJECT_PATH = "/storage/v1/object/book-downloads/free-tool-flywheel/v1/free-tool-flywheel-toolkit.zip";
async function hash(bytes: Uint8Array) { return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))).map(x=>x.toString(16).padStart(2,"0")).join(""); }
Deno.serve(async (req: Request) => {
  if (Date.now() / 1000 > EXPIRES) return new Response("Expired", {status:410});
  if (req.method !== "POST") return new Response("Method not allowed", {status:405});
  const token = req.headers.get("x-book-release-token") || "";
  if (token.length !== 43 || await hash(new TextEncoder().encode(token)) !== EXPECTED_TOKEN_HASH) return new Response("Unauthorized", {status:401});
  if (req.headers.get("content-type") !== "application/zip" || Number(req.headers.get("content-length")) !== EXPECTED_SIZE) return new Response("Invalid asset", {status:400});
  const asset = new Uint8Array(await req.arrayBuffer());
  if (asset.length !== EXPECTED_SIZE || await hash(asset) !== EXPECTED_ASSET_HASH) return new Response("Invalid asset", {status:400});
  const secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!secret || Deno.env.get("SUPABASE_URL") !== ORIGIN) return new Response("Not configured", {status:503});
  const headers = {Authorization: `Bearer ${secret}`, apikey:secret, "Content-Type":"application/zip", "x-upsert":"false"};
  const stored = await fetch(ORIGIN + OBJECT_PATH, {method:"POST", headers, body:asset});
  if (!stored.ok) return new Response(JSON.stringify({ok:false,stage:"storage",status:stored.status}), {status:502,headers:{"Content-Type":"application/json"}});
  const verify = await fetch(ORIGIN + OBJECT_PATH, {headers:{Authorization:`Bearer ${secret}`,apikey:secret}});
  if (!verify.ok) return new Response("Verification unavailable", {status:502});
  const saved = new Uint8Array(await verify.arrayBuffer());
  const savedHash = await hash(saved);
  if (saved.length !== EXPECTED_SIZE || savedHash !== EXPECTED_ASSET_HASH) return new Response("Verification failed", {status:502});
  return Response.json({ok:true,size:saved.length,sha256:savedHash});
});
