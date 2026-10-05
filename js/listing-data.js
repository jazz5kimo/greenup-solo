// AI 商品上架：五語文案範本、SEO、分類、同類價格區間、已上架商品統計（全部為示範用模擬資料）
import { PRODUCTS, mulberry32 } from './data.js';

export const LS_LANGS = [
  { id: 'zh', label: '繁中', full: '繁體中文' },
  { id: 'en', label: 'English', full: 'English' },
  { id: 'ja', label: '日本語', full: '日本語' },
  { id: 'vi', label: 'Tiếng Việt', full: 'Tiếng Việt' },
  { id: 'ms', label: 'Bahasa Melayu', full: 'Bahasa Melayu' },
];

// 新品：柚子乳酪塔（尚未在 data.js 商品主檔，成本以 BOM 估算）
export const NEW_PRODUCT = {
  id: 'yuzu', name: '柚子乳酪塔', unit: '4 入', allergens: ['egg', 'milk', 'gluten'], storage: 'fridge', days: 3,
  color: '#F6C945', accent: '#E89B2A', isNew: true,
};
// 柚子乳酪塔 BOM（每 1 盒 4 入）：[原料 id, 用量]；yuzujam 為新原料，以供應商報價估算
export const NEW_BOM = {
  lines: [['flour', 0.1], ['butter', 0.05], ['sugar', 0.06], ['egg', 2], ['cheese', 0.1], ['cream', 0.05], ['yuzujam', 0.06], ['cakebox', 1]],
  extra: { yuzujam: { name: '高知柚子果醬', unit: 'kg', cost: 360, cat: 'raw', note: '新原料・供應商報價' } },
  labor: 9, mfg: 6,
};

// 每項商品的五語文案：[名稱, 一句話賣點, 完整介紹]
export const COPY = {
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
export const KW = {
  yuzu: { zh: ['柚子乳酪塔', '柚子甜點', '秋冬限定甜點', '乳酪塔宅配'], en: ['yuzu cheese tart', 'yuzu dessert', 'limited edition', 'cheese tart delivery'], ja: ['ゆずチーズタルト', 'ゆずスイーツ', '秋冬限定', 'お取り寄せ'], vi: ['bánh tart phô mai yuzu', 'bánh yuzu', 'phiên bản giới hạn', 'bánh tart phô mai'], ms: ['tart keju yuzu', 'pencuci mulut yuzu', 'edisi terhad', 'tart keju'] },
  lemon: { zh: ['檸檬塔', '屏東檸檬', '下午茶甜點', '冷藏甜點宅配'], en: ['lemon tart', 'Taiwan dessert delivery', 'afternoon tea', 'citrus tart'], ja: ['レモンタルト', '台湾スイーツ', 'お取り寄せ', 'アフタヌーンティー'], vi: ['bánh tart chanh', 'bánh ngọt Đài Loan', 'trà chiều', 'giao bánh tận nơi'], ms: ['tart lemon', 'pencuci mulut Taiwan', 'minum petang', 'penghantaran kek'] },
  roll: { zh: ['草莓生乳捲', '大湖草莓', '北海道鮮奶油', '草莓季限定'], en: ['strawberry cream roll', 'Swiss roll', 'Hokkaido cream', 'seasonal dessert'], ja: ['いちごロール', '生クリーム', '季節限定', '台湾スイーツ'], vi: ['bánh cuộn dâu', 'kem tươi Hokkaido', 'bánh theo mùa', 'bánh ngọt Đài Loan'], ms: ['kek gulung strawberi', 'krim Hokkaido', 'pencuci mulut bermusim', 'kek Taiwan'] },
  basque: { zh: ['芋泥巴斯克', '大甲芋頭', '生日蛋糕', '6吋蛋糕宅配'], en: ['taro basque cheesecake', 'burnt cheesecake', 'birthday cake', 'Taiwan taro'], ja: ['タロイモ', 'バスクチーズケーキ', '誕生日ケーキ', '台湾スイーツ'], vi: ['bánh basque khoai môn', 'cheesecake cháy', 'bánh sinh nhật', 'khoai môn Đài Loan'], ms: ['kek keju basque', 'kek keladi', 'kek hari jadi', 'kek Taiwan'] },
  pound: { zh: ['烏龍茶磅蛋糕', '凍頂烏龍', '低甜度蛋糕', '長輩伴手禮'], en: ['oolong pound cake', 'tea cake', 'less sweet cake', 'Taiwan tea gift'], ja: ['烏龍茶パウンド', 'パウンドケーキ', '甘さ控えめ', '台湾茶スイーツ'], vi: ['bánh bông lan trà ô long', 'bánh ít ngọt', 'trà Đài Loan', 'quà biếu'], ms: ['kek pound teh oolong', 'kek kurang manis', 'teh Taiwan', 'hadiah'] },
  cookie: { zh: ['手工餅乾禮盒', '公司送禮', '中秋禮盒', '常溫伴手禮'], en: ['cookie gift box', 'corporate gifts', 'handmade cookies', 'Taiwan souvenir'], ja: ['クッキー詰め合わせ', '手土産', '個包装', '台湾お土産'], vi: ['hộp quà bánh quy', 'quà tặng công ty', 'bánh quy thủ công', 'quà Đài Loan'], ms: ['kotak hadiah biskut', 'hadiah korporat', 'biskut buatan tangan', 'cenderahati Taiwan'] },
  pineapple: { zh: ['鳳梨酥禮盒', '土鳳梨酥', '台灣伴手禮', '海外寄送'], en: ['pineapple cake', 'Taiwan souvenir', 'native pineapple', 'gift box'], ja: ['パイナップルケーキ', '台湾土産', '鳳梨酥', 'ギフト'], vi: ['bánh dứa Đài Loan', 'quà Đài Loan', 'bánh dứa ta', 'hộp quà'], ms: ['kek nanas Taiwan', 'cenderahati Taiwan', 'nanas tempatan', 'kotak hadiah'] },
  canele: { zh: ['伯爵可麗露', '法式甜點', '可麗露宅配', '下午茶'], en: ['earl grey canelé', 'French pastry', 'canelé delivery', 'afternoon tea'], ja: ['カヌレ', 'アールグレイ', 'フランス菓子', 'お取り寄せ'], vi: ['bánh canelé', 'bánh Pháp', 'trà Bá tước', 'trà chiều'], ms: ['canelé', 'pastri Perancis', 'teh Earl Grey', 'minum petang'] },
};
export const GEN_TAGS = {
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
export const UI_I18N = {
  zh: { alg: '過敏原', keep: '保存', buy: '加入購物車', now: '立即購買', ship: '冷藏宅配・滿 NT$1,500 免運', sold: '已售出', more: '查看商品' },
  en: { alg: 'Allergens', keep: 'Storage', buy: 'Add to cart', now: 'Buy now', ship: 'Chilled delivery · free over NT$1,500', sold: 'sold', more: 'View item' },
  ja: { alg: 'アレルゲン', keep: '保存方法', buy: 'カートに入れる', now: '今すぐ購入', ship: 'クール便・NT$1,500以上送料無料', sold: '販売済み', more: '商品を見る' },
  vi: { alg: 'Chất gây dị ứng', keep: 'Bảo quản', buy: 'Thêm vào giỏ', now: 'Mua ngay', ship: 'Giao lạnh · miễn phí từ NT$1,500', sold: 'đã bán', more: 'Xem sản phẩm' },
  ms: { alg: 'Alergen', keep: 'Penyimpanan', buy: 'Tambah ke troli', now: 'Beli sekarang', ship: 'Penghantaran sejuk · percuma atas NT$1,500', sold: 'terjual', more: 'Lihat produk' },
};

// AI 辨識描述、建議分類與標籤、同類價格區間 [低, 中位, 高]
export const META = {
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
const LISTED_DEF = {
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
    const d = LISTED_DEF[p.id];
    const views = Math.round((1400 + rng() * 2600) * p.pop);
    const atc = +(4.2 + rng() * 6.2).toFixed(1);
    const conv = +(atc * (0.38 + rng() * 0.22)).toFixed(1);
    const spark = Array.from({ length: 14 }, (_, i) => Math.round(views / 30 * (0.7 + rng() * 0.6) * (0.85 + i / 14 * 0.3)));
    return { pid: p.id, name: p.name, st: { ...d.st }, lang: d.lang, tip: d.tip, kind: d.kind, views, atc, conv, spark, fresh: false };
  });
}
// 特定語言點擊高、轉換低的提示資料（日文頁 vs 平均）
export const LANG_FUNNEL = { canele: { lang: 'ja', ctr: 8.6, avgCtr: 4.1, conv: 0.9, avgConv: 3.4 } };

// 柚子乳酪塔插畫（純 SVG）
let yid = 0;
export function yuzuArt(size = 120) {
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
