import type { Metadata } from "next";
import { Nunito } from "next/font/google";

const nunito = Nunito({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Condominio Campestre La Florida",
  description: "Sistema de gestión para residentes y administradores del Condominio Campestre La Florida.",
  icons: {
    icon: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" style={{ margin: 0, padding: 0 }}>
      <body
        className={`${nunito.variable} antialiased`}
        style={{ margin: 0, padding: 0 }}
      >
        {children}
      </body>
    </html>
  );
}
