// Falha se houver travessão (— ou –) ou hífen com espaços (" - ") em textos do app.
// Regra do projeto: nenhum travessão nas escritas; usar "·" como separador.
import fs from "node:fs";
import path from "node:path";

const RAIZES = ["app", "lib", "scene", "components"];
const EXT = new Set([".ts", ".tsx", ".json", ".css", ".md", ".mjs"]);
const erros = [];
const visitar = (dir) => {
  if (!fs.existsSync(dir)) return;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) visitar(p);
    else if (EXT.has(path.extname(e.name))) {
      fs.readFileSync(p, "utf8").split("\n").forEach((linha, i) => {
        if (/[—–]/.test(linha)) erros.push(`${p}:${i + 1}: travessão`);
        // hífen com espaços em textos visíveis: strings literais e texto de JSX (não em expressões)
        if (/^\s*(\/\/|\*)/.test(linha)) return;
        const strings = [...linha.matchAll(/(["'`])((?:\\.|(?!\1).)*)\1/g)].map((m) => m[2]);
        const jsx = [...linha.matchAll(/>([^<>{}]+)</g)].map((m) => m[1]);
        if ([...strings, ...jsx].some((t) => /[A-Za-zÀ-ú0-9]\s-\s[A-Za-zÀ-ú0-9]/.test(t))) erros.push(`${p}:${i + 1}: hífen com espaços`);
      });
    }
  }
};
RAIZES.forEach(visitar);
if (erros.length) {
  console.error("Textos com travessão ou hífen com espaços:\n" + erros.join("\n"));
  process.exit(1);
}
console.log("check-text: nenhum travessão encontrado");
