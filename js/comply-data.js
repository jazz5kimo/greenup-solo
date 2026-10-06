// 合規與文件：示範資料（健檢項目、文件櫃、到期提醒）
// 所有內容為虛構示範，法規說明以保守措辭撰寫，實際以主管機關規定與專業人士意見為準。
import { startOfDay, addDays, PRODUCTS } from './data.js';
import { TENANT, TENANT_ID } from './tenant.js';
import { STAFF } from './ledger.js';

const AMEI = TENANT_ID === 'amei';
export const DISCLAIMER = '僅供參考，實際以主管機關規定與專業人士意見為準';
const fakeTaxId = (id) => { let h = 7; for (const ch of String(id)) h = (h * 31 + ch.charCodeAt(0)) % 9e7; return String(1e7 + h).slice(0, 8); };
export const COMPANY = AMEI
  ? { name: '阿美手作甜點有限公司', brand: '阿美手作甜點', taxId: '90418826', owner: '阿美', addr: '台北市大安區溫州街 ○○ 號 1 樓' }
  : { name: `${TENANT.name}有限公司`, brand: TENANT.name, taxId: fakeTaxId(TENANT.id), owner: TENANT.owner || (STAFF[0] && STAFF[0].name) || '負責人', addr: `${TENANT.region || '台北市'}○○路 ○○ 號 1 樓（示範）` };

// 健檢分類（雷達圖六軸）
export const CATS = [
  { id: 'tax', name: '稅務發票', icon: 'receipt', color: '#2DB674' },
  { id: 'labor', name: '勞動與保險', icon: 'users', color: '#2E97D4' },
  { id: 'food', name: AMEI ? '食品安全與標示' : (IND().axis), icon: 'leaf', color: '#F0A531' },
  { id: 'ecom', name: '電商與消費者保護', icon: 'cart', color: '#DD5597' },
  { id: 'privacy', name: '個資與資安', icon: 'lock', color: '#7C62E6' },
  { id: 'corp', name: '公司登記', icon: 'bank', color: '#5EE0C4' },
];
export const CAT_MAP = Object.fromEntries(CATS.map(c => [c.id, c]));

// 上次健檢（30 天前）的分類分數，用於雷達圖比較
export const LAST_SCORES = { tax: 75, labor: 70, food: 45, ecom: 50, privacy: 50, corp: 67 };

// status：pass 通過／warn 注意／todo 待辦
// fix：可由 AI 一鍵處理（模擬）；go：前往相關頁
const AMEI_CHECKS = [
  // 稅務發票
  { id: 'einv', cat: 'tax', status: 'pass', title: '電子發票自動開立',
    plain: 'POS 門市、LINE、官網訂單結帳後都會自動開立電子發票，並上傳至財政部電子發票平台（示範串接）。',
    why: '銷售時應依規定開立發票，漏開或延遲開立可能被要求補稅並受罰。',
    go: ['pos', '前往 POS 收銀台'] },
  { id: 'taxid', cat: 'tax', status: 'warn', title: '統編與手機載具資料正確',
    plain: '近 30 天有 2 筆企業訂單的統一編號檢查碼不符，1 筆手機條碼格式錯誤，發票可能開錯抬頭。',
    why: '統編錯誤會讓客戶無法扣抵進項稅額，需作廢重開，也會影響你和客戶的帳務往來。',
    fix: ['AI 比對並產生更正清單', '已比對 3 筆資料並產生更正清單，請確認後作廢重開（示範）'], go: ['quotes', '查看企業客戶'] },
  { id: 'vat', cat: 'tax', status: 'pass', title: '營業稅每兩個月按期申報',
    plain: '銷項與進項發票已自動彙整，系統會在每期截止日前 10 天提醒你確認申報。',
    why: '逾期申報可能被加徵滯報金或怠報金，金額隨延遲天數增加。',
    go: ['tax', '前往自動化報稅'] },
  { id: 'withhold', cat: 'tax', status: 'pass', title: '個人房東租金扣繳',
    plain: '店面租金付給個人房東，系統每月自動計算扣繳稅款，並提醒隔年 1 月申報扣繳憑單。',
    why: '支付個人租金依相關法規可能需要扣繳並申報，漏扣或漏報可能被要求補繳與處罰，建議與記帳士確認。',
    go: ['tax', '查看扣繳試算'] },

  // 勞動與保險
  { id: 'enroll', cat: 'labor', status: 'pass', title: '到職當日加保勞保、健保、勞退提繳',
    plain: '小芸（全職）與小傑（兼職）都在到職當天完成勞保、就業保險、職災保險、健保加保，並提繳 6% 勞退。',
    why: '依相關法規，雇主應在員工到職當日辦理加保；晚加保期間若員工發生事故，雇主可能需自行負擔賠償。',
    go: ['staff', '前往排班打卡'] },
  { id: 'contract', cat: 'labor', status: 'todo', title: '兼職人員書面勞動契約',
    plain: '小傑（兼職包裝出貨）目前只有 LINE 對話約定，還沒有簽署書面契約，工時、時薪、休假規則沒有白紙黑字。',
    why: '書面契約可以避免日後對工時、工資與離職規定的爭議，也是勞動檢查時常被問到的文件。',
    fix: ['AI 產生兼職契約草稿', '已依小傑目前的時薪與班表產生兼職勞動契約草稿，可傳 LINE 請他線上簽署（示範）'], go: ['staff', '查看小傑班表'] },
  { id: 'attend', cat: 'labor', status: 'pass', title: '出勤紀錄與工資清冊保存',
    plain: '打卡紀錄、加班申請與每月薪資單都自動保存，可隨時匯出。',
    why: '出勤紀錄與工資清冊依相關法規需保存一定年限，勞檢時無法提出可能會被處罰。',
    go: ['staff', '查看打卡紀錄'] },
  { id: 'wage', cat: 'labor', status: 'pass', title: '時薪與月薪不低於基本工資',
    plain: '小傑時薪與小芸月薪都高於系統內建的基本工資參數；基本工資調整時系統會提醒你檢查。',
    why: '工資低於基本工資可能被處罰並需補發差額，每年調整時最容易忘記。',
    go: ['staff', '查看薪資設定'] },

  // 食品安全與標示
  { id: 'fbo', cat: 'food', status: 'warn', title: '食品業者登錄資料',
    plain: '已在「食品業者登錄平台」完成登錄。但今年新增冷藏宅配與禮盒批發，登錄的營業型態與品項建議確認是否需要更新。',
    why: '依相關法規，特定食品業者需完成登錄，資料變更時也應更新；未登錄或資料不符可能被要求限期改正。',
    fix: ['AI 產生資料更新清單', '已比對目前販售品項與通路，列出 3 項建議更新的登錄資料，請至食品業者登錄平台確認（示範）'] },
  { id: 'label', cat: 'food', status: 'todo', title: '產品標示：品名、成分、過敏原、有效日期、製造廠商',
    plain: '7 項商品中，「手工餅乾禮盒」標籤未標示「堅果」過敏原，「鳳梨酥禮盒」缺少製造廠商電話。',
    why: '包裝食品標示不完整可能被要求下架改正；過敏原沒標清楚更可能造成消費者健康風險。',
    fix: ['AI 產生標籤草稿', '已產生 2 款禮盒的修正版標籤（含過敏原與廠商資訊），列印後貼上新包裝即可（示範）'], go: ['listing', '前往商品上架'] },
  { id: 'health', cat: 'food', status: 'pass', title: '食品從業人員健康檢查',
    plain: '阿美、小芸、小傑今年度的健康檢查報告都已上傳，下次到期前 30 天提醒。',
    why: '食品從業人員依相關規定需定期健康檢查，衛生稽查時會查看紀錄。',
    go: null },
  { id: 'liab', cat: 'food', status: 'warn', title: '產品責任保險有效',
    plain: '產品責任險＋公共意外責任險將在 45 天後到期，目前保單未包含跨境寄送的商品。',
    why: '依相關法規，部分食品業者需投保產品責任保險；保單過期或範圍不足，出事時需自行賠償。',
    fix: ['AI 整理續保比價需求', '已整理續保需求（含跨境寄送），並建立「到期前 30 天」提醒（示範）'] },

  // 電商與消費者保護
  { id: 'cancel7', cat: 'ecom', status: 'warn', title: '網路銷售七天解除契約權揭露',
    plain: '網購一般商品，消費者通常有 7 天可無條件解除契約（俗稱鑑賞期）；易腐敗、保存期限較短的食品等可能屬於例外，但需在銷售頁事先清楚揭露。官網已揭露，LINE 與 WhatsApp 下單流程尚未說明。',
    why: '沒有事先清楚揭露例外情形，可能無法主張排除七天解除權，容易產生退貨爭議。',
    fix: ['AI 補上下單須知', '已在 LINE、WhatsApp 的 AI 下單流程加入「生鮮甜點不適用七天解除權」說明（示範）'], go: ['agent', '前往 AI 店員設定'] },
  { id: 'pageinfo', cat: 'ecom', status: 'pass', title: '商品頁揭露價格、運費、付款與業者資訊',
    plain: '官網與各通路商品頁都有售價、運費門檻（滿 NT$ 1,500 免運）、付款方式、公司名稱與客服電話。',
    why: '網路交易資訊揭露不完整，可能被主管機關要求改正，也會降低消費者信任。',
    go: ['listing', '查看商品頁'] },
  { id: 'refund', cat: 'ecom', status: 'todo', title: '退款與客訴處理流程',
    plain: '退款規則散在聊天紀錄裡，沒有固定處理時限與紀錄，近 3 個月有 4 件客訴沒有結案註記。',
    why: '清楚的退款流程可減少消費爭議與負評；被申訴時也能提出處理紀錄。',
    fix: ['AI 建立退款 SOP', '已建立「收到申請 → 3 日內回覆 → 7 日內退款」流程，並把 4 件客訴標記待結案（示範）'], go: ['crm', '查看客訴紀錄'] },

  // 個資與資安
  { id: 'notice', cat: 'privacy', status: 'pass', title: '蒐集個資前告知目的與取得同意',
    plain: '會員註冊、LINE 加好友時，都會顯示個資蒐集告知（目的、類別、利用期間與方式）並勾選同意。',
    why: '依個人資料保護相關法規，蒐集個資前應告知當事人；未告知可能被處罰並引起客訴。',
    go: ['crm', '查看會員設定'] },
  { id: 'optout', cat: 'privacy', status: 'warn', title: '行銷訊息可以退訂',
    plain: 'LINE 推播有退訂按鈕，但簡訊與 Email 行銷模板缺少「退訂連結」。',
    why: '客戶表示拒絕接收行銷時應停止發送；沒有退訂管道容易被檢舉。',
    fix: ['AI 補上退訂連結', '已在 2 個簡訊模板與 3 個 Email 模板加入一鍵退訂連結（示範）'], go: ['crm', '前往會員與行銷'] },
  { id: 'access', cat: 'privacy', status: 'todo', title: '帳號權限與雙重驗證',
    plain: '小傑（包裝出貨）帳號仍有「會計帳務」與「會員匯出」權限；阿美的管理員帳號尚未開啟雙重驗證。',
    why: '權限過大或帳號被盜，可能造成客戶個資外洩，事後通知與處理成本很高。',
    fix: ['AI 套用最小權限', '已將小傑權限調整為「出貨＋訂單檢視」，並寄出雙重驗證設定連結給阿美（示範）'], go: ['hub', '前往資安與權限'] },
  { id: 'backup', cat: 'privacy', status: 'pass', title: '資料自動備份與加密',
    plain: '訂單、帳務、會員資料每日自動備份並加密保存，可依部署模式選擇雲端或地端。',
    why: '電腦故障或勒索病毒時，有備份才不會讓生意停擺。',
    go: ['hub', '查看整合與協作'] },

  // 公司登記
  { id: 'scope', cat: 'corp', status: 'warn', title: '登記營業項目涵蓋實際經營',
    plain: '登記的營業項目包含食品零售，但目前實際也做「網路銷售」與「跨境寄送」，建議確認是否需要增列營業項目。',
    why: '經營未登記的營業項目，可能被要求補辦變更登記；部分通路或補助申請也會查核營業項目。',
    go: ['hub', '轉給記帳士協助'] },
  { id: 'addr', cat: 'corp', status: 'pass', title: '登記地址與實際營業地址一致',
    plain: '公司登記、稅籍登記與店面租約地址一致；搬遷時系統會提醒同步辦理變更。',
    why: '地址變更未登記，可能收不到政府公文或稅單，也可能被處罰。',
    go: null },
  { id: 'tm', cat: 'corp', status: 'pass', title: '品牌商標已註冊',
    plain: '「阿美手作 AMEI」商標已註冊於糕點類別，專用期間 10 年，到期前系統會提醒延展。',
    why: '沒註冊的品牌名稱可能被他人搶註，之後反而不能使用自己的店名。',
    go: null },
];

export const CHECKS = AMEI ? AMEI_CHECKS : tenantChecks();

/* ---------- 文件櫃 ---------- */
// kind：lease 租約／contract 合約／insurance 保險／license 證照／report 報告／reg 登記
export const KIND = {
  lease: { name: '租約', color: '#2E97D4' },
  contract: { name: '合約', color: '#7C62E6' },
  insurance: { name: '保險', color: '#F0A531' },
  license: { name: '證照', color: '#2DB674' },
  report: { name: '檢驗', color: '#5EE0C4' },
  reg: { name: '登記', color: '#DD5597' },
  other: { name: '其他', color: '#8aa69a' },
};

// 依「今天」產生相對日期，讓示範永遠合理
export function buildDocs(now = new Date(), dairyYear = 0) { return AMEI ? ameiDocs(now, dairyYear) : tenantDocs(now, dairyYear); }
function ameiDocs(now = new Date(), dairyYear = 0) {
  const t = startOfDay(now);
  const D = (n) => addDays(t, n);
  const yearBefore = (d) => { const x = new Date(d); x.setFullYear(x.getFullYear() - 1); return addDays(x, 1); };
  const leaseEnd = D(118), dairyEnd = D(52), insEnd = D(45);
  const leaseStart = (() => { const x = new Date(leaseEnd); x.setFullYear(x.getFullYear() - 2); return addDays(x, 1); })();
  return [
    { id: 'lease', kind: 'lease', name: '店面租約', file: '店面租賃契約_溫州街.pdf', size: 2.4e6, pages: 12, up: D(-412),
      sum: {
        parties: `出租人：王＊＊（個人房東）／承租人：${COMPANY.name}`,
        period: `${fmt(leaseStart)} 至 ${fmt(leaseEnd)}（2 年）`,
        amount: '月租 NT$ 25,000（每月 5 日前匯款），押金 NT$ 50,000（2 個月）',
        expire: leaseEnd, autoRenew: '無自動續約：期滿需重新簽訂新約', notice: 90,
        noticeText: '是否續租需於到期前 90 天以書面告知房東',
        duties: ['不得轉租或變更用途（限餐飲、烘焙使用）', '室內裝修與招牌需經房東書面同意', '退租時恢復原狀，押金於點交後 14 日內返還'],
        risks: ['續約租金調整幅度未約定上限，建議提前議價', '提前解約需支付 1 個月租金作為違約金', '店內廚房設備的損壞責任歸屬寫得不清楚，建議補充附約'],
      } },
    { id: 'dairy', kind: 'contract', name: '北海乳品供貨合約', file: '北海乳品_年度供貨合約.pdf', size: 1.1e6, pages: 6, up: D(-318),
      sum: {
        parties: `供應商：北海乳品貿易（虛構）／採購方：${COMPANY.name}`,
        period: `${fmt(yearBefore(dairyEnd))} 至 ${fmt(dairyEnd)}（1 年）`,
        amount: `依訂單計價，近 13 週實際進貨推估年度約 ${dairyYear ? 'NT$ ' + Math.round(dairyYear).toLocaleString('en-US') : '—'}，月結 30 天`,
        expire: dairyEnd, autoRenew: '有：期滿自動續約 1 年', notice: 30,
        noticeText: '不續約需於到期前 30 天以書面（含 Email）通知',
        duties: ['每月最低訂購量 120 公升鮮奶油', '冷鏈配送全程 7°C 以下，每次附溫度紀錄', '品質異常需於收貨 24 小時內反映'],
        risks: ['自動續約：忘了通知就會再綁 1 年', '原物料漲幅超過 8% 時供應商可調價，僅需提前 15 天通知', '未達最低訂購量需補差額，淡季要特別注意'],
      } },
    { id: 'ins', kind: 'insurance', name: '產品責任險保單', file: '產品責任險_保單.pdf', size: 3.6e6, pages: 18, up: D(-322),
      sum: {
        parties: `保險人：示範產險（虛構）／被保險人：${COMPANY.name}`,
        period: `${fmt(yearBefore(insEnd))} 至 ${fmt(insEnd)}（1 年）`,
        amount: '年繳保費 NT$ 15,000（含公共意外責任險），每一事故體傷 NT$ 300 萬、累計 NT$ 1,200 萬（示範）',
        expire: insEnd, autoRenew: '無：需重新要保', notice: 30,
        noticeText: '建議到期前 30 天洽詢續保並比價',
        duties: ['營業項目或地址變更需通知保險公司', '發生事故需儘速通知並保留證據（商品、單據、照片）', '自負額每次事故 NT$ 5,000'],
        risks: ['目前承保範圍未包含跨境寄送的商品', '宅配途中商品變質的責任歸屬建議與物流合約一併確認', '45 天後到期，空窗期內發生事故需自行負擔'],
      } },
    { id: 'lab', kind: 'report', name: '食品衛生檢驗報告', file: '衛生檢驗報告_草莓生乳捲_檸檬塔.pdf', size: 0.8e6, pages: 4, up: D(-96),
      sum: {
        parties: `檢驗單位：示範檢驗科技（虛構）／委託人：${COMPANY.name}`,
        period: `採樣日 ${fmt(D(-104))}，報告日 ${fmt(D(-96))}`,
        amount: '檢驗費 NT$ 6,800（2 項樣品）',
        expire: D(269), autoRenew: '不適用：建議每年送驗一次', notice: 30,
        noticeText: '建議下次送驗日前 30 天預約檢驗',
        duties: ['檢驗項目：生菌數、大腸桿菌群、金黃色葡萄球菌（示範）', '報告結果：2 項樣品皆符合送驗時的判定標準（示範）', '報告需保存，衛生稽查或通路上架時可能被要求提供'],
        risks: ['新品「芋泥巴斯克」尚未送驗，若要上架百貨或量販通路可能需要', '報告僅代表該批樣品，配方或原料供應商變更時建議重新送驗'],
      } },
    { id: 'reg', kind: 'reg', name: '公司設立登記表', file: '公司設立登記表.pdf', size: 1.5e6, pages: 5, up: D(-980),
      sum: {
        parties: `公司名稱：${COMPANY.name}／代表人：${COMPANY.owner}／統一編號 ${COMPANY.taxId}`,
        period: `核准設立日 ${fmt(D(-990))}`,
        amount: '資本額 NT$ 1,000,000（有限公司）',
        expire: null, autoRenew: '不適用：登記事項長期有效', notice: 0,
        noticeText: '地址、代表人、營業項目、資本額變更時，需在期限內申請變更登記（建議確認）',
        duties: [`登記地址：${COMPANY.addr}`, '營業項目：食品什貨零售、烘焙炊蒸食品製造等（示範）', '每年需留意公司相關申報事項（建議與記帳士確認）'],
        risks: ['實際經營網路銷售與跨境寄送，建議確認營業項目是否需增列', '未來若搬遷工作室或增設門市，記得同步辦理地址變更'],
      } },
    { id: 'tm', kind: 'license', name: '商標註冊證', file: '商標註冊證_阿美手作AMEI.pdf', size: 0.6e6, pages: 2, up: D(-640),
      sum: {
        parties: `商標權人：${COMPANY.name}／商標：「阿美手作 AMEI」（文字＋圖形）`,
        period: `專用期間 ${fmt(D(-640))} 至 ${fmt(addDays(new Date(new Date(D(-640)).setFullYear(D(-640).getFullYear() + 10)), -1))}（10 年）`,
        amount: '申請規費與代理費合計約 NT$ 9,500（示範）',
        expire: null, autoRenew: '需申請延展：到期前一定期間內可申請（建議確認）', notice: 180,
        noticeText: '系統會在專用期間屆滿前 6 個月提醒你辦理延展',
        duties: ['指定類別：糕點、麵包、餅乾等（示範）', '商標需實際使用，長期未使用可能被申請廢止', '授權他人使用建議簽訂書面授權契約'],
        risks: ['跨境販售（越南、馬來西亞）不受台灣商標保護，建議評估在當地註冊', '包裝上的商標圖樣與註冊圖樣不一致時，建議確認是否影響權利'],
      } },
  ];
}

// 未來 12 個月到期與續約（含文件櫃以外的項目）
export function buildTimeline(now = new Date()) { return AMEI ? ameiTimeline(now) : tenantTimeline(now); }
function ameiTimeline(now = new Date()) {
  const t = startOfDay(now);
  const D = (n) => addDays(t, n);
  return [
    { id: 'ins', kind: 'insurance', title: '產品責任險＋公共意外責任險', party: '示範產險（虛構）業務 陳先生', date: D(45), remind: 30, autoRenew: false, action: '洽詢續保與比價', doc: 'ins',
      msg: '陳先生您好，我是阿美手作甜點的阿美。我們的產品責任險將於 {date} 到期，想請您協助續保報價，另外也想確認跨境寄送的商品能否加保，再麻煩您了，謝謝！' },
    { id: 'dairy', kind: 'contract', title: '北海乳品供貨合約（自動續約）', party: '北海乳品貿易（虛構）業務 林小姐', date: D(52), remind: 30, autoRenew: true, notice: 30, action: '決定是否續約、議價', doc: 'dairy',
      msg: '林小姐您好，我是阿美手作甜點的阿美。我們的年度供貨合約將於 {date} 到期，想在續約前約個時間聊聊明年的價格與最低訂購量，請問您這兩週哪天方便呢？' },
    { id: 'lease', kind: 'lease', title: '店面租約（溫州街）', party: '房東 王先生', date: D(118), remind: 90, notice: 90, autoRenew: false, action: '表明續租意願、議定租金', doc: 'lease',
      msg: '王先生您好，我是溫州街店面的承租人阿美。租約將於 {date} 到期，我們希望繼續承租，想跟您約時間討論續約條件，請問您什麼時候方便呢？謝謝！' },
    { id: 'ssl', kind: 'license', title: '官網網域與 SSL 憑證', party: '網站代管業者（示範）', date: D(96), remind: 30, autoRenew: true, notice: 0, action: '確認自動扣款信用卡有效',
      msg: '您好，我是阿美手作甜點。我們的網域與 SSL 憑證將於 {date} 到期，想確認自動續約與付款方式是否正常，謝謝！' },
    { id: 'health', kind: 'license', title: '食品從業人員健康檢查（3 人）', party: '合作診所（示範）', date: D(158), remind: 30, autoRenew: false, action: '預約體檢時段',
      msg: '您好，我是阿美手作甜點的阿美，想幫店內 3 位同仁預約 {date} 前的食品從業人員健康檢查，請問有哪些時段可以安排？' },
    { id: 'cold', kind: 'contract', title: '綠野冷鏈物流配送合約', party: '綠野冷鏈物流（虛構）客服', date: D(203), remind: 45, autoRenew: true, notice: 30, action: '檢視運費與破損理賠條款',
      msg: '您好，我是阿美手作甜點。我們的冷鏈配送合約將於 {date} 到期，想了解明年的運費方案與破損理賠條款，再麻煩提供資料，謝謝！' },
    { id: 'lab', kind: 'license', title: '年度食品衛生送驗', party: '示範檢驗科技（虛構）', date: D(269), remind: 30, autoRenew: false, action: '預約送驗（含新品芋泥巴斯克）', doc: 'lab',
      msg: '您好，我是阿美手作甜點，想預約 {date} 前的年度衛生送驗，這次預計 3 項樣品（含新品芋泥巴斯克），請問如何安排？' },
    { id: 'fire', kind: 'insurance', title: '店面火險（含設備）', party: '示範產險（虛構）業務 陳先生', date: D(296), remind: 30, autoRenew: false, action: '確認設備投保金額',
      msg: '陳先生您好，店面火險將於 {date} 到期，今年新增一台烤箱與冷藏櫃，想調整設備投保金額，麻煩您協助報價，謝謝！' },
    { id: 'pack', kind: 'contract', title: '綠紙包裝禮盒包材年約', party: '綠紙包裝設計（虛構）', date: D(331), remind: 60, autoRenew: true, notice: 30, action: '確認節慶禮盒備貨量',
      msg: '您好，我是阿美手作甜點。包材年約將於 {date} 到期，想先討論明年節慶禮盒的款式與備貨量，請問方便約時間嗎？' },
  ];
}

// 上傳文件的模擬辨識：依檔名猜類型並產生摘要
export function guessDoc(name, now = new Date(), seed = 1) {
  const n = name.toLowerCase();
  const kind = /租|lease|rent/.test(n) ? 'lease' : /保險|保單|insur|policy/.test(n) ? 'insurance' : /檢驗|報告|report|test/.test(n) ? 'report'
    : /登記|執照|證|license|cert|permit/.test(n) ? 'license' : /合約|契約|協議|contract|agreement/.test(n) ? 'contract' : 'other';
  const t = startOfDay(now);
  const days = 60 + (seed * 37) % 280;
  const end = kind === 'other' ? null : addDays(t, days);
  const start = end ? addDays(new Date(new Date(end).setFullYear(end.getFullYear() - 1)), 1) : t;
  const party = { lease: '出租人（待確認）', insurance: '保險公司（待確認）', report: '檢驗單位（待確認）', license: '發證機關（待確認）', contract: '合作廠商（待確認）', other: '（未辨識）' }[kind];
  return {
    kind,
    sum: {
      parties: `${party}／${COMPANY.name}`,
      period: end ? `${fmt(start)} 至 ${fmt(end)}（AI 推估）` : '未找到期間條款',
      amount: kind === 'other' ? '未找到金額' : `約 NT$ ${(((seed * 7919) % 90) + 10) * 1000}（AI 推估，請核對原文）`.replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,'),
      expire: end, autoRenew: kind === 'contract' ? '疑似有自動續約條款（第 9 條），請確認' : '未找到自動續約條款', notice: end ? 30 : 0,
      noticeText: end ? '未找到明確通知期限，系統預設到期前 30 天提醒' : '—',
      duties: kind === 'other' ? ['未辨識出明確義務條款，建議人工檢視'] : ['付款與交付條款（AI 擷取，請核對原文）', '違約與解約條款（AI 擷取，請核對原文）'],
      risks: ['此為模擬辨識結果，內容以原始文件為準', end ? '已自動加入到期提醒時間軸' : '未偵測到到期日，未加入提醒'],
    },
  };
}

export function fmt(d) { d = new Date(d); return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`; }

/* ====================================================================
 * 其他業主：依業態大類（TENANT.cat）產生合規健檢、文件櫃與到期提醒
 * 用 TENANT.typeName、PRODUCTS、STAFF、TENANT.suppliers 帶入；內容為虛構示範，
 * 法規說明一律保守措辭，實際以主管機關公告與專業人士意見為準。
 * ==================================================================== */
// （以下用 function 宣告：模組前段的 CATS／CHECKS 會先呼叫到）
function pn(i) { return PRODUCTS.length ? PRODUCTS[i % PRODUCTS.length].name : '主力商品'; }
function SUPS() { return (TENANT.suppliers || []).map(x => ({ ...x, short: String(x.vendor).replace(/（虛構）/g, '') })); }
function supOf(re, fb) { return SUPS().find(x => re.test(x.item + x.vendor)) || fb; }
function mainSup() { return SUPS()[0] || { vendor: '主要供應商（虛構）', short: '主要供應商', item: '主要進貨', base: 20000 }; }
export const MAIN_VENDOR = AMEI ? '北海乳品貿易' : mainSup().vendor;
export const MAIN_SHORT = AMEI ? '北海' : mainSup().short.replace(/(有限公司|股份有限公司|貿易|批發商?|材料行|資材行|食品行)$/, '') || mainSup().short;
export const SHORT_TL = AMEI ? { ins: '產品責任險', dairy: '北海乳品供貨合約', lease: '店面租約' }
  : { ins: IND().ins, dairy: `${mainSup().short}供貨合約`, lease: '店面租約' };

function IND() {
  const FOODISH = { fields: [['品名', 'n'], ['成分', 'i'], ['過敏原', 'a'], ['有效日期', 'e'], ['廠商', 'm']], miss: { 4: 'a', 5: 'm' } };
  const c = TENANT.cat;
  const foodChecks = (extra) => ({
    reg: { id: 'fbo', status: 'warn', title: '食品業者登錄資料',
      plain: `已在「食品業者登錄平台」完成登錄；今年新增${extra}，登錄的營業型態與品項建議確認是否需要更新。`,
      why: '依相關法規，特定食品業者需完成登錄，資料變更時也應更新；未登錄或資料不符可能被要求限期改正。實際以主管機關公告為準。',
      fix: ['AI 產生資料更新清單', '已比對目前販售品項與通路，列出建議更新的登錄資料，請至食品業者登錄平台確認（示範）'] },
  });
  const T = {
    food: { axis: '食品安全與標示', short: '食品安全', ins: '產品責任險', scope: '餐館業、食品什貨零售（示範）', use: '限餐飲使用', tmClass: '餐飲服務、調理食品（示範）',
      ...foodChecks(`外送與「${pn(5)}」等外帶品項`), label: { title: '外帶包裝與菜單標示：品名、成分、過敏原、有效日期、廠商', plain: `6 項商品中，「${pn(4)}」未標示過敏原（例如花生、甲殼類），「${pn(5)}」包裝缺少製造廠商電話。`, ...FOODISH },
      third: 'health', liabPlain: '產品責任險＋公共意外責任險將在 45 天後到期，目前保單未包含外送途中的餐點。',
      cancel: ['現做餐點、易腐敗食品等可能屬於七天解除權的例外，但需在銷售頁事先清楚揭露。官網已揭露，LINE 與電話訂餐流程尚未說明。', '已在 LINE、電話語音的 AI 下單流程加入「現做餐點不適用七天解除權」說明（示範）'],
      lab: ['食品衛生檢驗報告', '食品衛生檢驗', 2] },
    drink: { axis: '食品安全與標示', short: '食品安全', ins: '產品責任險', scope: '飲料店業、食品什貨零售（示範）', use: '限飲品製作與零售使用', tmClass: '咖啡、茶葉、飲料（示範）',
      ...foodChecks(`宅配與「${pn(4)}」等品項`), label: { title: '包裝標示：品名、成分、淨重、有效日期、廠商', plain: `6 項商品中，「${pn(3)}」包裝未標示有效日期，「${pn(5)}」缺少製造廠商電話。`, fields: [['品名', 'n'], ['成分', 'i'], ['淨重', 'w'], ['有效日期', 'e'], ['廠商', 'm']], miss: { 3: 'e', 5: 'm' } },
      third: 'health', liabPlain: '產品責任險＋公共意外責任險將在 45 天後到期，目前保單未包含跨境寄送的商品。',
      cancel: ['開封後難以回復原狀、保存期限較短的食品飲品可能屬於七天解除權的例外，但需在銷售頁事先清楚揭露。官網已揭露，LINE 與 Messenger 下單流程尚未說明。', '已在 LINE、Messenger 的 AI 下單流程加入「短效期食品飲品不適用七天解除權」說明（示範）'],
      lab: ['食品衛生檢驗報告', '食品衛生檢驗', 2] },
    dessert: { axis: '食品安全與標示', short: '食品安全', ins: '產品責任險', scope: '食品什貨零售、糕餅製造（示範）', use: '限食品製造與零售使用', tmClass: '糕點類（示範）',
      ...foodChecks(`冷藏宅配與「${pn(4)}」等品項`), label: { title: '產品標示：品名、成分、過敏原、有效日期、製造廠商', plain: `6 項商品中，「${pn(4)}」標籤未標示「堅果」過敏原，「${pn(5)}」缺少製造廠商電話。`, ...FOODISH },
      third: 'health', liabPlain: '產品責任險＋公共意外責任險將在 45 天後到期，目前保單未包含跨境寄送的商品。',
      cancel: ['易腐敗、保存期限較短的食品可能屬於七天解除權的例外，但需在銷售頁事先清楚揭露。官網已揭露，LINE 與 WhatsApp 下單流程尚未說明。', '已在 LINE、WhatsApp 的 AI 下單流程加入「短效期食品不適用七天解除權」說明（示範）'],
      lab: ['食品衛生檢驗報告', '食品衛生檢驗', 2] },
    farm: { axis: '農產品安全與標示', short: '農產安全', ins: '產品責任險', scope: '農產品零售、食品什貨零售（示範）', use: '限農產品理貨與零售使用', tmClass: '新鮮蔬果、農產加工品（示範）',
      reg: { id: 'origin', status: 'warn', title: '產地與生產者資訊揭露', plain: `「${pn(0)}」等品項已標示產地，但「${pn(4)}」的生產者資訊與包裝日期尚未在官網揭露。`, why: '農產品的產地與生產資訊揭露不完整，容易引起消費疑慮；有相關驗證標章的品項，標示方式需依規定辦理，實際以主管機關公告為準。', fix: ['AI 補齊產地與生產資訊', '已依進貨紀錄補上產地、生產者與包裝日期欄位，請確認後發布（示範）'] },
      label: { title: '包裝標示：品名、產地、重量、包裝日期、生產者', plain: `6 項商品中，「${pn(3)}」未標示重量，「${pn(5)}」缺少生產者聯絡資訊。`, fields: [['品名', 'n'], ['產地', 'o'], ['重量', 'w'], ['包裝日期', 'e'], ['生產者', 'm']], miss: { 3: 'w', 5: 'm' } },
      third: 'pest', liabPlain: '產品責任險將在 45 天後到期，目前保單未包含冷藏宅配途中的商品。',
      cancel: ['生鮮農產品屬易腐敗商品，可能屬於七天解除權的例外，但需在銷售頁事先清楚揭露。官網已揭露，LINE 下單流程尚未說明。', '已在 LINE 的 AI 下單流程加入「生鮮農產品不適用七天解除權」說明（示範）'],
      lab: ['農藥殘留檢驗報告', '農藥殘留自主送驗', 2] },
    retail: { axis: '商品標示與安全', short: '商品標示', ins: '產品責任險', scope: '日常用品零售、其他零售（示範）', use: '限零售門市使用', tmClass: '日用品、雜貨（示範）',
      reg: { id: 'insp', status: 'warn', title: '應施檢驗商品確認', plain: `目前販售的「${pn(0)}」「${pn(1)}」等商品中，若含電器、兒童用品等品項，可能屬於應施檢驗商品，建議確認是否需具備檢驗標識。`, why: '依商品檢驗相關規定，部分商品需完成檢驗並貼附標識才能陳列販售；實際以標準檢驗局公告為準。', fix: ['AI 產生檢驗確認清單', '已列出需向供應商確認檢驗標識的商品清單（示範）'] },
      label: { title: '商品標示：品名、材質、產地、使用方法、廠商', plain: `6 項商品中，「${pn(2)}」未標示產地，「${pn(5)}」缺少廠商聯絡資訊。`, fields: [['品名', 'n'], ['材質', 'i'], ['產地', 'o'], ['使用方法', 'u'], ['廠商', 'm']], miss: { 2: 'o', 5: 'm' } },
      third: 'import', liabPlain: '產品責任險將在 45 天後到期，目前保單未包含跨境寄送的商品。',
      cancel: ['網購一般商品，消費者通常有 7 天可無條件解除契約；拆封後難以回復原狀的個人衛生用品等可能屬於例外，但需事先清楚揭露。官網已揭露，LINE 與 Messenger 下單流程尚未說明。', '已在 LINE、Messenger 的 AI 下單流程加入七天解除權與例外說明（示範）'],
      lab: ['商品材質檢測報告', '商品材質送驗', 2] },
    craft: { axis: '商品標示與保固', short: '商品標示', ins: '產品責任險', scope: '手工藝品製造、其他零售（示範）', use: '限工作室製作與零售使用', tmClass: '手工藝品、配件（示範）',
      reg: { id: 'material', status: 'warn', title: '材料來源與安全資料', plain: `「${pn(0)}」使用的材料已保存供應商出貨證明；新款「${pn(3)}」的染料與五金材質說明尚未取得供應商資料。`, why: '材料成分可能涉及商品標示與消費者過敏疑慮，保存供應商證明較能回應客訴與通路查核。', fix: ['AI 產生索取清單', '已列出需向供應商索取的材料說明清單（示範）'] },
      label: { title: '商品標示：品名、材質、產地、保養方式、廠商', plain: `6 項商品中，「${pn(1)}」未標示保養方式，「${pn(5)}」缺少廠商聯絡資訊。`, fields: [['品名', 'n'], ['材質', 'i'], ['產地', 'o'], ['保養方式', 'c'], ['廠商', 'm']], miss: { 1: 'c', 5: 'm' } },
      third: 'warranty', liabPlain: '產品責任險將在 45 天後到期，目前保單未包含跨境寄送的商品。',
      cancel: ['網購一般商品，消費者通常有 7 天可無條件解除契約；依客人需求客製（例如刻字）的商品可能屬於例外，但需在銷售頁事先清楚揭露。官網已揭露，LINE 與 Messenger 下單流程尚未說明。', '已在 AI 下單流程加入「客製商品不適用七天解除權」說明（示範）'],
      lab: ['材料成分檢測報告', '材料成分送驗', 2] },
    flower: { axis: '花材與商品標示', short: '花材標示', ins: '公共意外責任險', scope: '花卉零售、景觀與花藝設計（示範）', use: '限花藝零售與工作室使用', tmClass: '花卉、花藝設計（示範）',
      reg: { id: 'quar', status: 'warn', title: '進口花材來源與檢疫文件', plain: '部分進口花材由批發商提供，目前只保存發票，沒有留存檢疫或來源證明影本。', why: '進口植物依相關規定需經檢疫，向合法批發商進貨並保存單據，較能回應查核與客訴；實際以主管機關公告為準。', fix: ['AI 產生索取清單', '已列出需向批發商索取的來源與檢疫文件清單（示範）'] },
      label: { title: '商品標示：品名、花材、保存方式、產地、廠商', plain: `6 項商品中，「${pn(2)}」未標示保存方式，「${pn(5)}」缺少廠商聯絡資訊。`, fields: [['品名', 'n'], ['花材', 'i'], ['保存方式', 'c'], ['產地', 'o'], ['廠商', 'm']], miss: { 2: 'c', 5: 'm' } },
      third: 'cold', liabPlain: '公共意外責任險將在 45 天後到期，目前保單未包含外送與場地佈置現場。',
      cancel: ['鮮花屬易腐敗商品，可能屬於七天解除權的例外，但需在銷售頁事先清楚揭露。官網已揭露，LINE 與電話訂花流程尚未說明。', '已在 LINE、電話語音的 AI 下單流程加入「鮮花不適用七天解除權」說明（示範）'],
      lab: ['進口花材檢疫證明（批發商提供）', '花材來源文件更新', 1] },
    service: { axis: '衛生與消費安全', short: '衛生安全', ins: '公共意外責任險', scope: '其他個人服務業（示範）', use: '限個人服務工作室使用', tmClass: '個人服務（示範）',
      reg: { id: 'hyg', status: 'warn', title: '營業場所衛生與器具消毒', plain: '器具每次使用後都有消毒，但一次性耗材的拆封與丟棄紀錄還沒有固定格式。', why: '依地方衛生相關規定，服務業者需維持營業場所與器具清潔，衛生稽查時可能查看紀錄；實際以地方主管機關公告為準。', fix: ['AI 產生消毒紀錄表', '已建立每日器具消毒與耗材紀錄表，可在平板上勾選（示範）'] },
      label: { title: '服務價目與說明：項目、價格、時間、注意事項、退改規則', plain: `6 項服務中，「${pn(4)}」未說明注意事項，「${pn(5)}」缺少使用期限與退改規則。`, fields: [['項目', 'n'], ['價格', 'p'], ['時間', 't'], ['注意事項', 'i'], ['退改規則', 'm']], miss: { 4: 'i', 5: 'm' } },
      third: 'health', liabPlain: '公共意外責任險將在 45 天後到期，到期前需洽詢續保。',
      cancel: ['線上預約的取消時限與禮券使用期限已寫在官網，但 LINE 預約流程沒有說明，近 3 個月有 2 件改期爭議。', '已在 LINE 預約流程加入取消時限與禮券使用規則說明（示範）'],
      cancelTitle: '預約取消與禮券退費規則揭露', cancelWhy: '預約與禮券的取消、退費規則若沒有事先揭露，容易產生消費爭議；禮券另有相關記載規定，實際以主管機關公告為準。',
      lab: ['器具消毒設備保養紀錄', '消毒設備年度保養', 1] },
  };
  return T[c] || T.retail;
}

export const LABEL = AMEI ? null : (() => {
  const L = IND().label;
  return { fields: L.fields, rows: PRODUCTS.slice(0, 7).map((p, i) => [p.name, L.miss[i] || 1]) };
})();

function staffNames() { return STAFF.map(x => x.name).join('、'); }
function tenantChecks() {
  const I = IND();
  const O = COMPANY.owner;
  const emps = STAFF.filter(x => x.kind !== 'owner');
  const ft = emps.find(x => x.kind === 'full'), pt = emps.find(x => x.kind === 'part');
  const third = {
    health: { id: 'health', status: 'pass', title: TENANT.cat === 'service' ? '從業人員健康檢查與技能證照' : '食品從業人員健康檢查', plain: `${staffNames()}今年度的健康檢查報告都已上傳，下次到期前 30 天提醒。`, why: TENANT.cat === 'service' ? '部分服務業依地方衛生規定需定期健康檢查，衛生稽查時可能查看紀錄；實際以地方主管機關公告為準。' : '食品從業人員依相關規定需定期健康檢查，衛生稽查時會查看紀錄。', go: null },
    pest: { id: 'pest', status: 'pass', title: '農藥殘留自主檢驗', plain: '本季已抽驗 2 項農產品送驗，結果符合送驗時的判定標準（示範），報告已上傳文件櫃。', why: '自主檢驗紀錄能證明品質管理，通路上架與客訴時都用得到。', go: null },
    import: { id: 'import', status: 'pass', title: '進口商品報關與來源文件保存', plain: '向國外採購的商品已保存報關、發票與供應商資料，可隨時匯出。', why: '來源文件完整，遇到商品標示或安全疑慮時才能追溯。', go: null },
    warranty: { id: 'warranty', status: 'todo', title: '保固與維修條款揭露', plain: '手作商品的保固期間與人為損壞的維修收費，目前只寫在出貨小卡上，官網與聊天下單流程沒有說明。', why: '保固與維修規則事先說清楚，可以減少售後爭議。', fix: ['AI 產生保固條款', '已產生保固與維修條款草稿，並加入官網與 AI 下單流程（示範）'], go: ['listing', '前往商品上架'] },
    cold: { id: 'cold', status: 'pass', title: '鮮花冷藏溫度紀錄', plain: '冷藏櫃溫度每日自動記錄，超出設定範圍時推播提醒。', why: '保存溫度紀錄能證明花材品質，遇到客訴時也有依據。', go: null },
  }[I.third];
  const labor = emps.length ? [
    { id: 'enroll', cat: 'labor', status: 'pass', title: '到職當日加保勞保、健保、勞退提繳',
      plain: `${emps.map(e => `${e.name}（${e.kind === 'full' ? '全職' : '兼職'}）`).join('與')}都在到職當天完成勞保、就業保險、職災保險、健保加保，並提繳 6% 勞退。`,
      why: '依相關法規，雇主應在員工到職當日辦理加保；晚加保期間若員工發生事故，雇主可能需自行負擔賠償。', go: ['staff', '前往排班打卡'] },
    pt ? { id: 'contract', cat: 'labor', status: 'todo', title: '兼職人員書面勞動契約',
      plain: `${pt.name}（${String(pt.title || '').split('・')[0] || '兼職'}）目前只有 LINE 對話約定，還沒有簽署書面契約，工時、時薪、休假規則沒有白紙黑字。`,
      why: '書面契約可以避免日後對工時、工資與離職規定的爭議，也是勞動檢查時常被問到的文件。',
      fix: ['AI 產生兼職契約草稿', `已依${pt.name}目前的時薪與班表產生兼職勞動契約草稿，可傳 LINE 請對方線上簽署（示範）`], go: ['staff', `查看${pt.name}班表`] }
      : { id: 'contract', cat: 'labor', status: 'todo', title: '員工書面勞動契約',
        plain: `${ft.name}的勞動契約已簽，但加班與特休規則的附件還沒有更新為今年版本。`,
        why: '書面契約可以避免日後對工時、工資與離職規定的爭議，也是勞動檢查時常被問到的文件。',
        fix: ['AI 產生契約附件', '已產生加班與特休規則附件草稿，可傳 LINE 請員工線上確認（示範）'], go: ['staff', '前往排班打卡'] },
    { id: 'attend', cat: 'labor', status: 'pass', title: '出勤紀錄與工資清冊保存', plain: '打卡紀錄、加班申請與每月薪資單都自動保存，可隨時匯出。', why: '出勤紀錄與工資清冊依相關法規需保存一定年限，勞檢時無法提出可能會被處罰。', go: ['staff', '查看打卡紀錄'] },
    { id: 'wage', cat: 'labor', status: 'pass', title: '時薪與月薪不低於基本工資', plain: `${emps.map(e => `${e.name}${e.kind === 'part' ? '時薪' : '月薪'}`).join('與')}都高於系統內建的基本工資參數；基本工資調整時系統會提醒你檢查。`, why: '工資低於基本工資可能被處罰並需補發差額，每年調整時最容易忘記。', go: ['staff', '查看薪資設定'] },
  ] : [
    { id: 'enroll', cat: 'labor', status: 'pass', title: '負責人本人勞健保', plain: `目前只有負責人${O}一人、沒有受僱員工；負責人本人的勞健保依規定以雇主身分投保。`, why: '負責人本人的投保方式與身分有關，建議與記帳士確認；實際以勞保局、健保署公告為準。', go: ['staff', '前往排班打卡'] },
    { id: 'contract', cat: 'labor', status: 'todo', title: '聘人前準備：勞動契約範本', plain: '目前沒有員工；旺季若要找兼職幫手，建議先備好書面勞動契約範本與到職加保流程。', why: '到職當天就要加保，事先準備好文件可以避免手忙腳亂。', fix: ['AI 產生契約範本', '已產生兼職勞動契約範本與到職加保檢查表，放進文件櫃（示範）'], go: ['staff', '前往排班打卡'] },
    { id: 'attend', cat: 'labor', status: 'pass', title: '出勤與工資紀錄（聘人後啟用）', plain: '目前只有負責人，系統先記錄負責人工時供參考；聘人後打卡與薪資單會自動保存。', why: '出勤紀錄與工資清冊依相關法規需保存一定年限。', go: ['staff', '查看排班'] },
    { id: 'wage', cat: 'labor', status: 'pass', title: '基本工資參數已更新', plain: '系統已內建今年度基本工資參數，聘人時會自動檢查時薪與月薪。', why: '工資低於基本工資可能被處罰並需補發差額。', go: null },
  ];
  const acc = emps.length
    ? { plain: `${emps[emps.length - 1].name}（${String(emps[emps.length - 1].title || '').split('・')[0] || '員工'}）帳號仍有「會計帳務」與「會員匯出」權限；${O}的管理員帳號尚未開啟雙重驗證。`, fix: `已將${emps[emps.length - 1].name}權限調整為工作所需的最小範圍，並寄出雙重驗證設定連結給${O}（示範）` }
    : { plain: `記帳士協作帳號仍有「會員匯出」權限；${O}的管理員帳號尚未開啟雙重驗證。`, fix: `已將記帳士帳號調整為「帳務檢視與審核」，並寄出雙重驗證設定連結給${O}（示範）` };
  return [
    AMEI_CHECKS.find(x => x.id === 'einv'), AMEI_CHECKS.find(x => x.id === 'taxid'), AMEI_CHECKS.find(x => x.id === 'vat'), AMEI_CHECKS.find(x => x.id === 'withhold'),
    ...labor,
    { ...I.reg, cat: 'food' },
    { id: 'label', cat: 'food', status: 'todo', title: I.label.title, plain: I.label.plain,
      why: TENANT.cat === 'service' ? '服務內容、價格與退改規則清楚公開，可減少消費爭議。' : ['food', 'drink', 'dessert', 'farm'].includes(TENANT.cat) ? '包裝食品標示不完整可能被要求下架改正；過敏原等資訊沒標清楚更可能造成消費者健康風險。實際以主管機關公告為準。' : '依商品標示相關法規，商品應標示必要資訊；標示不全可能被要求限期改正。實際以主管機關公告為準。',
      fix: ['AI 產生標示草稿', '已產生 2 項商品的修正版標示（補齊缺漏欄位），列印或更新商品頁即可（示範）'], go: ['listing', '前往商品上架'] },
    { ...third, cat: 'food' },
    { id: 'liab', cat: 'food', status: 'warn', title: `${I.ins}有效`, plain: I.liabPlain,
      why: I.ins === '產品責任險' ? '依相關法規，部分業者需投保產品責任保險；保單過期或範圍不足，出事時需自行賠償。實際以主管機關公告為準。' : '營業場所若有人受傷，沒有保險需自行賠償；部分場地或活動也會要求提供保單。',
      fix: ['AI 整理續保比價需求', '已整理續保需求，並建立「到期前 30 天」提醒（示範）'] },
    { id: 'cancel7', cat: 'ecom', status: 'warn', title: I.cancelTitle || '網路銷售七天解除契約權揭露',
      plain: I.cancelTitle ? I.cancel[0] : `網購一般商品，消費者通常有 7 天可無條件解除契約（俗稱鑑賞期）；${I.cancel[0]}`.replace('；網購一般商品，消費者通常有 7 天可無條件解除契約；', '；'),
      why: I.cancelWhy || '沒有事先清楚揭露例外情形，可能無法主張排除七天解除權，容易產生退貨爭議。',
      fix: ['AI 補上下單須知', I.cancel[1]], go: ['agent', '前往 AI 店員設定'] },
    { ...AMEI_CHECKS.find(x => x.id === 'pageinfo'), plain: TENANT.cat === 'service' ? '官網與各通路服務頁都有價格、服務時間、付款方式、公司名稱與客服電話。' : '官網與各通路商品頁都有售價、運費門檻、付款方式、公司名稱與客服電話。' },
    AMEI_CHECKS.find(x => x.id === 'refund'),
    AMEI_CHECKS.find(x => x.id === 'notice'), AMEI_CHECKS.find(x => x.id === 'optout'),
    { ...AMEI_CHECKS.find(x => x.id === 'access'), plain: acc.plain, fix: ['AI 套用最小權限', acc.fix] },
    AMEI_CHECKS.find(x => x.id === 'backup'),
    { ...AMEI_CHECKS.find(x => x.id === 'scope'), plain: `登記的營業項目包含「${I.scope}」，但目前實際也做「網路銷售」與「跨境寄送」，建議確認是否需要增列營業項目。` },
    { ...AMEI_CHECKS.find(x => x.id === 'addr'), plain: '公司登記、稅籍登記與營業場所租約地址一致；搬遷時系統會提醒同步辦理變更。' },
    { ...AMEI_CHECKS.find(x => x.id === 'tm'), plain: `「${TENANT.name}」商標已註冊於${I.tmClass}，專用期間 10 年，到期前系統會提醒延展。` },
  ].filter(Boolean).map(x => ({ ...x }));
}

function tenantDocs(now = new Date(), supYear = 0) {
  const I = IND();
  const t = startOfDay(now);
  const D = (n) => addDays(t, n);
  const yearBefore = (d) => { const x = new Date(d); x.setFullYear(x.getFullYear() - 1); return addDays(x, 1); };
  const leaseEnd = D(118), supEnd = D(52), insEnd = D(45);
  const leaseStart = (() => { const x = new Date(leaseEnd); x.setFullYear(x.getFullYear() - 2); return addDays(x, 1); })();
  const rent = TENANT.fixed?.rent || 20000;
  const sup = mainSup();
  const equip = TENANT.fixed?.equip || '營業設備';
  const [labName, , labN] = I.lab;
  const labItems = PRODUCTS.slice(0, labN).map(p => p.name).join('、') || '主力商品';
  return [
    { id: 'lease', kind: 'lease', name: '營業場所租約', file: '營業場所租賃契約.pdf', size: 2.4e6, pages: 12, up: D(-412),
      sum: {
        parties: `出租人：房東（個人・示範）／承租人：${COMPANY.name}`,
        period: `${fmt(leaseStart)} 至 ${fmt(leaseEnd)}（2 年）`,
        amount: `月租 NT$ ${rent.toLocaleString('en-US')}（每月 5 日前匯款），押金 NT$ ${(rent * 2).toLocaleString('en-US')}（2 個月）`,
        expire: leaseEnd, autoRenew: '無自動續約：期滿需重新簽訂新約', notice: 90,
        noticeText: '是否續租需於到期前 90 天以書面告知房東',
        duties: [`不得轉租或變更用途（${I.use}）`, '室內裝修與招牌需經房東書面同意', '退租時恢復原狀，押金於點交後 14 日內返還'],
        risks: ['續約租金調整幅度未約定上限，建議提前議價', '提前解約需支付 1 個月租金作為違約金', `${equip}的損壞與維修責任歸屬寫得不清楚，建議補充附約`],
      } },
    { id: 'dairy', kind: 'contract', name: `${sup.short}供貨合約`, file: `${sup.short}_年度供貨合約.pdf`, size: 1.1e6, pages: 6, up: D(-318),
      sum: {
        parties: `供應商：${sup.vendor}／採購方：${COMPANY.name}`,
        period: `${fmt(yearBefore(supEnd))} 至 ${fmt(supEnd)}（1 年）`,
        amount: `依訂單計價（${sup.item}），近 13 週實際進貨推估年度約 ${supYear ? 'NT$ ' + Math.round(supYear).toLocaleString('en-US') : '—'}，月結 30 天`,
        expire: supEnd, autoRenew: '有：期滿自動續約 1 年', notice: 30,
        noticeText: '不續約需於到期前 30 天以書面（含 Email）通知',
        duties: ['每月需達最低訂購金額', '交貨時附出貨單與品質說明', '品質異常需於收貨 24 小時內反映'],
        risks: ['自動續約：忘了通知就會再綁 1 年', '原物料漲幅超過 8% 時供應商可調價，僅需提前 15 天通知', '未達最低訂購量需補差額，淡季要特別注意'],
      } },
    { id: 'ins', kind: 'insurance', name: `${I.ins}保單`, file: `${I.ins}_保單.pdf`, size: 3.6e6, pages: 18, up: D(-322),
      sum: {
        parties: `保險人：示範產險（虛構）／被保險人：${COMPANY.name}`,
        period: `${fmt(yearBefore(insEnd))} 至 ${fmt(insEnd)}（1 年）`,
        amount: '年繳保費 NT$ 12,000，每一事故體傷 NT$ 300 萬、累計 NT$ 1,200 萬（示範）',
        expire: insEnd, autoRenew: '無：需重新要保', notice: 30,
        noticeText: '建議到期前 30 天洽詢續保並比價',
        duties: ['營業項目或地址變更需通知保險公司', '發生事故需儘速通知並保留證據（商品、單據、照片）', '自負額每次事故 NT$ 5,000'],
        risks: [I.liabPlain.replace(/^.*?到期，?/, '') || '承保範圍建議每年檢視一次', '45 天後到期，空窗期內發生事故需自行負擔'],
      } },
    { id: 'lab', kind: 'report', name: labName, file: `${labName.replace(/（.*）/, '')}_${labItems.replace(/、/g, '_')}.pdf`, size: 0.8e6, pages: 4, up: D(-96),
      sum: {
        parties: `出具單位：示範檢驗科技（虛構）／委託人：${COMPANY.name}`,
        period: `採樣（或出具）日 ${fmt(D(-104))}，報告日 ${fmt(D(-96))}`,
        amount: `費用 NT$ 6,800（${labN} 項）`,
        expire: D(269), autoRenew: '不適用：建議每年更新一次', notice: 30,
        noticeText: '建議下次更新日前 30 天預約',
        duties: [`項目：${labItems}（示範）`, '結果：皆符合當次的判定標準（示範）', '報告需保存，稽查或通路上架時可能被要求提供'],
        risks: [`新品「${pn(5)}」尚未納入，若要上架百貨或量販通路可能需要`, '報告僅代表當次樣品或設備狀態，原料或供應商變更時建議重新辦理'],
      } },
    { id: 'reg', kind: 'reg', name: '公司設立登記表', file: '公司設立登記表.pdf', size: 1.5e6, pages: 5, up: D(-980),
      sum: {
        parties: `公司名稱：${COMPANY.name}／代表人：${COMPANY.owner}／統一編號 ${COMPANY.taxId}（示範）`,
        period: `核准設立日 ${fmt(D(-990))}`,
        amount: '資本額 NT$ 500,000（有限公司・示範）',
        expire: null, autoRenew: '不適用：登記事項長期有效', notice: 0,
        noticeText: '地址、代表人、營業項目、資本額變更時，需在期限內申請變更登記（建議確認）',
        duties: [`登記地址：${COMPANY.addr}`, `營業項目：${I.scope}`, '每年需留意公司相關申報事項（建議與記帳士確認）'],
        risks: ['實際經營網路銷售與跨境寄送，建議確認營業項目是否需增列', '未來若搬遷或增設據點，記得同步辦理地址變更'],
      } },
    { id: 'tm', kind: 'license', name: '商標註冊證', file: `商標註冊證_${TENANT.name}.pdf`, size: 0.6e6, pages: 2, up: D(-640),
      sum: {
        parties: `商標權人：${COMPANY.name}／商標：「${TENANT.name}」（文字＋圖形）`,
        period: `專用期間 ${fmt(D(-640))} 至 ${fmt(addDays(new Date(new Date(D(-640)).setFullYear(D(-640).getFullYear() + 10)), -1))}（10 年）`,
        amount: '申請規費與代理費合計約 NT$ 9,500（示範）',
        expire: null, autoRenew: '需申請延展：到期前一定期間內可申請（建議確認）', notice: 180,
        noticeText: '系統會在專用期間屆滿前 6 個月提醒你辦理延展',
        duties: [`指定類別：${I.tmClass}`, '商標需實際使用，長期未使用可能被申請廢止', '授權他人使用建議簽訂書面授權契約'],
        risks: ['跨境販售不受台灣商標保護，建議評估在當地註冊', '包裝上的商標圖樣與註冊圖樣不一致時，建議確認是否影響權利'],
      } },
  ];
}

function tenantTimeline(now = new Date()) {
  const I = IND();
  const t = startOfDay(now);
  const D = (n) => addDays(t, n);
  const B = TENANT.name, O = COMPANY.owner;
  const sup = mainSup();
  const ship = supOf(/物流|運費|配送|宅配/, { vendor: '綠野物流（虛構）', short: '綠野物流' });
  const pack = supOf(/包裝|包材|提袋|紙盒|禮盒/, { vendor: '好包裝材料行（虛構）', short: '好包裝材料行' });
  const equip = TENANT.fixed?.equip || '營業設備';
  const n = STAFF.length;
  const foodish = ['food', 'drink', 'dessert'].includes(TENANT.cat);
  const [, labTl] = I.lab;
  return [
    { id: 'ins', kind: 'insurance', title: I.ins, party: '示範產險（虛構）業務 陳先生', date: D(45), remind: 30, autoRenew: false, action: '洽詢續保與比價', doc: 'ins',
      msg: `陳先生您好，我是${B}的${O}。我們的${I.ins}將於 {date} 到期，想請您協助續保報價，也想確認承保範圍是否需要調整，再麻煩您了，謝謝！` },
    { id: 'dairy', kind: 'contract', title: `${sup.short}供貨合約（自動續約）`, party: `${sup.vendor} 業務窗口`, date: D(52), remind: 30, autoRenew: true, notice: 30, action: '決定是否續約、議價', doc: 'dairy',
      msg: `您好，我是${B}的${O}。我們的年度供貨合約將於 {date} 到期，想在續約前約個時間聊聊明年的價格與最低訂購量，請問您這兩週哪天方便呢？` },
    { id: 'lease', kind: 'lease', title: '營業場所租約', party: '房東（個人・示範）', date: D(118), remind: 90, notice: 90, autoRenew: false, action: '表明續租意願、議定租金', doc: 'lease',
      msg: `房東您好，我是${B}的${O}。租約將於 {date} 到期，我們希望繼續承租，想跟您約時間討論續約條件，請問您什麼時候方便呢？謝謝！` },
    { id: 'ssl', kind: 'license', title: '官網網域與 SSL 憑證', party: '網站代管業者（示範）', date: D(96), remind: 30, autoRenew: true, notice: 0, action: '確認自動扣款信用卡有效',
      msg: `您好，我是${B}。我們的網域與 SSL 憑證將於 {date} 到期，想確認自動續約與付款方式是否正常，謝謝！` },
    foodish || TENANT.cat === 'service'
      ? { id: 'health', kind: 'license', title: `${TENANT.cat === 'service' ? '從業人員' : '食品從業人員'}健康檢查（${n} 人）`, party: '合作診所（示範）', date: D(158), remind: 30, autoRenew: false, action: '預約體檢時段',
        msg: `您好，我是${B}的${O}，想幫${n > 1 ? `店內 ${n} 位同仁` : '自己'}預約 {date} 前的健康檢查，請問有哪些時段可以安排？` }
      : { id: 'health', kind: 'license', title: `${equip}年度保養`, party: '設備保養廠商（示範）', date: D(158), remind: 30, autoRenew: false, action: '預約保養時段',
        msg: `您好，我是${B}的${O}，想預約 {date} 前的${equip}年度保養，請問有哪些時段可以安排？` },
    { id: 'cold', kind: 'contract', title: `${ship.short}配送合約`, party: `${ship.vendor} 客服`, date: D(203), remind: 45, autoRenew: true, notice: 30, action: '檢視運費與破損理賠條款',
      msg: `您好，我是${B}。我們的配送合約將於 {date} 到期，想了解明年的運費方案與破損理賠條款，再麻煩提供資料，謝謝！` },
    { id: 'lab', kind: 'license', title: labTl, party: '示範檢驗科技（虛構）', date: D(269), remind: 30, autoRenew: false, action: `預約辦理（含新品${pn(5)}）`, doc: 'lab',
      msg: `您好，我是${B}，想預約 {date} 前的${labTl}，這次預計加入新品「${pn(5)}」，請問如何安排？` },
    { id: 'fire', kind: 'insurance', title: '營業場所火險（含設備）', party: '示範產險（虛構）業務 陳先生', date: D(296), remind: 30, autoRenew: false, action: '確認設備投保金額',
      msg: `陳先生您好，營業場所火險將於 {date} 到期，今年新增${equip}，想調整設備投保金額，麻煩您協助報價，謝謝！` },
    { id: 'pack', kind: 'contract', title: `${pack.short}包材年約`, party: pack.vendor, date: D(331), remind: 60, autoRenew: true, notice: 30, action: '確認節慶檔期備貨量',
      msg: `您好，我是${B}。包材年約將於 {date} 到期，想先討論明年節慶檔期的包裝款式與備貨量，請問方便約時間嗎？` },
  ];
}
