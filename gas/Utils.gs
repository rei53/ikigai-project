/**
 * 共通ユーティリティ
 */

function jsonResponse_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// bookingId（= PayPayのmerchantPaymentId）で行を探す。見つからなければ -1
function findRowByBookingId_(sheet, bookingId) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return -1;
  const finder = sheet.getRange(2, COL.BOOKING_ID, lastRow - 1, 1)
    .createTextFinder(bookingId)
    .matchEntireCell(true);
  const cell = finder.findNext();
  return cell ? cell.getRow() : -1;
}

// 予約シートへの読み書きをロックで直列化する（Webhookと帰還確認の競合を防ぐ）
function withBookingLock_(fn) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    return fn();
  } finally {
    lock.releaseLock();
  }
}
