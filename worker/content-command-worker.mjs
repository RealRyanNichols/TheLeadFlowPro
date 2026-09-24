const baseUrl = (process.env.CONTENT_COMMAND_BASE_URL || "").replace(/\/$/, "");
const token = process.env.CONTENT_COMMAND_WORKER_TOKEN || "";
const workerId = process.env.CONTENT_COMMAND_WORKER_ID || `droplet-${process.pid}`;
const interval = Math.max(2_000, Number(process.env.CONTENT_COMMAND_POLL_MS || 5_000));

if (!baseUrl || !token) {
  throw new Error("CONTENT_COMMAND_BASE_URL and CONTENT_COMMAND_WORKER_TOKEN are required.");
}

async function tick() {
  try {
    const response = await fetch(`${baseUrl}/api/content-command/worker`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "X-Worker-Id": workerId },
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) console.error(JSON.stringify({ at: new Date().toISOString(), level: "error", ...body }));
    else if (body.processed) console.log(JSON.stringify({ at: new Date().toISOString(), level: "info", ...body }));
  } catch (error) {
    console.error(JSON.stringify({ at: new Date().toISOString(), level: "error", error: String(error) }));
  }
}

console.log(JSON.stringify({ at: new Date().toISOString(), level: "info", event: "worker.started", workerId, interval }));
await tick();
setInterval(tick, interval);
