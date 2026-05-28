import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
// Fixed: Stripped the explicit .tsx extension from the import path to match standard module resolution 
import { Providers } from "./providers";

const inter = Inter({ 
  subsets: ["latin"],
  variable: "--font-inter",
  display: 'swap', // Ensures text remains visible during font loading sequences
});

export const metadata: Metadata = {
  title: "PiggyBank • Time-Locked Vault",
  description: "Secure. Lock. Grow. Protect your assets from short-term impulses.",
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      {/* Cleaned up class string configuration for standard font variable usage */}
      <body className={`${inter.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}