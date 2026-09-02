/**
 * 申し込み受付処理
 */

function handleBookingSubmission_(payload) {
  const name = String(payload.name || '').trim();
  const kana = String(payload.kana || '').trim();
  const email = String(payload.email || '').trim();
  const phone = String(payload.phone || '').trim();
  const courseId = String(payload.courseId || '').trim();
  const people = String(payload.people || '').trim();
  const message = String(payload.message || '').trim();
  const paymentMethod = String(payload.paymentMethod || '').trim();
  const priceTier = String(payload.priceTier || '').trim();
  // 「セルフケア動画」を希望していても、対象外の講座からのリクエストなら無視する
  const addVideo = payload.addVideo === true && SELF_CARE_VIDEO_ELIGIBLE_COURSES.indexOf(courseId) !== -1;
  const isVideoCourse = courseId === SELF_CARE_VIDEO_COURSE_ID;

  if (!name || !email || !courseId) {
    return { ok: false, error: 'お名前・メールアドレス・講座は必須です。' };
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { ok: false, error: 'メールアドレスの形式が正しくありません。' };
  }
  if (paymentMethod !== 'paypay' && paymentMethod !== 'bank_transfer') {
    return { ok: false, error: '支払い方法を選択してください。' };
  }

  // 金額と講座名はクライアントから送られた値を信用せず、サーバー側のマップから取得する
  let baseAmount;
  let courseName;

  if (isVideoCourse) {
    // セルフケア動画の単独申し込みは、選ばれた受講状況で金額が決まる
    const tier = SELF_CARE_VIDEO_TIERS[priceTier];
    if (!tier) {
      return { ok: false, error: 'ご受講状況を選択してください。' };
    }
    baseAmount = tier.amount;
    courseName = SELF_CARE_VIDEO_NAME + '（' + tier.label + '）';
  } else {
    baseAmount = COURSE_PRICES[courseId];
    courseName = COURSE_NAMES[courseId];
  }

  if (!baseAmount || !courseName) {
    return { ok: false, error: '講座が見つかりません。' };
  }

  const amount = addVideo ? baseAmount + SELF_CARE_VIDEO_PRICE : baseAmount;
  if (addVideo) {
    courseName += '＋' + SELF_CARE_VIDEO_NAME;
  }

  // 動画の視聴案内は、特典として追加した場合と単独で申し込んだ場合の両方で必要
  const showVideoGuidance = addVideo || isVideoCourse;

  const bookingId = Utilities.getUuid();
  const sheet = getSheet_();

  return withBookingLock_(function () {
    // PayPay（QRコード）・ゆうちょ振込のどちらも、入金確認は主催者が手作業で行う。
    // ここでは申し込みを受け付けて、お支払い方法の案内メールを送るところまで。
    const status = paymentMethod === 'paypay' ? 'pending_payment' : 'pending_bank_transfer';

    sheet.appendRow([
      bookingId,
      new Date(),
      name, kana, email, phone,
      courseId, courseName, people, message,
      paymentMethod, amount, status,
      '', '',
      showVideoGuidance ? 'yes' : '',
      ''
    ]);

    sendPaymentInstructions_(email, name, courseName, amount, paymentMethod, showVideoGuidance);
    sendOwnerNotification_(name, courseName, amount, paymentMethod, status);

    return { ok: true, method: paymentMethod, amount: amount, bookingId: bookingId };
  });
}

/**
 * 入金確認後の「予約確定メール」を自動送信する（時限トリガーで定期実行）
 *
 * 運用：LINEに届いたスクリーンショットで入金を確認したら、
 * スプレッドシートのstatus列を手作業で「paid」に変更するだけ。
 * あとはこの関数が確定メールを送り、paidAt列に日時を記録します。
 * paidAtが空の行だけを対象にするので、二重送信は起きません。
 */
function sendConfirmationsForNewlyPaid() {
  const sheet = getSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  const data = sheet.getRange(2, 1, lastRow - 1, COL.REMINDER_SENT).getValues();

  data.forEach(function (row, i) {
    const rowNum = i + 2;
    if (row[COL.STATUS - 1] !== 'paid') return;
    if (row[COL.PAID_AT - 1]) return; // 送信済み

    const email = row[COL.EMAIL - 1];
    const name = row[COL.NAME - 1];
    const courseName = row[COL.COURSE_NAME - 1];
    const addVideo = row[COL.ADD_VIDEO - 1] === 'yes';

    try {
      sendCustomerConfirmation_(email, name, courseName, addVideo);
      sheet.getRange(rowNum, COL.PAID_AT).setValue(new Date());
    } catch (err) {
      sendErrorAlert_('sendConfirmationsForNewlyPaid (row=' + rowNum + ')', err);
    }
  });
}
