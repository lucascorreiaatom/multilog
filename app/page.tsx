import Link from "next/link";

const conceitos = [
  { href: "/conceito-1", nome: "Conceito 1", descricao: "Painéis clay sobre o pátio 3D, câmeras e vagas em tempo real" },
];

export default function Inicio() {
  return (
    <main className="flex h-full items-center justify-center p-16">
      <div className="w-full max-w-[480px] rounded-[24px] bg-panel p-24 shadow-clay">
        <p className="text-[12px] leading-16 text-text-3">Portal Multilog</p>
        <h1 className="mt-4 text-[20px] font-semibold leading-28 text-text">Pátio Foz do Iguaçu</h1>
        <ul className="mt-16 flex flex-col gap-8">
          {conceitos.map((c) => (
            <li key={c.href}>
              <Link
                href={c.href}
                className="block rounded-[16px] bg-card px-16 py-12 shadow-card transition-colors hover:bg-card-muted"
              >
                <span className="block text-[14px] font-semibold leading-20 text-text">{c.nome}</span>
                <span className="block text-[13px] leading-20 text-text-2">{c.descricao}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
