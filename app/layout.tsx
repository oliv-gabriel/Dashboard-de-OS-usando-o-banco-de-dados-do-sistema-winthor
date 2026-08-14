import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Painel de Separação",
  description: "Acompanhamento das ordens de serviço de separação.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={geistSans.variable + " " + geistMono.variable}>
      <body>
        <div className="app-shell">
          <main>{children}</main>
          <footer className="app-footer">
            Desenvolvido por{" "}
            <a
              href="https://github.com/oliv-gabriel"
              target="_blank"
              rel="noreferrer"
            >
              Gabriel Oliveira
            </a>
          </footer>
        </div>
      </body>
    </html>
  );
}