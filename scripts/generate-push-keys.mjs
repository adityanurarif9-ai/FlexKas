import webpush from 'web-push';
import {randomBytes} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const keys=webpush.generateVAPIDKeys(),path=resolve('.local-data/push.env');
await mkdir('.local-data',{recursive:true});
await writeFile(path,`# Rahasia backend; jangan unggah file ini ke GitHub/chat.\nVAPID_PUBLIC_KEY=${keys.publicKey}\nVITE_VAPID_PUBLIC_KEY=${keys.publicKey}\nVAPID_PRIVATE_KEY=${keys.privateKey}\nVAPID_SUBJECT=https://kas-flexbox.vercel.app\nCRON_SECRET=${randomBytes(32).toString('hex')}\n`,{flag:'wx',mode:0o600});
console.log(`Kunci push disimpan di ${path}. File yang sudah ada tidak ditimpa.`);
