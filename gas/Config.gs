/**
 * 設定ファイル
 *
 * PayPayのAPI Key / Secret / Merchant IDはこのファイルに直接書かず、
 * Apps Scriptエディタの「プロジェクトの設定」→「スクリプト プロパティ」に登録してください。
 * プロパティ名: PAYPAY_API_KEY / PAYPAY_API_SECRET / PAYPAY_MERCHANT_ID
 * 手順は SETUP-BOOKING-SYSTEM.md を参照。
 */

// 本番のPayPayに切り替えるときだけ true にする（最初はfalseのままSandboxでテストする）
const PAYPAY_PRODUCTION = false;

const PAYPAY_HOST = PAYPAY_PRODUCTION ? 'apigw.paypay.ne.jp' : 'apigw.sandbox.paypay.ne.jp';

// お客様への確認メール・主催者への通知メールの送信元表示名／返信先
const SENDER_NAME = 'IKIGAIプロジェクト®';
const REPLY_TO = 'yodayoga2525@gmail.com';
const OWNER_EMAIL = 'yodayoga2525@gmail.com';

// このサイトの予約ページURL（PayPay決済完了後にお客様を戻す先）
const SITE_BOOKING_URL = 'https://ikigai-prj.com/booking.html';

// 銀行振込の案内文
const BANK_TRANSFER_INFO = `
ゆうちょ銀行
記号：16130　番号：19673021
（普通：六一八店 1967302）
口座名義：ヨダ レイコ
※恐れ入りますが振込手数料はご負担ください
`.trim();

// 講座ID → 金額（円）。
// 重要：ここが決済に使う「本当の金額」です。data/courses.js のamountは表示用にすぎません。
// 料金を変更したときは、このマップと data/courses.js の両方を書き換えてください。
const COURSE_PRICES = {
  'tera-yoga-hosenji-0719': 1500,
  'tera-yoga-hosenji-0823': 1500,
  'tera-yoga-hosenji-0913': 1500,
  'tera-yoga-saihoji-0905': 2000
};

// 講座ID → メール文面用の表示名（data/courses.jsのnameと合わせてください）
const COURSE_NAMES = {
  'tera-yoga-hosenji-0719': '寺ヨガ（法泉寺・大人の隠れ家）2026年7月19日',
  'tera-yoga-hosenji-0823': '寺ヨガ（法泉寺・大人の隠れ家）2026年8月23日',
  'tera-yoga-hosenji-0913': '寺ヨガ（法泉寺・大人の隠れ家）2026年9月13日',
  'tera-yoga-saihoji-0905': '寺ヨガ（西方寺・大人の寺子屋）2026年9月5日'
};

// 講座ID → 開催日（YYYY-MM-DD）。2日前リマインダーの日付照合に使う。
// data/courses.js の nextDate と合わせてください。
const COURSE_DATES = {
  'tera-yoga-hosenji-0719': '2026-07-19',
  'tera-yoga-hosenji-0823': '2026-08-23',
  'tera-yoga-hosenji-0913': '2026-09-13',
  'tera-yoga-saihoji-0905': '2026-09-05'
};

// 参加者特典：セルフケア動画（次回申し込みと同時に追加できるオプション）
// 対象講座IDのみ SELF_CARE_VIDEO_PRICE が加算される。data/courses.js の videoAddonPrice と合わせてください。
const SELF_CARE_VIDEO_ELIGIBLE_COURSES = ['tera-yoga-hosenji-0719', 'tera-yoga-hosenji-0823', 'tera-yoga-hosenji-0913'];
const SELF_CARE_VIDEO_PRICE = 1000;
const SELF_CARE_VIDEO_NAME = 'セルフケア動画';
// 動画の視聴案内（URLが決まったら書き換えてください）
const SELF_CARE_VIDEO_URL = 'YOUR_SELF_CARE_VIDEO_URL';

const SHEET_NAME = 'Bookings';

const COL = {
  BOOKING_ID: 1,
  TIMESTAMP: 2,
  NAME: 3,
  KANA: 4,
  EMAIL: 5,
  PHONE: 6,
  COURSE_ID: 7,
  COURSE_NAME: 8,
  PEOPLE: 9,
  MESSAGE: 10,
  PAYMENT_METHOD: 11,
  AMOUNT: 12,
  STATUS: 13,
  PAID_AT: 14,
  LAST_ERROR: 15,
  ADD_VIDEO: 16,
  REMINDER_SENT: 17
};

function getSheet_() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sheet) {
    throw new Error('シート "' + SHEET_NAME + '" が見つかりません。SETUP-BOOKING-SYSTEM.md の手順を確認してください。');
  }
  return sheet;
}

function getPayPayCredentials_() {
  const props = PropertiesService.getScriptProperties();
  const apiKey = props.getProperty('PAYPAY_API_KEY');
  const apiSecret = props.getProperty('PAYPAY_API_SECRET');
  const merchantId = props.getProperty('PAYPAY_MERCHANT_ID');
  if (!apiKey || !apiSecret || !merchantId) {
    throw new Error('PayPayのAPI Key/Secret/Merchant Idがスクリプトプロパティに設定されていません。');
  }
  return { apiKey: apiKey, apiSecret: apiSecret, merchantId: merchantId };
}
