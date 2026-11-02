import { readFile, writeFile } from 'node:fs/promises';
import { Resvg } from '@resvg/resvg-js';
const svg=await readFile('public/assets/flexkas-icon.svg','utf8');
for(const size of [180,192,512]){
  await writeFile(`public/assets/flexkas-icon-${size}.png`,new Resvg(svg,{fitTo:{mode:'width',value:size}}).render().asPng());
}
console.log('FlexKas app icons: 180, 192, 512px');
