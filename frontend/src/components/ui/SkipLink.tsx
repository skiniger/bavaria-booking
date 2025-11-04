/**
 * Skip link for keyboard navigation accessibility
 * Allows users to skip directly to main content
 */
export default function SkipLink() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-bavaria-blue focus:text-white focus:rounded-lg focus:shadow-lg"
    >
      Zum Hauptinhalt springen
    </a>
  );
}
