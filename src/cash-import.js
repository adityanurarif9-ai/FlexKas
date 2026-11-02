import { teamRole } from './team.js';
const text = value => String(value ?? '').trim();
const key = value => text(value).toLocaleLowerCase('id-ID');
const positiveInteger = n => Number.isSafeInteger(n) && n > 0;
export const weekKey = (year, week) => `${year}-W${String(week).padStart(2, '0')}`;
export function excelDate(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 36526 || n > 73415) throw new Error('Tanggal Excel tidak valid atau di luar 2000–2100.');
  return new Date(Date.UTC(1899, 11, 30) + Math.floor(n) * 86400000).toISOString().slice(0, 10);
}
export function weeklyTarget(state) { return state.duesFrequency === 'weekly' ? state.weeklyDues : state.monthlyDues; }
export function chooseWeek(state, date) {
  const periods = state.duesPeriods || [];
  return periods.find(p => p.start <= date && p.end >= date)?.id || state.selectedDuesPeriod || periods[0]?.id || '';
}
export function paidForMember(state, memberId, period) {
  return state.transactions.filter(t => t.type === 'income' && t.category === 'Iuran' && t.memberId === memberId &&
    (state.duesFrequency === 'weekly' ? t.duesPeriod === period : t.duesMonth === period))
    .reduce((sum, t) => sum + t.amount, 0);
}
export function cashBalance(state) {
  return (state.openingBalance || 0) + state.transactions.reduce((sum, t) => sum + (t.type === 'income' ? t.amount : -t.amount), 0);
}
export function parseCashWorkbook(kas, payments) {
  if (text(kas.B10) !== 'Anggota' || text(payments.B7) !== 'Jenis' || text(payments.F7) !== 'Nominal (Rp)')
    throw new Error('Format Excel belum dikenali. Pilih workbook dengan tab Kas Tim dan Catatan Pembayaran.');
  const amount = Number(kas.D7), opening = Number(kas.G7);
  if (!positiveInteger(amount) || !text(kas.G7) || !Number.isSafeInteger(opening) || opening < 0) throw new Error('Nominal iuran atau saldo awal di Kas Tim tidak valid.');
  const members = [];
  for (let r = 11; r <= 15; r++) {
    const name = text(kas[`B${r}`]);
    if (!name || members.some(m => key(m.name) === key(name))) throw new Error('Daftar anggota kosong atau berulang di Kas Tim.');
    members.push({ id: `excel-member-${r}`, name, role: teamRole(name) });
  }
  const periods = [];
  for (const [year, first, last] of [[2026, 27, 36], [2027, 49, 101]]) {
    for (let r = first; r <= last; r++) {
      const week = Number(kas[`A${r}`]), start = excelDate(kas[`B${r}`]), end = excelDate(kas[`C${r}`]);
      if (week !== r - first + 1 || start > end || start.slice(0, 4) !== String(year) || end.slice(0, 4) !== String(year))
        throw new Error(`Jadwal iuran di Kas Tim baris ${r} tidak valid.`);
      if (periods.length && Date.parse(start) - Date.parse(periods.at(-1).end) !== 86400000)
        throw new Error(`Jadwal iuran terputus atau bertumpuk pada baris ${r}.`);
      periods.push({ id: weekKey(year, week), year, week, start, end });
    }
  }
  const transactions = [], issues = [];
  for (let r = 8; r <= 807; r++) {
    if (!'ABCDEFG'.split('').some(c => text(payments[c + r]))) continue;
    try {
      const kind = text(payments[`B${r}`]), date = excelDate(payments[`A${r}`]), nominal = Number(payments[`F${r}`]), note = text(payments[`G${r}`]);
      if (!['Setoran', 'Pengeluaran'].includes(kind)) throw new Error('jenis harus Setoran atau Pengeluaran');
      if (!positiveInteger(nominal)) throw new Error('nominal harus bilangan bulat positif');
      if (date < periods[0].start || date > periods.at(-1).end) throw new Error('tanggal di luar jadwal workbook');
      const member = members.find(m => key(m.name) === key(payments[`C${r}`]));
      const t = { id: `excel-row-${r}`, type: kind === 'Setoran' ? 'income' : 'expense', date, amount: nominal,
        title: kind === 'Setoran' ? `Iuran ${member?.name || ''}` : (note || 'Pengeluaran kas'),
        category: kind === 'Setoran' ? 'Iuran' : 'Operasional', note, sourceRow: r };
      if (kind === 'Setoran') {
        const period = weekKey(Number(payments[`D${r}`]), Number(payments[`E${r}`]));
        if (!member) throw new Error('nama anggota tidak ditemukan');
        if (!periods.some(p => p.id === period)) throw new Error('tahun atau minggu iuran tidak valid');
        Object.assign(t, { memberId: member.id, duesPeriod: period });
      } else if (text(payments[`C${r}`])) t.recordedBy = text(payments[`C${r}`]);
      transactions.push(t);
    } catch (e) { issues.push(`Baris ${r}: ${e.message}`); }
  }
  if (issues.length) throw new Error(`Impor dibatalkan; perbaiki catatan berikut. ${issues.slice(0, 5).join('. ')}${issues.length > 5 ? ` (+${issues.length - 5} baris lainnya)` : ''}`);
  if (!transactions.length) throw new Error('Belum ditemukan transaksi yang dapat diimpor.');
  const income = transactions.filter(t => t.type === 'income').reduce((a, t) => a + t.amount, 0);
  const expense = transactions.filter(t => t.type === 'expense').reduce((a, t) => a + t.amount, 0);
  for (const [cell, computed, label] of [['D20', income, 'pemasukan'], ['H20', expense, 'pengeluaran'], ['D21', opening + income - expense, 'saldo']]) {
    if (!text(kas[cell]) || !Number.isFinite(Number(kas[cell])) || Number(kas[cell]) !== computed)
      throw new Error(`Total ${label} tidak cocok dengan Kas Tim!${cell}. Hitung ulang dan simpan file Excel dahulu.`);
  }
  for (let r = 11; r <= 15; r++) {
    const paid = transactions.filter(t => t.memberId === `excel-member-${r}`).reduce((a, t) => a + t.amount, 0);
    if (Number(kas[`H${r}`]) !== paid) throw new Error(`Total setoran anggota di Kas Tim!H${r} tidak cocok dengan catatan pembayaran.`);
  }
  if (opening + income - expense < 0) throw new Error('Saldo akhir negatif. Periksa pemasukan dan pengeluaran di Excel.');
  const selectedDuesPeriod = weekKey(Number(kas.E7), Number(kas.B7));
  if (!periods.some(p => p.id === selectedDuesPeriod)) throw new Error('Periode terpilih di Excel tidak valid.');
  return { demo: false, teamRosterVersion: 2, monthlyDues: amount, weeklyDues: amount, duesFrequency: 'weekly', openingBalance: opening,
    duesPeriods: periods, selectedDuesPeriod, members, transactions,
    importSummary: { income, expense, balance: opening + income - expense, source: 'Kas Tim / Catatan Pembayaran' } };
}

export async function readCashWorkbook(buffer) {
  const { unzipSync, strFromU8 } = await import('fflate');
  if (buffer.byteLength > 5 * 1024 * 1024) throw new Error('Ukuran Excel maksimal 5 MB.');
  let expanded = 0;
  const zip = unzipSync(new Uint8Array(buffer), { filter: file => {
    if (!/^xl\/(workbook\.xml|_rels\/workbook\.xml\.rels|sharedStrings\.xml|worksheets\/sheet\d+\.xml)$/.test(file.name)) return false;
    expanded += file.originalSize;
    if (expanded > 20 * 1024 * 1024) throw new Error('Isi Excel terlalu besar untuk diimpor.');
    return true;
  }});
  function xml(path) {
    if (!zip[path]) throw new Error(`Struktur workbook tidak lengkap (${path}).`);
    const content = strFromU8(zip[path]);
    if (/<!DOCTYPE|<!ENTITY/i.test(content)) throw new Error('Format XML workbook tidak didukung.');
    const doc = new DOMParser().parseFromString(content, 'application/xml');
    if (doc.getElementsByTagName('parsererror').length) throw new Error('XML workbook rusak.');
    return doc;
  }
  const workbook = xml('xl/workbook.xml'), rels = xml('xl/_rels/workbook.xml.rels');
  if (['1','true'].includes(workbook.getElementsByTagName('workbookPr')[0]?.getAttribute('date1904'))) throw new Error('Workbook dengan kalender 1904 belum didukung.');
  const relationships = Object.fromEntries([...rels.getElementsByTagName('Relationship')].map(r => [r.getAttribute('Id'), r.getAttribute('Target')]));
  const strings = zip['xl/sharedStrings.xml'] ? [...xml('xl/sharedStrings.xml').getElementsByTagName('si')].map(si => [...si.getElementsByTagName('t')].map(t => t.textContent).join('')) : [];
  function cells(name) {
    const sheet = [...workbook.getElementsByTagName('sheet')].find(s => s.getAttribute('name') === name);
    if (!sheet) throw new Error(`Tab ${name} tidak ditemukan.`);
    const target = relationships[sheet.getAttribute('r:id')];
    const path = target?.startsWith('/xl/') ? target.slice(1) : 'xl/' + target;
    const result = {};
    for (const c of xml(path).getElementsByTagName('c')) {
      const type = c.getAttribute('t'), v = c.getElementsByTagName('v')[0]?.textContent || '';
      result[c.getAttribute('r')] = type === 's' ? strings[Number(v)] : type === 'inlineStr' ? [...c.getElementsByTagName('t')].map(t => t.textContent).join('') : v;
    }
    return result;
  }
  return parseCashWorkbook(cells('Kas Tim'), cells('Catatan Pembayaran'));
}
