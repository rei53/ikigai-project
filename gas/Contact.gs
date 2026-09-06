/**
 * お問い合わせフォームの受付処理
 *
 * メールソフトが開かない環境（パソコンでWebメールを使う方など）でも
 * 連絡できるよう、サイト上のフォームから直接受け取る。
 * 受け付けた内容は Contacts シートに記録し、主催者へ通知メールを送る。
 */

const CONTACT_SHEET_NAME = 'Contacts';

const CONTACT_COL = {
  TIMESTAMP: 1,
  NAME: 2,
  EMAIL: 3,
  PHONE: 4,
  CATEGORY: 5,
  MESSAGE: 6,
  STATUS: 7
};

// お問い合わせ種別。サイト側の選択肢と合わせること。
const CONTACT_CATEGORIES = {
  'lesson': 'レッスン・体験について',
  'workshop': '研修・ワークショップのご依頼',
  'video': 'セルフケア動画について',
  'other': 'その他'
};

function getContactSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(CONTACT_SHEET_NAME);
  // シートが無ければ見出し付きで作る。手作業での準備を不要にするため。
  if (!sheet) {
    sheet = ss.insertSheet(CONTACT_SHEET_NAME);
    sheet.appendRow(['timestamp', 'name', 'email', 'phone', 'category', 'message', 'status']);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function handleContactSubmission_(payload) {
  const name = String(payload.name || '').trim();
  const email = String(payload.email || '').trim();
  const phone = String(payload.phone || '').trim();
  const category = String(payload.category || '').trim();
  const message = String(payload.message || '').trim();

  if (!name || !email || !message) {
    return { ok: false, error: 'お名前・メールアドレス・お問い合わせ内容は必須です。' };
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { ok: false, error: 'メールアドレスの形式が正しくありません。' };
  }
  // 種別はサーバー側の一覧から引く。想定外の値が入っていても「その他」として受け付ける。
  const categoryLabel = CONTACT_CATEGORIES[category] || CONTACT_CATEGORIES['other'];

  const sheet = getContactSheet_();
  sheet.appendRow([new Date(), name, email, phone, categoryLabel, message, 'new']);

  // 通知が送れなくても、お問い合わせ自体は受け付けたものとして扱う。
  // ここで失敗を返すと、記録済みなのにお客様が再送信してしまうため。
  try {
    sendContactNotification_(name, email, phone, categoryLabel, message);
    sendContactAutoReply_(email, name);
  } catch (err) {
    sendErrorAlert_('お問い合わせ通知メール', err);
  }

  return { ok: true };
}
