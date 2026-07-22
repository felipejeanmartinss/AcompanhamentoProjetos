import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "MeuMoney", template: "%s | MeuMoney" },
  description: "Gestão financeira pessoal e profissional com clareza.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icons/icon.svg" },
};

export const viewport: Viewport = { themeColor: "#173f38" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
