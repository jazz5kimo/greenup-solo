// 自動化中心：食譜定義 + n8n 流程範本（示範格式，正式版由 GreenUP API 提供端點）
// 所有內容皆為示範用途，不代表真實串接。

import { IS_AMEI, VOC, SHIPPER } from './brief-data.js';

// 出貨通知對象：阿美＝小傑；其他業主＝負責出貨的人員（沒有就只有負責人自己）
const SHIP_NAME = SHIPPER ? SHIPPER.name : '';
const SHIP_VERB = IS_AMEI ? '出貨' : VOC.ship;
export const NOTIFY_WHO = { jie: SHIP_NAME || '我', me: '我', both: SHIP_NAME ? `${SHIP_NAME}和我` : '我' };
const NOTIFY_OPTS = SHIPPER ? [['jie', `${SHIP_NAME}（${(SHIPPER.title || '').split('・')[0] || '出貨'}）`], ['me', '我自己'], ['both', `${SHIP_NAME}和我`]] : [['me', '我自己（目前只有負責人）']];
export const CH_LABEL = { line: 'LINE', web: '官網 AI 導購', pos: '門市 POS', phone: 'AI 電話客服', whatsapp: 'WhatsApp', zalo: 'Zalo', messenger: 'Messenger' };
export const LANG_NAME = { zh: '中文', ja: '日文', en: '英文', vi: '越南文', ms: '馬來文' };

export const CATS = [
  { id: 'all', name: '全部' },
  { id: 'sales', name: '銷售', color: 'var(--leaf)' },
  { id: 'pay', name: '收款', color: 'var(--sky)' },
  { id: 'acct', name: '帳務報稅', color: 'var(--violet)' },
  { id: 'ops', name: '營運', color: 'var(--amber)' },
];
export const CAT_MAP = Object.fromEntries(CATS.map(c => [c.id, c]));

const sel = (key, label, options, hint = '') => ({ key, label, type: 'select', options, hint });
const num = (key, label, unit, min, max, step = 1, hint = '') => ({ key, label, type: 'number', unit, min, max, step, hint });
const tog = (key, label, hint = '') => ({ key, label, type: 'toggle', hint });

// chain(s) → { when: 觸發句, then: [動作…] }
export const RECIPES = [
  {
    id: 'reply', cat: 'sales', icon: 'chat', color: '#2DB674', mins: 4,
    title: '客人來問，AI 用他的語言回覆、成立訂單、傳付款連結',
    chain: (s) => ({ when: '客人在 LINE／官網詢問', then: ['AI 用客人的語言推薦', `成立訂單${s.cap ? `（${(s.cap / 1000).toFixed(0)} 千元以上先問我）` : ''}`, `傳付款連結（${s.link} 小時有效）`] }),
    settings: [
      sel('tone', 'AI 回覆語氣', [['warm', '親切像朋友'], ['pro', '專業有禮'], ['short', '簡短快速']]),
      num('cap', '金額超過多少要先問我', '元', 0, 50000, 1000, '0 代表全部交給 AI'),
      sel('link', '付款連結有效時間', [['24', '24 小時'], ['48', '48 小時'], ['72', '72 小時']]),
    ],
    defaults: { tone: 'warm', cap: 5000, link: '24' },
    offWarn: '關掉後，客人在 LINE 或官網問問題時，AI 不會再自動回覆與成立訂單。訊息會留在收件匣，需要你自己回覆、手動建單。',
  },
  {
    id: 'paid', cat: 'pay', icon: 'receipt', color: '#2E97D4', mins: 6, core: true,
    title: `客人付款成功，自動開發票、記帳、扣庫存、通知${SHIP_VERB}`,
    chain: (s) => ({ when: '客人付款成功', then: ['開電子發票', '記帳', '扣庫存', `通知${NOTIFY_WHO[s.notify] || '我'}${SHIP_VERB}`] }),
    settings: [
      sel('notify', `${SHIP_VERB}通知給誰`, NOTIFY_OPTS),
      sel('invoice', '發票類型', [['auto', '自動判斷（有統編開三聯）'], ['b2c', '一律二聯（存載具）']]),
      tog('print', '門市訂單同時列印發票證明聯'),
    ],
    defaults: { notify: SHIPPER ? 'jie' : 'me', invoice: 'auto', print: true },
    offWarn: '關掉後，客人付款不會再自動開電子發票、記帳和扣庫存。你需要每筆訂單手動開票（依法 48 小時內）、自己記帳，庫存數字也會不準。',
  },
  {
    id: 'remind', cat: 'pay', icon: 'bell', color: '#F0A531', mins: 3,
    title: '超過 24 小時沒付款，用客人的語言提醒；第 3 天再提醒一次',
    chain: (s) => ({ when: `超過 ${s.first} 小時未付款`, then: ['用客人的語言提醒', `第 ${s.second} 天再提醒一次`, ...(s.cancel ? ['第 7 天自動取消並釋出庫存'] : [])] }),
    settings: [
      num('first', '第一次提醒', '小時後', 6, 72, 6),
      num('second', '第二次提醒', '天後', 2, 7, 1),
      tog('cancel', '第 7 天還沒付款就自動取消訂單'),
    ],
    defaults: { first: 24, second: 3, cancel: false },
    offWarn: '關掉後，沒付款的訂單不會再自動提醒客人。應收帳款可能越積越多，需要你自己一個個聯絡。',
  },
  {
    id: 'daily', cat: 'ops', icon: 'trend', color: '#5EE0C4', mins: 15, preview: true,
    title: '每天晚上把「今日銷售摘要」傳到我的 LINE',
    chain: (s) => ({ when: `每天 ${s.time}`, then: ['整理今日營收、熱賣、待收款', `傳到我的 ${s.to === 'mail' ? 'Email' : 'LINE'}`] }),
    settings: [
      sel('time', '傳送時間', [['18:00', '18:00'], ['20:00', '20:00'], ['21:00', '21:00'], ['22:00', '22:00']]),
      sel('to', '傳到哪裡', [['line', '我的 LINE'], ['mail', '我的 Email']]),
      tog('tomorrow', '附上「明天要做的事」'),
    ],
    defaults: { time: '21:00', to: 'line', tomorrow: true },
    offWarn: '關掉後，晚上不會再收到今日銷售摘要。想知道今天賣了什麼，要自己打開後台查。',
  },
  {
    id: 'settle', cat: 'acct', icon: 'bank', color: '#7C62E6', mins: 10,
    title: '金流撥款入帳，自動對帳、沖銷應收帳款',
    chain: (s) => ({ when: '金流撥款入帳', then: ['比對訂單與撥款', '沖銷應收帳款', s.fee ? '手續費自動記帳' : '手續費留給我確認', `差額超過 ${s.tol} 元通知我`] }),
    settings: [
      num('tol', '差額超過多少要通知我', '元', 0, 500, 10),
      tog('fee', '金流手續費自動記成費用'),
    ],
    defaults: { tol: 10, fee: true },
    offWarn: '關掉後，金流撥款進來不會自動對帳。你需要自己逐筆核對銀行明細，並手動把應收帳款銷掉。',
  },
  {
    id: 'stock', cat: 'ops', icon: 'box', color: '#EC6A55', mins: 8,
    title: '庫存低於安全量，通知我並產生採購單草稿',
    chain: (s) => ({ when: '庫存低於安全量', then: ['LINE 通知我', `產生採購單草稿（補 ${s.days} 天份）`, '我按確認才送出'] }),
    settings: [
      num('days', '採購單補幾天份', '天', 3, 30, 1),
      sel('check', '檢查頻率', [['live', '每筆訂單後馬上檢查'], ['daily', '每天早上 08:00']]),
    ],
    defaults: { days: 7, check: 'live' },
    offWarn: '關掉後，庫存不夠時不會通知你，也不會產生採購單草稿。熱賣商品可能突然缺貨。',
  },
  {
    id: 'vat', cat: 'acct', icon: 'tax', color: '#DD5597', mins: 0, safe: true,
    title: '營業稅截止前 7 天，整理好 401 申報資料，通知我確認',
    chain: (s) => ({ when: `營業稅截止前 ${s.days} 天`, then: ['整理 401 申報資料', s.who === 'cpa' ? '交給記帳士複核' : '通知我確認', '確認後才申報'] }),
    settings: [
      num('days', '提前幾天準備', '天', 3, 14, 1),
      sel('who', '整理好交給誰', [['me', '我自己確認'], ['cpa', '交給記帳士複核']]),
    ],
    defaults: { days: 7, who: 'me' },
    offWarn: '關掉後，營業稅截止前不會自動整理申報資料。你需要自己匯出發票、計算銷項與進項稅額，容易錯過期限。',
  },
  {
    id: 'close', cat: 'acct', icon: 'book', color: '#8F7BF0', mins: 60,
    title: '每月 5 日自動月結，把損益表寄給我',
    chain: (s) => ({ when: `每月 ${s.day} 日`, then: ['自動月結（產銷人發財）', '產生損益表', `寄到 ${s.to === 'cpa' ? '我和記帳士' : '我'}的信箱`] }),
    settings: [
      num('day', '每月幾號月結', '日', 1, 10, 1),
      sel('to', '損益表寄給', [['me', '我自己'], ['cpa', '我和記帳士']]),
    ],
    defaults: { day: 5, to: 'me' },
    offWarn: '關掉後，每月不會自動結帳與寄損益表。你需要自己進後台結帳，才知道上個月賺多少。',
  },
  {
    id: 'track', cat: 'sales', icon: 'truck', color: '#F0A531', mins: 2,
    title: '出貨後，用客人的語言傳物流追蹤連結',
    chain: (s) => ({ when: '包裹交給物流', then: ['用客人的語言傳追蹤連結', ...(s.review ? ['到貨隔天請客人評價'] : [])] }),
    settings: [
      sel('delay', '什麼時候傳', [['0', '交寄後馬上'], ['60', '交寄後 1 小時']]),
      tog('review', '到貨隔天請客人留下評價'),
    ],
    defaults: { delay: '0', review: true },
    offWarn: '關掉後，客人不會收到物流追蹤連結，可能會一直傳訊息問「寄出了嗎？」。',
  },
];
export const RECIPE_MAP = Object.fromEntries(RECIPES.map(r => [r.id, r]));

// ---------- n8n workflow 產生器 ----------
const TYPES = {
  webhook: ['n8n-nodes-base.webhook', 2],
  http: ['n8n-nodes-base.httpRequest', 4.2],
  if: ['n8n-nodes-base.if', 2],
  schedule: ['n8n-nodes-base.scheduleTrigger', 1.2],
  wait: ['n8n-nodes-base.wait', 1.1],
  email: ['n8n-nodes-base.emailSend', 2.1],
};
const API = '={{ $env.GREENUP_API_URL }}';
const CRED = { httpHeaderAuth: { id: 'greenup-api-key', name: 'GreenUP API 金鑰（地端）' } };

function hid(str) { // 固定的 node id（類 uuid），讓每次匯出一致
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  const hex = (n) => (n >>> 0).toString(16).padStart(8, '0');
  const a = hex(h), b = hex(Math.imul(h ^ 0x9e3779b9, 2654435761)), c = hex(Math.imul(h ^ 0x85ebca6b, 3266489917)), d = hex(Math.imul(h ^ 0xc2b2ae35, 668265263));
  return `${a}-${b.slice(0, 4)}-4${b.slice(5, 8)}-a${c.slice(1, 4)}-${c.slice(4)}${d}`.slice(0, 36);
}

const webhook = (name, path) => ({ name, t: 'webhook', parameters: { httpMethod: 'POST', path, responseMode: 'onReceived', options: {} }, webhookId: hid('wh' + path) });
const schedule = (name, cron) => ({ name, t: 'schedule', parameters: { rule: { interval: [{ field: 'cronExpression', expression: cron }] } } });
const wait = (name, amount, unit) => ({ name, t: 'wait', parameters: { resume: 'timeInterval', amount, unit } });
function api(name, method, path, body, extra = {}) {
  const p = { method, url: `${API}${path}`, authentication: 'genericCredentialType', genericAuthType: 'httpHeaderAuth' };
  if (extra.headers) p.sendHeaders = true, p.headerParameters = { parameters: Object.entries(extra.headers).map(([name, value]) => ({ name, value })) };
  if (body) { p.sendBody = true; p.specifyBody = 'json'; p.jsonBody = '=' + JSON.stringify(body, null, 2); }
  p.options = { timeout: 15000 };
  return { name, t: 'http', parameters: p, credentials: CRED, retryOnFail: !!extra.retry, ...(extra.retry ? { maxTries: 3, waitBetweenTries: 2000 } : {}) };
}
function cond(name, left, op, right, type = 'string') {
  return { name, t: 'if', parameters: {
    conditions: {
      options: { caseSensitive: true, leftValue: '', typeValidation: 'strict' },
      conditions: [{ id: hid(name + left), leftValue: left, rightValue: right, operator: { type, operation: op, ...(op === 'true' || op === 'false' ? { singleValue: true } : {}) } }],
      combinator: 'and',
    },
    options: {},
  } };
}
const email = (name, to, subject) => ({ name, t: 'email', parameters: { fromEmail: 'noreply@greenup.local', toEmail: to, subject, emailFormat: 'html', html: '={{ $json.report_html }}', options: { attachments: 'data' } }, credentials: { smtp: { id: 'local-smtp', name: '地端郵件伺服器' } } });

// links: [from, to, outputIndex]
function build(name, list, links, layout) {
  const nodes = list.map((n, i) => {
    const [type, typeVersion] = TYPES[n.t];
    const [col, row] = layout ? layout[i] : [i, 0];
    const node = { parameters: n.parameters, id: hid(name + n.name), name: n.name, type, typeVersion, position: [240 + col * 240, 300 + row * 200] };
    if (n.webhookId) node.webhookId = n.webhookId;
    if (n.credentials) node.credentials = n.credentials;
    if (n.retryOnFail) { node.retryOnFail = true; node.maxTries = n.maxTries; node.waitBetweenTries = n.waitBetweenTries; }
    return node;
  });
  const connections = {};
  for (const [a, b, out = 0] of links) {
    const from = list[a].name, to = list[b].name;
    connections[from] = connections[from] || { main: [] };
    while (connections[from].main.length <= out) connections[from].main.push([]);
    connections[from].main[out].push({ node: to, type: 'main', index: 0 });
  }
  return {
    name, nodes, connections, active: false,
    settings: { executionOrder: 'v1', timezone: 'Asia/Taipei', saveManualExecutions: true },
    meta: { templateCredsSetupCompleted: false, note: '示範格式，正式版由 GreenUP API 提供端點' },
    tags: [],
  };
}

const ord = '{{ $json.body.order_id }}';

export function n8nWorkflow(id, s) {
  switch (id) {
    case 'reply': return build('GreenUP｜客人詢問 → AI 回覆並成立訂單', [
      webhook('收到客人訊息（LINE／官網）', 'greenup/inbound-message'),
      api('GreenUP AI 代理：理解需求並以客人語言回覆', 'POST', '/v1/ai/reply', { conversation_id: '{{ $json.body.conversation_id }}', channel: '{{ $json.body.channel }}', text: '{{ $json.body.text }}', tone: s.tone, auto_language: true }, { retry: true }),
      cond('客人確認要下單？', '={{ $json.intent }}', 'equals', 'place_order'),
      cond(`金額在 NT$ ${s.cap || '∞'} 以內？`, '={{ $json.draft_order.total }}', 'lte', s.cap || 99999999, 'number'),
      api('GreenUP API：成立訂單並產生付款連結', 'POST', '/v1/orders', { draft_id: '{{ $json.draft_order.id }}', payment_link: { expires_in_hours: +s.link } }, { headers: { 'Idempotency-Key': '={{ $json.draft_order.id }}' } }),
      api('用客人的語言傳付款連結', 'POST', '/v1/messages/send', { conversation_id: '{{ $json.conversation_id }}', template: 'payment_link', lang: '{{ $json.customer.lang }}', order_id: '{{ $json.order_id }}' }),
      api('LINE 通知我：大額訂單請確認', 'POST', '/v1/notify/owner', { channel: 'line', template: 'confirm_large_order', draft_id: '{{ $json.draft_order.id }}' }),
    ], [[0, 1], [1, 2], [2, 3, 0], [3, 4, 0], [4, 5], [3, 6, 1]], [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [4, 1]]);

    case 'paid': return build('GreenUP｜付款成功 → 開票・記帳・扣庫存・出貨通知', [
      webhook('金流付款成功通知', 'greenup/payment-succeeded'),
      api('GreenUP API：完成訂單交易（開發票＋記帳＋扣庫存，單一交易）', 'POST', `/v1/orders/${ord}/complete`, { payment_id: '{{ $json.body.payment_id }}', amount: '{{ $json.body.amount }}', invoice: { type: s.invoice === 'auto' ? 'auto' : 'b2c', print_proof: !!s.print }, ledger: true, inventory: true }, { headers: { 'Idempotency-Key': '={{ $json.body.payment_id }}' }, retry: true }),
      cond('是否宅配？', '={{ $json.fulfillment.method }}', 'equals', 'home_delivery'),
      api('GreenUP API：建立託運單', 'POST', '/v1/shipments', { order_id: '{{ $json.order_id }}', carrier: '{{ $json.fulfillment.carrier }}', temperature: '{{ $json.fulfillment.temperature }}' }),
      api(`LINE 推播：通知${NOTIFY_WHO[s.notify] || '我'}${SHIP_VERB}`, 'POST', '/v1/notify/staff', { channel: 'line', to: s.notify === 'both' ? ['jie', 'owner'] : [s.notify === 'me' ? 'owner' : s.notify], template: 'ship_order', order_id: '{{ $json.order_id }}' }),
    ], [[0, 1], [1, 2], [2, 3, 0], [3, 4], [2, 4, 1]], [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]]);

    case 'remind': {
      const list = [
        webhook('GreenUP 事件：訂單待付款', 'greenup/order-pending'),
        wait(`等待 ${s.first} 小時`, +s.first, 'hours'),
        api('查詢付款狀態（1）', 'GET', `/v1/orders/${ord}`),
        cond('仍未付款？（1）', '={{ $json.status }}', 'equals', 'pending'),
        api('用客人的語言提醒（第 1 次）', 'POST', '/v1/messages/send', { order_id: '{{ $json.id }}', template: 'payment_reminder_1', lang: '{{ $json.customer.lang }}' }),
        wait(`等到第 ${s.second} 天`, Math.max(1, s.second * 24 - s.first), 'hours'),
        api('查詢付款狀態（2）', 'GET', `/v1/orders/{{ $('GreenUP 事件：訂單待付款').item.json.body.order_id }}`),
        cond('仍未付款？（2）', '={{ $json.status }}', 'equals', 'pending'),
        api('用客人的語言再提醒（第 2 次）', 'POST', '/v1/messages/send', { order_id: '{{ $json.id }}', template: 'payment_reminder_2', lang: '{{ $json.customer.lang }}' }),
      ];
      const links = [[0, 1], [1, 2], [2, 3], [3, 4, 0], [4, 5], [5, 6], [6, 7], [7, 8, 0]];
      if (s.cancel) {
        list.push(wait('等到第 7 天', Math.max(1, (7 - s.second) * 24), 'hours'));
        list.push(api('GreenUP API：取消訂單並釋出庫存', 'POST', `/v1/orders/{{ $('GreenUP 事件：訂單待付款').item.json.body.order_id }}/cancel`, { reason: 'unpaid_7_days', only_if_status: 'pending' }));
        links.push([8, 9], [9, 10]);
      }
      return build('GreenUP｜未付款 → 用客人語言提醒', list, links);
    }

    case 'daily': {
      const [h, m] = s.time.split(':');
      return build('GreenUP｜每日銷售摘要', [
        schedule(`每天 ${s.time}`, `${+m} ${+h} * * *`),
        api('GreenUP API：取得今日銷售摘要', 'GET', `/v1/reports/daily-summary?date={{ $now.toFormat('yyyy-MM-dd') }}&include_tomorrow=${!!s.tomorrow}`),
        s.to === 'mail'
          ? email('寄給我', '={{ $env.OWNER_EMAIL }}', '=今日銷售摘要 {{ $now.toFormat("MM/dd") }}')
          : api('LINE 推播給我', 'POST', '/v1/notify/owner', { channel: 'line', template: 'daily_summary', data: '{{ $json }}' }),
      ], [[0, 1], [1, 2]]);
    }

    case 'settle': return build('GreenUP｜金流撥款 → 自動對帳沖銷', [
      webhook('金流撥款入帳通知', 'greenup/settlement'),
      api('GreenUP API：對帳並沖銷應收（單一交易）', 'POST', '/v1/reconciliations', { settlement_id: '{{ $json.body.settlement_id }}', provider: '{{ $json.body.provider }}', amount: '{{ $json.body.amount }}', fee_auto_post: !!s.fee, tolerance: s.tol }, { headers: { 'Idempotency-Key': '={{ $json.body.settlement_id }}' }, retry: true }),
      cond('有對不上的差額？', '={{ $json.unmatched_amount }}', 'gt', s.tol, 'number'),
      api('LINE 通知我確認差額', 'POST', '/v1/notify/owner', { channel: 'line', template: 'reconcile_diff', reconciliation_id: '{{ $json.id }}' }),
    ], [[0, 1], [1, 2], [2, 3, 0]]);

    case 'stock': return build('GreenUP｜低庫存 → 通知與採購單草稿', [
      s.check === 'daily' ? schedule('每天 08:00 檢查庫存', '0 8 * * *') : webhook('GreenUP 事件：庫存低於安全量', 'greenup/stock-low'),
      api('GreenUP API：產生採購單草稿', 'POST', '/v1/purchase-orders/drafts', { items: '{{ $json.body ? $json.body.items : $json.items }}', cover_days: s.days, status: 'draft' }),
      api('LINE 通知我（附確認按鈕）', 'POST', '/v1/notify/owner', { channel: 'line', template: 'stock_low_po_draft', draft_id: '{{ $json.id }}' }),
    ], [[0, 1], [1, 2]]);

    case 'vat': return build('GreenUP｜營業稅 401 申報資料準備（不自動送出）', [
      schedule('每天 09:00 檢查申報期限', '0 9 * * *'),
      api('GreenUP API：查詢下一個營業稅期限', 'GET', '/v1/tax/vat/next-deadline'),
      cond(`距離截止 ≤ ${s.days} 天？`, '={{ $json.days_left }}', 'lte', +s.days, 'number'),
      api('GreenUP API：整理 401 申報資料（草稿）', 'POST', '/v1/tax/vat/401/prepare', { period: '{{ $json.period }}', submit: false }),
      cond('交給記帳士？', '={{ ' + (s.who === 'cpa') + ' }}', 'true', '', 'boolean'),
      api('通知記帳士複核', 'POST', '/v1/notify/accountant', { draft_id: '{{ $json.draft_id }}', template: 'vat_review' }),
      api('LINE 通知我確認（負責人按下才申報）', 'POST', '/v1/notify/owner', { channel: 'line', template: 'vat_confirm', draft_id: '{{ $json.draft_id }}' }),
    ], [[0, 1], [1, 2], [2, 3, 0], [3, 4], [4, 5, 0], [4, 6, 1]], [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [5, 1]]);

    case 'close': return build('GreenUP｜每月自動月結與損益表', [
      schedule(`每月 ${s.day} 日 08:00`, `0 8 ${s.day} * *`),
      api('GreenUP API：月結（產銷人發財）並產生損益表', 'POST', '/v1/books/month-close', { period: "{{ $now.minus({ months: 1 }).toFormat('yyyy-MM') }}", report: ['income_statement'], format: 'html' }, { retry: true }),
      email(s.to === 'cpa' ? '寄給我和記帳士' : '寄給我', s.to === 'cpa' ? '={{ $env.OWNER_EMAIL }},{{ $env.ACCOUNTANT_EMAIL }}' : '={{ $env.OWNER_EMAIL }}', '=上月損益表 {{ $now.minus({ months: 1 }).toFormat("yyyy/MM") }}'),
    ], [[0, 1], [1, 2]]);

    case 'track': {
      const list = [
        webhook('物流事件：包裹已交寄', 'greenup/shipment-dispatched'),
        ...(+s.delay ? [wait('等待 1 小時', 1, 'hours')] : []),
        api('GreenUP API：取得追蹤連結與客人語言', 'GET', `/v1/shipments/{{ $('物流事件：包裹已交寄').item.json.body.shipment_id }}`),
        api('用客人的語言傳追蹤連結', 'POST', '/v1/messages/send', { order_id: '{{ $json.order_id }}', template: 'tracking_link', lang: '{{ $json.customer.lang }}', tracking_url: '{{ $json.tracking_url }}' }),
      ];
      if (s.review) { list.push(wait('等到到貨隔天', 1, 'days'), api('請客人留下評價', 'POST', '/v1/messages/send', { order_id: '{{ $json.order_id }}', template: 'review_request', lang: '{{ $json.customer.lang }}' })); }
      return build('GreenUP｜出貨 → 傳物流追蹤連結', list, list.slice(1).map((_, i) => [i, i + 1]));
    }
  }
  return build('GreenUP', [], []);
}
