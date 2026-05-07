import { redirect } from "next/navigation";

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default function SignupRedirect({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const params = new URLSearchParams();
  params.set("mode", "signup");
  params.set("callbackUrl", first(searchParams?.callbackUrl) || first(searchParams?.next) || "/dashboard/work");
  redirect(`/login?${params.toString()}`);
}
