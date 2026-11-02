import {createClient} from '@supabase/supabase-js';
import {randomBytes} from 'node:crypto';
import {mkdir,open} from 'node:fs/promises';
import {resolve} from 'node:path';
const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!url||!key)throw new Error('Isi SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY di .env.local terlebih dahulu. Jangan memakai awalan VITE_ untuk service key.');
const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
const allowed=['fakhri','adit','rainer','kiandra','bima'],requested=process.argv.slice(2);
if(requested.some(name=>!allowed.includes(name))||new Set(requested).size!==requested.length)throw new Error('Nama akun tidak valid atau berulang.');
const accounts=requested.length?requested:allowed;
await mkdir('.local-data',{recursive:true});
const path=resolve('.local-data',`akun-flexkas-${Date.now()}.txt`),file=await open(path,'wx',0o600);
await file.write('KREDENSIAL PRIVAT FLEXKAS\nJangan unggah file ini atau mengirimnya ke grup. Berikan setiap password hanya kepada pemilik akunnya, lalu minta diganti di menu akun.\n\n');
try{
  for(const member_key of accounts){
    const email=`${member_key}@flexboxstudio.site`,password=randomBytes(21).toString('base64url')+'aA9!';
    const {data,error}=await client.auth.admin.createUser({email,password,email_confirm:true});
    if(error)throw new Error(`Akun ${email} belum dapat dibuat. Jika sudah ada, periksa di dashboard; skrip tidak mengambil alih akun yang sudah ada.`);
    const {error:profileError}=await client.from('flex_profiles').insert({user_id:data.user.id,member_key});
    if(profileError){await file.write(`${email}\nUUID: ${data.user.id}\nPassword sementara: ${password}\nPERLU TINDAKAN OWNER: profil belum terhubung. Jangan berikan akun ini sebelum profil diperiksa.\n\n`);throw new Error('Profil belum bisa disimpan. Periksa schema SQL dan catatan UUID di file lokal. Tidak ada hak admin yang diberikan ke akun lain.')}
    await file.write(`${email}\nPassword sementara: ${password}\nHak akses: ${member_key==='fakhri'?'Admin / Bendahara':'Lihat saja'}\n\n`);
    console.log(`Siap: ${email}`);
  }
}finally{await file.close();console.log(`Kredensial tersimpan hanya di perangkat ini: ${path}`)}
console.log(`${accounts.length} akun selesai dibuat. Tidak ada email verifikasi yang dikirim.`);
