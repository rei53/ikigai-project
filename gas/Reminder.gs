/**
 * 開催前リマインダー
 *
 * 毎日1回（setupTriggersで設定）実行し、開催日が2日以内に迫っている予約へ
 * リマインドメールを送る。
 *
 * 「ちょうど2日後」ではなく「2日以内」を対象にしているのは、直前の申し込みを
 * 取りこぼさないため。2日前の実行時刻より後に申し込まれた方にも、翌日の実行で1通届く。
 * 二重送信は REMINDER_SENT 列の印で防ぐ。
 */

const REMINDER_DAYS_BEFORE = 2;

function sendTwoDaysBeforeReminders() {
  const sheet = getSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  const today = todayInTokyo_();
  const limit = new Date(today);
  limit.setDate(limit.getDate() + REMINDER_DAYS_BEFORE);

  const data = sheet.getRange(2, 1, lastRow - 1, COL.REMINDER_SENT).getValues();

  data.forEach(function (row, i) {
    const rowNum = i + 2;
    const status = row[COL.STATUS - 1];
    const courseId = row[COL.COURSE_ID - 1];
    const reminderSent = row[COL.REMINDER_SENT - 1];

    // 入金確認は手動でタイムラグがあるため、申し込み済みの方すべてに送る。
    // キャンセル（cancelled）など、それ以外のステータスは対象外。
    if (status !== 'paid' && status !== 'pending_payment' && status !== 'pending_bank_transfer') return;
    if (reminderSent === 'sent') return;

    const eventDate = parseCourseDate_(COURSE_DATES[courseId]);
    if (!eventDate) return;

    // 開催日を過ぎたものは送らない。まだ2日より先のものは、日が近づいてから送る。
    if (eventDate < today || eventDate > limit) return;

    const name = row[COL.NAME - 1];
    const email = row[COL.EMAIL - 1];
    const courseName = row[COL.COURSE_NAME - 1];

    try {
      sendReminderEmail_(email, name, courseName, formatEventDate_(eventDate));
      sheet.getRange(rowNum, COL.REMINDER_SENT).setValue('sent');
    } catch (err) {
      sendErrorAlert_('sendTwoDaysBeforeReminders (row=' + rowNum + ')', err);
    }
  });
}

// 日本時間の「今日」を、時刻を切り落とした形で返す
function todayInTokyo_() {
  return parseCourseDate_(Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy-MM-dd'));
}

// 'yyyy-MM-dd' を Date に変換する。形式が違えば null を返す。
function parseCourseDate_(text) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(text || '').trim());
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

// メール本文用に「9月5日（土）」の形へ整える
function formatEventDate_(date) {
  const week = ['日', '月', '火', '水', '木', '金', '土'];
  return (date.getMonth() + 1) + '月' + date.getDate() + '日（' + week[date.getDay()] + '）';
}
