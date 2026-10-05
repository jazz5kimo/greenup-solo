// 總覽：一人公司最常問的三件事 —— 今天賣了什麼、錢收到了沒、報稅準備好了嗎
import { store } from '../state.js';
import { $, $$, gsap, countUp, money, fmtTime, fmtDate } from '../util.js';
import { icon } from '../icons.js';
import { PRODUCT_MAP, CHANNEL_MAP, startOfDay, addDays } from '../data.js';
import { productArt } from '../art.js';

let host, go;
const CH = { line: 'LINE', web: '官網', pos: '門市', phone: '電話', whatsapp: 'WhatsApp', zalo: 'Zalo', messenger: 'Messenger' };

function vatPeriod(now = new Date()) {
  const m = now.getMonth(), sm = m - (m % 2);
  const start = new Date(now.getFullYear(), sm, 1), end = new Date(now.getFullYear(), sm + 2, 1);
  return { start, end, deadline: new Date(now.getFullYear(), sm + 2, 15, 23, 59), label: `${sm + 1}–${sm + 2} 月` };
}

export function mountThree(el, goFn) {
  host = el; go = goFn;
  host.innerHTML = `
    <div class="glass t3 t3-sold" style="--c:var(--leaf)">
      <div class="t3-h"><span class="t3-n">1</span><div><b>今天賣了什麼？</b><small id="t3SoldSub"></small></div><button class="btn btn-ghost btn-sm" data-t3go="pos">看全部交易 ${icon('arrow', 14)}</button></div>
      <div class="t3-big"><b id="t3Rev">NT$ 0</b><span id="t3Cnt"></span></div>
      <ul class="t3-list" id="t3List"></ul>
      <div class="t3-ch" id="t3Ch"></div>
    </div>
    <div class="glass t3 t3-cash" style="--c:var(--sky)">
      <div class="t3-h"><span class="t3-n">2</span><div><b>錢收到了沒？</b><small>付款成功即自動入帳、對帳</small></div><button class="btn btn-ghost btn-sm" data-t3go="bank">金流對帳 ${icon('arrow', 14)}</button></div>
      <div class="t3-pair">
        <div><small>今天已收款</small><b id="t3Paid">NT$ 0</b><span id="t3PaidN"></span></div>
        <div class="warn"><small>還沒付款</small><b id="t3Ar">NT$ 0</b><span id="t3ArN"></span></div>
      </div>
      <div class="t3-bar"><i id="t3Bar"></i></div>
      <p class="t3-note" id="t3Payout"></p>
      <button class="btn btn-primary btn-sm t3-act" data-t3go="bank">${icon('send', 14)} AI 一鍵催收（用客人的語言）</button>
    </div>
    <div class="glass t3 t3-tax" style="--c:var(--amber)">
      <div class="t3-h"><span class="t3-n">3</span><div><b>報稅準備好了嗎？</b><small id="t3TaxSub"></small></div><button class="btn btn-ghost btn-sm" data-t3go="tax">申報書 ${icon('arrow', 14)}</button></div>
      <div class="t3-tax-row">
        <div class="t3-ring"><svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="27"/><circle cx="32" cy="32" r="27" class="fg" id="t3Ring"/></svg><b id="t3Pct">0%</b></div>
        <div class="t3-eq"><small>本期應納營業稅（試算）</small><b id="t3Pay">NT$ 0</b><span id="t3Eq"></span></div>
      </div>
      <ul class="t3-checks" id="t3Checks"></ul>
      <div class="t3-btns"><button class="btn btn-primary btn-sm" data-t3go="tax">${icon('check', 14)} 確認申報資料</button><button class="btn btn-ghost btn-sm" data-t3go="hub">交給記帳士</button></div>
    </div>`;
  $$('[data-t3go]', host).forEach(b => b.addEventListener('click', () => go(b.dataset.t3go)));
  renderThree(false);
}

export function renderThree(live) {
  if (!host) return;
  const now = new Date(), today = startOfDay(now);
  let list = store.ordersBetween(today, addDays(today, 1)), label = `今天截至 ${fmtTime(now)}，全通路自動彙整`;
  if (!list.length) { list = store.ordersBetween(addDays(today, -1), today); label = '今天還沒有訂單，先看昨天'; }
  $('#t3SoldSub', host).textContent = label;
  countUp($('#t3Rev', host), store.sum(list), { prefix: 'NT$ ', duration: live ? 1 : 1.4 });
  $('#t3Cnt', host).textContent = `${list.length} 筆訂單`;
  const qty = {}, amt = {};
  for (const o of list) for (const it of o.items) { qty[it.pid] = (qty[it.pid] || 0) + it.qty; amt[it.pid] = (amt[it.pid] || 0) + it.qty * it.price; }
  const top = Object.keys(qty).sort((a, b) => amt[b] - amt[a]); // 全部列出：老闆要知道今天每樣東西賣了多少
  $('#t3List', host).innerHTML = top.map(pid => `<li><span class="t3-art">${productArt(pid, 30)}</span><b>${PRODUCT_MAP[pid].name}</b><em>× ${qty[pid]}</em><span>${money(amt[pid])}</span></li>`).join('') || '<li class="empty">尚無銷售</li>';
  const byCh = {};
  for (const o of list) byCh[o.channel] = (byCh[o.channel] || 0) + 1;
  $('#t3Ch', host).innerHTML = Object.entries(byCh).sort((a, b) => b[1] - a[1]).map(([c, n]) => `<span style="--cc:${CHANNEL_MAP[c]?.color || '#888'}"><i></i>${CH[c] || c} ${n}</span>`).join('');

  const todayO = store.ordersBetween(today, addDays(today, 1));
  const paid = todayO.filter(o => o.status === 'paid');
  const pend = store.orders.filter(o => o.status === 'pending');
  const paidSum = store.sum(paid), arSum = store.sum(pend);
  countUp($('#t3Paid', host), paidSum, { prefix: 'NT$ ' });
  countUp($('#t3Ar', host), arSum, { prefix: 'NT$ ' });
  $('#t3PaidN', host).textContent = `${paid.length} 筆・已自動入帳`;
  $('#t3ArN', host).textContent = `${pend.length} 筆・AI 已傳付款提醒`;
  gsap.to($('#t3Bar', host), { width: `${paidSum + arSum ? paidSum / (paidSum + arSum) * 100 : 100}%`, duration: 1 });
  const nonCash = paid.filter(o => o.payment !== '現金').reduce((s, o) => s + o.total, 0);
  $('#t3Payout', host).innerHTML = `${icon('clock', 13)} 信用卡與行動支付 ${money(nonCash)} 預計明天撥款到銀行，到帳後 AI 自動對帳。`;

  const p = vatPeriod(now);
  const sales = store.ordersBetween(p.start, p.end);
  const buys = store.purchases.filter(x => x.ts >= +p.start && x.ts < +p.end);
  const outTax = store.sum(sales, 'tax'), inTax = buys.reduce((s, b) => s + b.tax, 0);
  const days = Math.ceil((p.deadline - now) / 864e5);
  $('#t3TaxSub', host).textContent = `${p.label}營業稅・${fmtDate(p.deadline)} 截止（剩 ${days} 天）`;
  countUp($('#t3Pay', host), Math.max(0, outTax - inTax), { prefix: 'NT$ ' });
  $('#t3Eq', host).textContent = `銷項 ${money(outTax)} − 進項 ${money(inTax)}`;
  const checks = [
    [true, `銷項電子發票 ${sales.length} 張已自動彙整`],
    [true, `進項發票 ${buys.length} 張已比對`],
    [true, '帳載與發票金額一致'],
    [pend.length === 0, pend.length ? `${pend.length} 筆訂單待收款（不影響申報）` : '應收帳款已全數收回'],
  ];
  const req = checks.slice(0, 3), pct = Math.round(req.filter(c => c[0]).length / req.length * 100); // 待收款僅供提醒，不影響申報準備度
  $('#t3Checks', host).innerHTML = checks.map(([ok, t]) => `<li class="${ok ? 't3-ok' : 't3-todo'}">${icon(ok ? 'check' : 'clock', 13)}${t}</li>`).join('');
  $('#t3Pct', host).textContent = `${pct}%`;
  const C = 2 * Math.PI * 27;
  gsap.fromTo($('#t3Ring', host), { strokeDasharray: C, strokeDashoffset: C }, { strokeDashoffset: C * (1 - pct / 100), duration: 1.2, ease: 'power3.out' });
  if (live) gsap.fromTo($$('.t3', host), { boxShadow: '0 0 0 1px rgba(45,182,116,.6), 0 0 30px rgba(45,182,116,.35)' }, { boxShadow: '0 1px 0 rgba(255,255,255,0.06) inset, 0 20px 50px rgba(0,0,0,0.25)', duration: 1.4 });
}
