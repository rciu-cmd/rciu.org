/**
 * Prefix a public-asset path with the deployment base path.
 *
 * On GitHub Pages (project site) the app is served from a subpath,
 * which Next.js handles for <Link> navigation automatically via
 * `basePath`, but NOT for next/image `src` values or plain <a href>
 * file links. Route any reference to files in /public through this
 * helper. NEXT_PUBLIC_BASE_PATH is inlined at build time; it's empty
 * for local dev and for the custom domain (rciu.org).
 */
export function asset(path: string): string {
  return `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}${path}`;
}
