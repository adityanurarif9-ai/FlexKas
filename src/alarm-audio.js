export const ALARM_SECONDS=12;
export function recentAlarmRows(rows,now=Date.now()){
  return rows.filter(row=>{const age=now-Date.parse(row.createdAt);return Number.isFinite(age)&&age>=-30000&&age<=120000});
}
export function createAlarmAudio(createContext=()=>{
  const Context=window.AudioContext||window.webkitAudioContext;
  return Context?new Context():null;
}){
  let context=null,nodes=[];
  function stop(){
    nodes.forEach(({osc,gain})=>{try{osc.stop()}catch{}try{osc.disconnect();gain.disconnect()}catch{}});nodes=[];
  }
  return {
    async unlock(){try{context ||= createContext();if(!context)return false;await context.resume();return context.state==='running'}catch{return false}},
    ready:()=>context?.state==='running',
    start(){
      if(context?.state!=='running')return false;
      stop();
      for(let second=0;second<ALARM_SECONDS;second++){
        for(const [offset,frequency] of [[0,660],[.3,880]]){
          const start=context.currentTime+second+offset,osc=context.createOscillator(),gain=context.createGain();
          osc.type='triangle';osc.frequency.value=frequency;
          gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(.14,start+.025);gain.gain.exponentialRampToValueAtTime(.001,start+.22);
          osc.connect(gain);gain.connect(context.destination);osc.start(start);osc.stop(start+.23);
          nodes.push({osc,gain});
        }
      }
      return true;
    },stop
  };
}
