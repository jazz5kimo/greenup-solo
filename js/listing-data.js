// AI 商品上架：五語文案範本、SEO、分類、同類價格區間、已上架商品統計（全部為示範用模擬資料）
import { PRODUCTS, PRODUCT_MAP, mulberry32 } from './data.js';
import { TENANT } from './tenant.js';
import { productArt } from './art.js';
import { IS_AMEI, CAT, FOODISH, KIT, RECIPES } from './inventory-data.js';

export const LS_LANGS = [
  { id: 'zh', label: '繁中', full: '繁體中文' },
  { id: 'en', label: 'English', full: 'English' },
  { id: 'ja', label: '日本語', full: '日本語' },
  { id: 'vi', label: 'Tiếng Việt', full: 'Tiếng Việt' },
  { id: 'ms', label: 'Bahasa Melayu', full: 'Bahasa Melayu' },
];

// 新品：柚子乳酪塔（尚未在 data.js 商品主檔，成本以 BOM 估算）
const A_NEW_PRODUCT = {
  id: 'yuzu', name: '柚子乳酪塔', unit: '4 入', allergens: ['egg', 'milk', 'gluten'], storage: 'fridge', days: 3,
  color: '#F6C945', accent: '#E89B2A', isNew: true,
};
// 柚子乳酪塔 BOM（每 1 盒 4 入）：[原料 id, 用量]；yuzujam 為新原料，以供應商報價估算
const A_NEW_BOM = {
  lines: [['flour', 0.1], ['butter', 0.05], ['sugar', 0.06], ['egg', 2], ['cheese', 0.1], ['cream', 0.05], ['yuzujam', 0.06], ['cakebox', 1]],
  extra: { yuzujam: { name: '高知柚子果醬', unit: 'kg', cost: 360, cat: 'raw', note: '新原料・供應商報價' } },
  labor: 9, mfg: 6,
};

// 每項商品的五語文案：[名稱, 一句話賣點, 完整介紹]
const A_COPY = {
  yuzu: {
    zh: ['柚子乳酪塔', '日本柚子的清香遇上濃郁乳酪，秋冬限定新品', '以高知產柚子果醬調入北海道奶油乳酪，口感綿密，尾韻帶著柚皮淡淡的微苦清香；塔殼使用發酵奶油烘烤，酥脆輕盈。表面點綴糖漬柚皮絲，冷藏後風味最佳。秋冬限定，4 入一盒，冷藏保存 3 天。'],
    en: ['Yuzu Cheese Tart', 'Fragrant Japanese yuzu meets rich cream cheese – new for autumn & winter.', 'Kochi yuzu marmalade is folded into Hokkaido cream cheese for a velvety filling with a bright citrus lift and a gently bitter peel finish. The cultured-butter crust is light and crisp, topped with candied yuzu zest. Best enjoyed chilled. Autumn–winter limited edition; box of 4 — keep refrigerated and enjoy within 3 days.'],
    ja: ['ゆずチーズタルト', '高知のゆずと濃厚クリームチーズ。秋冬限定の新作です。', '高知産ゆずのマーマレードを北海道産クリームチーズに合わせ、なめらかでコクのあるフィリングに仕上げました。爽やかな香りと、皮のほろ苦さが後を引きます。発酵バターのタルト生地はサクッと軽く、仕上げにゆずピールの砂糖漬けを添えています。秋冬限定・4個入り、要冷蔵で3日以内にお召し上がりください。'],
    vi: ['Bánh tart phô mai yuzu', 'Hương yuzu Nhật thanh mát hòa cùng phô mai béo ngậy – món mới mùa thu đông.', 'Mứt yuzu Kochi được trộn cùng phô mai kem Hokkaido, tạo nên lớp nhân mịn béo với hương cam chanh tươi sáng và hậu vị hơi đắng nhẹ của vỏ. Đế bánh làm từ bơ lên men, giòn nhẹ, phía trên rắc vỏ yuzu ngào đường. Ngon nhất khi dùng lạnh. Phiên bản giới hạn thu đông, hộp 4 cái, bảo quản ngăn mát và dùng trong 3 ngày.'],
    ms: ['Tart Keju Yuzu', 'Yuzu Jepun yang harum bertemu keju krim yang kaya – menu baharu musim luruh & sejuk.', 'Marmalad yuzu dari Kochi dicampur keju krim Hokkaido untuk inti yang lembut dengan kesegaran sitrus dan sedikit rasa pahit kulit yang menyenangkan. Kulit tart mentega berbudaya rangup dan ringan, dihias kulit yuzu bergula. Paling sedap dinikmati sejuk. Edisi terhad musim luruh dan sejuk; sekotak 4 biji, simpan sejuk dan habiskan dalam 3 hari.'],
  },
  lemon: {
    zh: ['檸檬塔', '屏東檸檬每天現擠，酸甜清爽的一口幸福', '選用屏東產地直送的檸檬，每天早上現擠成檸檬凝乳，酸度明亮、甜味收斂；塔殼以發酵奶油低溫烘烤，酥脆不油膩。冷藏後風味最佳，適合下午茶或飯後解膩。4 入一盒，冷藏保存 3 天。'],
    en: ['Lemon Tart', 'Pingtung lemons squeezed fresh every morning – bright and zesty in every bite.', 'We squeeze Pingtung lemons every morning for a silky curd that is tangy but never sharp, then pour it into a cultured-butter crust baked low and slow for a clean, crisp snap. Best served chilled — perfect with afternoon tea or after a rich meal. Box of 4; keep refrigerated and enjoy within 3 days.'],
    ja: ['レモンタルト', '屏東産レモンを毎朝搾った、爽やかな甘酸っぱさ。', '屏東から届くレモンを毎朝搾り、なめらかなレモンカードに仕上げました。酸味は爽やか、甘さは控えめです。発酵バターのタルト生地は低温でじっくり焼き上げ、サクッと軽い食感。冷やしてお召し上がりいただくのがおすすめです。4個入り、要冷蔵で3日以内にお召し上がりください。'],
    vi: ['Bánh tart chanh', 'Chanh Bình Đông vắt tươi mỗi sáng – chua ngọt thanh mát.', 'Chanh Bình Đông được vắt tươi mỗi sáng để làm lớp nhân lemon curd mịn, chua dịu mà không gắt. Đế bánh nướng chậm với bơ lên men, giòn tan mà không ngấy. Ngon nhất khi dùng lạnh, rất hợp với trà chiều hoặc sau bữa ăn. Hộp 4 cái, bảo quản ngăn mát và dùng trong 3 ngày.'],
    ms: ['Tart Lemon', 'Lemon Pingtung diperah segar setiap pagi – masam manis yang menyegarkan.', 'Lemon dari Pingtung diperah setiap pagi untuk menghasilkan curd lemon yang lembut – segar tetapi tidak terlalu masam. Kulit tart dibakar perlahan dengan mentega berbudaya, rangup dan tidak berminyak. Paling sedap dinikmati sejuk bersama teh petang. Sekotak 4 biji; simpan dalam peti sejuk dan habiskan dalam 3 hari.'],
  },
  roll: {
    zh: ['草莓生乳捲', '大湖草莓＋北海道生乳，綿密到入口即化', '戚風蛋糕體只用新鮮雞蛋打發，口感輕盈濕潤；內餡是北海道鮮奶油調成的生乳餡，乳香濃郁卻不膩口，再捲入整顆大湖草莓。草莓季限定，每日少量手作。冷藏保存 2 天，建議收到當天享用。'],
    en: ['Strawberry Cream Roll', 'Dahu strawberries and Hokkaido cream – light as a cloud.', 'Our chiffon sponge is whipped from fresh eggs for a moist, airy crumb, then rolled around a milky Hokkaido fresh-cream filling and whole Dahu strawberries. Rich but never heavy. Made in small batches during strawberry season only. Keep refrigerated and enjoy within 2 days — ideally the day it arrives.'],
    ja: ['いちご生クリームロール', '大湖いちごと北海道生クリーム、ふわっととろける口どけ。', '新鮮な卵だけで泡立てたシフォン生地は、しっとり軽やか。北海道産生クリームのミルキーなクリームと、大湖産の丸ごといちごを巻き込みました。いちごの季節だけの数量限定です。要冷蔵・2日以内、できればお届け当日にお召し上がりください。'],
    vi: ['Bánh cuộn kem dâu', 'Dâu Đại Hồ và kem tươi Hokkaido – mềm nhẹ như mây.', 'Cốt bánh chiffon được đánh bông từ trứng tươi, mềm ẩm và nhẹ. Nhân kem tươi Hokkaido thơm sữa mà không ngấy, cuộn cùng nguyên trái dâu Đại Hồ. Chỉ làm số lượng nhỏ trong mùa dâu. Bảo quản ngăn mát, dùng trong 2 ngày – ngon nhất trong ngày nhận hàng.'],
    ms: ['Gulung Krim Strawberi', 'Strawberi Dahu dan krim Hokkaido – ringan seperti awan.', 'Span chiffon dipukul daripada telur segar, lembap dan gebu. Diisi krim segar Hokkaido yang kaya rasa susu tetapi tidak muak, digulung bersama strawberi Dahu sebiji-sebiji. Dibuat dalam kuantiti kecil sepanjang musim strawberi sahaja. Simpan sejuk dan habiskan dalam 2 hari – paling sedap pada hari diterima.'],
  },
  basque: {
    zh: ['芋泥巴斯克', '大甲芋頭手炒芋泥 × 焦香巴斯克，店裡招牌', '大甲芋頭蒸熟後手工慢炒成綿密芋泥，拌入奶油乳酪以 230°C 高溫烘烤，表面焦糖香氣十足，中心濕潤滑順。冷藏一夜定型後切片最漂亮，6 吋適合 4–6 人分享，生日、聚會送禮都體面。冷藏保存 4 天。'],
    en: ['Taro Basque Cheesecake', 'Hand-stirred Dajia taro meets a burnt Basque top – our signature.', 'Dajia taro is steamed and slowly hand-stirred into a velvety paste, folded into cream cheese and baked at 230°C for a deeply caramelised top and a soft, creamy centre. Rested overnight for clean slices. The 6-inch cake serves 4–6 — lovely for birthdays and gatherings. Keep refrigerated; best within 4 days.'],
    ja: ['タロイモバスクチーズケーキ', '大甲産タロイモ×香ばしいバスク、当店いちばん人気。', '大甲産のタロイモを蒸してから手作業でじっくり練り上げ、クリームチーズと合わせて230°Cの高温で焼き上げました。表面は香ばしく、中はしっとりなめらか。ひと晩寝かせて味をなじませています。6号サイズで4〜6名様向け、誕生日や手土産にもおすすめです。要冷蔵・4日以内。'],
    vi: ['Bánh Basque khoai môn', 'Khoai môn Đại Giáp sên tay × mặt Basque cháy thơm – món đặc trưng.', 'Khoai môn Đại Giáp hấp chín rồi sên tay thật mịn, trộn cùng phô mai kem và nướng ở 230°C cho mặt bánh caramel thơm lừng, bên trong mềm ẩm. Bánh được để qua đêm cho ổn định nên cắt lát rất đẹp. Size 6 inch cho 4–6 người, hợp làm quà sinh nhật. Bảo quản ngăn mát, dùng trong 4 ngày.'],
    ms: ['Kek Keju Basque Keladi', 'Keladi Dajia buatan tangan × permukaan Basque hangit – menu istimewa kami.', 'Keladi Dajia dikukus dan dikacau perlahan dengan tangan hingga lembut, dicampur keju krim lalu dibakar pada 230°C untuk permukaan karamel yang wangi dan inti yang lembap. Direhatkan semalaman supaya mudah dipotong. Saiz 6 inci untuk 4–6 orang, sesuai untuk hari jadi dan hadiah. Simpan sejuk; terbaik dalam 4 hari.'],
  },
  pound: {
    zh: ['烏龍茶磅蛋糕', '凍頂烏龍入蛋糕，低甜茶香、回甘不膩', '將南投凍頂烏龍研磨成細粉打入發酵奶油，出爐後再刷上一層烏龍茶糖液，入口是溫潤的焙火茶香，尾韻微微回甘。甜度比一般磅蛋糕低約三成，長輩也喜歡。常溫保存 7 天，切片微烤更香。'],
    en: ['Oolong Tea Pound Cake', 'Roasted Dong Ding oolong in a less-sweet, buttery loaf.', 'Finely ground Dong Ding oolong from Nantou is beaten into cultured butter, and the warm loaf is brushed with an oolong tea syrup for a toasty, lingering tea finish. About 30% less sweet than a classic pound cake — a favourite with grandparents. Keeps 7 days at room temperature; lightly toast a slice to bring out the aroma.'],
    ja: ['烏龍茶パウンドケーキ', '凍頂烏龍茶を練り込んだ、甘さ控えめの香ばしいパウンド。', '南投産の凍頂烏龍茶を細かく挽いて発酵バターに練り込み、焼き上がりに烏龍茶シロップを染み込ませました。焙煎茶の香ばしさと、ほのかな甘い余韻が楽しめます。一般的なパウンドケーキより甘さ約3割控えめ。常温で7日間保存でき、軽くトーストするとさらに香ります。'],
    vi: ['Bánh bông lan trà ô long', 'Trà ô long Đống Đỉnh rang thơm, ít ngọt, béo mùi bơ.', 'Trà ô long Đống Đỉnh từ Nam Đầu được xay mịn và đánh cùng bơ lên men; bánh vừa ra lò được quét siro trà ô long, mang hương trà rang ấm và hậu vị ngọt nhẹ. Ít ngọt hơn bánh bông lan thường khoảng 30%, người lớn tuổi rất thích. Bảo quản nhiệt độ phòng 7 ngày; nướng lại lát bánh sẽ thơm hơn.'],
    ms: ['Kek Pound Teh Oolong', 'Teh oolong Dong Ding yang dipanggang, kurang manis dan kaya mentega.', 'Teh oolong Dong Ding dari Nantou dikisar halus dan dipukul bersama mentega berbudaya, kemudian kek yang masih panas disapu sirap teh oolong untuk aroma teh panggang yang lembut. Kira-kira 30% kurang manis berbanding kek pound biasa – digemari warga emas. Tahan 7 hari pada suhu bilik; bakar sekejap hirisan kek untuk aroma lebih harum.'],
  },
  cookie: {
    zh: ['手工餅乾禮盒', '六種口味 24 片，常溫 30 天的送禮首選', '奶油原味、伯爵紅茶、可可、抹茶、蔓越莓與綜合堅果六種口味，每片都是手工切片、低溫烘烤，酥鬆不死甜。24 片獨立包裝，方便分送同事與親友。常溫保存 30 天，可寄送海外。'],
    en: ['Handmade Cookie Gift Box', 'Six flavours, 24 pieces – a gift that keeps for 30 days.', 'Classic butter, Earl Grey, cocoa, matcha, cranberry and mixed nut — every cookie is hand-sliced and baked low for a crumbly, not-too-sweet bite. 24 individually wrapped pieces, easy to share with colleagues and friends. Keeps 30 days at room temperature and ships overseas.'],
    ja: ['手作りクッキー詰め合わせ', '6種の味を24枚。常温30日で贈り物にぴったり。', 'バター、アールグレイ、ココア、抹茶、クランベリー、ミックスナッツの6種類。一枚ずつ手で切り分け、低温でじっくり焼いた、ほろっと軽い甘さ控えめのクッキーです。24枚個包装で、職場や友人へのおすそ分けにも便利。常温で30日保存でき、海外発送にも対応しています。'],
    vi: ['Hộp quà bánh quy thủ công', '6 vị, 24 chiếc – món quà để được 30 ngày.', 'Gồm 6 vị: bơ nguyên bản, trà Bá tước, ca cao, matcha, nam việt quất và hạt tổng hợp. Từng chiếc được cắt tay và nướng ở nhiệt độ thấp, giòn xốp và không quá ngọt. 24 chiếc đóng gói riêng, tiện chia cho đồng nghiệp, bạn bè. Bảo quản nhiệt độ phòng 30 ngày, có giao hàng quốc tế.'],
    ms: ['Kotak Hadiah Biskut Buatan Tangan', 'Enam perisa, 24 keping – hadiah yang tahan 30 hari.', 'Mentega asli, Earl Grey, koko, matcha, kranberi dan kacang campuran – setiap keping dihiris dengan tangan dan dibakar perlahan, rangup dan tidak terlalu manis. 24 keping dibungkus berasingan, mudah dikongsi bersama rakan sekerja dan keluarga. Tahan 30 hari pada suhu bilik dan boleh dihantar ke luar negara.'],
  },
  pineapple: {
    zh: ['鳳梨酥禮盒', '土鳳梨酸香內餡、奶香酥皮，伴手禮不出錯', '使用台灣土鳳梨熬煮的內餡，保留果肉纖維與自然酸香，不添加冬瓜；外皮以發酵奶油與日本麵粉製作，入口即化。10 入精緻禮盒，常溫保存 14 天，國內宅配與海外寄送都方便。'],
    en: ['Pineapple Cake Gift Box', 'Real native pineapple filling in a melt-in-your-mouth butter crust.', 'Our filling is slow-cooked from native Taiwanese pineapples — no winter melon — so you taste real fruit fibres and a natural tang. The pastry, made with cultured butter and Japanese flour, melts on the tongue. Box of 10 in an elegant gift box; keeps 14 days at room temperature and travels well overseas.'],
    ja: ['パイナップルケーキ詰め合わせ', '台湾在来種パイナップルの甘酸っぱい餡。定番のお土産に。', '台湾在来種のパイナップルだけを煮詰めた餡は、冬瓜不使用。果肉の繊維と自然な酸味が感じられます。発酵バターと日本産小麦粉の生地は、口の中でほろりとほどけます。10個入りギフトボックス、常温で14日保存でき、海外へのお土産にも最適です。'],
    vi: ['Hộp quà bánh dứa', 'Nhân dứa ta chua thơm, vỏ bánh bơ tan trong miệng.', 'Nhân bánh được sên từ dứa ta Đài Loan, không pha bí đao, giữ nguyên thớ quả và vị chua tự nhiên. Vỏ bánh làm từ bơ lên men và bột mì Nhật, tan ngay trong miệng. Hộp quà 10 cái sang trọng, bảo quản nhiệt độ phòng 14 ngày, tiện làm quà và gửi ra nước ngoài.'],
    ms: ['Kotak Hadiah Kek Nanas', 'Inti nanas tempatan yang masam manis dalam kulit mentega yang cair di mulut.', 'Inti dimasak perlahan daripada nanas tempatan Taiwan – tanpa labu air – jadi anda merasai serat buah sebenar dan rasa masam semula jadi. Kulitnya diperbuat daripada mentega berbudaya dan tepung Jepun, cair di mulut. Kotak hadiah 10 biji; tahan 14 hari pada suhu bilik dan sesuai dibawa ke luar negara.'],
  },
  canele: {
    zh: ['伯爵可麗露', '外殼焦脆、內裡濕潤，伯爵茶香的法式小點', '麵糊加入伯爵茶葉冷藏熟成 24 小時，再以銅模烘烤 60 分鐘：外殼是焦糖般的脆殼，內裡像布丁一樣濕潤綿密，佛手柑茶香在口中慢慢散開。6 入一盒，常溫保存 3 天，食用前以烤箱 180°C 回烤 3 分鐘外殼更脆。'],
    en: ['Earl Grey Canelé', 'Crackly caramel shell, custardy heart, perfumed with Earl Grey.', 'Our batter is steeped with Earl Grey leaves and rested for 24 hours, then baked in copper moulds for a full 60 minutes. The result: a deep caramel crust that crackles, a soft custard-like centre and a gentle bergamot finish. Box of 6; keeps 3 days at room temperature. Re-crisp in a 180°C oven for 3 minutes before serving.'],
    ja: ['アールグレイカヌレ', '外はカリッと、中はもっちり。アールグレイ香るフランス菓子。', 'アールグレイの茶葉を加えた生地を24時間冷蔵で熟成させ、銅型で60分かけて焼き上げました。外はキャラメルのように香ばしくカリッと、中はプリンのようにしっとり。ベルガモットの香りがふわりと広がります。6個入り、常温で3日保存。180°Cのオーブンで3分温め直すと、外側がよりカリッとします。'],
    vi: ['Bánh canelé trà Bá tước', 'Vỏ caramel giòn rụm, ruột mềm như pudding, thơm hương trà Bá tước.', 'Bột bánh được ủ cùng lá trà Bá tước 24 giờ trong ngăn mát, rồi nướng trong khuôn đồng suốt 60 phút. Vỏ ngoài giòn như caramel, bên trong mềm ẩm như pudding, thoảng hương cam bergamot. Hộp 6 cái, bảo quản nhiệt độ phòng 3 ngày. Hâm lại bằng lò 180°C trong 3 phút để vỏ giòn hơn.'],
    ms: ['Canelé Earl Grey', 'Kulit karamel yang rangup, inti lembut seperti puding, wangi Earl Grey.', 'Adunan direndam bersama daun teh Earl Grey dan direhatkan 24 jam, kemudian dibakar dalam acuan tembaga selama 60 minit. Hasilnya kulit karamel yang rangup, inti lembut seperti kastard dan aroma bergamot yang halus. Sekotak 6 biji; tahan 3 hari pada suhu bilik. Panaskan semula dalam ketuhar 180°C selama 3 minit sebelum dihidang.'],
  },
};

// SEO 關鍵字（各語言 4 個商品專屬字）
const A_KW = {
  yuzu: { zh: ['柚子乳酪塔', '柚子甜點', '秋冬限定甜點', '乳酪塔宅配'], en: ['yuzu cheese tart', 'yuzu dessert', 'limited edition', 'cheese tart delivery'], ja: ['ゆずチーズタルト', 'ゆずスイーツ', '秋冬限定', 'お取り寄せ'], vi: ['bánh tart phô mai yuzu', 'bánh yuzu', 'phiên bản giới hạn', 'bánh tart phô mai'], ms: ['tart keju yuzu', 'pencuci mulut yuzu', 'edisi terhad', 'tart keju'] },
  lemon: { zh: ['檸檬塔', '屏東檸檬', '下午茶甜點', '冷藏甜點宅配'], en: ['lemon tart', 'Taiwan dessert delivery', 'afternoon tea', 'citrus tart'], ja: ['レモンタルト', '台湾スイーツ', 'お取り寄せ', 'アフタヌーンティー'], vi: ['bánh tart chanh', 'bánh ngọt Đài Loan', 'trà chiều', 'giao bánh tận nơi'], ms: ['tart lemon', 'pencuci mulut Taiwan', 'minum petang', 'penghantaran kek'] },
  roll: { zh: ['草莓生乳捲', '大湖草莓', '北海道鮮奶油', '草莓季限定'], en: ['strawberry cream roll', 'Swiss roll', 'Hokkaido cream', 'seasonal dessert'], ja: ['いちごロール', '生クリーム', '季節限定', '台湾スイーツ'], vi: ['bánh cuộn dâu', 'kem tươi Hokkaido', 'bánh theo mùa', 'bánh ngọt Đài Loan'], ms: ['kek gulung strawberi', 'krim Hokkaido', 'pencuci mulut bermusim', 'kek Taiwan'] },
  basque: { zh: ['芋泥巴斯克', '大甲芋頭', '生日蛋糕', '6吋蛋糕宅配'], en: ['taro basque cheesecake', 'burnt cheesecake', 'birthday cake', 'Taiwan taro'], ja: ['タロイモ', 'バスクチーズケーキ', '誕生日ケーキ', '台湾スイーツ'], vi: ['bánh basque khoai môn', 'cheesecake cháy', 'bánh sinh nhật', 'khoai môn Đài Loan'], ms: ['kek keju basque', 'kek keladi', 'kek hari jadi', 'kek Taiwan'] },
  pound: { zh: ['烏龍茶磅蛋糕', '凍頂烏龍', '低甜度蛋糕', '長輩伴手禮'], en: ['oolong pound cake', 'tea cake', 'less sweet cake', 'Taiwan tea gift'], ja: ['烏龍茶パウンド', 'パウンドケーキ', '甘さ控えめ', '台湾茶スイーツ'], vi: ['bánh bông lan trà ô long', 'bánh ít ngọt', 'trà Đài Loan', 'quà biếu'], ms: ['kek pound teh oolong', 'kek kurang manis', 'teh Taiwan', 'hadiah'] },
  cookie: { zh: ['手工餅乾禮盒', '公司送禮', '中秋禮盒', '常溫伴手禮'], en: ['cookie gift box', 'corporate gifts', 'handmade cookies', 'Taiwan souvenir'], ja: ['クッキー詰め合わせ', '手土産', '個包装', '台湾お土産'], vi: ['hộp quà bánh quy', 'quà tặng công ty', 'bánh quy thủ công', 'quà Đài Loan'], ms: ['kotak hadiah biskut', 'hadiah korporat', 'biskut buatan tangan', 'cenderahati Taiwan'] },
  pineapple: { zh: ['鳳梨酥禮盒', '土鳳梨酥', '台灣伴手禮', '海外寄送'], en: ['pineapple cake', 'Taiwan souvenir', 'native pineapple', 'gift box'], ja: ['パイナップルケーキ', '台湾土産', '鳳梨酥', 'ギフト'], vi: ['bánh dứa Đài Loan', 'quà Đài Loan', 'bánh dứa ta', 'hộp quà'], ms: ['kek nanas Taiwan', 'cenderahati Taiwan', 'nanas tempatan', 'kotak hadiah'] },
  canele: { zh: ['伯爵可麗露', '法式甜點', '可麗露宅配', '下午茶'], en: ['earl grey canelé', 'French pastry', 'canelé delivery', 'afternoon tea'], ja: ['カヌレ', 'アールグレイ', 'フランス菓子', 'お取り寄せ'], vi: ['bánh canelé', 'bánh Pháp', 'trà Bá tước', 'trà chiều'], ms: ['canelé', 'pastri Perancis', 'teh Earl Grey', 'minum petang'] },
};
const A_GEN_TAGS = {
  zh: ['#阿美手作甜點', '#台灣甜點', '#甜點宅配'],
  en: ['#AmeiSweets', '#TaiwanDessert', '#Handmade'],
  ja: ['#阿美手作甜點', '#台湾スイーツ', '#お取り寄せスイーツ'],
  vi: ['#AmeiSweets', '#BanhDaiLoan', '#BanhHandmade'],
  ms: ['#AmeiSweets', '#PencuciMulutTaiwan', '#BuatanTangan'],
};
export function hashtags(pid, lang) {
  const k = (KW[pid] || KW.yuzu)[lang].slice(0, 3);
  const cjk = lang === 'zh' || lang === 'ja';
  const tag = (s) => '#' + (cjk ? s : s.normalize('NFD')).replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .split(/\s+/).map(w => cjk ? w : w.charAt(0).toUpperCase() + w.slice(1)).join('').replace(/[^\p{L}\p{N}]/gu, '');
  return [...k.map(tag), ...GEN_TAGS[lang]];
}

// 過敏原、保存方式（五語）
export const ALG_I18N = {
  egg: { zh: '蛋', en: 'Egg', ja: '卵', vi: 'Trứng', ms: 'Telur' },
  milk: { zh: '奶', en: 'Milk', ja: '乳', vi: 'Sữa', ms: 'Susu' },
  gluten: { zh: '麩質（小麥）', en: 'Gluten (wheat)', ja: '小麦', vi: 'Gluten (lúa mì)', ms: 'Gluten (gandum)' },
  nuts: { zh: '堅果', en: 'Tree nuts', ja: 'ナッツ類', vi: 'Các loại hạt', ms: 'Kacang' },
};
export const STORE_I18N = {
  fridge: { zh: (d) => `冷藏 0–7°C・${d} 天內食用`, en: (d) => `Keep refrigerated (0–7°C) · within ${d} days`, ja: (d) => `要冷蔵（0〜7°C）・${d}日以内`, vi: (d) => `Bảo quản ngăn mát 0–7°C · dùng trong ${d} ngày`, ms: (d) => `Simpan sejuk 0–7°C · dalam ${d} hari` },
  room: { zh: (d) => `常溫・避免日照・${d} 天內食用`, en: (d) => `Room temperature, away from sunlight · within ${d} days`, ja: (d) => `常温・直射日光を避けて・${d}日以内`, vi: (d) => `Nhiệt độ phòng, tránh nắng · dùng trong ${d} ngày`, ms: (d) => `Suhu bilik, jauh dari cahaya matahari · dalam ${d} hari` },
};
const A_UI_I18N = {
  zh: { alg: '過敏原', keep: '保存', buy: '加入購物車', now: '立即購買', ship: '冷藏宅配・滿 NT$1,500 免運', sold: '已售出', more: '查看商品' },
  en: { alg: 'Allergens', keep: 'Storage', buy: 'Add to cart', now: 'Buy now', ship: 'Chilled delivery · free over NT$1,500', sold: 'sold', more: 'View item' },
  ja: { alg: 'アレルゲン', keep: '保存方法', buy: 'カートに入れる', now: '今すぐ購入', ship: 'クール便・NT$1,500以上送料無料', sold: '販売済み', more: '商品を見る' },
  vi: { alg: 'Chất gây dị ứng', keep: 'Bảo quản', buy: 'Thêm vào giỏ', now: 'Mua ngay', ship: 'Giao lạnh · miễn phí từ NT$1,500', sold: 'đã bán', more: 'Xem sản phẩm' },
  ms: { alg: 'Alergen', keep: 'Penyimpanan', buy: 'Tambah ke troli', now: 'Beli sekarang', ship: 'Penghantaran sejuk · percuma atas NT$1,500', sold: 'terjual', more: 'Lihat produk' },
};

// AI 辨識描述、建議分類與標籤、同類價格區間 [低, 中位, 高]
const A_META = {
  yuzu: { see: '塔殼・淺黃色乳酪餡・糖漬柚皮絲', cat: '冷藏甜點 › 塔派', tags: ['秋冬限定', '新品', '柑橘系', '冷藏宅配'], conf: 94, range: [380, 460, 600], slug: 'yuzu-cheese-tart' },
  lemon: { see: '塔殼・亮黃色凝乳・檸檬片裝飾', cat: '冷藏甜點 › 塔派', tags: ['水果系', '人氣第一', '下午茶', '冷藏宅配'], conf: 98, range: [360, 430, 560], slug: 'lemon-tart' },
  roll: { see: '蛋糕捲・白色鮮奶油・整顆草莓', cat: '冷藏甜點 › 蛋糕捲', tags: ['草莓季限定', '水果系', '每日限量', '冷藏宅配'], conf: 97, range: [480, 560, 720], slug: 'strawberry-roll' },
  basque: { see: '圓形蛋糕・焦糖色表面・紫色芋泥層', cat: '冷藏甜點 › 乳酪蛋糕', tags: ['招牌', '生日蛋糕', '可加購卡片', '送禮'], conf: 95, range: [560, 680, 880], slug: 'taro-basque' },
  pound: { see: '長條蛋糕・茶褐色切面・紙袋包裝', cat: '常溫甜點 › 磅蛋糕', tags: ['低甜度', '茶香', '長輩喜愛', '常溫可寄'], conf: 93, range: [280, 350, 480], slug: 'oolong-pound-cake' },
  cookie: { see: '禮盒・多種餅乾・個別包裝', cat: '禮盒 › 餅乾', tags: ['公司送禮', '個別包裝', '常溫 30 天', '可寄海外'], conf: 96, range: [420, 520, 680], slug: 'cookie-gift-box' },
  pineapple: { see: '方形酥餅・金黃外皮・禮盒', cat: '禮盒 › 鳳梨酥', tags: ['台灣伴手禮', '可寄海外', '長輩喜愛', '節慶禮盒'], conf: 97, range: [380, 480, 650], slug: 'pineapple-cake' },
  canele: { see: '鐘形小點・深焦糖色外殼', cat: '常溫甜點 › 法式小點', tags: ['秋季限定', '茶香', '下午茶', '日本旅客最愛'], conf: 96, range: [320, 400, 540], slug: 'earl-grey-canele' },
};

// 上架通路
export const LS_CH = [
  { id: 'web', name: '官網商品頁', short: '官網', color: '#5EE0C4', ratio: '16:9' },
  { id: 'line', name: 'LINE 商城訊息卡', short: 'LINE', color: '#2DB674', ratio: '1:1' },
  { id: 'ig', name: 'Instagram 貼文', short: 'IG', color: '#DD5597', ratio: '4:5' },
  { id: 'shopee', name: '蝦皮商品頁', short: '蝦皮', color: '#EC6A55', ratio: '1:1' },
  { id: 'google', name: 'Google 商家', short: 'Google', color: '#2E97D4', ratio: '4:3' },
];

// 已上架商品：各通路狀態（on 上架中／review 審核中／off 未上架）與 AI 建議
const A_LISTED_DEF = {
  lemon: { st: { web: 'on', line: 'on', ig: 'on', shopee: 'on', google: 'on' }, lang: 'zh', tip: '官網加購率最高，建議 LINE 訊息卡加上「第二件 9 折」，預估客單提高 12%', kind: 'up' },
  roll: { st: { web: 'on', line: 'on', ig: 'on', shopee: 'review', google: 'on' }, lang: 'zh', tip: '蝦皮常被問「能不能寄外縣市」，建議頁面加註冷藏宅配範圍與到貨時間', kind: 'warn' },
  basque: { st: { web: 'on', line: 'on', ig: 'on', shopee: 'on', google: 'off' }, lang: 'zh', tip: '「生日蛋糕」搜尋量上升 32%，建議新增加購蠟燭與生日卡選項，並上架 Google 商家', kind: 'up' },
  pound: { st: { web: 'on', line: 'on', ig: 'off', shopee: 'on', google: 'on' }, lang: 'en', tip: '英文頁跳出率 71% 偏高，建議把「less sweet」放進標題並補上切面照', kind: 'warn' },
  cookie: { st: { web: 'on', line: 'on', ig: 'on', shopee: 'on', google: 'on' }, lang: 'zh', tip: '公司送禮詢問增加，建議開啟「10 盒以上 95 折」並註明可開統編發票', kind: 'up' },
  pineapple: { st: { web: 'on', line: 'on', ig: 'on', shopee: 'on', google: 'review' }, lang: 'ms', tip: '馬來文頁瀏覽成長 2.1 倍，建議補上完整成分表與寄送馬來西亞的運費', kind: 'up' },
  canele: { st: { web: 'on', line: 'on', ig: 'on', shopee: 'off', google: 'on' }, lang: 'ja', tip: '日文頁點擊高但轉換低，建議補充保存天數（常溫 3 天）與回烤方式', kind: 'warn' },
};
export function buildListed() {
  const rng = mulberry32(20261005);
  return PRODUCTS.map(p => {
    const d = LISTED_DEF[p.id] || { st: { web: 'on', line: 'on', ig: 'on', shopee: 'off', google: 'on' }, lang: 'zh', tip: '建議補上英文與日文說明、加上使用情境照，觸及更多觀光客', kind: 'warn' };
    const views = Math.round((1400 + rng() * 2600) * p.pop);
    const atc = +(4.2 + rng() * 6.2).toFixed(1);
    const conv = +(atc * (0.38 + rng() * 0.22)).toFixed(1);
    const spark = Array.from({ length: 14 }, (_, i) => Math.round(views / 30 * (0.7 + rng() * 0.6) * (0.85 + i / 14 * 0.3)));
    return { pid: p.id, name: p.name, st: { ...d.st }, lang: d.lang, tip: d.tip, kind: d.kind, views, atc, conv, spark, fresh: false };
  });
}
// 特定語言點擊高、轉換低的提示資料（日文頁 vs 平均）
const A_LANG_FUNNEL = { canele: { lang: 'ja', ctr: 8.6, avgCtr: 4.1, conv: 0.9, avgConv: 3.4 } };

// 柚子乳酪塔插畫（純 SVG）
let yid = 0;
function A_yuzuArt(size = 120) {
  const u = 'yz' + (++yid);
  return `<svg class="art" width="${size}" height="${size}" viewBox="0 0 120 120" aria-hidden="true"><defs>
    <radialGradient id="${u}h"><stop offset="0" stop-color="#F6C945" stop-opacity=".55"/><stop offset="1" stop-color="#F6C945" stop-opacity="0"/></radialGradient>
    <radialGradient id="${u}f" cx=".45" cy=".4"><stop offset="0" stop-color="#fff8d6"/><stop offset=".65" stop-color="#fbe9a6"/><stop offset="1" stop-color="#f0cf6a"/></radialGradient>
    <linearGradient id="${u}c" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#eebd78"/><stop offset="1" stop-color="#b47a3c"/></linearGradient></defs>
    <circle cx="60" cy="58" r="56" fill="url(#${u}h)"/>
    <ellipse cx="60" cy="92" rx="46" ry="12" fill="rgba(0,0,0,.18)"/><ellipse cx="60" cy="88" rx="48" ry="13" fill="#ffffff"/><ellipse cx="60" cy="86" rx="40" ry="9" fill="#f3efe8"/>
    <ellipse cx="60" cy="76" rx="38" ry="12" fill="#a8672f"/>
    <path d="M22 66 Q60 92 98 66 L98 74 Q60 100 22 74z" fill="url(#${u}c)"/>
    ${Array.from({ length: 14 }, (_, i) => { const x = 25 + i * 5; return `<path d="M${x} ${67 + Math.sin(i / 13 * Math.PI) * 9} v6" stroke="#9a6430" stroke-width="1" opacity=".5"/>`; }).join('')}
    <ellipse cx="60" cy="66" rx="38" ry="15" fill="url(#${u}c)"/>
    <ellipse cx="60" cy="64.5" rx="32" ry="11.5" fill="url(#${u}f)"/>
    <ellipse cx="54" cy="61" rx="12" ry="3" fill="#fffdf0" opacity=".7"/>
    ${[[-14, -2, 20], [-6, 3, -30], [4, -3, 40], [12, 2, -15], [-2, -6, 75], [18, -4, 10], [-20, 3, -55]].map(([x, y, r]) => `<rect x="${60 + x}" y="${64 + y}" width="9" height="1.8" rx=".9" fill="#f2a516" transform="rotate(${r} ${64 + x} ${65 + y})"/>`).join('')}
    <g transform="translate(66 50)"><circle r="10" fill="#f6c42f" stroke="#e6a417" stroke-width="1.6"/><circle r="7.4" fill="#ffe680"/>
      ${[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => `<line x1="0" y1="0" x2="${(Math.cos(i * Math.PI / 5) * 7).toFixed(2)}" y2="${(Math.sin(i * Math.PI / 5) * 7).toFixed(2)}" stroke="#e6a417" stroke-width=".9"/>`).join('')}
      <circle r="1.4" fill="#fff6c8"/></g>
    <path d="M48 52 q6 -8 12 -2 q-6 5 -12 2z" fill="#58b368"/><path d="M48 52 q6 -3 12 -2" stroke="#3f8f4f" stroke-width=".7" fill="none"/>
  </svg>`;
}

// ───────────────────────────────────────────────────────────────
// 其他業主：依業態大類（TENANT.cat）與商品主檔產生五語文案、SEO、分類、價格區間與成效建議（示範）
// ───────────────────────────────────────────────────────────────
const CAT_LABEL = { food: '餐飲小吃', drink: '飲品茶咖啡', dessert: '糕點點心', retail: '零售選物', craft: '手作工藝', flower: '花藝植栽', service: '預約服務', farm: '農產生鮮' };
const CX = {
  food: { zh: '每天現做，外帶、外送都可以，十份以上可預訂團體餐。', en: 'Made fresh every day — takeaway, delivery and group orders welcome.',
    ja: ['{n}――毎日お店で手作りしています。', '{n}は当店の定番メニューです。食材は毎朝仕入れ、ご注文を受けてから仕上げます。テイクアウト・デリバリーにも対応しています。'],
    vi: ['{n} – nấu mới mỗi ngày tại quán.', '{n} là món quen thuộc của quán. Nguyên liệu được nhập mỗi sáng và chỉ hoàn thiện khi có đơn. Có bán mang đi và giao hàng.'],
    ms: ['{n} – dimasak segar setiap hari.', '{n} ialah menu kegemaran kami. Bahan dibeli setiap pagi dan disediakan selepas pesanan diterima. Boleh bungkus dan penghantaran.'],
    kw: { zh: ['外帶', '外送美食', '團體訂餐'], en: ['takeaway', 'food delivery', 'group order'], ja: ['テイクアウト', 'デリバリー', 'ランチ'], vi: ['mang đi', 'giao đồ ăn', 'đặt theo nhóm'], ms: ['bungkus', 'penghantaran makanan', 'pesanan berkumpulan'] },
    tags: ['現做', '外帶外送', '團體訂餐'], see: '餐點主體・配料・外帶餐盒', margin: '餐飲業常見 55–70%', faq: '份量多大、會不會辣', search: '外送便當', ja: '份量與辣度標示' },
  drink: { zh: '小批量製作，包裝標示製作日期，建議盡早享用風味最佳。', en: 'Made in small batches with the production date on every pack — best enjoyed fresh.',
    ja: ['{n}――小ロットで丁寧に仕上げました。', '{n}は少量ずつ丁寧に仕上げ、製造日を明記してお届けします。香りが一番よいうちにお楽しみください。'],
    vi: ['{n} – làm theo mẻ nhỏ, ghi rõ ngày sản xuất.', '{n} được làm theo từng mẻ nhỏ và ghi rõ ngày sản xuất trên bao bì. Dùng sớm để cảm nhận hương vị trọn vẹn nhất.'],
    ms: ['{n} – dibuat dalam kelompok kecil.', '{n} dibuat dalam kelompok kecil dengan tarikh pengeluaran pada setiap pek. Paling sedap dinikmati segera.'],
    kw: { zh: ['小批量', '送禮', '宅配'], en: ['small batch', 'gift', 'home delivery'], ja: ['小ロット', 'ギフト', 'お取り寄せ'], vi: ['mẻ nhỏ', 'quà tặng', 'giao tận nhà'], ms: ['kelompok kecil', 'hadiah', 'penghantaran'] },
    tags: ['小批量', '標示製作日期', '送禮'], see: '包裝正面・標籤・產品主體', margin: '飲品業常見 55–70%', faq: '保存多久、怎麼沖泡', search: '送禮', ja: '保存期限與沖煮方式' },
  dessert: { zh: '每天少量手作，低溫配送，送禮自用都合適。', en: 'Handmade in small batches every day — lovely as a gift.',
    ja: ['{n}――毎日少しずつ手作りしています。', '{n}は毎日少量ずつ手作りしています。素材の味を活かしたやさしい味わいで、贈り物にもおすすめです。'],
    vi: ['{n} – làm thủ công mỗi ngày.', '{n} được làm thủ công với số lượng nhỏ mỗi ngày, vị dịu nhẹ, rất hợp làm quà.'],
    ms: ['{n} – buatan tangan setiap hari.', '{n} dibuat dengan tangan dalam kuantiti kecil setiap hari, rasa lembut dan sesuai sebagai hadiah.'],
    kw: { zh: ['手作', '伴手禮', '宅配'], en: ['handmade', 'gift box', 'delivery'], ja: ['手作り', 'ギフト', 'お取り寄せ'], vi: ['thủ công', 'quà tặng', 'giao tận nhà'], ms: ['buatan tangan', 'hadiah', 'penghantaran'] },
    tags: ['手作', '送禮', '低溫配送'], see: '成品外觀・切面・包裝盒', margin: '糕點業常見 55–65%', faq: '可以放幾天', search: '生日', ja: '保存天數' },
  retail: { zh: '店主親自挑選、實品拍攝，享 7 天鑑賞期，可包裝送禮。', en: 'Hand-picked by the owner and photographed as-is, with a 7-day return window and gift wrapping.',
    ja: ['{n}――店主がひとつずつ選びました。', '{n}は店主が実際に使って選んだアイテムです。実物を撮影しており、7日間の返品期間とギフト包装に対応しています。'],
    vi: ['{n} – chủ tiệm tự tay tuyển chọn.', '{n} được chủ tiệm tự dùng thử và tuyển chọn. Ảnh chụp sản phẩm thật, đổi trả trong 7 ngày và có gói quà.'],
    ms: ['{n} – dipilih sendiri oleh pemilik kedai.', '{n} dipilih dan dicuba sendiri oleh pemilik kedai. Gambar produk sebenar, tempoh pemulangan 7 hari dan bungkusan hadiah tersedia.'],
    kw: { zh: ['選物', '交換禮物', '送禮'], en: ['curated', 'gift idea', 'lifestyle'], ja: ['セレクト', 'ギフト', '雑貨'], vi: ['tuyển chọn', 'quà tặng', 'phong cách sống'], ms: ['pilihan', 'idea hadiah', 'gaya hidup'] },
    tags: ['店主選品', '7 天鑑賞期', '可包裝送禮'], see: '商品正面・材質細節・包裝', margin: '零售業常見 35–50%', faq: '尺寸與材質', search: '交換禮物', ja: '尺寸表' },
  craft: { zh: '一人工作室全手工製作，可客製刻字，提供一年保固與保養服務。', en: 'Handmade by one maker — personalisation available, with a one-year warranty and care service.',
    ja: ['{n}――ひとつひとつ手作業で仕上げています。', '{n}は工房でひとつずつ手作業で仕上げています。名入れ・刻印のご相談も承ります。1年保証とメンテナンス付きです。'],
    vi: ['{n} – làm thủ công từng chiếc.', '{n} được làm thủ công từng chiếc tại xưởng, có thể khắc tên theo yêu cầu, bảo hành một năm.'],
    ms: ['{n} – dibuat dengan tangan satu demi satu.', '{n} dibuat dengan tangan di studio kami, boleh diukir nama dan disertakan waranti setahun.'],
    kw: { zh: ['手工', '客製刻字', '送禮'], en: ['handmade', 'personalised', 'gift'], ja: ['ハンドメイド', '名入れ', 'ギフト'], vi: ['thủ công', 'khắc tên', 'quà tặng'], ms: ['buatan tangan', 'ukiran nama', 'hadiah'] },
    tags: ['可刻字', '一年保固', '手工製作'], see: '成品外觀・接合細節・配件', margin: '手作業常見 55–70%', faq: '多久可以出貨、能不能刻字', search: '客製刻字', ja: '保養方式與出貨天數' },
  flower: { zh: '當天配花、當天出貨，附照顧小卡，可指定送達日期。', en: 'Arranged and sent the same day with a care card — choose your delivery date.',
    ja: ['{n}――その日の花で、その日にお届け。', '{n}はその日に仕入れた花材でお作りし、当日発送します。お手入れカード付き、お届け日の指定もできます。'],
    vi: ['{n} – hoa tươi cắm và giao trong ngày.', '{n} được cắm từ hoa nhập trong ngày và gửi đi ngay, kèm thẻ hướng dẫn chăm sóc, có thể chọn ngày giao.'],
    ms: ['{n} – digubah dan dihantar pada hari yang sama.', '{n} digubah daripada bunga segar hari itu dan dihantar pada hari yang sama, berserta kad penjagaan. Tarikh penghantaran boleh dipilih.'],
    kw: { zh: ['花束', '生日花禮', '指定日配送'], en: ['bouquet', 'birthday flowers', 'flower delivery'], ja: ['花束', '誕生日', 'フラワーギフト'], vi: ['bó hoa', 'hoa sinh nhật', 'giao hoa'], ms: ['jambangan', 'bunga hari jadi', 'penghantaran bunga'] },
    tags: ['當日配送', '附照顧卡', '可指定日期'], see: '花材主體・配色・包裝', margin: '花藝業常見 50–65%', faq: '可以指定送達時間嗎', search: '生日花束', ja: '配送範圍' },
  service: { zh: '一對一預約制，器具一客一消毒，線上預約可選時段，不用等。', en: 'One-to-one by appointment, tools sterilised for every guest — book a slot online, no waiting.',
    ja: ['{n}――完全予約制・マンツーマン。', '{n}は完全予約制のマンツーマン施術です。器具はお客様ごとに消毒しています。オンラインでお好きな時間をご予約ください。'],
    vi: ['{n} – phục vụ 1 kèm 1, đặt lịch trước.', '{n} phục vụ một kèm một theo lịch hẹn, dụng cụ được khử trùng cho từng khách. Đặt lịch trực tuyến, không phải chờ.'],
    ms: ['{n} – perkhidmatan satu-ke-satu melalui temujanji.', '{n} ialah perkhidmatan satu-ke-satu melalui temujanji; peralatan disterilkan untuk setiap pelanggan. Tempah slot dalam talian tanpa menunggu.'],
    kw: { zh: ['線上預約', '一對一', '禮券'], en: ['book online', 'one-to-one', 'gift voucher'], ja: ['オンライン予約', 'マンツーマン', 'ギフト券'], vi: ['đặt lịch online', 'một kèm một', 'phiếu quà tặng'], ms: ['tempahan dalam talian', 'satu-ke-satu', 'baucar hadiah'] },
    tags: ['預約制', '一客一消毒', '可用禮券'], see: '作品展示・服務環境・工具', margin: '服務業常見 60–75%', faq: '需要多久、可以改期嗎', search: '預約', ja: '施作時間與預約方式' },
  farm: { zh: '產地直送、採收後預冷出貨，標示產地與採收日期。', en: 'Shipped straight from the farm, pre-cooled after harvest and labelled with origin and harvest date.',
    ja: ['{n}――産地直送、収穫後すぐにお届け。', '{n}は収穫後すぐに予冷して産地から直送します。産地と収穫日を表示しています。'],
    vi: ['{n} – giao thẳng từ nông trại.', '{n} được làm lạnh ngay sau thu hoạch và gửi thẳng từ nông trại, ghi rõ nguồn gốc và ngày thu hoạch.'],
    ms: ['{n} – terus dari ladang.', '{n} disejukkan selepas dituai dan dihantar terus dari ladang, dilabel dengan asal dan tarikh tuaian.'],
    kw: { zh: ['產地直送', '當季', '宅配'], en: ['farm direct', 'seasonal', 'home delivery'], ja: ['産地直送', '旬', 'お取り寄せ'], vi: ['từ nông trại', 'theo mùa', 'giao tận nhà'], ms: ['terus dari ladang', 'bermusim', 'penghantaran'] },
    tags: ['產地直送', '預冷出貨', '當季'], see: '產品外觀・產地標籤・包裝箱', margin: '農產業常見 35–55%', faq: '什麼時候採收、怎麼保存', search: '產地直送', ja: '保存方式' },
}[CAT];
export { CX as LISTING_CAT };
const first = (t) => String(t || '').split(/[。！!.]\s*/)[0].trim();
const enOf = (p) => p.en || p.name;
const fillN = (tpl, n) => tpl.replace(/\{n\}/g, n);
const BASE = IS_AMEI ? null : (KIT.byPop()[0] || PRODUCTS[0]);
const G_NEW = IS_AMEI ? null : {
  id: 'yuzu', name: `${KIT.short(BASE)}（秋冬限定）`, unit: BASE.unit, allergens: [...(BASE.allergens || [])], storage: BASE.storage || 'room', days: BASE.days,
  color: BASE.color, accent: BASE.accent, isNew: true, baseId: BASE.id,
};
const SEASON_MAT = { food: '秋冬時令食材', drink: '季節限定原料', dessert: '季節水果醬', retail: '限定版包裝', craft: '限定色材料', flower: '秋冬花材（棉花・松果）', service: '秋冬新色耗材', farm: '秋冬採收批次' }[CAT];
const G_NEW_BOM = IS_AMEI ? null : {
  lines: [...(RECIPES[BASE.id]?.lines || []).map(([m, q]) => [m, typeof q === 'number' && q % 1 ? +(q * 1.05).toFixed(3) : q]), ['seasonal', 1]],
  extra: { seasonal: { name: SEASON_MAT, unit: '份', cost: Math.max(5, Math.round((BASE.cost || 50) * 0.12)), cat: 'raw', note: '新原料・供應商報價' } },
  labor: RECIPES[BASE.id]?.labor || 5, mfg: RECIPES[BASE.id]?.mfg || 5,
};
function genCopy() {
  const out = {};
  for (const p of PRODUCTS) {
    const n = enOf(p);
    out[p.id] = {
      zh: [p.name, first(p.desc) || p.name, `${p.desc || ''}${CX.zh}`],
      en: [n, first(p.descEn) || n, `${p.descEn || ''} ${CX.en}`.trim()],
      ja: [n, fillN(CX.ja[0], n), fillN(CX.ja[1], n)],
      vi: [n, fillN(CX.vi[0], n), fillN(CX.vi[1], n)],
      ms: [n, fillN(CX.ms[0], n), fillN(CX.ms[1], n)],
    };
  }
  const b = enOf(BASE);
  out.yuzu = {
    zh: [G_NEW.name, `人氣「${BASE.name}」推出秋冬限定版`, `以人氣商品「${BASE.name}」為基礎，加入${SEASON_MAT}推出秋冬限定版。${CX.zh}數量有限，售完為止。`],
    en: [`${b} (Autumn–Winter Edition)`, `An autumn–winter edition of our popular ${b}.`, `A limited autumn–winter edition of our popular ${b}. ${CX.en} Limited quantities.`],
    ja: [`${b}（秋冬限定）`, `人気の${b}に秋冬限定版が登場。`, `人気の${b}をベースにした秋冬限定版です。${fillN(CX.ja[1], b)}数量限定のため、なくなり次第終了します。`],
    vi: [`${b} (bản thu đông)`, `Phiên bản thu đông của món ${b} được yêu thích.`, `Phiên bản giới hạn thu đông của ${b}. ${fillN(CX.vi[1], b)} Số lượng có hạn.`],
    ms: [`${b} (Edisi Musim Sejuk)`, `Edisi musim sejuk ${b} kegemaran ramai.`, `Edisi terhad musim sejuk ${b}. ${fillN(CX.ms[1], b)} Kuantiti terhad.`],
  };
  return out;
}
const G_COPY = IS_AMEI ? null : genCopy();
const G_KW = IS_AMEI ? null : Object.fromEntries(['yuzu', ...PRODUCTS.map(p => p.id)].map(id => [id, Object.fromEntries(['zh', 'en', 'ja', 'vi', 'ms'].map(l => [l, [id === 'yuzu' ? (l === 'zh' ? G_NEW.name : G_COPY.yuzu[l][0]) : (l === 'zh' ? KIT.short(PRODUCT_MAP[id]) : enOf(PRODUCT_MAP[id])), ...CX.kw[l]]]))]));
const pascal = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').split(/[^A-Za-z0-9]+/).filter(Boolean).map(w => w[0].toUpperCase() + w.slice(1)).join('');
const G_TAGS = IS_AMEI ? null : (() => {
  const en = pascal(TENANT.en) || 'Shop';
  const zh = `#${String(TENANT.name || '').replace(/\s/g, '')}`, tn = `#${String(KIT.typeName || CAT_LABEL[CAT]).replace(/\s/g, '')}`;
  return { zh: [zh, tn, '#台灣好店'], en: [`#${en}`, '#MadeInTaiwan', '#Taiwan'], ja: [zh, '#台湾', '#台湾好き'], vi: [`#${en}`, '#DaiLoan', '#Taiwan'], ms: [`#${en}`, '#Taiwan', '#BuatanTaiwan'] };
})();
const SHIP = {
  food: { zh: '外帶・外送・團體訂餐', en: 'Takeaway · Delivery · Group orders', ja: 'テイクアウト・デリバリー対応', vi: 'Mang đi · Giao hàng', ms: 'Bungkus · Penghantaran' },
  flower: { zh: '當日配送・可指定日期', en: 'Same-day delivery · choose your date', ja: '当日配送・日付指定可', vi: 'Giao trong ngày · chọn ngày giao', ms: 'Hantar hari sama · pilih tarikh' },
  service: { zh: '線上預約・現場服務', en: 'Book online · in-studio service', ja: 'オンライン予約・店舗にて', vi: 'Đặt lịch online · phục vụ tại tiệm', ms: 'Tempah dalam talian · di studio' },
}[CAT] || { zh: '宅配・滿 NT$1,500 免運', en: 'Home delivery · free over NT$1,500', ja: '宅配・NT$1,500以上送料無料', vi: 'Giao tận nhà · miễn phí từ NT$1,500', ms: 'Penghantaran · percuma atas NT$1,500' };
const G_UI = IS_AMEI ? null : Object.fromEntries(Object.entries(A_UI_I18N).map(([l, v]) => [l, { ...v, ship: SHIP[l], ...(CAT === 'service' ? { buy: { zh: '立即預約', en: 'Book now', ja: '予約する', vi: 'Đặt lịch', ms: 'Tempah' }[l], sold: { zh: '已預約', en: 'booked', ja: '予約済み', vi: 'đã đặt', ms: 'ditempah' }[l] } : {}), ...(FOODISH ? {} : { alg: { zh: '商品標示', en: 'Details', ja: '商品情報', vi: 'Thông tin', ms: 'Maklumat' }[l] }) }]));
function subOf(p) {
  const n = `${p.name}${p.unit || ''}`;
  if (/禮券|券/.test(n)) return '禮券';
  if (/咖啡|茶|飲|汁|奶|瓶/.test(n) && CAT !== 'flower') return '飲品';
  if (/禮盒|組合|入門組|[^\d\s]組$|套組/.test(p.name)) return '禮盒・組合';
  if (/湯|麵|飯|粉|便當/.test(n)) return '主食';
  if (/冷凍|湯底|包$/.test(n)) return '冷凍調理';
  if (/花束|花籃|花圈|花禮/.test(n)) return '花禮';
  if (/盆|植|多肉/.test(n)) return '植栽';
  if (/訂閱/.test(n)) return '定期訂閱';
  return KIT.typeName || '精選商品';
}
const r10 = (n) => Math.max(10, Math.round(n / 10) * 10);
const G_META = IS_AMEI ? null : Object.fromEntries(['yuzu', ...PRODUCTS.map(p => p.id)].map((id, k) => {
  const p = id === 'yuzu' ? { ...BASE, name: G_NEW.name, price: r10(BASE.price * 1.12) } : PRODUCT_MAP[id];
  const rank = id === 'yuzu' ? '秋冬限定' : k === 1 ? '人氣第一' : k === 2 ? '回購率高' : '新客推薦';
  const slug = id === 'yuzu' ? `${String(enOf(BASE)).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-winter` : String(enOf(p)).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || id;
  return [id, { see: `${KIT.short(id === 'yuzu' ? BASE : p)}・${CX.see}`, cat: `${CAT_LABEL[CAT]} › ${subOf(p)}`, tags: [rank, ...CX.tags], conf: 90 + ((k * 7) % 9), range: [r10(p.price * 0.8), r10(p.price * 1.02), r10(p.price * 1.35)], slug }];
}));
const G_LISTED = IS_AMEI ? null : (() => {
  const T = [
    { st: { web: 'on', line: 'on', ig: 'on', shopee: 'on', google: 'on' }, lang: 'zh', kind: 'up', tip: '官網加購率最高，建議 LINE 訊息卡加上「第二件 9 折」，預估客單提高 12%' },
    { st: { web: 'on', line: 'on', ig: 'on', shopee: 'review', google: 'on' }, lang: 'zh', kind: 'warn', tip: `顧客常問「${CX.faq}」，建議在商品頁補上說明與實拍照` },
    { st: { web: 'on', line: 'on', ig: 'on', shopee: 'on', google: 'off' }, lang: 'zh', kind: 'up', tip: `「${CX.search}」搜尋量上升 32%，建議新增加購選項，並上架 Google 商家` },
    { st: { web: 'on', line: 'on', ig: 'on', shopee: 'off', google: 'on' }, lang: 'ja', kind: 'warn', tip: `日文頁點擊高但轉換低，建議補充${CX.ja}` },
    { st: { web: 'on', line: 'on', ig: 'off', shopee: 'on', google: 'on' }, lang: 'en', kind: 'warn', tip: '英文頁跳出率 71% 偏高，建議把主要賣點放進標題並補上實拍照' },
    { st: { web: 'on', line: 'on', ig: 'on', shopee: 'on', google: 'review' }, lang: 'ms', kind: 'up', tip: '馬來文頁瀏覽成長 2.1 倍，建議補上完整說明與寄送方式' },
  ];
  return Object.fromEntries(PRODUCTS.map((p, i) => [p.id, T[i % T.length]]));
})();
const G_FUNNEL = IS_AMEI || PRODUCTS.length < 4 ? {} : { [PRODUCTS[3].id]: { lang: 'ja', ctr: 8.6, avgCtr: 4.1, conv: 0.9, avgConv: 3.4 } };

// 商品標示（非食品業：保固、鑑賞期、預約；食品業依保存天數）
const SPEC = {
  retail: { zh: '7 天鑑賞期・可包裝送禮', en: '7-day return window · gift wrap available', ja: '7日間返品可・ギフト包装対応', vi: 'Đổi trả trong 7 ngày · có gói quà', ms: 'Pemulangan 7 hari · bungkusan hadiah' },
  craft: { zh: '手工製作・一年保固', en: 'Handmade · 1-year warranty', ja: 'ハンドメイド・1年保証', vi: 'Làm thủ công · bảo hành 1 năm', ms: 'Buatan tangan · waranti 1 tahun' },
  service: { zh: '預約制・器具一客一消毒', en: 'By appointment · tools sterilised for every guest', ja: '予約制・お客様ごとに器具消毒', vi: 'Đặt lịch trước · khử trùng dụng cụ cho từng khách', ms: 'Melalui temujanji · peralatan disterilkan' },
};
export function specLine(p, L) {
  const d = KIT.shelfOf(p);
  if (SPEC[CAT]) return { cold: false, txt: SPEC[CAT][L] };
  if (CAT === 'flower') {
    if (!d || d >= 365) return { cold: false, txt: { zh: '乾燥花材・可保存一年以上', en: 'Dried flowers · lasts over a year', ja: 'ドライフラワー・1年以上', vi: 'Hoa khô · giữ được hơn 1 năm', ms: 'Bunga kering · tahan lebih setahun' }[L] };
    return { cold: true, txt: { zh: `鮮花・約可欣賞 ${d} 天・每天換水`, en: `Fresh flowers · about ${d} days, change water daily`, ja: `生花・${d}日ほどお楽しみいただけます`, vi: `Hoa tươi · đẹp khoảng ${d} ngày, thay nước mỗi ngày`, ms: `Bunga segar · tahan ${d} hari, tukar air setiap hari` }[L] };
  }
  if (CAT === 'food' && (!d || d <= 2)) return { cold: false, txt: { zh: '當日現做・建議盡快食用', en: 'Made today · best eaten soon', ja: '本日調理・お早めにお召し上がりください', vi: 'Làm trong ngày · dùng ngay', ms: 'Dibuat hari ini · nikmati segera' }[L] };
  const dd = d || 30, fridge = dd <= 7 || CAT === 'food';
  return { cold: fridge, txt: STORE_I18N[fridge ? 'fridge' : 'room'][L](dd) };
}

export const NEW_PRODUCT = IS_AMEI ? A_NEW_PRODUCT : G_NEW;
export const NEW_BOM = IS_AMEI ? A_NEW_BOM : G_NEW_BOM;
export const COPY = IS_AMEI ? A_COPY : G_COPY;
export const KW = IS_AMEI ? A_KW : G_KW;
export const GEN_TAGS = IS_AMEI ? A_GEN_TAGS : G_TAGS;
export const UI_I18N = IS_AMEI ? A_UI_I18N : G_UI;
export const META = IS_AMEI ? A_META : G_META;
const LISTED_DEF = IS_AMEI ? A_LISTED_DEF : G_LISTED;
export const LANG_FUNNEL = IS_AMEI ? A_LANG_FUNNEL : G_FUNNEL;
export function yuzuArt(size = 120) {
  if (IS_AMEI) return A_yuzuArt(size);
  return productArt(BASE.id, size).replace('<svg ', '<svg style="filter:hue-rotate(38deg) saturate(1.15)" ');
}
