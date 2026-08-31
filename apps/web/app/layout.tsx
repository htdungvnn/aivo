/**
 * Root Layout - HTML Shell
 * 
 * This minimal root layout provides the HTML structure.
 * The locale-specific layout in [locale]/layout.tsx handles
 * i18n providers and metadata.
 */

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
