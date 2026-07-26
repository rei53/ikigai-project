/**
 * PayPay REST API (OPA) ラッパー
 *
 * 認証方式・エンドポイント・ホスト名は、PayPay公式ドキュメントと
 * 公式Node SDK（github.com/paypay/paypayopa-sdk-node）のソースコードを突き合わせて実装しています。
 * 参考: https://developer.paypay.ne.jp/products/docs/webpayment
 */

// PayPayのAuthorizationヘッダー（hmac OPA-Auth方式）を組み立てる
function buildPayPayAuthHeader_(method, path, bodyObj, creds) {
  const epoch = Math.floor(Date.now() / 1000);
  const nonce = Utilities.getUuid();

  let contentType, payloadDigest;
  if (method === 'GET' || method === 'DELETE' || bodyObj === null || bodyObj === undefined) {
    contentType = 'empty';
    payloadDigest = 'empty';
  } else {
    contentType = 'application/json';
    const jsonBody = JSON.stringify(bodyObj);
    // PayPay側は contentType と body を連結してMD5→Base64にする
    const digestBytes = Utilities.computeDigest(
      Utilities.DigestAlgorithm.MD5,
      contentType + jsonBody,
      Utilities.Charset.UTF_8
    );
    payloadDigest = Utilities.base64Encode(digestBytes);
  }

  const signatureRaw = [path, method, nonce, epoch, contentType, payloadDigest].join('\n');
  const hmacBytes = Utilities.computeHmacSha256Signature(signatureRaw, creds.apiSecret);
  const hmacBase64 = Utilities.base64Encode(hmacBytes);

  const header = [creds.apiKey, hmacBase64, nonce, epoch, payloadDigest].join(':');
  return 'hmac OPA-Auth:' + header;
}

function payPayRequest_(method, path, bodyObj) {
  const creds = getPayPayCredentials_();
  const url = 'https://' + PAYPAY_HOST + path;

  const headers = {
    'Authorization': buildPayPayAuthHeader_(method, path, bodyObj, creds),
    'X-ASSUME-MERCHANT': creds.merchantId
  };

  const options = {
    method: method,
    headers: headers,
    muteHttpExceptions: true
  };

  if (method === 'POST' && bodyObj !== null && bodyObj !== undefined) {
    headers['Content-Type'] = 'application/json';
    options.payload = JSON.stringify(bodyObj);
  }

  const response = UrlFetchApp.fetch(url, options);
  const status = response.getResponseCode();
  const body = JSON.parse(response.getContentText());
  return { status: status, body: body };
}

// PayPay Web Payment（ウェブペイメント）の決済コードを作成し、チェックアウトURLを返す
// レスポンスの正確なフィールド名（data.url など）は、初回のSandboxテストで実際の応答を
// Logger.log(JSON.stringify(result)) 等で確認し、必要であれば調整してください。
function createPayPayCode_(bookingId, amountYen, courseName) {
  const payload = {
    merchantPaymentId: bookingId,
    amount: { amount: amountYen, currency: 'JPY' },
    codeType: 'ORDER_QR',
    orderDescription: courseName,
    redirectUrl: SITE_BOOKING_URL + '?paypayReturn=1&bookingId=' + encodeURIComponent(bookingId),
    redirectType: 'WEB_LINK'
  };
  const result = payPayRequest_('POST', '/v2/codes', payload);
  if (result.status < 200 || result.status >= 300) {
    throw new Error('PayPay決済コード作成に失敗しました: ' + JSON.stringify(result.body));
  }
  return result.body.data; // { url, codeId, expiryDate, ... }
}

// コード決済の状態を取得する（唯一信頼できる情報源。Webhookの中身は信用せず、必ずこれで確認する）
function getPayPayCodePaymentStatus_(bookingId) {
  const path = '/v2/codes/payments/' + encodeURIComponent(bookingId);
  const result = payPayRequest_('GET', path, null);
  if (result.status === 404) {
    return null; // まだ決済されていない、またはコードが存在しない
  }
  if (result.status < 200 || result.status >= 300) {
    throw new Error('PayPay決済状態の取得に失敗しました: ' + JSON.stringify(result.body));
  }
  return result.body.data; // { status: 'CREATED' | 'COMPLETED' | 'FAILED' | ..., ... }
}
