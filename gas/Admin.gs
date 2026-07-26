/**
 * 管理者向け：申し込み一覧の取得
 *
 * admin.html からは「管理者キー」を毎回パラメータとして送ってもらい、
 * ここでスクリプトプロパティの ADMIN_KEY と一致するかだけをサーバー側で確認する。
 * キーはコードに書かず、Apps Scriptの「スクリプト プロパティ」に登録すること
 * （手順は SETUP-BOOKING-SYSTEM.md 参照）。一致しなければ予約データは一切返さない。
 */

function getAllBookingsForAdmin_(key) {
  const expectedKey = PropertiesService.getScriptProperties().getProperty('ADMIN_KEY');
  if (!expectedKey || key !== expectedKey) {
    return { ok: false, error: '管理者キーが正しくありません。' };
  }

  const sheet = getSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return { ok: true, bookings: [] };
  }

  const data = sheet.getRange(2, 1, lastRow - 1, COL.REMINDER_SENT).getValues();

  const bookings = data.map(function (row) {
    return {
      bookingId: row[COL.BOOKING_ID - 1],
      timestamp: row[COL.TIMESTAMP - 1] instanceof Date ? row[COL.TIMESTAMP - 1].toISOString() : String(row[COL.TIMESTAMP - 1]),
      name: row[COL.NAME - 1],
      kana: row[COL.KANA - 1],
      email: row[COL.EMAIL - 1],
      phone: row[COL.PHONE - 1],
      courseId: row[COL.COURSE_ID - 1],
      courseName: row[COL.COURSE_NAME - 1],
      people: row[COL.PEOPLE - 1],
      message: row[COL.MESSAGE - 1],
      paymentMethod: row[COL.PAYMENT_METHOD - 1],
      amount: row[COL.AMOUNT - 1],
      status: row[COL.STATUS - 1],
      paidAt: row[COL.PAID_AT - 1] instanceof Date ? row[COL.PAID_AT - 1].toISOString() : (row[COL.PAID_AT - 1] || null),
      addVideo: row[COL.ADD_VIDEO - 1] === 'yes'
    };
  });

  // 新しい申し込みが上に来るように
  bookings.reverse();

  return { ok: true, bookings: bookings };
}
