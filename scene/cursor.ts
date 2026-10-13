// Cursor de "mão" sobre o que é clicável na cena 3D (prédios, vagas, caminhões).
export const cursorClicavel = {
  onPointerOver: (e: { stopPropagation: () => void }) => { e.stopPropagation(); document.body.style.cursor = "pointer"; },
  onPointerOut: () => { document.body.style.cursor = ""; },
};
