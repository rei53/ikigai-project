/**
 * 参加者リスト（「日程」タブの右側に書き出す）
 *
 * 「日程」タブの各行（＝1回の開催）の右に、申し込みの人数・参加者のお名前・
 * セルフケア動画のお申し込み・視聴URLを送ったかどうかを自動で書き込む。
 *
 * 使い方：スプレッドシートを開くと上に「IKIGAI」メニューが出るので、
 * 「参加者リストを更新」を選ぶ（毎朝6時にも自動で作り直される）。
 *
 * 7列目から右は自動で上書きされるので、手では書かないこと。
 * 「動画」の送付状況は Bookings シートの「動画送付」列に「済」と入れると反映される。
 */

function updateRosterSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SCHEDULE_SHEET_NAME);
  if (!sheet) return 0;

  const courses = readScheduleRows_();
  if (!courses.length) return 0;

  const bookingSheet = getSheet_();
  const lastRow = bookingSheet.getLastRow();
  const data = lastRow < 2 ? [] : bookingSheet.getRange(2, 1, lastRow - 1, COL.VIDEO_SENT).getValues();

  // 見出し（7列目から右）を整える
  const outFrom = SCHEDULE_INPUT_COLUMNS + 1;
  const outCount = SCHEDULE_HEADERS.length - SCHEDULE_INPUT_COLUMNS;
  sheet.getRange(1, outFrom, 1, outCount)
    .setValues([SCHEDULE_HEADERS.slice(SCHEDULE_INPUT_COLUMNS)])
    .setFontWeight('bold');

  courses.forEach(function (course) {
    const entries = data
      .filter(function (r) {
        return r[COL.COURSE_ID - 1] === course.id
          && r[COL.STATUS - 1] !== 'cancelled'
          && r[COL.STATUS - 1] !== 'failed';
      })
      .sort(function (a, b) {
        return String(a[COL.KANA - 1] || a[COL.NAME - 1]).localeCompare(String(b[COL.KANA - 1] || b[COL.NAME - 1]), 'ja');
      });

    const adults = entries.reduce(function (sum, r) { return sum + (Number(r[COL.PEOPLE - 1]) || 1); }, 0);
    const kids = entries.reduce(function (sum, r) { return sum + (parseInt(r[COL.KIDS - 1], 10) || 0); }, 0);
    const videoEntries = entries.filter(function (r) { return r[COL.ADD_VIDEO - 1] === 'yes'; });
    const sentCount = videoEntries.filter(function (r) {
      return /済|送った|OK/.test(String(r[COL.VIDEO_SENT - 1] || ''));
    }).length;

    const names = entries.map(function (r) {
      const kidsText = r[COL.KIDS - 1] ? '＋子ども' + r[COL.KIDS - 1] : '';
      const unpaid = r[COL.STATUS - 1] === 'paid' ? '' : '（未入金）';
      return String(r[COL.NAME - 1]) + kidsText + unpaid;
    }).join('、');

    sheet.getRange(course.rowNum, outFrom, 1, outCount).setValues([[
      entries.length ? ('大人' + adults + '名' + (kids ? '・子ども' + kids + '名' : '')) : '0名',
      names,
      videoEntries.length ? videoEntries.length + '名' : '',
      videoEntries.length ? (sentCount === videoEntries.length ? '送付済み' : sentCount + '/' + videoEntries.length + '送付') : ''
    ]]);
  });

  sheet.getRange(2, outFrom + 1, Math.max(courses.length, 1), 1).setWrap(true);
  sheet.setColumnWidth(outFrom + 1, 320);

  const updatedAt = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'M月d日 HH:mm');
  sheet.getRange(1, SCHEDULE_HEADERS.length + 2).setValue('参加者リスト 最終更新：' + updatedAt);

  // 以前の「参加者リスト」タブを使っていた場合は、重複するので片付ける
  const oldSheet = ss.getSheetByName('参加者リスト');
  if (oldSheet) ss.deleteSheet(oldSheet);

  return courses.length;
}

// スプレッドシートを開いたときにメニューを出す（シンプルトリガー）
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('IKIGAI')
    .addItem('参加者リストを更新', 'updateRosterSheet')
    .addToUi();
}
