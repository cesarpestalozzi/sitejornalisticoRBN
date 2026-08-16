import type { Metadata } from "next";
import SiteShell from "./components/SiteShell";
import { SettingsProvider } from "./contexts/SettingsContext";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://pz-news-xi.vercel.app"),
  title: "AO PONTO BR | Notícias em Tempo Real",
  description: "Portal de notícias profissional com credibilidade, tecnologia e cobertura completa de todos os temas principais.",
  openGraph: {
    title: "AO PONTO BR | Notícias em Tempo Real",
    description: "Portal de notícias profissional com credibilidade, tecnologia e cobertura completa de todos os temas principais.",
    type: "website",
    url: "/",
    images: [
      {
        url: "/logo-oficial.png",
        width: 1200,
        height: 630,
        alt: "AO PONTO BR",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AO PONTO BR | Notícias em Tempo Real",
    description: "Portal de notícias profissional com credibilidade, tecnologia e cobertura completa de todos os temas principais.",
    images: ["/logo-oficial.png"],
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
