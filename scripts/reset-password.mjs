// Owner-only recovery for aliases without mailboxes. Never shipped to the browser.
import {createClient} from '@supabase/supabase-js';
import {randomBytes} from 'node:crypto';
import {mkdir,open} from 'node:fs/promises';
import {resolve} from 'node:path';
import {ACCOUNT_KEYS} from '../src/account-policy.js';
const member=process.argv[2];
if(!ACCOUNT_KEYS.includes(member))throw new Error('Pilih akun: fakhri, adit, rainer, kiandra, atau bima.');
const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!url||!key)throw new Error('Konfigurasi owner belum tersedia di .env.local.');
const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
const profile=await client.from('flex_profiles').select('user_id').eq('member_key',member).single();
if(profile.error||!profile.data)throw new Error('Profil tepercaya tidak ditemukan. Periksa pemetaan akun terlebih dahulu.');
const password=randomBytes(21).toString('base64url')+'aA9!';
await mkdir('.local-data',{recursive:true});
const path=resolve('.local-data',`reset-${member}-${Date.now()}.txt`),file=await open(path,'wx',0o600);
try{
  // Record the credential before mutation so a disk error cannot lose it.
  await file.write(`PRIVAT — hanya untuk pemilik akun\nAkun: ${member}@flexboxstudio.site\nUUID: ${profile.data.user_id}\nPassword baru: ${password}\nStatus: lihat hasil terminal untuk memastikan reset berhasil.\n`);
  const {error}=await client.auth.admin.updateUserById(profile.data.user_id,{password});
  if(error)throw new Error('Reset belum berhasil. Password dalam file belum berlaku.');
  await file.write('Reset berhasil. Segera ganti password di menu Akun FlexKas.\n');
}finally{await file.close()}
console.log(`Reset berhasil. Password tersimpan di: ${path}`);
