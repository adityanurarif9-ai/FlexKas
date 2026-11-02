import {requireReminderAdmin,reminderRequest} from '../server/notifications.js';
import {backend,authorizedCron,authenticatedProfile,processReminders,respondError} from '../server/push.js';
export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  try{
    if(!['GET','POST'].includes(req.method))return res.status(405).json({error:'Metode tidak didukung.'});
    if(req.method==='GET'&&!authorizedCron(req.headers.authorization))return res.status(401).json({error:'Jadwal tidak terverifikasi.'});
    const db=backend();
    let options={};
    if(req.method==='POST'){
      const profile=await authenticatedProfile(db,req);
      requireReminderAdmin(profile);options=reminderRequest(req.body);
    }
    return res.status(200).json(await processReminders(db,options));
  }catch(error){return respondError(res,error)}
}
