import type { Metadata } from "next";
import { kumbh, roboto } from '../lib/fonts'
import "./globals.css";

export const metadata: Metadata = {
  title: "Mint Leaf",
  description: "FFXIV Rotation Builder",
  icons: "/favicon.ico",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={roboto.className + ' ' + kumbh.className}>
        {children}
      </body>
    </html>
  );
}
