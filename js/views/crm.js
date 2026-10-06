// 會員與行銷：跨通路統一會員（Customer 360）、RFM 分眾、AI 多語行銷活動、自動化旅程、優惠券、評論口碑
import { store, itemsText } from '../state.js';
import { $, $$, el, gsap, esc, money, fmtDate, fmtMD, fmtTime, countUp, typeText, sleep, toast } from '../util.js';
import { icon } from '../icons.js';
import { makeChart, fmtK } from '../charts.js';
import { productArt } from '../art.js';
import { PRODUCT_MAP, PRODUCTS, startOfDay, addDays } from '../data.js';
import { TENANT } from '../tenant.js';
import { IS_AMEI, CAT } from '../brief-data.js';
import {
  buildMembers, memberTimeline, SEGMENTS, SEG_MAP, TIERS, MCH, LANGS, LANG_NAME, PURPOSES, PURPOSE_MAP, CAMP_CHANNELS,
  composeMessage, seedCoupons, seedReviews, seedSchedules, SENTI, STAR_DIST, KEYWORDS, DAYMS, GIFT_P, NEW_P,
} from '../crm-data.js';

const SHOP = IS_AMEI ? '阿美手作甜點' : TENANT.name;
const OWNER = IS_AMEI ? '阿美' : TENANT.owner;
const pn = (pid) => PRODUCT_MAP[pid]?.name || pid;

let root, members = [], selId = null, listLimit = 60;
const filter = { q: '', tier: 'all', ch: 'all', lang: 'all', seg: 'all' };
const camp = { seg: 'attention', purpose: 'winback', ch: 'line', lang: 'zh', auto: true, name: '', mid: null, generated: null, busy: false };
let schedules = [], coupons = [], reviews = [], revFilter = 'all', jSel = 'nurture', jNode = null;
let charts = null;
const n0 = (v) => Math.round(v).toLocaleString('en-US');

const IG_SVG = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></svg>';
function chb(ch, cls = '') {
  const c = MCH[ch] || MCH.web;
  const inner = ch === 'ig' ? IG_SVG : ch === 'phone' ? icon('phone', 12) : ch === 'web' ? icon('store', 12) : ch === 'pos' ? icon('pos', 12) : ch === 'email' ? '@' : c.letter;
  return `<span class="crm-chb ${cls}" style="--c:${c.color}" title="${c.name}">${inner}</span>`;
}
const avatarChar = (name) => [...name.replace(/^\s+/, '')][0] || '會';
function ago(ts) {
  const h = (Date.now() - ts) / 3600e3;
  if (h < 1) return `${Math.max(1, Math.round(h * 60))} 分鐘前`;
  if (h < 24) return `${Math.round(h)} 小時前`;
  return `${Math.round(h / 24)} 天前`;
}

// ---------- 自動化旅程定義 ----------
const NODE_C = { trigger: '#2DB674', wait: '#2E97D4', action: '#F0A531', cond: '#DD5597', end: '#5EE0C4' };
const NODE_T = { trigger: '觸發', wait: '等待', action: '動作', cond: '條件', end: '結果' };
const JOURNEYS = [
  { id: 'nurture', name: '新客培養旅程', on: true, enter: 268, conv: 31.2, rev: 86420, hours: 14,
    nodes: [
      { id: 'a', x: 85, y: 150, t: 'trigger', title: '首購完成', sub: '任一通路・自動辨識', n: 268, stat: '本月新客', desc: '客人在 LINE、WhatsApp、官網、電話或門市完成第一筆訂單，AI 自動建立會員並合併身分。' },
      { id: 'b', x: 245, y: 150, t: 'wait', title: '等待 3 天', sub: '讓客人先吃到', n: 268, stat: '100% 進入', desc: '等商品送達、客人吃過再聯繫，避免打擾；冷藏商品會依到貨日自動調整。' },
      { id: 'c', x: 405, y: 150, t: 'action', title: '送感謝訊息', sub: '附保存方式小卡', n: 262, stat: '開啟率 78%', desc: '依會員偏好語言與通路發送感謝訊息，附上保存方式與食用建議，邀請留下評論。' },
      { id: 'd', x: 565, y: 150, t: 'cond', title: '14 天內回購？', sub: '自動判斷', n: 262, stat: '回購 32.1%', desc: 'AI 監看 14 天內是否有第二筆訂單，決定走忠誠培養或回購誘因分支。' },
      { id: 'e', x: 735, y: 66, t: 'action', title: '加入忠誠培養', sub: '新品搶先看', n: 84, stat: '升級銀卡 19%', desc: '已回購的客人加入忠誠名單，每月新品搶先通知，集點加倍。' },
      { id: 'f', x: 735, y: 234, t: 'action', title: '送 9 折回購券', sub: 'WELCOME 二次購', n: 178, stat: '使用率 24.7%', desc: '未回購的客人收到二次購 9 折券，AI 依過去瀏覽與詢問推薦最可能購買的商品。' },
      { id: 'g', x: 905, y: 150, t: 'wait', title: '生日前 7 天', sub: '依會員生日', n: 41, stat: '本月 41 人', desc: '在會員生日前 7 天自動觸發，避開深夜時段，以會員最常互動的通路發送。' },
      { id: 'h', x: 1075, y: 150, t: 'action', title: '送生日禮', sub: 'NT$150 生日禮金', n: 41, stat: '使用率 58.5%', desc: '送出生日禮金與祝福卡片文案，可搭配會員最愛商品推薦。' },
    ],
    edges: [['a', 'b'], ['b', 'c'], ['c', 'd'], ['d', 'e', '是'], ['d', 'f', '否'], ['e', 'g'], ['f', 'g'], ['g', 'h']] },
  { id: 'winback', name: '沉睡喚回旅程', on: true, enter: 270, conv: 18.6, rev: 52180, hours: 9,
    nodes: [
      { id: 'a', x: 85, y: 150, t: 'trigger', title: '60 天未消費', sub: '每日自動掃描', n: 270, stat: '本月進入', desc: 'AI 每天掃描會員消費紀錄，超過其個人平均回購週期 1.6 倍或 60 天未消費即進入旅程。' },
      { id: 'b', x: 245, y: 150, t: 'action', title: 'AI 挑最愛商品', sub: '依歷史訂單', n: 270, stat: '命中率 71%', desc: '依會員歷史訂單、過敏備註與季節，自動挑出最可能回購的商品。' },
      { id: 'c', x: 405, y: 150, t: 'action', title: '送專屬 85 折', sub: '偏好語言＋通路', n: 268, stat: '開啟率 64%', desc: '以會員偏好語言撰寫個人化訊息，附 85 折專屬券，7 天有效。' },
      { id: 'd', x: 565, y: 150, t: 'cond', title: '7 天內開啟？', sub: '追蹤開啟與點擊', n: 268, stat: '開啟 64.2%', desc: '追蹤訊息開啟與連結點擊，未開啟者改走其他通路。' },
      { id: 'e', x: 735, y: 66, t: 'action', title: '到期前提醒', sub: '券到期前 2 天', n: 172, stat: '回購 18.6%', desc: '已開啟但未使用的會員，在優惠券到期前 2 天再提醒一次。' },
      { id: 'f', x: 735, y: 234, t: 'action', title: '換通路再觸及', sub: 'WhatsApp／簡訊', n: 96, stat: '開啟 41%', desc: '原通路未開啟，AI 自動改用會員其他已綁定通路（WhatsApp、簡訊或 Email）。' },
      { id: 'g', x: 905, y: 66, t: 'end', title: '回到忠誠名單', sub: '重新計算 RFM', n: 50, stat: '帶回 NT$ 52,180', desc: '成功回購的會員重新計算 RFM 分數，回到忠誠或冠軍分眾。' },
      { id: 'h', x: 905, y: 234, t: 'end', title: '標記流失', sub: '降低推播頻率', n: 52, stat: '季後再試', desc: '多次觸及仍無回應，標記為流失並降低推播頻率，避免被封鎖。' },
    ],
    edges: [['a', 'b'], ['b', 'c'], ['c', 'd'], ['d', 'e', '是'], ['d', 'f', '否'], ['e', 'g'], ['f', 'h']] },
  { id: 'inquiry', name: '詢價未下單追蹤', on: false, enter: 143, conv: 42.7, rev: 52480, hours: 11,
    nodes: [
      { id: 'a', x: 85, y: 150, t: 'trigger', title: '詢價未下單', sub: 'LINE／WhatsApp／Zalo', n: 143, stat: '本月進入', desc: '客人在聊天中詢問價格、口味或取貨日，但對話結束時沒有下單。' },
      { id: 'b', x: 245, y: 150, t: 'wait', title: '等待 2 小時', sub: '避開深夜', n: 143, stat: '100% 進入', desc: '等待 2 小時再追蹤；若遇深夜時段，順延到隔天上午 10 點。' },
      { id: 'c', x: 405, y: 150, t: 'action', title: 'AI 追問需求', sub: '推薦口味與取貨日', n: 139, stat: '回覆率 57%', desc: 'AI 依對話內容追問用途（自用／送禮）、人數與取貨日，推薦適合的組合。' },
      { id: 'd', x: 565, y: 150, t: 'cond', title: '24 小時內下單？', sub: '自動判斷', n: 139, stat: '成交 43.9%', desc: '追蹤 24 小時內是否成立訂單。' },
      { id: 'e', x: 735, y: 66, t: 'end', title: '自動建單開票', sub: '付款連結＋發票', n: 61, stat: '客單 NT$ 860', desc: '下單後自動建立訂單、送出付款連結並開立電子發票。' },
      { id: 'f', x: 735, y: 234, t: 'action', title: '送免運券', sub: '48 小時有效', n: 78, stat: '使用率 21.8%', desc: '未下單者送出 48 小時免運券，提高下單意願。' },
      { id: 'g', x: 905, y: 234, t: 'end', title: '加入潛在名單', sub: '下次新品優先通知', n: 61, stat: '保留名單', desc: '仍未下單者加入潛在客名單，下次新品上市優先通知。' },
    ],
    edges: [['a', 'b'], ['b', 'c'], ['c', 'd'], ['d', 'e', '是'], ['d', 'f', '否'], ['f', 'g']] },
];
// 其他業主：旅程中與甜點相關的用語改成通用說法
if (!IS_AMEI) {
  const SV = CAT === 'service';
  const fixes = [
    ['讓客人先吃到', SV ? '讓客人先體驗' : '讓客人先用到'],
    ['等商品送達、客人吃過再聯繫，避免打擾；冷藏商品會依到貨日自動調整。', SV ? '等客人服務完幾天再聯繫，避免打擾；依服務日期自動調整。' : '等商品送達、客人用過再聯繫，避免打擾；會依到貨日自動調整。'],
    ['附保存方式小卡', SV ? '附居家保養小卡' : '附使用與保存小卡'],
    ['依會員偏好語言與通路發送感謝訊息，附上保存方式與食用建議，邀請留下評論。', `依會員偏好語言與通路發送感謝訊息，附上${SV ? '居家保養建議' : '使用與保存建議'}，邀請留下評論。`],
    ['推薦口味與取貨日', SV ? '推薦項目與時段' : '推薦品項與日期'],
    ['客人在聊天中詢問價格、口味或取貨日，但對話結束時沒有下單。', `客人在聊天中詢問價格、品項或${SV ? '預約時段' : '日期'}，但對話結束時沒有下單。`],
    ['AI 依對話內容追問用途（自用／送禮）、人數與取貨日，推薦適合的組合。', `AI 依對話內容追問用途（自用／送禮）、人數與${SV ? '方便的時段' : '日期'}，推薦適合的組合。`],
  ];
  for (const j of JOURNEYS) for (const n of j.nodes) for (const [a, b] of fixes) { if (n.sub === a) n.sub = b; if (n.desc === a) n.desc = b; }
}
const NW = 132, NH = 80;

// ---------- 掛載 ----------
export default {
  mount(section, { go }) {
    root = section;
    const now = new Date();
    members = buildMembers(store.orders, now);
    selId = members[0]?.id;
    coupons = seedCoupons(now); reviews = seedReviews(now); schedules = seedSchedules(now);
    section.innerHTML = `
    <div class="crm-wrap">
      <div class="glass crm-head anim-in">
        <div class="crm-head-txt">
          <span class="demo-badge">${icon('alert', 14)} 示範資料・會員與評論皆為虛構</span>
          <h2>每一位客人，<b class="grad-txt">AI 都記得</b></h2>
          <p>LINE、WhatsApp、Zalo、電話、官網與門市的客人，AI 自動合併成同一位會員；依 RFM 分眾、用客人的語言寫行銷訊息，並自動在對的時間推播。</p>
        </div>
        <div class="crm-head-merge" aria-hidden="true">
          <div class="hm-orbit">${['line', 'whatsapp', 'zalo', 'phone', 'ig', 'web'].map((c, i) => `<span class="hm-dot" style="--i:${i}">${chb(c)}</span>`).join('')}<span class="hm-core">${icon('user', 26)}</span></div>
          <div class="hm-txt"><b id="crmMergeN">0</b><small>組重複身分已由 AI 合併</small></div>
        </div>
      </div>

      <nav class="crm-nav anim-in" id="crmNav">
        ${[['crmS360', '會員 360', 'user'], ['crmSRfm', 'RFM 分眾', 'dashboard'], ['crmSCamp', 'AI 行銷活動', 'wand'], ['crmSFlow', '自動化旅程', 'link'], ['crmSCoupon', '優惠券', 'percent'], ['crmSRev', '評論口碑', 'chat']]
          .map(([id, t, ic]) => `<button data-to="${id}">${icon(ic, 15)}<span>${t}</span></button>`).join('')}
      </nav>

      <div class="crm-kpis" id="crmKpis"></div>

      <section class="crm-sec" id="crmS360">
        <div class="crm-360">
          <div class="glass card crm-list anim-in">
            <div class="card-h"><h3>${icon('users', 18)} 統一會員名單</h3><span class="chip-sm" id="crmListN"></span></div>
            <div class="crm-search">${icon('ask', 16)}<input id="crmQ" placeholder="搜尋姓名、電話末三碼、LINE 名稱…" autocomplete="off"></div>
            <div class="crm-filters">
              <select id="crmFTier" aria-label="等級"><option value="all">全部等級</option>${Object.values(TIERS).map(t => `<option value="${t.id}">${t.name}</option>`).join('')}</select>
              <select id="crmFCh" aria-label="通路"><option value="all">全部通路</option>${Object.entries(MCH).filter(([k]) => k !== 'email').map(([k, c]) => `<option value="${k}">${c.name}</option>`).join('')}</select>
              <select id="crmFLang" aria-label="語言"><option value="all">全部語言</option>${LANGS.map(([k, n]) => `<option value="${k}">${n}</option>`).join('')}</select>
            </div>
            <div class="crm-segbar" id="crmSegBar"></div>
            <ul class="crm-ul" id="crmUl"></ul>
          </div>
          <div class="glass card crm-detail anim-in" id="crmDetail"></div>
        </div>
      </section>

      <section class="crm-sec" id="crmSRfm">
        <div class="crm-rfm">
          <div class="glass card anim-in">
            <div class="card-h"><h3>${icon('dashboard', 18)} RFM 分眾地圖</h3><span class="chip-sm">泡泡大小＝累計消費・點泡泡看會員</span></div>
            <div class="crm-rfm-axis"><span>R 最近一次消費（越右越近）</span><span>F 消費次數（對數刻度）</span><span>M 累計金額</span></div>
            <div class="chart crm-rfm-chart" id="crmRfmChart"></div>
          </div>
          <div class="glass card crm-segs anim-in">
            <div class="card-h"><h3>${icon('sparkle', 18)} AI 分眾建議</h3><span class="chip-sm">點群組即可篩選名單</span></div>
            <div class="crm-seglist" id="crmSegList"></div>
          </div>
        </div>
      </section>

      <section class="crm-sec" id="crmSCamp">
        <div class="crm-camp">
          <div class="glass card crm-cfg anim-in">
            <div class="card-h"><h3>${icon('wand', 18)} AI 行銷活動產生器</h3><span class="chip-sm">5 種語言・4 個通路</span></div>
            <div class="crm-field"><label>目標分眾</label><div class="crm-opts" id="cfSeg"></div></div>
            <div class="crm-field"><label>活動目的</label><div class="crm-opts" id="cfPurpose">${PURPOSES.map(p => `<button class="seg" data-v="${p.id}">${p.name}</button>`).join('')}</div></div>
            <div class="crm-field"><label>發送通路</label><div class="crm-opts" id="cfCh">${CAMP_CHANNELS.map(([k, n]) => `<button class="seg" data-v="${k}">${chb(k)}${n}</button>`).join('')}</div></div>
            <div class="crm-field"><label>文案語言</label><div class="crm-opts" id="cfLang">${LANGS.map(([k, n]) => `<button class="seg" data-v="${k}">${n}</button>`).join('')}</div></div>
            <label class="crm-check"><input type="checkbox" id="cfAuto" checked><span></span>其他會員依偏好語言自動翻譯</label>
            <button class="btn btn-primary btn-lg crm-gen" id="cfGen">${icon('sparkle', 18)} AI 生成文案</button>
            <ol class="crm-steps" id="cfSteps">
              <li>分析分眾消費習慣</li><li>挑選推薦商品與優惠</li><li>以目標語言撰寫文案</li><li>檢查用語與個資遮罩</li>
            </ol>
            <p class="crm-cfg-tip">${icon('book', 14)} 文案自動代入：會員姓名、最愛商品、優惠碼、到期日；20 組多語範本皆經人工審稿（示範）</p>
          </div>
          <div class="crm-phone-wrap anim-in">
            <div class="crm-phone" id="cfPhone" data-ch="line">
              <div class="ph-notch"></div>
              <div class="ph-head"><span class="ph-back">‹</span><span class="ph-av">${icon('leaf', 16)}</span><div><b id="phShop">${esc(SHOP)}</b><small id="phSub">官方帳號</small></div></div>
              <div class="ph-body" id="phBody"><div class="ph-empty">${icon('sparkle', 26)}<p>選好分眾、目的、通路與語言<br>按「AI 生成文案」預覽訊息</p></div></div>
              <div class="ph-input"><span></span>${icon('send', 16)}</div>
            </div>
            <small class="crm-phone-cap">手機預覽（示意畫面）</small>
          </div>
          <div class="glass card crm-fc anim-in">
            <div class="card-h"><h3>${icon('trend', 18)} 成效預估</h3><span class="chip-sm" id="fcSeg"></span></div>
            <div class="crm-fc-grid">
              <div><small>預估觸及</small><b id="fcReach">0</b><em id="fcReachSub"></em></div>
              <div><small>預估開啟</small><b id="fcOpen">0</b><em id="fcOpenSub"></em></div>
              <div><small>預估轉換訂單</small><b id="fcConv">0</b><em id="fcConvSub"></em></div>
              <div class="hi"><small>預估營收</small><b id="fcRev">0</b><em id="fcRevSub"></em></div>
            </div>
            <div class="crm-langmix" id="fcMix"></div>
            <div class="crm-best">${icon('clock', 16)}<span id="fcBest"></span></div>
            <button class="btn btn-primary crm-sched-btn" id="cfSched" disabled>${icon('calendar', 17)} 排程發送</button>
            <div class="crm-sched-box">
              <div class="crm-sched-h"><b>排程與發送紀錄</b><small id="schedN"></small></div>
              <ul class="crm-sched" id="schedList"></ul>
            </div>
          </div>
        </div>
      </section>

      <section class="crm-sec" id="crmSFlow">
        <div class="glass card crm-flow-card anim-in">
          <div class="card-h"><h3>${icon('link', 18)} 自動化旅程</h3><span class="chip-sm">設定一次，AI 每天自動執行</span></div>
          <div class="crm-jtabs" id="jTabs"></div>
          <div class="crm-jstats" id="jStats"></div>
          <div class="crm-flow-hint">← 左右滑動查看完整流程 →</div>
          <div class="crm-flow" id="jFlow"></div>
          <div class="crm-jinfo" id="jInfo"></div>
        </div>
      </section>

      <section class="crm-sec" id="crmSCoupon">
        <div class="glass card anim-in">
          <div class="card-h"><h3>${icon('percent', 18)} 優惠券管理</h3><div class="crm-ch-right"><span class="chip-sm" id="cpStat"></span><button class="btn btn-ghost btn-sm" id="cpAdd">${icon('sparkle', 14)} AI 建議新券</button></div></div>
          <div class="crm-coupons" id="cpList"></div>
        </div>
      </section>

      <section class="crm-sec" id="crmSRev">
        <div class="crm-rev">
          <div class="glass card crm-rev-side anim-in">
            <div class="card-h"><h3>${icon('heart', 18)} AI 情緒分析</h3><span class="chip-sm">近 90 天・222 則</span></div>
            <div class="chart crm-senti" id="crmSenti"></div>
            <div class="crm-stars">
              <div class="crm-star-avg"><b>4.6</b><span class="crm-st5">★★★★★</span><small>Google 評論 168 則・LINE 回饋 54 則</small></div>
              <div class="crm-star-bars">${STAR_DIST.map(([s, c]) => `<div><span>${s}★</span><i><em style="width:${c / 161 * 100}%"></em></i><small>${c}</small></div>`).join('')}</div>
            </div>
            <div class="crm-kw"><small>AI 擷取關鍵字</small><div>${KEYWORDS.map(([w, s, c]) => `<span class="kw-${s}" style="--s:${0.82 + Math.min(c, 64) / 64 * 0.4}">${w}<em>${c}</em></span>`).join('')}</div></div>
          </div>
          <div class="glass card crm-rev-main anim-in">
            <div class="card-h"><h3>${icon('chat', 18)} 評論與回饋</h3><span class="chip-sm" id="revPending"></span></div>
            <div class="crm-rev-tabs" id="revTabs">${[['all', '全部'], ['todo', '待回覆'], ['neg', '負面'], ['neu', '中立'], ['pos', '正面']].map(([k, t]) => `<button class="seg ${k === revFilter ? 'on' : ''}" data-v="${k}">${t}</button>`).join('')}</div>
            <div class="crm-revs" id="revList"></div>
          </div>
        </div>
      </section>
    </div>`;

    section.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[role="button"]')) { e.preventDefault(); e.target.click(); } });
    // 導覽
    $$('#crmNav button', section).forEach(b => b.addEventListener('click', () => {
      const t = $('#' + b.dataset.to, root); t && t.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }));
    // 名單篩選
    $('#crmQ', section).addEventListener('input', (e) => { filter.q = e.target.value.trim(); listLimit = 60; renderList(); });
    $('#crmFTier', section).addEventListener('change', (e) => { filter.tier = e.target.value; listLimit = 60; renderList(); });
    $('#crmFCh', section).addEventListener('change', (e) => { filter.ch = e.target.value; listLimit = 60; renderList(); });
    $('#crmFLang', section).addEventListener('change', (e) => { filter.lang = e.target.value; listLimit = 60; renderList(); });
    $('#crmUl', section).addEventListener('click', (e) => {
      const more = e.target.closest('.crm-more'); if (more) { listLimit += 80; renderList(); return; }
      const li = e.target.closest('li[data-id]'); if (!li) return;
      selectMember(li.dataset.id);
    });
    $('#crmSegBar', section).addEventListener('click', (e) => { const b = e.target.closest('button[data-seg]'); if (b) setSegFilter(b.dataset.seg, false); });
    $('#crmDetail', section).addEventListener('click', onDetailClick);
    $('#crmSegList', section).addEventListener('click', (e) => {
      const cb = e.target.closest('[data-camp]'); if (cb) { e.stopPropagation(); campFromSeg(cb.dataset.camp); return; }
      const card = e.target.closest('.crm-segc'); if (card) setSegFilter(card.dataset.seg, true);
    });

    // 活動產生器
    const optBind = (id, key, after) => $('#' + id, section).addEventListener('click', (e) => {
      const b = e.target.closest('button[data-v]'); if (!b) return;
      camp[key] = b.dataset.v; if (key === 'seg') { camp.name = ''; camp.mid = null; } gsap.fromTo(b, { scale: 0.93 }, { scale: 1, duration: 0.4, ease: 'back.out(3)' });
      syncCampUI(); after && after();
    });
    optBind('cfSeg', 'seg'); optBind('cfPurpose', 'purpose'); optBind('cfCh', 'ch'); optBind('cfLang', 'lang');
    $('#cfAuto', section).addEventListener('change', (e) => { camp.auto = e.target.checked; renderForecast(); });
    $('#cfGen', section).addEventListener('click', generate);
    $('#cfSched', section).addEventListener('click', scheduleCampaign);
    $('#schedList', section).addEventListener('click', (e) => {
      const b = e.target.closest('[data-cancel]'); if (!b) return;
      const s = schedules[+b.dataset.cancel]; if (!s) return;
      schedules.splice(+b.dataset.cancel, 1); renderSchedules();
      toast('已取消排程', s.name, { kind: 'info', icon: icon('x', 18) });
    });

    // 旅程
    $('#jTabs', section).addEventListener('click', (e) => {
      const sw = e.target.closest('[data-sw]');
      if (sw) { const j = JOURNEYS.find(x => x.id === sw.dataset.sw); j.on = !j.on; jSel = j.id; jNode = null; renderJourney(true);
        toast(j.on ? `已啟用｜${j.name}` : `已暫停｜${j.name}`, j.on ? 'AI 會從下一位符合條件的會員開始自動執行' : '進行中的會員會停在目前節點，不再發送新訊息', { kind: j.on ? 'ok' : 'warn', icon: icon(j.on ? 'play' : 'clock', 18) });
        return; }
      const t = e.target.closest('[data-j]'); if (t) { jSel = t.dataset.j; jNode = null; renderJourney(true); }
    });
    $('#jFlow', section).addEventListener('click', (e) => { const g = e.target.closest('[data-node]'); if (g) { jNode = g.dataset.node; renderJourneyInfo(true); $$('.jn', root).forEach(n => n.classList.toggle('sel', n.dataset.node === jNode)); } });

    // 優惠券
    $('#cpAdd', section).addEventListener('click', addSuggestedCoupon);
    $('#cpList', section).addEventListener('click', (e) => {
      const b = e.target.closest('[data-copy]'); if (!b) return;
      try { navigator.clipboard && navigator.clipboard.writeText(b.dataset.copy).catch(() => {}); } catch { /* ignore */ }
      toast('已複製優惠碼', b.dataset.copy, { kind: 'info', icon: icon('check', 18) });
      gsap.fromTo(b, { scale: 0.85 }, { scale: 1, duration: 0.4, ease: 'back.out(3)' });
    });
    // 評論
    $('#revTabs', section).addEventListener('click', (e) => { const b = e.target.closest('button[data-v]'); if (!b) return; setRevFilter(b.dataset.v); });
    $('#revList', section).addEventListener('click', onReviewClick);

    renderKpis(false); renderSegBar(); renderList(); renderDetail(false); renderSegList(); syncCampUI(); renderSchedules(); renderJourney(false); renderCoupons(); renderReviews();

    const refresh = () => {
      members = buildMembers(store.orders, new Date());
      renderKpis(true); renderSegBar(); renderList(); renderSegList(); renderForecast();
      if (charts) charts.rfm.setOption(rfmOption(), { notMerge: true });
    };
    store.on('order', ({ order }) => {
      refresh();
      const m = members.find(x => x.name === order.customer);
      if (m && m.id === selId) renderDetail(true);
    });
    store.on('reset', refresh);
  },
  show() {
    if (!charts) {
      charts = { rfm: makeChart($('#crmRfmChart', root)), senti: makeChart($('#crmSenti', root)) };
      charts.rfm.on('click', (p) => { if (p.data && p.data.id) { selectMember(p.data.id); $('#crmS360', root).scrollIntoView({ behavior: 'smooth', block: 'start' }); } });
      charts.senti.on('click', (p) => { const s = SENTI.find(x => x.name === p.name); if (s) setRevFilter(s.id); });
    }
    charts.rfm.setOption(rfmOption(), { notMerge: true });
    charts.senti.setOption(sentiOption());
    renderKpis(false);
  },
};

// ---------- KPI ----------
function computeKpis() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const monthO = store.ordersBetween(monthStart, addDays(startOfDay(now), 1));
  const lastO = store.ordersBetween(lastStart, monthStart);
  const isMemberOrder = (o) => o.channel !== 'pos' || (parseInt(String(o.id).slice(-3), 10) % 100) < 36; // 門市約 36% 報會員手機
  const memRev = (list) => list.filter(isMemberOrder).reduce((s, o) => s + o.total, 0);
  const tot = store.sum(monthO), ltot = store.sum(lastO);
  const memO = monthO.filter(isMemberOrder);
  const lmemO = lastO.filter(isMemberOrder);
  const aov = memO.length ? store.sum(memO) / memO.length : 0;
  const laov = lmemO.length ? store.sum(lmemO) / lmemO.length : 0;
  const allAov = monthO.length ? tot / monthO.length : 0;
  const d30 = +addDays(startOfDay(now), -30);
  const newM = members.filter(m => m.joinedTs >= +monthStart).length;
  return {
    members: members.length, gold: members.filter(m => m.tier === 'gold').length,
    newM, new30: members.filter(m => m.joinedTs >= d30).length,
    repeat: members.filter(m => m.F >= 2).length / members.length * 100,
    aov, aovDelta: laov ? (aov - laov) / laov * 100 : 0, allAov,
    share: tot ? memRev(monthO) / tot * 100 : 0, lshare: ltot ? memRev(lastO) / ltot * 100 : 0, memRev: memRev(monthO), tot,
    merged: members.reduce((s, m) => s + Math.max(0, m.ids.length - 1), 0),
  };
}
const KPI_DEF = [
  { k: 'members', label: '會員數', icon: 'users', c: 'var(--leaf)', suffix: ' 位' },
  { k: 'newM', label: '本月新會員', icon: 'plus', c: 'var(--sky)', suffix: ' 位' },
  { k: 'repeat', label: '回購率', icon: 'refresh', c: 'var(--violet)', suffix: '%', decimals: 1 },
  { k: 'aov', label: '會員平均客單價', icon: 'receipt', c: 'var(--amber)', prefix: 'NT$ ' },
  { k: 'share', label: '會員貢獻營收占比', icon: 'heart', c: 'var(--pink)', suffix: '%', decimals: 1 },
];
function renderKpis(live) {
  const k = computeKpis();
  const host = $('#crmKpis', root);
  if (!host.children.length) {
    host.innerHTML = KPI_DEF.map(d => `<div class="kpi glass anim-in crm-kpi" data-k="${d.k}" style="--c:${d.c}">
      <div class="kpi-top"><span class="kpi-ic">${icon(d.icon, 18)}</span><span class="kpi-label">${d.label}</span><span class="kpi-delta" data-d></span></div>
      <div class="kpi-val" data-v>0</div><div class="crm-kpi-bar"><i data-b></i></div><div class="kpi-sub" data-s></div></div>`).join('');
  }
  const sub = {
    members: [`金卡 ${k.gold} 位`, 'up', `${Math.min(100, k.gold / k.members * 100 * 5)}`, `跨 7 個通路・5 種語言`],
    newM: [`近 30 天 +${k.new30}`, 'up', `${Math.min(100, k.newM / 60 * 100)}`, `本月目標 60 位`],
    repeat: ['消費 2 次以上', 'up', `${k.repeat}`, `業界平均約 35%（示意）`],
    aov: [`${k.aovDelta >= 0 ? '▲' : '▼'} ${Math.abs(k.aovDelta).toFixed(1)}%`, k.aovDelta >= 0 ? 'up' : 'down', `${Math.min(100, k.aov / 1500 * 100)}`, `全店平均 ${money(k.allAov)}`],
    share: [`上月 ${k.lshare.toFixed(1)}%`, k.share >= k.lshare ? 'up' : 'down', `${k.share}`, `會員 ${fmtK(k.memRev)}／全店 ${fmtK(k.tot)}`],
  };
  for (const d of KPI_DEF) {
    const card = $(`.crm-kpi[data-k="${d.k}"]`, host);
    const v = $('[data-v]', card);
    const before = parseFloat(v.dataset.value || 0);
    countUp(v, k[d.k], { prefix: d.prefix || '', suffix: d.suffix || '', decimals: d.decimals || 0, duration: live ? 1 : 1.6 });
    if (live && Math.abs(before - k[d.k]) > 0.05) { card.classList.remove('flash'); void card.offsetWidth; card.classList.add('flash'); }
    const [delta, cls, bar, s] = sub[d.k];
    const de = $('[data-d]', card); de.className = 'kpi-delta ' + cls; de.textContent = delta;
    gsap.to($('[data-b]', card), { width: Math.max(4, Math.min(100, +bar)) + '%', duration: 1.4, ease: 'power3.out' });
    $('[data-s]', card).textContent = s;
  }
  countUp($('#crmMergeN', root), k.merged, { duration: 1.6 });
}

// ---------- 名單 ----------
function matches(m) {
  if (filter.tier !== 'all' && m.tier !== filter.tier) return false;
  if (filter.ch !== 'all' && !m.channels.includes(filter.ch)) return false;
  if (filter.lang !== 'all' && m.lang !== filter.lang) return false;
  if (filter.seg !== 'all' && m.seg !== filter.seg) return false;
  if (filter.q) {
    const q = filter.q.toLowerCase();
    if (!(m.name.toLowerCase().includes(q) || m.id.toLowerCase().includes(q) || m.ids.some(x => x.handle.toLowerCase().includes(q)))) return false;
  }
  return true;
}
function renderSegBar() {
  const counts = {}; for (const m of members) counts[m.seg] = (counts[m.seg] || 0) + 1;
  $('#crmSegBar', root).innerHTML = `<button data-seg="all" class="${filter.seg === 'all' ? 'on' : ''}">全部</button>` +
    SEGMENTS.map(s => `<button data-seg="${s.id}" class="${filter.seg === s.id ? 'on' : ''}" style="--c:${s.color}"><i></i>${s.name}<em>${counts[s.id] || 0}</em></button>`).join('');
}
function renderList() {
  const list = members.filter(matches);
  $('#crmListN', root).textContent = `符合 ${n0(list.length)} 位`;
  const ul = $('#crmUl', root);
  if (!list.length) { ul.innerHTML = `<li class="crm-none">${icon('ask', 22)}<span>沒有符合條件的會員，試試放寬篩選</span></li>`; return; }
  ul.innerHTML = list.slice(0, listLimit).map(m => {
    const s = SEG_MAP[m.seg];
    return `<li data-id="${m.id}" class="${m.id === selId ? 'on' : ''}">
      <span class="crm-av t-${m.tier}">${esc(avatarChar(m.name))}</span>
      <div class="crm-li-b"><div class="crm-li-t"><b>${esc(m.name)}</b><span class="crm-tier t-${m.tier}">${TIERS[m.tier].name}</span>${m.real ? '<span class="crm-live" title="來自訂單系統">即時</span>' : ''}</div>
        <div class="crm-li-s">${m.channels.slice(0, 5).map(c => chb(c, 'sm')).join('')}<small>${LANG_NAME[m.lang]}</small></div></div>
      <div class="crm-li-r"><b>${fmtK(m.M)}</b><small style="--c:${s.color}"><i></i>${s.name}</small></div></li>`;
  }).join('') + (list.length > listLimit ? `<li class="crm-more"><button class="btn btn-ghost btn-sm">再顯示 ${Math.min(80, list.length - listLimit)} 位（共 ${n0(list.length)}）</button></li>` : '');
}
function setSegFilter(seg, scroll) {
  filter.seg = filter.seg === seg && seg !== 'all' ? 'all' : seg; listLimit = 60;
  renderSegBar(); renderList(); renderSegList();
  if (charts) charts.rfm.setOption(rfmOption(), { notMerge: true });
  const first = members.find(matches);
  if (first && filter.seg !== 'all') { selId = first.id; renderList(); renderDetail(true); }
  if (scroll) {
    $('#crmS360', root).scrollIntoView({ behavior: 'smooth', block: 'start' });
    const s = SEG_MAP[filter.seg];
    if (s) toast(`已篩選｜${s.name}`, `共 ${n0(members.filter(m => m.seg === s.id).length)} 位會員，可直接建立行銷活動`, { kind: 'info', icon: icon('users', 18) });
  }
  gsap.fromTo('#crmUl li', { opacity: 0, x: -12 }, { opacity: 1, x: 0, duration: 0.35, stagger: 0.015, overwrite: true });
}
function selectMember(id) {
  if (!members.find(m => m.id === id)) return;
  selId = id;
  $$('#crmUl li[data-id]', root).forEach(li => li.classList.toggle('on', li.dataset.id === id));
  renderDetail(true);
}

// ---------- 會員卡（Customer 360） ----------
function renderDetail(animate) {
  const m = members.find(x => x.id === selId) || members[0];
  if (!m) return;
  const box = $('#crmDetail', root);
  const s = SEG_MAP[m.seg];
  const tl = memberTimeline(m, 6);
  const now = Date.now();
  const nextDays = Math.round((m.nextTs - now) / DAYMS);
  const riskC = m.risk >= 60 ? 'var(--coral)' : m.risk >= 30 ? 'var(--amber)' : 'var(--leaf)';
  const avoid = m.allergy.avoid || [];
  let rec;
  if (IS_AMEI) {
    const recPid = ({ champ: 'canele', loyal: 'cookie', potential: 'roll', attention: m.favs[0]?.pid || 'lemon', risk: m.favs[0]?.pid || 'lemon' })[m.seg];
    rec = avoid.includes(recPid) ? (['basque', 'roll', 'lemon'].find(p => !avoid.includes(p)) || 'basque') : recPid;
  } else {
    const first = PRODUCTS[0].id;
    const recPid = ({ champ: NEW_P.id, loyal: GIFT_P.id, potential: (PRODUCTS[1] || PRODUCTS[0]).id, attention: m.favs[0]?.pid || first, risk: m.favs[0]?.pid || first })[m.seg] || first;
    rec = avoid.includes(recPid) ? (PRODUCTS.find(p => !avoid.includes(p.id)) || PRODUCTS[0]).id : recPid;
  }
  const bd = `${m.bday.m}/${m.bday.d}`;
  const nowD = new Date();
  const bdaySoon = m.bday.m === nowD.getMonth() + 1 && m.bday.d >= nowD.getDate();
  const avgIv = m.interval;
  box.innerHTML = `
    <div class="crm-mc-top">
      <div class="crm-vcard t-${m.tier}" style="--g:${TIERS[m.tier].grad}">
        <div class="vc-shine"></div>
        <div class="vc-row"><span class="vc-brand">${icon('leaf', 14)} ${esc(SHOP)} MEMBER</span><span class="vc-tier">${TIERS[m.tier].name}</span></div>
        <div class="vc-mid"><span class="vc-av">${esc(avatarChar(m.name))}</span><div><b>${esc(m.name)}</b><small class="mono">${m.id}</small></div></div>
        <div class="vc-row vc-bot"><div><small>可用點數</small><b class="mono" id="vcPts">0</b></div><div class="vc-chip"></div></div>
      </div>
      <div class="crm-mc-info">
        <div class="crm-mc-tags"><span class="crm-segtag" style="--c:${s.color}"><i></i>${s.name}</span><span class="chip-sm">${icon('globe', 13)} 偏好語言：${LANG_NAME[m.lang]}</span>${m.real ? '<span class="chip-sm crm-chip-live">● 訂單即時同步</span>' : '<span class="chip-sm">含歷史匯入資料</span>'}</div>
        <div class="crm-facts">
          <div><small>累計消費</small><b>${money(m.M)}</b></div>
          <div><small>消費次數</small><b>${m.F} 次</b></div>
          <div><small>平均客單</small><b>${money(m.aov)}</b></div>
          <div><small>上次消費</small><b>${m.R < 1 ? '今天' : Math.round(m.R) + ' 天前'}</b></div>
          <div><small>加入日期</small><b>${fmtDate(m.joinedTs)}</b></div>
          <div><small>生日</small><b>${bd}${bdaySoon ? ' <em class="crm-bd">本月壽星</em>' : ''}</b></div>
        </div>
        <div class="crm-mc-act">
          <button class="btn btn-primary btn-sm" data-act="camp">${icon('wand', 15)} 為他建立專屬活動</button>
          <button class="btn btn-ghost btn-sm" data-act="msg">${icon('send', 15)} 傳送關懷訊息</button>
        </div>
      </div>
    </div>
    <div class="crm-merge">
      <div class="crm-merge-h">${icon('sparkle', 16)}<b>AI 已自動合併 ${m.ids.length} 個身分</b><small>比對手機、Email、下單姓名與對話內容・信心度 ${(96 + (m.seed % 30) / 10).toFixed(1)}%</small></div>
      <div class="crm-ids">${m.ids.map(x => `<span class="crm-id">${chb(x.ch)}<span><small>${MCH[x.ch].name}</small>${esc(x.handle)}</span></span>`).join('')}</div>
    </div>
    <div class="crm-mc-grid">
      <div class="crm-tl">
        <div class="crm-sub-h"><b>${icon('clock', 15)} 消費時間軸</b><small>${m.real ? '來自訂單系統（真實訂單）' : '歷史匯入紀錄（示範）'}</small></div>
        <ul>${tl.map(o => `<li><span class="tl-dot" style="--c:${MCH[o.ch]?.color || '#5EE0C4'}"></span>
          <div class="tl-b"><div class="tl-t"><span>${fmtMD(o.ts)} ${fmtTime(o.ts)}</span>${chb(o.ch, 'sm')}<small>${MCH[o.ch]?.name || ''}</small><b>${money(o.total)}</b></div>
          <p>${esc(itemsText(o.items))}</p>${o.real ? `<small class="mono tl-id">${o.id}</small>` : ''}</div></li>`).join('')}</ul>
      </div>
      <div class="crm-side">
        <div class="crm-favs"><div class="crm-sub-h"><b>${icon('heart', 15)} 最愛商品</b></div>
          <div class="crm-fav-row">${m.favs.map((f, i) => `<div class="crm-fav"><span class="fav-art">${productArt(f.pid, 52)}</span><b>${esc(pn(f.pid))}</b><small>${i === 0 ? 'TOP 1・' : ''}買過 ${f.qty} 次</small></div>`).join('')}</div></div>
        <div class="crm-allergy ${m.allergy.text ? 'has' : ''}">${icon(m.allergy.text ? 'alert' : 'shield', 16)}<div><b>過敏與備註</b><p>${m.allergy.text ? esc(m.allergy.text) + (avoid.length ? `｜AI 推薦已自動排除：${avoid.slice(0, 3).map(pn).join('、')}${avoid.length > 3 ? ' 等' : ''}` : '｜已同步到接單與出貨備註') : '無過敏紀錄・AI 會在對話中持續留意'}</p></div></div>
        <div class="crm-pred">
          <div class="crm-sub-h"><b>${icon('bot', 15)} AI 預測</b><small>依個人回購週期 ${avgIv < 3 ? avgIv.toFixed(1) : Math.round(avgIv)} 天</small></div>
          <div class="crm-pred-row">
            <div><small>下次可能回購</small><b>${fmtMD(m.nextTs)}</b><em>${nextDays > 0 ? `${nextDays} 天後` : nextDays === 0 ? '今天' : `已逾期 ${-nextDays} 天`}</em></div>
            <div class="crm-risk" style="--rc:${riskC}"><small>流失風險</small><b id="riskV">0%</b><i><em id="riskBar"></em></i></div>
          </div>
          <div class="crm-rec">${productArt(rec, 40)}<p><b>下一步建議</b>${m.seg === 'risk' || m.seg === 'attention' ? '送「' + pn(rec) + '」85 折喚回券' : m.seg === 'potential' ? '首購後關懷＋第二次購買 9 折' : '新品「' + pn(rec) + (IS_AMEI ? '」搶先試吃邀請' : '」搶先體驗邀請')}${bdaySoon ? '，並搭配生日禮金' : ''}</p></div>
        </div>
      </div>
    </div>`;
  countUp($('#vcPts', box), m.points, { from: 0, duration: 1.2 });
  countUp($('#riskV', box), m.risk, { from: 0, suffix: '%', duration: 1.2 });
  gsap.fromTo($('#riskBar', box), { width: '0%' }, { width: m.risk + '%', duration: 1.2, ease: 'power3.out' });
  if (animate) {
    gsap.fromTo($('.crm-vcard', box), { rotateY: -24, opacity: 0, x: -20 }, { rotateY: 0, opacity: 1, x: 0, duration: 0.7, ease: 'power3.out' });
    gsap.fromTo($$('.crm-facts > div, .crm-mc-tags > *', box), { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.4, stagger: 0.03 });
    gsap.fromTo($$('.crm-tl li', box), { opacity: 0, x: -14 }, { opacity: 1, x: 0, duration: 0.4, stagger: 0.05, delay: 0.1 });
    gsap.fromTo($$('.crm-fav', box), { opacity: 0, scale: 0.8 }, { opacity: 1, scale: 1, duration: 0.5, stagger: 0.07, ease: 'back.out(2)' });
  }
  // 身分合併動畫：從四散飛入並排列
  const ids = $$('.crm-id', box);
  gsap.fromTo(ids, { opacity: 0, x: () => (Math.random() - 0.5) * 220, y: () => (Math.random() - 0.5) * 60, scale: 0.6 },
    { opacity: 1, x: 0, y: 0, scale: 1, duration: 0.7, stagger: 0.07, ease: 'back.out(1.4)', delay: animate ? 0.15 : 0.4 });
  gsap.fromTo($('.crm-merge-h b', box), { color: '#5EE0C4' }, { color: '#eafff4', duration: 1.6, delay: 0.8 });
}
function onDetailClick(e) {
  const b = e.target.closest('[data-act]'); if (!b) return;
  const m = members.find(x => x.id === selId); if (!m) return;
  gsap.fromTo(b, { scale: 0.94 }, { scale: 1, duration: 0.4, ease: 'back.out(3)' });
  if (b.dataset.act === 'msg') {
    const ch = m.ids.find(x => ['line', 'whatsapp', 'zalo', 'messenger'].includes(x.ch)) || m.ids[0];
    toast(`關懷訊息已送出｜${m.name}`, `透過 ${MCH[ch.ch].name}，AI 以${LANG_NAME[m.lang]}撰寫並附上最愛商品推薦`, { icon: icon('send', 18) });
    return;
  }
  camp.seg = m.seg; camp.purpose = SEG_MAP[m.seg].purpose; camp.lang = m.lang;
  camp.ch = ['line', 'whatsapp', 'zalo', 'ig'].find(c => m.channels.includes(c)) || 'line';
  camp.name = m.name; camp.mid = m.id;
  syncCampUI();
  $('#crmSCamp', root).scrollIntoView({ behavior: 'smooth', block: 'start' });
  setTimeout(generate, 600);
}

// ---------- RFM ----------
function rfmOption() {
  const maxR = 240;
  const series = SEGMENTS.map(s => {
    const dim = filter.seg !== 'all' && filter.seg !== s.id;
    return {
      name: s.name, type: 'scatter',
      data: members.filter(m => m.seg === s.id).map(m => {
        const j = ((m.seed * 2654435761) >>> 0) / 4294967296; // 固定抖動，避免整數次數疊成一條線
        return { value: [Math.min(maxR, +(m.R + (m.real ? 0 : (j - 0.5) * 0.9)).toFixed(1)), +(m.F * (1 + (j - 0.5) * 0.22)).toFixed(2), m.M], f: m.F, name: m.name, id: m.id };
      }),
      symbolSize: (v) => Math.max(5, Math.min(34, Math.sqrt(v[2]) / 8)),
      itemStyle: { color: s.color, opacity: dim ? 0.08 : 0.62, borderColor: dim ? 'transparent' : 'rgba(255,255,255,0.35)', borderWidth: 0.6, shadowBlur: dim ? 0 : 8, shadowColor: s.color + '66' },
      emphasis: { focus: 'series', itemStyle: { opacity: 1, borderColor: '#fff', borderWidth: 1.5 } },
      animationDelay: (i) => i * 1.2,
    };
  });
  return {
    animationDuration: 1200,
    grid: { left: 8, right: 22, top: root && root.clientWidth < 600 ? 74 : 40, bottom: 26, containLabel: true },
    legend: { top: 0, left: 0, itemWidth: 10, itemHeight: 10, icon: 'circle', textStyle: { fontSize: 12 } },
    tooltip: { trigger: 'item', formatter: (p) => `${p.marker}<b>${esc(p.data.name)}</b>｜${p.seriesName}<br/>最近消費：${p.value[0] < 1 ? '今天' : Math.round(p.value[0]) + ' 天前'}<br/>消費次數：${p.data.f} 次<br/>累計金額：NT$ ${n0(p.value[2])}` },
    xAxis: { type: 'value', name: '距上次消費（天）', nameLocation: 'middle', nameGap: 26, nameTextStyle: { color: 'rgba(214,240,226,0.5)', fontSize: 11 }, inverse: true, min: 0, max: maxR, splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)', type: 'dashed' } } },
    yAxis: { type: 'log', logBase: 2, min: 0.8, max: 128, name: '消費次數', nameTextStyle: { color: 'rgba(214,240,226,0.5)', fontSize: 11, align: 'left' }, axisLine: { show: false }, axisLabel: { color: 'rgba(214,240,226,0.72)', formatter: (v) => v < 1 ? '' : v }, splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)', type: 'dashed' } } },
    series: [
      ...series,
      { type: 'scatter', data: [], silent: true, markArea: { silent: true, itemStyle: { color: 'rgba(240,165,49,0.05)', borderColor: 'rgba(240,165,49,0.25)', borderType: 'dashed', borderWidth: 1 },
        label: { color: 'rgba(255,215,154,0.75)', fontSize: 11, position: 'insideTopRight' }, data: [[{ name: '冠軍區', coord: [21, 6] }, { coord: [0, 128] }]] },
        markLine: { silent: true, symbol: 'none', lineStyle: { color: 'rgba(236,106,85,0.4)', type: 'dashed' }, label: { color: 'rgba(255,159,143,0.8)', fontSize: 11, formatter: '90 天流失線' }, data: [{ xAxis: 90 }] } },
    ],
  };
}
function renderSegList() {
  const tot = members.length;
  $('#crmSegList', root).innerHTML = SEGMENTS.map(s => {
    const list = members.filter(m => m.seg === s.id);
    const avgM = list.length ? list.reduce((a, m) => a + m.M, 0) / list.length : 0;
    const rev = list.reduce((a, m) => a + m.M, 0);
    return `<div class="crm-segc ${filter.seg === s.id ? 'on' : ''}" data-seg="${s.id}" style="--c:${s.color}" role="button" tabindex="0">
      <div class="sc-top"><i></i><b>${s.name}</b><span class="sc-n">${n0(list.length)} 位</span><span class="sc-pct">${(list.length / tot * 100).toFixed(1)}%</span></div>
      <div class="sc-bar"><em style="width:${list.length / tot * 100 * 2.6}%"></em></div>
      <small class="sc-rule">${s.rule}・平均累計 ${money(avgM)}・貢獻 ${fmtK(rev)}</small>
      <p>${icon('sparkle', 13)} ${s.tip}</p>
      <button class="btn btn-ghost btn-sm" data-camp="${s.id}">${icon('wand', 13)} 建立活動</button>
    </div>`;
  }).join('');
}
function campFromSeg(seg) {
  camp.seg = seg; camp.purpose = SEG_MAP[seg].purpose; camp.name = ''; camp.mid = null;
  syncCampUI();
  $('#crmSCamp', root).scrollIntoView({ behavior: 'smooth', block: 'start' });
  toast(`已帶入分眾｜${SEG_MAP[seg].name}`, `建議目的：${PURPOSE_MAP[camp.purpose].name}，按「AI 生成文案」預覽`, { kind: 'info', icon: icon('wand', 18) });
}

// ---------- 活動產生器 ----------
function targetMembers(seg) {
  if (seg === 'all') return members;
  if (seg === 'bday') { const mo = new Date().getMonth() + 1; return members.filter(m => m.bday.m === mo); }
  return members.filter(m => m.seg === seg);
}
function syncCampUI() {
  const segs = [...SEGMENTS.map(s => [s.id, s.name, s.color]), ['all', '全部會員', '#5EE0C4'], ['bday', '本月壽星', '#DD5597']];
  $('#cfSeg', root).innerHTML = (camp.mid ? `<span class="crm-onechip">${icon('user', 13)} 專屬會員：${esc(camp.name)}<small>點任一分眾即可改回群發</small></span>` : '') +
    segs.map(([id, n, c]) => `<button class="seg ${camp.seg === id && !camp.mid ? 'on' : ''}" data-v="${id}" style="--c:${c}"><i class="crm-dot"></i>${n}<em>${n0(targetMembers(id).length)}</em></button>`).join('');
  for (const [id, key] of [['cfPurpose', 'purpose'], ['cfCh', 'ch'], ['cfLang', 'lang']]) $$(`#${id} button`, root).forEach(b => b.classList.toggle('on', b.dataset.v === camp[key]));
  const ph = $('#cfPhone', root); ph.dataset.ch = camp.ch;
  $('#phSub', root).textContent = { line: 'LINE 官方帳號（示意）', whatsapp: 'WhatsApp Business（示意）', zalo: 'Zalo OA（示意）', ig: 'Instagram 私訊（示意）' }[camp.ch];
  renderForecast();
}
const OPEN = { line: 0.68, whatsapp: 0.74, zalo: 0.61, ig: 0.38 };
const COST = { line: 0.2, whatsapp: 0.9, zalo: 0.3, ig: 0 };
const CONV = { new: 0.052, bday: 0.14, winback: 0.068, festival: 0.081 };
const SEGX = { champ: 1.6, loyal: 1.25, potential: 0.9, attention: 0.7, risk: 0.45, all: 1, bday: 1.1 };
function forecast() {
  const one = camp.mid && members.find(m => m.id === camp.mid);
  const t = one ? [one] : targetMembers(camp.seg);
  const r = one ? [one] : t.filter(m => m.channels.includes(camp.ch) && (camp.auto || m.lang === camp.lang));
  const reach = r.length;
  const open = Math.round(reach * OPEN[camp.ch]);
  const conv = Math.max(reach ? 1 : 0, Math.round(open * CONV[camp.purpose] * SEGX[camp.seg]));
  const aov = r.length ? Math.min(1400, r.reduce((s, m) => s + m.aov, 0) / r.length) : 0;
  const rev = Math.round(conv * aov / 10) * 10;
  const cost = Math.round(reach * COST[camp.ch]);
  const mix = {}; for (const m of r) mix[m.lang] = (mix[m.lang] || 0) + 1;
  if (one) { // 一對一：以回購機率計算期望營收
    const prob = Math.round(Math.min(85, Math.max(12, (100 - one.risk) * 0.6 + 12)));
    return { target: 1, reach: 1, open: 1, conv: 1, rev: Math.round(one.aov * prob / 100 / 10) * 10, cost, mix, rate: prob, one: true };
  }
  return { target: t.length, reach, open, conv, rev, cost, mix, rate: open ? conv / open * 100 : 0 };
}
function bestTime() {
  const today = startOfDay(new Date());
  const list = store.ordersBetween(addDays(today, -30), addDays(today, 1)).filter(o => o.channel !== 'pos');
  const g = {}; let best = null;
  for (const o of list) { const d = new Date(o.ts); const k = d.getDay() * 100 + d.getHours(); g[k] = (g[k] || 0) + 1; if (!best || g[k] > g[best]) best = k; }
  const dow = Math.floor(best / 100), hour = best % 100;
  const now = new Date();
  let t = startOfDay(now); t.setHours(hour > 0 ? hour - 1 : 20, 30);
  while (t.getDay() !== dow || t <= now) { t = addDays(t, 1); t.setHours(hour > 0 ? hour - 1 : 20, 30); }
  return { ts: +t, label: `週${'日一二三四五六'[dow]} ${String(t.getHours()).padStart(2, '0')}:30`, hour };
}
function renderForecast() {
  if (!root) return;
  const f = forecast();
  const segName = camp.mid ? `專屬會員・${camp.name}` : camp.seg === 'all' ? '全部會員' : camp.seg === 'bday' ? '本月壽星' : SEG_MAP[camp.seg].name;
  $('#fcSeg', root).textContent = camp.mid ? segName : `${segName}・${n0(f.target)} 位`;
  countUp($('#fcReach', root), f.reach, { suffix: ' 人', duration: 0.9 });
  countUp($('#fcOpen', root), f.open, { suffix: ' 人', duration: 0.9 });
  countUp($('#fcConv', root), f.conv, { suffix: ' 筆', duration: 0.9 });
  countUp($('#fcRev', root), f.rev, { prefix: 'NT$ ', duration: 0.9 });
  $('#fcReachSub', root).textContent = camp.mid ? '一對一專屬訊息' : `${f.target ? (f.reach / f.target * 100).toFixed(0) : 0}% 有綁定 ${CAMP_CHANNELS.find(c => c[0] === camp.ch)[1]}`;
  $('#fcOpenSub', root).textContent = `開啟率 ${(OPEN[camp.ch] * 100).toFixed(0)}%`;
  $('#fcConvSub', root).textContent = f.one ? `AI 預估回購機率 ${f.rate}%` : `轉換率 ${f.rate.toFixed(1)}%`;
  $('#fcRevSub', root).textContent = f.one ? '期望值＝客單 × 回購機率' : f.cost ? `發送成本約 NT$ ${n0(f.cost)}・ROI ${f.cost ? n0(f.rev / f.cost) : '—'} 倍` : '私訊無發送費用';
  const tot = f.reach || 1;
  $('#fcMix', root).innerHTML = `<small>${camp.auto ? 'AI 依偏好語言自動翻譯' : `僅發送給偏好 ${LANG_NAME[camp.lang]} 的會員`}</small><div class="lm-bar">${LANGS.filter(([k]) => f.mix[k]).map(([k, n], i) => `<i style="width:${f.mix[k] / tot * 100}%;--c:${['#2DB674', '#F0A531', '#2E97D4', '#7C62E6', '#DD5597'][LANGS.findIndex(x => x[0] === k)]}" title="${n} ${f.mix[k]} 人"></i>`).join('')}</div>
    <div class="lm-leg">${LANGS.filter(([k]) => f.mix[k]).map(([k, n]) => `<span style="--c:${['#2DB674', '#F0A531', '#2E97D4', '#7C62E6', '#DD5597'][LANGS.findIndex(x => x[0] === k)]}"><i></i>${n} ${f.mix[k]}</span>`).join('') || '<span>此通路在分眾中沒有會員</span>'}</div>`;
  const bt = bestTime();
  $('#fcBest', root).innerHTML = `AI 建議發送時段：<b>${fmtMD(bt.ts)}（${bt.label}）</b>，近 30 天線上下單高峰前 1 小時`;
  const btn = $('#cfSched', root);
  btn.disabled = !camp.generated || camp.generated.key !== campKey() || !f.reach;
}
const campKey = () => [camp.seg, camp.purpose, camp.ch, camp.lang, camp.name].join('|');
async function generate() {
  if (camp.busy) return;
  camp.busy = true;
  const btn = $('#cfGen', root); btn.disabled = true; btn.classList.add('busy');
  btn.innerHTML = `${icon('sparkle', 18)} AI 撰寫中…`;
  const steps = $$('#cfSteps li', root);
  steps.forEach(s => s.className = '');
  const body = $('#phBody', root);
  const t = targetMembers(camp.seg).filter(m => m.channels.includes(camp.ch));
  const sample = camp.name || (t.find(m => m.lang === camp.lang) || {}).name || '';
  const one = camp.mid && members.find(m => m.id === camp.mid);
  const fav = one && (camp.purpose === 'winback' || camp.purpose === 'bday') ? (one.favs.find(f => !(one.allergy.avoid || []).includes(f.pid)) || {}).pid : null;
  const msg = composeMessage({ purpose: camp.purpose, lang: camp.lang, name: sample, pid: fav });
  $('#phShop', root).textContent = msg.ui.shop;
  body.innerHTML = `<div class="ph-date">${msg.ui.today} ${fmtTime(new Date())}</div><div class="ph-typing"><i></i><i></i><i></i></div>`;
  gsap.fromTo(body.children, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.3, stagger: 0.1 });
  for (let i = 0; i < steps.length; i++) { steps[i].className = 'run'; await sleep(320); steps[i].className = 'ok'; }
  $('.ph-typing', body)?.remove();
  const bub = el(`<div class="ph-msg"><span class="ph-mav">${icon('leaf', 13)}</span><div class="ph-bub"><p></p></div></div>`);
  body.appendChild(bub);
  gsap.fromTo(bub, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.3 });
  const p = $('p', bub);
  const speed = camp.lang === 'zh' || camp.lang === 'ja' ? 16 : 7;
  const scroller = () => { body.scrollTop = body.scrollHeight; };
  const iv = setInterval(scroller, 120);
  await typeText(p, msg.text, speed);
  clearInterval(iv);
  const card = el(`<div class="ph-card">
    <div class="ph-prod"><span>${productArt(msg.product.id, 74)}</span><div><b>${esc(msg.productName)}</b><small>${msg.product.unit}・${money(msg.product.price)}</small></div></div>
    <div class="ph-coupon"><div class="pc-l"><small>${esc(msg.ui.coupon)}</small><b>${esc(msg.discount)}</b><span class="mono">${msg.code}</span></div><div class="pc-r"><small>${esc(msg.ui.until)}</small><b>${esc(msg.expiry)}</b></div></div>
    <button class="ph-cta" type="button">${esc(msg.ui.cta)}</button></div>`);
  body.appendChild(card);
  gsap.fromTo(card, { opacity: 0, y: 24, scale: 0.94 }, { opacity: 1, y: 0, scale: 1, duration: 0.55, ease: 'back.out(1.6)', onUpdate: scroller });
  gsap.fromTo($('.ph-coupon', card), { rotate: -3 }, { rotate: 0, duration: 0.8, ease: 'elastic.out(1,0.5)', delay: 0.3 });
  camp.generated = { key: campKey(), msg };
  camp.busy = false; btn.disabled = false; btn.classList.remove('busy');
  btn.innerHTML = `${icon('refresh', 18)} 重新生成`;
  renderForecast();
  const sb = $('#cfSched', root);
  gsap.fromTo(sb, { scale: 0.9 }, { scale: 1, duration: 0.6, ease: 'elastic.out(1,0.4)' });
}
function scheduleCampaign() {
  const f = forecast(); const g = camp.generated; if (!g || !f.reach) return;
  const bt = bestTime();
  const segName = camp.seg === 'all' ? '全部會員' : camp.seg === 'bday' ? '本月壽星' : SEG_MAP[camp.seg].name;
  const title = `${PURPOSE_MAP[camp.purpose].name}｜${camp.mid ? camp.name + ' 專屬' : segName}`;
  schedules.unshift({ name: title, seg: camp.seg, ch: camp.ch, lang: camp.lang, ts: bt.ts, reach: f.reach, status: 'sched', fresh: true, rev: f.rev });
  renderSchedules();
  // 同步建立優惠券
  const code = g.msg.code;
  let cp = coupons.find(c => c.code === code);
  if (!cp) {
    cp = { code, name: `${PURPOSE_MAP[camp.purpose].name}活動券`, disc: { new: '9 折', bday: '折 NT$150', winback: '85 折', festival: '滿千折 120' }[camp.purpose], ch: [camp.ch], issued: 0, used: 0, exp: new Date(Date.now() + 14 * DAYMS), color: '#5EE0C4', fresh: true };
    coupons.unshift(cp);
  }
  cp.issued += f.reach; cp.fresh = true;
  if (!cp.ch.includes(camp.ch)) cp.ch.push(camp.ch);
  renderCoupons();
  toast('活動已排程', `${title}・${fmtMD(bt.ts)} ${bt.label.split(' ')[1]} 發送給 ${n0(f.reach)} 人，優惠碼 ${code} 已同步`, { icon: icon('calendar', 18) });
  camp.generated = null; renderForecast();
  $('#cfGen', root).innerHTML = `${icon('sparkle', 18)} AI 生成文案`;
}
function renderSchedules() {
  const ST = { sched: ['已排程', 'pending'], running: ['自動執行中', 'paid'], done: ['已完成', 'idle'] };
  $('#schedN', root).textContent = `${schedules.filter(s => s.status === 'sched').length} 檔待發送`;
  const ul = $('#schedList', root);
  ul.innerHTML = schedules.map((s, i) => `<li class="${s.fresh ? 'fresh' : ''}">
    ${chb(s.ch)}<div class="sl-b"><b>${esc(s.name)}</b><small>${fmtMD(s.ts)} ${fmtTime(s.ts)}・${LANG_NAME[s.lang]}・${n0(s.reach)} 人${s.status === 'done' ? `・成交 ${s.orders} 筆 ${fmtK(s.rev)}` : s.rev ? `・預估 ${fmtK(s.rev)}` : ''}</small></div>
    <span class="st ${ST[s.status][1]}">${ST[s.status][0]}</span>${s.status === 'sched' ? `<button class="crm-x" data-cancel="${i}" title="取消排程">${icon('x', 13)}</button>` : ''}</li>`).join('');
  const fresh = $('li.fresh', ul);
  if (fresh) { gsap.fromTo(fresh, { opacity: 0, x: 30, backgroundColor: 'rgba(45,182,116,.35)' }, { opacity: 1, x: 0, backgroundColor: 'rgba(45,182,116,0)', duration: 1.4, ease: 'power3.out' }); schedules.forEach(s => s.fresh = false); }
}

// ---------- 自動化旅程 ----------
function edgePath(a, b) {
  const x1 = a.x + NW / 2, y1 = a.y, x2 = b.x - NW / 2, y2 = b.y;
  const mx = (x1 + x2) / 2;
  return `M${x1} ${y1} C${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`;
}
function renderJourney(animate) {
  $('#jTabs', root).innerHTML = JOURNEYS.map(j => `<div class="crm-jtab ${j.id === jSel ? 'on' : ''} ${j.on ? '' : 'off'}" data-j="${j.id}" role="button" tabindex="0">
    <span class="jt-dot"></span><b>${j.name}</b><small>${j.on ? '啟用中' : '已暫停'}</small>
    <button class="crm-switch ${j.on ? 'on' : ''}" data-sw="${j.id}" aria-pressed="${j.on}" title="${j.on ? '暫停' : '啟用'}旅程"><i></i></button></div>`).join('');
  const j = JOURNEYS.find(x => x.id === jSel);
  $('#jStats', root).innerHTML = [
    ['本月進入', j.enter, ' 人', 'users'], ['完成轉換', j.conv, '%', 'check'], ['帶來營收', j.rev, '', 'coins'], ['省下人工', j.hours, ' 小時', 'clock'],
  ].map(([l, , , ic], i) => `<div class="${j.on ? '' : 'dim'}">${icon(ic, 16)}<small>${l}</small><b data-js="${i}">0</b></div>`).join('');
  $$('[data-js]', root).forEach((n, i) => countUp(n, [j.enter, j.conv, j.rev, j.hours][i], { prefix: i === 2 ? 'NT$ ' : '', suffix: [' 人', '%', '', ' 小時'][i], decimals: i === 1 ? 1 : 0, duration: 1, from: 0 }));
  const map = Object.fromEntries(j.nodes.map(n => [n.id, n]));
  const W = 1160, H = 300;
  const edges = j.edges.map(([a, b, lab], i) => {
    const d = edgePath(map[a], map[b]);
    const lx = (map[a].x + NW / 2 + map[b].x - NW / 2) / 2, ly = (map[a].y + map[b].y) / 2;
    return `<path class="je-bg" d="${d}"/><path class="je-line" d="${d}" marker-end="url(#crmArrow)"/>
      ${lab ? `<g class="je-lab ${lab === '是' ? 'yes' : 'no'}"><rect x="${lx - 13}" y="${ly - 11}" width="26" height="20" rx="10"/><text x="${lx}" y="${ly + 3.5}">${lab}</text></g>` : ''}
      ${j.on ? `<circle class="je-dot" r="3.6"><animateMotion dur="${2.2 + (i % 3) * 0.3}s" repeatCount="indefinite" begin="${(i * 0.37).toFixed(2)}s" path="${d}"/></circle>` : ''}`;
  }).join('');
  const nodes = j.nodes.map(n => {
    const c = NODE_C[n.t];
    const x = n.x - NW / 2, y = n.y - NH / 2;
    return `<g class="jn jn-${n.t} ${n.id === jNode ? 'sel' : ''}" data-node="${n.id}" style="--c:${c}">
      <rect class="jn-glow" x="${x - 4}" y="${y - 4}" width="${NW + 8}" height="${NH + 8}" rx="18"/>
      <rect class="jn-box" x="${x}" y="${y}" width="${NW}" height="${NH}" rx="14"/>
      <rect class="jn-bar" x="${x}" y="${y + 10}" width="3" height="${NH - 20}" rx="1.5"/>
      <text class="jn-type" x="${x + 13}" y="${y + 17}">${NODE_T[n.t]}</text>
      <text class="jn-n" x="${x + NW - 10}" y="${y + 17}">${n.n} 人</text>
      <text class="jn-title" x="${x + 13}" y="${y + 38}">${n.title}</text>
      <text class="jn-sub" x="${x + 13}" y="${y + 54}">${n.sub}</text>
      <text class="jn-stat" x="${x + 13}" y="${y + 70}">${n.stat}</text>
    </g>`;
  }).join('');
  $('#jFlow', root).innerHTML = `<svg class="${j.on ? '' : 'off'}" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${j.name} 流程圖">
    <defs><marker id="crmArrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="rgba(94,224,196,0.8)"/></marker></defs>
    ${edges}${nodes}</svg>`;
  renderJourneyInfo(false);
  if (animate) {
    gsap.fromTo($$('#jFlow .jn', root), { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.45, stagger: 0.06, ease: 'power3.out' });
    gsap.fromTo($$('#jFlow .je-line', root), { opacity: 0 }, { opacity: 1, duration: 0.6, stagger: 0.05, delay: 0.2 });
  }
}
function renderJourneyInfo(animate) {
  const j = JOURNEYS.find(x => x.id === jSel);
  const n = j.nodes.find(x => x.id === jNode);
  const box = $('#jInfo', root);
  if (!n) { box.innerHTML = `${icon('sparkle', 16)}<span>點流程中的任一節點，查看 AI 執行細節。${j.on ? '綠色光點代表會員正在旅程中移動。' : '此旅程已暫停，打開右上開關即可恢復。'}</span>`; }
  else box.innerHTML = `<span class="ji-type" style="--c:${NODE_C[n.t]}">${NODE_T[n.t]}</span><div><b>${n.title}</b><p>${n.desc}</p></div><div class="ji-num"><b>${n.n}</b><small>人經過</small></div><div class="ji-num"><b>${n.stat}</b><small>成效</small></div>`;
  if (animate) gsap.fromTo(box, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.35 });
}

// ---------- 優惠券 ----------
const SUGGEST = [
  CAT === 'service' && !IS_AMEI ? { code: 'RAINY90', name: '雨天補位優惠', disc: '9 折', ch: ['line', 'whatsapp'], days: 3, color: '#2E97D4', why: '氣象預報週末降雨，臨時取消預約通常 +18%，先推優惠補空檔' }
    : { code: 'RAINY90', name: '雨天限定外送', disc: '9 折', ch: ['line', 'whatsapp'], days: 3, color: '#2E97D4', why: '氣象預報週末降雨，外送訂單通常 +18%' },
  IS_AMEI ? { code: 'TEAPAIR', name: '下午茶雙人組', disc: '加 NT$99 換購', ch: ['line', 'web', 'ig'], days: 21, color: '#F0A531', why: '磅蛋糕＋可麗露常一起購買（共購率 31%）' }
    : { code: 'DUO99', name: '人氣雙品組', disc: '加 NT$99 換購', ch: ['line', 'web', 'ig'], days: 21, color: '#F0A531', why: `${PRODUCTS[0].name}＋${(PRODUCTS[1] || PRODUCTS[0]).name}常一起購買（共購率 31%）` },
  { code: 'REFER100', name: '好友推薦禮', disc: '雙方各折 NT$100', ch: ['line', 'whatsapp', 'zalo'], days: 45, color: '#7C62E6', why: '冠軍顧客推薦意願高，帶新客成本最低' },
];
let sugIdx = 0;
function renderCoupons() {
  const now = Date.now();
  const active = coupons.filter(c => +c.exp >= now);
  const used = coupons.reduce((s, c) => s + c.used, 0), issued = coupons.reduce((s, c) => s + c.issued, 0);
  $('#cpStat', root).textContent = `${active.length} 張進行中・整體使用率 ${issued ? (used / issued * 100).toFixed(1) : 0}%`;
  const host = $('#cpList', root);
  host.innerHTML = coupons.map(c => {
    const pct = c.issued ? c.used / c.issued * 100 : 0;
    const left = Math.ceil((+c.exp - now) / DAYMS);
    const exp = left < 0 ? '<span class="cp-exp gone">已到期</span>' : left <= 7 ? `<span class="cp-exp warn">剩 ${left} 天</span>` : `<span class="cp-exp">剩 ${left} 天</span>`;
    return `<div class="crm-cp ${left < 0 ? 'expired' : ''} ${c.fresh ? 'fresh' : ''}" style="--c:${c.color}">
      <div class="cp-l"><b>${esc(c.disc)}</b><small>${c.auto ? '自動發放' : c.why ? 'AI 建議' : '手動活動'}</small></div>
      <div class="cp-r">
        <div class="cp-t"><span class="mono cp-code">${c.code}</span><button class="crm-x" data-copy="${c.code}" title="複製優惠碼">${icon('file', 13)}</button>${exp}</div>
        <b class="cp-name">${esc(c.name)}</b>
        ${c.why ? `<small class="cp-why">${icon('sparkle', 12)} ${esc(c.why)}</small>` : `<div class="cp-chs">${c.ch.map(x => chb(x, 'sm')).join('')}<small>到期 ${fmtDate(c.exp)}</small></div>`}
        <div class="cp-bar"><i data-w="${pct}"></i></div>
        <div class="cp-num"><span>已使用 <b>${n0(c.used)}</b> / ${n0(c.issued)}</span><b>${pct.toFixed(1)}%</b></div>
      </div></div>`;
  }).join('');
  $$('.cp-bar i', host).forEach((i, k) => gsap.fromTo(i, { width: 0 }, { width: i.dataset.w + '%', duration: 1.2, delay: k * 0.05, ease: 'power3.out' }));
  const fresh = $$('.crm-cp.fresh', host);
  if (fresh.length) { gsap.fromTo(fresh, { scale: 0.85, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.6, ease: 'back.out(1.8)' }); coupons.forEach(c => c.fresh = false); }
}
function addSuggestedCoupon() {
  const s = SUGGEST[sugIdx % SUGGEST.length];
  sugIdx++;
  const code = sugIdx > SUGGEST.length ? s.code + sugIdx : s.code;
  coupons.unshift({ ...s, code, issued: 0, used: 0, exp: new Date(Date.now() + s.days * DAYMS), fresh: true });
  renderCoupons();
  toast(`AI 建議新券｜${s.name}`, `${s.disc}・${s.why}`, { icon: icon('sparkle', 18) });
}

// ---------- 評論與口碑 ----------
function sentiOption() {
  const total = SENTI.reduce((s, x) => s + x.count, 0);
  return {
    animationDuration: 1200,
    tooltip: { trigger: 'item', formatter: (p) => `${p.marker}${p.name}<br/><b>${p.value} 則</b>（${p.percent}%）` },
    graphic: [
      { type: 'text', left: 'center', top: '33%', style: { text: `${(SENTI[0].count / total * 100).toFixed(0)}%`, fill: '#eafff4', font: '800 28px "Noto Sans TC", sans-serif' } },
      { type: 'text', left: 'center', top: '49%', style: { text: '正面評價', fill: 'rgba(214,240,226,0.72)', font: '12px "Noto Sans TC", sans-serif' } },
    ],
    legend: { bottom: 0, left: 'center', itemWidth: 10, itemHeight: 10, itemGap: 14, width: '96%', icon: 'circle', formatter: (n) => { const s = SENTI.find(x => x.name === n); return `${n} ${s.count}`; } },
    series: [{ type: 'pie', radius: ['54%', '76%'], center: ['50%', '46%'], padAngle: 2, itemStyle: { borderRadius: 7, borderColor: 'rgba(6,26,19,.6)', borderWidth: 1 }, label: { show: false },
      emphasis: { scale: true, scaleSize: 7, itemStyle: { shadowBlur: 20, shadowColor: 'rgba(0,0,0,.5)' } },
      data: SENTI.map(s => ({ name: s.name, value: s.count, itemStyle: { color: s.color, opacity: revFilter === 'all' || revFilter === 'todo' || revFilter === s.id ? 1 : 0.25 } })) }],
  };
}
function setRevFilter(v) {
  revFilter = v;
  $$('#revTabs .seg', root).forEach(b => b.classList.toggle('on', b.dataset.v === v));
  renderReviews(true);
  if (charts) charts.senti.setOption(sentiOption());
}
const SRC = { google: ['Google 評論', '#4f8df5'], line: ['LINE 回饋', '#2DB674'] };
const SENTI_N = { pos: ['正面', '#2DB674'], neu: ['中立', '#F0A531'], neg: ['負面', '#EC6A55'] };
function renderReviews(animate) {
  const list = reviews.filter(r => revFilter === 'all' ? true : revFilter === 'todo' ? !r.replied : r.senti === revFilter)
    .sort((a, b) => (revFilter === 'all' ? ((!!a.replied - !!b.replied) || ((b.urgent ? 1 : 0) - (a.urgent ? 1 : 0))) : 0) || (b.ts - a.ts));
  const pend = reviews.filter(r => !r.replied).length;
  $('#revPending', root).textContent = pend ? `${pend} 則待回覆・負評優先` : '全部已回覆';
  $('#revPending', root).className = 'chip-sm ' + (pend ? 'warn' : '');
  const host = $('#revList', root);
  if (!list.length) { host.innerHTML = `<div class="crm-none">${icon('check', 22)}<span>這個分類目前沒有評論</span></div>`; return; }
  host.innerHTML = list.map(r => {
    const [srcN, srcC] = SRC[r.src]; const [sN, sC] = SENTI_N[r.senti];
    const conf = 88 + (r.text.length % 11);
    return `<article class="crm-rv ${r.replied ? 'done' : ''} ${r.urgent && !r.replied ? 'urgent' : ''}" data-id="${r.id}">
      <header><span class="rv-src" style="--c:${srcC}">${r.src === 'google' ? 'G' : 'L'}</span>
        <div class="rv-who"><b>${esc(r.author)}</b><small>${srcN}・${ago(r.ts)}</small></div>
        ${r.stars ? `<span class="rv-stars">${'★'.repeat(r.stars)}<i>${'★'.repeat(5 - r.stars)}</i></span>` : ''}
        <span class="rv-senti" style="--c:${sC}">${sN} ${conf}%</span></header>
      ${r.urgent && !r.replied ? `<div class="rv-alert">${icon('bell', 13)} AI 偵測到負評，已即時通知${esc(OWNER)}</div>` : ''}
      <p class="rv-text">${esc(r.text)}</p>
      <div class="rv-tags">${r.tags.map(t => `<span>#${t}</span>`).join('')}</div>
      ${r.replied ? `<div class="rv-reply sent"><div class="rr-h">${icon('check', 14)} 已回覆・${fmtTime(r.repliedAt)}</div><p>${esc(r.replied)}</p></div>`
        : `<div class="rv-reply"><div class="rr-h">${icon('sparkle', 14)} AI 建議回覆<small>${r.lang === 'zh' ? '中文' : LANG_NAME[r.lang]}・語氣：${r.senti === 'neg' ? '誠懇致歉＋補償' : '親切感謝'}</small></div><p class="rr-txt">${esc(r.replies[r.alt || 0])}</p>
          <div class="rr-act"><button class="btn btn-primary btn-sm" data-rv="send">${icon('send', 14)} 採用並回覆</button><button class="btn btn-ghost btn-sm" data-rv="alt">${icon('refresh', 14)} 換個說法</button></div></div>`}
    </article>`;
  }).join('');
  if (animate) gsap.fromTo($$('.crm-rv', host), { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.35, stagger: 0.04 });
}
async function onReviewClick(e) {
  const b = e.target.closest('[data-rv]'); if (!b) return;
  const card = b.closest('.crm-rv'); const r = reviews.find(x => x.id === card.dataset.id); if (!r || r.busy) return;
  if (b.dataset.rv === 'alt') {
    r.alt = ((r.alt || 0) + 1) % r.replies.length;
    const p = $('.rr-txt', card);
    gsap.to(p, { opacity: 0, duration: 0.15, onComplete: () => { p.textContent = ''; gsap.set(p, { opacity: 1 }); typeText(p, r.replies[r.alt], r.lang === 'zh' || r.lang === 'ja' ? 10 : 4); } });
    return;
  }
  r.busy = true;
  $$('.rr-act button', card).forEach(x => x.disabled = true);
  b.innerHTML = `${icon('send', 14)} 回覆中…`;
  const box = $('.rv-reply', card);
  gsap.to(box, { borderColor: 'rgba(45,182,116,0.7)', duration: 0.3 });
  await sleep(650);
  r.replied = r.replies[r.alt || 0]; r.repliedAt = Date.now(); r.busy = false;
  toast(`已回覆｜${r.author}`, r.src === 'google' ? '回覆已發布到 Google 商家檔案（示範）' : '已透過 LINE 官方帳號回覆（示範）', { icon: icon('check', 18) });
  gsap.to(card, { opacity: 0.3, duration: 0.25, onComplete: () => { renderReviews(false); const n = $(`.crm-rv[data-id="${r.id}"]`, root); n && gsap.fromTo(n, { opacity: 0.3, backgroundColor: 'rgba(45,182,116,0.22)' }, { opacity: 1, backgroundColor: 'rgba(45,182,116,0)', duration: 1.2 }); } });
}
