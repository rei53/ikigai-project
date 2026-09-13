/**
 * 寺ヨガの日程（スプレッドシートの「日程」タブ）
 *
 * 日程はスプレッドシートの「日程」タブに1行ずつ書きます。スマホのGoogleスプレッドシート
 * アプリから行を足すだけで、サイトの表示・予約受付・2日前リマインダーに反映されます。
 * コードの貼り替えや再デプロイは不要です。
 *
 * 列：会場（法泉寺／西方寺）｜日付｜時間（空欄なら会場の標準時間）｜状態（空欄＝募集中／残りわずか／締切）
 *
 * 料金や講座名は会場ごとに Config.gs の VENUES で決まります。
 * サイトへは doGet(action=schedule) で、今日以降の日程だけを返します。
 */

const SCHEDULE_SHEET_NAME = '日程';
const SCHEDULE_HEADERS = ['会場', '日付', '時間', '状態'];
const SCHEDULE_CACHE_KEY = 'SCHEDULE_JSON';
// サイトへ返す日程のキャッシュ時間（秒）。シートを直してから最大この時間で反映される。
const SCHEDULE_CACHE_SECONDS = 300;

// シートの全行（過去の日程も含む）を読み取って整えた一覧を返す
function readScheduleRows_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SCHEDULE_SHEET_NAME);
  if (!sheet || sheet.getLastRow() < 2) return [];

  const range = sheet.getRange(2, 1, sheet.getLastRow() - 1, SCHEDULE_HEADERS.length);
  const values = range.getValues();
  const displays = range.getDisplayValues();
  const tz = ss.getSpreadsheetTimeZone();
  const seen = {};
  const rows = [];

  values.forEach(function (row, i) {
    const venueText = String(row[0] || '').trim();
    const venueKey = Object.keys(VENUES).filter(function (k) { return venueText.indexOf(k) !== -1; })[0];
    const date = normalizeScheduleDate_(row[1], tz);
    if (!venueKey || !date) return; // 空行や書きかけの行は無視する

    const venue = VENUES[venueKey];
    const id = 'tera-yoga-' + venue.slug + '-' + date.replace(/-/g, '');
    if (seen[id]) return; // 同じ会場・同じ日付の重複行は最初の1行だけ使う
    seen[id] = true;

    rows.push({
      id: id,
      venue: venue.slug,
      date: date,
      time: normalizeScheduleTime_(displays[i][2]),
      status: normalizeScheduleStatus_(displays[i][3]),
      amount: venue.price,
      name: venue.name + formatScheduleDateForName_(date),
      videoEligible: venue.videoEligible
    });
  });

  return rows;
}

// サイト表示用：今日以降の日程だけ（金額・メール用の名前は含めない）
function getPublicSchedule_() {
  const cache = CacheService.getScriptCache();
  const cached = cache.get(SCHEDULE_CACHE_KEY);
  if (cached) return JSON.parse(cached);

  const today = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy-MM-dd');
  const items = readScheduleRows_()
    .filter(function (r) { return r.date >= today; })
    .map(function (r) {
      return { id: r.id, venue: r.venue, date: r.date, time: r.time, status: r.status };
    });

  cache.put(SCHEDULE_CACHE_KEY, JSON.stringify(items), SCHEDULE_CACHE_SECONDS);
  return items;
}

/**
 * 講座IDから金額・名前・開催日を引く。
 * まず「日程」タブを見て、なければ Config.gs の旧来のマップ（シート移行前に受け付けた予約用）を見る。
 * 見つからなければ null。
 */
function findCourse_(courseId) {
  const row = readScheduleRows_().filter(function (r) { return r.id === courseId; })[0];
  if (row) {
    return { amount: row.amount, name: row.name, date: row.date, status: row.status, videoEligible: row.videoEligible };
  }
  if (COURSE_PRICES[courseId] && COURSE_NAMES[courseId]) {
    return {
      amount: COURSE_PRICES[courseId],
      name: COURSE_NAMES[courseId],
      date: COURSE_DATES[courseId] || null,
      status: 'open',
      videoEligible: SELF_CARE_VIDEO_ELIGIBLE_COURSES.indexOf(courseId) !== -1
    };
  }
  return null;
}

// 日付セルを 'yyyy-MM-dd' にそろえる。日付として読めなければ null。
function normalizeScheduleDate_(value, tz) {
  if (value instanceof Date && !isNaN(value)) {
    return Utilities.formatDate(value, tz, 'yyyy-MM-dd');
  }
  const m = /(\d{4})\s*[-\/年.]\s*(\d{1,2})\s*[-\/月.]\s*(\d{1,2})/.exec(String(value || ''));
  if (!m) return null;
  return m[1] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[3]).slice(-2);
}

// 「9:30-10:30」「9:30~10:30」なども「9:30〜10:30」にそろえる。空欄は '' のまま（サイト側で標準時間を使う）
function normalizeScheduleTime_(text) {
  return String(text || '').trim().replace(/\s*[-~～ー−]\s*/g, '〜');
}

function normalizeScheduleStatus_(text) {
  const t = String(text || '').trim();
  if (/締|満|終了|中止/.test(t)) return 'closed';
  if (/わずか|残り|少/.test(t)) return 'few';
  return 'open';
}

// メール用の名前に付ける「2026年10月18日」
function formatScheduleDateForName_(date) {
  const p = date.split('-');
  return Number(p[0]) + '年' + Number(p[1]) + '月' + Number(p[2]) + '日';
}

// シートを直したとき、キャッシュを待たずにすぐサイトへ反映させる（シンプルトリガー）
function onEdit(e) {
  if (e && e.range && e.range.getSheet().getName() === SCHEDULE_SHEET_NAME) {
    CacheService.getScriptCache().remove(SCHEDULE_CACHE_KEY);
  }
}

/**
 * 初回に一度だけ実行する設定用関数：「日程」タブを作り、入力しやすいように整える。
 * すでにタブがある場合は、見出しと入力ルールだけを整え直す（書いた日程は消さない）。
 * タブが新しく作られたときは、現在受付中の日程を最初の行として入れておく。
 */
function setupScheduleSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SCHEDULE_SHEET_NAME);
  const isNew = !sheet;
  if (isNew) sheet = ss.insertSheet(SCHEDULE_SHEET_NAME, 0);

  sheet.getRange(1, 1, 1, SCHEDULE_HEADERS.length).setValues([SCHEDULE_HEADERS]).setFontWeight('bold');
  sheet.setFrozenRows(1);

  const maxRows = sheet.getMaxRows() - 1;
  sheet.getRange(2, 1, maxRows, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(Object.keys(VENUES), true).build());
  sheet.getRange(2, 2, maxRows, 1).setNumberFormat('yyyy-mm-dd').setDataValidation(
    SpreadsheetApp.newDataValidation().requireDate().setAllowInvalid(false).build());
  // 時間は「9:30〜10:30」を文字のまま残したいので、書式を書式なしテキストにする
  sheet.getRange(2, 3, maxRows, 1).setNumberFormat('@');
  sheet.getRange(2, 4, maxRows, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(['募集中', '残りわずか', '締切'], true).build());

  if (isNew) {
    const initial = [
      ['法泉寺', new Date(2026, 9, 18), '9:30〜10:30', '募集中'],
      ['法泉寺', new Date(2026, 10, 15), '9:30〜10:30', '募集中'],
      ['法泉寺', new Date(2026, 11, 20), '9:30〜10:30', '募集中'],
      ['西方寺', new Date(2026, 10, 7), '9:30〜11:00', '募集中']
    ];
    sheet.getRange(2, 1, initial.length, SCHEDULE_HEADERS.length).setValues(initial);
  }

  sheet.autoResizeColumns(1, SCHEDULE_HEADERS.length);
  CacheService.getScriptCache().remove(SCHEDULE_CACHE_KEY);
  Logger.log('「日程」タブの準備が完了しました。');
}
