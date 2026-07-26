/**
 * 決済状態の確認・確定処理
 *
 * 重要：PayPay Webhookが届いても、その中身（ステータスなど）は信用しません。
 * Apps ScriptのdoPostは受信ヘッダーを取得できず、PayPayが推奨する署名検証ができないためです。
 * Webhookは「支払いが動いたかもしれない」という合図としてのみ使い、
 * 必ずここで自分からPayPayのAPIに問い合わせて真の状態を確認してから確定します。
 * この関数はWebhook受信時とお客様のリダイレクト帰還時の両方から呼ばれる、唯一の確定経路です。
 */

function reconcilePayment_(bookingId) {
  return withBookingLock_(function () {
    const sheet = getSheet_();
    const row = findRowByBookingId_(sheet, bookingId);
    if (row === -1) {
      return { status: 'not_found' };
    }

    const currentStatus = sheet.getRange(row, COL.STATUS).getValue();
    if (currentStatus === 'paid') {
      return { status: 'paid' }; // 既に確定済み（冪等・二重メール防止）
    }
    if (currentStatus !== 'pending_payment') {
      return { status: currentStatus };
    }

    let paypayData;
    try {
      paypayData = getPayPayCodePaymentStatus_(bookingId);
    } catch (err) {
      return { status: 'pending_payment', error: String(err) };
    }

    if (!paypayData) {
      return { status: 'pending_payment' };
    }

    if (paypayData.status === 'COMPLETED') {
      sheet.getRange(row, COL.STATUS).setValue('paid');
      sheet.getRange(row, COL.PAID_AT).setValue(new Date());

      const name = sheet.getRange(row, COL.NAME).getValue();
      const email = sheet.getRange(row, COL.EMAIL).getValue();
      const courseName = sheet.getRange(row, COL.COURSE_NAME).getValue();
      const amount = sheet.getRange(row, COL.AMOUNT).getValue();
      const addVideo = sheet.getRange(row, COL.ADD_VIDEO).getValue() === 'yes';

      sendCustomerConfirmation_(email, name, courseName, addVideo);
      sendOwnerNotification_(name, courseName, amount, 'paypay', 'paid');
      return { status: 'paid' };
    }

    if (paypayData.status === 'FAILED') {
      sheet.getRange(row, COL.STATUS).setValue('failed');
      return { status: 'failed' };
    }

    return { status: 'pending_payment' };
  });
}

// 放置された保留中の決済を定期的に見直す（時限トリガーで実行。setupTriggersで設定）
// お客様が決済後にタブを閉じてしまいWebhookも届かなかった場合の取りこぼし対策。
function sweepPendingPayments() {
  const sheet = getSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  const data = sheet.getRange(2, 1, lastRow - 1, COL.LAST_ERROR).getValues();
  const now = new Date();
  const THRESHOLD_MS = 30 * 60 * 1000; // 30分以上pending_paymentのままなら確認しにいく

  data.forEach(function (row) {
    const bookingId = row[COL.BOOKING_ID - 1];
    const status = row[COL.STATUS - 1];
    const timestamp = row[COL.TIMESTAMP - 1];
    if (status !== 'pending_payment') return;
    if (!(timestamp instanceof Date)) return;
    if (now.getTime() - timestamp.getTime() < THRESHOLD_MS) return;
    try {
      reconcilePayment_(bookingId);
    } catch (err) {
      sendErrorAlert_('sweepPendingPayments (bookingId=' + bookingId + ')', err);
    }
  });
}
