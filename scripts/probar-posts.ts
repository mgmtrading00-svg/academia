import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { postNovedad, postOferta } from '../src/agents/posts';

/** Prueba de los posts: npx tsx scripts/probar-posts.ts salida foto-grande.jpg producto1.jpg producto2.jpg producto3.jpg */
async function main() {
  const [out, hero, p1, p2, p3] = process.argv.slice(2);
  const img = (f: string) => ({ data: readFileSync(f), mediaType: 'image/jpeg' });
  const marca = { web: 'victoriamoral.com' };
  let t = Date.now();
  const nov = await postNovedad({ marca, titulo: 'Rayas burdeos y rosa', foto: img(hero), prendas: [
    { nombre: 'Pelele', precio: 26, foto: img(p1) }, { nombre: 'Jesusito', precio: 40, foto: img(p2) }, { nombre: 'Vestido', precio: 32, foto: img(p3) }] });
  writeFileSync(join(out, 'post-novedad.jpg'), nov.data); console.log('novedad', Date.now() - t, 'ms');
  t = Date.now();
  const of = await postOferta({ marca, etiqueta: '-20 % Black Friday', nombre: 'Pelele cuadros otoño', foto: img(process.argv[7] ?? hero), producto: img(process.argv[8] ?? p1), antes: 26, ahora: 20 });
  writeFileSync(join(out, 'post-oferta.jpg'), of.data); console.log('oferta', Date.now() - t, 'ms');
}
main();
