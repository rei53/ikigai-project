/**
 * 前日リマインダー
 *
 * 毎日1回（setupTriggersで設定）実行し、開催日が「明日」の予約に対して
 * リマインドメールを送る。二重送信を防ぐため、送信済みの行には
 * REMINDER_SENT列に印をつけ、以後スキップする。
 */

function sendDayBeforeReminders() {
  const sheet = getSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = Utilities.formatDate(tomorrow, 'Asia/Tokyo', 'yyyy-MM-dd');

  const data = sheet.getRange(2, 1, lastRow - 1, COL.REMINDER_SENT).getValues();

  data.forEach(function (row, i) {
    const rowNum = i + 2;
    const status = row[COL.STATUS - 1];
    const courseId = row[COL.COURSE_ID - 1];
    const reminderSent = row[COL.REMINDER_SENT - 1];

    // 確定済み（PayPay決済完了）または振込案内済みの予約のみ対象。キャンセル・失敗は対象外。
    if (status !== 'paid' && status !== 'pending_bank_transfer') return;
    if (reminderSent === 'sent') return;

    const eventDate = COURSE_DATES[courseId];
    if (!eventDate || eventDate !== tomorrowStr) return;

    const name = row[COL.NAME - 1];
    const email = row[COL.EMAIL - 1];
    const courseName = row[COL.COURSE_NAME - 1];

    try {
      sendReminderEmail_(email, name, courseName, tomorrowStr);
      sheet.getRange(rowNum, COL.REMINDER_SENT).setValue('sent');
    } catch (err) {
      sendErrorAlert_('sendDayBeforeReminders (row=' + rowNum + ')', err);
    }
  });
}
