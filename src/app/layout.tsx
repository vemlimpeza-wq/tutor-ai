import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tutor de Inglês IA - Converse com Inteligência Artificial",
  description: "Aprenda inglês de forma acelerada com tutores de IA. Pratique conversação, receba correções gramaticais instantâneas e avalie sua pronúncia.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>
        {children}
      </body>
    </html>
  );
}
