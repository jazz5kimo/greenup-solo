import { TENANT } from './tenant.js';
// 多語言字典：繁體中文／English／日本語／Tiếng Việt／Bahasa Melayu
export const LANGS = [
  { id: 'zh', label: '繁體中文', short: '中', speech: 'zh-TW' },
  { id: 'en', label: 'English', short: 'EN', speech: 'en-US' },
  { id: 'ja', label: '日本語', short: '日', speech: 'ja-JP' },
  { id: 'vi', label: 'Tiếng Việt', short: 'VI', speech: 'vi-VN' },
  { id: 'ms', label: 'Bahasa Melayu', short: 'MS', speech: 'ms-MY' },
];

export const PRODUCT_I18N = {
  lemon: {
    zh: ['檸檬塔', '4 入', '屏東檸檬現擠製成的酸甜內餡，搭配奶油酥脆塔皮，清爽不膩。'],
    en: ['Lemon Tart', '4 pcs', 'Tangy filling of freshly squeezed Pingtung lemons in a crisp butter crust. Bright and refreshing.'],
    ja: ['レモンタルト', '4個入り', '屏東産レモンを搾った甘酸っぱいフィリングと、サクサクのバタータルト生地。'],
    vi: ['Bánh tart chanh', '4 cái', 'Nhân chua ngọt từ chanh Bình Đông vắt tươi, đế bánh bơ giòn tan, thanh mát.'],
    ms: ['Tart Lemon', '4 biji', 'Inti masam manis daripada lemon Pingtung segar dalam kulit tart mentega yang rangup.'],
  },
  roll: {
    zh: ['草莓生乳捲', '1 條', '大湖草莓與北海道鮮奶油，蛋糕體綿密輕盈，季節限定。'],
    en: ['Strawberry Cream Roll', '1 roll', 'Dahu strawberries and Hokkaido fresh cream rolled in a light, fluffy sponge. Seasonal.'],
    ja: ['いちご生クリームロール', '1本', '大湖産いちごと北海道生クリームを、ふわふわのスポンジで巻きました。季節限定。'],
    vi: ['Bánh cuộn kem dâu', '1 cuộn', 'Dâu tây Đại Hồ và kem tươi Hokkaido cuộn trong lớp bánh mềm nhẹ. Theo mùa.'],
    ms: ['Gulung Krim Strawberi', '1 gulung', 'Strawberi Dahu dan krim segar Hokkaido dalam span yang lembut. Edisi bermusim.'],
  },
  basque: {
    zh: ['芋泥巴斯克', '6 吋', '大甲芋頭手工炒製芋泥，焦香外層包著濕潤乳酪，招牌人氣款。'],
    en: ['Taro Basque Cheesecake', '6 inch', 'Hand-stirred Dajia taro with a caramelised top and a creamy cheesecake centre. Our signature.'],
    ja: ['タロイモバスクチーズケーキ', '6号', '大甲産タロイモの自家製ペーストと、香ばしい焼き色のしっとりチーズケーキ。看板商品。'],
    vi: ['Bánh Basque khoai môn', '6 inch', 'Khoai môn Đại Giáp sên tay, mặt bánh cháy thơm, nhân phô mai béo ẩm. Món đặc trưng.'],
    ms: ['Kek Keju Basque Keladi', '6 inci', 'Keladi Dajia buatan tangan, permukaan karamel dan inti kek keju yang lembap. Menu istimewa.'],
  },
  pound: {
    zh: ['烏龍茶磅蛋糕', '1 條', '凍頂烏龍茶入味，甜度全店最低，茶香回甘，長輩最愛。'],
    en: ['Oolong Tea Pound Cake', '1 loaf', 'Infused with Dongding oolong. Our least sweet cake, with a lingering tea finish. Loved by elders.'],
    ja: ['烏龍茶パウンドケーキ', '1本', '凍頂烏龍茶を練り込んだ、当店でいちばん甘さ控えめのケーキ。年配の方にも人気。'],
    vi: ['Bánh bông lan trà Ô Long', '1 ổ', 'Ướp trà Ô Long Đống Đỉnh, ít ngọt nhất tiệm, hậu vị trà thanh. Người lớn tuổi rất thích.'],
    ms: ['Kek Pound Teh Oolong', '1 buku', 'Diresapi teh oolong Dongding. Kek paling kurang manis kami. Kegemaran warga emas.'],
  },
  cookie: {
    zh: ['手工餅乾禮盒', '24 片', '6 種口味手工餅乾，常溫保存 30 天，送長輩、送客戶都體面。'],
    en: ['Handmade Cookie Gift Box', '24 pcs', 'Six flavours of handmade cookies. Keeps 30 days at room temperature. A perfect gift.'],
    ja: ['手作りクッキーギフト', '24枚入り', '6種類の手作りクッキー。常温で30日保存でき、贈り物にぴったり。'],
    vi: ['Hộp quà bánh quy thủ công', '24 cái', '6 vị bánh quy thủ công, bảo quản 30 ngày ở nhiệt độ phòng. Rất hợp làm quà biếu.'],
    ms: ['Kotak Hadiah Biskut', '24 keping', 'Enam perisa biskut buatan tangan. Tahan 30 hari pada suhu bilik. Sesuai sebagai hadiah.'],
  },
  pineapple: {
    zh: ['鳳梨酥禮盒', '10 入', '台灣土鳳梨內餡，酸香不死甜，常溫 14 天，可寄海外。'],
    en: ['Pineapple Cake Gift Box', '10 pcs', 'Native Taiwanese pineapple filling, tangy not cloying. Keeps 14 days and ships overseas.'],
    ja: ['パイナップルケーキ ギフト', '10個入り', '台湾在来種パイナップルの餡で甘すぎない味。常温14日、海外発送できます。'],
    vi: ['Hộp quà bánh dứa', '10 cái', 'Nhân dứa bản địa Đài Loan, chua thơm không quá ngọt. Để được 14 ngày, gửi được ra nước ngoài.'],
    ms: ['Kotak Hadiah Kek Nanas', '10 biji', 'Inti nanas asli Taiwan, masam manis seimbang. Tahan 14 hari; boleh dihantar ke luar negara.'],
  },
  canele: {
    zh: ['伯爵可麗露', '6 入', '伯爵茶香的法式可麗露，外層焦脆、內裡 Q 軟，下午茶首選。'],
    en: ['Earl Grey Canelé', '6 pcs', 'French canelés with Earl Grey aroma. Crisp caramel shell, soft custardy inside.'],
    ja: ['アールグレイ カヌレ', '6個入り', 'アールグレイ香るカヌレ。外はカリッと、中はもっちり。'],
    vi: ['Bánh canelé Earl Grey', '6 cái', 'Bánh canelé Pháp hương trà Earl Grey, vỏ giòn caramel, ruột mềm dẻo.'],
    ms: ['Canelé Earl Grey', '6 biji', 'Canelé Perancis beraroma Earl Grey. Kulit karamel rangup, dalam lembut.'],
  },
};

// 商品別名（用於聊天辨識）
export const PRODUCT_ALIASES = {
  lemon: ['檸檬塔', '檸檬', 'lemon', 'レモン', 'chanh', 'limau'],
  roll: ['草莓', '生乳捲', '乳捲', 'strawberry', 'cream roll', 'いちご', '苺', 'ロール', 'dâu', 'bánh cuộn', 'strawberi'],
  basque: ['芋泥', '巴斯克', '芋頭', 'taro', 'basque', 'タロイモ', 'バスク', 'khoai môn', 'keladi'],
  pound: ['烏龍', '磅蛋糕', 'oolong', 'pound', 'ウーロン', '烏龍茶', 'パウンド', 'ô long', 'bông lan'],
  cookie: ['餅乾', 'cookie', 'cookies', 'クッキー', 'bánh quy', 'biskut'],
  pineapple: ['鳳梨', 'pineapple', 'パイナップル', 'dứa', 'nanas'],
  canele: ['可麗露', 'canele', 'canelé', 'カヌレ'],
};

const S = {
  zh: {
    announce: '全館滿 NT$1,500 免運・支援 5 種語言 AI 客服・每日少量手作',
    navProducts: '商品', navAbout: '關於阿美', navShip: '運送說明', admin: '店主後台', cart: '購物車',
    heroKicker: '台中手作・每日少量烘焙', heroTitle: '把幸福，<br>裝進每一盒甜點。',
    heroSub: '阿美一個人做甜點、一個人顧店。看不懂菜單？想送禮不知道選什麼？右下角的 AI 導購會用你的語言幫你挑。',
    shopNow: '立即選購', askBot: '問 AI 導購',
    f1: '每日現做', f1d: '當天烘焙、當天出貨', f2: '冷藏宅配', f2d: '滿 NT$1,500 免運', f3: '多語言 AI 客服', f3d: '中・英・日・越・馬來文',
    prodTitle: '本週甜點', prodSub: '全部由阿美親手製作，少量供應',
    add: '加入購物車', added: '已加入', sweet: '甜度', allergens: '過敏原', storage: '保存', qty: '數量', soldLow: '僅剩 {n} 件',
    tag_bestseller: '熱銷', tag_signature: '招牌', tag_lesssweet: '少糖', tag_gift: '送禮', tag_souvenir: '伴手禮', tag_tea: '茶香', tag_fruit: '鮮果', tag_elder: '長輩最愛',
    al_egg: '蛋', al_milk: '奶', al_gluten: '麩質', al_nuts: '堅果',
    st_fridge: '冷藏 {d} 天', st_room: '常溫 {d} 天',
    botStrip: '不知道選什麼？直接告訴 AI 你的需求', botStripSub: '例如：「送長輩的禮盒」「不要太甜」「預算 500 元」',
    cartTitle: '購物車', cartEmpty: '購物車是空的，去挑幾樣甜點吧！', subtotal: '小計', shipping: '運費', free: '免運', total: '合計', checkout: '前往結帳', continue: '繼續逛逛',
    ckTitle: '結帳', ckName: '收件人', ckNamePh: '請輸入姓名（示範可留空）', ckDelivery: '配送方式', ckHome: '冷藏宅配', ckPickup: '台中門市自取', ckRegion: '配送地區',
    ckPay: '付款方式', ckCard: '信用卡', ckPayBtn: '確認付款（模擬）', ckProcessing: '付款處理中…', ckNote: '此為示範，不會收取任何費用，也不需要輸入卡號。',
    okTitle: '訂單完成，謝謝你！', okOrder: '訂單編號', okInvoice: '電子發票', okSync: '訂單已即時同步到店主後台（POS、會計、庫存）。', okAdmin: '到店主後台查看', close: '關閉',
    regions: ['台北市', '新北市', '桃園市', '台中市', '台南市', '高雄市', '其他縣市', '日本（國際寄送）'],
    footer: '阿美手作甜點・本頁為「GreenUP」原型示範，所有商品、價格與交易皆為模擬。',
    // 聊天機器人
    botName: 'AI 導購小美', botStatus: '線上・平均 2 秒回覆', botPh: '輸入訊息，或按麥克風說話…',
    botGreet: '嗨！我是阿美的 AI 導購小美。想送禮、想吃不太甜的、或有預算限制，都可以直接跟我說喔！',
    chips: ['送長輩的禮盒', '不要太甜', '預算 500 元', '運費怎麼算？', '有含堅果嗎？', '結帳'],
    rGift: '送長輩的話，這幾款最受歡迎：餅乾禮盒常溫可放 30 天、鳳梨酥是經典伴手禮，烏龍茶磅蛋糕甜度低、長輩很愛。',
    rLess: '想吃不太甜的，推薦這兩款：烏龍茶磅蛋糕（甜度 ★★）和手工餅乾禮盒（甜度 ★★）。',
    rBudget: '預算 NT${n} 以內，可以考慮這些：', rBudgetNone: '預算 NT${n} 有點少，最平價的是烏龍茶磅蛋糕 NT$360，要看看嗎？',
    rBudgetCombo: '或是組合：{a} ＋ {b}，共 NT${t}。',
    rShip: '台灣本島冷藏宅配 NT$150，滿 NT$1,500 免運，1–2 天到貨。常溫禮盒（餅乾、鳳梨酥）可寄日本與東南亞，國際運費 NT$450 起。',
    rAllergen: '各商品的過敏原：{list}。如果對堅果過敏，除了餅乾禮盒，其他都不含堅果喔。',
    rAllergenOne: '{p} 含有：{a}。{nuts}', rNoNuts: '不含堅果。', rHasNuts: '含堅果，請留意。',
    rStorage: '保存方式：生乳捲、檸檬塔、巴斯克請冷藏，2–4 天內享用最美味；餅乾、鳳梨酥、磅蛋糕可常溫保存。',
    rStorageOne: '{p}：{s}。',
    rRecommend: '這幾款是本週人氣王：',
    rAdded: '已幫你把 {p} × {q} 加入購物車！目前合計 NT${t}。',
    rCartEmpty: '購物車目前是空的，要不要我推薦幾款？',
    rCheckout: '好的，幫你整理訂單：', rConfirm: '確認付款（模擬）', rEdit: '再逛逛',
    rPaid: '付款成功！訂單 {id} 已建立，電子發票 {inv} 會寄到你的信箱。阿美已經收到通知囉，謝謝你！',
    rThanks: '不客氣！有任何問題隨時問我喔～', rFallback: '我可以幫你推薦甜點、回答運送、過敏原、保存方式，也可以直接幫你下單。試試看下面的按鈕？',
    rSwitched: '偵測到你使用中文，已切換成中文介面。', micNo: '這個瀏覽器不支援語音輸入，請改用打字喔。', listening: '正在聆聽…',
    voiceOn: '語音回覆：開', voiceOff: '語音回覆：關', viewCart: '查看購物車', guest: '官網訪客',
  },
  en: {
    announce: 'Free shipping over NT$1,500 · AI concierge in 5 languages · Baked fresh in small batches',
    navProducts: 'Shop', navAbout: 'About Amei', navShip: 'Shipping', admin: 'Owner console', cart: 'Cart',
    heroKicker: 'Handmade in Taichung · Small-batch baking', heroTitle: 'Happiness,<br>boxed with care.',
    heroSub: 'Amei bakes and runs the shop all by herself. Not sure what to pick or need a gift idea? Our AI concierge (bottom right) helps you in your own language.',
    shopNow: 'Shop now', askBot: 'Ask the AI concierge',
    f1: 'Baked daily', f1d: 'Baked and shipped the same day', f2: 'Chilled delivery', f2d: 'Free over NT$1,500', f3: 'Multilingual AI help', f3d: '中 · EN · 日 · VI · MS',
    prodTitle: "This week's desserts", prodSub: 'All handmade by Amei, in limited quantities',
    add: 'Add to cart', added: 'Added', sweet: 'Sweetness', allergens: 'Allergens', storage: 'Storage', qty: 'Qty', soldLow: 'Only {n} left',
    tag_bestseller: 'Best seller', tag_signature: 'Signature', tag_lesssweet: 'Less sweet', tag_gift: 'Gift', tag_souvenir: 'Souvenir', tag_tea: 'Tea', tag_fruit: 'Fresh fruit', tag_elder: 'Elders love it',
    al_egg: 'egg', al_milk: 'milk', al_gluten: 'gluten', al_nuts: 'nuts',
    st_fridge: 'Chilled, {d} days', st_room: 'Room temp, {d} days',
    botStrip: 'Not sure what to choose? Just tell the AI', botStripSub: 'e.g. "a gift for my parents", "not too sweet", "budget 500"',
    cartTitle: 'Your cart', cartEmpty: 'Your cart is empty. Go pick some treats!', subtotal: 'Subtotal', shipping: 'Shipping', free: 'Free', total: 'Total', checkout: 'Checkout', continue: 'Keep browsing',
    ckTitle: 'Checkout', ckName: 'Recipient', ckNamePh: 'Your name (optional in demo)', ckDelivery: 'Delivery', ckHome: 'Chilled home delivery', ckPickup: 'Pick up in Taichung', ckRegion: 'Region',
    ckPay: 'Payment', ckCard: 'Credit card', ckPayBtn: 'Confirm payment (demo)', ckProcessing: 'Processing payment…', ckNote: 'This is a demo. Nothing is charged and no card number is needed.',
    okTitle: 'Order placed. Thank you!', okOrder: 'Order no.', okInvoice: 'e-Invoice', okSync: 'Your order has synced live to the owner console (POS, accounting, inventory).', okAdmin: 'View in owner console', close: 'Close',
    regions: ['Taipei', 'New Taipei', 'Taoyuan', 'Taichung', 'Tainan', 'Kaohsiung', 'Other (Taiwan)', 'Japan (international)'],
    footer: "Amei's Handmade Desserts · A prototype demo of GreenUP. All products, prices and transactions are simulated.",
    botName: 'Mei · AI concierge', botStatus: 'Online · replies in ~2s', botPh: 'Type a message or tap the mic…',
    botGreet: "Hi! I'm Mei, Amei's AI shopping assistant. Looking for a gift, something not too sweet, or have a budget? Just tell me!",
    chips: ['Gift for my parents', 'Not too sweet', 'Budget NT$500', 'How much is shipping?', 'Any nuts?', 'Checkout'],
    rGift: 'For elders, these are our most popular: the Cookie Gift Box keeps 30 days, Pineapple Cakes are the classic Taiwanese gift, and the Oolong Pound Cake is low in sugar.',
    rLess: 'For something not too sweet, try the Oolong Tea Pound Cake (★★) or the Handmade Cookie Gift Box (★★).',
    rBudget: 'Within NT${n}, you could choose:', rBudgetNone: 'NT${n} is a bit tight. Our most affordable item is the Oolong Pound Cake at NT$360. Want to see it?',
    rBudgetCombo: 'Or a combo: {a} + {b} = NT${t}.',
    rShip: 'Chilled delivery in Taiwan is NT$150, free over NT$1,500, arriving in 1–2 days. Room-temperature gift boxes (cookies, pineapple cakes) ship to Japan and Southeast Asia from NT$450.',
    rAllergen: 'Allergens by product: {list}. If you are allergic to nuts, everything except the Cookie Gift Box is nut-free.',
    rAllergenOne: '{p} contains: {a}. {nuts}', rNoNuts: 'No nuts.', rHasNuts: 'Contains nuts, please take care.',
    rStorage: 'Keep the cream roll, lemon tart and basque chilled and enjoy within 2–4 days. Cookies, pineapple cakes and the pound cake keep at room temperature.',
    rStorageOne: '{p}: {s}.',
    rRecommend: "This week's favourites:",
    rAdded: 'Added {p} × {q} to your cart! Total so far: NT${t}.',
    rCartEmpty: 'Your cart is empty. Shall I recommend something?',
    rCheckout: "Sure, here's your order:", rConfirm: 'Confirm payment (demo)', rEdit: 'Keep browsing',
    rPaid: 'Payment successful! Order {id} is confirmed and e-invoice {inv} will be emailed to you. Amei has been notified. Thank you!',
    rThanks: "You're welcome! Ask me anything anytime.", rFallback: 'I can recommend desserts, answer questions about shipping, allergens and storage, or place the order for you. Try the buttons below!',
    rSwitched: 'Looks like you are writing in English, so I switched the site to English.', micNo: "This browser doesn't support voice input. Please type instead.", listening: 'Listening…',
    voiceOn: 'Voice replies: on', voiceOff: 'Voice replies: off', viewCart: 'View cart', guest: 'Web guest',
  },
  ja: {
    announce: 'NT$1,500以上で送料無料・5言語のAIスタッフ対応・毎日少量手作り',
    navProducts: '商品', navAbout: 'アメイについて', navShip: '配送について', admin: 'オーナー管理画面', cart: 'カート',
    heroKicker: '台中の手作り・毎日少量焼き上げ', heroTitle: 'しあわせを、<br>ひと箱に詰めて。',
    heroSub: 'アメイがひとりで焼いて、ひとりでお店を切り盛りしています。何を選べばいいか迷ったら、右下のAIスタッフが日本語でご案内します。',
    shopNow: '今すぐ選ぶ', askBot: 'AIスタッフに相談',
    f1: '毎日焼きたて', f1d: '当日焼いて当日発送', f2: '冷蔵配送', f2d: 'NT$1,500以上で送料無料', f3: '多言語AI対応', f3d: '中・英・日・越・マレー語',
    prodTitle: '今週のスイーツ', prodSub: 'すべてアメイの手作り、数量限定です',
    add: 'カートに入れる', added: '追加しました', sweet: '甘さ', allergens: 'アレルゲン', storage: '保存', qty: '数量', soldLow: '残り{n}点',
    tag_bestseller: '人気', tag_signature: '看板', tag_lesssweet: '甘さ控えめ', tag_gift: 'ギフト', tag_souvenir: 'お土産', tag_tea: 'お茶', tag_fruit: 'フルーツ', tag_elder: '目上の方に',
    al_egg: '卵', al_milk: '乳', al_gluten: '小麦', al_nuts: 'ナッツ',
    st_fridge: '冷蔵 {d}日', st_room: '常温 {d}日',
    botStrip: '迷ったら、AIに話しかけてください', botStripSub: '例：「両親へのギフト」「甘さ控えめ」「予算500元」',
    cartTitle: 'カート', cartEmpty: 'カートは空です。スイーツを選んでみましょう！', subtotal: '小計', shipping: '送料', free: '無料', total: '合計', checkout: 'レジに進む', continue: '買い物を続ける',
    ckTitle: 'お会計', ckName: 'お届け先氏名', ckNamePh: 'お名前（デモでは省略可）', ckDelivery: '配送方法', ckHome: '冷蔵宅配', ckPickup: '台中店で受け取り', ckRegion: '配送地域',
    ckPay: 'お支払い方法', ckCard: 'クレジットカード', ckPayBtn: '支払いを確定（デモ）', ckProcessing: '決済処理中…', ckNote: 'デモのため、実際の請求やカード番号の入力はありません。',
    okTitle: 'ご注文ありがとうございます！', okOrder: '注文番号', okInvoice: '電子インボイス', okSync: 'ご注文はオーナー管理画面（POS・会計・在庫）にリアルタイムで同期されました。', okAdmin: '管理画面で見る', close: '閉じる',
    regions: ['台北市', '新北市', '桃園市', '台中市', '台南市', '高雄市', 'その他（台湾）', '日本（国際配送）'],
    footer: 'アメイ手作りスイーツ・本ページは「GreenUP」のプロトタイプです。商品・価格・取引はすべて模擬です。',
    botName: 'AIスタッフ メイ', botStatus: 'オンライン・約2秒で返信', botPh: 'メッセージを入力、またはマイクで話してください…',
    botGreet: 'こんにちは！アメイのAIスタッフ、メイです。ギフト選び、甘さ控えめ、ご予算など、なんでもお気軽にどうぞ！',
    chips: ['両親へのギフト', '甘さ控えめ', '予算500元', '送料はいくら？', 'ナッツは入ってる？', 'お会計'],
    rGift: '目上の方へのギフトなら、この3つが人気です。クッキーギフトは常温30日、パイナップルケーキは定番のお土産、烏龍茶パウンドケーキは甘さ控えめです。',
    rLess: '甘さ控えめなら、烏龍茶パウンドケーキ（★★）と手作りクッキーギフト（★★）がおすすめです。',
    rBudget: 'ご予算NT${n}以内なら、こちらはいかがですか：', rBudgetNone: 'NT${n}だと少し難しいです。一番お手頃なのは烏龍茶パウンドケーキ NT$360です。',
    rBudgetCombo: '組み合わせなら：{a}＋{b}＝NT${t}。',
    rShip: '台湾国内は冷蔵宅配NT$150、NT$1,500以上で送料無料、1〜2日でお届けします。常温のギフト（クッキー・パイナップルケーキ）は日本・東南アジアへ発送可能、国際送料はNT$450からです。',
    rAllergen: '商品ごとのアレルゲン：{list}。ナッツアレルギーの方は、クッキーギフト以外はナッツ不使用です。',
    rAllergenOne: '{p}のアレルゲン：{a}。{nuts}', rNoNuts: 'ナッツは使っていません。', rHasNuts: 'ナッツを含みますのでご注意ください。',
    rStorage: '生クリームロール・レモンタルト・バスクは冷蔵で、2〜4日以内にお召し上がりください。クッキー・パイナップルケーキ・パウンドケーキは常温保存できます。',
    rStorageOne: '{p}：{s}。',
    rRecommend: '今週の人気商品です：',
    rAdded: '{p} × {q} をカートに入れました！現在の合計は NT${t} です。',
    rCartEmpty: 'カートはまだ空です。おすすめをご紹介しましょうか？',
    rCheckout: 'かしこまりました。ご注文内容です：', rConfirm: '支払いを確定（デモ）', rEdit: '買い物を続ける',
    rPaid: 'お支払い完了！ご注文番号 {id}、電子インボイス {inv} をメールでお送りします。アメイにも通知しました。ありがとうございました！',
    rThanks: 'どういたしまして！いつでも聞いてくださいね。', rFallback: 'スイーツのおすすめ、配送・アレルゲン・保存方法のご案内、ご注文の手続きもできます。下のボタンをどうぞ！',
    rSwitched: '日本語を検出しましたので、日本語表示に切り替えました。', micNo: 'このブラウザは音声入力に対応していません。文字で入力してください。', listening: '聞き取り中…',
    voiceOn: '音声返信：オン', voiceOff: '音声返信：オフ', viewCart: 'カートを見る', guest: 'Webのお客様',
  },
  vi: {
    announce: 'Miễn phí giao hàng cho đơn từ NT$1,500 · Trợ lý AI 5 ngôn ngữ · Làm thủ công mỗi ngày',
    navProducts: 'Sản phẩm', navAbout: 'Về Amei', navShip: 'Giao hàng', admin: 'Trang quản lý', cart: 'Giỏ hàng',
    heroKicker: 'Làm thủ công tại Đài Trung · Nướng mẻ nhỏ mỗi ngày', heroTitle: 'Gói trọn hạnh phúc<br>trong từng hộp bánh.',
    heroSub: 'Amei một mình làm bánh, một mình trông tiệm. Chưa biết chọn gì hay cần quà tặng? Trợ lý AI (góc dưới bên phải) sẽ tư vấn bằng tiếng Việt cho bạn.',
    shopNow: 'Mua ngay', askBot: 'Hỏi trợ lý AI',
    f1: 'Nướng mỗi ngày', f1d: 'Nướng và gửi trong ngày', f2: 'Giao hàng lạnh', f2d: 'Miễn phí từ NT$1,500', f3: 'AI đa ngôn ngữ', f3d: 'Trung · Anh · Nhật · Việt · Mã Lai',
    prodTitle: 'Bánh tuần này', prodSub: 'Tất cả do Amei tự tay làm, số lượng có hạn',
    add: 'Thêm vào giỏ', added: 'Đã thêm', sweet: 'Độ ngọt', allergens: 'Dị ứng', storage: 'Bảo quản', qty: 'Số lượng', soldLow: 'Chỉ còn {n}',
    tag_bestseller: 'Bán chạy', tag_signature: 'Đặc trưng', tag_lesssweet: 'Ít ngọt', tag_gift: 'Quà tặng', tag_souvenir: 'Quà lưu niệm', tag_tea: 'Vị trà', tag_fruit: 'Trái cây', tag_elder: 'Người lớn thích',
    al_egg: 'trứng', al_milk: 'sữa', al_gluten: 'gluten', al_nuts: 'các loại hạt',
    st_fridge: 'Tủ lạnh {d} ngày', st_room: 'Nhiệt độ phòng {d} ngày',
    botStrip: 'Chưa biết chọn gì? Hãy nói với AI', botStripSub: 'Ví dụ: "quà biếu ông bà", "ít ngọt", "ngân sách 500"',
    cartTitle: 'Giỏ hàng', cartEmpty: 'Giỏ hàng trống. Hãy chọn vài món bánh nhé!', subtotal: 'Tạm tính', shipping: 'Phí ship', free: 'Miễn phí', total: 'Tổng cộng', checkout: 'Thanh toán', continue: 'Xem tiếp',
    ckTitle: 'Thanh toán', ckName: 'Người nhận', ckNamePh: 'Họ tên (có thể bỏ trống khi demo)', ckDelivery: 'Hình thức giao', ckHome: 'Giao hàng lạnh tận nhà', ckPickup: 'Nhận tại tiệm Đài Trung', ckRegion: 'Khu vực',
    ckPay: 'Thanh toán', ckCard: 'Thẻ tín dụng', ckPayBtn: 'Xác nhận thanh toán (demo)', ckProcessing: 'Đang xử lý…', ckNote: 'Đây là bản demo, không thu tiền và không cần nhập số thẻ.',
    okTitle: 'Đặt hàng thành công. Cảm ơn bạn!', okOrder: 'Mã đơn', okInvoice: 'Hóa đơn điện tử', okSync: 'Đơn hàng đã đồng bộ ngay với trang quản lý (POS, kế toán, kho).', okAdmin: 'Xem trên trang quản lý', close: 'Đóng',
    regions: ['Đài Bắc', 'Tân Bắc', 'Đào Viên', 'Đài Trung', 'Đài Nam', 'Cao Hùng', 'Khu vực khác (Đài Loan)', 'Nhật Bản (quốc tế)'],
    footer: 'Bánh thủ công Amei · Trang này là bản demo của GreenUP. Mọi sản phẩm, giá và giao dịch đều là mô phỏng.',
    botName: 'Trợ lý AI Mei', botStatus: 'Trực tuyến · trả lời trong ~2 giây', botPh: 'Nhập tin nhắn hoặc bấm micro để nói…',
    botGreet: 'Xin chào! Mình là Mei, trợ lý AI của tiệm Amei. Bạn cần quà biếu, bánh ít ngọt hay có ngân sách cụ thể? Cứ nói với mình nhé!',
    chips: ['Quà biếu ông bà', 'Ít ngọt thôi', 'Ngân sách 500', 'Phí giao hàng?', 'Có hạt không?', 'Thanh toán'],
    rGift: 'Biếu người lớn thì mấy món này được chuộng nhất: hộp bánh quy để được 30 ngày, bánh dứa là quà truyền thống, bánh bông lan trà Ô Long ít ngọt rất hợp.',
    rLess: 'Muốn ít ngọt thì bạn thử bánh bông lan trà Ô Long (★★) hoặc hộp bánh quy thủ công (★★) nhé.',
    rBudget: 'Với ngân sách NT${n}, bạn có thể chọn:', rBudgetNone: 'NT${n} hơi ít một chút. Món rẻ nhất là bánh bông lan trà Ô Long NT$360, bạn xem thử nhé?',
    rBudgetCombo: 'Hoặc combo: {a} + {b} = NT${t}.',
    rShip: 'Giao lạnh trong Đài Loan NT$150, miễn phí cho đơn từ NT$1,500, nhận sau 1–2 ngày. Hộp quà để nhiệt độ phòng (bánh quy, bánh dứa) gửi được Nhật Bản và Đông Nam Á, phí quốc tế từ NT$450.',
    rAllergen: 'Thành phần gây dị ứng: {list}. Nếu dị ứng hạt, ngoài hộp bánh quy thì các món khác đều không có hạt.',
    rAllergenOne: '{p} có chứa: {a}. {nuts}', rNoNuts: 'Không có hạt.', rHasNuts: 'Có chứa hạt, bạn lưu ý nhé.',
    rStorage: 'Bánh cuộn kem, tart chanh và Basque cần để tủ lạnh, ngon nhất trong 2–4 ngày. Bánh quy, bánh dứa và bông lan để nhiệt độ phòng được.',
    rStorageOne: '{p}: {s}.',
    rRecommend: 'Các món được yêu thích nhất tuần này:',
    rAdded: 'Đã thêm {p} × {q} vào giỏ! Tổng hiện tại: NT${t}.',
    rCartEmpty: 'Giỏ hàng đang trống. Bạn muốn mình gợi ý vài món không?',
    rCheckout: 'Dạ, đây là đơn hàng của bạn:', rConfirm: 'Xác nhận thanh toán (demo)', rEdit: 'Xem tiếp',
    rPaid: 'Thanh toán thành công! Đơn {id} đã được tạo, hóa đơn điện tử {inv} sẽ gửi qua email. Amei đã nhận được thông báo. Cảm ơn bạn!',
    rThanks: 'Không có gì! Cần gì cứ hỏi mình nhé.', rFallback: 'Mình có thể gợi ý bánh, trả lời về giao hàng, dị ứng, bảo quản, hoặc đặt hàng giúp bạn. Thử các nút bên dưới nhé!',
    rSwitched: 'Mình thấy bạn dùng tiếng Việt nên đã chuyển giao diện sang tiếng Việt.', micNo: 'Trình duyệt này không hỗ trợ nhập giọng nói. Bạn gõ chữ giúp mình nhé.', listening: 'Đang nghe…',
    voiceOn: 'Trả lời bằng giọng nói: bật', voiceOff: 'Trả lời bằng giọng nói: tắt', viewCart: 'Xem giỏ hàng', guest: 'Khách web',
  },
  ms: {
    announce: 'Penghantaran percuma melebihi NT$1,500 · Pembantu AI 5 bahasa · Dibuat tangan setiap hari',
    navProducts: 'Produk', navAbout: 'Tentang Amei', navShip: 'Penghantaran', admin: 'Konsol pemilik', cart: 'Troli',
    heroKicker: 'Buatan tangan di Taichung · Dibakar sedikit setiap hari', heroTitle: 'Kebahagiaan,<br>dalam setiap kotak.',
    heroSub: 'Amei membakar dan mengurus kedai seorang diri. Tidak pasti apa hendak dipilih? Pembantu AI (bawah kanan) akan membantu dalam bahasa anda.',
    shopNow: 'Beli sekarang', askBot: 'Tanya pembantu AI',
    f1: 'Segar setiap hari', f1d: 'Dibakar dan dihantar hari yang sama', f2: 'Penghantaran sejuk', f2d: 'Percuma melebihi NT$1,500', f3: 'AI pelbagai bahasa', f3d: 'Cina · EN · Jepun · VI · MS',
    prodTitle: 'Pencuci mulut minggu ini', prodSub: 'Semuanya dibuat tangan oleh Amei, kuantiti terhad',
    add: 'Tambah ke troli', added: 'Ditambah', sweet: 'Kemanisan', allergens: 'Alergen', storage: 'Simpanan', qty: 'Kuantiti', soldLow: 'Tinggal {n} sahaja',
    tag_bestseller: 'Terlaris', tag_signature: 'Istimewa', tag_lesssweet: 'Kurang manis', tag_gift: 'Hadiah', tag_souvenir: 'Cenderamata', tag_tea: 'Teh', tag_fruit: 'Buah segar', tag_elder: 'Kegemaran warga emas',
    al_egg: 'telur', al_milk: 'susu', al_gluten: 'gluten', al_nuts: 'kacang',
    st_fridge: 'Peti sejuk, {d} hari', st_room: 'Suhu bilik, {d} hari',
    botStrip: 'Tidak pasti? Beritahu sahaja AI', botStripSub: 'Contoh: "hadiah untuk ibu bapa", "kurang manis", "bajet 500"',
    cartTitle: 'Troli anda', cartEmpty: 'Troli anda kosong. Jom pilih pencuci mulut!', subtotal: 'Subjumlah', shipping: 'Penghantaran', free: 'Percuma', total: 'Jumlah', checkout: 'Bayar', continue: 'Teruskan membeli',
    ckTitle: 'Pembayaran', ckName: 'Penerima', ckNamePh: 'Nama anda (pilihan dalam demo)', ckDelivery: 'Penghantaran', ckHome: 'Penghantaran sejuk ke rumah', ckPickup: 'Ambil di Taichung', ckRegion: 'Kawasan',
    ckPay: 'Kaedah bayaran', ckCard: 'Kad kredit', ckPayBtn: 'Sahkan bayaran (demo)', ckProcessing: 'Memproses bayaran…', ckNote: 'Ini demo. Tiada caj dan tiada nombor kad diperlukan.',
    okTitle: 'Pesanan berjaya. Terima kasih!', okOrder: 'No. pesanan', okInvoice: 'e-Invois', okSync: 'Pesanan anda telah disegerakkan ke konsol pemilik (POS, perakaunan, inventori).', okAdmin: 'Lihat di konsol pemilik', close: 'Tutup',
    regions: ['Taipei', 'New Taipei', 'Taoyuan', 'Taichung', 'Tainan', 'Kaohsiung', 'Lain-lain (Taiwan)', 'Jepun (antarabangsa)'],
    footer: 'Pencuci Mulut Buatan Tangan Amei · Halaman ini ialah prototaip GreenUP. Semua produk, harga dan transaksi adalah simulasi.',
    botName: 'Mei · Pembantu AI', botStatus: 'Dalam talian · balas ~2 saat', botPh: 'Taip mesej atau tekan mikrofon…',
    botGreet: 'Hai! Saya Mei, pembantu AI kedai Amei. Cari hadiah, mahu yang kurang manis, atau ada bajet? Beritahu saya!',
    chips: ['Hadiah untuk ibu bapa', 'Kurang manis', 'Bajet NT$500', 'Kos penghantaran?', 'Ada kacang?', 'Bayar'],
    rGift: 'Untuk warga emas, ini pilihan paling popular: Kotak Biskut tahan 30 hari, Kek Nanas ialah cenderamata klasik Taiwan, dan Kek Pound Teh Oolong kurang manis.',
    rLess: 'Untuk yang kurang manis, cuba Kek Pound Teh Oolong (★★) atau Kotak Hadiah Biskut (★★).',
    rBudget: 'Dalam bajet NT${n}, anda boleh pilih:', rBudgetNone: 'NT${n} agak terhad. Item paling murah ialah Kek Pound Teh Oolong NT$360. Mahu lihat?',
    rBudgetCombo: 'Atau kombo: {a} + {b} = NT${t}.',
    rShip: 'Penghantaran sejuk di Taiwan NT$150, percuma melebihi NT$1,500, tiba dalam 1–2 hari. Kotak hadiah suhu bilik (biskut, kek nanas) boleh dihantar ke Jepun dan Asia Tenggara dari NT$450.',
    rAllergen: 'Alergen mengikut produk: {list}. Jika alah kacang, semua produk kecuali Kotak Biskut tidak mengandungi kacang.',
    rAllergenOne: '{p} mengandungi: {a}. {nuts}', rNoNuts: 'Tiada kacang.', rHasNuts: 'Mengandungi kacang, sila berhati-hati.',
    rStorage: 'Simpan gulung krim, tart lemon dan basque dalam peti sejuk dan nikmati dalam 2–4 hari. Biskut, kek nanas dan kek pound boleh disimpan pada suhu bilik.',
    rStorageOne: '{p}: {s}.',
    rRecommend: 'Kegemaran minggu ini:',
    rAdded: '{p} × {q} telah ditambah ke troli! Jumlah setakat ini: NT${t}.',
    rCartEmpty: 'Troli anda kosong. Mahu saya cadangkan sesuatu?',
    rCheckout: 'Baik, ini pesanan anda:', rConfirm: 'Sahkan bayaran (demo)', rEdit: 'Teruskan membeli',
    rPaid: 'Bayaran berjaya! Pesanan {id} disahkan dan e-invois {inv} akan dihantar melalui e-mel. Amei telah dimaklumkan. Terima kasih!',
    rThanks: 'Sama-sama! Tanya saya bila-bila masa.', rFallback: 'Saya boleh cadangkan pencuci mulut, jawab soalan tentang penghantaran, alergen dan simpanan, atau buat pesanan untuk anda. Cuba butang di bawah!',
    rSwitched: 'Anda menulis dalam Bahasa Melayu, jadi saya tukar laman ini ke Bahasa Melayu.', micNo: 'Pelayar ini tidak menyokong input suara. Sila taip.', listening: 'Sedang mendengar…',
    voiceOn: 'Balasan suara: hidup', voiceOff: 'Balasan suara: mati', viewCart: 'Lihat troli', guest: 'Tetamu web',
  },
};

export function t(lang, key, vars = {}) {
  let s = (S[lang] && S[lang][key]) ?? S.zh[key] ?? key;
  if (typeof s === 'string') s = s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
  return s;
}
// 其他業主的商品：用商品本身的中英文欄位（日文、越南文等沒有翻譯時用英文）
function pI18n(lang, id) {
  const t = PRODUCT_I18N[id];
  if (t) return t[lang] || t.zh;
  const p = (TENANT.products || []).find(x => x.id === id);
  if (!p) return [id, '', ''];
  if (p.i18n && p.i18n[lang]) return p.i18n[lang];
  return lang === 'zh' ? [p.name, p.unit, p.desc] : [p.en || p.name, p.unit, p.descEn || p.desc];
}
export function pName(lang, id) { return pI18n(lang, id)[0]; }
export function pUnit(lang, id) { return pI18n(lang, id)[1]; }
export function pDesc(lang, id) { return pI18n(lang, id)[2]; }

// 語言偵測：假名 → 日文；越南文變音 → 越南文；漢字 → 中文；拉丁字母 → 馬來文關鍵字或英文
const VI_RE = /[ăâđêôơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i;
const MS_RE = /\b(saya|nak|mahu|boleh|berapa|harga|hadiah|untuk|tidak|tak|kurang|manis|terima kasih|apa|ada|kek|biskut|hantar|bajet|ibu|bapa|bayar|troli|kacang|simpan|ke|dan|yang|kos|penghantaran|pembayaran|cadangan|sedap|mahal|murah|warga|emas)\b/i;
export function detectLang(text) {
  if (!text || !text.trim()) return null;
  if (/[぀-ヿ]/.test(text)) return 'ja';
  if (VI_RE.test(text)) return 'vi';
  if (/[一-鿿]/.test(text)) return 'zh';
  if (/[a-z]/i.test(text)) {
    const words = text.toLowerCase().match(/[a-z]+/g) || [];
    const msHits = words.filter(w => MS_RE.test(w)).length;
    if (msHits >= 1 && msHits / words.length >= 0.25) return 'ms';
    if (/^\s*(ok|okay|yes|no|hi|nt\$?\s*\d+|\d+)\s*$/i.test(text)) return null; // 太短不判斷
    return 'en';
  }
  return null;
}
