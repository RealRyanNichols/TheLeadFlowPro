// Shown while a lead record loads, so a slow connection reads as loading and
// never as an empty lead. The shape follows the page: the actions row, the
// name, then the whole story's follow-up and four rows. Nothing here reads data.

const BLOCK = "rounded-lg bg-[var(--fill-3)] motion-safe:animate-pulse";

export default function LeadRecordLoading() {
  return (
    <div className="space-y-4" role="status" aria-live="polite">
      <p className="text-sm font-semibold text-[var(--muted)]">Loading the lead record…</p>
      <div aria-hidden="true" className="space-y-4">
        <div className="flex flex-wrap justify-end gap-2">
          <div className={`${BLOCK} h-11 w-28`} />
          <div className={`${BLOCK} h-11 w-40`} />
        </div>
        <div className={`${BLOCK} h-8 w-56`} />
        <div className="card space-y-3 !p-4">
          <div className={`${BLOCK} h-6 w-40`} />
          <div className={`${BLOCK} h-20 w-full`} />
          <div className="grid grid-cols-2 gap-2">
            <div className={`${BLOCK} col-span-2 h-11`} />
            <div className={`${BLOCK} h-11`} />
            <div className={`${BLOCK} h-11`} />
          </div>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={`${BLOCK} h-14 w-full`} />
          ))}
        </div>
      </div>
    </div>
  );
}
