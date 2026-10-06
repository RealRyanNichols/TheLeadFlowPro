export const OWNER_VIEWS = ["today", "work", "marketing", "plan", "library", "connections", "tools", "leads", "clients"] as const;
export function safeOwnerView(value: string | null | undefined): string {
  return OWNER_VIEWS.includes(value as typeof OWNER_VIEWS[number]) ? value! : "today";
}
