// 拍照記帳（財）：收據／發票拍照 → AI 辨識欄位 → 自動分類產銷人發財、判斷進項扣抵與私人支出 → 確認入帳
import { $, $$, el, gsap, esc, money, pad, fmtMD, fmtTime, sleep, countUp, toast } from '../util.js';
import { icon } from '../icons.js';
import { makeChart } from '../charts.js';
import { mulberry32 } from '../data.js';
import { FIVE } from '../ledger.js';
import {
  BUYER_ID, MIN_PER_DOC, USD_RATE, ACCOUNTS, ACC, fiveOf, PAY, PAY_MAP, DOC, SRC, TODAY,
  SAMPLES, uploadResult, seedList, carrierList, MISSING, deduct, personalCheck, bookAmt, isWeekend, roc,
} from '../receipts-data.js';

const CF = '"Noto Sans TC", "PingFang TC", "Microsoft JhengHei", "Noto Sans CJK TC", sans-serif';
const n0 = (n) => Math.round(n || 0).toLocaleString('en-US');
const ymd = (ts) => { const d = new Date(ts); return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())}`; };
const wk = (ts) => ['日', '一', '二', '三', '四', '五', '六'][new Date(ts).getDay()];

// 自繪小圖示（icons.js 沒有的）
const svg = (p, s = 18, sw = 1.8) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
const I = {
  camera: (s) => svg('<path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13.5" r="3.8"/>', s),
  image: (s) => svg('<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 9"/>', s),
  mail: (s) => svg('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>', s),
  line: (s) => svg('<path d="M12 4C6.5 4 3 7.3 3 11.1c0 3.4 3 6.2 7.2 6.8l-.4 2.4c0 .4.3.6.7.4 2.6-1.4 6.6-4.2 8.1-6.5.9-1.2 1.4-2.2 1.4-3.1C21 7.3 17.5 4 12 4z"/>', s),
  barcode: (s) => svg('<path d="M4 6v12M7 6v12M10 6v12M14 6v12M16 6v12M20 6v12"/>', s),
  copy: (s) => svg('<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>', s),
  upload: (s) => svg('<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/>', s),
  trash: (s) => svg('<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>', s),
};

const FIELDS = [
  { k: 'seller', label: '賣方名稱', span: 'w4' },
  { k: 'taxId', label: '統一編號', span: 'w2' },
  { k: 'date', label: '日期', span: 'w3' },
  { k: 'invNo', label: '發票號碼', span: 'w3' },
  { k: 'items', label: '品項', span: 'w6' },
  { k: 'net', label: '未稅金額', span: 'w2', num: true },
  { k: 'tax', label: '稅額', span: 'w2', num: true },
  { k: 'total', label: '總額', span: 'w2', num: true },
];

// ---------- 擬真單據 ----------
function rngFor(str) { let h = 7; for (const c of str) h = (h * 31 + c.charCodeAt(0)) >>> 0; return mulberry32(h); }
function barcodeSVG(seed, w = 220, h = 30) {
  const r = rngFor(seed); let x = 0, out = '';
  while (x < w) { const bw = 1 + Math.floor(r() * 3); if (r() > 0.42) out += `<rect x="${x}" y="0" width="${bw}" height="${h}"/>`; x += bw + 1; }
  return `<svg class="rc-bc" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" fill="#111">${out}</svg>`;
}
function qrSVG(seed, n = 21) {
  const r = rngFor(seed); let out = '';
  const finder = (x, y) => `<rect x="${x}" y="${y}" width="7" height="7"/><rect x="${x + 1}" y="${y + 1}" width="5" height="5" fill="#fff"/><rect x="${x + 2}" y="${y + 2}" width="3" height="3"/>`;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const inF = (x < 8 && y < 8) || (x > n - 9 && y < 8) || (x < 8 && y > n - 9);
    if (!inF && r() > 0.52) out += `<rect x="${x}" y="${y}" width="1" height="1"/>`;
  }
  return `<svg class="rc-qr" viewBox="0 0 ${n} ${n}" fill="#111" shape-rendering="crispEdges">${out}${finder(0, 0)}${finder(n - 7, 0)}${finder(0, n - 7)}</svg>`;
}
const period = (ts) => { const m = new Date(ts).getMonth() + 1; const s = m % 2 ? m : m - 1; return `${roc(ts)}年${pad(s)}-${pad(s + 1)}月`; };
const dtFull = (ts) => { const d = new Date(ts); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad((d.getMinutes() * 7) % 60)}`; };

function paperHTML(s) {
  const d = new Date(s.date);
  if (s.key === 'einv' || s.key === 'fuel') {
    return `<div class="rc-paper rc-pe">
      <div class="rc-pe-logo" data-f="seller">${s.key === 'fuel' ? '<i class="rc-pe-flame"></i>' : ''}${esc(s.seller)}</div>
      <div class="rc-pe-title">電子發票證明聯</div>
      <div class="rc-pe-per">${period(s.date)}</div>
      <div class="rc-pe-no" data-f="invNo">${s.invNo}</div>
      <div class="rc-pe-r"><span data-f="date">${dtFull(s.date)}</span><span>格式 25</span></div>
      <div class="rc-pe-r"><span>隨機碼 ${String(4829 + s.total).slice(-4)}</span><span data-f="total">總計 ${n0(s.total)}</span></div>
      <div class="rc-pe-r"><span data-f="taxId">賣方 ${s.taxId}</span><span>買方 ${s.buyerId}</span></div>
      ${barcodeSVG(s.invNo)}
      <div class="rc-pe-qrs">${qrSVG(s.invNo + 'a')}${qrSVG(s.invNo + 'b')}</div>
      <div class="rc-cut"></div>
      <div class="rc-pe-dh">交易明細</div>
      <div class="rc-pe-lines" data-f="items">${s.lines.map(([n, q, p]) => `<div><span>${esc(n)}</span><span>${q} × ${n0(p)}</span><b>${n0(q * p)}</b></div>`).join('')}</div>
      <div class="rc-pe-sum"><span data-f="net">銷售額 ${n0(s.net)}</span><span data-f="tax">稅額 ${n0(s.tax)}</span></div>
      <div class="rc-pe-tot">總計 <b>NT$ ${n0(s.total)}</b></div>
      ${s.key === 'fuel' ? '<div class="rc-pe-note">車號 ＊＊＊-2Q8・會員卡 ＊＊＊＊6612</div>' : '<div class="rc-pe-note">退貨請持證明聯及明細辦理</div>'}
    </div>`;
  }
  if (s.key === 'hand') {
    return `<div class="rc-paper rc-ph">
      <div class="rc-ph-title">收　據</div>
      <div class="rc-ph-no">No. 0027<em>16</em></div>
      <div class="rc-ph-l">茲收到<i>阿美手作甜點</i></div>
      <div class="rc-ph-l" data-f="items">購　買<i>草莓 6 盒、檸檬 3 斤</i></div>
      <div class="rc-ph-l" data-f="total net">新台幣<i>壹仟捌佰元整</i><i class="n">$1,800—</i></div>
      <div class="rc-ph-l rc-ph-d" data-f="date">中華民國<i>${roc(s.date)}</i>年<i>${d.getMonth() + 1}</i>月<i>${d.getDate()}</i>日</div>
      <div class="rc-ph-sign" data-f="seller">收款人<i>陳記水果行</i><span class="rc-seal">陳記<br>水果</span></div>
      <div class="rc-ph-foot">本收據未載統一編號</div>
    </div>`;
  }
  if (s.key === 'bill') {
    const prevM = ((d.getMonth() + 10) % 12) + 1;
    return `<div class="rc-paper rc-pb">
      <div class="rc-pb-band"><b data-f="seller">台灣電力公司</b><span>電費通知及收據</span></div>
      <div class="rc-pb-grid">
        <div><small>電號</small><b>06-12-3456-78-9</b></div>
        <div><small>用電種類</small><b>營業用（表燈）</b></div>
        <div class="w2" data-f="items"><small>計費期間</small><b>${roc(s.date)}/${pad(prevM)}/05 – ${roc(s.date)}/${pad(d.getMonth() + 1)}/04（兩個月）</b></div>
        <div><small>用電度數</small><b>812 度</b></div>
        <div><small>買受人統編</small><b>${BUYER_ID}</b></div>
      </div>
      <div class="rc-pb-amt">
        <div data-f="net"><small>電費（未稅）</small><b>${n0(s.net)}</b></div>
        <div data-f="tax"><small>營業稅</small><b>${n0(s.tax)}</b></div>
        <div class="big" data-f="total"><small>應繳總金額</small><b>${n0(s.total)}</b></div>
      </div>
      <div class="rc-pb-inv"><span data-f="invNo">發票號碼 ${s.invNo}</span><span data-f="taxId">賣方統編 ${s.taxId}</span></div>
      <div class="rc-pb-foot">
        <div class="rc-pb-bcs">${barcodeSVG('b1' + s.invNo, 200, 18)}${barcodeSVG('b2' + s.invNo, 200, 18)}${barcodeSVG('b3' + s.invNo, 200, 18)}</div>
        <div class="rc-stamp" data-f="date">超商代收<b>${roc(s.date)}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}</b>收訖</div>
      </div>
    </div>`;
  }
  if (s.key === 'uber') {
    const pm = d.getMonth() === 0 ? 12 : d.getMonth();
    const py = d.getMonth() === 0 ? d.getFullYear() - 1 : d.getFullYear();
    const last = new Date(py, pm, 0).getDate();
    return `<div class="rc-paper rc-pu">
      <div class="rc-pu-h"><b data-f="seller">Uber <i>Eats</i></b><span>商家月結對帳單</span></div>
      <div class="rc-pu-meta"><div>商家　阿美手作甜點（${BUYER_ID}）</div><div data-f="date">對帳期間 ${py}/${pad(pm)}/01 – ${pad(pm)}/${last}・開立 ${ymd(s.date)}</div></div>
      <table class="rc-pu-t">
        <tr><td>完成訂單</td><td>${s.orders} 筆</td></tr>
        <tr><td>餐點銷售總額</td><td>${n0(s.gross)}</td></tr>
        <tr data-f="items"><td>平台服務費（30%）</td><td>−${n0(s.net)}</td></tr>
        <tr><td>服務費營業稅 5%</td><td>−${n0(s.tax)}</td></tr>
        <tr class="tot"><td>本期撥款金額</td><td>${n0(s.gross - s.total)}</td></tr>
      </table>
      <div class="rc-pu-inv">
        <div class="h">服務費電子發票</div>
        <div class="row"><span data-f="invNo">${s.invNo}</span><span data-f="taxId">賣方 ${s.taxId}</span></div>
        <div class="row"><span data-f="net">銷售額 ${n0(s.net)}</span><span data-f="tax">稅額 ${n0(s.tax)}</span><span data-f="total">總計 ${n0(s.total)}</span></div>
      </div>
      <div class="rc-pu-f">撥款將於 5 個工作天內匯入您的約定帳戶</div>
    </div>`;
  }
  if (s.key === 'gads') {
    const en = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const pm = new Date(d.getFullYear(), d.getMonth() - 1, 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    return `<div class="rc-paper rc-pg">
      <div class="rc-pg-h"><span class="rc-pg-logo"><i></i><i></i><i></i></span><b>Google Ads</b></div>
      <div class="rc-pg-t">Payment receipt</div>
      <div class="rc-pg-r" data-f="date"><small>Date</small><b>${en}</b></div>
      <div class="rc-pg-r" data-f="invNo"><small>Receipt number</small><b>${s.invNo}</b></div>
      <div class="rc-pg-r"><small>Billing ID</small><b>4821-3390-1276</b></div>
      <div class="rc-pg-r"><small>Payment method</small><b>Visa •••• 4021</b></div>
      <div class="rc-pg-line" data-f="items"><span>Google Ads — ${pm} campaigns</span><b>USD ${s.usd.toFixed(2)}</b></div>
      <div class="rc-pg-r" data-f="tax"><small>Tax</small><b>USD 0.00</b></div>
      <div class="rc-pg-r tot" data-f="total net"><small>Total</small><b>USD ${s.usd.toFixed(2)}</b></div>
      <div class="rc-pg-f" data-f="seller">Google Asia Pacific Pte. Ltd.<br>Singapore</div>
      <div class="rc-pg-n">This is not a Taiwan Government Uniform Invoice.</div>
    </div>`;
  }
  return '';
}

// ---------- 狀態 ----------
let root, chart;
const S = {
  list: seedList(), carrier: carrierList(), carrierDone: false, sent: new Set(), filter: 'all',
  cur: null, run: 0, seq: 100, photoUrl: null, scanning: false, sampleKey: null,
};
const posted = () => S.list.filter(r => r.status === 'posted');

const KPI = [
  { key: 'n', label: '本月已記帳', icon: 'receipt', color: 'var(--leaf)' },
  { key: 'tax', label: '可扣抵進項稅額', icon: 'percent', color: 'var(--mint)' },
  { key: 'pend', label: '待確認', icon: 'clock', color: 'var(--amber)' },
  { key: 'time', label: '為你省下的記帳時間', icon: 'sparkle', color: 'var(--violet)' },
];

export default {
  mount(section) {
    root = section;
    const now = new Date();
    section.innerHTML = `
    <div class="rc">
      <div class="rc-kpis">${KPI.map(k => `
        <div class="kpi glass anim-in" data-k="${k.key}" style="--c:${k.color}">
          <div class="kpi-top"><span class="kpi-ic">${icon(k.icon, 18)}</span><span class="kpi-label">${k.label}</span><span class="kpi-delta" data-delta></span></div>
          <div class="kpi-val" data-val>0</div>
          <div class="kpi-sub" data-sub></div>
        </div>`).join('')}
      </div>

      <div class="rc-main">
        <div class="glass card rc-scan anim-in" id="rcScan">
          <div class="card-h"><h3>${I.camera(18)} 拍一張，AI 幫你記好帳</h3><span class="demo-badge">${icon('alert', 13)} 示範資料・辨識結果為模擬</span></div>
          <div class="rc-bed" id="rcBed">
            <i class="rc-cn tl"></i><i class="rc-cn tr"></i><i class="rc-cn bl"></i><i class="rc-cn br"></i>
            <div class="rc-drop" id="rcDrop">
              <div class="rc-drop-orb">${I.camera(40)}<i></i><i></i></div>
              <h2>拍照或拖曳收據／發票</h2>
              <p>電子發票、手寫收據、繳費單、國外收據都可以。<br>AI 會讀出金額、統編、日期，自動分類並判斷能不能扣抵。</p>
              <div class="rc-drop-btns">
                <label class="btn btn-primary btn-lg">${I.camera(18)} 拍照<input type="file" accept="image/*" capture="environment" id="rcCam" hidden></label>
                <label class="btn btn-ghost btn-lg">${I.image(18)} 選擇照片<input type="file" accept="image/*" id="rcPick" hidden></label>
              </div>
              <small>支援 JPG、PNG、HEIC・也可以直接把照片拖進來・照片只在你的瀏覽器裡顯示</small>
            </div>
            <div class="rc-stage" id="rcStage" hidden></div>
            <div class="rc-ov" id="rcOv"><div class="rc-grid" id="rcGrid"></div><div class="rc-sl" id="rcSl"></div><div class="rc-box" id="rcBox"><em></em></div></div>
            <div class="rc-dragmask">${I.upload(46)}<b>放開就開始辨識</b></div>
          </div>
          <div class="rc-steps" id="rcSteps">
            <span data-s="0">${icon('wand', 13)} 校正角度與光線</span><span data-s="1">${icon('file', 13)} 判斷單據種類</span><span data-s="2">${icon('sparkle', 13)} 讀取 8 個欄位</span><span data-s="3">${icon('shield', 13)} 檢查重複與扣抵</span>
          </div>
          <div class="rc-samples-h"><b>沒有單據在手邊？點一張示範收據試試看</b><button class="btn btn-ghost btn-sm" id="rcReset" hidden>${icon('refresh', 14)} 換一張</button></div>
          <div class="rc-samples">${SAMPLES.map(s => `
            <button class="rc-thumb" data-sample="${s.key}">
              <span class="rc-thumb-pv"><span class="rc-thumb-in">${paperHTML(s)}</span></span>
              <b>${s.label}</b><small>${s.sub}</small>
            </button>`).join('')}
          </div>
        </div>

        <div class="glass card rc-res anim-in" id="rcRes"></div>
      </div>

      <div class="rc-row2">
        <div class="glass card rc-list anim-in">
          <div class="card-h"><h3>${icon('receipt', 18)} ${now.getMonth() + 1} 月單據清單</h3>
            <div class="rc-filt" id="rcFilt">
              <button class="seg on" data-f="all">全部</button><button class="seg" data-f="pending">待確認</button><button class="seg" data-f="dup">重複疑慮</button>
            </div>
          </div>
          <div class="rc-dupwarn" id="rcDupWarn"></div>
          <div class="rc-lh"><span>日期</span><span>對象・品項</span><span>科目</span><span class="r">金額</span><span class="r">可扣抵稅額</span><span>狀態</span><span></span></div>
          <div class="rc-rows" id="rcRows"></div>
          <div class="rc-list-f"><span class="demo-badge">${icon('alert', 13)} 示範資料</span><small>來源：${Object.values(SRC).map(s => `<i style="--sc:${s.color}"></i>${s.name}`).join('')}</small></div>
        </div>
        <div class="glass card rc-chartc anim-in">
          <div class="card-h"><h3>${icon('trend', 18)} 本月費用結構</h3><span class="chip-sm">依單據自動彙整・產銷人發財</span></div>
          <div class="rc-chart" id="rcChart"></div>
          <div class="rc-five" id="rcFive"></div>
        </div>
      </div>

      <div class="rc-chs">
        <div class="glass card rc-ch anim-in" style="--cc:var(--sky)">
          <div class="rc-ch-h"><span class="rc-ch-ic">${I.mail(22)}</span><div><b>轉寄電子發票 Email</b><small>Google、Meta 廣告收據、平台月結單直接轉寄</small></div><span class="demo-badge sm">示範</span></div>
          <div class="rc-mailbox"><span class="mono" id="rcMail">bills@阿美手作甜點.greenup.ai</span><button class="icon-btn" id="rcCopy" title="複製地址">${I.copy(16)}</button></div>
          <ul class="rc-ch-ul"><li>在 Gmail 設定「自動轉寄」一次就好</li><li>AI 自動拆 PDF 附件、辨識、入帳</li><li>本月已收 <b>4</b> 封・全部自動入帳</li></ul>
        </div>
        <div class="glass card rc-ch anim-in" style="--cc:#06C755">
          <div class="rc-ch-h"><span class="rc-ch-ic">${I.line(22)}</span><div><b>LINE 傳照片給 GreenUP 小幫手</b><small>在市場買完菜，拍一張傳出去就好</small></div><span class="demo-badge sm">示範</span></div>
          <div class="rc-lchat">
            <div class="me"><span class="rc-lpic">${I.image(14)} 收據.jpg</span></div>
            <div class="bot"><b>GreenUP 小幫手</b>收到！陳記水果行 NT$1,800，已記到「進貨－原料」。這是收據、不能扣抵，有需要可以請老闆開發票喔。</div>
          </div>
          <ul class="rc-ch-ul"><li>本月 LINE 收到 <b>3</b> 張・30 秒內回覆</li></ul>
        </div>
        <div class="glass card rc-ch anim-in" style="--cc:var(--amber)">
          <div class="rc-ch-h"><span class="rc-ch-ic">${I.barcode(22)}</span><div><b>財政部手機條碼載具自動歸戶</b><small>結帳出示條碼＋報統編，發票自己跑進來</small></div><span class="demo-badge sm">示範</span></div>
          <div class="rc-carrier-code"><span>/AM8E+2Q</span>${barcodeSVG('carrier-AM8E', 240, 34)}</div>
          <ul class="rc-ch-ul"><li>每天早上 6:00 自動同步</li><li>記得報統編 <b class="mono">${BUYER_ID}</b> 才能扣抵進項</li></ul>
        </div>
      </div>

      <div class="rc-row3">
        <div class="glass card rc-carr anim-in" id="rcCarr"></div>
        <div class="glass card rc-miss anim-in" id="rcMiss"></div>
      </div>

      <div class="glass card rc-rules anim-in">
        <div class="card-h"><h3>${icon('shield', 18)} AI 怎麼判斷能不能扣抵？</h3><span class="demo-badge">${icon('alert', 13)} 示範說明</span></div>
        <div class="rc-rules-g">
          <div class="ok"><b>${icon('check', 15)} 可以扣抵進項稅額</b><ul><li>載有公司統編的三聯式發票、電子發票</li><li>載明買受人統編與稅額的水電、電信繳費憑證</li><li>平台開給你的服務費電子發票（如外送平台抽成）</li></ul></div>
          <div class="no"><b>${icon('x', 15)} 不能扣抵，只能列費用</b><ul><li>手寫收據、免用統一發票收據</li><li>結帳時沒報統編的發票（二聯式、載具未報統編）</li><li>交際應酬、9 人座以下自用小客車相關支出</li><li>國外收據（境外電商的電子勞務，由境外業者依跨境電商規定處理）</li></ul></div>
          <div class="warn"><b>${icon('alert', 15)} AI 會提醒你確認</b><ul><li>假日加油、金額偏高的餐飲</li><li>看起來像家用品的購物</li><li>同一張發票號碼重複上傳</li></ul></div>
        </div>
        <p class="rc-law">依營業稅法規定，實際以會計師／記帳士判斷為準。本頁所有單據、統編與金額皆為虛構示範資料。</p>
      </div>
    </div>`;

    bind();
    renderEmptyResult();
    renderList();
    renderCarrier();
    renderMissing();
    chart = makeChart($('#rcChart', root));
    renderChart();
    renderKpis(true);
  },
  show() { if (chart) setTimeout(() => chart.resize(), 60); },
  hide() { if (S.scanning) resetScan(); else S.run++; },
};

// ---------- 事件 ----------
function bind() {
  $$('[data-sample]', root).forEach(b => b.addEventListener('click', () => {
    const s = SAMPLES.find(x => x.key === b.dataset.sample);
    $$('.rc-thumb', root).forEach(t => t.classList.toggle('on', t === b));
    gsap.fromTo(b, { scale: 0.94 }, { scale: 1, duration: 0.4, ease: 'back.out(3)' });
    startScan(s);
    if (innerWidth <= 1280) $('#rcBed', root).scrollIntoView({ behavior: 'smooth', block: 'start' });
  }));
  const onFile = (f) => {
    if (!f) return;
    if (!/^image\//.test(f.type)) { toast('這不是圖片檔', '請拍照或選擇 JPG、PNG 照片', { kind: 'warn', icon: icon('alert', 18) }); return; }
    if (S.photoUrl) URL.revokeObjectURL(S.photoUrl);
    S.photoUrl = URL.createObjectURL(f);
    $$('.rc-thumb', root).forEach(t => t.classList.remove('on'));
    startScan(uploadResult(), S.photoUrl);
  };
  $('#rcCam', root).addEventListener('change', (e) => { onFile(e.target.files[0]); e.target.value = ''; });
  $('#rcPick', root).addEventListener('change', (e) => { onFile(e.target.files[0]); e.target.value = ''; });
  const card = $('#rcScan', root);
  let dc = 0;
  card.addEventListener('dragenter', (e) => { e.preventDefault(); dc++; card.classList.add('drag'); });
  card.addEventListener('dragover', (e) => { e.preventDefault(); });
  card.addEventListener('dragleave', () => { if (--dc <= 0) { dc = 0; card.classList.remove('drag'); } });
  card.addEventListener('drop', (e) => { e.preventDefault(); dc = 0; card.classList.remove('drag'); onFile(e.dataTransfer?.files?.[0]); });
  $('#rcReset', root).addEventListener('click', resetScan);

  $('#rcFilt', root).addEventListener('click', (e) => {
    const b = e.target.closest('[data-f]'); if (!b) return;
    S.filter = b.dataset.f; $$('#rcFilt .seg', root).forEach(x => x.classList.toggle('on', x === b)); renderList();
  });
  $('#rcRows', root).addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    const r = S.list.find(x => x.id === b.dataset.id); if (!r) return;
    const row = b.closest('.rc-row');
    if (b.dataset.act === 'ok') {
      r.status = 'posted';
      toast(`已確認入帳｜${r.seller}`, `${money(r.total)}・${ACC[r.acct].name}`, { icon: icon('check', 18) });
      renderAll();
    } else if (b.dataset.act === 'del') {
      gsap.to(row, { opacity: 0, x: 40, height: 0, paddingTop: 0, paddingBottom: 0, duration: 0.4, onComplete: () => {
        S.list = S.list.filter(x => x !== r);
        toast('已刪除重複單據', `${r.seller}・發票 ${r.invNo}，避免費用重複入帳`, { kind: 'info', icon: I.trash(18) });
        renderAll();
      } });
    }
  });
  $('#rcCopy', root).addEventListener('click', () => {
    const t = $('#rcMail', root).textContent;
    try { navigator.clipboard?.writeText(t).catch(() => {}); } catch { /* ignore */ }
    toast('已複製轉寄地址', `${t}（示範）`, { icon: I.mail(18) });
  });
  let rt;
  window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { if (!root || root.hidden) return; if (S.cur && !S.scanning) fitStage(); }, 200); });
}

// ---------- 掃描 ----------
function resetScan() {
  S.run++; S.scanning = false; S.cur = null;
  $('#rcStage', root).hidden = true; $('#rcStage', root).innerHTML = '';
  $('#rcDrop', root).hidden = false;
  $('#rcReset', root).hidden = true;
  clearMarks();
  $$('.rc-thumb', root).forEach(t => t.classList.remove('on'));
  $$('#rcSteps span', root).forEach(s => s.className = '');
  gsap.fromTo('#rcDrop', { opacity: 0, scale: 0.97 }, { opacity: 1, scale: 1, duration: 0.4 });
  renderEmptyResult();
}
function clearMarks() {
  $$('.rc-mark', root).forEach(m => m.remove());
  gsap.set(['#rcBox', '#rcSl', '#rcGrid'], { opacity: 0 });
}

function fitStage() {
  const bed = $('#rcBed', root), stage = $('#rcStage', root);
  const paper = $('.rc-paper', stage), fit = $('.rc-fit', stage);
  if (!paper || !fit) return;
  const bw = bed.clientWidth - 36, bh = bed.clientHeight - 36;
  const pw = paper.offsetWidth, ph = paper.offsetHeight;
  const sc = Math.min(1.15, bw / pw, bh / ph);
  fit.style.width = pw * sc + 'px'; fit.style.height = ph * sc + 'px';
  paper.style.transform = `scale(${sc})`;
  if (!S.scanning) { clearMarks(); drawAllMarks(); }
}

function rectOf(k) {
  const bed = $('#rcBed', root).getBoundingClientRect();
  const c = S.cur;
  if (c.boxes) {
    const img = $('.rc-photo', root); if (!img || !c.boxes[k]) return null;
    const ir = img.getBoundingClientRect(); const [x, y, w, h] = c.boxes[k];
    return { left: ir.left - bed.left + ir.width * x / 100, top: ir.top - bed.top + ir.height * y / 100, width: ir.width * w / 100, height: ir.height * h / 100 };
  }
  const n = $(`.rc-stage [data-f~="${k}"]`, root); if (!n) return null;
  const r = n.getBoundingClientRect();
  return { left: r.left - bed.left - 4, top: r.top - bed.top - 3, width: r.width + 8, height: r.height + 6 };
}
function targetRect() {
  const bed = $('#rcBed', root).getBoundingClientRect();
  const t = $('.rc-photo', root) || $('.rc-paper', root);
  const r = t.getBoundingClientRect();
  return { left: r.left - bed.left, top: r.top - bed.top, width: r.width, height: r.height };
}
function addMark(k, r, conf) {
  const m = el(`<div class="rc-mark ${confCls(conf)}" style="left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px"><em>${FIELDS.find(f => f.k === k).label}</em></div>`);
  $('#rcOv', root).appendChild(m);
  return m;
}
function drawAllMarks() { if (!S.cur) return; for (const f of FIELDS) { const r = rectOf(f.k); if (r) addMark(f.k, r, S.cur.conf[f.k]); } }
const confCls = (c) => (c >= 95 ? 'hi' : c >= 88 ? 'mid' : 'lo');

async function startScan(s, photo) {
  const token = ++S.run;
  S.scanning = true;
  S.cur = { ...s, conf: { ...s.conf }, id: 'R' + (++S.seq) };
  $('#rcDrop', root).hidden = true;
  $('#rcReset', root).hidden = false;
  const stage = $('#rcStage', root);
  stage.hidden = false;
  stage.innerHTML = photo
    ? `<div class="rc-photo-wrap"><img class="rc-photo" alt="上傳的單據照片" src="${photo}"></div>`
    : `<div class="rc-fit">${paperHTML(s)}</div>`;
  clearMarks();
  renderResultShell();
  if (photo) {
    const img = $('.rc-photo', stage);
    await new Promise(res => { if (img.complete && img.naturalWidth) res(); else { img.onload = res; img.onerror = res; } });
  } else fitStage();
  if (token !== S.run) return;

  const steps = $$('#rcSteps span', root);
  const setStep = (i) => steps.forEach((x, j) => x.className = j < i ? 'done' : j === i ? 'on' : '');
  setStep(0);
  const target = photo ? $('.rc-photo', stage) : $('.rc-paper', stage);
  gsap.fromTo(target, { opacity: 0, y: 30, rotate: photo ? 0 : -3, filter: 'brightness(0.6) blur(2px)' }, { opacity: 1, y: 0, rotate: 0, filter: 'brightness(1) blur(0px)', duration: 0.7, ease: 'power3.out' });
  await sleep(500);
  if (token !== S.run) return;

  // 掃描線
  const tr = targetRect();
  const sl = $('#rcSl', root), grid = $('#rcGrid', root);
  gsap.set(grid, { left: tr.left, top: tr.top, width: tr.width, height: tr.height });
  gsap.set(sl, { left: tr.left - 10, width: tr.width + 20, top: tr.top, opacity: 1 });
  gsap.to(grid, { opacity: 1, duration: 0.3 });
  setStatus('AI 正在掃描單據…');
  await gsap.to(sl, { top: tr.top + tr.height, duration: 1.0, ease: 'sine.inOut', yoyo: true, repeat: 1 });
  if (token !== S.run) return;
  setStep(1);
  setStatus(`判斷為：<b>${DOC[s.doc]}</b>${s.doc === 'foreign' ? '・英文，AI 自動翻譯並換算台幣' : ''}`);
  $('#rcDocType', root).textContent = DOC[s.doc];
  gsap.fromTo('#rcDocType', { scale: 0.6, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.4, ease: 'back.out(2)' });
  gsap.to(sl, { top: tr.top, duration: 0.5, ease: 'power2.out' });
  await sleep(450);
  if (token !== S.run) return;

  // 逐欄框選
  setStep(2);
  const box = $('#rcBox', root);
  gsap.to(sl, { opacity: 0, duration: 0.3 });
  let first = true, i = 0;
  for (const f of FIELDS) {
    if (token !== S.run) return;
    const r = rectOf(f.k);
    const conf = S.cur.conf[f.k];
    if (r) {
      $('em', box).textContent = `${f.label} ${conf}%`;
      box.className = 'rc-box ' + confCls(conf);
      if (first) { gsap.set(box, { ...r, opacity: 1 }); first = false; }
      else gsap.to(box, { ...r, opacity: 1, duration: 0.26, ease: 'power3.out' });
      await sleep(260);
      const m = addMark(f.k, r, conf);
      gsap.fromTo(m, { opacity: 0 }, { opacity: 1, duration: 0.3 });
    }
    fillField(f, i++);
    await sleep(r ? 140 : 60);
  }
  gsap.to(box, { opacity: 0, duration: 0.3 });
  gsap.to(grid, { opacity: 0, duration: 0.5 });
  if (token !== S.run) return;
  setStep(3);
  setStatus('比對重複發票、判斷能否扣抵…');
  await sleep(450);
  if (token !== S.run) return;
  steps.forEach(x => x.className = 'done');
  S.scanning = false;
  const avg = Math.round(FIELDS.reduce((a, f) => a + S.cur.conf[f.k], 0) / FIELDS.length);
  setStatus(`辨識完成・平均信心 <b>${avg}%</b>・花了 3.4 秒`);
  renderJudge(true);
  if (innerWidth <= 1280) setTimeout(() => { if (token === S.run) $('#rcRes', root).scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 500);
}
function setStatus(h) { const n = $('#rcStatus', root); if (n) n.innerHTML = h; }

// ---------- 結果卡 ----------
function renderEmptyResult() {
  const box = $('#rcRes', root);
  box.innerHTML = `
    <div class="card-h"><h3>${icon('sparkle', 18)} AI 辨識結果</h3><span class="demo-badge">${icon('alert', 13)} 示範資料</span></div>
    <div class="rc-empty">
      <div class="rc-empty-flow">
        <div><span>${I.camera(26)}</span><b>1. 拍照</b><small>或轉寄、LINE 傳</small></div>
        <i>${icon('arrow', 18)}</i>
        <div><span>${icon('sparkle', 26)}</span><b>2. AI 讀單</b><small>8 個欄位約 3 秒</small></div>
        <i>${icon('arrow', 18)}</i>
        <div><span>${icon('check', 26)}</span><b>3. 你按確認</b><small>分錄自動產生</small></div>
      </div>
      <p>選左邊一張示範收據，或拍一張你的發票。<br>AI 會幫你：<b>分類到產銷人發財</b>、<b>判斷能不能扣抵</b>、<b>提醒可能的私人支出</b>、<b>抓出重複上傳</b>。</p>
      <div class="rc-empty-stats"><div><b>98.2%</b><small>欄位辨識準確率（示範）</small></div><div><b>3.4 秒</b><small>平均一張</small></div><div><b>6 分鐘</b><small>手動輸入一張</small></div></div>
    </div>`;
  gsap.fromTo($$('.rc-empty-flow > div', box), { opacity: 0, y: 14 }, { opacity: 1, y: 0, stagger: 0.12, duration: 0.5 });
}

function renderResultShell() {
  const c = S.cur;
  const box = $('#rcRes', root);
  box.innerHTML = `
    <div class="card-h"><h3>${icon('sparkle', 18)} AI 辨識結果 <span class="chip-sm" id="rcDocType">辨識中…</span></h3><span class="demo-badge">${icon('alert', 13)} 示範資料</span></div>
    <div class="rc-status" id="rcStatus"><span class="rc-spin"></span> 準備中…</div>
    <div class="rc-fields">${FIELDS.map(f => `
      <label class="rc-fd ${f.span}" data-k="${f.k}">
        <span class="rc-fl">${f.label}<em class="rc-cf">—</em></span>
        <span class="rc-iw"><input class="rc-in ${f.num ? 'num' : ''}" data-k="${f.k}" disabled placeholder="　"><i class="rc-shim"></i></span>
      </label>`).join('')}
    </div>
    <div class="rc-judge" id="rcJudge"></div>`;
  $$('.rc-in', box).forEach(inp => inp.addEventListener('change', () => onEdit(inp)));
}
function fieldVal(k) {
  const c = S.cur;
  if (k === 'date') return ymd(c.date);
  if (k === 'net' || k === 'tax' || k === 'total') return n0(c[k]);
  if (k === 'taxId') return c.taxId || '（無統編）';
  if (k === 'invNo') return c.invNo || '（無發票號碼）';
  return c[k] || '';
}
function fillField(f, i) {
  const lab = $(`.rc-fd[data-k="${f.k}"]`, root); if (!lab) return;
  const inp = $('input', lab), cf = $('.rc-cf', lab);
  const conf = S.cur.conf[f.k];
  inp.disabled = false; inp.value = fieldVal(f.k);
  lab.classList.add('got', confCls(conf));
  if (!S.cur[f.k] && (f.k === 'taxId' || f.k === 'invNo')) lab.classList.add('none');
  cf.textContent = conf + '%';
  cf.title = conf >= 95 ? 'AI 很有把握' : conf >= 88 ? '大致正確，建議看一眼' : '字跡不清，請確認';
  gsap.fromTo(lab, { backgroundColor: 'rgba(94,224,196,0.28)' }, { backgroundColor: 'rgba(255,255,255,0.03)', duration: 0.9 });
  gsap.fromTo(inp, { opacity: 0, x: -8 }, { opacity: 1, x: 0, duration: 0.3, delay: i * 0.005 });
}

function onEdit(inp) {
  const c = S.cur; if (!c) return;
  const k = inp.dataset.k; const v = inp.value.trim();
  const num = (x) => Math.max(0, Math.round(parseFloat(String(x).replace(/[^\d.]/g, '')) || 0));
  if (k === 'net' || k === 'tax') { c[k] = num(v); c.total = c.net + c.tax; }
  else if (k === 'total') {
    c.total = num(v);
    if (c.tax > 0) { c.net = Math.round(c.total / 1.05); c.tax = c.total - c.net; } else c.net = c.total;
  } else if (k === 'date') { const m = v.match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})/); if (m) c.date = new Date(+m[1], +m[2] - 1, +m[3], 12).getTime(); }
  else if (k === 'taxId') c.taxId = /^\d{8}$/.test(v) ? v : '';
  else if (k === 'invNo') c.invNo = /無/.test(v) ? '' : v.toUpperCase();
  else c[k] = v;
  c.conf[k] = 100;
  for (const f of FIELDS) { const i = $(`.rc-in[data-k="${f.k}"]`, root); if (i && i !== document.activeElement) i.value = fieldVal(f.k); }
  inp.value = fieldVal(k);
  const lab = inp.closest('.rc-fd'); lab.classList.remove('mid', 'lo', 'none'); lab.classList.add('hi', 'edited'); $('.rc-cf', lab).textContent = '已修改';
  renderJudge(false);
}

function journal(c) {
  const d = deduct(c), cr = PAY_MAP[c.pay].name;
  if (ACC[c.acct].personal) return [['借', '業主往來（私人支出）', c.total], ['貸', cr, c.total]];
  if (d.ok) return [['借', ACC[c.acct].name, c.net], ['借', '進項稅額', c.tax], ['貸', cr, c.total]];
  return [['借', ACC[c.acct].name, c.total], ['貸', cr, c.total]];
}
const jHTML = (c) => `<div class="rc-jn">${journal(c).map(([s, a, v]) => `<div class="${s === '借' ? 'dr' : 'cr'}"><em>${s}</em><span>${a}</span><b>${n0(v)}</b></div>`).join('')}</div>`;

function renderJudge(anim) {
  const c = S.cur; if (!c) return;
  const f = fiveOf(c.acct), d = deduct(c), p = c.personalOk ? null : personalCheck(c);
  const dup = c.invNo ? S.list.find(x => x.invNo === c.invNo && x.status !== 'dup') : null;
  const j = $('#rcJudge', root);
  j.innerHTML = `
    <div class="rc-j-row">
      <div class="rc-j-cls" style="--fc:${f.color}">
        <span class="rc-five-k">${f.k}</span>
        <div><small>AI 分類・${f.name}</small>
          <select class="rc-sel" id="rcAcct">${FIVE.map(fv => `<optgroup label="${fv.k}・${fv.name}">${ACCOUNTS.filter(a => a.five === fv.id).map(a => `<option value="${a.id}" ${a.id === c.acct ? 'selected' : ''}>${a.name}</option>`).join('')}</optgroup>`).join('')}</select>
        </div>
      </div>
      <div class="rc-j-pay"><small>付款方式（貸方）</small>
        <select class="rc-sel" id="rcPay">${PAY.map(x => `<option value="${x.id}" ${x.id === c.pay ? 'selected' : ''}>${x.name}</option>`).join('')}</select>
      </div>
    </div>
    ${c.doc === 'foreign' ? `<div class="rc-fx">${icon('globe', 15)} 英文收據 USD ${c.usd.toFixed(2)} × 匯率 ${USD_RATE.toFixed(1)}（${fmtMD(c.date)} 示範匯率）＝ NT$ ${n0(c.total)}</div>` : ''}
    <div class="rc-verdict ${d.ok ? 'ok' : 'no'}">
      <div class="rc-v-ic">${d.ok ? icon('check', 20) : icon('x', 20)}</div>
      <div><b>${d.ok ? `可扣抵進項稅額 NT$ ${n0(d.amt)}` : '不可扣抵進項稅額'}</b><p>${esc(d.why)}</p><small>依營業稅法規定，實際以會計師／記帳士判斷為準</small></div>
    </div>
    ${p ? `<div class="rc-alert warn"><div class="rc-v-ic">${icon('alert', 20)}</div><div><b>可能是個人支出？</b><p>${esc(p.msg)}</p>
      <div class="rc-alert-btns"><button class="btn btn-ghost btn-sm" data-pv="biz">${icon('check', 14)} 是公務${c.acct === 'fuel' ? '（送貨用車）' : ''}</button><button class="btn btn-ghost btn-sm" data-pv="own">${icon('user', 14)} 是私人，不列公司帳</button></div></div></div>` : ''}
    ${ACC[c.acct].personal ? `<div class="rc-alert info"><div class="rc-v-ic">${icon('user', 20)}</div><div><b>已標記為私人支出</b><p>記在「業主往來」，不算公司費用，報稅時不會被剔除。</p></div></div>` : ''}
    ${dup ? `<div class="rc-alert dup"><div class="rc-v-ic">${icon('alert', 20)}</div><div><b>AI 發現重複上傳！</b><p>發票 ${esc(c.invNo)} 已在 ${fmtMD(dup.date)} 透過「${SRC[dup.src].name}」入帳（${esc(dup.seller)} ${money(dup.total)}）。重複入帳會多報費用。</p></div></div>` : ''}
    <div class="rc-j-jn"><small>${icon('book', 14)} 確認後自動產生的分錄</small>${jHTML(c)}</div>
    <div class="rc-actions">
      ${dup ? `<button class="btn btn-ghost" id="rcSkip">${icon('x', 16)} 略過這張</button><button class="btn btn-ghost" id="rcDupSave">仍要存檔（標記重複）</button>`
    : `<button class="btn btn-ghost" id="rcLater">${icon('clock', 16)} 先存待確認</button><button class="btn btn-primary btn-lg" id="rcOk">${icon('check', 18)} 確認入帳</button>`}
    </div>`;
  if (anim) gsap.fromTo($$(':scope > *', j), { opacity: 0, y: 14 }, { opacity: 1, y: 0, stagger: 0.07, duration: 0.45, ease: 'power3.out' });
  $('#rcAcct', j).addEventListener('change', (e) => { c.acct = e.target.value; c.personalOk = c.acct !== 'owner' && c.personalOk; renderJudge(false); });
  $('#rcPay', j).addEventListener('change', (e) => { c.pay = e.target.value; renderJudge(false); });
  $$('[data-pv]', j).forEach(b => b.addEventListener('click', () => {
    if (b.dataset.pv === 'biz') { c.personalOk = true; toast('已標記為公務支出', 'AI 會記住：送貨用車的油資照常入帳', { icon: icon('check', 18) }); }
    else { c.prevAcct = c.acct; c.acct = 'owner'; c.personalOk = true; toast('已改列私人支出', '記入業主往來，不列公司費用', { kind: 'info', icon: icon('user', 18) }); }
    renderJudge(false);
  }));
  $('#rcOk', j)?.addEventListener('click', () => {
    if (p) {
      const w = $('.rc-alert.warn', j);
      gsap.fromTo(w, { x: -8 }, { x: 0, duration: 0.5, ease: 'elastic.out(1.2, 0.3)' });
      toast('先確認一下這筆是不是公務', '按「是公務」或「是私人」，AI 就會幫你正確入帳', { kind: 'warn', icon: icon('alert', 18) });
      return;
    }
    commit('posted');
  });
  $('#rcLater', j)?.addEventListener('click', () => commit('pending'));
  $('#rcDupSave', j)?.addEventListener('click', () => commit('dup'));
  $('#rcSkip', j)?.addEventListener('click', () => { toast('已略過重複單據', `發票 ${c.invNo} 不會重複入帳`, { kind: 'info', icon: icon('shield', 18) }); resetScan(); });
}

function commit(status, unconfirmedWarn) {
  const c = S.cur; if (!c) return;
  const rec = { id: c.id, src: c.src === 'email' ? 'photo' : c.src, doc: c.doc === 'photo' ? 'einv' : c.doc, seller: c.seller, taxId: c.taxId, buyerId: c.buyerId, invNo: c.invNo,
    items: c.items, total: c.total, net: c.net, tax: c.tax, acct: c.acct, pay: c.pay, status, date: c.date, note: unconfirmedWarn ? '私人支出待確認' : '', hint: c.hint, isNew: true };
  S.list.unshift(rec);
  const d = deduct(rec);
  const box = $('#rcRes', root);
  const title = status === 'posted' ? '已入帳！' : status === 'dup' ? '已存檔，標記重複疑慮' : '已存成待確認';
  box.innerHTML = `
    <div class="card-h"><h3>${icon('check', 18)} ${title}</h3><span class="demo-badge">${icon('alert', 13)} 示範資料</span></div>
    <div class="rc-done">
      <div class="rc-done-ic ${status}">${status === 'posted' ? icon('check', 40) : icon('clock', 40)}<i></i></div>
      <h2>${esc(rec.seller)}<b>${money(rec.total)}</b></h2>
      <p>${fiveOf(rec.acct).k}・${ACC[rec.acct].name}${d.ok ? `・進項稅額 <b>${n0(d.amt)}</b> 已列入本期可扣抵` : '・不可扣抵'}${unconfirmedWarn ? '<br>還有一個「可能是私人支出」的提醒沒確認，先放在待確認。' : ''}</p>
      <div class="rc-j-jn"><small>${icon('book', 14)} 分錄${status === 'posted' ? '（已過帳）' : '（草稿）'}</small>${jHTML(rec)}</div>
      <div class="rc-actions"><button class="btn btn-primary" id="rcNext">${I.camera(16)} 再記一張</button><a class="btn btn-ghost" href="#books">${icon('book', 16)} 看會計帳務</a></div>
    </div>`;
  const ic = $('.rc-done-ic', box);
  gsap.fromTo(ic, { scale: 0.3, rotate: -40, opacity: 0 }, { scale: 1, rotate: 0, opacity: 1, duration: 0.7, ease: 'back.out(2.2)' });
  gsap.fromTo($$('.rc-jn > div', box), { opacity: 0, x: -16 }, { opacity: 1, x: 0, stagger: 0.12, duration: 0.4, delay: 0.3 });
  $('#rcNext', box).addEventListener('click', resetScan);
  if (status === 'posted') toast(`已入帳｜${rec.seller}`, `${money(rec.total)}・${ACC[rec.acct].name}${d.ok ? `・可扣抵 ${money(d.amt)}` : ''}`, { icon: icon('check', 18) });
  else if (status === 'dup') toast('已標記重複疑慮', `發票 ${rec.invNo} 在清單中以紅色標示，月底結帳前請處理`, { kind: 'warn', icon: icon('alert', 18) });
  else toast('已存成待確認', `${rec.seller} ${money(rec.total)}・在清單按「確認」即可入帳`, { kind: 'warn', icon: icon('clock', 18) });
  S.cur = null;
  if (S.filter !== 'all') { S.filter = 'all'; $$('#rcFilt .seg', root).forEach(x => x.classList.toggle('on', x.dataset.f === 'all')); }
  renderAll();
}

// ---------- 清單 ----------
function renderAll() { renderList(); renderChart(); renderKpis(); }

function stHTML(r) {
  if (r.status === 'posted') return '<span class="st paid">已入帳</span>';
  if (r.status === 'pending') return '<span class="st pending">待確認</span>';
  return '<span class="st rc-st-dup">重複疑慮</span>';
}
function renderList() {
  const rows = S.list.filter(r => S.filter === 'all' || r.status === S.filter).sort((a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0) || b.date - a.date);
  const dups = S.list.filter(r => r.status === 'dup');
  $('#rcDupWarn', root).innerHTML = dups.length ? `<div class="rc-alert dup sm"><div class="rc-v-ic">${icon('alert', 16)}</div><div><b>AI 偵測到 ${dups.length} 張重複上傳</b><p>${dups.map(r => `${esc(r.seller)} 發票 ${esc(r.invNo)}`).join('、')}：同一張發票從不同管道進來兩次，刪掉重複的就不會多報費用。</p></div></div>` : '';
  const host = $('#rcRows', root);
  host.innerHTML = rows.length ? rows.map(r => {
    const f = fiveOf(r.acct), d = deduct(r), sc = SRC[r.src] || SRC.photo;
    return `<div class="rc-row ${r.status} ${r.isNew ? 'new' : ''}" data-id="${r.id}">
      <span class="rc-c-d"><b>${fmtMD(r.date)}</b><small>週${wk(r.date)}</small></span>
      <span class="rc-c-v"><b>${esc(r.seller)}</b><small><i class="rc-src" style="--sc:${sc.color}">${sc.name}</i>${esc(r.items)}${r.note ? `・<em>${esc(r.note)}</em>` : ''}</small></span>
      <span class="rc-c-a" style="--fc:${f.color}"><i>${f.k}</i>${ACC[r.acct].name}</span>
      <span class="rc-c-m r"><b>${n0(r.total)}</b></span>
      <span class="rc-c-t r">${d.ok ? `<em class="rc-mlab">可扣抵</em><b>${n0(d.amt)}</b>` : '<small>不可扣抵</small>'}</span>
      <span class="rc-c-s">${stHTML(r)}</span>
      <span class="rc-c-x">${r.status === 'pending' ? `<button class="btn btn-ghost btn-sm" data-act="ok" data-id="${r.id}">${icon('check', 13)} 確認</button>` : r.status === 'dup' ? `<button class="btn btn-ghost btn-sm rc-del" data-act="del" data-id="${r.id}">${I.trash(13)} 刪除</button>` : ''}</span>
    </div>`;
  }).join('') : `<div class="rc-none">${icon('check', 22)}<span>這裡沒有需要處理的單據</span></div>`;
  const nw = $$('.rc-row.new', host);
  if (nw.length) {
    gsap.fromTo(nw, { backgroundColor: 'rgba(94,224,196,0.25)', x: -20, opacity: 0 }, { backgroundColor: 'rgba(94,224,196,0)', x: 0, opacity: 1, duration: 1.2, ease: 'power3.out', clearProps: 'backgroundColor,transform' });
    S.list.forEach(r => { r.isNew = false; });
  }
}

function renderKpis(first) {
  const p = posted();
  const tax = p.reduce((s, r) => s + (deduct(r).ok ? r.tax : 0), 0);
  const pend = S.list.filter(r => r.status !== 'posted');
  const dup = S.list.filter(r => r.status === 'dup').length;
  const docs = S.list.filter(r => r.status !== 'dup').length;
  const hrs = docs * MIN_PER_DOC / 60;
  const set = (k, v, opt, sub, delta) => {
    const card = $(`.kpi[data-k="${k}"]`, root);
    countUp($('[data-val]', card), v, opt);
    $('[data-sub]', card).innerHTML = sub;
    const dl = $('[data-delta]', card); dl.textContent = delta?.[0] || ''; dl.className = 'kpi-delta ' + (delta?.[1] || '');
    if (!first) { card.classList.remove('flash'); void card.offsetWidth; card.classList.add('flash'); }
  };
  const viaAuto = p.filter(r => r.src !== 'photo').length;
  set('n', p.length, { suffix: ' 張' }, `其中 ${viaAuto} 張由 Email／LINE／載具自動進來`, ['AI 自動', 'up']);
  set('tax', tax, { prefix: 'NT$ ' }, '本期營業稅可少繳這麼多', ['省稅', 'up']);
  set('pend', pend.length, { suffix: ' 張' }, dup ? `含 ${dup} 張重複疑慮` : '都處理好了', pend.length ? ['要看一下', 'warn'] : ['清空', 'up']);
  set('time', hrs, { decimals: 1, suffix: ' 小時' }, `以每張手動輸入 ${MIN_PER_DOC} 分鐘估算・共 ${docs} 張`, null);
}

function renderChart() {
  const rows = S.list.filter(r => r.status !== 'dup' && !ACC[r.acct].personal);
  const by = {};
  for (const r of rows) by[r.acct] = (by[r.acct] || 0) + bookAmt(r);
  const order = FIVE.flatMap(f => ACCOUNTS.filter(a => a.five === f.id).map(a => a.id)).filter(id => by[id]);
  const total = order.reduce((s, id) => s + by[id], 0);
  const seen = {};
  const data = order.map(id => {
    const f = fiveOf(id); seen[f.id] = (seen[f.id] || 0) + 1;
    const op = [1, 0.72, 0.52, 0.38][(seen[f.id] - 1) % 4];
    return { name: ACC[id].name, value: Math.round(by[id]), itemStyle: { color: f.color, opacity: op }, five: f };
  });
  const fives = FIVE.map(f => ({ ...f, v: data.filter(d => d.five.id === f.id).reduce((s, d) => s + d.value, 0) }));
  const small = innerWidth <= 860;
  chart.setOption({
    animationDuration: 1100,
    tooltip: { trigger: 'item', formatter: p => `${p.marker}${p.name}<br/><b>NT$ ${p.value.toLocaleString()}</b>（${p.percent}%）` },
    title: { text: (total / 10000).toFixed(1) + ' 萬', subtext: '本月單據費用', left: 'center', top: 'center', itemGap: 4,
      textStyle: { fontSize: small ? 18 : 22, color: '#eafff4', fontWeight: 800, fontFamily: CF }, subtextStyle: { color: 'rgba(214,240,226,0.6)', fontSize: 11, fontFamily: CF } },
    series: [
      { type: 'pie', radius: ['30%', '40%'], center: ['50%', '50%'], silent: true, label: { show: false }, itemStyle: { borderColor: 'rgba(6,26,19,.8)', borderWidth: 2 },
        data: fives.filter(f => f.v).map(f => ({ name: f.name, value: f.v, itemStyle: { color: f.color, opacity: 0.35 } })) },
      { type: 'pie', radius: ['46%', '70%'], center: ['50%', '50%'], padAngle: 1.5, itemStyle: { borderRadius: 5, borderColor: 'rgba(6,26,19,.6)', borderWidth: 1 },
        label: { show: !small, color: 'rgba(214,240,226,0.8)', fontSize: 11, fontFamily: CF, formatter: p => `${p.name.replace(/（.*/, '')}\n${p.percent.toFixed(0)}%`, lineHeight: 14 },
        minShowLabelAngle: 18,
        labelLine: { show: !small, length: 8, length2: 8, lineStyle: { color: 'rgba(255,255,255,0.25)' } },
        emphasis: { scale: true, scaleSize: 6 }, data },
    ],
  }, true);
  $('#rcFive', root).innerHTML = fives.map(f => `
    <div class="rc-five-i" style="--fc:${f.color}"><span class="rc-five-k">${f.k}</span><div><small>${f.name}${f.id === 'hr' && !f.v ? '<em>（薪資由排班模組自動入帳）</em>' : ''}</small><b>${n0(f.v)}</b></div><i style="--w:${total ? (f.v / total * 100).toFixed(1) : 0}%"></i></div>`).join('');
}

// ---------- 載具自動匯入 ----------
function renderCarrier() {
  const box = $('#rcCarr', root);
  if (S.carrierDone) {
    box.innerHTML = `<div class="card-h"><h3>${I.barcode(18)} 載具歸戶・自動匯入</h3><span class="demo-badge">${icon('alert', 13)} 示範資料</span></div>
      <div class="rc-none big">${icon('check', 30)}<b>8 張載具發票都匯入了</b><span>下次自動同步：明天早上 6:00</span></div>`;
    return;
  }
  const list = S.carrier;
  const tax = list.filter(r => r.sel !== false).reduce((s, r) => s + (deduct(r).ok ? r.tax : 0), 0);
  box.innerHTML = `
    <div class="card-h"><h3>${I.barcode(18)} 載具歸戶・自動匯入 <span class="chip-sm">今天 06:00 同步 ${list.length} 張</span></h3><span class="demo-badge">${icon('alert', 13)} 示範資料</span></div>
    <p class="rc-sub">AI 已經幫每張發票選好科目。有 <b class="rc-wi">${icon('alert', 13)}</b> 的請看一眼，其他直接按匯入就好。</p>
    <div class="rc-cr-list">${list.map(r => {
      const f = fiveOf(r.acct), d = deduct(r), p = personalCheck(r);
      return `<label class="rc-cr ${p ? 'warn' : ''}" data-id="${r.id}">
        <input type="checkbox" ${r.sel === false ? '' : 'checked'}><i class="rc-ck">${icon('check', 12)}</i>
        <span class="rc-cr-d">${fmtMD(r.date)}<small>週${wk(r.date)}</small></span>
        <span class="rc-cr-v"><b>${esc(r.seller)}</b><small>${esc(r.items)}</small></span>
        <span class="rc-cr-a" style="--fc:${f.color}"><i>${f.k}</i>${ACC[r.acct].name.replace(/（.*/, '')}</span>
        <span class="rc-cr-m">${n0(r.total)}</span>
        <span class="rc-cr-t">${d.ok ? `<b>扣抵 ${n0(d.amt)}</b>` : `<small>${r.buyerId ? '不可扣抵' : '沒報統編'}</small>`}</span>
        ${p ? `<span class="rc-cr-w">${icon('alert', 13)} ${esc(p.msg)}</span>` : ''}
      </label>`;
    }).join('')}</div>
    <div class="rc-cr-f"><small>勾選的發票可扣抵 <b>NT$ ${n0(tax)}</b>・${list.filter(r => !r.buyerId).length} 張結帳時沒報統編，只能列費用</small>
      <button class="btn btn-primary" id="rcImport">${icon('check', 16)} 確認匯入（${list.filter(r => r.sel !== false).length} 張）</button></div>`;
  $$('.rc-cr input', box).forEach(cb => cb.addEventListener('change', () => {
    const r = list.find(x => x.id === cb.closest('.rc-cr').dataset.id); r.sel = cb.checked; renderCarrier();
  }));
  $('#rcImport', box).addEventListener('click', () => {
    const pick = list.filter(r => r.sel !== false);
    if (!pick.length) { toast('沒有勾選任何發票', '', { kind: 'warn', icon: icon('alert', 18) }); return; }
    const rowsEl = $$('.rc-cr', box).filter(x => pick.some(r => r.id === x.dataset.id));
    gsap.to(rowsEl, { x: 60, opacity: 0, stagger: 0.06, duration: 0.35, ease: 'power2.in', onComplete: () => {
      let pend = 0;
      for (const r of pick) {
        const warn = personalCheck(r);
        if (warn) pend++;
        S.list.unshift({ ...r, status: warn ? 'pending' : 'posted', note: warn ? 'AI 提醒：確認是否為公務' : '', isNew: true });
      }
      S.carrier = list.filter(r => r.sel === false);
      if (!S.carrier.length) S.carrierDone = true;
      renderCarrier(); renderAll();
      toast(`載具發票已匯入 ${pick.length} 張`, `${pick.length - pend} 張直接入帳、${pend} 張待你確認是否為公務`, { icon: I.barcode(18) });
    } });
  });
}

// ---------- 月底提醒 ----------
function renderMissing() {
  const box = $('#rcMiss', root);
  const now = new Date();
  const left = MISSING.filter(m => !S.sent.has(m.id)).length;
  const msg = (m) => m.id === 'rent'
    ? `王先生您好，我是阿美手作甜點的阿美，${now.getMonth() + 1} 月店面租金 NT$25,000 已匯款，麻煩您方便時拍一張簽名收據給我，記帳要用，謝謝！`
    : `北海乳品您好，這裡是阿美手作甜點。${MISSING[1].what.replace('統一', '')}（統編 ${BUYER_ID}）還沒收到，麻煩寄到 bills@阿美手作甜點.greenup.ai，感謝！`;
  const focus = MISSING.find(m => !S.sent.has(m.id)) || MISSING[0];
  box.innerHTML = `
    <div class="card-h"><h3>${icon('bell', 18)} 月底結帳提醒</h3><span class="demo-badge">${icon('alert', 13)} 示範資料</span></div>
    <div class="rc-miss-hero ${left ? '' : 'ok'}">
      <b>${left ? `還缺 <em>${left}</em> 張單據` : '單據都到齊了'}</b>
      <small>${left ? `AI 比對每月固定支出與往來廠商，發現這些還沒收到。記帳士 ${now.getMonth() + 1}/${MISSING[0].due + 5} 前要結帳。` : '本月固定支出的憑證都收齊了，月底結帳不用再追。'}</small>
    </div>
    <div class="rc-miss-list">${MISSING.map(m => `
      <div class="rc-mi ${S.sent.has(m.id) ? 'sent' : ''}">
        <span class="rc-mi-av">${m.who.slice(0, 1)}</span>
        <div class="rc-mi-t"><b>${m.what}</b><small>${m.who}・約 ${money(m.amt)}</small><p>${m.why}</p></div>
        <button class="btn ${S.sent.has(m.id) ? 'btn-ghost' : 'btn-primary'} btn-sm" data-remind="${m.id}" ${S.sent.has(m.id) ? 'disabled' : ''}>${S.sent.has(m.id) ? `${icon('check', 14)} 已提醒` : `${I.line(14)} LINE 提醒補寄`}</button>
      </div>`).join('')}
    </div>
    <div class="rc-bubble"><small>${I.line(13)} AI 幫你寫好的 LINE 訊息・給 ${focus.who}</small><p>${esc(msg(focus))}</p></div>
    ${left > 1 ? `<button class="btn btn-ghost rc-all" id="rcRemAll">${icon('send', 15)} 一鍵全部提醒</button>` : ''}`;
  const send = (ids) => {
    ids.forEach(id => S.sent.add(id));
    const names = MISSING.filter(m => ids.includes(m.id)).map(m => m.who).join('、');
    toast('已用 LINE 提醒補寄', `${names}・${fmtTime(new Date())} 送出（示範）。收到後 AI 會自動入帳`, { icon: I.line(18) });
    renderMissing();
    gsap.fromTo($$('.rc-mi.sent', box), { scale: 0.97 }, { scale: 1, duration: 0.4, ease: 'back.out(3)' });
  };
  $$('[data-remind]', box).forEach(b => b.addEventListener('click', () => send([b.dataset.remind])));
  $('#rcRemAll', box)?.addEventListener('click', () => send(MISSING.map(m => m.id)));
}
