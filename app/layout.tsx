import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BDTaxCalculator - Bangladesh Income Tax Calculator",
  description:
    "Estimate Bangladesh individual income tax, investment rebate, minimum tax, surcharge, and payable amount.",
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
