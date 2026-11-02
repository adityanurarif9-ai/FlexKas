// Team identities supplied by the owner. These are display labels, not access grants.
export const TEAM = [
  { id: 'flexbox-adit', name: 'Adit', role: 'Leader' },
  { id: 'flexbox-rainer', name: 'Rainer', role: 'Wakil Leader' },
  { id: 'flexbox-kiandra', name: 'Kiandra', role: 'Anggota' },
  { id: 'flexbox-bima', name: 'Bima', role: 'Anggota' },
  { id: 'flexbox-fakhri', name: 'Fakhri', role: 'Bendahara' },
];
export function teamRole(name) {
  return TEAM.find(m => m.name.toLowerCase() === String(name).trim().toLowerCase())?.role || 'Anggota';
}
export function initialTeam() {
  const periods = [];
  for (const [year, start, count] of [[2026, '2026-10-23', 10], [2027, '2027-01-01', 53]]) {
    for (let week = 1; week <= count; week++) {
      const date = new Date(Date.parse(start) + (week - 1) * 7 * 86400000).toISOString().slice(0, 10);
      const end = new Date(Math.min(Date.parse(date) + 6 * 86400000, Date.parse(`${year}-12-31`))).toISOString().slice(0, 10);
      periods.push({ id: `${year}-W${String(week).padStart(2, '0')}`, year, week, start: date, end });
    }
  }
  return { demo: false, teamRosterVersion: 1, monthlyDues: 5000, weeklyDues: 5000, duesFrequency: 'weekly',
    openingBalance: 0, duesPeriods: periods, selectedDuesPeriod: '2026-W01',
    members: TEAM.map(m => ({ ...m })), transactions: [] };
}
export function applyTeamRoles(state) {
  if (state.teamRosterVersion === 1) return state;
  return { ...state, teamRosterVersion: 1, members: state.members.map(m =>
    TEAM.some(t => t.name.toLowerCase() === m.name.trim().toLowerCase()) ? { ...m, role: teamRole(m.name) } : m) };
}

// Replace only a completely unchanged legacy example. Any edited transaction or member is retained.
export function isPristineLegacyDemo(s) {
  if (!s?.demo || s.monthlyDues !== 50000 || (s.openingBalance || 0) !== 0 || s.duesFrequency || s.members?.length !== 6 || s.transactions?.length !== 14) return false;
  const oldNames = [['Aditya Nur Arif','Ketua tim'],['Rizky Pratama','Bendahara'],['Nadia Putri','Desainer'],['Fajar Ramadhan','Developer'],['Alya Safitri','Anggota'],['Dimas Saputra','Anggota']];
  if (!oldNames.every(([name,role],i) => s.members[i].id === 'm'+i && s.members[i].name === name && s.members[i].role === role)) return false;
  const anchor = s.transactions.find(t => t.memberId === 'm0' && t.title === 'Iuran Aditya')?.date;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(anchor || '') || !Number.isFinite(Date.parse(anchor))) return false;
  const date = (offset, day) => {
    const d = new Date(anchor+'T12:00:00Z'); d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth()+offset); d.setUTCDate(day);
    return d.toISOString().slice(0,10);
  };
  const examples = [
    ['Saldo awal tim',2000000,'income','Lainnya',-4,1,'Saldo pembukaan contoh'],
    ['Pembayaran proyek branding',1600000,'income','Proyek',-3,12,''],
    ['Lisensi aset desain',350000,'expense','Peralatan',-3,19,''],
    ['Pembayaran website klien',1200000,'income','Proyek',-2,10,''],
    ['Operasional proyek',650000,'expense','Operasional',-2,18,''],
    ['Pembayaran proyek landing page',1800000,'income','Proyek',-1,5,''],
    ['Domain & hosting tim',450000,'expense','Operasional',-1,21,''],
    ['Uang muka proyek katalog',1000000,'income','Proyek',0,1,''],
    ['Langganan tools desain',249000,'expense','Peralatan',0,1,''],
    ['Konsumsi rapat tim',125000,'expense','Konsumsi',0,1,''],
  ].map(([title,amount,type,category,offset,day,note]) => ({title,amount,type,category,date:date(offset,day),note}));
  oldNames.slice(0,4).forEach(([name],i)=>examples.push({title:'Iuran '+name.split(' ')[0],amount:50000,type:'income',category:'Iuran',date:anchor,note:'Iuran bulanan',memberId:'m'+i,duesMonth:anchor.slice(0,7)}));
  return examples.every((expected,i)=>{
    const {id,...actual}=s.transactions[i];
    return typeof id === 'string' && Object.keys(actual).length === Object.keys(expected).length && Object.entries(expected).every(([k,v])=>actual[k]===v);
  });
}
export function prepareTeamState(saved) {
  if (!saved) return {state:initialTeam(),replacedDemo:false};
  if (isPristineLegacyDemo(saved)) return {state:initialTeam(),replacedDemo:true};
  return {state:applyTeamRoles(saved),replacedDemo:false};
}
