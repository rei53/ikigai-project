/**
 * 管理者向け：申し込み一覧の取得
 *
 * admin.html からは「管理者キー」を毎回パラメータとして送ってもらい、
 * ここでスクリプトプロパティの ADMIN_KEY と一致するかだけをサーバー側で確認する。
 * キーはコードに書かず、Apps Scriptの「スクリプト プロパティ」に登録すること
 * （手順は SETUP-BOOKING-SYSTEM.md 参照）。一致しなければ予約データは一切返さない。
 *
 * 短い・単純なキーでも総当たりされにくいよう、失敗回数が一定を超えると
 * 一時的にロックする（CacheServiceで管理。最大6時間で自動的に保存期限切れになる）。
 */

const ADMIN_LOGIN_CACHE_KEY = 'admin_login_fail_count';
const ADMIN_LOGIN_MAX_ATTEMPTS = 5;
const ADMIN_LOGIN_LOCKOUT_SECONDS = 15 * 60; // 15分ロック

function getAllBookingsForAdmin_(key) {
  const cache = CacheService.getScriptCache();
  const failCount = Number(cache.get(ADMIN_LOGIN_CACHE_KEY) || 0);

  if (failCount >= ADMIN_LOGIN_MAX_ATTEMPTS) {
    return { ok: false, error: '試行回数が上限に達しました。15分ほど時間をおいて再度お試しください。' };
  }

  const expectedKey = PropertiesService.getScriptProperties().getProperty('ADMIN_KEY');
  if (!expectedKey || key !== expectedKey) {
    cache.put(ADMIN_LOGIN_CACHE_KEY, String(failCount + 1), ADMIN_LOGIN_LOCKOUT_SECONDS);
    if (failCount + 1 === ADMIN_LOGIN_MAX_ATTEMPTS) {
      sendErrorAlert_('管理者ページへのログイン試行が' + ADMIN_LOGIN_MAX_ATTEMPTS + '回失敗したため、15分間ロックしました。', '不正アクセスの可能性があります。');
    }
    return { ok: false, error: '管理者キーが正しくありません。' };
  }

  // ログイン成功時は失敗カウントをリセットする
  cache.remove(ADMIN_LOGIN_CACHE_KEY);

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
