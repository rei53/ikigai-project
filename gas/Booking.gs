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
  // 「セルフケア動画」を希望していても、対象外の講座からのリクエストなら無視する
  const addVideo = payload.addVideo === true && SELF_CARE_VIDEO_ELIGIBLE_COURSES.indexOf(courseId) !== -1;

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
  const baseAmount = COURSE_PRICES[courseId];
  let courseName = COURSE_NAMES[courseId];
  if (!baseAmount || !courseName) {
    return { ok: false, error: '講座が見つかりません。' };
  }
  const amount = addVideo ? baseAmount + SELF_CARE_VIDEO_PRICE : baseAmount;
  if (addVideo) {
    courseName += '＋' + SELF_CARE_VIDEO_NAME;
  }

  const bookingId = Utilities.getUuid();
  const sheet = getSheet_();

  return withBookingLock_(function () {
    const status = paymentMethod === 'paypay' ? 'pending_payment' : 'pending_bank_transfer';

    sheet.appendRow([
      bookingId,
      new Date(),
      name, kana, email, phone,
      courseId, courseName, people, message,
      paymentMethod, amount, status,
      '', '',
      addVideo ? 'yes' : '',
      ''
    ]);

    if (paymentMethod === 'bank_transfer') {
      sendBankTransferInstructions_(email, name, courseName, amount, addVideo);
      sendOwnerNotification_(name, courseName, amount, 'bank_transfer', 'pending_bank_transfer');
      return { ok: true, method: 'bank_transfer', amount: amount, bankInfo: BANK_TRANSFER_INFO };
    }

    try {
      const code = createPayPayCode_(bookingId, amount, courseName);
      return { ok: true, method: 'paypay', checkoutUrl: code.url, bookingId: bookingId };
    } catch (err) {
      updateRowStatus_(sheet, bookingId, 'failed', String(err));
      sendErrorAlert_('PayPay決済コード作成 (bookingId=' + bookingId + ')', err);
      return { ok: false, error: '決済の準備に失敗しました。時間をおいて再度お試しください。' };
    }
  });
}

function updateRowStatus_(sheet, bookingId, status, lastError) {
  const row = findRowByBookingId_(sheet, bookingId);
  if (row === -1) return;
  sheet.getRange(row, COL.STATUS).setValue(status);
  if (lastError !== undefined) {
    sheet.getRange(row, COL.LAST_ERROR).setValue(lastError);
  }
}
