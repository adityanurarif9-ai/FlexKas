import {createClient} from '@supabase/supabase-js';
import {loginEmail,validatePassword} from './account-policy.js';
const url=import.meta.env.VITE_SUPABASE_URL||'',key=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY||'';
export const cloudConfigured=!!url&&!!key&&!key.startsWith('sb_secret_');
export const cloud=cloudConfigured?createClient(url,key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}}):null;
export function authMessage(error){
  const code=error?.code||'',message=error?.message||'';
  if(code==='invalid_credentials'||/Invalid login credentials/i.test(message))return 'Nama akun atau password belum benar.';
  if(code==='over_request_rate_limit'||error?.status===429)return 'Terlalu banyak percobaan. Tunggu sebentar sebelum mencoba lagi.';
  if(code==='42501')return 'Akun ini belum dihubungkan ke anggota Flexbox. Hubungi pengelola.';
  if(code==='40001')return 'Kas diperbarui dari perangkat lain. Muat ulang lalu ulangi perubahanmu.';
  if(/fetch|network|offline/i.test(message))return 'Sambungan ke server terputus. Periksa internet lalu coba lagi.';
  return message||'Permintaan belum berhasil. Coba lagi.';
}
export async function signIn(email,password){
  if(!cloud)throw new Error('Akun tim belum diaktifkan oleh pengelola.');
  const {data,error}=await cloud.auth.signInWithPassword({email:loginEmail(email),password});
  if(error)throw error;return data.session;
}
export async function readSnapshot(){
  const {data,error}=await cloud.rpc('flex_snapshot');if(error)throw error;
  if(!data?.profile?.user_id||!Array.isArray(data.state?.transactions)||!Array.isArray(data.state?.members))throw new Error('Data tim belum siap. Hubungi pengelola.');
  return data;
}
export async function writeSnapshot(state,revision){
  const {data,error}=await cloud.rpc('flex_save_wallet',{p_state:state,p_expected_revision:revision});if(error)throw error;return data;
}
export async function changePassword(email,current,password,confirmation){
  validatePassword(password,confirmation);
  if(password===current)throw new Error('Gunakan password baru yang berbeda.');
  const verified=await cloud.auth.signInWithPassword({email,password:current});if(verified.error)throw verified.error;
  const {error}=await cloud.auth.updateUser({password});if(error)throw error;
}
export async function apiRequest(path,method='POST'){
  const {data,error}=await cloud.auth.getSession();if(error)throw error;
  if(!data.session)throw new Error('Masuk kembali untuk melanjutkan.');
  const response=await fetch(path,{method,headers:{Authorization:`Bearer ${data.session.access_token}`,'Content-Type':'application/json'},body:method==='POST'?'{}':undefined,cache:'no-store'});
  let result;try{result=await response.json()}catch{throw new Error('Layanan pengingat belum tersedia di alamat ini. Gunakan aplikasi Vercel.')}
  if(!response.ok)throw new Error(result.error||'Layanan pengingat belum berhasil.');return result;
}
