// 銷售網頁：多業主前台（品牌、文案、版面）＋風格切換（手動／自動：節慶、夜間）＋展示切換面板
// 業主（tenant）由 tenant.js 決定；切換業主會重新載入頁面（各業主資料隔離）。
// 風格與產品顯示設定存在 shop-config.js（已依業主分開），後台「網站設計工作室」即時同步。
import { TENANT, TENANT_ID, TENANTS, setTenant } from '../tenant.js';
import { PRODUCTS, PRODUCT_MAP, SHIPPING_FEE, FREE_SHIP, mulberry32 } from '../data.js';
import { t as baseT, LANGS } from '../i18n.js';
import { getShopConfig, setShopConfig, onShopConfig } from '../shop-config.js';
import { THEMES, CORE_THEMES, FESTIVAL_THEMES, THEME_MAP, resolveTheme, themeVars, themeName, getTheme, nowOf, styleOf } from './themes.js';
import { CATS } from '../biz/index.js';
import { promoInfo, activePromos, onPromos, FESTIVALS } from '../promo.js';
import { merchantLogo } from '../merchant-art.js';
import { $, $$, el, gsap, esc } from '../util.js';

export const isAmei = TENANT_ID === 'amei';
export const MER = TENANT;
export const LAYOUT = TENANT.layout || 'classic';
export const SHIP_MODE = (TENANT.ship && TENANT.ship.mode) || 'ship';
const PREVIEW = new URLSearchParams(location.search).has('preview');
const REDUCED = (() => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; } })();
const OWNER_EN = { amei: 'Amei', coffee: 'Lan', leather: 'Mubai', flower: 'Xiaori', nail: 'Xiaozhi', pho: 'Linh' };
const OWNER_GENERIC = { en: 'the owner', ja: 'オーナー', vi: 'chủ tiệm', ms: 'pemilik' };
const ownerOf = (l) => (l === 'zh' ? TENANT.owner : (TENANT.ownerEn || OWNER_EN[TENANT_ID] || OWNER_GENERIC[l] || OWNER_GENERIC.en));
export const STYLE = styleOf(TENANT);

// ---------------- 文案 ----------------
// 非阿美業主共用的文案範本（{name} 業主名、{owner} 負責人、{ai} AI 名、{fee}/{free} 運費）
const GEN = {
  zh: {
    feat: '本店主打', announce: '{name}・{tagline}・支援 5 種語言 AI 客服', admin: '店主後台',
    botName: 'AI 導購{ai}', botGreet: '嗨！我是{name}的 AI 導購{ai}。{owner}一個人經營，商品、運送、付款都可以問我，也能直接幫你下單！',
    botStrip: '不知道選什麼？直接告訴 AI 你的需求', botStripSub: '例如：「{c0}」「{c1}」「{c2}」',
    footer: '{name}・虛構示範業主。本頁為「GreenUP」原型示範，所有商品、價格與交易皆為模擬。',
    cartEmpty: '購物車是空的，去挑幾樣吧！', ckHome: '宅配到府', ckPickup: '到店自取', ckTakeHome: '外送', ckTakePick: '外帶自取', ckSlot: '預約時段', ckService: '到店服務', ckDeliveryTake: '取餐方式',
    okSync: '訂單已即時同步到{name}的店主後台（POS、會計、庫存）。',
    rRecommend: '這幾款是{name}最受歡迎的：', rGift: '送禮的話，這幾款最適合，都可以附上卡片：', rLess: '這幾款口味比較清爽：',
    rBudgetNone: '預算 NT${n} 有點少，最平價的是 {p} NT${price}，要看看嗎？',
    rShip_ship: '宅配 NT${fee}，滿 NT${free} 免運，1–3 天到貨；也可以選到店自取。',
    rShip_service: '這是到店服務，不需運費。結帳時選好日期時段，AI 會傳訊息確認；需要改時間，前一天告訴我就好。',
    rShip_takeout: '下單後約 15 分鐘出餐，外帶自取免運；外送 NT${fee}，滿 NT${free} 免運。',
    rBook: '可預約時段是週二到週六 11:00–20:00，每個時段只服務一位。選好服務後按「結帳」就能挑時段，這幾項最多人預約：',
    rSolo: '一個人吃的話，推薦 {a} 加 {b}，共 NT${t}：', rEngrave: '每件皮件都能免費刻字（英文 10 字或中文 5 字內），結帳後 AI 會跟你確認字樣。最常刻字的是這幾款：',
    rAsk: '這個問題我已經轉給{owner}本人，通常 10 分鐘內會回覆你喔！順便看看這幾款？',
    rFallback: '我可以推薦{name}的商品、回答運送與付款問題，也可以直接幫你下單。試試下面的按鈕？',
    rPaid: '付款成功！訂單 {id} 已建立，電子發票 {inv} 會寄到你的信箱。{owner}已經收到通知囉，謝謝你！',
    addBook: '預約', ckTitleBook: '預約與付款', navMenu: '菜單', navService: '服務項目', navShipService: '預約須知', navShipTake: '外帶外送',
    tag_hot: '熱銷', tag_gift: '送禮', tag_new: '新品', tag_starter: '入門', tag_limited: '限量', tag_value: '超值', tag_light: '淺焙', tag_sub: '訂閱', tag_signature: '招牌', tag_veg: '可做素',
    dUnit: '規格', dStock: '庫存', dMode: '取得方式', dDur: '服務時間', min: '分鐘', mode_ship: '宅配或到店自取', mode_service: '到店服務・完全預約制', mode_takeout: '外帶自取或外送',
    soldOut: '已滿', slotPick: '選擇預約時段', slotNote: '每個時段只服務一位客人', today: '今天', open: '營業中 10:30–20:30', ready: '下單後約 15 分鐘出餐', takeTitle: '線上點餐', no: 'No.', perSession: '/ 次',
    issue: '烘焙日誌', craft: '職人手作', ateliers: '每件作品皆有職人編號', menuNote: '價格含稅・可加大',
  },
  en: {
    feat: 'Featured', announce: '{name} · {tagline} · AI concierge in 5 languages', admin: 'Owner console',
    botName: '{name} · AI concierge', botGreet: 'Hi! I’m the AI concierge for {name}. {owner} runs it solo, so ask me anything about products, delivery or payment, or let me place the order for you!',
    botStrip: 'Not sure what to choose? Just tell the AI', botStripSub: 'e.g. “{c0}”, “{c1}”, “{c2}”',
    footer: '{name} · Fictional demo business. A prototype demo of GreenUP; all products, prices and transactions are simulated.',
    cartEmpty: 'Your cart is empty. Go pick something!', ckHome: 'Home delivery', ckPickup: 'Pick up in store', ckTakeHome: 'Delivery', ckTakePick: 'Takeaway pickup', ckSlot: 'Appointment', ckService: 'In-studio service', ckDeliveryTake: 'How to get it',
    okSync: 'Your order has synced live to {name}’s owner console (POS, accounting, inventory).',
    rRecommend: 'The most popular picks at {name}:', rGift: 'For a gift, these work best, and we can add a card:', rLess: 'These are on the lighter side:',
    rBudgetNone: 'NT${n} is a bit tight. The most affordable is {p} at NT${price}. Want to see it?',
    rShip_ship: 'Home delivery is NT${fee}, free over NT${free}, arriving in 1–3 days. You can also pick up in store.',
    rShip_service: 'This is an in-studio service, so no shipping. Pick a date and time at checkout and our AI will confirm. Need to reschedule? Just tell me a day ahead.',
    rShip_takeout: 'Orders are ready in about 15 minutes. Takeaway is free; delivery is NT${fee}, free over NT${free}.',
    rBook: 'Appointments run Tue–Sat 11:00–20:00, one guest per slot. Add a service and tap Checkout to pick a time. Most booked:',
    rSolo: 'Eating alone? Try {a} with {b}, NT${t} in total:', rEngrave: 'Every piece can be engraved for free (up to 10 letters); our AI confirms the text after checkout. Most engraved:',
    rAsk: 'I’ve passed this question to {owner}, who usually replies within 10 minutes. Meanwhile, how about these?',
    rFallback: 'I can recommend products from {name}, answer delivery and payment questions, or place the order for you. Try the buttons below!',
    rPaid: 'Payment successful! Order {id} is confirmed and e-invoice {inv} will be emailed to you. {owner} has been notified. Thank you!',
    addBook: 'Book', ckTitleBook: 'Book & pay', navMenu: 'Menu', navService: 'Services', navShipService: 'Booking info', navShipTake: 'Takeaway',
    tag_hot: 'Best seller', tag_gift: 'Gift', tag_new: 'New', tag_starter: 'Starter', tag_limited: 'Limited', tag_value: 'Great value', tag_light: 'Light roast', tag_sub: 'Subscription', tag_signature: 'Signature', tag_veg: 'Veg option',
    dUnit: 'Size', dStock: 'In stock', dMode: 'How to get it', dDur: 'Duration', min: 'min', mode_ship: 'Delivery or store pickup', mode_service: 'In-studio, by appointment only', mode_takeout: 'Takeaway or delivery',
    soldOut: 'Full', slotPick: 'Pick a time slot', slotNote: 'One guest per slot', today: 'Today', open: 'Open 10:30–20:30', ready: 'Ready in about 15 minutes', takeTitle: 'Order online', no: 'No.', perSession: '/ session',
    issue: 'Roast journal', craft: 'Handmade', ateliers: 'Every piece is numbered', menuNote: 'Tax included · Large size available',
  },
  ja: {
    feat: 'イチオシ', announce: '{name}・{tagline}・5言語のAIスタッフ対応', admin: 'オーナー管理画面',
    botName: '{name}・AIスタッフ', botGreet: 'こんにちは！{name}のAIスタッフです。{owner}がひとりで営業しているので、商品・配送・お支払いのことは私にどうぞ。ご注文の手続きもできます！',
    botStrip: '迷ったら、AIに話しかけてください', botStripSub: '例：「{c0}」「{c1}」「{c2}」',
    footer: '{name}・架空のデモ事業者です。本ページは「GreenUP」のプロトタイプで、商品・価格・取引はすべて模擬です。',
    cartEmpty: 'カートは空です。商品を選んでみましょう！', ckHome: '宅配', ckPickup: '店頭受け取り', ckTakeHome: 'デリバリー', ckTakePick: '持ち帰り', ckSlot: 'ご予約日時', ckService: '来店施術', ckDeliveryTake: '受け取り方法',
    okSync: 'ご注文は{name}のオーナー管理画面（POS・会計・在庫）にリアルタイムで同期されました。',
    rRecommend: '{name}の人気商品です：', rGift: 'ギフトならこちらがおすすめです。メッセージカードも付けられます：', rLess: 'こちらはさっぱりめです：',
    rBudgetNone: 'NT${n}だと少し難しいです。一番お手頃なのは {p}（NT${price}）です。',
    rShip_ship: '宅配はNT${fee}、NT${free}以上で送料無料、1〜3日でお届けします。店頭受け取りもできます。',
    rShip_service: '来店施術のため送料はかかりません。お会計で日時を選ぶとAIが確認のご連絡をします。変更は前日までにお知らせください。',
    rShip_takeout: 'ご注文から約15分でご用意します。持ち帰りは無料、デリバリーはNT${fee}（NT${free}以上で無料）です。',
    rBook: 'ご予約は火〜土 11:00〜20:00、各枠お一人様です。メニューを選んでお会計に進むと日時を選べます。人気はこちら：',
    rSolo: 'おひとりなら {a} と {b} の組み合わせ（合計NT${t}）がおすすめです：', rEngrave: 'すべての商品に無料で名入れできます（英字10文字まで）。ご注文後にAIが文字を確認します。人気の名入れ商品：',
    rAsk: 'このご質問は{owner}本人にお伝えしました。通常10分以内にお返事します。こちらもいかがですか？',
    rFallback: '{name}の商品のおすすめ、配送やお支払いのご案内、ご注文の手続きができます。下のボタンをどうぞ！',
    rPaid: 'お支払い完了！ご注文番号 {id}、電子インボイス {inv} をメールでお送りします。{owner}にも通知しました。ありがとうございました！',
    addBook: '予約する', ckTitleBook: '予約とお支払い', navMenu: 'メニュー', navService: 'メニュー', navShipService: 'ご予約について', navShipTake: '持ち帰り・配達',
    tag_hot: '人気', tag_gift: 'ギフト', tag_new: '新商品', tag_starter: '入門', tag_limited: '限定', tag_value: 'お得', tag_light: '浅煎り', tag_sub: '定期便', tag_signature: '看板', tag_veg: 'ベジ対応',
    dUnit: '規格', dStock: '在庫', dMode: '受け取り方法', dDur: '所要時間', min: '分', mode_ship: '宅配または店頭受け取り', mode_service: '来店施術・完全予約制', mode_takeout: '持ち帰りまたはデリバリー',
    soldOut: '満席', slotPick: 'ご予約日時を選ぶ', slotNote: '各枠お一人様のみ', today: '今日', open: '営業中 10:30〜20:30', ready: 'ご注文から約15分', takeTitle: 'オンライン注文', no: 'No.', perSession: '/ 回',
    issue: '焙煎日誌', craft: '職人の手仕事', ateliers: '一点ずつ職人番号入り', menuNote: '税込・大盛り可',
  },
  vi: {
    feat: 'Nổi bật', announce: '{name} · {tagline} · Trợ lý AI 5 ngôn ngữ', admin: 'Trang quản lý',
    botName: '{name} · Trợ lý AI', botGreet: 'Xin chào! Mình là trợ lý AI của {name}. {owner} tự vận hành tiệm, nên cứ hỏi mình về sản phẩm, giao hàng, thanh toán, hoặc để mình đặt hàng giúp bạn!',
    botStrip: 'Chưa biết chọn gì? Hãy nói với AI', botStripSub: 'Ví dụ: "{c0}", "{c1}", "{c2}"',
    footer: '{name} · Doanh nghiệp demo hư cấu. Trang này là bản demo của GreenUP; mọi sản phẩm, giá và giao dịch đều là mô phỏng.',
    cartEmpty: 'Giỏ hàng trống. Hãy chọn vài món nhé!', ckHome: 'Giao tận nhà', ckPickup: 'Nhận tại cửa hàng', ckTakeHome: 'Giao hàng', ckTakePick: 'Mang đi', ckSlot: 'Lịch hẹn', ckService: 'Dịch vụ tại tiệm', ckDeliveryTake: 'Cách nhận món',
    okSync: 'Đơn hàng đã đồng bộ ngay với trang quản lý của {name} (POS, kế toán, kho).',
    rRecommend: 'Những món được yêu thích nhất ở {name}:', rGift: 'Làm quà thì mấy món này hợp nhất, có kèm thiệp:', rLess: 'Mấy món này vị nhẹ nhàng hơn:',
    rBudgetNone: 'NT${n} hơi ít. Món rẻ nhất là {p} giá NT${price}, bạn xem thử nhé?',
    rShip_ship: 'Giao tận nhà NT${fee}, miễn phí từ NT${free}, nhận sau 1–3 ngày. Bạn cũng có thể đến lấy tại cửa hàng.',
    rShip_service: 'Đây là dịch vụ tại tiệm nên không mất phí giao. Chọn ngày giờ khi thanh toán, AI sẽ nhắn xác nhận; muốn đổi giờ thì báo trước một ngày nhé.',
    rShip_takeout: 'Khoảng 15 phút có món. Mang đi miễn phí; giao hàng NT${fee}, miễn phí từ NT${free}.',
    rBook: 'Nhận lịch thứ Ba đến thứ Bảy 11:00–20:00, mỗi khung giờ một khách. Chọn dịch vụ rồi bấm Thanh toán để chọn giờ. Được đặt nhiều nhất:',
    rSolo: 'Ăn một mình thì gọi {a} với {b}, tổng NT${t}:', rEngrave: 'Mọi sản phẩm đều được khắc tên miễn phí (tối đa 10 ký tự); AI sẽ xác nhận sau khi đặt. Hay được khắc nhất:',
    rAsk: 'Mình đã chuyển câu hỏi này cho {owner}, thường trả lời trong 10 phút. Trong lúc chờ, bạn xem mấy món này nhé?',
    rFallback: 'Mình có thể gợi ý sản phẩm của {name}, trả lời về giao hàng, thanh toán hoặc đặt hàng giúp bạn. Thử các nút bên dưới nhé!',
    rPaid: 'Thanh toán thành công! Đơn {id} đã được tạo, hóa đơn điện tử {inv} sẽ gửi qua email. {owner} đã nhận được thông báo. Cảm ơn bạn!',
    addBook: 'Đặt lịch', ckTitleBook: 'Đặt lịch & thanh toán', navMenu: 'Thực đơn', navService: 'Dịch vụ', navShipService: 'Lưu ý đặt lịch', navShipTake: 'Mang đi & giao',
    tag_hot: 'Bán chạy', tag_gift: 'Quà tặng', tag_new: 'Mới', tag_starter: 'Cho người mới', tag_limited: 'Giới hạn', tag_value: 'Đáng tiền', tag_light: 'Rang nhạt', tag_sub: 'Gói định kỳ', tag_signature: 'Đặc trưng', tag_veg: 'Có món chay',
    dUnit: 'Quy cách', dStock: 'Còn hàng', dMode: 'Cách nhận', dDur: 'Thời gian', min: 'phút', mode_ship: 'Giao tận nhà hoặc nhận tại cửa hàng', mode_service: 'Tại tiệm · chỉ nhận đặt lịch', mode_takeout: 'Mang đi hoặc giao hàng',
    soldOut: 'Đã kín', slotPick: 'Chọn khung giờ', slotNote: 'Mỗi khung giờ một khách', today: 'Hôm nay', open: 'Mở cửa 10:30–20:30', ready: 'Khoảng 15 phút có món', takeTitle: 'Gọi món online', no: 'No.', perSession: '/ lần',
    issue: 'Nhật ký rang', craft: 'Thủ công', ateliers: 'Mỗi món đều có số hiệu', menuNote: 'Đã gồm thuế · Có size lớn',
  },
  ms: {
    feat: 'Pilihan utama', announce: '{name} · {tagline} · Pembantu AI 5 bahasa', admin: 'Konsol pemilik',
    botName: '{name} · Pembantu AI', botGreet: 'Hai! Saya pembantu AI {name}. {owner} mengurus seorang diri, jadi tanya saya tentang produk, penghantaran atau bayaran, atau biar saya buat pesanan untuk anda!',
    botStrip: 'Tidak pasti? Beritahu sahaja AI', botStripSub: 'Contoh: "{c0}", "{c1}", "{c2}"',
    footer: '{name} · Perniagaan demo rekaan. Halaman ini ialah prototaip GreenUP; semua produk, harga dan transaksi adalah simulasi.',
    cartEmpty: 'Troli anda kosong. Jom pilih sesuatu!', ckHome: 'Hantar ke rumah', ckPickup: 'Ambil di kedai', ckTakeHome: 'Penghantaran', ckTakePick: 'Ambil sendiri', ckSlot: 'Temujanji', ckService: 'Perkhidmatan di studio', ckDeliveryTake: 'Cara terima',
    okSync: 'Pesanan anda telah disegerakkan ke konsol pemilik {name} (POS, perakaunan, inventori).',
    rRecommend: 'Pilihan paling popular di {name}:', rGift: 'Untuk hadiah, ini paling sesuai dan boleh disertakan kad:', rLess: 'Ini pilihan yang lebih ringan:',
    rBudgetNone: 'NT${n} agak terhad. Yang paling murah ialah {p} pada NT${price}. Mahu lihat?',
    rShip_ship: 'Penghantaran ke rumah NT${fee}, percuma melebihi NT${free}, tiba dalam 1–3 hari. Boleh juga ambil di kedai.',
    rShip_service: 'Ini perkhidmatan di studio, tiada caj penghantaran. Pilih tarikh dan masa semasa bayar, AI akan mengesahkan. Mahu tukar masa? Beritahu sehari lebih awal.',
    rShip_takeout: 'Siap dalam kira-kira 15 minit. Ambil sendiri percuma; penghantaran NT${fee}, percuma melebihi NT${free}.',
    rBook: 'Temujanji Selasa–Sabtu 11:00–20:00, seorang bagi setiap slot. Pilih perkhidmatan dan tekan Bayar untuk pilih masa. Paling banyak ditempah:',
    rSolo: 'Makan seorang? Cuba {a} dengan {b}, jumlah NT${t}:', rEngrave: 'Setiap barang boleh diukir percuma (hingga 10 huruf); AI akan sahkan selepas pesanan. Paling kerap diukir:',
    rAsk: 'Soalan ini telah saya hantar kepada {owner}, biasanya dibalas dalam 10 minit. Sementara itu, bagaimana dengan ini?',
    rFallback: 'Saya boleh cadangkan produk {name}, jawab soalan penghantaran dan bayaran, atau buat pesanan untuk anda. Cuba butang di bawah!',
    rPaid: 'Bayaran berjaya! Pesanan {id} disahkan dan e-invois {inv} akan dihantar melalui e-mel. {owner} telah dimaklumkan. Terima kasih!',
    addBook: 'Tempah', ckTitleBook: 'Tempah & bayar', navMenu: 'Menu', navService: 'Perkhidmatan', navShipService: 'Info tempahan', navShipTake: 'Bungkus & hantar',
    tag_hot: 'Terlaris', tag_gift: 'Hadiah', tag_new: 'Baharu', tag_starter: 'Permulaan', tag_limited: 'Terhad', tag_value: 'Berbaloi', tag_light: 'Panggang cerah', tag_sub: 'Langganan', tag_signature: 'Istimewa', tag_veg: 'Pilihan vegetarian',
    dUnit: 'Saiz', dStock: 'Stok', dMode: 'Cara terima', dDur: 'Tempoh', min: 'minit', mode_ship: 'Hantar atau ambil di kedai', mode_service: 'Di studio, temujanji sahaja', mode_takeout: 'Ambil sendiri atau hantar',
    soldOut: 'Penuh', slotPick: 'Pilih slot masa', slotNote: 'Seorang bagi setiap slot', today: 'Hari ini', open: 'Dibuka 10:30–20:30', ready: 'Siap dalam ~15 minit', takeTitle: 'Pesan dalam talian', no: 'No.', perSession: '/ sesi',
    issue: 'Jurnal panggang', craft: 'Buatan tangan', ateliers: 'Setiap barang bernombor', menuNote: 'Termasuk cukai · Saiz besar tersedia',
  },
};
// 前台面板（展示切換）文案
const PANEL = {
  zh: { search: '搜尋 {n} 種業態…', none: '找不到符合的業主', own: '本店', title: '展示切換', sub: '給評審與老闆用：切換業主、風格與語言', merchant: '業主（同一套後台、各自的前台）', theme: '風格', auto: '自動', autoSub: '依節慶與時間', deco: '動態裝飾', lang: '語言', studio: '到網站設計工作室編輯', now: '目前風格：{t}', autoTag: '（自動）', reason_festival: '節慶期間', reason_night: '晚上 {a}:00–{b}:00 夜間模式', reason_default: '業主預設風格', reason_manual: '手動指定', sim: '模擬時間', demo: '所有業主皆為虛構示範', custom: 'AI 自訂' },
  en: { search: 'Search {n} businesses…', none: 'No matching business', own: 'Own', title: 'Showcase', sub: 'For judges & owners: switch business, theme and language', merchant: 'Business (one back office, own storefront)', theme: 'Theme', auto: 'Auto', autoSub: 'By holiday & time', deco: 'Animated decor', lang: 'Language', studio: 'Edit in Site Studio', now: 'Theme: {t}', autoTag: ' (auto)', reason_festival: 'Holiday period', reason_night: 'Night mode {a}:00–{b}:00', reason_default: 'Business default', reason_manual: 'Set manually', sim: 'Simulated time', demo: 'All businesses are fictional demos', custom: 'AI custom' },
  ja: { search: '{n} 業種を検索…', none: '該当する事業者がありません', own: '自店', title: 'デモ切替', sub: '審査員・オーナー向け：事業者・テーマ・言語を切り替え', merchant: '事業者（共通の管理画面・個別のストア）', theme: 'テーマ', auto: '自動', autoSub: '行事と時間帯で', deco: 'アニメ装飾', lang: '言語', studio: 'サイトスタジオで編集', now: 'テーマ：{t}', autoTag: '（自動）', reason_festival: '行事期間', reason_night: '夜間モード {a}:00〜{b}:00', reason_default: '事業者の既定', reason_manual: '手動設定', sim: '模擬時刻', demo: '事業者はすべて架空のデモです', custom: 'AI カスタム' },
  vi: { search: 'Tìm trong {n} ngành…', none: 'Không tìm thấy', own: 'Của tiệm', title: 'Trình diễn', sub: 'Cho giám khảo & chủ tiệm: đổi doanh nghiệp, giao diện, ngôn ngữ', merchant: 'Doanh nghiệp (chung hệ thống quản lý)', theme: 'Giao diện', auto: 'Tự động', autoSub: 'Theo lễ & giờ', deco: 'Hiệu ứng trang trí', lang: 'Ngôn ngữ', studio: 'Chỉnh trong Site Studio', now: 'Giao diện: {t}', autoTag: ' (tự động)', reason_festival: 'Dịp lễ', reason_night: 'Chế độ đêm {a}:00–{b}:00', reason_default: 'Mặc định của tiệm', reason_manual: 'Chọn thủ công', sim: 'Giờ mô phỏng', demo: 'Tất cả doanh nghiệp đều là demo hư cấu', custom: 'AI tùy chỉnh' },
  ms: { search: 'Cari {n} perniagaan…', none: 'Tiada padanan', own: 'Sendiri', title: 'Pertunjukan', sub: 'Untuk juri & pemilik: tukar perniagaan, tema dan bahasa', merchant: 'Perniagaan (satu konsol, kedai sendiri)', theme: 'Tema', auto: 'Auto', autoSub: 'Ikut perayaan & masa', deco: 'Hiasan animasi', lang: 'Bahasa', studio: 'Sunting di Site Studio', now: 'Tema: {t}', autoTag: ' (auto)', reason_festival: 'Musim perayaan', reason_night: 'Mod malam {a}:00–{b}:00', reason_default: 'Lalai perniagaan', reason_manual: 'Ditetapkan manual', sim: 'Masa simulasi', demo: 'Semua perniagaan ialah demo rekaan', custom: 'AI tersuai' },
};
const fill = (s, v) => String(s).replace(/\{(\w+)\}/g, (_, k) => (v[k] ?? `{${k}}`));
export const mName = (m, l) => (l === 'zh' ? m.name : m.en || m.name);
const copyOf = (l) => (TENANT.copy && (TENANT.copy[l] || TENANT.copy.en)) || genCopy(l);
// 50 種業態中沒有專屬文案的業主：依業態大類與運送模式產生五語文案
export const CAT_LABEL = {
  zh: CATS,
  en: { food: 'Food & snacks', drink: 'Drinks, tea & coffee', dessert: 'Bakery & desserts', retail: 'Retail & select shops', craft: 'Handicrafts', flower: 'Flowers & plants', service: 'Booking services', farm: 'Farm & fresh produce' },
  ja: { food: '飲食・軽食', drink: 'ドリンク・お茶・コーヒー', dessert: 'ベーカリー・スイーツ', retail: '雑貨・セレクト', craft: 'ハンドメイド', flower: '花・植物', service: '予約サービス', farm: '農産物・生鮮' },
  vi: { food: 'Ăn uống', drink: 'Đồ uống, trà, cà phê', dessert: 'Bánh & tráng miệng', retail: 'Bán lẻ', craft: 'Thủ công', flower: 'Hoa & cây', service: 'Dịch vụ đặt lịch', farm: 'Nông sản tươi' },
  ms: { food: 'Makanan', drink: 'Minuman, teh & kopi', dessert: 'Bakeri & pencuci mulut', retail: 'Runcit', craft: 'Kraf tangan', flower: 'Bunga & tumbuhan', service: 'Perkhidmatan temujanji', farm: 'Hasil ladang' },
};
const catLabel = (cat, l) => ((CAT_LABEL[l] || CAT_LABEL.en)[cat] || CATS[cat] || cat || '');
function genCopy(l) {
  const m = TENANT, mode = (m.ship && m.ship.mode) || 'ship', p2 = (PRODUCTS[1] || PRODUCTS[0] || {}).id;
  const pn = p2 ? (l === 'zh' ? PRODUCT_MAP[p2].name : (PRODUCT_MAP[p2].i18n?.[l]?.[0] || PRODUCT_MAP[p2].en || PRODUCT_MAP[p2].name)) : '';
  const owner = ownerOf(l);
  const nm = l === 'zh' ? m.name : (m.en || m.name);
  const tl = m.tagline || '';
  const zhTitle = tl.includes('，') ? tl.replace('，', '，<br>') : (tl.length > 8 ? tl.slice(0, Math.ceil(tl.length / 2)) + '<br>' + tl.slice(Math.ceil(tl.length / 2)) : tl);
  const C = {
    zh: { type: m.typeName, tagline: tl, kicker: `${m.typeName}・一人經營`, title: zhTitle || nm, sub: `${owner}一個人經營「${nm}」，接單、收款、出貨與記帳都交給 GreenUP 自動處理。不知道怎麼選？右下角的 AI 導購會用你的語言幫你挑。`,
      prodTitle: mode === 'service' ? '服務項目' : mode === 'takeout' ? '今日菜單' : '本店商品', prodSub: `${m.typeName}・少量用心，線上下單即時同步到店主後台`, about: `關於${owner}`,
      f: mode === 'service' ? [['完全預約制', '不用排隊、不會被插隊'], ['線上預付', '可用禮券折抵'], ['多語言 AI 預約', '中・英・日・越・馬來文']] : mode === 'takeout' ? [['現點現做', '下單後約 15 分鐘'], ['外帶免排隊', '外送滿 NT$1,500 免運'], ['多語言 AI 點餐', '中・英・日・越・馬來文']] : [['用心選品', `每件都由${owner}親自把關`], ['宅配到府', '滿 NT$1,500 免運'], ['多語言 AI 導購', '中・英・日・越・馬來文']],
      chips: ['推薦人氣商品', mode === 'service' ? '我要預約' : mode === 'takeout' ? '一個人吃什麼？' : '送禮選什麼？', '預算 500 元', mode === 'service' ? '可以改時間嗎？' : mode === 'takeout' ? '外送怎麼算？' : '運費怎麼算？', pn ? `${pn}有什麼特色？` : '有什麼推薦？', '結帳'] },
    en: { type: catLabel(m.cat, 'en'), tagline: catLabel(m.cat, 'en'), kicker: `${catLabel(m.cat, 'en')} · Run solo`, title: `${nm}`, sub: `${owner} runs ${nm} single-handed, with GreenUP automating orders, payments, shipping and bookkeeping. Not sure what to pick? Our AI concierge (bottom right) helps in your language.`,
      prodTitle: mode === 'service' ? 'Services' : mode === 'takeout' ? 'Today’s menu' : 'Our products', prodSub: 'Small batches, made with care. Orders sync live to the owner console', about: `About ${owner}`,
      f: mode === 'service' ? [['Appointment only', 'No queues'], ['Prepay online', 'Gift vouchers accepted'], ['Multilingual AI booking', '中 · EN · 日 · VI · MS']] : mode === 'takeout' ? [['Made to order', 'Ready in ~15 minutes'], ['Skip the queue', 'Free delivery over NT$1,500'], ['Multilingual AI ordering', '中 · EN · 日 · VI · MS']] : [['Hand-picked', `Checked by ${owner}`], ['Home delivery', 'Free over NT$1,500'], ['Multilingual AI help', '中 · EN · 日 · VI · MS']],
      chips: ['Most popular', mode === 'service' ? 'Book a slot' : mode === 'takeout' ? 'Eating alone?' : 'Gift ideas?', 'Budget NT$500', mode === 'service' ? 'Can I reschedule?' : mode === 'takeout' ? 'Delivery fee?' : 'How much is shipping?', pn ? `Tell me about ${pn}` : 'Any recommendations?', 'Checkout'] },
    ja: { type: catLabel(m.cat, 'ja'), tagline: catLabel(m.cat, 'ja'), kicker: `${catLabel(m.cat, 'ja')}・ひとりで営業`, title: `${nm}`, sub: `${owner}がひとりで営む「${nm}」。受注・決済・発送・帳簿はGreenUPが自動化。迷ったら右下のAIスタッフが日本語でご案内します。`,
      prodTitle: mode === 'service' ? 'メニュー' : mode === 'takeout' ? '本日のメニュー' : '商品一覧', prodSub: '少量で丁寧に。ご注文はオーナー管理画面にリアルタイム同期', about: `${owner}について`,
      f: mode === 'service' ? [['完全予約制', '待ち時間なし'], ['オンライン前払い', 'ギフト券も利用可'], ['多言語AI予約', '中・英・日・越・マレー語']] : mode === 'takeout' ? [['注文後に調理', '約15分でご用意'], ['並ばず受け取り', 'NT$1,500以上で配達無料'], ['多言語AI注文', '中・英・日・越・マレー語']] : [['厳選アイテム', `${owner}が一点ずつ確認`], ['宅配', 'NT$1,500以上で送料無料'], ['多言語AI対応', '中・英・日・越・マレー語']],
      chips: ['人気の商品', mode === 'service' ? '予約したい' : mode === 'takeout' ? 'ひとりなら何がいい？' : 'ギフトは何がいい？', '予算500元', mode === 'service' ? '予約変更できる？' : mode === 'takeout' ? 'デリバリー料金は？' : '送料はいくら？', pn ? `${pn}の特徴は？` : 'おすすめは？', 'お会計'] },
    vi: { type: catLabel(m.cat, 'vi'), tagline: catLabel(m.cat, 'vi'), kicker: `${catLabel(m.cat, 'vi')} · Một người vận hành`, title: `${nm}`, sub: `${owner} tự mình vận hành ${nm}; GreenUP tự động lo đơn hàng, thanh toán, giao hàng và sổ sách. Chưa biết chọn gì? Trợ lý AI (góc dưới bên phải) sẽ tư vấn bằng tiếng Việt.`,
      prodTitle: mode === 'service' ? 'Dịch vụ' : mode === 'takeout' ? 'Thực đơn hôm nay' : 'Sản phẩm', prodSub: 'Số lượng nhỏ, làm tận tâm. Đơn hàng đồng bộ ngay với trang quản lý', about: `Về ${owner}`,
      f: mode === 'service' ? [['Chỉ nhận đặt lịch', 'Không phải xếp hàng'], ['Thanh toán trước', 'Nhận phiếu quà tặng'], ['AI đặt lịch đa ngôn ngữ', 'Trung · Anh · Nhật · Việt · Mã Lai']] : mode === 'takeout' ? [['Gọi là làm', 'Khoảng 15 phút'], ['Mang đi không chờ', 'Giao miễn phí từ NT$1,500'], ['AI gọi món đa ngôn ngữ', 'Trung · Anh · Nhật · Việt · Mã Lai']] : [['Chọn lọc kỹ', `${owner} kiểm tra từng món`], ['Giao tận nhà', 'Miễn phí từ NT$1,500'], ['AI đa ngôn ngữ', 'Trung · Anh · Nhật · Việt · Mã Lai']],
      chips: ['Món được yêu thích', mode === 'service' ? 'Tôi muốn đặt lịch' : mode === 'takeout' ? 'Ăn một mình gọi gì?' : 'Nên tặng quà gì?', 'Ngân sách 500', mode === 'service' ? 'Đổi giờ được không?' : mode === 'takeout' ? 'Phí giao hàng?' : 'Phí giao hàng?', pn ? `${pn} có gì đặc biệt?` : 'Gợi ý cho tôi', 'Thanh toán'] },
    ms: { type: catLabel(m.cat, 'ms'), tagline: catLabel(m.cat, 'ms'), kicker: `${catLabel(m.cat, 'ms')} · Diurus seorang`, title: `${nm}`, sub: `${owner} mengurus ${nm} seorang diri; GreenUP mengautomasikan pesanan, bayaran, penghantaran dan akaun. Tidak pasti? Pembantu AI (bawah kanan) bantu dalam bahasa anda.`,
      prodTitle: mode === 'service' ? 'Perkhidmatan' : mode === 'takeout' ? 'Menu hari ini' : 'Produk kami', prodSub: 'Kelompok kecil, dibuat dengan teliti. Pesanan disegerakkan ke konsol pemilik', about: `Tentang ${owner}`,
      f: mode === 'service' ? [['Temujanji sahaja', 'Tiada barisan'], ['Prabayar dalam talian', 'Baucar hadiah diterima'], ['Tempahan AI pelbagai bahasa', 'Cina · EN · Jepun · VI · MS']] : mode === 'takeout' ? [['Dimasak bila dipesan', 'Siap ~15 minit'], ['Tanpa beratur', 'Hantar percuma melebihi NT$1,500'], ['Pesanan AI pelbagai bahasa', 'Cina · EN · Jepun · VI · MS']] : [['Dipilih rapi', `Disemak oleh ${owner}`], ['Hantar ke rumah', 'Percuma melebihi NT$1,500'], ['AI pelbagai bahasa', 'Cina · EN · Jepun · VI · MS']],
      chips: ['Paling popular', mode === 'service' ? 'Saya mahu tempah' : mode === 'takeout' ? 'Makan seorang?' : 'Idea hadiah?', 'Bajet NT$500', mode === 'service' ? 'Boleh tukar masa?' : mode === 'takeout' ? 'Kos penghantaran?' : 'Kos penghantaran?', pn ? `Ceritakan tentang ${pn}` : 'Ada cadangan?', 'Bayar'] },
  };
  return C[l] || C.en;
}
function vars(l) {
  const c = copyOf(l) || {};
  const chips = c.chips || [];
  return { name: mName(TENANT, l), owner: ownerOf(l), ai: l === 'zh' ? (TENANT.aiName || '') : '',
    fee: SHIPPING_FEE.toLocaleString(), free: FREE_SHIP.toLocaleString(), tagline: c.tagline || TENANT.tagline, c0: chips[0] || '', c1: chips[1] || '', c2: chips[2] || '' };
}
// 依業主覆寫的鍵（阿美不覆寫，沿用 i18n.js）
function override(l, key) {
  if (isAmei) return undefined;
  const c = copyOf(l) || {}, g = GEN[l] || GEN.en;
  const f = c.f || [];
  const map = {
    heroKicker: c.kicker, heroTitle: c.title, heroSub: c.sub, prodTitle: c.prodTitle, prodSub: c.prodSub, navAbout: c.about,
    f1: f[0]?.[0], f1d: f[0]?.[1], f2: f[1]?.[0], f2d: f[1]?.[1], f3: f[2]?.[0], f3d: f[2]?.[1], chips: c.chips,
    navProducts: SHIP_MODE === 'takeout' ? g.navMenu : SHIP_MODE === 'service' ? g.navService : undefined,
    navShip: SHIP_MODE === 'service' ? g.navShipService : SHIP_MODE === 'takeout' ? g.navShipTake : undefined,
    add: SHIP_MODE === 'service' ? g.addBook : undefined, ckTitle: SHIP_MODE === 'service' ? g.ckTitleBook : undefined,
    ckHome: SHIP_MODE === 'takeout' ? g.ckTakeHome : g.ckHome, ckPickup: SHIP_MODE === 'takeout' ? g.ckTakePick : g.ckPickup,
    ckDelivery: SHIP_MODE === 'takeout' ? g.ckDeliveryTake : SHIP_MODE === 'service' ? g.ckSlot : undefined,
    rShip: g['rShip_' + SHIP_MODE], rStorage: g.rAsk, rAllergen: g.rAsk, rAllergenOne: g.rAsk, rStorageOne: g.rAsk,
  };
  for (const k of ['announce', 'botName', 'botGreet', 'botStrip', 'botStripSub', 'footer', 'cartEmpty', 'okSync', 'rRecommend', 'rGift', 'rLess', 'rBudgetNone', 'rFallback', 'rPaid']) map[k] = g[k];
  return map[key];
}
// 統一翻譯函式：業主覆寫 → GEN（非阿美專用鍵）→ i18n.js
export function T(l, key, v = {}) {
  let s = override(l, key);
  if (s === undefined && !isAmei && GEN[l] && GEN[l][key] !== undefined) s = GEN[l][key];
  if (s === undefined && !isAmei && GEN.en[key] !== undefined && !baseHas(key)) s = GEN.en[key];
  if (s === undefined) return baseT(l, key, v);
  if (Array.isArray(s)) return s;
  const out = fill(s, { ...vars(l), ...v });
  return l === 'en' ? out.replace(/(^|[.!?]\s+)the owner/g, (m, a) => a + 'The owner') : out;
}
const baseHas = (k) => baseT('zh', k) !== k;
export const G = (l, key, v = {}) => fill((GEN[l] && GEN[l][key]) ?? GEN.en[key] ?? GEN.zh[key] ?? key, { ...vars(l), ...v });
export const P = (l, key, v = {}) => fill((PANEL[l] || PANEL.en)[key] ?? PANEL.zh[key] ?? key, v);

// ---------------- 商品顯示設定 ----------------
let cfg = getShopConfig();
const urlTheme = new URLSearchParams(location.search).get('theme');
const urlNow = new URLSearchParams(location.search).get('now'); // 示範／測試：?now=2026-12-20T21:00 模擬時間（不寫入設定）
export function visibleProducts() {
  const ids = Array.isArray(cfg.products) ? cfg.products.filter(id => PRODUCT_MAP[id]) : null;
  let list = ids && ids.length ? ids.map(id => PRODUCT_MAP[id]) : PRODUCTS.slice();
  const f = featuredId();
  if (f) list = [PRODUCT_MAP[f], ...list.filter(p => p.id !== f)];
  return list;
}
export function featuredId() { const f = cfg.featured; return f && PRODUCT_MAP[f] && (!Array.isArray(cfg.products) || !cfg.products.length || cfg.products.includes(f)) ? f : null; }
export const tagsOf = (p) => (isAmei ? null : (p.tags || []).slice(0, 2));

// ---------------- 預約時段（美甲） ----------------
const WEEK = { zh: '日一二三四五六', en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], ja: '日月火水木金土', vi: ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'], ms: ['Ahd', 'Isn', 'Sel', 'Rab', 'Kha', 'Jum', 'Sab'] };
const TIMES = ['11:00', '13:00', '15:00', '17:00', '19:00'];
export function slotDays() {
  const out = []; const d = new Date(); d.setHours(0, 0, 0, 0);
  while (out.length < 6) { d.setDate(d.getDate() + 1); if (d.getDay() === 0 || d.getDay() === 1) continue; out.push(new Date(d)); }
  return out.map(day => { const rng = mulberry32(day.getDate() * 97 + day.getMonth() * 13); return { day, taken: TIMES.filter(() => rng() < 0.38) }; });
}
export const dayLabel = (day, l) => { const w = WEEK[l] || WEEK.en; return `${day.getMonth() + 1}/${day.getDate()}（${w[day.getDay()]}）`.replace('（', l === 'zh' || l === 'ja' ? '（' : ' (').replace('）', l === 'zh' || l === 'ja' ? '）' : ')'); };
export const TIME_SLOTS = TIMES;
let slot = null;
export function getSlot() { if (!slot) { const d = slotDays()[0]; slot = { day: d.day, time: TIMES.find(x => !d.taken.includes(x)) || TIMES[0] }; } return slot; }
export function setSlot(s) { slot = s; emit('slot'); }

// ---------------- 事件 ----------------
const subs = new Set();
export function onStorefront(fn) { subs.add(fn); return () => subs.delete(fn); }
function emit(kind) { subs.forEach(fn => { try { fn(kind); } catch (e) { console.warn(e); } }); }

// ---------------- 風格套用 ----------------
let current = null; // { theme, auto, reason }
let heroApi = null, shopRef = null;
export const currentTheme = () => current;
const cfgRaw = () => cfg;
function computeTheme() {
  const cfg = urlNow ? { ...cfgRaw(), simNow: urlNow } : cfgRaw();
  if (urlTheme && (getTheme(urlTheme, cfg) || urlTheme === 'auto')) return resolveTheme({ ...cfg, theme: urlTheme }, TENANT);
  return resolveTheme(cfg, TENANT);
}
function paintTheme(theme) {
  const b = document.body, vs = themeVars(theme);
  for (const [k, v] of Object.entries(vs)) b.style.setProperty(k, v);
  b.dataset.theme = theme.id;
  b.classList.toggle('sf-dark', !!theme.dark);
  const meta = document.querySelector('meta[name="theme-color"]') || document.head.appendChild(Object.assign(document.createElement('meta'), { name: 'theme-color' }));
  meta.content = theme.vars.cream;
  buildDeco(theme);
  renderFest(theme);
  if (heroApi && heroApi.setLook) heroApi.setLook({ ...theme.hero, vars: theme.vars });
}
function applyTheme(next, animate) {
  const prev = current; current = next;
  const sig = (r) => JSON.stringify([r.theme.id, r.theme.vars, r.theme.deco, r.theme.overlay || '', r.theme.festival || '']);
  const changed = !prev || sig(prev) !== sig(next);
  if (changed) {
    if (animate && prev && gsap) curtain(next.theme, () => paintTheme(next.theme));
    else paintTheme(next.theme);
  }
  renderNow(); renderPanel();
  if (changed) emit('theme');
}

// 轉場：以新風格的深色從面板位置圓形展開，再收起
function curtain(theme, mid, { label = '', keep = false } = {}) {
  const v = theme.vars;
  const c = el(`<div class="sf-curtain" aria-hidden="true"><div class="sf-cur-in"><span class="sf-cur-logo">${merchantLogo(TENANT, 64)}</span><b>${esc(label || themeName(theme, lang()))}</b></div></div>`);
  c.style.background = `radial-gradient(circle at 30% 30%, ${v.gl}, ${v.deep} 70%)`;
  document.body.appendChild(c);
  const pill = $('.sf-pill'); const r = pill ? pill.getBoundingClientRect() : { left: 40, top: innerHeight - 40, width: 0, height: 0 };
  const x = r.left + r.width / 2, y = r.top + r.height / 2, R = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y)) + 40;
  if (REDUCED) { c.style.clipPath = 'none'; gsap.fromTo(c, { opacity: 0 }, { opacity: 1, duration: 0.15, onComplete: () => { mid(); if (!keep) gsap.to(c, { opacity: 0, duration: 0.25, onComplete: () => c.remove() }); } }); return c; }
  const tl = gsap.timeline();
  tl.fromTo(c, { clipPath: `circle(0px at ${x}px ${y}px)` }, { clipPath: `circle(${R}px at ${x}px ${y}px)`, duration: 0.55, ease: 'power3.inOut' })
    .fromTo($('.sf-cur-in', c), { opacity: 0, y: 14, scale: 0.92 }, { opacity: 1, y: 0, scale: 1, duration: 0.3 }, '-=0.2')
    .add(() => mid());
  if (!keep) tl.to($('.sf-cur-in', c), { opacity: 0, duration: 0.2, delay: 0.25 }).to(c, { clipPath: `circle(0px at ${innerWidth - x}px ${innerHeight - y}px)`, duration: 0.6, ease: 'power3.inOut', onComplete: () => c.remove() });
  return c;
}
const lang = () => (shopRef ? shopRef.lang : 'zh');

// 切換業主：轉場後重新載入（各業主資料隔離）
export function switchTenant(id) {
  if (id === TENANT_ID) return;
  const m = TENANTS.find(x => x.id === id); if (!m) return;
  try { sessionStorage.setItem('sf-arrive', '1'); } catch { /* ignore */ }
  const th = resolveTheme(cfg.theme === 'auto' ? { theme: 'auto' } : { theme: m.theme }, m).theme;
  if (!gsap) { setTenant(id); return; }
  const c = curtain(th, () => setTenant(id), { label: mName(m, lang()), keep: true });
  const logo = $('.sf-cur-logo', c); if (logo) logo.innerHTML = merchantLogo(m, 64);
}

// ---------------- 動態裝飾 ----------------
const LS_DECO = 'greenup-solo:shop-deco';
function decoOn() { try { const v = localStorage.getItem(LS_DECO); return v == null ? !REDUCED : v === '1'; } catch { return !REDUCED; } }
const DECO_SVG = {
  lantern: '<svg viewBox="0 0 24 34"><rect x="9" y="0" width="6" height="3" rx="1" fill="#7a4a1a"/><path d="M5 5 Q12 1 19 5 L20 26 Q12 31 4 26 Z" fill="#ffb347"/><path d="M5 5 Q12 1 19 5 L20 26 Q12 31 4 26 Z" fill="url(#none)" opacity=".2"/><path d="M8 6 L7.5 26 M12 4 V28 M16 6 L16.5 26" stroke="#e8743a" stroke-width=".8" opacity=".6"/><ellipse cx="12" cy="16" rx="5" ry="8" fill="#fff1c4" opacity=".55"/></svg>',
  redlantern: '<svg viewBox="0 0 40 70"><path d="M20 0 V10" stroke="#b5161f" stroke-width="2"/><rect x="13" y="9" width="14" height="5" rx="1.5" fill="#e0a526"/><ellipse cx="20" cy="32" rx="17" ry="18" fill="#d4232f"/><path d="M8 32 Q20 10 32 32 Q20 54 8 32" fill="none" stroke="#ff6a5a" stroke-width="1.2" opacity=".7"/><path d="M20 14 V50" stroke="#ff6a5a" stroke-width="1" opacity=".6"/><text x="20" y="37" text-anchor="middle" font-size="13" font-weight="900" fill="#ffd56a">福</text><rect x="13" y="49" width="14" height="5" rx="1.5" fill="#e0a526"/><path d="M16 54 V68 M20 54 V70 M24 54 V68" stroke="#e0a526" stroke-width="1.6"/></svg>',
  petal: '<svg viewBox="0 0 20 20"><path d="M10 1 C16 5 17 13 10 19 C3 13 4 5 10 1Z" fill="currentColor"/></svg>',
  leaf: '<svg viewBox="0 0 20 20"><path d="M2 18 C2 8 8 2 18 2 C18 12 12 18 2 18Z" fill="currentColor"/><path d="M3 17 L15 5" stroke="#fff" stroke-opacity=".5" stroke-width="1"/></svg>',
  sparkle: '<svg viewBox="0 0 20 20"><path d="M10 0 L12 8 L20 10 L12 12 L10 20 L8 12 L0 10 L8 8Z" fill="currentColor"/></svg>',
  bean: '<svg viewBox="0 0 20 20"><ellipse cx="10" cy="10" rx="6" ry="8.5" transform="rotate(25 10 10)" fill="currentColor"/><path d="M7 4 Q12 9 8 11 Q4 13 12 17" transform="rotate(10 10 10)" stroke="#000" stroke-opacity=".35" stroke-width="1.4" fill="none"/></svg>',
};
function buildDeco(theme) {
  let host = $('#sfDeco');
  if (!host) { host = el('<div id="sfDeco" class="sf-deco" aria-hidden="true"></div>'); document.body.appendChild(host); }
  host.innerHTML = ''; host.className = 'sf-deco';
  let front = $('#sfDecoFront');
  if (!front) { front = el('<div id="sfDecoFront" class="sf-deco sf-deco-front" aria-hidden="true"></div>'); document.body.appendChild(front); }
  front.innerHTML = '';
  const kind = theme.deco; if (!kind || !decoOn()) return;
  host.classList.add('dkh-' + kind);
  const mobile = innerWidth < 700, rng = mulberry32(kind.length * 991);
  const R = (a, b) => a + rng() * (b - a);
  const add = (cls, style, html = '') => host.insertAdjacentHTML('beforeend', `<i class="${cls}" style="${style}">${html}</i>`);
  const n = (k) => Math.round(k * (mobile ? 0.5 : 1));
  if (kind === 'snow') for (let i = 0; i < n(36); i++) add('dk-fall', `left:${R(0, 100)}%;--s:${R(4, 10)}px;--d:${R(9, 18)}s;--dl:-${R(0, 18)}s;--sway:${R(-40, 40)}px;opacity:${R(0.5, 0.95)}`);
  if (kind === 'petal') for (let i = 0; i < n(18); i++) add('dk-fall dk-rot', `left:${R(0, 100)}%;--s:${R(10, 18)}px;--d:${R(12, 22)}s;--dl:-${R(0, 22)}s;--sway:${R(-80, 80)}px;color:${['#f2a7b8', '#e86f8b', '#ffd1dc', '#f7c6d4'][i % 4]}`, DECO_SVG.petal);
  if (kind === 'leaf') for (let i = 0; i < n(14); i++) add('dk-fall dk-rot', `left:${R(0, 100)}%;--s:${R(12, 20)}px;--d:${R(14, 24)}s;--dl:-${R(0, 24)}s;--sway:${R(-90, 90)}px;color:${['#6fa36b', '#4f9a5e', '#9fcf7a'][i % 3]};opacity:.75`, DECO_SVG.leaf);
  if (kind === 'steam') for (let i = 0; i < n(10); i++) add('dk-fall dk-rot', `left:${R(0, 100)}%;--s:${R(12, 18)}px;--d:${R(18, 28)}s;--dl:-${R(0, 28)}s;--sway:${R(-50, 50)}px;color:${['#6b3e26', '#8c5a3c', '#3b2416'][i % 3]};opacity:.35`, DECO_SVG.bean);
  if (kind === 'sparkle' || kind === 'star' || kind === 'lantern') for (let i = 0; i < n(kind === 'sparkle' ? 16 : 30); i++) add('dk-twinkle', `left:${R(0, 100)}%;top:${R(0, 100)}%;--s:${R(6, kind === 'sparkle' ? 14 : 10)}px;--d:${R(2.5, 5)}s;--dl:-${R(0, 5)}s;color:${kind === 'sparkle' ? theme.vars.rose : '#fff6d0'}`, DECO_SVG.sparkle);
  if (kind === 'star') add('dk-shoot', 'top:12%;left:70%');
  if (kind === 'lantern') for (let i = 0; i < n(9); i++) add('dk-rise', `left:${R(2, 96)}%;--s:${R(18, 34)}px;--d:${R(22, 36)}s;--dl:-${R(0, 36)}s;--sway:${R(-60, 60)}px`, DECO_SVG.lantern);
  if (kind === 'redlantern') {
    ['left:1.5%', 'right:1.5%'].forEach((pos, i) => front.insertAdjacentHTML('beforeend', `<i class="dk-hang" style="${pos};--s:${mobile ? 34 : 52}px;--dl:-${i * 1.3}s">${DECO_SVG.redlantern}</i>`));
    for (let i = 0; i < n(22); i++) add('dk-fall dk-rot', `left:${R(0, 100)}%;--s:${R(6, 11)}px;--d:${R(10, 18)}s;--dl:-${R(0, 18)}s;--sway:${R(-40, 40)}px;color:${['#e0a526', '#ffd56a', '#d4232f'][i % 3]}`, DECO_SVG.sparkle);
  }
  if (kind === 'bubble') for (let i = 0; i < n(22); i++) add('dk-rise dk-bubble', `left:${R(0, 100)}%;--s:${R(8, 26)}px;--d:${R(12, 22)}s;--dl:-${R(0, 22)}s;--sway:${R(-40, 40)}px`);
}
function setDeco(on) { try { localStorage.setItem(LS_DECO, on ? '1' : '0'); } catch { /* ignore */ } if (current) buildDeco(current.theme); renderPanel(); }

// ---------------- 節日特價（promo.js）：價格標示 ----------------
const SALE = {
  zh: { until: '到 {d}', sale: '特價', orig: '原價', live: '{b}進行中・{n} 項商品特價，到 {d}' },
  en: { until: 'until {d}', sale: 'Sale', orig: 'Was', live: '{b} on now · {n} items on sale until {d}' },
  ja: { until: '{d}まで', sale: 'セール', orig: '通常価格', live: '{b}開催中・{n}品がセール（{d}まで）' },
  vi: { until: 'đến {d}', sale: 'Giảm giá', orig: 'Giá gốc', live: '{b} đang diễn ra · {n} món giảm giá đến {d}' },
  ms: { until: 'hingga {d}', sale: 'Jualan', orig: 'Harga asal', live: '{b} sedang berlangsung · {n} item jualan hingga {d}' },
};
const SALE_BADGE = {
  midautumn: ['中秋特價', 'Mid-Autumn sale', '中秋セール', 'Giảm giá Trung thu', 'Jualan Pertengahan Musim Luruh'],
  double11: ['雙11 限定', '11.11 deal', '11.11 限定', 'Ưu đãi 11.11', 'Tawaran 11.11'],
  xmas: ['聖誕特價', 'Christmas sale', 'クリスマスセール', 'Giảm giá Giáng sinh', 'Jualan Krismas'],
  newyear: ['跨年特價', 'New Year sale', '年越しセール', 'Giảm giá năm mới', 'Jualan Tahun Baru'],
  cny: ['新春特價', 'Lunar New Year sale', '旧正月セール', 'Giảm giá Tết', 'Jualan Tahun Baru Cina'],
  valentine: ['情人節特價', 'Valentine’s sale', 'バレンタインセール', 'Giảm giá Valentine', 'Jualan Valentine'],
  mother: ['母親節特價', 'Mother’s Day sale', '母の日セール', 'Giảm giá Ngày của Mẹ', 'Jualan Hari Ibu'],
  dragon: ['端午特價', 'Dragon Boat sale', '端午セール', 'Giảm giá Tết Đoan Ngọ', 'Jualan Perahu Naga'],
  father: ['父親節特價', 'Father’s Day sale', '父の日セール', 'Giảm giá Ngày của Cha', 'Jualan Hari Bapa'],
  anniv: ['週年慶', 'Anniversary sale', '周年セール', 'Giảm giá kỷ niệm', 'Jualan ulang tahun'],
};
const LI = { zh: 0, en: 1, ja: 2, vi: 3, ms: 4 };
const fidOf = (badge, name) => (FESTIVALS.find(f => f.badge === badge || f.name === name) || {}).id;
export function saleBadge(info, l) { if (!info) return ''; const fid = fidOf(info.badge, info.name); return fid && SALE_BADGE[fid] ? SALE_BADGE[fid][LI[l] ?? 1] : (l === 'zh' ? info.badge : (SALE[l] || SALE.en).sale); }
const md = (s) => { const [, m, d] = String(s).split('-').map(Number); return `${m}/${d}`; };
export const saleUntil = (info, l) => (info ? fill((SALE[l] || SALE.en).until, { d: md(info.to) }) : '');
export const saleLabel = (l, k) => (SALE[l] || SALE.en)[k];
export const promoOf = (p) => { try { return promoInfo(p); } catch { return null; } };
// 價格：特價時「原價刪除線＋特價強調」
export function priceHTML(p, l, money) {
  const info = promoOf(p);
  if (!info) return `<b class="pz-now">${money(p.price)}</b>`;
  return `<span class="pz"><s title="${esc(saleLabel(l, 'orig'))}">${money(info.list)}</s><b class="pz-now sale">${money(info.price)}</b></span>`;
}
export function saleTag(p, l, cls = 'p-sale') { const info = promoOf(p); return info ? `<span class="${cls}">${esc(saleBadge(info, l))}<small>${esc(saleUntil(info, l))}</small></span>` : ''; }
function liveSale(l) {
  try {
    const list = activePromos(); if (!list.length) return null;
    const ids = PRODUCTS.filter(p => promoOf(p)).length; if (!ids) return null;
    const pr = list[0]; const fid = fidOf(pr.badge, pr.name);
    return { fid, text: fill((SALE[l] || SALE.en).live, { b: fid && SALE_BADGE[fid] ? SALE_BADGE[fid][LI[l] ?? 1] : pr.badge, n: ids, d: md(pr.to) }) };
  } catch { return null; }
}

// ---------------- 節慶緞帶（節慶期間顯示在導覽列下方） ----------------
const FEST_TXT = {
  midautumn: { zh: '中秋快樂・月圓人團圓，節慶禮盒熱賣中', en: 'Happy Mid-Autumn Festival · Festive gift sets now available', ja: '中秋節おめでとうございます・季節のギフト販売中', vi: 'Chúc mừng Trung thu · Quà lễ đang được bán', ms: 'Selamat Hari Pertengahan Musim Luruh · Set hadiah perayaan kini tersedia' },
  xmas: { zh: '聖誕快樂・交換禮物就找我們', en: 'Merry Christmas · Gifts for every exchange', ja: 'メリークリスマス・プレゼント選びはお任せ', vi: 'Giáng sinh an lành · Quà tặng cho mọi người', ms: 'Selamat Hari Krismas · Hadiah untuk semua' },
  cny: { zh: '新春快樂・恭喜發財，年節限定開賣', en: 'Happy Lunar New Year · New Year specials', ja: '旧正月おめでとう・新春限定販売中', vi: 'Chúc mừng năm mới · Ưu đãi Tết', ms: 'Gong Xi Fa Cai · Edisi Tahun Baru' },
  summer: { zh: '夏日限定・清涼一夏', en: 'Summer specials · Stay cool', ja: '夏季限定・涼しい夏を', vi: 'Ưu đãi mùa hè · Mát lạnh cả mùa', ms: 'Edisi musim panas · Kekal segar' },
};
const FEST_IC = {
  midautumn: '<svg width="18" height="18" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="#ffe08a"/><circle cx="9" cy="10" r="1.6" fill="#f2c14e"/><circle cx="14" cy="14" r="1.2" fill="#f2c14e"/></svg>',
  xmas: '<svg width="18" height="18" viewBox="0 0 24 24" stroke="#fff" stroke-width="2" stroke-linecap="round"><path d="M12 2v20M3.3 7l17.4 10M3.3 17L20.7 7"/></svg>',
  cny: '<svg width="18" height="18" viewBox="0 0 24 24"><ellipse cx="12" cy="13" rx="8" ry="8.5" fill="#ff4d4d"/><rect x="9" y="3" width="6" height="3" rx="1" fill="#ffd56a"/><text x="12" y="17" text-anchor="middle" font-size="9" font-weight="900" fill="#ffd56a">福</text></svg>',
  summer: '<svg width="18" height="18" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5" fill="#ffd84d"/><g stroke="#ffd84d" stroke-width="2" stroke-linecap="round"><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2"/></g></svg>',
};
function renderFest(theme) {
  const fid = theme.festival || (theme.kind === 'festival' ? theme.id : null);
  const l = lang();
  const sale = liveSale(l);
  let n = $('#sfFest');
  const greet = fid && FEST_TXT[fid] ? (FEST_TXT[fid][l] || FEST_TXT[fid].en) : '';
  if (!greet && !sale) { if (n) n.remove(); return; }
  if (!n) { n = el('<div class="sf-fest" id="sfFest" role="note"></div>'); const nav = $('.s-nav'); if (nav) nav.after(n); else return; }
  const sf = sale ? sale.fid : fid;
  const fv = (THEME_MAP[sf] || THEME_MAP[fid] || theme).vars;
  const ic = FEST_IC[sf] || '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z"/><circle cx="7.5" cy="7.5" r="1.5" fill="#fff"/></svg>';
  // 底色用業主自己的深色（保留品牌），節慶色只做邊線點綴
  const tv = theme.vars;
  n.style.background = `linear-gradient(90deg, ${tv.deep}, color-mix(in srgb, ${tv.deep} 70%, ${fv.rose}), ${tv.deep})`;
  n.style.boxShadow = `inset 0 -2px 0 ${fv.gl}`;
  n.innerHTML = `<span>${ic}</span><b>${esc(sale ? sale.text : greet)}</b><span>${ic}</span>`;
}
export function refreshFest() { if (current) renderFest(current.theme); }

// ---------------- 品牌與頁面標頭 ----------------
function renderBrand(l) {
  const b = $('.s-brand'); if (!b) return;
  const main = l === 'zh' ? TENANT.name : (TENANT.en || TENANT.name), sub = l === 'zh' ? (TENANT.en || '') : TENANT.name;
  b.innerHTML = `<span class="s-logo">${isAmei ? '<svg viewBox="0 0 40 40" width="40" height="40"><circle cx="20" cy="20" r="19" fill="#F7B2C4"/><circle cx="20" cy="20" r="13" fill="#fff6e8"/><path d="M20 10c4 2 6 5.5 5.4 9.6-.6 3.6-3.1 5.9-5.4 5.9s-4.8-2.3-5.4-5.9C14 15.5 16 12 20 10z" fill="#2DB674"/></svg>' : merchantLogo(TENANT, 40)}</span><span><b>${esc(main)}</b><small>${esc(sub)}</small></span>`;
  document.title = `${TENANT.name}｜${TENANT.en || ''}`;
  const desc = document.querySelector('meta[name="description"]');
  if (desc && !isAmei) desc.content = `${TENANT.name}銷售網頁（GreenUP 原型示範，虛構業主）。多語言、AI 導購，結帳即時同步到店主後台。`;
  if (!isAmei) {
    const ic = document.querySelector('link[rel="icon"]');
    if (ic) ic.href = 'data:image/svg+xml,' + encodeURIComponent(merchantLogo(TENANT, 32).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" '));
  }
  const al = $('.admin-link'); if (al) al.href = `index.html?tenant=${TENANT_ID}#dashboard`;
}

// ---------------- 目前風格標示 ----------------
function nowText(l) {
  if (!current) return '';
  const nm = current.theme.id === 'custom' ? P(l, 'custom') : themeName(current.theme, l);
  return P(l, 'now', { t: nm }) + (current.auto ? P(l, 'autoTag') : '');
}
function reasonText(l) {
  if (!current) return '';
  const night = Object.assign({ from: 19, to: 6 }, cfg.night);
  let s = P(l, 'reason_' + current.reason, { a: night.from, b: String(night.to).padStart(2, '0') });
  if (current.reason === 'festival' && current.row) s += ` ${current.row.from.slice(5).replace('-', '/')}–${current.row.to.slice(5).replace('-', '/')}`;
  if (cfg.simNow) { const d = nowOf(cfg); s += ` · ${P(l, 'sim')} ${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; }
  return s;
}
function renderNow() {
  let n = $('#sfNow');
  if (!n) { n = el('<div class="sf-now" id="sfNow" role="status"></div>'); const a = $('.announce'); if (a) a.after(n); else document.body.prepend(n); }
  const l = lang();
  n.innerHTML = `<i></i><span>${esc(nowText(l))}</span><small>${esc(reasonText(l))}</small>`;
  const pn = $('.sf-pill small'); if (pn) pn.textContent = nowText(l);
}

// ---------------- 展示切換面板 ----------------
const LS_PANEL = 'greenup-solo:shop-panel';
let panelOpen = false;
function renderPanel() {
  const host = $('#sfPanel'); if (!host || !shopRef) return;
  const l = lang();
  const pill = `<button class="sf-pill" id="sfPill" aria-expanded="${panelOpen}"><span class="sf-pill-ic"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><circle cx="13.5" cy="6.5" r="1.5"/><circle cx="17.5" cy="10.5" r="1.5"/><circle cx="8.5" cy="7.5" r="1.5"/><circle cx="6.5" cy="12.5" r="1.5"/><path d="M12 2a10 10 0 1 0 0 20c1.1 0 2-.9 2-2 0-.5-.2-1-.5-1.3-.3-.4-.5-.8-.5-1.3 0-1.1.9-2 2-2h2.4A5.6 5.6 0 0 0 22 9.8C22 5.5 17.5 2 12 2z"/></svg></span><span class="sf-pill-t"><b>${esc(P(l, 'title'))}</b><small>${esc(nowText(l))}</small></span><span class="sf-pill-chev">${panelOpen ? '✕' : '▴'}</span></button>`;
  if (!panelOpen) { host.innerHTML = pill; bindPanel(host); return; }
  const custom = cfg.custom ? getTheme('custom', cfg) : null;
  const own = THEME_MAP[TENANT.theme];
  const themes = [...(own ? [own] : []), ...CORE_THEMES.filter(t => t !== own), ...FESTIVAL_THEMES, ...(custom ? [custom] : [])];
  const sel = cfg.theme || 'auto';
  host.innerHTML = `${pill}<div class="sf-card" role="dialog" aria-label="${esc(P(l, 'title'))}">
    <div class="sf-card-h"><b>${esc(P(l, 'title'))}</b><small>${esc(P(l, 'sub'))}</small></div>
    <h5>${esc(P(l, 'merchant'))}</h5>
    <label class="sf-q"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><input id="sfMerQ" type="search" placeholder="${esc(P(l, 'search', { n: TENANTS.length }))}" value="${esc(merQ)}" autocomplete="off"></label>
    <div class="sf-mers" id="sfMers">${merchantList(l)}</div>
    <h5>${esc(P(l, 'theme'))}<em>${esc(reasonText(l))}</em></h5>
    <div class="sf-themes">
      <button class="sf-th sf-th-auto ${sel === 'auto' ? 'on' : ''}" data-t="auto"><span class="sf-sw auto"><i></i></span><b>${esc(P(l, 'auto'))}</b><small>${esc(P(l, 'autoSub'))}</small></button>
      ${themes.map(t => `<button class="sf-th ${sel === t.id ? 'on' : ''} ${current && current.theme.id === t.id ? 'live' : ''}" data-t="${t.id}"><span class="sf-sw" style="background:linear-gradient(135deg, ${t.vars.cream} 0 40%, ${t.vars.gl} 40% 70%, ${t.vars.deep} 70%)"></span><b>${esc(t.id === 'custom' ? P(l, 'custom') : themeName(t, l))}</b>${t.kind === 'festival' ? '<small>★</small>' : t === own ? `<small>${esc(P(l, 'own'))}</small>` : ''}</button>`).join('')}
    </div>
    <div class="sf-row"><span>${esc(P(l, 'deco'))}</span><button class="sf-switch ${decoOn() ? 'on' : ''}" id="sfDecoBtn" role="switch" aria-checked="${decoOn()}"><i></i></button></div>
    <div class="sf-row"><span>${esc(P(l, 'lang'))}</span><div class="sf-langs">${LANGS.map(x => `<button data-l="${x.id}" class="${x.id === l ? 'on' : ''}" title="${esc(x.label)}">${x.short}</button>`).join('')}</div></div>
    <div class="sf-card-f"><a href="index.html?tenant=${TENANT_ID}#studio" target="greenup-admin">${esc(P(l, 'studio'))} ↗</a><small>${esc(P(l, 'demo'))}</small></div>
  </div>`;
  bindPanel(host);
}
let merQ = '';
function merchantList(l) {
  const q = merQ.trim().toLowerCase();
  const hit = (m) => !q || [m.name, m.en, m.typeName, m.id, catLabel(m.cat, l), m.tagline].some(x => x && String(x).toLowerCase().includes(q));
  const order = Object.keys(CATS);
  const groups = order.map(c => [c, TENANTS.filter(m => (m.cat || 'retail') === c && hit(m))]).filter(([, ms]) => ms.length);
  if (!groups.length) return `<p class="sf-none">${esc(P(l, 'none'))}</p>`;
  return groups.map(([c, ms]) => `<div class="sf-grp"><h6>${esc(catLabel(c, l))}<span>${ms.length}</span></h6><div class="sf-grp-l">${ms.map(m => `<button class="sf-mer ${m.id === TENANT_ID ? 'on' : ''}" data-m="${m.id}" title="${esc(mName(m, l))}｜${esc(m.typeName || '')}">${merchantLogo(m, 28)}<span>${esc(mName(m, l))}<small>${esc(l === 'zh' ? (m.typeName || '') : catLabel(m.cat, l))}</small></span></button>`).join('')}</div></div>`).join('');
}
function bindMers(host) { $$('[data-m]', host).forEach(b => b.addEventListener('click', () => switchTenant(b.dataset.m))); }
function bindPanel(host) {
  $('#sfPill', host).addEventListener('click', () => {
    panelOpen = !panelOpen; try { localStorage.setItem(LS_PANEL, panelOpen ? '1' : '0'); } catch { /* ignore */ }
    renderPanel();
    if (panelOpen && gsap) gsap.fromTo('.sf-card', { opacity: 0, y: 16, scale: 0.97 }, { opacity: 1, y: 0, scale: 1, duration: 0.35, ease: 'back.out(1.6)' });
  });
  const q = $('#sfMerQ', host);
  if (q) q.addEventListener('input', () => { merQ = q.value; $('#sfMers', host).innerHTML = merchantList(lang()); bindMers(host); });
  bindMers(host);
  $$('[data-t]', host).forEach(b => b.addEventListener('click', () => { setShopConfig({ theme: b.dataset.t }); }));
  const db = $('#sfDecoBtn', host); if (db) db.addEventListener('click', () => setDeco(!decoOn()));
  $$('.sf-langs [data-l]', host).forEach(b => b.addEventListener('click', () => shopRef.setLang(b.dataset.l)));
}

// ---------------- 版面附加區塊（各業主不同） ----------------
export function heroExtra(l) {
  if (SHIP_MODE === 'service') {
    const days = slotDays(), s = getSlot();
    const cur = days.find(d => +d.day === +s.day) || days[0];
    return `<div class="sfx-book"><div class="sfx-bh"><b>${esc(G(l, 'slotPick'))}</b><small>${esc(G(l, 'slotNote'))}</small></div>
      <div class="sfx-days">${days.map(d => `<button data-day="${+d.day}" class="${+d.day === +s.day ? 'on' : ''}">${esc(dayLabel(d.day, l))}</button>`).join('')}</div>
      <div class="sfx-times">${TIMES.map(tm => { const full = cur.taken.includes(tm); return `<button data-time="${tm}" ${full ? 'disabled' : ''} class="${tm === s.time && !full ? 'on' : ''}">${tm}${full ? `<small>${esc(G(l, 'soldOut'))}</small>` : ''}</button>`; }).join('')}</div></div>`;
  }
  if (SHIP_MODE === 'takeout') return `<div class="sfx-take"><span class="sfx-open"><i></i>${esc(G(l, 'open'))}</span><span>⏱ ${esc(G(l, 'ready'))}</span></div>`;
  if (LAYOUT === 'editorial') return `<div class="sfx-issue"><b>No.07</b><span>${esc(G(l, 'issue'))}</span><span>${new Date().getFullYear()}</span></div>`;
  if (LAYOUT === 'atelier') return `<div class="sfx-craft"><span>${esc(G(l, 'craft'))}</span><i></i><span>${esc(G(l, 'ateliers'))}</span></div>`;
  return '';
}
export function bindHeroExtra(root) {
  $$('[data-day]', root).forEach(b => b.addEventListener('click', () => {
    const d = slotDays().find(x => +x.day === +b.dataset.day); const s = getSlot();
    setSlot({ day: d.day, time: d.taken.includes(s.time) ? (TIMES.find(x => !d.taken.includes(x)) || s.time) : s.time });
  }));
  $$('[data-time]', root).forEach(b => b.addEventListener('click', () => { setSlot({ day: getSlot().day, time: b.dataset.time }); }));
}
export const slotText = (l) => { const s = getSlot(); return `${dayLabel(s.day, l)} ${s.time}`; };

// ---------------- 啟動 ----------------
// boot：在第一次渲染前呼叫（套用版面類別、品牌、風格），避免畫面閃動
export function bootStorefront(shop) {
  shopRef = shop;
  const b = document.body;
  b.classList.add('lay-' + LAYOUT, 'tenant-' + TENANT_ID);
  if (PREVIEW) b.classList.add('sf-preview');
  b.dataset.cat = TENANT.cat || '';
  for (const [k, v] of Object.entries(STYLE)) if (v) b.setAttribute('data-sf-' + k, v);
  renderBrand(shop.lang);
  current = null; applyTheme(computeTheme(), false);
}
export function setHero(api) { heroApi = api; if (api && api.setLook && current) api.setLook({ ...current.theme.hero, vars: current.theme.vars }); }

export function initStorefront(shop) {
  shopRef = shop;
  if (!document.body.classList.contains('lay-' + LAYOUT)) bootStorefront(shop);
  try { panelOpen = localStorage.getItem(LS_PANEL) === '1' && innerWidth > 700; } catch { panelOpen = false; }
  if (!PREVIEW) { const p = el('<div class="sf-panel" id="sfPanel"></div>'); document.body.appendChild(p); renderPanel(); }
  renderNow();
  shop.onLang((l) => { renderBrand(l); renderNow(); renderPanel(); if (current) renderFest(current.theme); });

  // 從其他業主切換過來：揭開轉場
  try {
    if (sessionStorage.getItem('sf-arrive') && gsap && !REDUCED) {
      sessionStorage.removeItem('sf-arrive');
      const v = current.theme.vars;
      const c = el(`<div class="sf-curtain"><div class="sf-cur-in"><span class="sf-cur-logo">${merchantLogo(TENANT, 64)}</span><b>${esc(mName(TENANT, shop.lang))}</b></div></div>`);
      c.style.background = `radial-gradient(circle at 30% 30%, ${v.gl}, ${v.deep} 70%)`;
      document.body.appendChild(c);
      gsap.timeline({ delay: 0.15 }).to($('.sf-cur-in', c), { opacity: 0, y: -10, duration: 0.3 })
        .fromTo(c, { clipPath: `circle(${Math.hypot(innerWidth, innerHeight)}px at 50% 50%)` }, { clipPath: 'circle(0px at 50% 50%)', duration: 0.7, ease: 'power3.inOut', onComplete: () => c.remove() });
    }
  } catch { /* ignore */ }

  // 設定變更（後台工作室或本頁面板）
  onShopConfig((next) => {
    const before = JSON.stringify([cfg.products, cfg.featured]);
    cfg = next;
    applyTheme(computeTheme(), true);
    if (JSON.stringify([cfg.products, cfg.featured]) !== before) emit('catalog');
  });
  // 節日特價變更（後台排程、跨分頁）：重新渲染價格與緞帶
  try { onPromos(() => { refreshFest(); emit('catalog'); }); } catch { /* ignore */ }
  // 其他分頁（例如後台工作室）切換了業主：跟著切換
  window.addEventListener('storage', (e) => {
    if (e.key === 'greenup-solo:tenant' && e.newValue && e.newValue !== TENANT_ID && TENANTS.find(m => m.id === e.newValue)) switchTenant(e.newValue);
  });
  // 自動風格：每分鐘重新判斷（跨過 19:00、節慶開始時自動切換）
  setInterval(() => { if ((cfg.theme || 'auto') === 'auto' && !urlTheme) { const n = computeTheme(); if (!current || n.theme.id !== current.theme.id || n.reason !== current.reason) applyTheme(n, true); } }, 60000);
  window.addEventListener('resize', () => { clearTimeout(window.__sfRz); window.__sfRz = setTimeout(() => current && buildDeco(current.theme), 400); });

  return { switchTenant, setTheme: (id) => setShopConfig({ theme: id }), current: () => current, tenant: TENANT_ID };
}
