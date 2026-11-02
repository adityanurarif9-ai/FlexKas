import {backend,authenticatedProfile,respondError} from '../server/push.js';
import {listNotifications} from '../server/notifications.js';
export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  try{
    if(req.method!=='GET')return res.status(405).json({error:'Metode tidak didukung.'});
    const db=backend(),profile=await authenticatedProfile(db,req);
    return res.status(200).json(await listNotifications(db,profile));
  }catch(error){return respondError(res,error)}
}
