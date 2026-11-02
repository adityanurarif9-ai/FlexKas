import {monthPeriods,paymentPlan,createDuesPayment} from './dues-payment.js';
import {paidForMember,weeklyTarget} from './cash-import.js';

export function openDuesPayment({getState,memberId,periodId,today,esc,rupiah,dateName,openModal,closeModal,save,onSaved}){
  const $=selector=>document.querySelector(selector);
  openModal('Bayar kas sekaligus','Satu pembayaran untuk satu bulan atau beberapa minggu pilihan.',`
    <form id="bulk-dues-form"><label class="field">Anggota yang membayar<select id="bulk-member" required><option value="">Pilih anggota</option>${getState().members.map(member=>`<option value="${esc(member.id)}" ${member.id===memberId?'selected':''}>${esc(member.name)}</option>`).join('')}</select></label>
    <div class="form-row"><label class="field">Pilihan pembayaran<select id="bulk-mode"><option value="month">1 bulan kalender</option><option value="weeks">Pilih minggu sendiri</option></select></label><label class="field" id="bulk-month-field">Bulan jadwal Jumat<input id="bulk-month" type="month" required value="${today.slice(0,7)}"></label></div>
    <p class="form-hint">Satu bulan mencakup semua Jumat yang dimulai pada bulan terpilih, bukan selalu empat minggu. Tanggal bayar boleh berbeda dari jadwal.</p>
    <fieldset class="bulk-period-fieldset"><legend>Minggu yang dibayar</legend><div id="bulk-periods" class="bulk-periods"></div></fieldset>
    <div id="bulk-summary" class="bulk-summary" aria-live="polite"></div>
    <label class="field">Tanggal pembayaran sebenarnya<input id="bulk-date" type="date" min="2000-01-01" max="2100-12-31" required value="${today}"></label>
    <label class="field">Catatan <span class="muted">(opsional)</span><textarea id="bulk-note" rows="2" maxlength="300" placeholder="Contoh: Bayar di muka untuk satu bulan"></textarea></label>
    <p class="form-hint">Setiap minggu disimpan sebagai rincian iuran terpisah pada tanggal pembayaran yang sama. Total rincian itulah yang menambah saldo, tanpa catatan pemasukan ganda.</p>
    <p id="bulk-error" class="error" role="alert"></p><div class="modal-actions"><button class="btn" type="button" id="cancel-modal">Batal</button><button class="btn primary" type="submit" id="bulk-submit">Simpan pembayaran</button></div></form>`);
  let selected=new Set();
  function periods(){return $('#bulk-mode').value==='month'?monthPeriods(getState(),$('#bulk-month').value):getState().duesPeriods}
  function initialize(){
    const state=getState(),member=$('#bulk-member').value,target=weeklyTarget(state);
    selected=new Set(periods().filter(p=>paidForMember(state,member,p.id)<target&&($('#bulk-mode').value==='month'||p.id===periodId)).map(p=>p.id));
    draw();
  }
  function draw(){
    const state=getState(),target=weeklyTarget(state),member=$('#bulk-member').value,list=periods();
    $('#bulk-month-field').hidden=$('#bulk-mode').value!=='month';
    $('#bulk-month').required=$('#bulk-mode').value==='month';
    $('#bulk-periods').innerHTML=list.length?list.map(p=>{
      const paid=paidForMember(state,member,p.id),remaining=Math.max(0,target-paid),full=remaining===0;
      return `<label class="bulk-period ${full?'settled':''}"><input type="checkbox" data-bulk-period="${esc(p.id)}" ${selected.has(p.id)&&!full?'checked':''} ${full||!member?'disabled':''}><span><strong>Minggu ${esc(p.week)} · ${esc(p.year)}</strong><small>${dateName(p.start)} – ${dateName(p.end)}${paid&&!full?` · Sudah ${rupiah(paid)}`:''}</small></span><b>${full?'Lunas':rupiah(remaining)}</b></label>`;
    }).join(''):'<p class="empty-periods">Belum ada jadwal Jumat untuk bulan ini. Pilih bulan lain atau pilih minggu sendiri.</p>';
    document.querySelectorAll('[data-bulk-period]').forEach(input=>input.onchange=()=>{input.checked?selected.add(input.dataset.bulkPeriod):selected.delete(input.dataset.bulkPeriod);summary()});
    summary();
  }
  function summary(){
    $('#bulk-error').textContent='';
    try{
      const plan=paymentPlan(getState(),$('#bulk-member').value,[...selected]);
      $('#bulk-summary').innerHTML=`<div><span>Total pembayaran</span><strong>${rupiah(plan.total)}</strong></div><p>${plan.payable.length} minggu akan dilunasi. Minggu yang sudah lunas dilewati; cicilan sebelumnya hanya ditambah sisanya.</p>`;
      $('#bulk-submit').disabled=!plan.total;
    }catch(error){const allPaid=$('#bulk-member').value&&periods().length&&periods().every(p=>paidForMember(getState(),$('#bulk-member').value,p.id)>=weeklyTarget(getState()));$('#bulk-summary').innerHTML=`<p>${allPaid?'Semua jadwal pada pilihan ini sudah lunas. Tidak ada tagihan tambahan.':esc(error.message)}</p>`;$('#bulk-submit').disabled=true}
  }
  $('#bulk-member').onchange=initialize;$('#bulk-month').onchange=initialize;$('#bulk-mode').onchange=initialize;
  $('#bulk-dues-form').onsubmit=async event=>{
    event.preventDefault();
    try{
      const payment=createDuesPayment(getState(),{memberId:$('#bulk-member').value,periodIds:[...selected],date:$('#bulk-date').value,note:$('#bulk-note').value});
      if(await save(payment.state)){closeModal();onSaved(payment)}
    }catch(error){if($('#bulk-error'))$('#bulk-error').textContent=error.message}
  };
  initialize();
}
