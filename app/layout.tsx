import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tax Calculator Bd - BDTaxCalculator Web",
  description:
    "BDTaxCalculator Android app-inspired web version for Bangladesh income tax, salary breakdown, rebate, and audit check.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
