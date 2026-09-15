// Skeleton, not a spinner. A spinner says "something is happening"; this says
// "a list of people is about to be here", so the page does not jump when it
// lands. First loading.tsx in the app, deliberately.

export default function SalesLoading() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading the queue">
      <div className="grid grid-cols-4 gap-2">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-[68px] animate-pulse rounded-xl border"
            style={{ borderColor: "var(--line)", background: "var(--fill-2)" }}
          />
        ))}
      </div>
      <div className="space-y-2">
        <div
          className="h-4 w-40 animate-pulse rounded"
          style={{ background: "var(--fill-3)" }}
        />
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-xl border p-3 sm:p-4"
            style={{ borderColor: "var(--line)", background: "var(--panel)" }}
          >
            <div
              className="h-5 w-1/3 animate-pulse rounded"
              style={{ background: "var(--fill-3)" }}
            />
            <div
              className="mt-2 h-3 w-2/3 animate-pulse rounded"
              style={{ background: "var(--fill-2)" }}
            />
            <div className="mt-3 grid grid-cols-3 gap-2">
              {[0, 1, 2].map((j) => (
                <div
                  key={j}
                  className="h-11 animate-pulse rounded-lg"
                  style={{ background: "var(--fill-2)" }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
