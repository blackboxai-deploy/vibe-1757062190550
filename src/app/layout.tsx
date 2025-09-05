import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Plateforme d'Évaluation IA",
  description: "Outils d'évaluation automatique pour professeurs - Code Analysis, Questions Generation, QCM Generator",
  keywords: ["évaluation", "IA", "code", "QCM", "professeur", "éducation"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className={`${inter.className} antialiased`}>
        {children}
      </body>
    </html>
  );
}