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
  themeColor: "#e3e8ef",
};

// Aplica o tema salvo antes da pintura, sem flash (guia preventing-flash-before-hydration).
// Sem escolha salva abre no modo dia, mesmo com o sistema no escuro (o noturno é só pelo botão do cabeçalho).
const temaInicial = `try{document.documentElement.dataset.theme=localStorage.getItem("tema")==="escuro"?"dark":"light"}catch(e){document.documentElement.dataset.theme="light"}`;

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
