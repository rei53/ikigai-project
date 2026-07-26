# 予約フォーム＆PayPay自動決済の設定手順

寺ヨガ（法泉寺・西方寺）の予約は、このサイトの独自フォーム→Google Apps Script（無料）で受け付けます。
支払い方法は「PayPay（自動で決済確認まで完了）」と「銀行振込（案内のみ、入金確認は手動）」の2つです。

準備するもの：Googleアカウント（無料）、PayPay for Developersのアカウント（登録済み）。

---

## 1. 予約を記録するGoogle Sheetを作る

1. https://sheets.google.com で新しいスプレッドシートを作成（名前は何でもOK、例：「IKIGAI予約管理」）
2. 1行目（見出し行）に、左から順に次の17項目を入力してください。

   `bookingId | timestamp | name | kana | email | phone | courseId | courseName | people | message | paymentMethod | amount | status | paidAt | lastError | addVideo | reminderSent`

3. シートのタブ名（画面下部）を `Bookings` に変更してください（右クリック→名前を変更）。

## 2. Apps Scriptプロジェクトを作る

1. スプレッドシートのメニューから「拡張機能」→「Apps Script」を開く
2. デフォルトで `コード.gs` というファイルがありますが、これは使いません。エディタ左側の「＋」から、このリポジトリの `gas/` フォルダにある8つのファイルと同じ名前でスクリプトファイルを作成し、それぞれの中身をそのままコピー＆ペーストしてください。

   - `Config.gs`
   - `Utils.gs`
   - `PayPay.gs`
   - `Booking.gs`
   - `Reconcile.gs`
   - `Reminder.gs`
   - `Email.gs`
   - `Main.gs`

   （ファイル名の末尾の `.gs` は保存時に自動でつくので、作成時は `Config` のように入力してOKです）
3. 最初からある `コード.gs`（空でよい）は削除して構いません。
4. 保存（フロッピーアイコン、またはCtrl+S）

### Config.gsの中で書き換える場所

- `BANK_TRANSFER_INFO`：実際の振込先（銀行名・支店名・口座番号・口座名義）に書き換える
- `COURSE_PRICES` / `COURSE_NAMES` / `COURSE_DATES`：`data/courses.js` の講座と金額・名前・開催日が一致しているか確認する（今後、料金や日程を変える場合はこの3つと `data/courses.js` を両方直す）
- `SELF_CARE_VIDEO_URL`：参加者特典「セルフケア動画」の視聴用URLに書き換える（法泉寺の3日程のみ、申し込み時に+1,000円で追加できます）
- `SITE_BOOKING_URL`：ドメインが変わった場合はここも合わせて変更する

## 3. PayPayのAPI認証情報を「スクリプトプロパティ」に設定する

コードに直接書き込まず、安全な場所（スクリプトプロパティ）に保存します。

1. developer.paypay.ne.jp のダッシュボードで、作成したアプリの **Sandbox（テスト環境）** の API Key・API Secret・Merchant ID を確認する
2. Apps Scriptエディタ左側の歯車アイコン「プロジェクトの設定」を開く
3. 一番下の「スクリプト プロパティ」で「スクリプト プロパティを追加」を押し、次の3つを登録する

   | プロパティ | 値 |
   |---|---|
   | `PAYPAY_API_KEY` | SandboxのAPI Key |
   | `PAYPAY_API_SECRET` | SandboxのAPI Secret |
   | `PAYPAY_MERCHANT_ID` | SandboxのMerchant ID |

4. 保存する

## 4. Webアプリとしてデプロイする

1. エディタ右上の「デプロイ」→「新しいデプロイ」
2. 種類の選択（歯車アイコン）で「ウェブアプリ」を選ぶ
3. 「実行するユーザー」→ **自分**
4. 「アクセスできるユーザー」→ **全員**
5. 「デプロイ」をクリック→初回は権限確認が出るので、自分のGoogleアカウントを選択→「詳細」→「（安全ではないページ）に移動」→「許可」と進む
6. 発行された **ウェブアプリのURL**（`https://script.google.com/macros/s/.../exec` の形）をコピーする

### 以後コードを修正するときの注意

2回目以降にコードを直したときは、**「新しいデプロイ」ではなく**、「デプロイを管理」→鉛筆アイコン（編集）→バージョンを「新バージョン」にして「デプロイ」を押してください。新しいデプロイを作るとURLが変わってしまい、サイト側とPayPay側の設定が両方壊れます。

## 5. サイト側にURLを設定する

`booking.html` を開き、以下の行を、手順4でコピーしたURLに書き換えてください。

```js
const SCRIPT_URL = 'YOUR_APPS_SCRIPT_WEB_APP_URL';
```

## 6. PayPayダッシュボードにWebhookを登録する

1. developer.paypay.ne.jp のアプリ設定画面で「Webhook」の項目を開く
2. Webhook URLに、手順4でコピーしたウェブアプリのURLをそのまま登録する
3. 対象イベントで「決済完了（PAYMENT.COMPLETED等）」を選べる場合は選択する

（このシステムはWebhookの中身を信用せず、届いたら必ずPayPayに直接問い合わせて確認する設計になっているため、Webhookが多少遅れたり届かなくても、30分ごとの自動チェックでフォローされます。）

## 7. 時限トリガーを設定する（放置決済の自動チェック・前日リマインダー）

1. Apps Scriptエディタ上部の関数選択で `setupTriggers` を選び、▷実行ボタンを押す
2. 初回は権限確認が出るので手順4と同様に許可する
3. これで、以下の2つが自動化されます
   - 支払いが30分以上「保留中」のままの予約を自動的に再チェック（`sweepPendingPayments`）
   - 開催日の前日、朝9時に確定済み（`paid` または `pending_bank_transfer`）の予約者へリマインドメールを自動送信（`sendDayBeforeReminders`）。一度送った予約には `reminderSent` に `sent` と記録され、二重送信はされません

## 8. Sandboxでテストする

1. サイトの寺ヨガの予約ページを開き、テスト用の内容で申し込みフォームを送信する（支払い方法：PayPay、参加者特典「セルフケア動画」もチェックして合計金額が+1,000円になることを確認）
2. PayPayのSandbox決済画面に遷移することを確認する
3. Sandbox環境のテスト用アカウントで決済を完了する
4. サイトに戻り、「決済を確認しています…」→最終的に「お申し込み・決済が完了しました」の表示になることを確認する
5. Google Sheetの該当行の `status` が `paid` になっていること、`paidAt` に時刻が入っていること、動画を選んだ場合は `addVideo` に `yes` が入っていることを確認する
6. 主催者宛て（yodayoga2525@gmail.com）とお客様宛てのメールが届いていること、動画を選んだ場合はメール本文に視聴案内が入っていることを確認する
7. リマインダーをテストしたい場合は、Google Sheet上でテスト行の `courseId` に対応する日付（`Config.gs` の `COURSE_DATES`）を明日の日付に一時的に変更し、Apps Scriptエディタで `sendDayBeforeReminders` を手動実行してメールが届くか確認する（テスト後は値を元に戻してください）
7. 支払い方法を「銀行振込」にして同様に送信し、その場で振込案内が表示されること、Sheetに `pending_bank_transfer` として記録され、案内メールが届くことを確認する

エラーが出た場合は、Apps Scriptエディタの「実行数」（左側の時計アイコン）からログを確認できます。エラー内容を教えていただければ一緒に調査します。

## 9. 本番へ切り替える（テストが問題なければ）

1. developer.paypay.ne.jpで本番申請・審査を完了し、本番用のAPI Key・Secret・Merchant IDを取得する
2. 手順3のスクリプトプロパティを本番の値に**上書き**する
3. `Config.gs` の `PAYPAY_PRODUCTION` を `false` から `true` に書き換えて保存し、手順4の「新バージョンをデプロイ」を行う
4. 少額の実際の決済で最終確認してから、案内を開始する

コード側の変更はこれだけで、他は一切触る必要はありません。
