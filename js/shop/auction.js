// 銷售網頁：限時競標（簡單版：一般加價競標；1 元起標集客只是起標價與標籤不同）
// 拍品卡（倒數、目前價、出價次數）→ 詳情（出價紀錄匿名化、快捷加價、出價、直購）→ 首次出價手機驗證（示範）
// 出價即時同步到後台「競標管理」；全部為示範資料，不會真的扣款或發送簡訊。
import { auctions, RULES, maskName } from '../auction-store.js';
import { $, $$, el, gsap, esc, money, toast as baseToast, pad } from '../util.js';
import { productArt } from '../art.js';
import { pName, pUnit } from '../i18n.js';

/* ---------- 介面文字（5 種語言） ---------- */
const L = {
  zh: {
    kicker: '限時競標', title: '喊個價，把好東西帶回家', sub: '每週挑幾樣商品開放競標，有的從 1 元起標，價高者得。出價、得標、付款都在這裡完成。',
    demo: '示範資料・非真實交易', rule: '結標前 2 分鐘內有人出價，會自動延長 2 分鐘，讓每個人都有機會。',
    tagOne: '1 元起標', tagNormal: '競標', live: '進行中', upcoming: '即將開始', ended: '已結標', closing: '結標中',
    endsIn: '剩餘', startsIn: '開始倒數', current: '目前價', startPrice: '起標價', bids: '{n} 次出價', watching: '{n} 人在看', views: '{n} 次瀏覽',
    bid: '出價', view: '查看結果', remind: '查看', buyNow: '直購 {p}', buyNowNote: '按直購立即成交，競標隨即結束', minInc: '每次至少加 {p}',
    yourBid: '你的出價', place: '確認出價', simulate: '模擬其他買家出價', simNote: '示範用：讓你一個人也能看到競價過程', history: '出價紀錄',
    noBids: '還沒有人出價，成為第一位！', you: '你', leading: '你目前是最高出價者', outbid: '你被超標了！', outbidBody: '{name} 出價 {p}，再加一點就能搶回來。',
    bidOk: '出價成功！', bidOkBody: '目前由你領先，被超標時會立刻通知你。', extended: '最後 2 分鐘有人出價，已自動延長 2 分鐘', tooLow: '出價至少要 {p}', self: '你已經是最高出價者了', closedErr: '這場競標已結束',
    verifyT: '首次出價，先驗證手機', verifyS: '每支手機只能有一個競標身分，避免灌價。', phone: '手機號碼', phonePh: '09 開頭 10 碼', sendCode: '傳送驗證碼', code: '驗證碼', codeHint: '示範驗證碼：123456',
    nick: '暱稱（出價紀錄只會顯示「林＊＊」這樣的匿名）', nickPh: '例如：林小姐', verifyBtn: '驗證並出價', phoneErr: '請輸入 09 開頭的 10 碼手機號碼', codeErr: '驗證碼錯誤（示範請輸入 123456）', sent: '驗證碼已傳送（示範，不會真的發簡訊）', verified: '手機已驗證',
    won: '恭喜得標！', wonBody: '成交價 {p}。請在 {h} 小時內完成付款，逾期將取消得標資格。', payBy: '付款期限', payNow: '前往付款（示範）', paid: '付款完成（示範）', paidBody: '訂單已成立，店家會盡快出貨。',
    lost: '這次差一點！', lostBody: '謝謝參與，送你一張 9 折優惠券，全館商品都能用。', coupon: '9 折優惠券', shopNow: '去逛其他商品',
    winner: '得標者', finalPrice: '成交價', nobid: '這場沒有人出價', starts: '開始時間', endsAt: '結標時間', rulesT: '競標規則',
    rules: ['價高者得，每次出價至少要比目前價多「最低加價」。', '結標前 2 分鐘內有人出價，自動延長 2 分鐘。', '有直購價的商品，按「直購」立即成交。', '得標後 48 小時內付款；沒得標的參加者會收到 9 折優惠券。'],
    share: '分享給朋友', shared: '已複製分享連結（示範）', close: '關閉', myT: '我參加的競標', myLead: '領先中', myOut: '被超標', myWon: '已得標', myLost: '未得標',
    justNow: '剛剛', minAgo: '{n} 分鐘前', hrAgo: '{n} 小時前', dayAgo: '{n} 天前', day: '天', buyNowTag: '直購', confirmBuy: '確定以 {p} 直購？', yes: '確定', no: '再想想',
    notice: '示範：不會真的扣款或發送簡訊', orderNo: '訂單編號', priceNote: '訂單金額以成交價為準，運費另計', empty: '目前沒有競標活動，敬請期待。', proxyNone: '',
  },
  en: {
    kicker: 'Live auctions', title: 'Name your price, take it home', sub: 'Each week we open a few items for bidding, some starting at NT$1. Highest bid wins — bid, win and pay right here.',
    demo: 'Demo data · not a real transaction', rule: 'A bid in the final 2 minutes extends the auction by 2 minutes, so everyone gets a fair chance.',
    tagOne: 'Starts at NT$1', tagNormal: 'Auction', live: 'Live', upcoming: 'Coming soon', ended: 'Ended', closing: 'Closing',
    endsIn: 'Ends in', startsIn: 'Starts in', current: 'Current bid', startPrice: 'Starting bid', bids: '{n} bids', watching: '{n} watching', views: '{n} views',
    bid: 'Bid', view: 'See result', remind: 'View', buyNow: 'Buy now {p}', buyNowNote: 'Buy now ends the auction immediately', minInc: 'Raise by at least {p}',
    yourBid: 'Your bid', place: 'Place bid', simulate: 'Simulate another bidder', simNote: 'Demo: see a bidding war even on your own', history: 'Bid history',
    noBids: 'No bids yet — be the first!', you: 'You', leading: 'You are the highest bidder', outbid: 'You have been outbid!', outbidBody: '{name} bid {p}. Bid a little more to take the lead back.',
    bidOk: 'Bid placed!', bidOkBody: 'You are leading. We will tell you right away if someone outbids you.', extended: 'Late bid — auction extended by 2 minutes', tooLow: 'Minimum bid is {p}', self: 'You are already the highest bidder', closedErr: 'This auction has ended',
    verifyT: 'Verify your phone to bid', verifyS: 'One bidder identity per phone keeps bidding fair.', phone: 'Mobile number', phonePh: '10 digits starting with 09', sendCode: 'Send code', code: 'Code', codeHint: 'Demo code: 123456',
    nick: 'Nickname (shown anonymised, e.g. "Kev＊＊")', nickPh: 'e.g. Kevin', verifyBtn: 'Verify & bid', phoneErr: 'Enter a 10-digit number starting with 09', codeErr: 'Wrong code (demo: 123456)', sent: 'Code sent (demo — no real SMS)', verified: 'Phone verified',
    won: 'You won!', wonBody: 'Winning price {p}. Please pay within {h} hours or the win will be cancelled.', payBy: 'Pay by', payNow: 'Pay now (demo)', paid: 'Payment complete (demo)', paidBody: 'Your order is confirmed and will ship soon.',
    lost: 'So close!', lostBody: 'Thanks for bidding — here is a 10%-off coupon for anything in the shop.', coupon: '10% off coupon', shopNow: 'Browse the shop',
    winner: 'Winner', finalPrice: 'Final price', nobid: 'No bids in this auction', starts: 'Starts', endsAt: 'Ends', rulesT: 'How it works',
    rules: ['Highest bid wins. Each bid must beat the current price by the minimum increment.', 'A bid in the last 2 minutes extends the auction by 2 minutes.', 'If a Buy now price is set, buying ends the auction instantly.', 'Pay within 48 hours of winning. Other bidders get a 10%-off coupon.'],
    share: 'Share', shared: 'Share link copied (demo)', close: 'Close', myT: 'My auctions', myLead: 'Leading', myOut: 'Outbid', myWon: 'Won', myLost: 'Not won',
    justNow: 'just now', minAgo: '{n} min ago', hrAgo: '{n} h ago', dayAgo: '{n} d ago', day: 'd', buyNowTag: 'Buy now', confirmBuy: 'Buy now for {p}?', yes: 'Buy', no: 'Not yet',
    notice: 'Demo: no real charge or SMS', orderNo: 'Order no.', priceNote: 'Order amount follows the winning price; shipping extra', empty: 'No auctions right now. Stay tuned!', proxyNone: '',
  },
  ja: {
    kicker: '期間限定オークション', title: '値段はあなたが決める', sub: '毎週いくつかの商品をオークションに出品。1 元スタートの商品も。最高額の方が落札です。入札・落札・お支払いまでここで完結。',
    demo: 'デモデータ・実際の取引ではありません', rule: '終了 2 分前以内に入札があると、自動で 2 分延長されます。',
    tagOne: '1 元スタート', tagNormal: 'オークション', live: '開催中', upcoming: '近日開始', ended: '終了', closing: '終了処理中',
    endsIn: '残り', startsIn: '開始まで', current: '現在価格', startPrice: '開始価格', bids: '入札 {n} 件', watching: '{n} 人が閲覧中', views: '閲覧 {n} 回',
    bid: '入札する', view: '結果を見る', remind: '見る', buyNow: '即決 {p}', buyNowNote: '即決するとオークションはすぐ終了します', minInc: '最低 {p} 上乗せ',
    yourBid: '入札額', place: '入札を確定', simulate: 'ほかの入札者をシミュレート', simNote: 'デモ用：一人でも競り合いを体験できます', history: '入札履歴',
    noBids: 'まだ入札はありません。最初の入札者になろう！', you: 'あなた', leading: 'あなたが最高額入札者です', outbid: '高値更新されました！', outbidBody: '{name} さんが {p} で入札。少し上乗せすれば取り返せます。',
    bidOk: '入札しました！', bidOkBody: '現在あなたがトップです。高値更新されたらすぐお知らせします。', extended: '終了間際の入札により 2 分延長されました', tooLow: '{p} 以上で入札してください', self: 'すでにあなたが最高額です', closedErr: 'このオークションは終了しました',
    verifyT: '初回入札は電話番号の認証が必要です', verifyS: '電話番号ごとに 1 つの入札者 ID で、公正な入札を守ります。', phone: '携帯番号', phonePh: '09 から始まる 10 桁', sendCode: 'コードを送信', code: '認証コード', codeHint: 'デモ用コード：123456',
    nick: 'ニックネーム（履歴では「佐＊＊」のように匿名表示）', nickPh: '例：佐藤', verifyBtn: '認証して入札', phoneErr: '09 から始まる 10 桁の番号を入力してください', codeErr: 'コードが違います（デモ：123456）', sent: 'コードを送信しました（デモ・実際の SMS は送られません）', verified: '認証済み',
    won: '落札おめでとうございます！', wonBody: '落札価格 {p}。{h} 時間以内にお支払いください。期限を過ぎると落札は取り消されます。', payBy: 'お支払い期限', payNow: '支払いへ進む（デモ）', paid: 'お支払い完了（デモ）', paidBody: 'ご注文が確定しました。まもなく発送します。',
    lost: 'あと一歩でした！', lostBody: 'ご参加ありがとうございます。全商品に使える 10% オフクーポンをどうぞ。', coupon: '10% オフクーポン', shopNow: 'ほかの商品を見る',
    winner: '落札者', finalPrice: '落札価格', nobid: '入札はありませんでした', starts: '開始', endsAt: '終了', rulesT: 'ルール',
    rules: ['最高額の方が落札。入札は現在価格＋最低上乗せ額以上で。', '終了 2 分前以内の入札で 2 分自動延長。', '即決価格がある商品は「即決」ですぐ購入できます。', '落札後 48 時間以内にお支払い。落札できなかった方には 10% オフクーポン。'],
    share: 'シェア', shared: 'シェア用リンクをコピーしました（デモ）', close: '閉じる', myT: '参加中のオークション', myLead: 'トップ', myOut: '高値更新された', myWon: '落札', myLost: '落札ならず',
    justNow: 'たった今', minAgo: '{n} 分前', hrAgo: '{n} 時間前', dayAgo: '{n} 日前', day: '日', buyNowTag: '即決', confirmBuy: '{p} で即決しますか？', yes: '即決する', no: 'やめる',
    notice: 'デモ：実際の請求や SMS は発生しません', orderNo: '注文番号', priceNote: '注文金額は落札価格に準じます（送料別）', empty: '現在開催中のオークションはありません。', proxyNone: '',
  },
  vi: {
    kicker: 'Đấu giá giới hạn', title: 'Tự trả giá, mang món ngon về', sub: 'Mỗi tuần chúng tôi mở đấu giá vài sản phẩm, có món bắt đầu từ 1 Đài tệ. Ai trả giá cao nhất sẽ thắng — đặt giá, thắng và thanh toán ngay tại đây.',
    demo: 'Dữ liệu demo · không phải giao dịch thật', rule: 'Có người đặt giá trong 2 phút cuối, phiên tự động kéo dài thêm 2 phút.',
    tagOne: 'Khởi điểm 1 Đài tệ', tagNormal: 'Đấu giá', live: 'Đang diễn ra', upcoming: 'Sắp bắt đầu', ended: 'Đã kết thúc', closing: 'Đang chốt',
    endsIn: 'Còn lại', startsIn: 'Bắt đầu sau', current: 'Giá hiện tại', startPrice: 'Giá khởi điểm', bids: '{n} lượt giá', watching: '{n} người đang xem', views: '{n} lượt xem',
    bid: 'Đặt giá', view: 'Xem kết quả', remind: 'Xem', buyNow: 'Mua ngay {p}', buyNowNote: 'Mua ngay sẽ kết thúc phiên đấu giá lập tức', minInc: 'Mỗi lần tăng ít nhất {p}',
    yourBid: 'Giá của bạn', place: 'Xác nhận đặt giá', simulate: 'Mô phỏng người mua khác', simNote: 'Demo: tự mình xem quá trình đấu giá', history: 'Lịch sử đặt giá',
    noBids: 'Chưa có ai đặt giá — hãy là người đầu tiên!', you: 'Bạn', leading: 'Bạn đang trả giá cao nhất', outbid: 'Bạn đã bị trả giá cao hơn!', outbidBody: '{name} đặt {p}. Thêm một chút để giành lại.',
    bidOk: 'Đặt giá thành công!', bidOkBody: 'Bạn đang dẫn đầu. Chúng tôi sẽ báo ngay nếu có người trả cao hơn.', extended: 'Có giá phút chót — đã kéo dài 2 phút', tooLow: 'Giá tối thiểu là {p}', self: 'Bạn đã là người trả giá cao nhất', closedErr: 'Phiên đấu giá đã kết thúc',
    verifyT: 'Lần đầu đặt giá, hãy xác minh số điện thoại', verifyS: 'Mỗi số điện thoại chỉ có một danh tính, đảm bảo công bằng.', phone: 'Số điện thoại', phonePh: '10 số, bắt đầu bằng 09', sendCode: 'Gửi mã', code: 'Mã xác minh', codeHint: 'Mã demo: 123456',
    nick: 'Biệt danh (hiển thị ẩn danh, vd "Ngu＊＊")', nickPh: 'vd: Lan', verifyBtn: 'Xác minh & đặt giá', phoneErr: 'Nhập số 10 chữ số bắt đầu bằng 09', codeErr: 'Sai mã (demo: 123456)', sent: 'Đã gửi mã (demo — không gửi SMS thật)', verified: 'Đã xác minh',
    won: 'Chúc mừng bạn đã thắng!', wonBody: 'Giá chốt {p}. Vui lòng thanh toán trong {h} giờ, quá hạn sẽ bị hủy.', payBy: 'Hạn thanh toán', payNow: 'Thanh toán (demo)', paid: 'Đã thanh toán (demo)', paidBody: 'Đơn hàng đã được xác nhận và sẽ sớm giao.',
    lost: 'Suýt nữa thì thắng!', lostBody: 'Cảm ơn bạn đã tham gia — tặng bạn phiếu giảm 10% cho mọi sản phẩm.', coupon: 'Phiếu giảm 10%', shopNow: 'Xem sản phẩm khác',
    winner: 'Người thắng', finalPrice: 'Giá chốt', nobid: 'Không có ai đặt giá', starts: 'Bắt đầu', endsAt: 'Kết thúc', rulesT: 'Luật đấu giá',
    rules: ['Giá cao nhất thắng; mỗi lần phải cao hơn giá hiện tại ít nhất bằng bước giá.', 'Đặt giá trong 2 phút cuối sẽ kéo dài thêm 2 phút.', 'Sản phẩm có giá mua ngay có thể mua liền.', 'Thanh toán trong 48 giờ sau khi thắng. Người không thắng nhận phiếu giảm 10%.'],
    share: 'Chia sẻ', shared: 'Đã sao chép liên kết (demo)', close: 'Đóng', myT: 'Phiên tôi tham gia', myLead: 'Dẫn đầu', myOut: 'Bị vượt', myWon: 'Đã thắng', myLost: 'Không thắng',
    justNow: 'vừa xong', minAgo: '{n} phút trước', hrAgo: '{n} giờ trước', dayAgo: '{n} ngày trước', day: 'ngày', buyNowTag: 'Mua ngay', confirmBuy: 'Mua ngay với giá {p}?', yes: 'Mua', no: 'Để sau',
    notice: 'Demo: không trừ tiền hay gửi SMS thật', orderNo: 'Mã đơn', priceNote: 'Giá đơn theo giá chốt, chưa gồm phí ship', empty: 'Hiện chưa có phiên đấu giá nào.', proxyNone: '',
  },
  ms: {
    kicker: 'Lelongan terhad', title: 'Letak harga anda, bawa pulang', sub: 'Setiap minggu kami buka lelongan untuk beberapa produk, ada yang bermula NT$1. Bidaan tertinggi menang — bida, menang dan bayar di sini.',
    demo: 'Data demo · bukan transaksi sebenar', rule: 'Bidaan dalam 2 minit terakhir melanjutkan lelongan 2 minit lagi.',
    tagOne: 'Bermula NT$1', tagNormal: 'Lelongan', live: 'Sedang berlangsung', upcoming: 'Akan datang', ended: 'Tamat', closing: 'Sedang ditutup',
    endsIn: 'Tamat dalam', startsIn: 'Bermula dalam', current: 'Bidaan semasa', startPrice: 'Harga permulaan', bids: '{n} bidaan', watching: '{n} sedang melihat', views: '{n} tontonan',
    bid: 'Bida', view: 'Lihat keputusan', remind: 'Lihat', buyNow: 'Beli terus {p}', buyNowNote: 'Beli terus menamatkan lelongan serta-merta', minInc: 'Naikkan sekurang-kurangnya {p}',
    yourBid: 'Bidaan anda', place: 'Sahkan bidaan', simulate: 'Simulasi pembida lain', simNote: 'Demo: lihat perang bidaan walaupun seorang', history: 'Sejarah bidaan',
    noBids: 'Belum ada bidaan — jadilah yang pertama!', you: 'Anda', leading: 'Anda pembida tertinggi', outbid: 'Bidaan anda telah dipintas!', outbidBody: '{name} membida {p}. Tambah sedikit untuk merebut semula.',
    bidOk: 'Bidaan berjaya!', bidOkBody: 'Anda sedang mendahului. Kami akan maklumkan segera jika dipintas.', extended: 'Bidaan saat akhir — dilanjutkan 2 minit', tooLow: 'Bidaan minimum {p}', self: 'Anda sudah pembida tertinggi', closedErr: 'Lelongan ini telah tamat',
    verifyT: 'Sahkan telefon untuk bidaan pertama', verifyS: 'Satu identiti bagi setiap telefon supaya bidaan adil.', phone: 'Nombor telefon', phonePh: '10 digit bermula 09', sendCode: 'Hantar kod', code: 'Kod', codeHint: 'Kod demo: 123456',
    nick: 'Nama samaran (dipapar tanpa nama, cth "Far＊＊")', nickPh: 'cth: Farah', verifyBtn: 'Sahkan & bida', phoneErr: 'Masukkan 10 digit bermula 09', codeErr: 'Kod salah (demo: 123456)', sent: 'Kod dihantar (demo — tiada SMS sebenar)', verified: 'Telefon disahkan',
    won: 'Tahniah, anda menang!', wonBody: 'Harga akhir {p}. Sila bayar dalam {h} jam atau kemenangan dibatalkan.', payBy: 'Bayar sebelum', payNow: 'Bayar sekarang (demo)', paid: 'Bayaran selesai (demo)', paidBody: 'Pesanan disahkan dan akan dihantar segera.',
    lost: 'Hampir menang!', lostBody: 'Terima kasih kerana menyertai — ini kupon diskaun 10% untuk semua produk.', coupon: 'Kupon diskaun 10%', shopNow: 'Lihat produk lain',
    winner: 'Pemenang', finalPrice: 'Harga akhir', nobid: 'Tiada bidaan', starts: 'Bermula', endsAt: 'Tamat', rulesT: 'Peraturan',
    rules: ['Bidaan tertinggi menang; setiap bidaan mesti melebihi harga semasa sekurang-kurangnya kenaikan minimum.', 'Bidaan dalam 2 minit terakhir melanjutkan 2 minit.', 'Jika ada harga Beli terus, pembelian menamatkan lelongan serta-merta.', 'Bayar dalam 48 jam selepas menang. Pembida lain dapat kupon 10%.'],
    share: 'Kongsi', shared: 'Pautan disalin (demo)', close: 'Tutup', myT: 'Lelongan saya', myLead: 'Mendahului', myOut: 'Dipintas', myWon: 'Menang', myLost: 'Tidak menang',
    justNow: 'baru sahaja', minAgo: '{n} minit lalu', hrAgo: '{n} jam lalu', dayAgo: '{n} hari lalu', day: 'h', buyNowTag: 'Beli terus', confirmBuy: 'Beli terus pada {p}?', yes: 'Beli', no: 'Nanti dulu',
    notice: 'Demo: tiada caj atau SMS sebenar', orderNo: 'No. pesanan', priceNote: 'Jumlah pesanan ikut harga akhir; penghantaran berasingan', empty: 'Tiada lelongan buat masa ini.', proxyNone: '',
  },
};

/* ---------- 內嵌圖示 ---------- */
const sv = (d, s = 16) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const IC = {
  gavel: '<path d="m14 13-7.5 7.5a2.1 2.1 0 0 1-3-3L11 10"/><path d="m16 16 6-6M8 8l6-6M9 7l8 8M21 11l-8-8"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
  shield: '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/><path d="m9 12 2 2 4-4"/>',
  share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M21.5 20a6.5 6.5 0 0 0-4-6"/>',
  trophy: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M17 5h3a3 3 0 0 1-3 4M7 5H4a3 3 0 0 0 3 4"/>',
  ticket: '<path d="M3 9a3 3 0 0 0 0 6v3h18v-3a3 3 0 0 1 0-6V6H3z"/><path d="M13 6v12" stroke-dasharray="2 2"/>',
  alert: '<path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  phone: '<rect x="6" y="2" width="12" height="20" rx="2.5"/><path d="M11 18h2"/>',
};

// toast 一律帶圖示
const TOAST_IC = { ok: IC.gavel, warn: IC.alert };
const toast = (title, body = '', opt = {}) => baseToast(title, body, { icon: sv(TOAST_IC[opt.kind || 'ok'] || IC.gavel, 18), ...opt });

/* ---------- 狀態 ---------- */
let shop = null;
let root = null;
let openId = null;
let modal = null;
let lastTick = 0;
const notified = new Set();
const tx = (k, vars = {}) => {
  const d = L[shop?.lang] || L.zh;
  let s = d[k] ?? L.zh[k] ?? k;
  if (typeof s === 'string') s = s.replace(/\{(\w+)\}/g, (_, n) => vars[n] ?? '');
  return s;
};
const me = () => auctions.me();
const isMe = (uid) => { const m = me(); return !!(m && uid === m.uid); };

function nameOf(a) {
  const lang = shop?.lang || 'zh';
  try { const n = pName(lang, a.pid); if (n) return n; } catch { /* 非預設業主的商品可能沒有翻譯 */ }
  const p = auctions.product(a);
  return p ? (lang === 'zh' ? p.name : (p.en || p.name)) : a.pid;
}
function unitOf(a) {
  try { const u = pUnit(shop?.lang || 'zh', a.pid); if (u) return u; } catch { /* ignore */ }
  return auctions.product(a)?.unit || '';
}
function artOf(a, size) {
  try { const s = productArt(a.pid, size); if (s && s.length > 80) return s; } catch { /* ignore */ }
  const p = auctions.product(a) || {};
  return `<svg class="art" width="${size}" height="${size}" viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="50" fill="${p.color || '#cfe9da'}"/><rect x="36" y="38" width="48" height="44" rx="10" fill="${p.accent || '#1f8f5a'}" opacity=".85"/></svg>`;
}

function fmtLeft(ms) {
  ms = Math.max(0, ms);
  const s = Math.floor(ms / 1000), d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60), ss = s % 60;
  return (d ? `${d}${tx('day')} ` : '') + `${pad(h)}:${pad(m)}:${pad(ss)}`;
}
function ago(ts) {
  const m = Math.floor((Date.now() - ts) / 60000);
  if (m < 1) return tx('justNow');
  if (m < 60) return tx('minAgo', { n: m });
  const h = Math.floor(m / 60);
  return h < 24 ? tx('hrAgo', { n: h }) : tx('dayAgo', { n: Math.floor(h / 24) });
}
const fmtClock = (ts) => { const d = new Date(ts); return `${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`; };

function visibleList() {
  const order = { live: 0, closing: 0, upcoming: 1, ended: 2, sold: 2, nobid: 3 };
  const now = Date.now();
  return auctions.list()
    .filter(a => { const st = auctions.status(a); return st === 'live' || st === 'closing' || st === 'upcoming' || (a.closedAt && now - a.closedAt < 3 * 86400e3); })
    .sort((x, y) => (order[auctions.status(x)] - order[auctions.status(y)]) || (x.endAt - y.endAt));
}
function myState(a) {
  const m = me(); if (!m) return null;
  if (!a.bids.some(b => b.uid === m.uid)) return null;
  const st = auctions.status(a);
  const top = auctions.top(a);
  if (st === 'ended' || st === 'sold') return a.winner && a.winner.uid === m.uid ? 'won' : 'lost';
  return top && top.uid === m.uid ? 'lead' : 'out';
}

/* ---------- 區塊 ---------- */
function renderSection(animate) {
  if (!root) return;
  const list = visibleList();
  root.innerHTML = `
  <div class="au2">
    <div class="au2-head">
      <div class="au2-head-t">
        <span class="au2-kicker">${sv(IC.gavel, 15)} ${esc(tx('kicker'))}</span>
        <h2>${esc(tx('title'))}</h2>
        <p>${esc(tx('sub'))}</p>
      </div>
      <div class="au2-head-side">
        <span class="au2-demo">${sv(IC.alert, 13)} ${esc(tx('demo'))}</span>
        <p class="au2-rule">${sv(IC.clock, 15)}<span>${esc(tx('rule'))}</span></p>
      </div>
    </div>
    <div class="au2-mine" id="au2Mine"></div>
    <div class="au2-grid">${list.length ? list.map(cardHTML).join('') : `<p class="au2-empty">${esc(tx('empty'))}</p>`}</div>
  </div>`;
  renderMine();
  $$('.au2-card', root).forEach(c => c.addEventListener('click', () => openDetail(c.dataset.id)));
  if (animate) gsap.fromTo($$('.au2-card', root), { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.5, stagger: 0.05, ease: 'power3.out' });
  updateTimers();
}

function cardHTML(a) {
  const st = auctions.status(a);
  const p = auctions.product(a) || {};
  const ms = myState(a);
  const stLabel = st === 'live' ? tx('live') : st === 'upcoming' ? tx('upcoming') : st === 'closing' ? tx('closing') : tx('ended');
  const priceLabel = a.closed ? tx('finalPrice') : a.bids.length ? tx('current') : tx('startPrice');
  const price = a.closed && a.final ? a.final : auctions.price(a);
  const btn = st === 'live' ? tx('bid') : st === 'upcoming' ? tx('remind') : tx('view');
  return `<article class="au2-card is-${st} ${ms ? 'me-' + ms : ''}" data-id="${a.id}" style="--pc:${p.color || '#cfe9da'}" tabindex="0">
    <div class="au2-art">${artOf(a, 168)}
      <span class="au2-tag ${a.kind}">${a.kind === 'one' ? esc(tx('tagOne')) : esc(tx('tagNormal'))}</span>
      <span class="au2-st ${st}"><i></i>${esc(stLabel)}</span>
      ${ms ? `<span class="au2-me ${ms}">${esc(tx({ lead: 'myLead', out: 'myOut', won: 'myWon', lost: 'myLost' }[ms]))}</span>` : ''}
    </div>
    <div class="au2-body">
      <div class="au2-name"><h3>${esc(nameOf(a))}</h3><small>${esc(unitOf(a))}</small></div>
      <div class="au2-price"><span>${esc(priceLabel)}</span><b data-price="${a.id}">${money(price)}</b></div>
      <div class="au2-meta"><span>${sv(IC.gavel, 13)} ${esc(tx('bids', { n: a.bids.length }))}</span>${a.buyNow && !a.closed ? `<span class="au2-bn">${sv(IC.bolt, 13)} ${esc(tx('buyNowTag'))} ${money(a.buyNow)}</span>` : ''}</div>
      <div class="au2-foot">
        <div class="au2-cd ${st}">${st === 'live' || st === 'upcoming' ? `<small>${esc(st === 'live' ? tx('endsIn') : tx('startsIn'))}</small><b data-cd="${a.id}">--:--:--</b>` : `<small>${esc(a.winner ? tx('winner') : tx('ended'))}</small><b class="au2-who">${a.winner ? esc(isMe(a.winner.uid) ? tx('you') : maskName(a.winner.name)) : esc(tx('nobid'))}</b>`}</div>
        <button class="au2-btn ${st === 'live' ? 'hot' : ''}" type="button">${esc(btn)}</button>
      </div>
    </div>
  </article>`;
}

function renderMine() {
  const host = $('#au2Mine', root); if (!host) return;
  const m = me();
  const mine = m ? auctions.list().filter(a => a.bids.some(b => b.uid === m.uid)).slice(-4) : [];
  if (!mine.length) { host.hidden = true; host.innerHTML = ''; return; }
  host.hidden = false;
  host.innerHTML = `<b>${sv(IC.users, 15)} ${esc(tx('myT'))}</b>${mine.map(a => { const s = myState(a) || 'lead'; return `<button class="au2-mchip ${s}" data-id="${a.id}"><span>${esc(nameOf(a))}</span><i>${esc(tx({ lead: 'myLead', out: 'myOut', won: 'myWon', lost: 'myLost' }[s]))}</i></button>`; }).join('')}`;
  $$('.au2-mchip', host).forEach(b => b.addEventListener('click', () => openDetail(b.dataset.id)));
}

function updateTimers() {
  const now = Date.now();
  for (const a of auctions.list()) {
    const st = auctions.status(a, now);
    const left = st === 'upcoming' ? a.startAt - now : a.endAt - now;
    $$(`[data-cd="${a.id}"]`).forEach(n => {
      n.textContent = fmtLeft(left);
      n.classList.toggle('urgent', st === 'live' && left < 2 * 60e3);
    });
  }
  if (modal && openId) updateDetailTimer();
}

/* ---------- 詳情 ---------- */
function ensureModal() {
  if (modal) return modal;
  modal = el(`<div class="au2-modal" hidden role="dialog" aria-modal="true"><div class="au2-dlg" id="au2Dlg"></div></div>`);
  document.body.appendChild(modal);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeDetail(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !modal.hidden) closeDetail(); });
  return modal;
}
function openDetail(id) {
  const a = auctions.get(id); if (!a) return;
  ensureModal();
  const first = modal.hidden || openId !== id;
  openId = id;
  if (first) auctions.addView(id);
  renderDetail(true);
  if (first) {
    modal.hidden = false;
    document.documentElement.classList.add('au2-lock');
    gsap.fromTo(modal, { opacity: 0 }, { opacity: 1, duration: 0.25 });
    gsap.fromTo('#au2Dlg', { y: 40, scale: 0.96, opacity: 0 }, { y: 0, scale: 1, opacity: 1, duration: 0.45, ease: 'back.out(1.4)' });
  }
}
function closeDetail() {
  if (!modal || modal.hidden) return;
  gsap.to(modal, { opacity: 0, duration: 0.2, onComplete: () => { modal.hidden = true; openId = null; document.documentElement.classList.remove('au2-lock'); } });
}

let quick = null; // 目前輸入的出價
let verifyStep = 0;
function renderDetail(reset) {
  const a = auctions.get(openId); if (!a) return;
  const dlg = $('#au2Dlg');
  const st = auctions.status(a);
  const p = auctions.product(a) || {};
  if (reset) { quick = auctions.minNext(a); verifyStep = 0; }
  if (quick < auctions.minNext(a)) quick = auctions.minNext(a);
  const stLabel = st === 'live' ? tx('live') : st === 'upcoming' ? tx('upcoming') : st === 'closing' ? tx('closing') : tx('ended');
  dlg.innerHTML = `<button class="au2-x" type="button" aria-label="${esc(tx('close'))}">${sv(IC.x, 18)}</button>
    <div class="au2-d-left" style="--pc:${p.color || '#cfe9da'}">
      <div class="au2-d-art">${artOf(a, 260)}</div>
      <div class="au2-d-tags"><span class="au2-tag ${a.kind} inl">${a.kind === 'one' ? esc(tx('tagOne')) : esc(tx('tagNormal'))}</span><span class="au2-st ${st} inl"><i></i>${esc(stLabel)}</span><span class="au2-demo sm">${esc(tx('demo'))}</span></div>
      <div class="au2-d-name"><h3>${esc(nameOf(a))} <small>${esc(unitOf(a))}</small></h3><button type="button" class="au2-share" id="au2Share">${sv(IC.share, 14)} ${esc(tx('share'))}</button></div>
      <div class="au2-d-facts">
        <span>${esc(tx('startPrice'))}<b>${money(a.start)}</b></span>
        <span>${esc(tx('minInc', { p: '' })).replace(/\s*$/, '')}<b>${money(a.inc)}</b></span>
        ${a.buyNow ? `<span>${esc(tx('buyNowTag'))}<b>${money(a.buyNow)}</b></span>` : ''}
        <span>${esc(tx('endsAt'))}<b data-endat>${fmtClock(a.endAt)}</b></span>
      </div>
      <details class="au2-rules" ${window.innerWidth > 860 ? 'open' : ''}><summary>${sv(IC.shield, 14)} ${esc(tx('rulesT'))}</summary><ol>${tx('rules').map(r => `<li>${esc(r)}</li>`).join('')}</ol></details>
    </div>
    <div class="au2-d-right">
      <div class="au2-d-top">
        <div class="au2-d-cd ${st}"><small>${esc(st === 'upcoming' ? tx('startsIn') : st === 'live' ? tx('endsIn') : tx('endsAt'))}</small><b id="au2DCd">${st === 'live' || st === 'upcoming' ? '--:--:--' : fmtClock(a.closedAt || a.endAt)}</b></div>
        <div class="au2-d-stats"><span>${sv(IC.eye, 13)} ${esc(st === 'live' ? tx('watching', { n: auctions.watching(a) }) : tx('views', { n: a.views.toLocaleString() }))}</span><span>${sv(IC.gavel, 13)} ${esc(tx('bids', { n: a.bids.length }))}</span></div>
      </div>
      <div class="au2-d-price"><small>${esc(a.closed ? tx('finalPrice') : a.bids.length ? tx('current') : tx('startPrice'))}</small><b id="au2DPrice">${money(a.closed && a.final ? a.final : auctions.price(a))}</b></div>
      <div id="au2Banner">${bannerHTML(a)}</div>
      <div id="au2Act">${actHTML(a, st)}</div>
      <div class="au2-hist"><h4>${esc(tx('history'))}</h4><ol id="au2Hist">${histHTML(a)}</ol></div>
    </div>`;
  bindDetail(a, st);
  updateDetailTimer();
}

function bannerHTML(a) {
  const ms = myState(a);
  if (ms === 'lead') return `<div class="au2-ban lead">${sv(IC.check, 16)}<span>${esc(tx('leading'))}</span></div>`;
  if (ms === 'out') { const t = auctions.top(a); return `<div class="au2-ban out">${sv(IC.alert, 16)}<span><b>${esc(tx('outbid'))}</b> ${esc(tx('outbidBody', { name: maskName(t.name), p: money(t.amt) }))}</span></div>`; }
  if (a.extended && auctions.status(a) === 'live') return `<div class="au2-ban ext">${sv(IC.clock, 16)}<span>${esc(tx('extended'))} ×${a.extended}</span></div>`;
  return '';
}

function actHTML(a, st) {
  const m = me();
  if (st === 'upcoming') return `<div class="au2-wait">${sv(IC.clock, 18)}<span>${esc(tx('starts'))}：<b>${fmtClock(a.startAt)}</b></span></div>`;
  if (st === 'closing') return `<div class="au2-wait"><span class="au2-spin"></span><span>${esc(tx('closing'))}…</span></div>`;
  if (st !== 'live') return resultHTML(a);
  if (!m && verifyStep > 0) return verifyHTML();
  const min = auctions.minNext(a);
  const steps = [min, min + a.inc, min + a.inc * 4].filter((v, i, arr) => !a.buyNow || v < a.buyNow || i === 0);
  return `<div class="au2-bid">
      <div class="au2-quick">${steps.map((v, i) => `<button type="button" data-q="${v}" class="${v === quick ? 'on' : ''}">${money(v)}</button>`).join('')}</div>
      <div class="au2-input"><label for="au2Amt">${esc(tx('yourBid'))}</label><div class="au2-in"><span>NT$</span><input id="au2Amt" inputmode="numeric" value="${quick}" autocomplete="off"></div>
        <button class="au2-go" id="au2Place" type="button">${sv(IC.gavel, 16)} ${esc(tx('place'))}</button></div>
      <small class="au2-hint">${esc(tx('minInc', { p: money(a.inc) }))}${m ? ` ・ ${sv(IC.shield, 12)} ${esc(tx('verified'))} ${esc(m.phone)}` : ''}</small>
      ${a.buyNow ? `<button class="au2-buy" id="au2Buy" type="button">${sv(IC.bolt, 15)} ${esc(tx('buyNow', { p: money(a.buyNow) }))}<small>${esc(tx('buyNowNote'))}</small></button>` : ''}
      <div class="au2-sim"><button type="button" id="au2Sim">${sv(IC.users, 14)} ${esc(tx('simulate'))}</button><small>${esc(tx('simNote'))}</small></div>
    </div>`;
}

function verifyHTML() {
  return `<form class="au2-ver" id="au2Ver" autocomplete="off">
    <div class="au2-ver-h">${sv(IC.phone, 20)}<div><b>${esc(tx('verifyT'))}</b><small>${esc(tx('verifyS'))}</small></div></div>
    <label>${esc(tx('phone'))}<div class="au2-row"><input id="au2Ph" inputmode="tel" maxlength="10" placeholder="${esc(tx('phonePh'))}"><button type="button" id="au2Send">${esc(tx('sendCode'))}</button></div></label>
    <div class="au2-ver2" ${verifyStep < 2 ? 'hidden' : ''}>
      <label>${esc(tx('code'))}<input id="au2Code" inputmode="numeric" maxlength="6" placeholder="123456"><small class="au2-hint">${esc(tx('codeHint'))}</small></label>
      <label>${esc(tx('nick'))}<input id="au2Nick" maxlength="16" placeholder="${esc(tx('nickPh'))}"></label>
      <button class="au2-go wide" type="submit">${sv(IC.shield, 16)} ${esc(tx('verifyBtn'))}</button>
    </div>
    <p class="au2-err" id="au2Err" hidden></p>
    <small class="au2-hint">${esc(tx('notice'))}</small>
  </form>`;
}

function resultHTML(a) {
  const m = me();
  if (!a.winner) return `<div class="au2-res none">${sv(IC.gavel, 20)}<b>${esc(tx('nobid'))}</b></div>`;
  const mine = m && a.winner.uid === m.uid;
  if (mine) {
    return `<div class="au2-res won">
      <div class="au2-res-h">${sv(IC.trophy, 26)}<div><b>${esc(tx('won'))}</b><span>${esc(tx('wonBody', { p: money(a.final), h: RULES.payHours }))}</span></div></div>
      <dl><dt>${esc(tx('payBy'))}</dt><dd>${fmtClock(a.payBy)}</dd>${a.orderId ? `<dt>${esc(tx('orderNo'))}</dt><dd class="mono">${esc(a.orderId)}</dd>` : ''}</dl>
      <small class="au2-hint">${esc(tx('priceNote'))}・${esc(tx('notice'))}</small>
      ${a.paidAt ? `<div class="au2-ban lead">${sv(IC.check, 16)}<span><b>${esc(tx('paid'))}</b> ${esc(tx('paidBody'))}</span></div>` : `<button class="au2-go wide" id="au2Pay" type="button">${esc(tx('payNow'))}</button>`}
    </div>`;
  }
  const cp = m && a.coupons.find(c => c.uid === m.uid);
  return `<div class="au2-res">
    <div class="au2-res-row"><span>${esc(tx('winner'))}</span><b>${esc(maskName(a.winner.name))}</b><span>${esc(tx('finalPrice'))}</span><b>${money(a.final)}</b></div>
    ${cp ? `<div class="au2-coupon"><div>${sv(IC.ticket, 22)}</div><div><b>${esc(tx('lost'))}</b><span>${esc(tx('lostBody'))}</span><code>${esc(cp.code)}</code></div><a href="#products" class="au2-go sm" data-close>${esc(tx('shopNow'))}</a></div>` : ''}
  </div>`;
}

function histHTML(a) {
  if (!a.bids.length) return `<li class="au2-h-empty">${esc(tx('noBids'))}</li>`;
  return a.bids.slice(-12).reverse().map((b, i) => `<li class="${i === 0 ? 'top' : ''} ${isMe(b.uid) ? 'mine' : ''}" data-bid="${esc(b.id)}">
    <span class="au2-h-av">${esc((isMe(b.uid) ? tx('you') : maskName(b.name)).slice(0, 1))}</span>
    <span class="au2-h-n">${esc(isMe(b.uid) ? `${tx('you')}（${maskName(b.name)}）` : maskName(b.name))}${b.buyNow ? ` <i class="au2-h-bn">${esc(tx('buyNowTag'))}</i>` : ''}</span>
    <span class="au2-h-t">${esc(ago(b.ts))}</span><b>${money(b.amt)}</b></li>`).join('');
}

function bindDetail(a, st) {
  const dlg = $('#au2Dlg');
  $('.au2-x', dlg).addEventListener('click', closeDetail);
  $$('[data-close]', dlg).forEach(x => x.addEventListener('click', () => closeDetail()));
  $$('[data-q]', dlg).forEach(b => b.addEventListener('click', () => {
    quick = +b.dataset.q; $('#au2Amt').value = quick;
    $$('[data-q]', dlg).forEach(x => x.classList.toggle('on', x === b));
    gsap.fromTo('#au2Amt', { scale: 1.06 }, { scale: 1, duration: 0.3 });
  }));
  const amt = $('#au2Amt');
  if (amt) {
    amt.addEventListener('input', () => { amt.value = amt.value.replace(/\D/g, '').slice(0, 7); quick = +amt.value || 0; $$('[data-q]', dlg).forEach(x => x.classList.toggle('on', +x.dataset.q === quick)); });
    amt.addEventListener('keydown', (e) => { if (e.key === 'Enter') doBid(); });
  }
  $('#au2Place')?.addEventListener('click', doBid);
  $('#au2Share')?.addEventListener('click', () => { auctions.addShare(a.id); toast(tx('shared'), ''); });
  $('#au2Buy')?.addEventListener('click', (e) => doBuy(e.currentTarget));
  $('#au2Sim')?.addEventListener('click', (e) => {
    const r = auctions.simulateBid(a.id);
    if (!r.ok) toast(tx('closedErr'), '', { kind: 'warn' });
    gsap.fromTo(e.currentTarget, { scale: 0.94 }, { scale: 1, duration: 0.3, ease: 'back.out(3)' });
  });
  $('#au2Pay')?.addEventListener('click', async (e) => {
    const b = e.currentTarget; b.disabled = true; b.innerHTML = '<span class="au2-spin"></span>';
    setTimeout(() => { auctions.markPaid(a.id); toast(tx('paid'), tx('paidBody')); }, 900);
  });
  const ver = $('#au2Ver');
  if (ver) {
    const err = (k) => { const n = $('#au2Err'); n.hidden = !k; n.textContent = k ? tx(k) : ''; if (k) gsap.fromTo(ver, { x: -6 }, { x: 0, duration: 0.4, ease: 'elastic.out(1, 0.3)' }); };
    $('#au2Send').addEventListener('click', () => {
      const ph = $('#au2Ph').value.trim();
      if (!/^09\d{8}$/.test(ph)) { err('phoneErr'); return; }
      err(''); verifyStep = 2; $('.au2-ver2', ver).hidden = false; $('#au2Send').textContent = '✓';
      toast(tx('sent'), tx('codeHint'), { kind: 'ok' });
      gsap.fromTo($('.au2-ver2', ver), { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.35 });
      $('#au2Code').focus();
    });
    ver.addEventListener('submit', (e) => {
      e.preventDefault();
      const ph = $('#au2Ph').value.trim();
      if (!/^09\d{8}$/.test(ph)) { err('phoneErr'); return; }
      if ($('#au2Code').value.trim() !== '123456') { err('codeErr'); return; }
      auctions.verify({ phone: ph, name: $('#au2Nick').value, lang: shop.lang, auctionId: a.id });
      toast(tx('verified'), '');
      verifyStep = 0;
      doBid();
    });
  }
}

function doBid() {
  const a = auctions.get(openId); if (!a) return;
  const m = me();
  if (!m) { verifyStep = 1; renderDetail(false); return; }
  const btn = $('#au2Place');
  const r = auctions.placeBid(a.id, { uid: m.uid, name: m.name, lang: shop.lang }, quick);
  if (!r.ok) {
    const msg = r.err === 'low' ? tx('tooLow', { p: money(r.min) }) : r.err === 'self' ? tx('self') : tx('closedErr');
    toast(msg, '', { kind: 'warn' });
    renderDetail(false);
    return;
  }
  burst(btn || $('#au2DPrice'));
  if (r.buyNow) return;
  toast(tx('bidOk'), tx('bidOkBody'));
  if (r.extended) setTimeout(() => toast(tx('extended'), '', { kind: 'warn' }), 300);
}

function doBuy(btn) {
  const a = auctions.get(openId); if (!a) return;
  const m = me();
  if (!m) { verifyStep = 1; renderDetail(false); return; }
  if (btn.dataset.confirm !== '1') {
    btn.dataset.confirm = '1';
    btn.innerHTML = `${sv(IC.bolt, 15)} ${esc(tx('confirmBuy', { p: money(a.buyNow) }))}<small>${esc(tx('buyNowNote'))}</small>`;
    btn.classList.add('confirm');
    setTimeout(() => { if (btn.isConnected) { btn.dataset.confirm = ''; btn.classList.remove('confirm'); btn.innerHTML = `${sv(IC.bolt, 15)} ${esc(tx('buyNow', { p: money(a.buyNow) }))}<small>${esc(tx('buyNowNote'))}</small>`; } }, 4000);
    return;
  }
  const r = auctions.buyNow(a.id, { uid: m.uid, name: m.name, lang: shop.lang });
  if (!r.ok) toast(tx('closedErr'), '', { kind: 'warn' });
  else burst(btn);
}

// 出價成功動畫：小彩點從按鈕噴出
function burst(from) {
  if (!from) return;
  const r = from.getBoundingClientRect();
  const colors = ['#2DB674', '#F0A531', '#e8708e', '#2E97D4', '#7C62E6'];
  for (let i = 0; i < 18; i++) {
    const d = el(`<i class="au2-dot" style="background:${colors[i % colors.length]}"></i>`);
    document.body.appendChild(d);
    const ang = Math.random() * Math.PI * 2, dist = 50 + Math.random() * 90;
    gsap.fromTo(d, { left: r.left + r.width / 2, top: r.top + r.height / 2, scale: 1, opacity: 1 },
      { left: r.left + r.width / 2 + Math.cos(ang) * dist, top: r.top + r.height / 2 + Math.sin(ang) * dist - 30, scale: 0.3, opacity: 0, duration: 0.9 + Math.random() * 0.4, ease: 'power3.out', onComplete: () => d.remove() });
  }
  gsap.fromTo('#au2DPrice', { scale: 1.25, color: '#2DB674' }, { scale: 1, color: '', duration: 0.6, ease: 'back.out(2)' });
}

function updateDetailTimer() {
  const a = auctions.get(openId); if (!a) return;
  const n = $('#au2DCd'); if (!n) return;
  const st = auctions.status(a);
  if (st === 'live') { n.textContent = fmtLeft(a.endAt - Date.now()); n.classList.toggle('urgent', a.endAt - Date.now() < 2 * 60e3); }
  else if (st === 'upcoming') n.textContent = fmtLeft(a.startAt - Date.now());
}

/* ---------- 即時事件 ---------- */
function onBid({ a, bid, prevUid, extended }) {
  if (!a) return;
  const m = me();
  // 被超標通知
  if (m && prevUid === m.uid && bid.uid !== m.uid && !notified.has(bid.id)) {
    notified.add(bid.id);
    toast(tx('outbid'), tx('outbidBody', { name: maskName(bid.name), p: money(bid.amt) }), { kind: 'warn', duration: 6000 });
  }
  // 卡片價格閃動
  if (root) {
    renderSection(false);
    const card = $(`.au2-card[data-id="${a.id}"]`, root);
    if (card) {
      gsap.fromTo(card, { boxShadow: '0 0 0 3px rgba(45,182,116,0.65), 0 20px 40px rgba(31,51,41,0.12)' }, { boxShadow: '0 2px 0 rgba(31,51,41,0.04), 0 18px 40px rgba(31,51,41,0.07)', duration: 1.4 });
      gsap.fromTo($('[data-price]', card), { scale: 1.25, color: '#1f8f5a' }, { scale: 1, color: '', duration: 0.6, ease: 'back.out(2)' });
    }
  }
  if (openId === a.id && modal && !modal.hidden) {
    const keepVerify = !me() && verifyStep > 0;
    if (!keepVerify) renderDetail(false);
    else { $('#au2Hist').innerHTML = histHTML(a); $('#au2DPrice').textContent = money(auctions.price(a)); }
    const row = $('#au2Hist li.top');
    if (row) gsap.fromTo(row, { opacity: 0, x: -20, backgroundColor: 'rgba(45,182,116,0.25)' }, { opacity: 1, x: 0, backgroundColor: 'rgba(45,182,116,0)', duration: 0.8, ease: 'power3.out' });
    if (extended) gsap.fromTo('#au2DCd', { color: '#e8708e', scale: 1.15 }, { color: '', scale: 1, duration: 0.8 });
  }
}
function onClosed({ a }) {
  if (!a) return;
  const m = me();
  if (m && a.bids.some(b => b.uid === m.uid) && !notified.has('c' + a.id)) {
    notified.add('c' + a.id);
    if (a.winner && a.winner.uid === m.uid) toast(tx('won'), tx('wonBody', { p: money(a.final), h: RULES.payHours }), { kind: 'ok', duration: 7000 });
    else toast(tx('lost'), tx('lostBody'), { kind: 'ok', duration: 7000 });
    if (!modal || modal.hidden || openId !== a.id) openDetail(a.id);
  }
  renderSection(false);
  if (openId === a.id && modal && !modal.hidden) renderDetail(false);
}

export function initAuction(shopObj) {
  shop = shopObj;
  root = document.getElementById('auction');
  if (!root) return {};
  root.hidden = false;
  root.classList.add('au2-root');
  renderSection(false);
  shop.onLang?.(() => { renderSection(true); if (openId && modal && !modal.hidden) renderDetail(false); });
  auctions.on('bid', onBid);
  auctions.on('closed', onClosed);
  auctions.on('created', () => renderSection(true));
  auctions.on('paid', ({ a }) => { renderSection(false); if (a && openId === a.id && modal && !modal.hidden) renderDetail(false); });
  auctions.on('change', ({ remote }) => { if (remote && !(modal && !modal.hidden)) renderSection(false); });
  auctions.on('tick', () => {
    const now = Date.now();
    updateTimers();
    // 狀態轉換（預告→進行中、進行中→結標中）時重繪
    if (now - lastTick > 1000) {
      lastTick = now;
      const sig = auctions.list().map(a => auctions.status(a, now)).join();
      if (sig !== root.dataset.sig) { const had = root.dataset.sig; root.dataset.sig = sig; if (had) { renderSection(false); if (openId && modal && !modal.hidden && !(verifyStep > 0)) renderDetail(false); } }
    }
  });
  // 從網址 #auction 進來時自動捲到競標區
  if (location.hash === '#auction') setTimeout(() => root.scrollIntoView({ behavior: 'smooth' }), 400);
  // 進場動畫（捲到時）
  try {
    const io = new IntersectionObserver((ents) => { if (ents.some(e => e.isIntersecting)) { io.disconnect(); gsap.fromTo($$('.au2-card', root), { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.5, stagger: 0.05, ease: 'power3.out' }); } }, { threshold: 0.1 });
    io.observe(root);
  } catch { /* ignore */ }
  return {
    open: openDetail, close: closeDetail, render: () => renderSection(false),
    share(id) { auctions.addShare(id); toast(tx('shared'), ''); },
  };
}
