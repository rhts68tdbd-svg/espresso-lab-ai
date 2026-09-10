import "./globals.css";

export const metadata = {
  title: "Espresso Lab",
  description: "KI-gestütztes Espresso Dial-in Lab",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Espresso Lab", statusBarStyle: "default" },
};

export default function RootLayout({ children }) {
  return <html lang="de"><body>{children}</body></html>;
}
