// Cursor de "mão" sobre o que é clicável na cena 3D (prédios, vagas, caminhões). Fora deles a cena mostra a seta e,
// segurando o botão esquerdo ou o direito, a mão fechada (globals.css, .cena-3d).
export const cursorClicavel = {
  onPointerOver: (e: { stopPropagation: () => void }) => { e.stopPropagation(); document.body.setAttribute("data-clicavel-3d", ""); },
  onPointerOut: () => { document.body.removeAttribute("data-clicavel-3d"); },
};
