// Gera as anotações do checkpoint M1 (setores, contagens, prédios, câmeras) sobre o raster nativo da pág. 6.
import fs from "node:fs";
const inf = JSON.parse(fs.readFileSync("data-src/contagem-bruta.json"));
const out = JSON.parse(fs.readFileSync("data-src/contagem-outras.json"));
const cams = JSON.parse(fs.readFileSync("data-src/cameras-p06.json"));
const it = [];
const band = (a, b, c) => it.push({ t: "line", pts: [a, b], c, w: 12 });
const box = (x0, y0, x1, y1, c, fill) => it.push({ t: "line", pts: [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], close: true, c, w: 2.5, fill });
const label = (x, y, s, c = "#111111", size = 15) => it.push({ t: "txt", x, y, s, c, size });
const COR = { est: "#2f80edaa", pul: "#9b51e0aa", cp: "#eb5757aa", ctn: "#f2994aaa", doc: "#27ae60aa" };
for (const l of inf) for (const s of l.segmentos) band(s.de, s.ate, COR.est);
for (const l of out) for (const s of l.segmentos) band(s.de, s.ate, l.id.startsWith("G") ? COR.est : COR.pul);
// colunas do Pulmão junto ao Scanner e aos Gates
band([230, 78], [230, 264], COR.pul); band([351, 160], [351, 295], COR.pul);
box(566, 226, 742, 309, "#eb5757", "#eb575733");
box(763, 62, 932, 226, "#f2994a", "#f2994a33");
box(528, 58, 748, 197, "#27ae60", "#27ae6022");
// prédios
box(296, 60, 362, 150, "#333333"); box(246, 138, 279, 277, "#333333");
label(298, 52, "Gates / Balanças"); label(180, 290, "Scanner?");
label(430, 175, "Administração"); label(395, 30, "Estac. leves");
label(600, 125, "Armazém · Docas (16 portas + 3 pistas)", "#1e7d3a");
label(770, 52, "Pátio Container", "#b25f00");
label(575, 218, "Cargas Perigosas · 48", "#b42318");
label(60, 330, "Pátio Estacionamento · 814 (774 + 40)", "#1d4ed8", 17);
label(70, 40, "Pátio Pulmão · 148 (122 + 14 + 12)", "#6b21a8", 15);
const MC = { verde: "#00a000", azul: "#0040ff", amarelo: "#c08a00", vermelho: "#e00000", cinza: "#555555" };
for (const c of cams) { it.push({ t: "pt", x: c.x, y: c.y, c: "#ff00ff", r: 3 }); label(c.x + 3, c.y - 6, String(c.n), MC[c.cor], 11); }
fs.writeFileSync(process.argv[2], JSON.stringify(it));
