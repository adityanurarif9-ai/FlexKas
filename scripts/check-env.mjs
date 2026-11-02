import {loadEnv} from 'vite';
const env=loadEnv('production',process.cwd(),'');
for(const name of ['VITE_SUPABASE_SERVICE_ROLE_KEY','VITE_VAPID_PRIVATE_KEY','VITE_CRON_SECRET'])if(env[name])throw new Error(`${name} tidak boleh ada. Gunakan nama backend tanpa awalan VITE_.`);
const key=env.VITE_SUPABASE_PUBLISHABLE_KEY||'';
let role='';try{role=JSON.parse(Buffer.from(key.split('.')[1]||'','base64url').toString()).role}catch{}
if(key.startsWith('sb_secret_')||role==='service_role')throw new Error('Service key tidak boleh digunakan sebagai VITE_SUPABASE_PUBLISHABLE_KEY.');
if(Boolean(env.VITE_SUPABASE_URL)!==Boolean(key))throw new Error('Isi kedua variabel frontend Supabase: URL dan publishable key.');
