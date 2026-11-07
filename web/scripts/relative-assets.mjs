// SvelteKit's hash-router fallback emits root-absolute entry assets even with
// paths.relative enabled. Make only those known bootstrap paths relocatable.
// Chunk imports and CSS assets are already relative to their own module URLs.
import {readFileSync,writeFileSync} from 'node:fs';
const path=new URL('../build/index.html',import.meta.url);
const html=readFileSync(path,'utf8');
if (!html.includes('/_app/immutable/')) throw new Error('Build entry asset format changed; inspect ingress compatibility');
const result=html.replace(/(["'])\/_app\//g,'$1./_app/');
if (/(?:src|href)=["']\/(?!\/)|import\(["']\/(?!\/)/.test(result)) throw new Error('Root-absolute bootstrap asset would escape ingress');
writeFileSync(path,result);
