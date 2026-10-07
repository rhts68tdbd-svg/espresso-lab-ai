import "./globals.css";

export const metadata = {
  title: "Espresso Lab",
  description: "Von einem neuen Kaffee zu deinem bestätigten Espresso-Rezept.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon-192.png", apple: "/icon-180.png" },
  appleWebApp: {
    capable: true,
    title: "Espresso Lab",
    statusBarStyle: "default",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f2ec" },
    { media: "(prefers-color-scheme: dark)", color: "#171c19" },
  ],
};

export default function RootLayout({ children }) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
