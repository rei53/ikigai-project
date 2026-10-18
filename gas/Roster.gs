/**
 * 参加者リスト（スプレッドシートの「参加者リスト」タブ）
 *
 * 当日の受付用に、開催日ごとの参加者のお名前と、セルフケア動画のお申し込み・
 * 視聴URLを送ったかどうかを、シート上で一覧にする。
 *
 * 使い方：スプレッドシートを開くと上に「IKIGAI」メニューが出るので、
 * 「参加者リストを更新」を選ぶ（毎朝6時にも自動で作り直される）。
 *
 * 動画の「URL送付」は Bookings シートの「動画送付」列に「済」と入れると反映される。
 */

const ROSTER_SHEET_NAME = '参加者リスト';
const ROSTER_HEADERS = ['開催日', '時間', '講座', 'お名前', 'フリガナ', '人数', 'お子さま', '入金', '動画', 'URL送付'];

function updateRosterSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(ROSTER_SHEET_NAME) || ss.insertSheet(ROSTER_SHEET_NAME);
  const bookings = getSheet_();
  const today = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy-MM-dd');

  // これからの開催（今日を含む）だけを、日付の近い順に並べる
  const courses = readScheduleRows_()
    .filter(function (c) { return c.date >= today; })
    .sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });

  const lastRow = bookings.getLastRow();
  const data = lastRow < 2 ? [] : bookings.getRange(2, 1, lastRow - 1, COL.VIDEO_SENT).getValues();

  const rows = [];
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

    if (!entries.length) {
      rows.push([course.date, course.time, course.name, '（お申し込みなし）', '', '', '', '', '', '']);
      return;
    }

    entries.forEach(function (r) {
      rows.push([
        course.date,
        course.time,
        course.name,
        r[COL.NAME - 1],
        r[COL.KANA - 1],
        r[COL.PEOPLE - 1],
        r[COL.KIDS - 1] || '',
        r[COL.STATUS - 1] === 'paid' ? '入金済み' : '未確認',
        r[COL.ADD_VIDEO - 1] === 'yes' ? 'あり' : '',
        r[COL.ADD_VIDEO - 1] === 'yes' ? (/済|送った|OK/.test(String(r[COL.VIDEO_SENT - 1] || '')) ? '送付済み' : '未送付') : ''
      ]);
    });
  });

  sheet.clear();
  sheet.getRange(1, 1, 1, ROSTER_HEADERS.length).setValues([ROSTER_HEADERS]).setFontWeight('bold');
  sheet.setFrozenRows(1);
  if (rows.length) {
    sheet.getRange(2, 1, rows.length, ROSTER_HEADERS.length).setValues(rows);
  }
  sheet.getRange(1, 1, 1, ROSTER_HEADERS.length)
    .offset(1, 0, Math.max(rows.length, 1), ROSTER_HEADERS.length)
    .setVerticalAlignment('top');
  sheet.autoResizeColumns(1, ROSTER_HEADERS.length);

  const updatedAt = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'M月d日 HH:mm');
  sheet.getRange(1, ROSTER_HEADERS.length + 2).setValue('最終更新：' + updatedAt);
  return rows.length;
}

// スプレッドシートを開いたときにメニューを出す（シンプルトリガー）
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('IKIGAI')
    .addItem('参加者リストを更新', 'updateRosterSheet')
    .addToUi();
}
