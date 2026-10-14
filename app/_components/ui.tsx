"use client";
// Primitivas visuais (clay). Todas as medidas em px do grid de 4 (spacing = 1px).
import { useCallback, type ButtonHTMLAttributes, type ReactNode } from "react";

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

/** `pill`: superfícies pequenas (barras, blocos recolhidos) acompanham o formato dos botões */
export function Painel({ className, children, pill = false, ...rest }: { className?: string; children: ReactNode; pill?: boolean } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cx("vidro bg-panel shadow-clay", pill ? "rounded-full" : "rounded-[24px]", className)} {...rest}>
      {children}
    </div>
  );
}

export function Cartao({ className, children, ...rest }: { className?: string; children: ReactNode } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cx("rounded-[16px] bg-card shadow-card", className)} {...rest}>
      {children}
    </div>
  );
}

export function Ponto({ cor, tamanho = 10, redondo = false, pulso = false }: { cor: string; tamanho?: number; redondo?: boolean; pulso?: boolean }) {
  return <span aria-hidden className={cx("inline-block shrink-0", pulso && "pulso-vivo")} style={{ width: tamanho, height: tamanho, background: cor, borderRadius: redondo ? tamanho : 2 }} />;
}

export function Chip({ children, className, tom = "neutro" }: { children: ReactNode; className?: string; tom?: "neutro" | "card" | "escuro" | "acento" }) {
  const tons = {
    neutro: "bg-chip text-text",
    card: "bg-card text-text shadow-card",
    escuro: "flutuante bg-[rgb(17_41_75/0.72)] text-white backdrop-blur-[8px]",
    acento: "bg-accent text-accent-ink",
  };
  return <span className={cx("inline-flex h-28 items-center gap-8 rounded-[14px] px-12 text-[12px] font-semibold leading-16", tons[tom], className)}>{children}</span>;
}

/** botão de ícone dentro do container do cabeçalho: sem fundo próprio, só o hover */
export const ICONE_CABECALHO = "flex size-40 shrink-0 items-center justify-center rounded-full text-text outline-none transition-colors hover:bg-chip focus-visible:ring-2 focus-visible:ring-accent";

/** dois tamanhos de botão na interface: 48 px nos controles do mapa, 40 px em ações dentro de cartões e no cabeçalho */
export function BotaoIcone({ children, className, rotulo, ativo, principal, compacto, ...rest }: { children: ReactNode; rotulo: string; ativo?: boolean; principal?: boolean; compacto?: boolean } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      aria-label={rotulo}
      title={rotulo}
      className={cx(
        compacto ? "size-40" : "size-48",
        "inline-flex items-center justify-center rounded-full transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-40",
        principal ? "bg-accent text-accent-ink hover:bg-accent-hover" : ativo ? "bg-accent text-accent-ink" : "bg-card text-text shadow-card hover:bg-card-muted",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

export function Barra({ valor, cor = "var(--accent)", altura = 6 }: { valor: number; cor?: string; altura?: number }) {
  return (
    <div className="w-full overflow-hidden rounded-full bg-chip" style={{ height: altura }}>
      <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${Math.max(0, Math.min(100, valor))}%`, background: cor }} />
    </div>
  );
}

export function Titulo({ children, className }: { children: ReactNode; className?: string }) {
  return <h2 className={cx("text-[16px] font-semibold leading-24 tracking-[-0.01em] text-text", className)}>{children}</h2>;
}

/**
 * Rolagem sem barra visível: esvanece as bordas (classe .rolagem) só quando há conteúdo além delas.
 * Marca data-topo / data-base no elemento direto no DOM, sem re-render.
 */
export function useRolagem<T extends HTMLElement>() {
  return useCallback((el: T | null) => {
    if (!el) return;
    const medir = () => {
      el.toggleAttribute("data-topo", el.scrollTop > 1);
      el.toggleAttribute("data-base", el.scrollTop + el.clientHeight < el.scrollHeight - 1);
    };
    const tamanho = new ResizeObserver(medir);
    const observarFilhos = () => { tamanho.disconnect(); tamanho.observe(el); for (const f of el.children) tamanho.observe(f); medir(); };
    const filhos = new MutationObserver(observarFilhos);
    filhos.observe(el, { childList: true });
    observarFilhos();
    el.addEventListener("scroll", medir, { passive: true });
    return () => { tamanho.disconnect(); filhos.disconnect(); el.removeEventListener("scroll", medir); };
  }, []);
}

export function AreaRolagem({ className, children, ...rest }: { className?: string; children: ReactNode } & React.HTMLAttributes<HTMLDivElement>) {
  const ref = useRolagem<HTMLDivElement>();
  return (
    <div ref={ref} className={cx("rolagem overflow-y-auto", className)} {...rest}>
      {children}
    </div>
  );
}
