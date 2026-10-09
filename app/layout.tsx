import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Pátio Foz do Iguaçu · Multilog",
  description: "Mapa interativo de vagas, gates e câmeras do Porto Seco de Foz do Iguaçu.",
};

export const viewport: Viewport = {
  themeColor: "#e4e7eb",
};

// Aplica o tema salvo antes da pintura, sem flash (guia preventing-flash-before-hydration).
const temaInicial = `try{var t=localStorage.getItem("tema");if(t!=="claro"&&t!=="escuro"){t=matchMedia("(prefers-color-scheme: dark)").matches?"escuro":"claro"}document.documentElement.dataset.theme=t==="escuro"?"dark":"light"}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${inter.variable} h-full`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: temaInicial }} />
      </head>
      <body className="h-full">{children}</body>
    </html>
  );
}
