import {backend,authenticatedProfile,respondError} from '../server/push.js';
import {requireReminderAdmin,reminderRequest,sendTestReminder} from '../server/notifications.js';
export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  try{
    if(req.method!=='POST')return res.status(405).json({error:'Metode tidak didukung.'});
    const db=backend(),profile=await authenticatedProfile(db,req);
    requireReminderAdmin(profile);
    const {memberKey}=reminderRequest(req.body);
    return res.status(200).json(await sendTestReminder(db,profile,memberKey));
  }catch(error){return respondError(res,error)}
}
