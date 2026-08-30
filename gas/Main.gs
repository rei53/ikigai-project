/**
 * エントリーポイント（doPost / doGet のルーティング）
 */

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
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

// 初回に一度だけ実行する設定用関数：時限トリガー（入金確定メール・2日前リマインダー・Instagram更新）を設定する
function setupTriggers() {
  ScriptApp.getProjectTriggers().forEach(function (t) { ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('sendConfirmationsForNewlyPaid')
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
