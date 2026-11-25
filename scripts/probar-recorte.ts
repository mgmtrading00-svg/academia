import { readFileSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { packshotLocal } from '../src/agents/teo/recorte';

/** Prueba el recorte gratuito: npx tsx scripts/probar-recorte.ts carpeta-salida foto1.jpg foto2.jpg ... */
async function main() {
  const [out, ...files] = process.argv.slice(2);
  for (const f of files) {
    const t = Date.now();
    const r = await packshotLocal(readFileSync(f));
    writeFileSync(join(out, basename(f).replace(/\.\w+$/, '') + '-limpia.jpg'), r.data);
    console.log(basename(f), `${Date.now() - t} ms`, `prenda ${(r.coverage * 100).toFixed(0)} %`);
  }
}
main();
