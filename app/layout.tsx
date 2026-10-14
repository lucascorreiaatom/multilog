import type { Metadata, Viewport } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";

// Montserrat: fonte institucional do Brand Book (pág. 12). Segoe UI entra como fallback de sistema em globals.css
const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Pátio Foz do Iguaçu · Multilog",
  description: "Mapa interativo de vagas, gates e câmeras do Porto Seco de Foz do Iguaçu.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#e3e8ef" },
    { media: "(prefers-color-scheme: dark)", color: "#0a1628" },
  ],
};

// Aplica o tema salvo antes da pintura, sem flash (guia preventing-flash-before-hydration).
const temaInicial = `try{var t=localStorage.getItem("tema");if(t!=="claro"&&t!=="escuro"){t=matchMedia("(prefers-color-scheme: dark)").matches?"escuro":"claro"}document.documentElement.dataset.theme=t==="escuro"?"dark":"light"}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${montserrat.variable} h-full`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: temaInicial }} />
      </head>
      <body className="h-full">{children}</body>
    </html>
  );
}
