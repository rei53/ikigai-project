/**
 * メール送信
 */

// 参加者特典の動画は、入金確認後に公式LINEから個別にURLと注意事項をお送りする運用。
// そのためメールにはURLを載せず、LINEでご案内する旨だけを伝える。
// 入金前（案内メール）と入金後（確定メール）で時系列が変わるので、isConfirmedで文面を切り替える。
function videoGuidanceBlock_(addVideo, isConfirmed) {
  if (!addVideo) return '';
  const timing = isConfirmed
    ? '視聴URLと注意事項は、このあと公式LINEよりお送りします。'
    : '視聴URLと注意事項は、ご入金の確認後に公式LINEよりお送りします。';
  return '\n【参加者特典：' + SELF_CARE_VIDEO_NAME + '】\n' +
    timing + '\n' +
    '視聴期間は4週間ほどです。終了日はお申し込み時期にかかわらず全員共通ですので、お早めにご視聴ください。\n' +
    '公式LINEのご登録がまだの場合は、こちらからご登録のうえ、お申し込み時のお名前をお送りください。\n' + LINE_URL + '\n';
}

function sendCustomerConfirmation_(email, name, courseName, addVideo) {
  if (!email) return;
  MailApp.sendEmail({
    to: email,
    subject: '【' + SENDER_NAME + '】' + courseName + ' ご予約が確定しました',
    body: name + ' 様\n\n' +
      '「' + courseName + '」のご入金を確認しました。\n' +
      'ご予約が確定しましたので、当日を楽しみにお待ちしております。\n' +
      videoGuidanceBlock_(addVideo, true) + '\n' +
      'ご不明な点がございましたら、このメールにご返信ください。\n\n' +
      SENDER_NAME + '\n' + REPLY_TO,
    replyTo: REPLY_TO,
    name: SENDER_NAME
  });
}

function htmlEscape_(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// 改行をHTMLの<br>に変換する（メール本文のテキスト版とHTML版で同じ文面を使い回すため）
function nl2br_(text) {
  return htmlEscape_(text).replace(/\n/g, '<br>');
}

// お支払い方法（PayPayのQR／ゆうちょ振込）に応じた案内メール。
// どちらも入金確認は手動のため、お支払い後にLINEへスクリーンショットを送っていただく。
// PayPayの場合は、サイトに載せているものと同じQRコード画像をメール本文に埋め込む。
function sendPaymentInstructions_(email, name, courseName, amount, paymentMethod, addVideo) {
  if (!email) return;
  const isPayPay = paymentMethod === 'paypay';

  const payBlockText = isPayPay
    ? '【お支払い方法：PayPay】\n' + PAYPAY_INFO + '\n※QRコードはこのメールに添付しています。'
    : '【お支払い方法：ゆうちょ振込】\n' + BANK_TRANSFER_INFO;

  const textBody = name + ' 様\n\n' +
    '「' + courseName + '」にお申し込みいただき、ありがとうございます。\n' +
    '下記のとおりお支払いをお願いいたします。\n\n' +
    '【お支払い金額】' + amount + '円\n\n' +
    payBlockText + '\n\n' +
    'お支払い後、公式LINEへお支払い画面のスクリーンショットをお送りください。\n' +
    'その際、お申し込み時のお名前も一緒にお送りください。\n' +
    '初めて友だち追加された方は、LINEのお名前だけではどなたか分からないためです。\n' +
    LINE_URL + '\n\n' +
    'ご入金の確認をもちまして予約確定となります。\n' +
    videoGuidanceBlock_(addVideo, false) + '\n' +
    'ご不明な点がございましたら、このメールにご返信ください。\n\n' +
    SENDER_NAME + '\n' + REPLY_TO;

  // QRコード画像を取得する。取得できなかった場合でも案内メール自体は必ず送る。
  let qrBlob = null;
  if (isPayPay) {
    try {
      qrBlob = UrlFetchApp.fetch(PAYPAY_QR_IMAGE_URL).getBlob().setName('paypay-qr.png');
    } catch (err) {
      sendErrorAlert_('PayPay QRコード画像の取得', err);
    }
  }

  const payBlockHtml = isPayPay
    ? '<p><strong>【お支払い方法：PayPay】</strong><br>' + nl2br_(PAYPAY_INFO) + '</p>' +
      (qrBlob
        ? '<p><img src="cid:paypayQr" alt="PayPayのお支払い用QRコード" style="max-width:240px; width:100%; border:1px solid #ddd; border-radius:8px;"></p>'
        : '<p>QRコードは<a href="' + SITE_BOOKING_URL + '">お申し込みページ</a>に掲載しています。</p>')
    : '<p><strong>【お支払い方法：ゆうちょ振込】</strong><br>' + nl2br_(BANK_TRANSFER_INFO) + '</p>';

  const htmlBody =
    '<div style="font-family:sans-serif; font-size:14px; line-height:1.8; color:#333;">' +
    '<p>' + htmlEscape_(name) + ' 様</p>' +
    '<p>「' + htmlEscape_(courseName) + '」にお申し込みいただき、ありがとうございます。<br>' +
    '下記のとおりお支払いをお願いいたします。</p>' +
    '<p><strong>【お支払い金額】' + amount + '円</strong></p>' +
    payBlockHtml +
    '<p>お支払い後、公式LINEへお支払い画面のスクリーンショットをお送りください。<br>' +
    'その際、<strong>お申し込み時のお名前も一緒にお送りください。</strong><br>' +
    '初めて友だち追加された方は、LINEのお名前だけではどなたか分からないためです。<br>' +
    '<a href="' + LINE_URL + '">' + LINE_URL + '</a></p>' +
    '<p>ご入金の確認をもちまして予約確定となります。</p>' +
    nl2br_(videoGuidanceBlock_(addVideo, false)) +
    '<p>ご不明な点がございましたら、このメールにご返信ください。</p>' +
    '<p>' + htmlEscape_(SENDER_NAME) + '<br>' + htmlEscape_(REPLY_TO) + '</p>' +
    '</div>';

  const options = {
    to: email,
    subject: '【' + SENDER_NAME + '】' + courseName + ' お申し込みありがとうございます',
    body: textBody,
    htmlBody: htmlBody,
    replyTo: REPLY_TO,
    name: SENDER_NAME
  };
  if (qrBlob) {
    options.inlineImages = { paypayQr: qrBlob };
  }

  MailApp.sendEmail(options);
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
