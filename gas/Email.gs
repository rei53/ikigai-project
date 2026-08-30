/**
 * メール送信
 */

function videoGuidanceBlock_(addVideo) {
  if (!addVideo) return '';
  return '\n【参加者特典：' + SELF_CARE_VIDEO_NAME + '】\n' +
    'こちらから視聴いただけます。\n' + SELF_CARE_VIDEO_URL + '\n';
}

function sendCustomerConfirmation_(email, name, courseName, addVideo) {
  if (!email) return;
  MailApp.sendEmail({
    to: email,
    subject: '【' + SENDER_NAME + '】' + courseName + ' お申し込み・決済が完了しました',
    body: name + ' 様\n\n' +
      '「' + courseName + '」のお申し込みと決済が完了しました。\n' +
      '当日を楽しみにお待ちしております。\n' +
      videoGuidanceBlock_(addVideo) + '\n' +
      'ご不明な点がございましたら、このメールにご返信ください。\n\n' +
      SENDER_NAME + '\n' + REPLY_TO,
    replyTo: REPLY_TO,
    name: SENDER_NAME
  });
}

// お支払い方法（PayPayのQR／ゆうちょ振込）に応じた案内メール。
// どちらも入金確認は手動のため、お支払い後にLINEへスクリーンショットを送っていただく。
function sendPaymentInstructions_(email, name, courseName, amount, paymentMethod, addVideo) {
  if (!email) return;
  const payBlock = paymentMethod === 'paypay'
    ? '【お支払い方法：PayPay】\n' + PAYPAY_INFO
    : '【お支払い方法：ゆうちょ振込】\n' + BANK_TRANSFER_INFO;

  MailApp.sendEmail({
    to: email,
    subject: '【' + SENDER_NAME + '】' + courseName + ' お申し込みありがとうございます',
    body: name + ' 様\n\n' +
      '「' + courseName + '」にお申し込みいただき、ありがとうございます。\n' +
      '下記のとおりお支払いをお願いいたします。\n\n' +
      '【お支払い金額】' + amount + '円\n\n' +
      payBlock + '\n\n' +
      'お支払い後、公式LINEにお名前を添えて、お支払い画面のスクリーンショットをお送りください。\n' +
      LINE_URL + '\n\n' +
      'ご入金の確認をもちまして予約確定となります。\n' +
      videoGuidanceBlock_(addVideo) + '\n' +
      'ご不明な点がございましたら、このメールにご返信ください。\n\n' +
      SENDER_NAME + '\n' + REPLY_TO,
    replyTo: REPLY_TO,
    name: SENDER_NAME
  });
}

function sendReminderEmail_(email, name, courseName, dateText) {
  if (!email) return;
  MailApp.sendEmail({
    to: email,
    subject: '【' + SENDER_NAME + '】まもなく「' + courseName + '」です',
    body: name + ' 様\n\n' +
      dateText + 'はいよいよ「' + courseName + '」の開催日です。\n' +
      'お気をつけてお越しください。\n\n' +
      'ご不明な点がございましたら、このメールにご返信ください。\n\n' +
      SENDER_NAME + '\n' + REPLY_TO,
    replyTo: REPLY_TO,
    name: SENDER_NAME
  });
}

function sendOwnerNotification_(name, courseName, amount, paymentMethod, status) {
  const methodLabel = paymentMethod === 'paypay' ? 'PayPay（QRコード）' : 'ゆうちょ振込';
  MailApp.sendEmail({
    to: OWNER_EMAIL,
    subject: '【新規予約】' + courseName + '（' + methodLabel + '）',
    body: 'お名前: ' + name + '\n' +
      '講座: ' + courseName + '\n' +
      '金額: ' + amount + '円\n' +
      '支払い方法: ' + methodLabel + '\n' +
      'ステータス: ' + status + '\n\n' +
      '※入金を確認したら、スプレッドシートのstatus列を paid に変更してください。',
    name: SENDER_NAME
  });
}

function sendErrorAlert_(context, err) {
  MailApp.sendEmail({
    to: OWNER_EMAIL,
    subject: '【エラー】予約システムでエラーが発生しました',
    body: '内容: ' + context + '\nエラー: ' + String(err),
    name: SENDER_NAME
  });
}
