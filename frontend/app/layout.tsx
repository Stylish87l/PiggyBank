import type { Metadata, Viewport } from "next";
import { Providers } from "./providers";
import "./globals.css";
import "@rainbow-me/rainbowkit/styles.css";

export const metadata: Metadata = {
  title: "PiggyBank • Time-Locked Vault",
  description: "Secure. Lock. Grow. Protect your assets from short-term impulses.",
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "PiggyBank",
  },
  openGraph: {
    title: "PiggyBank • Time-Locked Vault",
    description: "A time-locked savings vault for disciplined wealth building.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f3ff" },
    { media: "(prefers-color-scheme: dark)", color: "#080613" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Mobile-Safe Dark mode script — wraps API features inside defensive feature flags */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var isDark = true; // Fallback default value matching your dark UI theme
                  var hasLocalStorage = typeof window !== 'undefined' && window.localStorage;
                  
                  if (hasLocalStorage) {
                    var stored = localStorage.getItem('piggybank-theme');
                    if (stored) {
                      isDark = stored === 'dark';
                    } else if (window.matchMedia) {
                      isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                    }
                  }
                  
                  if (isDark) {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch(e) {
                  // Absolute fallback to ensure layout doesn't break if API access is restricted
                  document.documentElement.classList.add('dark');
                }
              })();
            `,
          }}
        />
      </head>
      <body className="font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}