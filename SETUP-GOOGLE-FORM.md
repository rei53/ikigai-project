# 予約フォーム＆自動返信メールの設定手順

このサイトの申し込みフォームは Google フォームを使います。確認メール送信・決済方法の案内・リマインダーの自動送信は、Google フォームに付属する無料の自動化機能（Google Apps Script）で行います。すべて無料のGoogleアカウントだけで完結します。

---

## 1. Googleフォームを作る

1. https://forms.google.com を開き、新しいフォームを作成
2. 質問項目の例（そのままコピーして使えます）
   - お名前（記述式・必須）
   - フリガナ（記述式）
   - メールアドレス（記述式・必須／メール形式で検証をON）
   - 電話番号（記述式）
   - お申し込みの講座（プルダウン／必須）※選択肢は `data/courses.js` で `bookingType: 'internal'` になっている講座の `name` と揃えてください
     - 寺ヨガ（法泉寺）
     - 寺ヨガ（西方寺）
     - こどもヨーガ 単発イベント

   ※いすヨーガ・マインドフルネスヨーガは各施設（サンサン館みき、リビングカルチャー高松、瀬戸内フィットネス）の窓口で申し込みを受け付けるため、このフォームには含めません（`data/courses.js` で `bookingType: 'external'` に設定済みです）。
   - 参加人数（記述式・数値）
   - ご要望・ご質問（記述式・任意）
3. 右上の「送信」ボタン → リンクアイコンをクリックし、共有用URL（`https://forms.gle/xxxxxxxx` の形）をコピー

## 2. サイト側にフォームURLを反映する

`data/courses.js` を開き、該当する講座の `formUrl` を、コピーしたURLに書き換えてください。

```js
formUrl: 'https://forms.gle/xxxxxxxx',
```

これで [booking.html](booking.html) にフォームが埋め込まれ、申し込みができるようになります。

## 3. 自動返信・決済案内・リマインダーを設定する（Google Apps Script）

1. 作成したGoogleフォームの回答タブ → 緑色のスプレッドシートアイコンをクリックし、回答を集計する**スプレッドシートを作成**
2. スプレッドシートを開き、メニューの「拡張機能」→「Apps Script」を開く
3. 表示されたエディタの中身をすべて消し、下の「Apps Scriptコード」をそのまま貼り付ける
4. 保存（フロッピーアイコン）
5. 上部の関数選択で `setupTriggers` を選び、▷実行ボタンを押す
   - 初回は権限確認の画面が出るので、「許可を確認」→ご自身のGoogleアカウントを選択→「詳細」→「（安全ではないページ）に移動」→「許可」と進めてください（Googleの標準の確認フローです）
6. これで「フォーム送信時の自動返信」と「前日リマインダーの自動送信（毎日決まった時刻にチェック）」が有効になります

### 決済方法・案内文の編集について

コード内の `PAYMENT_INFO` の部分に、実際の決済方法（銀行振込の振込先、当日現金、PayPayのID など）を書き込んでご利用ください。今はプレースホルダーになっています。

---

## Apps Scriptコード

```javascript
// ==== 設定項目：ここを実際の内容に書き換えてください ====

const PAYMENT_INFO = `
お支払い方法は以下からお選びいただけます。

【銀行振込】
◯◯銀行 ◯◯支店 普通 1234567
口座名義：ヨダ ヨガ（ヨダヨガ）
※恐れ入りますが振込手数料はご負担ください

【当日現金払い】
講座当日、会場にてお支払いください

【PayPay】
ID: @your_paypay_id
`.trim();

const SENDER_NAME = 'IKIGAIプロジェクト®';
const REPLY_TO = 'yodayoga2525@gmail.com';

// 列の並び順（Googleフォームの質問順と合わせてください。1列目はタイムスタンプ）
const COL = {
  TIMESTAMP: 1,
  NAME: 2,
  KANA: 3,
  EMAIL: 4,
  PHONE: 5,
  COURSE: 6,
  PEOPLE: 7,
  MESSAGE: 8
};

// ==== ここから下は編集不要 ====

function onFormSubmit(e) {
  const row = e.values;
  const name = row[COL.NAME - 1] || '';
  const email = row[COL.EMAIL - 1] || '';
  const course = row[COL.COURSE - 1] || '';

  if (!email) return;

  const subject = `【${SENDER_NAME}】${course} お申し込みありがとうございます`;
  const body = `
${name} 様

この度は「${course}」にお申し込みいただき、誠にありがとうございます。
以下の内容で受付いたしました。

・お申し込み講座：${course}

${PAYMENT_INFO}

開催日が近づきましたら、リマインドメールを改めてお送りいたします。
ご不明な点がございましたら、このメールにご返信ください。

${SENDER_NAME}
${REPLY_TO}
`.trim();

  MailApp.sendEmail({
    to: email,
    subject: subject,
    body: body,
    replyTo: REPLY_TO,
    name: SENDER_NAME
  });
}

// 前日リマインダー：スプレッドシートに「開催日」列がある場合に、
// 前日の朝に自動でリマインドメールを送ります。
// 「開催日」列が無い場合はこの関数は何もしません。
function sendReminders() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  const data = sheet.getDataRange().getValues();
  const headerRow = data[0];
  const dateColIndex = headerRow.findIndex(h => String(h).includes('開催日'));
  if (dateColIndex === -1) return; // 開催日列がまだ無ければ何もしない

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = Utilities.formatDate(tomorrow, Session.getScriptTimeZone(), 'yyyy-MM-dd');

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const eventDate = row[dateColIndex];
    if (!eventDate) continue;
    const eventDateStr = Utilities.formatDate(new Date(eventDate), Session.getScriptTimeZone(), 'yyyy-MM-dd');
    if (eventDateStr !== tomorrowStr) continue;

    const name = row[COL.NAME - 1] || '';
    const email = row[COL.EMAIL - 1] || '';
    const course = row[COL.COURSE - 1] || '';
    if (!email) continue;

    MailApp.sendEmail({
      to: email,
      subject: `【${SENDER_NAME}】明日は「${course}」です`,
      body: `${name} 様\n\n明日はいよいよ「${course}」の開催日です。お気をつけてお越しください。\n\n${SENDER_NAME}\n${REPLY_TO}`,
      replyTo: REPLY_TO,
      name: SENDER_NAME
    });
  }
}

// 初回に一度だけ実行する設定用関数
function setupTriggers() {
  // 既存のトリガーを一旦削除してから設定し直す（重複防止）
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));

  ScriptApp.newTrigger('onFormSubmit')
    .forSpreadsheet(SpreadsheetApp.getActiveSpreadsheet())
    .onFormSubmit()
    .create();

  ScriptApp.newTrigger('sendReminders')
    .timeBased()
    .everyDays(1)
    .atHour(9)
    .create();

  Logger.log('トリガーの設定が完了しました。');
}
```

### 補足

- 「開催日」列をスプレッドシートに追加したい場合は、フォームの質問に「開催日」（日付形式）を1つ追加してください。次回開催日を選んでもらう形でも、事務局側で手入力する形でもどちらでも構いません。
- 決済確認（入金確認後にステータスを変える等）は手動運用を想定しています。件数が増えてきたら、決済サービス（STORES予約・Square予約など）への移行もご検討ください。
