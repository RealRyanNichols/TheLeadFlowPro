export default function SignOutButton({
  className = "text-sm text-[var(--muted)] hover:text-[var(--heading)]",
}: {
  className?: string;
}) {
  return (
    <form action="/auth/signout" method="post">
      <button type="submit" className={className}>
        Sign out
      </button>
    </form>
  );
}
