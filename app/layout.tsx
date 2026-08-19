import type { Metadata } from "next";
import SiteShell from "./components/SiteShell";
import { SettingsProvider } from "./contexts/SettingsContext";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.rbnbrasil.com.br"),
  title: "RBN | Jornalismo • Informação • Entretenimento",
  description: "Portal de notícias com credibilidade, contexto e cobertura completa do Brasil e do mundo.",
  openGraph: {
    title: "RBN | Jornalismo • Informação • Entretenimento",
    description: "Portal de notícias com credibilidade, contexto e cobertura completa do Brasil e do mundo.",
    type: "website",
    url: "https://www.rbnbrasil.com.br",
    images: [
      {
        url: "https://www.rbnbrasil.com.br/logo-oficial.png",
        width: 1200,
        height: 630,
        alt: "RBN",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "RBN | Rede Brasileira de Notícias",
    description: "Portal de notícias com credibilidade, contexto e cobertura completa do Brasil e do mundo.",
    images: ["https://www.rbnbrasil.com.br/logo-oficial.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className="scroll-smooth"
    >
      <body className="min-h-full flex flex-col bg-white text-gray-900 antialiased">
        <SettingsProvider>
          <SiteShell>{children}</SiteShell>
        </SettingsProvider>
      </body>
    </html>
  );
}
