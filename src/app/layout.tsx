import type { Metadata } from "next";
import '@fontsource/roboto/400.css'
import '@fontsource/roboto/700.css'
import '@fontsource/kumbh-sans/500.css'
import '@fontsource/kumbh-sans/700.css'
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
      <body>
        {children}
      </body>
    </html>
  );
}
