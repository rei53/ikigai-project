/**
 * エントリーポイント（doPost / doGet のルーティング）
 */

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);

    // PayPay Webhookとフォーム送信を、届いたデータの形で振り分ける。
    // Webhookはmerchantpaymentid（bookingId）だけを合図として使い、
    // 中身は信用せず必ずreconcilePayment_でPayPayに確認しにいく。
    const webhookBookingId = payload.merchantPaymentId || (payload.data && payload.data.merchant_payment_id);
    if (webhookBookingId && !payload.name) {
      const result = reconcilePayment_(webhookBookingId);
      return jsonResponse_({ ok: true, result: result });
    }

    const result = handleBookingSubmission_(payload);
    return jsonResponse_(result);
  } catch (err) {
    sendErrorAlert_('doPost', err);
    return jsonResponse_({ ok: false, error: 'サーバーエラーが発生しました。' });
  }
}

function doGet(e) {
  try {
    const action = e.parameter.action;
    if (action === 'status') {
      const bookingId = e.parameter.bookingId;
      if (!bookingId) return jsonResponse_({ ok: false, error: 'bookingIdが必要です。' });
      const result = reconcilePayment_(bookingId);
      return jsonResponse_({ ok: true, result: result });
    }
    if (action === 'instagram') {
      return jsonResponse_({ ok: true, result: getInstagramFeed_() });
    }
    if (action === 'admin') {
      const key = e.parameter.key || '';
      return jsonResponse_(getAllBookingsForAdmin_(key));
    }
    return jsonResponse_({ ok: false, error: '不明なリクエストです。' });
  } catch (err) {
    sendErrorAlert_('doGet', err);
    return jsonResponse_({ ok: false, error: 'サーバーエラーが発生しました。' });
  }
}

// 初回に一度だけ実行する設定用関数：時限トリガー（放置決済の掃除・2日前リマインダー）を設定する
function setupTriggers() {
  ScriptApp.getProjectTriggers().forEach(function (t) { ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('sweepPendingPayments')
    .timeBased()
    .everyMinutes(30)
    .create();
  ScriptApp.newTrigger('sendTwoDaysBeforeReminders')
    .timeBased()
    .everyDays(1)
    .atHour(9)
    .create();
  ScriptApp.newTrigger('refreshInstagramCache')
    .timeBased()
    .everyHours(6)
    .create();
  ScriptApp.newTrigger('refreshInstagramToken')
    .timeBased()
    .everyDays(1)
    .atHour(4)
    .create();
  Logger.log('トリガーの設定が完了しました。');
}
