// AI 店員設定：人設、白話店規知識庫、安全護欄、試聊沙盒、對話品質儀表（皆為示範資料）
import { store } from '../state.js';
import { $, $$, el, gsap, esc, money, sleep, countUp, toast, typeText } from '../util.js';
import { icon, chIcon } from '../icons.js';
import { PRODUCTS, PRODUCT_MAP, LANG_LABEL, startOfDay, addDays } from '../data.js';
import { detectLang, PRODUCT_ALIASES } from '../i18n.js';
import { makeChart } from '../charts.js';
import {
  AVATARS, avatarSvg, TONES, TONE_WRAP, LANG_OPTS, BIZ_HOURS, SIM_TIMES,
  DEFAULT_KB, GUARDS, DISCOUNT_OPTS, discountLabel, foldText, TEST_Q,
  IMPORT_SAMPLE, IMPORT_URL, IMPORT_FAQ, UNKNOWN_SEED, TOP_FAQ, HANDOFF_SEED, weekSeries,
  NO_NUT_GIFTS, NUTS, pname, allergenText, storageText,
} from '../agent-data.js';

const OWNER = '阿美';
const S = {
  live: true, name: '小美', avatar: 'girl', tone: 'warm',
  langs: { zh: true, en: true, ja: true, vi: true, ms: false },
  hours: '24h', sim: 'open',
  kb: DEFAULT_KB(),
  guard: { promise: true, discount: true, cap: 95, approve: true, amt: 10000, escalate: true, line: true, phone: true },
  chat: [],
  unknown: UNKNOWN_SEED.map(u => ({ ...u })),
  handoffs: HANDOFF_SEED.map(h => ({ ...h })),
  qtab: 'zh', imp: 'text', seq: 0,
};
const CITED = { return: 41, ship: 168, area: 133, allergen: 121, storage: 74, custom: 53, pay: 47, invoice: 38, hours: 29 };
const PARAM = {
  hours: { label: '申請時限', unit: '小時', min: 1, max: 168, step: 1 },
  fee: { label: '宅配運費', unit: 'NT$', min: 0, max: 1000, step: 10 },
  free: { label: '免運門檻', unit: 'NT$', min: 0, max: 20000, step: 100 },
  cutoff: { label: '當天出貨截止', unit: '點', min: 8, max: 22, step: 1 },
  days: { label: '最少提前', unit: '天', min: 1, max: 30, step: 1 },
  deposit: { label: '訂金比例', unit: '%', min: 0, max: 100, step: 10 },
};
let root, msgsEl, busy = false, pendingRefresh = false, modal = null, chart = null, refreshT = 0;

// ---------- 小工具 ----------
const fmtN = (v) => Number(v).toLocaleString('en-US');
const kbIdx = (key) => S.kb.findIndex(c => c.key === key);
const kbCard = (key) => S.kb.find(c => c.key === key);
const fill = (str, params) => String(str || '').replace(/\{(\w+)\}/g, (m, k) => params && k in params ? fmtN(params[k]) : m);
function cardText(c, lang = 'zh') {
  const base = lang === 'zh' ? c.body : (c[lang] || c.body);
  return fill(base, c.params) + (lang === 'zh' && c.note ? ` ${c.note}` : '');
}
function bigrams(s) {
  const out = new Set();
  const STOP = new Set(['有沒', '沒有', '可以', '以嗎', '請問', '的嗎', '是不', '不是', '怎麼', '麼辦', '我要', '你們', '們有']);
  String(s).replace(/[^一-鿿぀-ヿ]+/g, ' ').split(' ').forEach(w => { for (let i = 0; i < w.length - 1; i++) { const b = w.slice(i, i + 2); if (!STOP.has(b)) out.add(b); } });
  (String(s).toLowerCase().match(/[a-z]{4,}/g) || []).forEach(w => { if (!['have', 'does', 'what', 'your', 'with', 'from', 'this', 'that', 'there'].includes(w)) out.add(w); });
  return [...out];
}
const wrapName = (s) => s.replace(/\{name\}/g, S.name || '小美');
function findPid(q) {
  const ql = q.toLowerCase();
  for (const [pid, al] of Object.entries(PRODUCT_ALIASES)) if (al.some(a => ql.includes(a.toLowerCase()))) return pid;
  return null;
}
const CITY = { 台南: ['台南', 'tainan'], 台中: ['台中', 'taichung'], 高雄: ['高雄', 'kaohsiung'], 台北: ['台北', 'taipei'], 新北: ['新北'], 桃園: ['桃園', 'taoyuan'], 新竹: ['新竹', 'hsinchu'], 嘉義: ['嘉義', 'chiayi'], 屏東: ['屏東'], 宜蘭: ['宜蘭', 'yilan'], 花蓮: ['花蓮', 'hualien'], 台東: ['台東', 'taitung'] };
const CITY_EN = { 台南: 'Tainan', 台中: 'Taichung', 高雄: 'Kaohsiung', 台北: 'Taipei', 新北: 'New Taipei', 桃園: 'Taoyuan', 新竹: 'Hsinchu', 嘉義: 'Chiayi', 屏東: 'Pingtung', 宜蘭: 'Yilan', 花蓮: 'Hualien', 台東: 'Taitung' };
function findCity(q) { const ql = q.toLowerCase(); for (const [c, al] of Object.entries(CITY)) if (al.some(a => ql.includes(a))) return c; return ''; }
function notifyVia() {
  const v = [S.guard.line && 'LINE 推播', S.guard.phone && '電話'].filter(Boolean);
  return v.length ? v.join('＋') : '待她上線查看';
}

// ---------- 規則式回覆引擎（真的依設定回答） ----------
const RE = {
  reaction: /(吃了|吃完|吃到|吃).{0,8}(過敏|癢|腫|紅疹|起疹|不舒服)|過敏反應|蕁麻疹|喉嚨.{0,4}(癢|腫)|呼吸困難|allergic reaction|itchy|swollen|rash|can'?t breathe|アレルギー(が出|反応|症状)|かゆ|じんましん|息苦し/i,
  complaint: /退款|退錢|壓壞|壓扁|壞掉|爛掉|發霉|客訴|很差|太扯|refund|damaged|broken|complain|moldy|返金|潰れ|壊れ|クレーム/i,
  medical: /血糖|糖尿病|血壓|治療|療效|減肥|瘦身|孕婦|cure|diabetes|diabetic|weight loss|lose weight|血糖値|ダイエット|妊婦/i,
  qty: /(\d{1,4})\s*(盒|個|條|份|組|箱|入|boxes|box|pcs|pieces|rolls|packs|セット)/i,
  discount: /打折|\d\s*折|[七八九]\s*五?\s*折|折扣|便宜|優惠|discount|%\s*off|coupon|cheaper|割引|値引|安く/i,
  nuts: /堅果|花生|過敏原|過敏|麩質|nut|peanut|allerg|gluten|ナッツ|アレルゲン|アレルギー|小麦/i,
  overseas: /海外|國外|香港|日本|新加坡|馬來西亞|吉隆坡|越南|美國|overseas|abroad|international|kuala lumpur|malaysia|singapore|japan|hong kong|海外発送/i,
  ship: /運費|免運|寄費|shipping|delivery fee|postage|送料/i,
  deliver: /明天|後天|寄得到|送得到|幾天到|多久到|到貨|送達|配送|離島|澎湖|金門|tomorrow|deliver|arrive|when will|届き|届く|明日|配達/i,
  storage: /保存|放多久|放幾天|冰箱|冷藏|常溫|效期|store|keep|shelf life|fridge|refrigerat|賞味期限|日持ち|冷蔵/i,
  custom: /客製|訂做|生日蛋糕|寫字|照片|翻糖|custom|birthday|personali[sz]e|オーダー|誕生日|名入れ|文字入れ/i,
  pay: /付款|刷卡|信用卡|轉帳|line ?pay|貨到付款|街口|apple ?pay|payment|credit card|\bpay\b|cash|支払|カード|振込/i,
  invoice: /發票|統編|統一編號|載具|收據|invoice|receipt|tax id|領収書|インボイス/i,
  hours: /營業|幾點|開門|門市|自取|地址|公休|opening|hours|pick ?up|営業|受け取り|店舗/i,
  ret: /退貨|換貨|退換|return|exchange|返品|交換/i,
};

function answer(q) {
  const det = detectLang(q) || 'zh';
  const r = { lang: det, text: '', cites: [], flags: [], handoff: null, mode: 'ai', unknown: false, calm: false };
  if (!S.live) {
    r.mode = 'off'; r.text = `${S.name}休息中，這則訊息已直接轉到${OWNER}的手機。`;
    return r;
  }
  if (S.hours === 'after' && S.sim === 'open') {
    r.mode = 'human'; r.text = `現在是營業時間 ${BIZ_HOURS.label}，由${OWNER}親自回覆；${S.name}在旁待命，幫她先查好答案。`;
    return r;
  }
  let lang = det;
  if (!S.langs[det]) {
    const alt = det !== 'zh' && S.langs.en ? 'en' : S.langs.zh ? 'zh' : (Object.keys(S.langs).find(k => S.langs[k]) || 'zh');
    r.flags.push({ k: 'info', t: `${LANG_LABEL[det]} 未開啟 → 改用 ${LANG_LABEL[alt]} 回覆` });
    lang = alt;
  }
  r.lang = lang;
  const cl = lang === 'vi' || lang === 'ms' ? 'en' : lang;
  let core = intent(q, cl, r);
  if (S.tone !== 'warm' && cl === 'zh' && !r.calm) {
    if (S.tone === 'pro') core = core.replace(/～/g, '').replace(/喔|唷|呀|啦/g, '').replace(/沒問題！/g, '沒問題。').replace(/可以的！/g, '可以。');
    if (S.tone === 'lively') core = core.replace(/喔/g, '唷').replace(/。$/, '！');
  }
  const w = TONE_WRAP[lang] || TONE_WRAP.en;
  if (r.calm) {
    r.text = core;
    r.flags.push({ k: 'info', t: '敏感狀況：自動改用沉穩語氣' });
  } else {
    const [open, close] = w[S.tone];
    r.text = wrapName(open) + core + (r.handoff || r.unknown ? '' : ' ' + wrapName(close));
  }
  return r;
}

function intent(q, cl, r) {
  const T = (zh, en, ja) => cl === 'en' ? en : cl === 'ja' ? ja : zh;
  const g = S.guard;
  const kb = (key) => { const i = kbIdx(key); if (i >= 0) r.cites.push({ t: 'kb', id: S.kb[i].id, n: i + 1, title: S.kb[i].title }); return i >= 0 ? S.kb[i] : null; };
  const gd = (id, title) => r.cites.push({ t: 'guard', id, title });
  const risk = (t) => r.flags.push({ k: 'risk', t });
  const ship = kbCard('ship');
  const free = ship ? ship.params.free : null;

  // 1. 吃了過敏
  if (RE.reaction.test(q)) {
    r.calm = true;
    kb('allergen');
    const safety = T('請先停止食用。如果出現呼吸困難、嘴唇或喉嚨腫脹，請立刻撥打 119 或就醫。',
      'Please stop eating it right away. If you have trouble breathing or swelling of the lips or throat, call 119 or see a doctor immediately.',
      'すぐに食べるのをやめてください。息苦しさや唇・喉の腫れがある場合は、すぐに119番または医療機関を受診してください。');
    if (g.escalate) {
      gd('escalate', '敏感狀況立即轉給你');
      r.handoff = { reason: '過敏反應', urgent: true };
      return safety + T(`我已經通知${OWNER}，她會馬上跟您聯繫；方便的話請告訴我您吃的品項與購買日期。`,
        `I have alerted ${OWNER}, the owner, and she will contact you right away. Could you tell me which item you ate and when you bought it?`,
        `店主の${OWNER}にすぐ連絡しました。折り返しご連絡します。召し上がった商品と購入日を教えていただけますか。`);
    }
    risk(`未開護欄：過敏反應沒有通知${OWNER}，只由 AI 處理`);
    return safety + T('請問還有什麼需要協助的嗎？', 'Is there anything else I can help with?', 'ほかにお手伝いできることはありますか。');
  }
  // 2. 客訴／退款
  if (RE.complaint.test(q)) {
    const rc = kbCard('return');
    if (g.escalate) {
      gd('escalate', '敏感狀況立即轉給你');
      if (rc) kb('return');
      r.handoff = { reason: '客訴退款' };
      r.calm = true;
      return T(`非常抱歉讓您收到不完美的甜點！${rc ? `依店規，收到 ${rc.params.hours} 小時內的壓損可以免費補寄或全額退款。` : ''}麻煩拍張照片傳給我，我已經轉給${OWNER}親自處理，今天內一定回覆您。`,
        `We're so sorry your order arrived like this! ${rc ? `Damage reported within ${rc.params.hours} hours qualifies for a free replacement or full refund. ` : ''}Please send us a photo — I've passed this to ${OWNER}, who will personally reply today.`,
        `ご不便をおかけして大変申し訳ございません。${rc ? `到着後${rc.params.hours}時間以内の破損は無料再送または全額返金いたします。` : ''}お写真をお送りください。店主の${OWNER}に引き継ぎ、本日中にご連絡します。`);
    }
    risk(`未開護欄：AI 直接答應退款，${OWNER}不會收到通知`);
    return T('好的，已經幫您辦理全額退款，3–5 個工作天退回原付款方式。', 'Sure, I have issued a full refund. It will reach your original payment method in 3–5 business days.', 'かしこまりました。全額返金の手続きをしました。3〜5営業日で元のお支払い方法に返金されます。');
  }
  // 3. 醫療功效
  if (RE.medical.test(q)) {
    const low = PRODUCTS.filter(p => p.sweet <= 2).map(p => pname(p.id, cl));
    if (g.promise) {
      gd('promise', '不亂承諾：不說醫療功效');
      return T(`謝謝您的詢問～我們的甜點是一般食品，沒有醫療或保健功效，也不能取代藥物喔。如果正在控制血糖，建議先問問醫師；想吃甜度低一點的，可以參考${low.join('、')}。`,
        `Thanks for asking! Our desserts are ordinary food with no medical or health benefits, and they can't replace medication. If you're managing blood sugar, please check with your doctor first. Our least sweet items are ${low.join(' and ')}.`,
        `お問い合わせありがとうございます。当店のお菓子は一般食品で、医療・健康効果はなく、薬の代わりにはなりません。血糖値を管理中の方は医師にご相談ください。甘さ控えめなら${low.join('・')}がおすすめです。`);
    }
    risk('未開護欄：AI 暗示了健康功效，可能違反食品廣告規定');
    return T(`${low[0]}甜度很低，控制血糖的朋友也可以放心吃喔！`, `${low[0]} is very low in sugar, so it's totally fine for people watching their blood sugar!`, `${low[0]}は甘さ控えめなので、血糖値が気になる方も安心して食べられます！`);
  }
  // 4. 老闆新增的店規（含匯入、從「不會回答」補上的）
  const cm = matchCustom(q);
  if (cm) {
    kb(cm.key);
    if (cl !== 'zh' && !cm[cl]) r.flags.push({ k: 'info', t: '此條店規尚無外語版，AI 會自動翻譯（示範顯示原文）' });
    return cardText(cm, cl);
  }
  // 5. 大量訂購
  const qm = q.match(RE.qty); const qpid = findPid(q);
  if (qm && qpid && +qm[1] >= 5) {
    const qty = +qm[1]; const p = PRODUCT_MAP[qpid]; const amt = qty * p.price;
    const nm = pname(qpid, cl); const freeShip = free != null && amt >= free;
    if (g.approve && amt >= g.amt) {
      gd('approve', `大額訂單：${money(g.amt)} 以上要你點頭`);
      r.handoff = { reason: '大額訂單', detail: `${qty} × ${p.name}・${money(amt)}` };
      return T(`${qty} 盒${nm}共 ${money(amt)}，謝謝您的支持！因為數量比較多，我先幫您保留，請${OWNER}確認產能和出貨日後，30 分鐘內回覆您。`,
        `${qty} × ${nm} comes to ${money(amt)} — thank you! As it's a large order, I've reserved the stock and ${OWNER} will confirm production and delivery date within 30 minutes.`,
        `${nm} ${qty}点で ${money(amt)} です。ありがとうございます！数量が多いため在庫を確保し、${OWNER}が製造・発送日を確認のうえ30分以内にご連絡します。`);
    }
    if (ship) kb('ship');
    if (!g.approve && amt >= g.amt) risk(`未開護欄：AI 直接成立 ${money(amt)} 大單，產能可能來不及`);
    return T(`沒問題！${qty} 盒${nm}共 ${money(amt)}${freeShip ? '，已達免運' : ''}。我現在傳付款連結給您，付款後會自動開立電子發票。`,
      `No problem! ${qty} × ${nm} is ${money(amt)}${freeShip ? ' with free shipping' : ''}. I'll send you the payment link now; the e-invoice is issued automatically after payment.`,
      `かしこまりました！${nm} ${qty}点で ${money(amt)}${freeShip ? '、送料無料です' : 'です'}。お支払いリンクをお送りします。お支払い後、電子インボイスを自動発行します。`);
  }
  // 6. 折扣
  if (RE.discount.test(q)) {
    const asked = parseAsk(q);
    const freeTxt = free != null ? T(`另外單筆滿 NT$${fmtN(free)} 就免運，算下來也很划算喔！`, ` Plus, orders over NT$${fmtN(free)} ship free!`, `なお、NT$${fmtN(free)}以上で送料無料です！`) : '';
    if (!g.discount) {
      const f = asked || 80;
      risk(`未設折扣上限：AI 直接答應 ${foldText(f)}，這單少賺 ${100 - f}%`);
      return T(`好呀！這次就幫您打 ${foldText(f)}，結帳時自動套用。`, `Sure! I'll give you ${foldText(f, 'en')} — it'll apply at checkout.`, `いいですよ！今回は${foldText(f, 'ja')}にします。お会計で自動適用されます。`);
    }
    gd('discount', `折扣上限：${discountLabel(g.cap)}`);
    if (free != null) kb('ship');
    if (g.cap >= 100) {
      return T(`我們的甜點都是每天少量手作、實價販售，沒有提供折扣喔。${freeTxt}`, `Our desserts are handmade in small batches daily and sold at fixed prices, so we don't offer discounts.${freeTxt}`, `毎日少量手作りのため、定価販売で割引は行っておりません。${freeTxt}`);
    }
    if (asked && asked >= g.cap) {
      return T(`可以的！這次幫您打 ${foldText(asked)}，結帳時會自動套用。`, `Yes! I can give you ${foldText(asked, 'en')}; it applies automatically at checkout.`, `はい、${foldText(asked, 'ja')}でご案内できます。お会計で自動適用されます。`);
    }
    return T(`不好意思，${S.name}最多只能給到 ${foldText(g.cap)}${asked ? `，沒辦法打到 ${foldText(asked)}` : ''}。${freeTxt}`,
      `Sorry, the most I can offer is ${foldText(g.cap, 'en')}${asked ? `, not ${foldText(asked, 'en')}` : ''}.${freeTxt}`,
      `申し訳ありません、割引は最大${foldText(g.cap, 'ja')}までです${asked ? `（${foldText(asked, 'ja')}はお受けできません）` : ''}。${freeTxt}`);
  }
  // 7. 過敏原
  if (RE.nuts.test(q)) {
    const c = kbCard('allergen');
    if (!c) return fallback(q, cl, r);
    kb('allergen');
    const giftQ = /禮盒|送禮|伴手禮|gift|box|ギフト|贈/i.test(q);
    let txt;
    if (giftQ) {
      txt = T(`不含堅果的禮盒有：${NO_NUT_GIFTS.map(p => `${p.name}${p.storage === 'fridge' ? '（冷藏）' : ''}`).join('、')}；只有${NUTS.map(p => p.name).join('、')}含堅果。`,
        `Nut-free gift options: ${NO_NUT_GIFTS.map(p => pname(p.id, 'en') + (p.storage === 'fridge' ? ' (chilled)' : '')).join(', ')}. Only the ${NUTS.map(p => pname(p.id, 'en')).join(', ')} contains nuts.`,
        `ナッツ不使用のギフトは${NO_NUT_GIFTS.map(p => pname(p.id, 'ja') + (p.storage === 'fridge' ? '（要冷蔵）' : '')).join('、')}です。ナッツを含むのは${NUTS.map(p => pname(p.id, 'ja')).join('、')}だけです。`);
    } else {
      const pid = findPid(q);
      if (pid) {
        const p = PRODUCT_MAP[pid]; const has = p.allergens.includes('nuts');
        const AL = { zh: { egg: '蛋', milk: '奶', gluten: '麩質', nuts: '堅果' }, en: { egg: 'egg', milk: 'milk', gluten: 'gluten', nuts: 'nuts' }, ja: { egg: '卵', milk: '乳', gluten: '小麦', nuts: 'ナッツ' } }[cl];
        txt = T(`${p.name}含有：${p.allergens.map(a => AL[a]).join('、')}。${has ? '含堅果，請留意。' : '不含堅果。'}`, `${pname(pid, 'en')} contains ${p.allergens.map(a => AL[a]).join(', ')}. ${has ? 'It contains nuts.' : 'No nuts.'}`, `${pname(pid, 'ja')}には${p.allergens.map(a => AL[a]).join('・')}が含まれます。${has ? 'ナッツを含みます。' : 'ナッツは不使用です。'}`);
      } else txt = cl === 'zh' && c.note ? cardText(c, 'zh') : allergenText(cl);
    }
    if (g.promise) {
      gd('promise', '不亂承諾：不保證零過敏原');
      if (giftQ || findPid(q)) txt += T('廚房同時處理堅果，無法保證完全零接觸，嚴重過敏請斟酌。', ' Our kitchen also handles nuts, so we can\'t guarantee zero cross-contact.', '同じ厨房でナッツを扱うため、微量混入の可能性はゼロではありません。');
    } else {
      txt += T('都完全不含堅果，百分之百可以放心吃！', ' They are 100% nut-free, no worries at all!', '完全にナッツフリーなので100%安心です！');
      risk('未開護欄：AI 保證了「完全不含」，廚房其實有交叉接觸風險');
    }
    return txt;
  }
  // 8. 海外寄送
  if (RE.overseas.test(q)) {
    if (!kb('area')) return fallback(q, cl, r);
    return T('冷藏蛋糕沒辦法寄海外；常溫的鳳梨酥禮盒、手工餅乾禮盒可以寄，國際運費 NT$450 起，約 5–10 天送達。',
      'Chilled cakes can\'t be shipped overseas, but our Pineapple Cake and Cookie Gift Boxes can. International shipping starts at NT$450 and takes about 5–10 days.',
      '冷蔵ケーキは海外発送できませんが、パイナップルケーキとクッキーのギフトは発送できます。国際送料は NT$450 から、到着まで約5〜10日です。');
  }
  // 9. 運費
  if (RE.ship.test(q)) {
    if (!kb('ship')) return fallback(q, cl, r);
    const { fee, free: fr } = ship.params;
    return T(`宅配運費 NT$${fmtN(fee)}，單筆滿 NT$${fmtN(fr)} 就免運；門市自取不用運費喔。`, `Delivery is NT$${fmtN(fee)}, and orders of NT$${fmtN(fr)} or more ship free. Store pickup is free.`, `配送料は NT$${fmtN(fee)}、NT$${fmtN(fr)}以上のご注文で送料無料です。店頭受け取りは無料です。`);
  }
  // 10. 送達時間／區域
  if (RE.deliver.test(q)) {
    const a = kbCard('area');
    if (!a) return fallback(q, cl, r);
    kb('area');
    if (/離島|澎湖|金門|馬祖|綠島|蘭嶼|island/i.test(q)) {
      return T('冷藏蛋糕不寄離島；常溫禮盒（磅蛋糕、餅乾、鳳梨酥、可麗露）可以寄，約 2–3 天到。', 'Chilled cakes can\'t go to outlying islands, but room-temperature gift boxes can, arriving in about 2–3 days.', '離島へは冷蔵ケーキを発送できません。常温ギフトは発送可能で、2〜3日で届きます。');
    }
    const city = findCity(q); const cityT = T(city, CITY_EN[city] || '', city);
    const t = SIM_TIMES[S.sim]; const cut = a.params.cutoff;
    const before = t.h * 60 + t.m < cut * 60;
    let txt = before
      ? T(`現在下單付款，今天 ${cut}:00 前就會出貨，冷藏宅配明天可以送到${cityT || '本島各地'}。`, `If you order and pay now, we'll ship before ${cut}:00 today and it should reach ${cityT || 'you'} tomorrow by chilled courier.`, `今ご注文・お支払いいただければ、本日${cut}時までに発送し、明日${cityT ? cityT + 'に' : ''}お届けの予定です。`)
      : T(`今天 ${cut}:00 已經截單了，現在下單會在明天出貨，後天送到${cityT || '本島各地'}。`, `Today's ${cut}:00 cut-off has passed, so we'll ship tomorrow and it should reach ${cityT || 'you'} the day after.`, `本日の${cut}時の締め切りを過ぎたため、明日発送・明後日${cityT ? cityT + 'に' : ''}お届けとなります。`);
    if (g.promise) {
      gd('promise', '不亂承諾：不保證送達時間');
      txt += T('物流偶爾會延誤，實際到貨以黑貓配送為準，沒辦法百分之百保證時間喔。', ' Courier delays can happen, so we can\'t guarantee the exact time.', '配送遅延が起こる場合もあるため、到着時間はお約束できかねます。');
    } else {
      txt += T('保證一定準時送到！', ' Guaranteed to arrive on time!', '必ず時間通りにお届けします！');
      risk('未開護欄：AI 保證了送達時間，延誤時容易被客訴');
    }
    return txt;
  }
  // 11. 保存
  if (RE.storage.test(q)) {
    const c = kbCard('storage');
    if (!c) return fallback(q, cl, r);
    kb('storage');
    const pid = findPid(q);
    if (pid) {
      const p = PRODUCT_MAP[pid]; const fr = p.storage === 'fridge';
      return T(`${p.name}要${fr ? '冷藏' : '常溫'}保存，可以放 ${p.days} 天，${fr ? '收到後請盡快放冰箱喔。' : '避免陽光直射就好。'}`,
        `Keep the ${pname(pid, 'en')} ${fr ? 'refrigerated' : 'at room temperature'}; it lasts ${p.days} days.${fr ? ' Please refrigerate it as soon as it arrives.' : ''}`,
        `${pname(pid, 'ja')}は${fr ? '要冷蔵' : '常温保存'}で、${p.days}日間お楽しみいただけます。`);
    }
    return cl === 'zh' && c.note ? cardText(c, 'zh') : storageText(cl);
  }
  // 12–16. 一般店規卡
  for (const [re, key] of [[RE.custom, 'custom'], [RE.pay, 'pay'], [RE.invoice, 'invoice'], [RE.hours, 'hours'], [RE.ret, 'return']]) {
    if (re.test(q)) { const c = kb(key); return c ? cardText(c, cl) : fallback(q, cl, r); }
  }
  return fallback(q, cl, r);
}
function fallback(q, cl, r) {
  r.unknown = true; r.cites = [];
  r.flags.push({ k: 'info', t: '已記到「AI 不會回答的問題」，建議補一條店規' });
  const T = (zh, en, ja) => cl === 'en' ? en : cl === 'ja' ? ja : zh;
  return T(`這個問題${S.name}還沒學過，不想亂回答您。我已經記下來請${OWNER}確認，稍後由她親自回覆！`,
    `${S.name} hasn't learned this one yet and doesn't want to guess. I've noted it for ${OWNER}, who will reply to you shortly!`,
    `申し訳ありません、この質問はまだ学習していないため、店主の${OWNER}に確認してからお返事します。`);
}
function parseAsk(q) {
  let m = q.match(/(\d{1,2})(?:\.(\d))?\s*折/);
  if (m) { const a = +m[1]; const v = m[2] ? a * 10 + +m[2] : a < 10 ? a * 10 : a; return v; }
  const ZH = { 七: 70, 八: 80, 九: 90 };
  m = q.match(/([七八九])(五)?\s*折/); if (m) return ZH[m[1]] + (m[2] ? 5 : 0);
  m = q.match(/(\d{1,2})\s*%/); if (m) return 100 - +m[1];
  m = q.match(/(\d)\s*割/); if (m) return 100 - +m[1] * 10;
  return null;
}
function matchCustom(q) {
  const ql = q.toLowerCase(); let best = null, bs = 0;
  for (const c of S.kb) {
    if (!c.custom) continue;
    let s;
    if (c.kw && c.kw.length && !c.loose) s = c.kw.filter(k => ql.includes(k.toLowerCase())).length * 2;
    else s = (c.kw && c.kw.length ? c.kw : bigrams(c.title)).filter(b => ql.includes(b)).length;
    if (s >= 2 && s > bs) { bs = s; best = c; }
  }
  return best;
}

// ---------- 版面 ----------
function heroStats() {
  const t0 = startOfDay(new Date());
  const days = []; for (let i = 6; i >= 0; i--) days.push(addDays(t0, -i));
  const CHAT = new Set(['line', 'whatsapp', 'zalo', 'messenger', 'web']);
  const base = days.map(d => store.ordersBetween(d, addDays(d, 1)).filter(o => CHAT.has(o.channel)).length);
  const sales = store.ordersBetween(days[0], addDays(t0, 1)).filter(o => CHAT.has(o.channel)).reduce((s, o) => s + o.total, 0);
  const series = weekSeries(base);
  const ai = series.reduce((s, d) => s + d.ai, 0);
  const human = series.reduce((s, d) => s + d.human, 0);
  const csat = series.reduce((s, d) => s + d.csat, 0) / series.length;
  return { days, series, ai, human, ratio: human / (ai + human) * 100, csat, sales: Math.round(sales * 0.86), hours: Math.round(ai * 1.6 / 60) };
}

export default {
  mount(section) {
    const st = heroStats();
    root = el(`<div class="ag">
      <div class="ag-main">
        <div class="ag-left">
          ${heroHtml(st)}
          ${personaHtml()}
          ${kbSecHtml()}
          ${guardSecHtml()}
        </div>
        <div class="ag-right">${sandboxHtml()}</div>
      </div>
      ${dashHtml(st)}
    </div>`);
    section.appendChild(root);
    msgsEl = $('.ag-msgs', root);
    renderKb(); renderGuards(); renderQ(); renderUnknown(); renderHandoffs(); renderTop(); renderChecks();
    bind(st);
    // 預先放兩則對話，讓畫面一打開就有內容
    ['有沒有不含堅果的禮盒？', '可以打 8 折嗎？'].forEach(q => S.chat.push({ q, res: answer(q) }));
    updateIdentity();
    renderChat(false);
    requestAnimationFrame(() => { msgsEl.scrollTop = msgsEl.scrollHeight; });
    countStats(st);
  },
  show() { if (chart) setTimeout(() => chart.resize(), 60); },
  hide() { closeModal(); },
};

function heroHtml(st) {
  return `<div class="glass ag-hero anim-in">
    <div class="ag-hero-av"><span class="ag-hero-ring"></span><span data-av-big>${avatarSvg(S.avatar, 76)}</span><i class="ag-live-dot"></i></div>
    <div class="ag-hero-txt">
      <div class="ag-kicker">${icon('bot', 15)} AI 店員 <span class="demo-badge">示範資料</span></div>
      <h2><span data-name-out>${esc(S.name)}</span> <em data-live-txt>上班中</em>，幫你 24 小時顧店</h2>
      <p>教一次店規，她就會用 5 種語言回答客人；遇到客訴、過敏、大單，第一時間轉給${OWNER}。</p>
      <div class="ag-checks" data-checks></div>
    </div>
    <div class="ag-hero-side">
      <label class="ag-bigsw"><input type="checkbox" data-live checked><span class="ag-sw-ui"></span><b data-live-lbl>讓她上班</b></label>
      <div class="ag-hstats">
        <div><b data-hs="ai">0</b><span>本週自動回覆</span></div>
        <div><b data-hs="sales">0</b><span>AI 經手成交</span></div>
        <div><b data-hs="hours">0</b><span>幫你省下（小時）</span></div>
      </div>
    </div>
  </div>`;
}

function personaHtml() {
  return `<section class="glass ag-card ag-persona anim-in" id="ag-persona">
    <div class="ag-sec-h"><div><h3><span class="ag-step">1</span>她是誰：人設</h3><p>名字、長相、說話方式，改了右邊手機馬上看到。</p></div></div>
    <div class="ag-p-grid">
      <div class="ag-p-id">
        <label class="ag-lbl">名字</label>
        <input class="ag-in" data-name maxlength="8" value="${esc(S.name)}">
        <label class="ag-lbl">頭像</label>
        <div class="ag-avs">${AVATARS.map(a => `<button class="ag-avbtn ${a.id === S.avatar ? 'on' : ''}" data-av="${a.id}" title="${a.name}">${avatarSvg(a.id, 42)}</button>`).join('')}</div>
        <label class="ag-lbl">她會出現在</label>
        <div class="ag-chs">${[['line', 'LINE'], ['whatsapp', 'WhatsApp'], ['zalo', 'Zalo'], ['messenger', 'Messenger'], ['web', '官網']].map(([id, n]) => `<span class="chip-sm">${chIcon(id, 16)}${n}</span>`).join('')}</div>
      </div>
      <div class="ag-p-set">
        <label class="ag-lbl">語氣 <small>切換後，右側試聊的回覆會跟著變</small></label>
        <div class="ag-tones">${TONES.map(t => `<button class="ag-tone ${t.id === S.tone ? 'on' : ''}" data-tone="${t.id}"><b>${t.name}</b><small>${t.sample}</small></button>`).join('')}</div>
        <label class="ag-lbl">可用語言 <small>客人用哪種語言問，她就用哪種回</small></label>
        <div class="ag-langs">${LANG_OPTS.map(l => `<button class="ag-lang ${S.langs[l.id] ? 'on' : ''}" data-lang="${l.id}"><i>${icon('check', 12)}</i><b>${l.label}</b><small>${l.sub}</small></button>`).join('')}</div>
        <label class="ag-lbl">上班時間</label>
        <div class="ag-hours">
          <button class="ag-hr ${S.hours === '24h' ? 'on' : ''}" data-hours="24h">${icon('clock', 16)}<span><b>24 小時全天</b><small>全部訊息都由她先回</small></span></button>
          <button class="ag-hr ${S.hours === 'after' ? 'on' : ''}" data-hours="after">${icon('bell', 16)}<span><b>只在下班後接手</b><small>營業 ${BIZ_HOURS.label} 由你回</small></span></button>
        </div>
      </div>
    </div>
  </section>`;
}

function kbSecHtml() {
  return `<section class="glass ag-card ag-kb anim-in" id="ag-kb">
    <div class="ag-sec-h">
      <div><h3><span class="ag-step">2</span>店規知識庫 <span class="chip-sm" data-kb-count></span></h3><p>用白話寫就好，她會自己理解、翻成 5 種語言。藍色數字可以直接改。</p></div>
      <div class="ag-sec-btns">
        <button class="btn btn-ghost btn-sm" data-imp-toggle>${icon('wand', 15)}從網址或文件匯入</button>
        <button class="btn btn-primary btn-sm" data-kb-add>${icon('plus', 15)}新增店規</button>
      </div>
    </div>
    <div class="ag-imp" data-imp hidden>
      <div class="ag-imp-l">
        <div class="ag-imp-tabs">
          <button class="seg on" data-imp-tab="text">貼上文字</button>
          <button class="seg" data-imp-tab="url">貼上網址</button>
          <button class="seg" data-imp-tab="file">上傳文件</button>
        </div>
        <div class="ag-imp-src">
          <textarea class="ag-in ag-imp-ta" data-imp-pane="text" rows="7">${esc(IMPORT_SAMPLE)}</textarea>
          <div data-imp-pane="url" hidden><input class="ag-in" value="${IMPORT_URL}"><small class="ag-note">示範：不會真的連網，會以預先準備的「購物須知」頁面內容示範。</small></div>
          <div class="ag-drop" data-imp-pane="file" hidden>${icon('file', 26)}<b>購物須知.pdf</b><small>2 頁・已上傳（示範）</small></div>
          <i class="ag-scan"></i>
        </div>
        <button class="btn btn-primary" data-imp-run>${icon('sparkle', 16)}AI 幫我拆成問答</button>
      </div>
      <div class="ag-imp-r">
        <div class="ag-imp-steps" data-imp-steps><div class="ag-imp-empty">${icon('wand', 22)}<span>貼上官網的購物須知、LINE 記事本或 PDF，<br>AI 會拆成一條條客人會問的問題。</span></div></div>
        <div class="ag-imp-out" data-imp-out></div>
        <button class="btn btn-primary btn-sm" data-imp-add hidden>${icon('plus', 14)}加入勾選的店規</button>
      </div>
    </div>
    <div class="ag-kb-grid" data-kb></div>
  </section>`;
}

function guardSecHtml() {
  return `<section class="glass ag-card ag-guard anim-in" id="ag-guard">
    <div class="ag-sec-h"><div><h3><span class="ag-step">3</span>安全護欄 <span class="chip-sm" data-g-count></span></h3><p>她再聰明，也有不能自己決定的事。打開的護欄，AI 絕對不會越線。</p></div></div>
    <div class="ag-g-list" data-guards></div>
  </section>`;
}

function sandboxHtml() {
  return `<div class="ag-sbx">
    <div class="ag-sbx-h">
      <div><h3>${icon('chat', 17)}試聊沙盒</h3><small>依左邊設定即時回覆・不會傳給真的客人</small></div>
      <button class="icon-btn" data-reset title="清空對話">${icon('refresh', 16)}</button>
    </div>
    <div class="ag-sim"><span>模擬現在時間</span>${Object.entries(SIM_TIMES).map(([k, v]) => `<button class="seg ${S.sim === k ? 'on' : ''}" data-sim="${k}">${v.label}</button>`).join('')}</div>
    <div class="ag-phone">
      <div class="ag-ph-bar"><b data-clock>14:20</b><i class="ag-notch"></i><span>${icon('cloud', 12)} 5G</span></div>
      <div class="ag-ph-h">
        <span data-av-sm>${avatarSvg(S.avatar, 34)}</span>
        <div><b data-name-out>${esc(S.name)}</b><small data-ph-st>阿美手作甜點・AI 店員</small></div>
        <span class="chip-sm">${chIcon('line', 14)}LINE（模擬）</span>
      </div>
      <div class="ag-msgs"></div>
      <form class="ag-ph-in" data-form><input data-q placeholder="輸入客人會問的問題…" autocomplete="off"><button class="ag-send" type="submit" aria-label="送出">${icon('send', 16)}</button></form>
    </div>
    <div class="ag-tq">
      <div class="ag-tq-tabs">${[['zh', '中文'], ['ja', '日本語'], ['en', 'English']].map(([k, n]) => `<button class="${k === S.qtab ? 'on' : ''}" data-qtab="${k}">${n}</button>`).join('')}<span>點一下就問</span></div>
      <div class="ag-tq-list" data-tq></div>
    </div>
  </div>`;
}

function dashHtml(st) {
  return `<section class="ag-dash anim-in">
    <div class="ag-dash-h"><h3>${icon('trend', 18)}對話品質儀表 <span class="demo-badge">示範資料</span></h3><small>本週 ${st.days[0].getMonth() + 1}/${st.days[0].getDate()}–${st.days[6].getMonth() + 1}/${st.days[6].getDate()}・全通路</small></div>
    <div class="ag-kpis">
      ${kpi('chat', '#2DB674', '本週 AI 自動回覆', 'ai', '則', '幾乎都在 10 秒內回')}
      ${kpi('user', '#EC6A55', '轉真人比例', 'ratio', '', `共 ${fmtN(st.human)} 則交給${OWNER}`)}
      ${kpi('heart', '#DD5597', '客人滿意度', 'csat', '', '對話結束後一鍵評分')}
      ${kpi('clock', '#2E97D4', '平均回覆時間', 'rt', '', `${OWNER}自己回平均 47 分鐘`)}
      ${kpi('coins', '#F0A531', 'AI 經手成交', 'sales', '', '聊天中直接下單付款')}
    </div>
    <div class="ag-dgrid">
      <div class="glass card ag-chartcard"><div class="card-h"><h3>${icon('trend', 16)}每天回覆量</h3><span class="chip-sm">長條：AI 自動／轉${OWNER}・線：滿意度</span></div><div class="ag-chart" data-chart></div></div>
      <div class="glass card"><div class="card-h"><h3>${icon('ask', 16)}常見問題 Top 5</h3><span class="chip-sm">點一下拿去試聊</span></div><div class="ag-top" data-top></div></div>
      <div class="glass card ag-unk-card"><div class="card-h"><h3>${icon('alert', 16)}她還不會回答的問題</h3><span class="chip-sm warn" data-unk-n></span></div><p class="ag-note">這些問題她沒亂答，而是轉給你。補一條店規，下次就會了。</p><div class="ag-unk" data-unk></div></div>
      <div class="glass card"><div class="card-h"><h3>${icon('bell', 16)}最近轉給${OWNER}的對話</h3><span class="chip-sm">${icon('shield', 12)}護欄觸發</span></div><div class="ag-hand-list" data-hands></div></div>
    </div>
  </section>`;
}
function kpi(ic, c, label, key, unit, sub) {
  return `<div class="glass kpi" style="--c:${c}"><div class="kpi-top"><span class="kpi-ic">${icon(ic, 16)}</span><span class="kpi-label">${label}</span></div><div class="kpi-val" data-k="${key}">0</div><div class="kpi-sub">${sub}</div></div>`;
}

// ---------- 店規卡 ----------
function renderKb() {
  const host = $('[data-kb]', root);
  host.innerHTML = S.kb.map((c, i) => {
    let body = esc(c.body);
    if (c.params) body = body.replace(/\{(\w+)\}/g, (m, k) => c.params[k] == null ? m : `<input class="ag-num" type="number" inputmode="numeric" data-card="${c.id}" data-p="${k}" value="${c.params[k]}" min="${PARAM[k]?.min ?? 0}" max="${PARAM[k]?.max ?? 99999}" step="${PARAM[k]?.step ?? 1}" style="width:${String(c.params[k]).length + 3.2}ch" title="${PARAM[k]?.label || ''}">`);
    if (c.note) body += ` <span class="ag-kb-note">${esc(c.note)}</span>`;
    const cited = c.custom ? (c.fresh ? '剛新增' : '本週被問 0 次') : `本週引用 ${CITED[c.key] || 12} 次`;
    return `<article class="ag-kbc ${c.custom ? 'custom' : ''}" data-id="${c.id}" style="--c:${c.color}">
      <div class="ag-kbc-h"><span class="ag-kbc-no">第 ${i + 1} 條</span><span class="ag-kbc-ic">${icon(c.icon, 15)}</span><b>${esc(c.title)}</b>
        <span class="ag-kbc-act"><button class="icon-btn" data-edit="${c.id}" title="編輯">${icon('file', 14)}</button><button class="icon-btn ag-del" data-del="${c.id}" title="刪除">${icon('x', 14)}</button></span></div>
      <p>${body}</p>
      <div class="ag-kbc-f"><span>${icon('chat', 12)}${cited}</span>${c.auto ? `<span class="ag-sync">${icon('refresh', 11)}自動同步商品資料</span>` : `<span>${icon('globe', 12)}${c.custom && !c.en ? '中文（外語自動翻）' : '中・英・日・越・馬'}</span>`}</div>
    </article>`;
  }).join('');
  $('[data-kb-count]', root).textContent = `${S.kb.length} 條`;
  renderTop(); renderChecks();
}

// ---------- 護欄 ----------
function renderGuards() {
  const g = S.guard;
  const host = $('[data-guards]', root);
  host.innerHTML = GUARDS.map((d, i) => {
    let ctrl = '', tryQ = '';
    if (d.id === 'promise') { ctrl = `<div class="ag-g-tags">${['醫療功效', '保證送達時間', '保證零過敏原'].map(t => `<span class="chip-sm">${icon('x', 11)}${t}</span>`).join('')}</div>`; tryQ = '吃這個可以降血糖嗎？'; }
    if (d.id === 'discount') { ctrl = `<div class="ag-g-seg">${DISCOUNT_OPTS.map(v => `<button class="seg ${g.cap === v ? 'on' : ''}" data-cap="${v}">${discountLabel(v)}</button>`).join('')}</div><small class="ag-g-hint">${g.cap >= 100 ? 'AI 一律不給折扣' : `AI 最多給到 ${discountLabel(g.cap)}`}，更低的折扣請客人等你決定</small>`; tryQ = '可以打 8 折嗎？'; }
    if (d.id === 'approve') { ctrl = `<div class="ag-g-amt"><span>單筆超過</span><label>NT$ <input class="ag-num ag-num-lg" type="number" data-amt value="${g.amt}" min="1000" max="200000" step="1000"></label><span>就先問你</span></div>`; tryQ = '公司尾牙要訂 30 盒鳳梨酥'; }
    if (d.id === 'escalate') { ctrl = `<div class="ag-g-tags">${['客訴', '退款', '吃了過敏'].map(t => `<span class="chip-sm">${icon('alert', 11)}${t}</span>`).join('')}</div><div class="ag-g-notify"><span>通知方式</span><button class="ag-nt ${g.line ? 'on' : ''}" data-nt="line">${chIcon('line', 16)}LINE 推播</button><button class="ag-nt ${g.phone ? 'on' : ''}" data-nt="phone">${icon('phone', 14)}電話（過敏反應時）</button></div>`; tryQ = '我吃了過敏怎麼辦'; }
    const on = g[d.id];
    return `<div class="ag-g ${on ? '' : 'off'}" data-g="${d.id}" id="ag-g-${d.id}" style="--c:${d.color}">
      <span class="ag-g-ic">${icon(d.icon, 18)}</span>
      <div class="ag-g-body">
        <div class="ag-g-top"><b>${d.title}</b><span class="ag-g-stat">${on ? `上週攔下 ${d.blocked} 次` : '已關閉・有風險'}</span></div>
        <p>${d.desc}</p>
        <div class="ag-g-ctrl ${on ? '' : 'dim'}">${ctrl}</div>
      </div>
      <div class="ag-g-side">
        <label class="ag-sw"><input type="checkbox" data-gsw="${d.id}" ${on ? 'checked' : ''}><span class="ag-sw-ui"></span></label>
        <button class="ag-try" data-try="${esc(tryQ)}">${icon('play', 11)}試試看</button>
      </div>
    </div>`;
  }).join('');
  const n = GUARDS.filter(d => g[d.id]).length;
  const cnt = $('[data-g-count]', root); cnt.textContent = `${n}/4 開啟`; cnt.classList.toggle('warn', n < 4);
  renderChecks();
}

function renderChecks() {
  const host = $('[data-checks]', root); if (!host) return;
  const gn = GUARDS.filter(d => S.guard[d.id]).length;
  const items = [
    [true, `人設：${S.name}・${TONES.find(t => t.id === S.tone).name}`, 'ag-persona'],
    [S.kb.length >= 5, `店規 ${S.kb.length} 條`, 'ag-kb'],
    [gn === 4, `護欄 ${gn}/4`, 'ag-guard'],
    [S.unknown.length === 0, S.unknown.length ? `${S.unknown.length} 題待補` : '問題都會答', 'ag-unk'],
  ];
  host.innerHTML = items.map(([ok, t, id]) => `<button class="ag-ck ${ok ? 'ag-ok' : 'ag-todo'}" data-jump-sec="${id}"><i>${icon(ok ? 'check' : 'alert', 11)}</i>${esc(t)}</button>`).join('');
}

// ---------- 試聊 ----------
function renderQ() {
  $('[data-tq]', root).innerHTML = TEST_Q[S.qtab].map(q => `<button class="ag-tqb" data-ask="${esc(q)}">${esc(q)}</button>`).join('');
}
function msgHtml(entry, i) {
  const r = entry.res;
  const me = `<div class="ag-msg ag-me"><div class="ag-bub">${esc(entry.q)}</div></div>`;
  if (!r) return me + `<div class="ag-msg ag-ai" data-i="${i}"><span class="ag-msg-av">${avatarSvg(S.avatar, 28)}</span><div class="ag-col"><div class="ag-bub ag-typing"><i></i><i></i><i></i></div></div></div>`;
  if (r.mode === 'human' || r.mode === 'off') {
    return me + `<div class="ag-msg ag-sys" data-i="${i}"><span>${icon(r.mode === 'off' ? 'mute' : 'user', 13)}${esc(r.text)}</span></div>`;
  }
  return me + `<div class="ag-msg ag-ai" data-i="${i}"><span class="ag-msg-av">${avatarSvg(S.avatar, 28)}</span><div class="ag-col">
    <div class="ag-bub" data-txt>${esc(r.text)}</div>
    ${tailHtml(r)}
  </div></div>`;
}
function tailHtml(r) {
  const flags = r.flags.map(f => `<span class="ag-flag ${f.k}">${icon(f.k === 'risk' ? 'alert' : 'sparkle', 11)}${esc(f.t)}</span>`).join('');
  const cites = r.cites.length ? `<div class="ag-cite">${icon('book', 12)}<span>依據：</span>${r.cites.map(c => c.t === 'kb'
    ? `<button data-jump="${c.id}">店規第 ${c.n} 條「${esc(c.title)}」</button>`
    : `<button class="g" data-jump-g="${c.id}">護欄「${esc(c.title)}」</button>`).join('<em>・</em>')}</div>` : '';
  const hand = r.handoff ? `<div class="ag-hand ${r.handoff.urgent ? 'urgent' : ''}">${icon('bell', 13)}<b>已轉給${OWNER}</b><span>${esc(r.handoff.reason)}・${notifyVia()}</span></div>` : '';
  return `<div class="ag-tail">${flags ? `<div class="ag-flags">${flags}</div>` : ''}${cites}${hand}</div>`;
}
const sig = (r) => r ? JSON.stringify([r.mode, r.text, r.cites, r.flags, r.handoff, S.avatar]) : '';

function renderChat(flash = true) {
  if (busy) { pendingRefresh = true; return; }
  const changed = [];
  S.chat.forEach((e, i) => {
    const before = e.sig;
    e.res = answer(e.q);
    e.sig = sig(e.res);
    if (flash && before && before !== e.sig) changed.push(i);
  });
  msgsEl.innerHTML = S.chat.length ? S.chat.map(msgHtml).join('') : `<div class="ag-empty">${avatarSvg(S.avatar, 56)}<b>${esc(S.name)}準備好了</b><span>點下方的測試問題，或自己輸入看看</span></div>`;
  if (changed.length && gsap) {
    const nodes = changed.map(i => $(`.ag-msg[data-i="${i}"]`, msgsEl)).filter(Boolean);
    if (nodes[0]) msgsEl.scrollTo({ top: Math.max(0, nodes[0].offsetTop - 90), behavior: 'smooth' });
    nodes.forEach(n => { n.classList.add('ag-flash'); setTimeout(() => n.classList.remove('ag-flash'), 1600); });
  }
}
function refreshSoon() { clearTimeout(refreshT); refreshT = setTimeout(() => renderChat(true), 220); }

async function ask(q) {
  q = q.trim(); if (!q) return;
  if (busy) return;
  busy = true;
  const entry = { q, res: null, sig: '' };
  S.chat.push(entry);
  const i = S.chat.length - 1;
  $('.ag-empty', msgsEl)?.remove();
  const tmp = el(`<div>${msgHtml(entry, i)}</div>`);
  const nodes = [...tmp.children];
  nodes.forEach(n => msgsEl.appendChild(n));
  if (gsap) gsap.from(nodes[0], { y: 12, opacity: 0, duration: 0.3 });
  msgsEl.scrollTo({ top: msgsEl.scrollHeight, behavior: 'smooth' });
  await sleep(650);
  const r = answer(q);
  entry.res = r; entry.sig = sig(r);
  const fresh = el(`<div>${msgHtml(entry, i)}</div>`).children[1];
  nodes[1].replaceWith(fresh);
  const txt = $('[data-txt]', fresh);
  const tail = $('.ag-tail', fresh);
  if (txt) {
    if (tail) tail.style.opacity = '0';
    await typeText(txt, r.text, r.text.length > 90 ? 7 : 14);
    if (tail && gsap) gsap.fromTo(tail, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.35 });
    else if (tail) tail.style.opacity = '1';
  } else if (gsap) gsap.from(fresh, { opacity: 0, duration: 0.3 });
  msgsEl.scrollTo({ top: msgsEl.scrollHeight, behavior: 'smooth' });
  // 副作用：轉給老闆、記錄不會回答的問題
  if (r.handoff) {
    S.handoffs.unshift({ ago: '剛剛', who: '試聊客人', ch: 'line', reason: r.handoff.reason, text: r.handoff.detail || q, st: notifyVia(), fresh: true });
    renderHandoffs();
    toast(`已轉給${OWNER}：${r.handoff.reason}`, `透過 ${notifyVia()} 通知・${S.name}已先回覆客人`, { kind: 'warn', icon: icon('bell', 18) });
  }
  if (r.unknown) {
    const ex = S.unknown.find(u => u.q === q);
    if (ex) ex.n += 1;
    else S.unknown.unshift({ q, n: 1, title: q.replace(/[？?！!。]/g, '').slice(0, 12), kw: bigrams(q), loose: true, draft: '', fresh: true });
    renderUnknown();
    toast('記下一題她還不會的', '到「對話品質」一鍵補成店規', { kind: 'info', icon: icon('alert', 18) });
  }
  busy = false;
  if (pendingRefresh) { pendingRefresh = false; renderChat(true); }
}

// ---------- 儀表 ----------
function countStats(st) {
  countUp($('[data-hs="ai"]', root), st.ai);
  countUp($('[data-hs="sales"]', root), st.sales, { prefix: 'NT$' });
  countUp($('[data-hs="hours"]', root), st.hours);
  countUp($('[data-k="ai"]', root), st.ai);
  countUp($('[data-k="ratio"]', root), st.ratio, { decimals: 1, suffix: '%' });
  countUp($('[data-k="csat"]', root), st.csat, { decimals: 2, suffix: ' / 5' });
  countUp($('[data-k="rt"]', root), 6.4, { decimals: 1, suffix: ' 秒' });
  countUp($('[data-k="sales"]', root), st.sales, { prefix: 'NT$ ' });
  const node = $('[data-chart]', root);
  chart = makeChart(node);
  const W = ['日', '一', '二', '三', '四', '五', '六'];
  chart.setOption({
    grid: { left: 44, right: 40, top: 30, bottom: 26 },
    legend: { top: 0, right: 0, itemWidth: 10, itemHeight: 10, textStyle: { fontSize: 11 } },
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: st.days.map(d => `${d.getMonth() + 1}/${d.getDate()}（${W[d.getDay()]}）`), axisLabel: { fontSize: 10.5, interval: 0, formatter: (v) => v.split('（')[0] } },
    yAxis: [{ type: 'value', axisLabel: { fontSize: 10.5 } }, { type: 'value', min: 4, max: 5, splitLine: { show: false }, axisLabel: { fontSize: 10.5 } }],
    series: [
      { name: 'AI 自動', type: 'bar', stack: 'a', barWidth: '46%', data: st.series.map(d => d.ai), itemStyle: { color: '#2DB674', borderRadius: [0, 0, 0, 0] } },
      { name: `轉${OWNER}`, type: 'bar', stack: 'a', data: st.series.map(d => d.human), itemStyle: { color: '#EC6A55', borderRadius: [4, 4, 0, 0] } },
      { name: '滿意度', type: 'line', yAxisIndex: 1, smooth: true, symbolSize: 6, data: st.series.map(d => d.csat), lineStyle: { color: '#F0A531', width: 2 }, itemStyle: { color: '#F0A531' } },
    ],
  });
}
function renderTop() {
  const host = $('[data-top]', root); if (!host) return;
  const max = TOP_FAQ[0].n;
  host.innerHTML = TOP_FAQ.map((f, i) => {
    const idx = kbIdx(f.kb);
    const ref = idx >= 0 ? `<span class="ag-top-ref">${icon('book', 11)}第 ${idx + 1} 條</span>` : `<span class="ag-top-ref warn">${icon('alert', 11)}缺店規</span>`;
    return `<button class="ag-top-row" data-ask="${esc(f.q)}"><em>${i + 1}</em><span class="ag-top-q"><b>${esc(f.q)}</b><i style="--w:${(f.n / max * 100).toFixed(0)}%"></i></span><span class="ag-top-n">${f.n}</span>${ref}</button>`;
  }).join('');
}
function renderUnknown() {
  const host = $('[data-unk]', root); if (!host) return;
  $('[data-unk-n]', root).textContent = S.unknown.length ? `${S.unknown.length} 題待補` : '全部補齊';
  host.innerHTML = S.unknown.length ? S.unknown.map((u, i) => `<div class="ag-unk-row ${u.fresh ? 'fresh' : ''}">
      <div><b>${esc(u.q)}</b><small>本週被問 ${u.n} 次${u.fresh ? '・剛在試聊記下' : ''}</small></div>
      <button class="btn btn-ghost btn-sm" data-unk-add="${i}">${icon('plus', 13)}補成店規</button>
    </div>`).join('') : `<div class="ag-unk-done">${icon('check', 18)}太好了！目前客人問的她都會回答。</div>`;
  renderChecks();
}
function renderHandoffs() {
  const host = $('[data-hands]', root); if (!host) return;
  const C = { 過敏反應: '#EC6A55', 客訴退款: '#F0A531', 大額訂單: '#2E97D4' };
  host.innerHTML = S.handoffs.slice(0, 5).map(h => `<div class="ag-hrow ${h.fresh ? 'fresh' : ''}" style="--c:${C[h.reason] || '#7C62E6'}">
    ${chIcon(h.ch, 20)}<div><b>${esc(h.who)}<span class="ag-hrow-r">${esc(h.reason)}</span></b><small>${esc(h.text)}</small></div><span class="ag-hrow-t"><em>${esc(h.ago)}</em><small>${esc(h.st)}</small></span></div>`).join('');
}

// ---------- 彈窗 ----------
function openModal(html, bindFn) {
  closeModal();
  modal = el(`<div class="ag-modal" role="dialog" aria-modal="true"><div class="glass ag-modal-box">${html}</div></div>`);
  document.body.appendChild(modal);
  modal.addEventListener('click', (e) => { if (e.target === modal || e.target.closest('[data-close]')) closeModal(); });
  bindFn && bindFn(modal);
  if (gsap) { gsap.fromTo(modal, { opacity: 0 }, { opacity: 1, duration: 0.2 }); gsap.fromTo(modal.firstElementChild, { y: 24, scale: 0.97, opacity: 0 }, { y: 0, scale: 1, opacity: 1, duration: 0.4, ease: 'back.out(1.5)' }); }
  setTimeout(() => $('input, textarea', modal)?.focus(), 80);
}
function closeModal() { if (modal) { modal.remove(); modal = null; } }

function editCard(id) {
  const c = S.kb.find(x => x.id === id); if (!c) return;
  const paramFields = c.params ? Object.entries(c.params).map(([k, v]) => `<label class="ag-mf"><span>${PARAM[k]?.label || k}（${PARAM[k]?.unit || ''}）</span><input class="ag-in" type="number" data-mp="${k}" value="${v}"></label>`).join('') : '';
  const noteMode = !!(c.params || c.auto);
  openModal(`<div class="ag-modal-h"><h3>${icon(c.icon, 18)}編輯店規：第 ${kbIdx(c.key) + 1} 條</h3><button class="icon-btn" data-close>${icon('x', 16)}</button></div>
    <label class="ag-mf"><span>標題</span><input class="ag-in" data-mt value="${esc(c.title)}" maxlength="20"></label>
    ${paramFields ? `<div class="ag-mf-row">${paramFields}</div>` : ''}
    ${noteMode ? `<div class="ag-mf-prev"><small>目前內容</small><p>${esc(fill(c.body, c.params))}</p></div>` : ''}
    <label class="ag-mf"><span>${noteMode ? '補充說明（選填）' : '白話內容'}</span><textarea class="ag-in" rows="4" data-mb placeholder="${noteMode ? '例如：中秋檔期改為下午 1 點截單' : ''}">${esc(noteMode ? (c.note || '') : c.body)}</textarea></label>
    ${c.auto ? `<small class="ag-note">${icon('refresh', 12)} 過敏原與保存天數會跟著商品資料自動更新。</small>` : `<small class="ag-note">${icon('globe', 12)} 存檔後 AI 會自動更新英、日、越、馬來文版本（示範）。</small>`}
    <div class="ag-modal-f"><button class="btn btn-ghost" data-close>取消</button><button class="btn btn-primary" data-save>${icon('check', 15)}存檔</button></div>`, (m) => {
    $('[data-save]', m).addEventListener('click', () => {
      c.title = $('[data-mt]', m).value.trim() || c.title;
      $$('[data-mp]', m).forEach(inp => { const v = Math.max(0, Math.round(+inp.value || 0)); c.params[inp.dataset.mp] = v; });
      const b = $('[data-mb]', m).value.trim();
      if (noteMode) c.note = b; else if (b) { c.body = b; if (!c.custom) { c.en = null; c.ja = null; } }
      closeModal(); renderKb(); renderChat(true); flashCard(c.id);
      toast('店規已更新', `「${c.title}」已生效，${S.name}會用新內容回答`, { icon: icon('check', 18) });
    });
  });
}
function addCardModal(prefill = {}, onDone) {
  openModal(`<div class="ag-modal-h"><h3>${icon('plus', 18)}${prefill.fromUnknown ? '補成店規' : '新增店規'}</h3><button class="icon-btn" data-close>${icon('x', 16)}</button></div>
    ${prefill.q ? `<div class="ag-mf-prev"><small>客人問</small><p>「${esc(prefill.q)}」</p></div>` : ''}
    <label class="ag-mf"><span>標題（客人可能怎麼問）</span><input class="ag-in" data-mt maxlength="20" value="${esc(prefill.title || '')}" placeholder="例如：素食說明"></label>
    <label class="ag-mf"><span>白話內容${prefill.draft ? '　<em class="ag-ai-tag">' + icon('sparkle', 11) + 'AI 已依其他店規寫好草稿</em>' : ''}</span><textarea class="ag-in" rows="4" data-mb placeholder="像跟客人講話一樣寫就好，例如：可以喔！結帳時在備註寫下想說的話就好。">${esc(prefill.draft || '')}</textarea></label>
    <small class="ag-note">${icon('globe', 12)} 存檔後立即生效，並自動翻成英、日、越、馬來文（示範）。</small>
    <div class="ag-modal-f"><button class="btn btn-ghost" data-close>取消</button><button class="btn btn-primary" data-save>${icon('check', 15)}加入店規</button></div>`, (m) => {
    $('[data-save]', m).addEventListener('click', () => {
      const title = $('[data-mt]', m).value.trim(); const body = $('[data-mb]', m).value.trim();
      if (!title || !body) { toast('還差一點', '標題和內容都要填喔', { kind: 'warn', icon: icon('alert', 18) }); return; }
      const card = newCard({ title, body, kw: prefill.kw, loose: prefill.loose, en: prefill.en });
      closeModal();
      onDone && onDone(card);
      renderKb(); renderChat(true); pruneUnknown(); flashCard(card.id, true);
      toast('新店規已生效', `第 ${S.kb.length} 條「${title}」，${S.name}馬上就會用`, { icon: icon('book', 18) });
    });
  });
}
function newCard({ title, body, kw, loose, en }) {
  S.seq += 1;
  const id = `u${S.seq}`;
  const cols = ['#7C62E6', '#5EE0C4', '#DD5597', '#2E97D4', '#F0A531'];
  const card = { id, key: id, custom: true, fresh: true, icon: 'sparkle', color: cols[S.seq % cols.length], title, body, kw: kw || null, loose: !!loose, en: en || null };
  S.kb.push(card);
  return card;
}
// 新店規若已能回答「不會回答的問題」，自動從清單移除
function pruneUnknown() {
  const before = S.unknown.length;
  S.unknown = S.unknown.filter(u => !matchCustom(u.q));
  const n = before - S.unknown.length;
  if (n) { renderUnknown(); setTimeout(() => toast(`順便解決 ${n} 題待補問題`, '新店規已能回答客人之前問倒她的問題', { kind: 'info', icon: icon('check', 18) }), 500); }
}
function flashCard(id, scroll) {
  const n = $(`.ag-kbc[data-id="${id}"]`, root); if (!n) return;
  if (scroll) n.scrollIntoView({ behavior: 'smooth', block: 'center' });
  n.classList.add('ag-flash'); setTimeout(() => n.classList.remove('ag-flash'), 1800);
}

// ---------- 匯入示範 ----------
async function runImport() {
  const btn = $('[data-imp-run]', root); const steps = $('[data-imp-steps]', root); const out = $('[data-imp-out]', root); const add = $('[data-imp-add]', root);
  btn.disabled = true; out.innerHTML = ''; add.hidden = true;
  const src = $('.ag-imp-src', root); src.classList.add('scanning');
  const S1 = S.imp === 'url' ? ['連線到網址、讀取頁面（示範）', '找出「購物須知」段落'] : S.imp === 'file' ? ['讀取 PDF 2 頁', '辨識文字段落'] : ['讀取貼上的文字', '切成 5 個段落'];
  const list = [...S1, '改寫成客人會問的問題', '比對現有店規，避免重複'];
  steps.innerHTML = list.map(t => `<div class="ag-istep"><i></i><span>${t}</span></div>`).join('');
  for (const n of $$('.ag-istep', steps)) { n.classList.add('run'); await sleep(480); n.classList.remove('run'); n.classList.add('done'); }
  src.classList.remove('scanning');
  out.innerHTML = IMPORT_FAQ.map((f, i) => {
    const dup = S.kb.some(c => c.title === f.title);
    return `<label class="ag-faq ${dup ? 'dup' : ''}"><input type="checkbox" data-faq="${i}" ${dup ? 'disabled' : 'checked'}><span><b>${esc(f.title)}</b><small>${esc(f.body)}</small></span>${dup ? '<em>已存在</em>' : ''}</label>`;
  }).join('');
  if (gsap) gsap.from($$('.ag-faq', out), { x: 30, opacity: 0, stagger: 0.09, duration: 0.4, ease: 'power2.out' });
  add.hidden = !$$('[data-faq]:not(:disabled)', out).length;
  btn.disabled = false;
}

// ---------- 事件 ----------
function bind() {
  root.addEventListener('click', (e) => {
    const t = e.target.closest('button, [data-jump-sec]'); if (!t || !root.contains(t)) return;
    const d = t.dataset;
    if (d.av) { S.avatar = d.av; $$('[data-av]', root).forEach(b => b.classList.toggle('on', b === t)); updateIdentity(); renderChat(false); if (gsap) gsap.fromTo($('[data-av-big]', root), { scale: 0.7, rotate: -12 }, { scale: 1, rotate: 0, duration: 0.5, ease: 'back.out(2)' }); return; }
    if (d.tone) { S.tone = d.tone; $$('[data-tone]', root).forEach(b => b.classList.toggle('on', b === t)); renderChecks(); renderChat(true); return; }
    if (d.lang) {
      const on = !S.langs[d.lang];
      if (!on && Object.values(S.langs).filter(Boolean).length <= 1) { toast('至少保留一種語言', '', { kind: 'warn', icon: icon('alert', 18) }); return; }
      S.langs[d.lang] = on; t.classList.toggle('on', on); renderChat(true); return;
    }
    if (d.hours) { S.hours = d.hours; $$('[data-hours]', root).forEach(b => b.classList.toggle('on', b === t)); updateIdentity(); renderChat(true); return; }
    if (d.sim) { S.sim = d.sim; $$('[data-sim]', root).forEach(b => b.classList.toggle('on', b === t)); updateIdentity(); renderChat(true); return; }
    if (d.qtab) { S.qtab = d.qtab; $$('[data-qtab]', root).forEach(b => b.classList.toggle('on', b === t)); renderQ(); if (gsap) gsap.from($$('.ag-tqb', root), { y: 6, opacity: 0, stagger: 0.03, duration: 0.25 }); return; }
    if (d.ask) { if (t.closest('.ag-top')) $('.ag-sbx', root).scrollIntoView({ behavior: 'smooth', block: 'start' }); ask(d.ask); return; }
    if (d.try) { if (innerWidth <= 860) $('.ag-sbx', root).scrollIntoView({ behavior: 'smooth', block: 'start' }); ask(d.try); return; }
    if ('reset' in d) { S.chat = []; renderChat(false); return; }
    if (d.jump) { flashCard(d.jump, true); return; }
    if (d.jumpG) { const n = $(`#ag-g-${d.jumpG}`, root); if (n) { n.scrollIntoView({ behavior: 'smooth', block: 'center' }); n.classList.add('ag-flash'); setTimeout(() => n.classList.remove('ag-flash'), 1800); } return; }
    if (d.jumpSec) { const n = d.jumpSec === 'ag-unk' ? $('.ag-unk-card', root) : $(`#${d.jumpSec}`, root); n && n.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
    if (d.edit) { editCard(d.edit); return; }
    if (d.del) {
      if (!t.classList.contains('confirm')) { t.classList.add('confirm'); t.innerHTML = '確定刪除？'; setTimeout(() => { if (t.isConnected) { t.classList.remove('confirm'); t.innerHTML = icon('x', 14); } }, 2600); return; }
      const c = S.kb.find(x => x.id === d.del);
      S.kb = S.kb.filter(x => x.id !== d.del); renderKb(); renderChat(true);
      toast(`已刪除「${c.title}」`, `之後相關問題${S.name}會轉給你，不會亂答`, { kind: 'warn', icon: icon('x', 18) });
      return;
    }
    if ('kbAdd' in d) { addCardModal(); return; }
    if ('impToggle' in d) { const p = $('[data-imp]', root); p.hidden = !p.hidden; t.classList.toggle('on', !p.hidden); if (!p.hidden && gsap) gsap.from(p, { height: 0, opacity: 0, duration: 0.35, clearProps: 'height' }); return; }
    if (d.impTab) { S.imp = d.impTab; $$('[data-imp-tab]', root).forEach(b => b.classList.toggle('on', b === t)); $$('[data-imp-pane]', root).forEach(p => { p.hidden = p.dataset.impPane !== S.imp; }); return; }
    if ('impRun' in d) { runImport(); return; }
    if ('impAdd' in d) {
      const picks = $$('[data-faq]:checked:not(:disabled)', root).map(i => IMPORT_FAQ[+i.dataset.faq]);
      if (!picks.length) return;
      const cards = picks.map(f => newCard({ title: f.title, body: f.body, kw: f.kw }));
      renderKb(); renderChat(true); pruneUnknown();
      $$('[data-faq]', root).forEach(i => { if (i.checked) { i.disabled = true; i.closest('.ag-faq').classList.add('dup'); } });
      t.hidden = true;
      cards.forEach(c => flashCard(c.id));
      toast(`已加入 ${cards.length} 條店規`, `現在共 ${S.kb.length} 條，試著問「可以代寫卡片嗎？」`, { icon: icon('wand', 18) });
      return;
    }
    if (d.cap) { S.guard.cap = +d.cap; renderGuards(); renderChat(true); return; }
    if (d.nt) { S.guard[d.nt] = !S.guard[d.nt]; renderGuards(); renderChat(true); return; }
    if (d.unkAdd != null) {
      const i = +d.unkAdd; const u = S.unknown[i];
      addCardModal({ fromUnknown: true, q: u.q, title: u.title, draft: u.draft, kw: u.kw, loose: u.loose, en: u.en }, () => { S.unknown.splice(S.unknown.indexOf(u), 1); renderUnknown(); });
      return;
    }
  });
  root.addEventListener('change', (e) => {
    const t = e.target;
    if (t.matches('[data-gsw]')) {
      const id = t.dataset.gsw; S.guard[id] = t.checked; renderGuards(); renderChat(true);
      const gd = GUARDS.find(x => x.id === id);
      if (!t.checked) toast(`已關閉護欄：${gd.title}`, '右邊試聊會用紅字標出 AI 可能越線的地方', { kind: 'warn', icon: icon('alert', 18) });
      else toast(`護欄已開啟：${gd.title}`, '', { icon: icon('shield', 18) });
    }
    if (t.matches('[data-live]')) {
      S.live = t.checked; updateIdentity(); renderChat(true);
      toast(S.live ? `${S.name}上班了` : `${S.name}下班休息`, S.live ? '新訊息會由她先回覆' : `所有訊息直接轉給${OWNER}`, { kind: S.live ? 'ok' : 'warn', icon: icon('bot', 18) });
    }
  });
  root.addEventListener('input', (e) => {
    const t = e.target;
    if (t.matches('[data-name]')) { S.name = t.value.trim() || '小美'; updateIdentity(); renderChecks(); refreshSoon(); }
    if (t.matches('.ag-num[data-card]')) {
      const c = S.kb.find(x => x.id === t.dataset.card); if (!c) return;
      const v = Math.max(0, Math.round(+t.value || 0)); c.params[t.dataset.p] = v;
      t.style.width = `${String(t.value).length + 3.2}ch`;
      refreshSoon();
    }
    if (t.matches('[data-amt]')) { S.guard.amt = Math.max(0, Math.round(+t.value || 0)); refreshSoon(); }
  });
  $('[data-form]', root).addEventListener('submit', (e) => { e.preventDefault(); const inp = $('[data-q]', root); const q = inp.value; inp.value = ''; ask(q); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && modal) closeModal(); });
}

function updateIdentity() {
  $$('[data-name-out]', root).forEach(n => { n.textContent = S.name; });
  $('[data-av-big]', root).innerHTML = avatarSvg(S.avatar, 76);
  $('[data-av-sm]', root).innerHTML = avatarSvg(S.avatar, 34);
  const t = SIM_TIMES[S.sim];
  $('[data-clock]', root).textContent = `${t.h}:${String(t.m).padStart(2, '0')}`;
  const standby = S.hours === 'after' && S.sim === 'open';
  $('[data-ph-st]', root).textContent = !S.live ? `休息中・訊息直接給${OWNER}` : standby ? `營業時間由${OWNER}回覆・AI 待命` : '阿美手作甜點・AI 店員';
  $('[data-live-txt]', root).textContent = S.live ? '上班中' : '休息中';
  $('[data-live-lbl]', root).textContent = S.live ? '上班中' : '休息中';
  root.classList.toggle('ag-off', !S.live);
}
