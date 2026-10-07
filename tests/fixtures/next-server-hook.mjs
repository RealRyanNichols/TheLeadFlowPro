// Test-only Node resolution for Next's CommonJS server entry. Production is unchanged.
export function resolve(specifier, context, next) {
  return next(specifier === "next/server" ? "next/server.js" : specifier, context);
}
