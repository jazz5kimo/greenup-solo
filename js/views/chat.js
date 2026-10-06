// AI 聊天收單模擬器（多通路、多語言）
import { store } from '../state.js';
import { $, $$, el, gsap, esc, money, sleep, fmtTime } from '../util.js';
import { icon, chIcon } from '../icons.js';
import { PRODUCT_MAP, PRODUCTS, LANG_LABEL, SHIPPING_FEE, FREE_SHIP } from '../data.js';
import { pName, pDesc } from '../i18n.js';
import { TENANT } from '../tenant.js';
import { IS_AMEI, CAT, HAS_BEANS, TAKEOUT, DRINK_TAKEOUT, measure } from '../brief-data.js';

const PIPE = ['偵測語言', '理解需求', '查詢庫存與價格', '確認品項／數量／寄送', '傳送付款連結', '建立訂單＋電子發票', '收款自動入帳'];

const AMEI_SCENARIOS = [
  {
    id: 's-ja', channel: 'line', customer: '佐藤 ゆき', lang: 'ja', place: '日本・東京', color: '#2DB674',
    items: [{ pid: 'pineapple', qty: 3 }], region: '日本（國際寄送）', payment: '信用卡', ship: '國際寄送 NT$450',
    script: [
      { c: 'こんにちは！台湾旅行で食べたパイナップルケーキが忘れられなくて…。ギフトボックスを3箱、日本に送ってもらえますか？', zh: '你好！台灣旅行時吃到的鳳梨酥一直忘不了…可以寄 3 盒禮盒到日本嗎？', mark: [0, 1] },
      { ai: '佐藤様、こんにちは！パイナップルケーキ ギフトボックス（10個入り）は常温で14日間保存できるので、日本へ国際発送できます。3箱で NT$1,440、国際送料は NT$450 です。', zh: '佐藤小姐您好！鳳梨酥禮盒（10 入）常溫可保存 14 天，可以國際寄送到日本。3 盒 NT$1,440，國際運費 NT$450。', mark: [2], fields: ['items', 'qty'] },
      { c: 'お願いします！送り先は東京都です。', zh: '麻煩了！寄送地址是東京都。', fields: ['region'] },
      { ai: 'ご注文内容を確認します：パイナップルケーキ ギフトボックス ×3、東京都へ発送、合計 NT$1,890 です。こちらのリンクからお支払いください。', zh: '跟您確認訂單：鳳梨酥禮盒 ×3，寄送東京都，合計 NT$1,890。請由此連結付款。', mark: [3], fields: ['total'] },
      { pay: true, mark: [4] },
      { create: true, mark: [5] },
      { c: '支払いました！届くのを楽しみにしています。', zh: '付好了！很期待收到～', paid: true, mark: [6] },
      { ai: 'お支払いを確認しました。ご注文番号は {id} です。発送後に追跡番号をお送りします。ありがとうございました！', zh: '已確認收到款項，訂單編號 {id}。出貨後會傳送追蹤號碼給您，謝謝！' },
    ],
  },
  {
    id: 's-en', channel: 'whatsapp', customer: 'Aisyah R.', lang: 'en', place: '馬來西亞・吉隆坡', color: '#2E97D4',
    items: [{ pid: 'roll', qty: 2 }, { pid: 'basque', qty: 1 }], region: '台北市信義區（飯店）', payment: '信用卡', ship: '冷藏宅配・滿額免運',
    script: [
      { c: "Hi! I'm from KL and visiting Taipei this weekend. Can I order 2 strawberry cream rolls and 1 taro basque cake, delivered to my hotel in Xinyi on Saturday?", zh: '嗨！我從吉隆坡來，這週末到台北玩。可以訂 2 條草莓生乳捲和 1 個芋泥巴斯克，週六送到我在信義區的飯店嗎？', mark: [0, 1], fields: ['items', 'qty', 'region'] },
      { ai: 'Hi Aisyah, welcome to Taipei! Yes, we can deliver chilled to Xinyi on Saturday. 2 × Strawberry Cream Roll (NT$1,160) + 1 × Taro Basque 6" (NT$680) = NT$1,840, and shipping is free over NT$1,500.', zh: 'Aisyah 您好，歡迎來台北！可以，週六冷藏配送到信義區。草莓生乳捲 ×2（NT$1,160）＋芋泥巴斯克 6 吋 ×1（NT$680）＝NT$1,840，滿 NT$1,500 免運。', mark: [2], fields: ['total'] },
      { c: 'Perfect. Does the basque cake contain nuts? My friend is allergic.', zh: '太好了。巴斯克含堅果嗎？我朋友會過敏。' },
      { ai: 'Good question! The Taro Basque contains egg and milk, but no nuts. The cream roll has no nuts either. Shall I confirm the order?', zh: '好問題！芋泥巴斯克含蛋、奶，不含堅果；生乳捲也不含堅果。要幫您確認訂單嗎？' },
      { c: 'Yes please!', zh: '好的，麻煩了！', mark: [3] },
      { ai: 'Order summary: Strawberry Cream Roll ×2, Taro Basque ×1, delivery to Xinyi District on Saturday, total NT$1,840. Here is your payment link:', zh: '訂單摘要：草莓生乳捲 ×2、芋泥巴斯克 ×1，週六送達信義區，合計 NT$1,840。付款連結如下：' },
      { pay: true, mark: [4] },
      { create: true, mark: [5] },
      { c: 'Paid by card, thanks!', zh: '已用信用卡付款，謝謝！', paid: true, mark: [6] },
      { ai: 'Payment received! Order {id} is confirmed. Enjoy your trip in Taipei!', zh: '已收到款項！訂單 {id} 已確認，祝您台北玩得愉快！' },
    ],
  },
  {
    id: 's-vi', channel: 'zalo', customer: 'Nguyễn Thị Lan', lang: 'vi', place: '越南・現居桃園', color: '#7C62E6',
    items: [{ pid: 'cookie', qty: 2 }], region: '桃園市', payment: '銀行轉帳', ship: '常溫宅配 NT$150',
    script: [
      { c: 'Chào shop! Mình muốn đặt 2 hộp bánh quy thủ công để tặng sếp, giao đến Đào Viên được không?', zh: '哈囉！我想訂 2 盒手工餅乾禮盒送給老闆，可以寄到桃園嗎？', mark: [0, 1], fields: ['items', 'qty', 'region'] },
      { ai: 'Chào chị Lan! Được ạ. Hộp bánh quy thủ công (24 cái) giá NT$520/hộp, 2 hộp là NT$1,040, phí giao hàng đến Đào Viên NT$150. Bánh bảo quản ở nhiệt độ phòng được 30 ngày.', zh: 'Lan 姐您好！可以的。手工餅乾禮盒（24 片）每盒 NT$520，2 盒 NT$1,040，寄桃園運費 NT$150。餅乾常溫可保存 30 天。', mark: [2] },
      { c: 'Có thể thêm thiệp chúc mừng không?', zh: '可以加附賀卡嗎？' },
      { ai: 'Dạ được, shop tặng kèm thiệp miễn phí. Xác nhận: Bánh quy thủ công ×2, giao Đào Viên, tổng NT$1,190. Chị thanh toán qua link này nhé:', zh: '可以，免費附上賀卡。確認：手工餅乾禮盒 ×2，寄桃園，合計 NT$1,190。請透過此連結付款：', mark: [3], fields: ['total'] },
      { pay: true, mark: [4] },
      { create: true, mark: [5] },
      { c: 'Mình chuyển khoản rồi nhé. Cảm ơn shop!', zh: '我已經轉帳了，謝謝！', paid: true, mark: [6] },
      { ai: 'Cảm ơn chị! Đơn hàng {id} đã được xác nhận, shop sẽ gửi hàng trong hôm nay.', zh: '謝謝您！訂單 {id} 已確認，今天會出貨。' },
    ],
  },
  {
    id: 's-zh', channel: 'messenger', customer: '林小姐', lang: 'zh', place: '台灣・台中', color: '#DD5597',
    items: [{ pid: 'lemon', qty: 2 }, { pid: 'pound', qty: 1 }], region: '台中市', payment: '銀行轉帳', ship: '冷藏宅配 NT$150',
    script: [
      { c: '老闆娘～我想訂檸檬塔 2 盒、烏龍茶磅蛋糕 1 條，寄到台中，週六前會到嗎？', mark: [0, 1], fields: ['items', 'qty', 'region'] },
      { ai: '林小姐您好！可以的，今天下單明天冷藏出貨，週五就會到台中。檸檬塔 ×2（NT$840）＋烏龍茶磅蛋糕 ×1（NT$360），小計 NT$1,200，冷藏運費 NT$150，合計 NT$1,350。', mark: [2], fields: ['total'] },
      { c: '好～磅蛋糕可以不要太甜嗎？我爸在控糖' },
      { ai: '烏龍茶磅蛋糕是全店甜度最低的（★★☆☆☆），用凍頂烏龍茶入味，很多長輩都喜歡喔！確認訂單：檸檬塔 ×2、烏龍茶磅蛋糕 ×1，寄台中，合計 NT$1,350。付款連結如下：', mark: [3] },
      { pay: true, mark: [4] },
      { create: true, pending: true, mark: [5] },
      { c: '我等等用轉帳～' },
      { ai: '沒問題！訂單 {id} 已建立，收到款項後系統會自動通知您。' },
      { bank: true, paid: true, mark: [6] },
      { ai: '已收到您的轉帳 NT$1,350，謝謝林小姐！祝伯父吃得開心。' },
    ],
  },
];


// ---------- 其他業主：依業態大類產生 3 段示範對話（商品名稱、價格取自目前業主） ----------
// 宅配型（飲品、零售、手作、農產、點心）／花藝（配送時段＋卡片）／預約服務（改期＋衛生）／餐飲（外帶辣度＋取餐）
const M = (v) => `NT$${Math.round(v).toLocaleString('en-US')}`;
const qw = measure;
const shipFee = (sub, pickup, abroad) => pickup ? 0 : abroad ? 450 : sub >= FREE_SHIP ? 0 : SHIPPING_FEE;
const N = (p, l) => l === 'zh' ? p.name : pName(l, p.id);
function genericScenarios() {
  const ai = TENANT.aiName || 'AI';
  const byPrice = [...PRODUCTS].sort((a, b) => a.price - b.price);
  const P0 = PRODUCTS[0], P1 = PRODUCTS[1] || P0, P2 = PRODUCTS[2] || P0;
  const cheap = byPrice.find(p => p.id !== P0.id) || P0;
  const gift = [...PRODUCTS].sort((a, b) => b.price - a.price).find(p => p.price <= 1200) || byPrice[0];
  const top = byPrice[byPrice.length - 1];
  const other = (...ex) => PRODUCTS.find(p => !ex.includes(p.id)) || P0;
  const cheap1 = cheap.id !== P1.id ? cheap : other(P0.id, P1.id); // 與 P1 不重複的加購品
  const sum = (items) => items.reduce((s, it) => s + PRODUCT_MAP[it.pid].price * it.qty, 0);
  const tot = (items, pickup, abroad) => { const sub = sum(items); return sub + shipFee(sub, pickup, abroad); };
  const zhPay = (items, pickup, extra) => [
    { pay: true, mark: [4] },
    { create: true, pending: true, mark: [5] },
    { c: '我等等用轉帳～' },
    { ai: '沒問題！訂單 {id} 已建立，收到款項後系統會自動通知您。' },
    { bank: true, paid: true, mark: [6] },
    { ai: `已收到您的轉帳 ${M(tot(items, pickup))}，謝謝林小姐！${extra}` },
  ];
  const mode = CAT === 'flower' ? 'flower' : CAT === 'service' ? 'service' : TAKEOUT ? 'food' : 'ship';

  if (mode === 'service') {
    const a = [{ pid: P0.id, qty: 1 }];
    const b = [{ pid: P1.id, qty: 1 }, { pid: cheap1.id, qty: 1 }];
    const c = [{ pid: P0.id, qty: 1 }, { pid: cheap.id === P0.id ? P1.id : cheap.id, qty: 1 }];
    const cq = PRODUCT_MAP[c[1].pid];
    return [
      { id: 's-ja', channel: 'line', customer: '佐藤 ゆき', lang: 'ja', place: '日本・旅行中', color: '#2DB674', items: a, region: '到店服務（週六 15:00）', pickup: true, payment: '信用卡', ship: '到店・不需運費',
        script: [
          { c: `こんにちは！旅行中なのですが、今週の土曜日15時に「${N(P0, 'ja')}」を予約できますか？`, zh: `你好！我正在旅行，可以預約這週六 15:00 的「${P0.name}」嗎？`, mark: [0, 1], fields: ['items', 'qty'] },
          { ai: `佐藤様、こんにちは！${ai}です。土曜日15:00は空いています。「${N(P0, 'ja')}」は ${M(P0.price)} です。日本語のメニュー表もご用意しています。`, zh: `佐藤小姐您好！我是${ai}。週六 15:00 有空檔，「${P0.name}」${M(P0.price)}，也有日文價目表。`, mark: [2] },
          { c: 'よかった！当日はどのくらい時間がかかりますか？', zh: '太好了！當天大概要多久？', fields: ['region'] },
          { ai: `${pDesc('ja', P0.id) || 'メニューによって所要時間が異なります。'}（目安）。ご予約を確定するため、こちらのリンクから事前決済をお願いします。`, zh: `${P0.desc || '依項目而定'}（參考時間）。為了保留時段，請由此連結預付：`, mark: [3], fields: ['total'] },
          { pay: true, mark: [4] },
          { create: true, mark: [5] },
          { c: '支払いました！土曜日に伺います。', zh: '付好了！週六見～', paid: true, mark: [6] },
          { ai: 'お支払いを確認しました。ご予約番号は {id} です。前日にリマインドをお送りします。ありがとうございました！', zh: '已確認收到款項，預約編號 {id}，前一天會傳提醒給您，謝謝！' },
        ] },
      { id: 's-en', channel: 'whatsapp', customer: 'Hannah K.', lang: 'en', place: '新加坡・來台工作', color: '#2E97D4', items: b, region: '到店服務（週三 19:00）', pickup: true, payment: '信用卡', ship: '到店・不需運費',
        script: [
          { c: `Hi! Can I book ${N(P1, 'en')} plus ${N(cheap1, 'en')} next Wednesday at 7 pm?`, zh: `嗨！可以預約下週三晚上 7 點的${P1.name}加${cheap1.name}嗎？`, mark: [0, 1], fields: ['items', 'qty'] },
          { ai: `Hi Hannah, this is ${ai}! Wednesday 7 pm is available. ${N(P1, 'en')} (${M(P1.price)}) + ${N(cheap1, 'en')} (${M(cheap1.price)}) = ${M(sum(b))}.`, zh: `Hannah 您好，我是${ai}！週三 19:00 有空檔。${P1.name}（${M(P1.price)}）＋${cheap1.name}（${M(cheap1.price)}）＝${M(sum(b))}。`, mark: [2], fields: ['total', 'region'] },
          { c: 'Great. How do you keep your tools clean? My skin is a bit sensitive.', zh: '好的。請問工具怎麼消毒？我皮膚比較敏感。' },
          { ai: 'Good question! All tools are cleaned and sterilised after every guest, and single-use items are never reused. Let us know about your sensitive skin and we\'ll do a patch test first. Shall I confirm the booking?', zh: '好問題！每位客人結束後工具都會清潔消毒，一次性耗材絕不重複使用。我們會先做局部測試，要幫您確認預約嗎？' },
          { c: 'Yes please!', zh: '好的，麻煩了！', mark: [3] },
          { ai: `Booking summary: ${N(P1, 'en')} + ${N(cheap1, 'en')}, next Wednesday 7 pm, total ${M(sum(b))}. Here is your payment link:`, zh: `預約摘要：${P1.name}＋${cheap1.name}，下週三 19:00，合計 ${M(sum(b))}。付款連結如下：` },
          { pay: true, mark: [4] },
          { create: true, mark: [5] },
          { c: 'Paid, see you Wednesday!', zh: '付好了，週三見！', paid: true, mark: [6] },
          { ai: 'Payment received! Booking {id} is confirmed. We\'ll send a reminder the day before.', zh: '已收到款項！預約 {id} 已確認，前一天會傳提醒給您。' },
        ] },
      { id: 's-zh', channel: 'messenger', customer: '林小姐', lang: 'zh', place: '台灣・老客人', color: '#DD5597', items: c, region: '到店服務（改約下週五 14:00）', pickup: true, payment: '銀行轉帳', ship: '到店・不需運費',
        script: [
          { c: `你好～我原本約這週六下午兩點的${P0.name}，臨時要加班，可以改期嗎？`, mark: [0, 1], fields: ['items', 'qty'] },
          { ai: `林小姐您好！已查到您的預約。下週五 14:00、下週六 11:00 都還有空檔，請問哪個時段方便？原本的時段會在改約後釋出。`, mark: [2] },
          { c: `下週五兩點好了，順便加一個${cq.name}。`, fields: ['region'] },
          { ai: `好的，改約下週五 14:00，${P0.name}＋${cq.name}，合計 ${M(sum(c))}。改期不收手續費，預約前一天會再提醒您。付款連結如下：`, mark: [3], fields: ['total'] },
          ...zhPay(c, true, '下週五見～'),
        ] },
    ];
  }

  if (mode === 'food') {
    const qa = qw(P0);
    // 外帶情境用語：餐飲＝辣度／湯汁分裝；手搖飲＝甜度冰塊／提袋
    const X = DRINK_TAKEOUT ? {
      viAsk: 'Chị muốn độ ngọt và đá thế nào ạ?', zhAsk: '請問甜度冰塊要怎麼調？',
      viC: 'Một ly ít đường ít đá, một ly không đá. Cho mình túi xách nhé.', zhC: '一杯半糖少冰、一杯去冰，幫我裝提袋。',
      viOk: 'một ly ít đường ít đá, một ly không đá, có túi xách', zhOk: '一杯半糖少冰、一杯去冰，附提袋',
      enC: 'Great. Two colleagues want less sugar and one can\'t have dairy.', enZ: '好。有兩位同事要少糖，一位不能喝奶。',
      enA: 'Noted! We\'ll make two at 30% sugar and switch one to a dairy-free option where possible, and label every cup. Our prep area also handles milk, so we can\'t guarantee zero cross-contact. Shall I confirm?',
      enAz: '收到！兩杯做三分糖，一杯盡量改無奶選項，每杯都貼標籤。製作區有使用奶類，無法保證完全零接觸。要幫您確認嗎？',
      zh3: '都要微糖少冰，可以分開裝嗎？', zh4: '沒問題，都微糖少冰、分開裝。', meal: 'drinks',
    } : {
      viAsk: 'Chị muốn cay thế nào ạ?', zhAsk: '請問辣度要怎麼調？',
      viC: 'Một phần cay vừa, một phần không cay. Nước dùng để riêng giúp mình nhé.', zhC: '一份中辣、一份不辣，湯汁幫我分開裝。',
      viOk: 'một cay vừa một không cay, nước để riêng', zhOk: '一份中辣一份不辣，湯汁分裝',
      enC: 'Great. Two colleagues can\'t eat spicy food and one is allergic to peanuts.', enZ: '好。有兩位同事不能吃辣，一位對花生過敏。',
      enA: 'Noted! We\'ll pack the two non-spicy meals separately and label every box with spice level and allergens. Our kitchen does use peanuts, so for the allergy we\'ll keep that meal sauce-free and sealed, but we can\'t guarantee zero cross-contact. Shall I confirm?',
      enAz: '收到！兩份不辣會分開包裝，每盒都貼辣度與過敏原標籤。廚房有使用花生，過敏同事那份會不加醬料並單獨封裝，但無法保證完全零接觸。要幫您確認嗎？',
      zh3: '都不要辣，可以多給一點醬料嗎？', zh4: '沒問題，都不辣、醬料另外多附一份。', meal: 'lunch',
    };
    const a = [{ pid: P0.id, qty: 2 }, { pid: cheap.id, qty: 1 }];
    const b = [{ pid: P0.id, qty: 3 }, { pid: P1.id, qty: 3 }, { pid: P2.id, qty: 4 }];
    const c = [{ pid: P1.id, qty: 2 }, { pid: cheap1.id, qty: 2 }];
    const bt = tot(b, false);
    return [
      { id: 's-vi', channel: 'zalo', customer: 'Nguyễn Thị Lan', lang: 'vi', place: '越南・現居桃園', color: '#7C62E6', items: a, region: '到店自取（18:30）', pickup: true, payment: '銀行轉帳', ship: '到店自取・不需運費',
        script: [
          { c: `Chào quán! Mình muốn đặt mang về 2 phần ${N(P0, 'vi')} và 1 phần ${N(cheap, 'vi')}, 6 giờ rưỡi tối mình qua lấy nhé.`, zh: `哈囉！我想外帶 2 份${P0.name}和 1 份${cheap.name}，晚上六點半去拿。`, mark: [0, 1], fields: ['items', 'qty', 'region'] },
          { ai: `Chào chị Lan, mình là ${ai}! ${N(P0, 'vi')} ${M(P0.price)}/phần, ${N(cheap, 'vi')} ${M(cheap.price)}, tổng ${M(sum(a))}. ${X.viAsk}`, zh: `Lan 姐您好，我是${ai}！${P0.name}每${qa} ${M(P0.price)}，${cheap.name} ${M(cheap.price)}，合計 ${M(sum(a))}。${X.zhAsk}`, mark: [2], fields: ['total'] },
          { c: X.viC, zh: X.zhC },
          { ai: `Dạ được ạ! Xác nhận: lấy lúc 18:30, ${X.viOk}. Chị thanh toán qua link này nhé:`, zh: `好的！確認：18:30 取餐，${X.zhOk}。請透過此連結付款：`, mark: [3] },
          { pay: true, mark: [4] },
          { create: true, mark: [5] },
          { c: 'Mình chuyển khoản rồi nhé. Cảm ơn quán!', zh: '我已經轉帳了，謝謝！', paid: true, mark: [6] },
          { ai: 'Cảm ơn chị! Đơn {id} đã xác nhận, 18:20 sẽ chuẩn bị xong ạ.', zh: '謝謝您！訂單 {id} 已確認，18:20 會備好。' },
        ] },
      { id: 's-en', channel: 'whatsapp', customer: 'Daniel Tan', lang: 'en', place: '馬來西亞・在台工作', color: '#2E97D4', items: b, region: '附近辦公室（外送）', payment: '信用卡', ship: bt - sum(b) ? `外送 ${M(bt - sum(b))}` : '外送・滿額免運',
        script: [
          { c: `Hi! Can you deliver ${X.meal} for our team at 12:00? 3 × ${N(P0, 'en')}, 3 × ${N(P1, 'en')} and 4 × ${N(P2, 'en')}.`, zh: `嗨！可以 12 點外送我們團隊的${DRINK_TAKEOUT ? '飲料' : '午餐'}嗎？${P0.name} ×3、${P1.name} ×3、${P2.name} ×4。`, mark: [0, 1], fields: ['items', 'qty', 'region'] },
          { ai: `Hi Daniel, this is ${ai}! That comes to ${M(sum(b))}${bt - sum(b) ? ` plus ${M(bt - sum(b))} delivery` : ' with free delivery'}. We can arrive by 11:50.`, zh: `Daniel 您好，我是${ai}！合計 ${M(sum(b))}${bt - sum(b) ? `，外送費 ${M(bt - sum(b))}` : '，已達免運'}，可以 11:50 前送到。`, mark: [2], fields: ['total'] },
          { c: X.enC, zh: X.enZ },
          { ai: X.enA, zh: X.enAz },
          { c: 'Yes please!', zh: '好的，麻煩了！', mark: [3] },
          { pay: true, mark: [4] },
          { create: true, mark: [5] },
          { c: 'Paid by card, thanks!', zh: '已用信用卡付款，謝謝！', paid: true, mark: [6] },
          { ai: 'Payment received! Order {id} is confirmed, see you at 11:50.', zh: '已收到款項！訂單 {id} 已確認，11:50 見。' },
        ] },
      { id: 's-zh', channel: 'messenger', customer: '林小姐', lang: 'zh', place: '台灣・附近上班族', color: '#DD5597', items: c, region: '到店自取（12:15）', pickup: true, payment: '銀行轉帳', ship: '到店自取・不需運費',
        script: [
          { c: `老闆～中午想外帶 2 ${qw(P1)}${P1.name}、2 份${cheap1.name}，12 點 15 分去拿可以嗎？`, mark: [0, 1], fields: ['items', 'qty', 'region'] },
          { ai: `林小姐您好！可以的，${P1.name} ×2（${M(P1.price * 2)}）＋${cheap1.name} ×2（${M(cheap1.price * 2)}），合計 ${M(sum(c))}，12:15 到店自取。${X.zhAsk}`, mark: [2], fields: ['total'] },
          { c: X.zh3 },
          { ai: `${X.zh4}確認訂單：${P1.name} ×2、${cheap1.name} ×2，12:15 自取，合計 ${M(sum(c))}。付款連結如下：`, mark: [3] },
          ...zhPay(c, true, '12:15 見～'),
        ] },
    ];
  }

  if (mode === 'flower') {
    const a = [{ pid: P0.id, qty: 1 }];
    const b = [{ pid: P1.id, qty: 1 }];
    const c = [{ pid: top.id, qty: 1 }];
    const at = tot(a, false), bt2 = tot(b, false);
    return [
      { id: 's-ja', channel: 'line', customer: '田中 さくら', lang: 'ja', place: '日本・現居台北', color: '#2DB674', items: a, region: '台北市大安區（明天 14:00–17:00）', payment: '信用卡', ship: at - sum(a) ? `配送 ${M(at - sum(a))}` : '配送・滿額免運',
        script: [
          { c: `こんにちは。明日、同僚の誕生日に「${N(P0, 'ja')}」を大安区の会社まで届けてもらえますか？`, zh: `你好。明天同事生日，可以把「${P0.name}」送到大安區的公司嗎？`, mark: [0, 1], fields: ['items', 'qty', 'region'] },
          { ai: `田中様、こんにちは！${ai}です。「${N(P0, 'ja')}」は ${M(P0.price)}、明日の配達が可能です。時間帯は午前（10–12時）か午後（14–17時）からお選びください。メッセージカードは無料です。`, zh: `田中小姐您好，我是${ai}！「${P0.name}」${M(P0.price)}，明天可以送。時段可選上午（10–12 點）或下午（14–17 點），卡片免費。`, mark: [2] },
          { c: '午後でお願いします。カードは日本語で「お誕生日おめでとう！」と書いてください。', zh: '麻煩下午送。卡片請用日文寫「生日快樂！」。' },
          { ai: `承知しました。確認します：${N(P0, 'ja')}、明日14–17時に大安区へお届け、日本語カード付き、合計 ${M(at)} です。こちらのリンクからお支払いください。`, zh: `了解。跟您確認：${P0.name}，明天 14–17 點送到大安區，附日文卡片，合計 ${M(at)}。請由此連結付款。`, mark: [3], fields: ['total'] },
          { pay: true, mark: [4] },
          { create: true, mark: [5] },
          { c: '支払いました！よろしくお願いします。', zh: '付好了！麻煩了～', paid: true, mark: [6] },
          { ai: 'お支払いを確認しました。ご注文番号は {id} です。お届け後に写真でご報告します！', zh: '已確認收到款項，訂單 {id}。送達後會拍照回報給您！' },
        ] },
      { id: 's-en', channel: 'whatsapp', customer: 'Daniel Tan', lang: 'en', place: '新加坡・出差中', color: '#2E97D4', items: b, region: '台北市中山區（週五 18:00 前）', payment: '信用卡', ship: bt2 - sum(b) ? `配送 ${M(bt2 - sum(b))}` : '配送・滿額免運',
        script: [
          { c: `Hi! It's our anniversary on Friday. Can you deliver ${N(P1, 'en')} to my wife's office in Zhongshan before 6 pm?`, zh: `嗨！週五是我們的週年紀念日，可以在下午 6 點前把${P1.name}送到我太太在中山區的公司嗎？`, mark: [0, 1], fields: ['items', 'qty', 'region'] },
          { ai: `Hi Daniel, this is ${ai}! Yes, ${N(P1, 'en')} is ${M(P1.price)}${bt2 - sum(b) ? ` plus ${M(bt2 - sum(b))} delivery` : ''}, total ${M(bt2)}. We'll deliver on Friday afternoon with a free card.`, zh: `Daniel 您好，我是${ai}！${P1.name} ${M(P1.price)}${bt2 - sum(b) ? `，配送費 ${M(bt2 - sum(b))}` : ''}，合計 ${M(bt2)}。週五下午送達，附免費卡片。`, mark: [2], fields: ['total'] },
          { c: 'Lovely. How long will the flowers last? Any care tips?', zh: '太好了。花可以放多久？有照顧小技巧嗎？' },
          { ai: 'Trim the stems at an angle and change the water every 2 days; keep them away from direct sun and air-con vents. Most stems last about 5–7 days. Shall I confirm the order?', zh: '斜剪花莖、每兩天換水，避開陽光直射與冷氣出風口，大多能維持 5–7 天。要幫您確認訂單嗎？' },
          { c: 'Yes please! Card: "Happy anniversary, love you."', zh: '好的！卡片寫：「週年快樂，愛妳。」', mark: [3] },
          { pay: true, mark: [4] },
          { create: true, mark: [5] },
          { c: 'Paid, thanks!', zh: '付好了，謝謝！', paid: true, mark: [6] },
          { ai: 'Payment received! Order {id} is confirmed. We\'ll send you a photo once it\'s delivered.', zh: '已收到款項！訂單 {id} 已確認，送達後會拍照給您。' },
        ] },
      { id: 's-zh', channel: 'messenger', customer: '林小姐', lang: 'zh', place: '台灣・新北', color: '#DD5597', items: c, region: '新北市板橋區（週六 10:00 前）', payment: '銀行轉帳', ship: tot(c, false) - sum(c) ? `配送 ${M(tot(c, false) - sum(c))}` : '配送・滿額免運',
        script: [
          { c: `你好～朋友週六開店，想訂${top.name}，早上 10 點前送到板橋可以嗎？`, mark: [0, 1], fields: ['items', 'qty', 'region'] },
          { ai: `林小姐您好！可以的，${top.name} ${M(top.price)}，週六 08:00–10:00 送達板橋，合計 ${M(tot(c, false))}。卡片或緞帶要寫什麼字呢？`, mark: [2], fields: ['total'] },
          { c: '寫「開幕誌慶　生意興隆」，署名「林小姐敬賀」。' },
          { ai: `收到！確認訂單：${top.name}，週六 10:00 前送達板橋，緞帶「開幕誌慶　生意興隆」，合計 ${M(tot(c, false))}。付款連結如下：`, mark: [3] },
          ...zhPay(c, false, '祝朋友開幕大吉！'),
        ] },
    ];
  }

  // 宅配型
  const beans = CAT === 'drink' && HAS_BEANS, craft = CAT === 'craft';
  const ja = [{ pid: gift.id, qty: 2 }];
  const en = [{ pid: P0.id, qty: 1 }, { pid: P1.id, qty: 1 }];
  const zh = [{ pid: P0.id, qty: 2 }, { pid: cheap.id === P0.id ? P1.id : cheap.id, qty: 1 }];
  const zq = PRODUCT_MAP[zh[1].pid];
  const jt = tot(ja, false, true), et = tot(en, false), zt = tot(zh, false);
  const tw = beans
    ? { ja1: 'ご注文後に焙煎し、焙煎日を袋に記載します。豆のままと挽いたもの、どちらがよろしいですか？', jz1: '下單後才烘豆，烘焙日期會標在袋上。請問要原豆還是磨好的粉？', ja2: '豆のままでお願いします。送り先は東京都です。', jz2: '原豆就好，寄到東京都。',
      en1: 'Great. Is it freshly roasted? I only have a hand grinder at the hotel.', ez1: '太好了。是新鮮烘的嗎？我飯店只有手搖磨豆機。', en2: 'Yes! We roast twice a week and print the roast date on every bag. We can also grind it for you; medium-fine works well for pour-over. Shall I confirm the order?', ez2: '是的！每週烘兩次，袋上都有烘焙日期。也可以幫您磨好，手沖建議中細研磨。要幫您確認訂單嗎？',
      zh1: '豆子是哪天烘的？我用摩卡壺，可以幫我磨嗎？', zh2: `這批是本週二烘的，養豆 3–5 天風味最好；摩卡壺建議細研磨，會幫您磨好再寄出。`, zhEnd: '烘焙日期會標在袋上，祝您喝得開心！' }
    : craft
      ? { ja1: '無料で名入れ（刻印）もできますが、いかがですか？', jz1: '可以免費刻字，需要嗎？', ja2: 'イニシャル「Y.S.」を入れてください。送り先は東京都です。', jz2: '請刻縮寫「Y.S.」，寄到東京都。',
        en1: 'Great. Is it handmade? Is there a warranty?', ez1: '太好了。是手工做的嗎？有保固嗎？', en2: 'Yes, every piece is handmade in our studio, with a 1-year warranty on stitching and hardware. Shall I confirm the order?', ez2: '是的，每件都在工作室手工製作，車線與五金保固一年。要幫您確認訂單嗎？',
        zh1: '可以刻字嗎？要送男友當生日禮物。', zh2: '可以喔，刻字免費，製作會多 2 個工作天，週六前還來得及；也會附禮盒包裝。', zhEnd: '刻字完成會先拍照給您確認！' }
      : { ja1: 'ギフト包装も無料で承ります。', jz1: '可以免費禮物包裝。', ja2: 'ギフト包装でお願いします！送り先は東京都です。', jz2: '麻煩禮物包裝！寄送地址是東京都。',
        en1: 'Perfect. Can you add a gift note?', ez1: '太好了。可以附一張禮物卡片嗎？', en2: 'Of course, a handwritten note is free. Shall I confirm the order?', ez2: '當然可以，手寫卡片免費。要幫您確認訂單嗎？',
        zh1: '要送長輩，可以幫忙包裝嗎？', zh2: '可以的，免費禮物包裝並附手寫卡片，長輩收到一定很開心！', zhEnd: '祝長輩收到開心！' };
  return [
    { id: 's-ja', channel: 'line', customer: '佐藤 ゆき', lang: 'ja', place: '日本・東京', color: '#2DB674', items: ja, region: '日本（國際寄送）', payment: '信用卡', ship: '國際寄送 NT$450',
      script: [
        { c: `こんにちは！台湾旅行で見つけた「${N(gift, 'ja')}」がとても気に入りました。2つ日本に送ってもらえますか？`, zh: `你好！台灣旅行時發現的「${gift.name}」很喜歡，可以寄 2 個到日本嗎？`, mark: [0, 1] },
        { ai: `佐藤様、こんにちは！${ai}です。「${N(gift, 'ja')}」は2つで ${M(gift.price * 2)}、日本への国際送料は NT$450 です。${tw.ja1}`, zh: `佐藤小姐您好，我是${ai}！「${gift.name}」2 個 ${M(gift.price * 2)}，國際運費 NT$450。${tw.jz1}`, mark: [2], fields: ['items', 'qty'] },
        { c: tw.ja2, zh: tw.jz2, fields: ['region'] },
        { ai: `ご注文内容を確認します：${N(gift, 'ja')} ×2、東京都へ発送、合計 ${M(jt)} です。こちらのリンクからお支払いください。`, zh: `跟您確認訂單：${gift.name} ×2，寄送東京都，合計 ${M(jt)}。請由此連結付款。`, mark: [3], fields: ['total'] },
        { pay: true, mark: [4] },
        { create: true, mark: [5] },
        { c: '支払いました！届くのを楽しみにしています。', zh: '付好了！很期待收到～', paid: true, mark: [6] },
        { ai: 'お支払いを確認しました。ご注文番号は {id} です。発送後に追跡番号をお送りします。ありがとうございました！', zh: '已確認收到款項，訂單編號 {id}。出貨後會傳送追蹤號碼給您，謝謝！' },
      ] },
    { id: 's-en', channel: 'whatsapp', customer: 'Aisyah R.', lang: 'en', place: '馬來西亞・吉隆坡', color: '#2E97D4', items: en, region: '台北市信義區（飯店）', payment: '信用卡', ship: et - sum(en) ? `宅配 ${M(et - sum(en))}` : '宅配・滿額免運',
      script: [
        { c: `Hi! I'm from KL and visiting Taipei this weekend. Can I order 1 ${N(P0, 'en')} and 1 ${N(P1, 'en')}, delivered to my hotel in Xinyi on Saturday?`, zh: `嗨！我從吉隆坡來，這週末到台北玩。可以訂 1 個${P0.name}和 1 個${P1.name}，週六送到我在信義區的飯店嗎？`, mark: [0, 1], fields: ['items', 'qty', 'region'] },
        { ai: `Hi Aisyah, this is ${ai}, welcome to Taipei! ${N(P0, 'en')} (${M(P0.price)}) + ${N(P1, 'en')} (${M(P1.price)}) = ${M(sum(en))}${et - sum(en) ? `, plus ${M(et - sum(en))} delivery` : ', and shipping is free over NT$1,500'}.`, zh: `Aisyah 您好，我是${ai}，歡迎來台北！${P0.name}（${M(P0.price)}）＋${P1.name}（${M(P1.price)}）＝${M(sum(en))}${et - sum(en) ? `，運費 ${M(et - sum(en))}` : '，滿 NT$1,500 免運'}。`, mark: [2], fields: ['total'] },
        { c: tw.en1, zh: tw.ez1 },
        { ai: tw.en2, zh: tw.ez2 },
        { c: 'Yes please!', zh: '好的，麻煩了！', mark: [3] },
        { ai: `Order summary: ${N(P0, 'en')} ×1, ${N(P1, 'en')} ×1, delivery to Xinyi District on Saturday, total ${M(et)}. Here is your payment link:`, zh: `訂單摘要：${P0.name} ×1、${P1.name} ×1，週六送達信義區，合計 ${M(et)}。付款連結如下：` },
        { pay: true, mark: [4] },
        { create: true, mark: [5] },
        { c: 'Paid by card, thanks!', zh: '已用信用卡付款，謝謝！', paid: true, mark: [6] },
        { ai: 'Payment received! Order {id} is confirmed. Enjoy your trip in Taipei!', zh: '已收到款項！訂單 {id} 已確認，祝您台北玩得愉快！' },
      ] },
    { id: 's-zh', channel: 'messenger', customer: '林小姐', lang: 'zh', place: '台灣・台中', color: '#DD5597', items: zh, region: '台中市', payment: '銀行轉帳', ship: zt - sum(zh) ? `宅配 ${M(zt - sum(zh))}` : '宅配・滿額免運',
      script: [
        { c: `老闆～我想訂${P0.name} 2 ${qw(P0)}、${zq.name} 1 ${qw(zq)}，寄到台中，週六前會到嗎？`, mark: [0, 1], fields: ['items', 'qty', 'region'] },
        { ai: `林小姐您好！可以的，今天下單明天出貨，週五就會到台中。${P0.name} ×2（${M(P0.price * 2)}）＋${zq.name} ×1（${M(zq.price)}），${zt - sum(zh) ? `小計 ${M(sum(zh))}，運費 ${M(zt - sum(zh))}，` : '已達免運，'}合計 ${M(zt)}。`, mark: [2], fields: ['total'] },
        { c: tw.zh1 },
        { ai: `${tw.zh2}確認訂單：${P0.name} ×2、${zq.name} ×1，寄台中，合計 ${M(zt)}。付款連結如下：`, mark: [3] },
        ...zhPay(zh, false, tw.zhEnd),
      ] },
  ];
}
// 阿美示範劇本的金額依目前售價（含節日特價）即時換算，和付款卡一致
if (IS_AMEI) {
  const P = (id) => PRODUCT_MAP[id].price, F = (v) => `NT$${Math.round(v).toLocaleString('en-US')}`;
  const AMT = {
    '1,440': P('pineapple') * 3, '1,890': P('pineapple') * 3 + 450,
    '1,160': P('roll') * 2, '680': P('basque'), '1,840': P('roll') * 2 + P('basque'),
    '520': P('cookie'), '1,040': P('cookie') * 2, '1,190': P('cookie') * 2 + 150,
    '840': P('lemon') * 2, '360': P('pound'), '1,200': P('lemon') * 2 + P('pound'), '1,350': P('lemon') * 2 + P('pound') + 150,
  };
  const re = new RegExp('NT\\$(' + Object.keys(AMT).join('|') + ')(?!\\d|,\\d)', 'g');
  const fix = (t) => typeof t === 'string' ? t.replace(re, (_, k) => F(AMT[k])) : t;
  for (const sc of AMEI_SCENARIOS) for (const m of sc.script || []) { for (const k of ['ai', 'zh', 'c', 'text']) if (m[k]) m[k] = fix(m[k]); }
}
const SCENARIOS = IS_AMEI ? AMEI_SCENARIOS : genericScenarios();
const SIM_HINT = '依序播放：' + SCENARIOS.map(s => s.place.split('・')[0] === '台灣' ? '台灣客人' : (s.place.split('・')[0] + '客人')).join(' → ');

let root, threads = [], active = null, playing = false;

export default {
  mount(section) {
    root = section;
    threads = SCENARIOS.map(s => ({ ...s, msgs: [], played: false, order: null, steps: new Set(), fieldsShown: new Set() }));
    section.innerHTML = `
    <div class="chat-wrap">
      <div class="glass inbox anim-in">
        <div class="inbox-h"><h3>多通路收件匣</h3><span class="chip-sm">${icon('globe', 13)} 自動翻譯</span></div>
        <div class="inbox-tabs"><span class="on">全部</span><span>${chIcon('line', 16)}</span><span>${chIcon('whatsapp', 16)}</span><span>${chIcon('zalo', 16)}</span><span>${chIcon('messenger', 16)}</span><span>${chIcon('web', 16)}</span></div>
        <ul class="threads" id="threads"></ul>
        <button class="btn btn-primary sim-btn" id="simBtn">${icon('play', 16)} 模擬客人訊息</button>
        <small class="sim-hint" id="simHint">${IS_AMEI ? '依序播放：日本 → 馬來西亞 → 越南 → 台灣客人' : SIM_HINT}</small>
      </div>
      <div class="glass convo anim-in">
        <div class="convo-h" id="convoH"></div>
        <div class="msgs" id="msgs"></div>
        <div class="composer"><span class="auto-pill"><i></i>AI 自動駕駛中</span><input disabled placeholder="AI 正在代你回覆客人，必要時可隨時接手…"><button class="icon-btn" disabled>${icon('send', 18)}</button></div>
      </div>
      <div class="glass extract anim-in">
        <div class="card-h"><h3>${icon('wand', 18)} AI 擷取的訂單資訊</h3></div>
        <div class="ex-fields" id="exFields"></div>
        <div class="card-h" style="margin-top:14px"><h3>${icon('sparkle', 16)} 自動化流程</h3></div>
        <ol class="pipe" id="pipe">${PIPE.map((p, i) => `<li data-i="${i}"><span class="pipe-dot">${icon('check', 12)}</span>${p}</li>`).join('')}</ol>
      </div>
    </div>`;
    renderThreads();
    select(threads[0]);
    $('#simBtn', section).addEventListener('click', playNext);
    store.on('order', ({ order, remote }) => {
      if (order.channel === 'web' && order.conv) {
        const t = { id: 'web-' + order.id, channel: 'web', customer: order.customer, lang: order.lang, place: '官網 AI 導購', color: '#5EE0C4', items: order.items, region: order.region || '宅配', payment: order.payment,
          ship: order.shipping ? `運費 NT$${order.shipping}` : '免運', msgs: [], played: true, order, steps: new Set([0, 1, 2, 3, 4, 5, 6]), fieldsShown: new Set(['items', 'qty', 'region', 'total']), script: [] };
        for (const m of order.conv) t.msgs.push(m.from === 'c' ? { c: m.text, zh: m.zh } : { ai: m.text, zh: m.zh });
        t.msgs.push({ sys: `訂單 ${order.id} 已建立・電子發票 ${order.invoice}・已付款` });
        threads.unshift(t); renderThreads();
        const li = $(`.thread[data-id="${t.id}"]`, root); if (li) gsap.fromTo(li, { x: -30, opacity: 0, backgroundColor: 'rgba(94,224,196,.3)' }, { x: 0, opacity: 1, backgroundColor: 'rgba(94,224,196,0)', duration: 1 });
      }
    });
    store.on('reset', () => { threads = SCENARIOS.map(s => ({ ...s, msgs: [], played: false, order: null, steps: new Set(), fieldsShown: new Set() })); renderThreads(); select(threads[0]); updateSimBtn(); });
  },
  show() {},
};

function lastText(t) {
  const m = [...t.msgs].reverse().find(x => x.c || x.ai || x.sys);
  if (!m) return t.played ? '' : '尚無新訊息';
  return m.c || m.ai || m.sys;
}
function renderThreads() {
  const ul = $('#threads', root); ul.innerHTML = '';
  for (const t of threads) {
    const li = el(`<li class="thread ${active === t ? 'on' : ''} ${t.order ? 'done' : ''}" data-id="${t.id}">
      <div class="th-av" style="--c:${t.color}">${esc(t.customer.slice(0, 1))}${chIcon(t.channel, 18)}</div>
      <div class="th-body"><div class="th-top"><b>${esc(t.customer)}</b><span class="lang-tag">${LANG_LABEL[t.lang] || t.lang}</span></div>
      <p>${esc(lastText(t).replace('{id}', t.order?.id || ''))}</p><small>${esc(t.place)}</small></div>
      ${t.order ? `<span class="th-ok">${icon('check', 12)}</span>` : (!t.played ? '<span class="th-new"></span>' : '')}
    </li>`);
    li.addEventListener('click', () => { if (!playing) select(t); });
    ul.appendChild(li);
  }
}

function select(t) {
  active = t;
  $$('.thread', root).forEach(li => li.classList.toggle('on', li.dataset.id === t.id));
  $('#convoH', root).innerHTML = `<div class="th-av big" style="--c:${t.color}">${esc(t.customer.slice(0, 1))}${chIcon(t.channel, 20)}</div>
    <div><b>${esc(t.customer)}</b><small>${esc(t.place)}・經由 ${channelName(t.channel)}</small></div>
    <span class="lang-detect">${icon('globe', 14)} 偵測語言：${LANG_LABEL[t.lang]}${t.lang !== 'zh' ? ' → 自動翻譯中文' : ''}</span>`;
  const box = $('#msgs', root); box.innerHTML = '';
  if (!t.msgs.length) box.appendChild(el(`<div class="empty-convo">${icon('chat', 40)}<p>點左下「模擬客人訊息」，看 AI 用客人的語言自動接單</p></div>`));
  for (const m of t.msgs) box.appendChild(bubble(m, t));
  box.scrollTop = box.scrollHeight;
  renderExtract(t);
}
const channelName = (c) => ({ line: 'LINE', whatsapp: 'WhatsApp', zalo: 'Zalo', messenger: 'Messenger', web: '官網 AI 導購' }[c] || c);

function bubble(m, t) {
  const fill = (s) => esc(s || '').replace('{id}', t.order?.id || '');
  if (m.sys) return el(`<div class="sys-msg">${icon('check', 14)} ${fill(m.sys)}</div>`);
  if (m.pay) return el(`<div class="msg ai"><div class="paycard"><div class="pc-h">${icon('link', 16)} 安全付款連結</div><b>${money(m.total)}</b><small>pay.solo.greenup.ai/${esc(t.id)}（示範）</small><span class="pc-methods">信用卡・LINE Pay・Apple Pay・轉帳</span></div></div>`);
  if (m.typing) return el(`<div class="msg ${m.typing}"><div class="bub typing"><i></i><i></i><i></i></div></div>`);
  const who = m.c ? 'c' : 'ai';
  const text = m.c || m.ai;
  const showZh = t.lang !== 'zh' && m.zh;
  return el(`<div class="msg ${who}">
    ${who === 'c' ? `<div class="m-av" style="--c:${t.color}">${esc(t.customer.slice(0, 1))}</div>` : ''}
    <div class="bub"><p>${fill(text)}</p>${showZh ? `<div class="tr"><span>中文翻譯</span>${fill(m.zh)}</div>` : ''}</div>
    ${who === 'ai' ? `<div class="m-av ai">${icon('bot', 16)}</div>` : ''}
  </div>`);
}

function renderExtract(t) {
  const items = t.items.map(it => `${esc(PRODUCT_MAP[it.pid]?.name || it.pid)} × ${it.qty}`).join('<br>');
  const total = t.order ? t.order.total : null;
  const rows = [
    ['customer', '客人', `${esc(t.customer)}（${LANG_LABEL[t.lang]}）`, true],
    ['items', '品項', items],
    ['qty', '數量', `${t.items.reduce((s, i) => s + i.qty, 0)} 件`],
    ['region', '寄送', `${esc(t.region)}<small>${esc(t.ship)}</small>`],
    ['total', '金額', total ? money(total) : esc(estTotal(t))],
    ['status', '付款', t.order ? (t.order.status === 'paid' ? '<span class="st paid">已付款・已入帳</span>' : '<span class="st pending">待付款・應收帳款</span>') : '<span class="st idle">尚未建立</span>'],
    ['invoice', '發票', t.order ? `<span class="mono">${t.order.invoice}</span>` : '—'],
  ];
  $('#exFields', root).innerHTML = rows.map(([k, l, v, always]) => `<div class="exf ${always || t.fieldsShown.has(k) || (t.order && ['status', 'invoice'].includes(k)) ? 'on' : ''}" data-k="${k}"><span>${l}</span><div>${v}</div></div>`).join('');
  $$('#pipe li', root).forEach(li => li.classList.toggle('done', t.steps.has(+li.dataset.i)));
}
function estTotal(t) { return money(estTotalNum(t)); }

function updateSimBtn() {
  const next = threads.find(t => !t.played && t.script.length);
  const b = $('#simBtn', root);
  b.disabled = playing;
  b.innerHTML = playing ? `${icon('sparkle', 16)} AI 處理中…` : next ? `${icon('play', 16)} 模擬客人訊息` : `${icon('refresh', 16)} 重新播放`;
}

async function playNext() {
  if (playing) return;
  let t = threads.find(x => !x.played && x.script.length);
  if (!t) { // 全部播完：重設對話（訂單保留）
    threads = threads.filter(x => x.script.length).map(x => ({ ...SCENARIOS.find(s => s.id === x.id), msgs: [], played: false, order: null, steps: new Set(), fieldsShown: new Set() })).concat(threads.filter(x => !x.script.length));
    renderThreads(); t = threads.find(x => !x.played && x.script.length);
  }
  playing = true; t.played = true; updateSimBtn();
  select(t);
  const box = $('#msgs', root); box.innerHTML = '';
  for (const step of t.script) {
    if (active !== t) select(t);
    if (step.c || step.ai) {
      const typ = bubble({ typing: step.c ? 'c' : 'ai' }, t); box.appendChild(typ);
      gsap.fromTo(typ, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.25 });
      box.scrollTop = box.scrollHeight;
      await sleep(step.c ? 900 : 1200);
      typ.remove();
      const m = step.c ? { c: step.c, zh: step.zh } : { ai: step.ai, zh: step.zh };
      t.msgs.push(m);
      appendMsg(bubble(m, t), step.c ? 'c' : 'ai');
    }
    if (step.pay) { const m = { pay: true, total: estTotalNum(t) }; t.msgs.push(m); appendMsg(bubble(m, t), 'ai'); }
    if (step.create) {
      await sleep(500);
      t.order = store.createOrder({ channel: t.channel, customer: t.customer, lang: t.lang, items: t.items, payment: t.payment, status: 'pending', region: t.region, pickup: !!t.pickup,
        conv: t.msgs.filter(m => m.c || m.ai).map(m => ({ from: m.c ? 'c' : 'ai', text: m.c || m.ai, zh: m.zh })) });
      const m = { sys: `訂單 ${t.order.id} 已建立・電子發票 ${t.order.invoice}・同步至 POS／會計／庫存` }; t.msgs.push(m); appendMsg(bubble(m, t), 'sys');
    }
    if (step.bank) {
      await sleep(1600);
      const m = { sys: `銀行入帳通知：收到 ${money(t.order.total)}（虛擬帳號比對成功）` }; t.msgs.push(m); appendMsg(bubble(m, t), 'sys');
    }
    if (step.paid && t.order) { await sleep(400); store.markPaid(t.order.id); }
    for (const f of step.fields || []) t.fieldsShown.add(f);
    for (const s of step.mark || []) t.steps.add(s);
    renderExtract(t);
    for (const f of step.fields || []) { const n = $(`.exf[data-k="${f}"]`, root); n && gsap.fromTo(n, { backgroundColor: 'rgba(45,182,116,.35)' }, { backgroundColor: 'rgba(45,182,116,0)', duration: 1.2 }); }
    for (const s of step.mark || []) { const n = $(`#pipe li[data-i="${s}"]`, root); n && gsap.fromTo(n.querySelector('.pipe-dot'), { scale: 0.2 }, { scale: 1, duration: 0.5, ease: 'back.out(3)' }); }
    renderThreads();
    await sleep(500);
  }
  playing = false; updateSimBtn(); renderThreads();
}
function estTotalNum(t) { const sub = t.items.reduce((s, it) => s + (PRODUCT_MAP[it.pid]?.price || it.price || 0) * it.qty, 0); return sub + (t.pickup ? 0 : t.region.includes('日本') ? 450 : sub >= FREE_SHIP ? 0 : SHIPPING_FEE); }

function appendMsg(node, who) {
  const box = $('#msgs', root);
  box.appendChild(node);
  gsap.fromTo(node, { opacity: 0, y: 16, x: who === 'c' ? -16 : who === 'ai' ? 16 : 0, scale: 0.96 }, { opacity: 1, y: 0, x: 0, scale: 1, duration: 0.45, ease: 'back.out(1.6)' });
  box.scrollTo({ top: box.scrollHeight, behavior: 'smooth' });
}
