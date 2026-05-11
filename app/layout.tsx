import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tech Hive — Software sob medida para o seu negócio",
  description:
    "Transformamos sua ideia em um software sob medida. Nossa IA conversará com você para entender seu projeto.",
  openGraph: {
    title: "Tech Hive",
    description: "Software sob medida para o seu negócio",
    siteName: "Tech Hive",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased bg-hive-bg text-hive-text min-h-screen">
        {children}
      </body>
    </html>
  );
}
