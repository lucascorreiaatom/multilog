// Formatação pt-BR (sem travessões; separador visual "·").
const nf = new Intl.NumberFormat("pt-BR");

export const numero = (n: number) => nf.format(n);

export const pct = (parte: number, total: number) => (total ? Math.round((parte / total) * 100) : 0);

const dois = (n: number) => String(n).padStart(2, "0");

export function hora(ms: number) {
  const d = new Date(ms);
  return `${dois(d.getHours())}:${dois(d.getMinutes())}:${dois(d.getSeconds())}`;
}

export function horaCurta(ms: number) {
  const d = new Date(ms);
  return `${dois(d.getHours())}:${dois(d.getMinutes())}`;
}

export function dataHora(ms: number) {
  const d = new Date(ms);
  return `${dois(d.getDate())}/${dois(d.getMonth() + 1)}/${d.getFullYear()} ${hora(ms)}`;
}

export function duracao(ms: number) {
  const min = Math.max(0, Math.floor(ms / 60000));
  const h = Math.floor(min / 60), m = min % 60;
  if (h >= 24) return `${Math.floor(h / 24)} d ${h % 24} h`;
  if (h > 0) return `${h} h ${dois(m)} min`;
  return `${m} min`;
}

export function pesoKg(kg: number) {
  return `${nf.format(kg)} kg`;
}
