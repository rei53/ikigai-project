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

function sendBankTransferInstructions_(email, name, courseName, amount, addVideo) {
  if (!email) return;
  MailApp.sendEmail({
    to: email,
    subject: '【' + SENDER_NAME + '】' + courseName + ' お申し込みありがとうございます',
    body: name + ' 様\n\n' +
      '「' + courseName + '」にお申し込みいただき、ありがとうございます。\n' +
      '以下の口座へお振込みください。\n\n' +
      '【お支払い金額】' + amount + '円\n\n' +
      '【振込先】\n' + BANK_TRANSFER_INFO + '\n\n' +
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
  const methodLabel = paymentMethod === 'paypay' ? 'PayPay' : '銀行振込';
  MailApp.sendEmail({
    to: OWNER_EMAIL,
    subject: '【新規予約】' + courseName + '（' + methodLabel + '）',
    body: 'お名前: ' + name + '\n' +
      '講座: ' + courseName + '\n' +
      '金額: ' + amount + '円\n' +
      '支払い方法: ' + methodLabel + '\n' +
      'ステータス: ' + status,
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
