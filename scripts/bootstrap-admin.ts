import { prisma } from "../src/lib/prisma";
import { hashPassword } from "../src/lib/password";

const email = (process.env.ADMIN_BOOTSTRAP_EMAIL || "Hello@TheLeadFlowPro.com").trim().toLowerCase();
const password = process.env.ADMIN_BOOTSTRAP_PASSWORD;

async function main() {
  if (!password || password.length < 12) {
    throw new Error("Set ADMIN_BOOTSTRAP_PASSWORD to the admin password before running this script.");
  }

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.upsert({
    where: { email },
    create: {
      email,
      name: "Ryan Nichols",
      passwordHash,
      emailVerified: new Date(),
      plan: "pro",
      businessName: "The LeadFlow Pro",
      industry: "business systems and social media",
      timezone: "America/Chicago",
    },
    update: {
      name: "Ryan Nichols",
      passwordHash,
      emailVerified: new Date(),
      plan: "pro",
      businessName: "The LeadFlow Pro",
      industry: "business systems and social media",
      timezone: "America/Chicago",
    },
  });

  console.log(`Admin user ready: ${user.email}`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
