/**
 * Instagramフィード連携
 *
 * サイトのトップページは、Instagramに直接アクセスしません（アクセストークンを
 * 外部に出さないため）。代わりにこのApps Scriptが裏側で定期的にInstagramの
 * 最新投稿を取得してScript Propertiesにキャッシュし、サイトはdoGet(action=instagram)
 * 経由でそのキャッシュだけを受け取ります。
 *
 * 準備手順は SETUP-BOOKING-SYSTEM.md の「Instagram連携」を参照してください。
 */

const INSTAGRAM_CACHE_PROP = 'INSTAGRAM_CACHE_JSON';
const INSTAGRAM_CACHE_UPDATED_PROP = 'INSTAGRAM_CACHE_UPDATED_AT';
const INSTAGRAM_FEED_LIMIT = 6;

function getInstagramFeed_() {
  const props = PropertiesService.getScriptProperties();
  const cached = props.getProperty(INSTAGRAM_CACHE_PROP);
  if (!cached) {
    return { items: [], updatedAt: null };
  }
  return {
    items: JSON.parse(cached),
    updatedAt: props.getProperty(INSTAGRAM_CACHE_UPDATED_PROP) || null
  };
}

// 時限トリガーで定期実行（setupTriggersで設定）。最新投稿を取得してキャッシュを更新する。
function refreshInstagramCache() {
  const props = PropertiesService.getScriptProperties();
  const accessToken = props.getProperty('INSTAGRAM_ACCESS_TOKEN');
  const userId = props.getProperty('INSTAGRAM_USER_ID');
  if (!accessToken || !userId) {
    Logger.log('INSTAGRAM_ACCESS_TOKEN または INSTAGRAM_USER_ID が未設定のため、Instagramフィードの更新をスキップしました。');
    return;
  }

  const fields = 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp';
  const url = 'https://graph.instagram.com/' + encodeURIComponent(userId) + '/media'
    + '?fields=' + fields
    + '&limit=' + INSTAGRAM_FEED_LIMIT
    + '&access_token=' + encodeURIComponent(accessToken);

  try {
    const res = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    const body = JSON.parse(res.getContentText());

    if (res.getResponseCode() !== 200 || !body.data) {
      throw new Error('Instagram API error: ' + res.getContentText());
    }

    const items = body.data.map(function (m) {
      return {
        id: m.id,
        caption: (m.caption || '').slice(0, 140),
        mediaType: m.media_type,
        // 動画はサムネイル、画像はそのままの画像URLを使う
        imageUrl: m.media_type === 'VIDEO' ? m.thumbnail_url : m.media_url,
        permalink: m.permalink,
        timestamp: m.timestamp
      };
    });

    props.setProperty(INSTAGRAM_CACHE_PROP, JSON.stringify(items));
    props.setProperty(INSTAGRAM_CACHE_UPDATED_PROP, new Date().toISOString());
  } catch (err) {
    sendErrorAlert_('refreshInstagramCache', err);
  }
}

// 時限トリガーで定期実行（setupTriggersで設定）。長期アクセストークンの有効期限（60日）が
// 切れる前に自動更新する。Metaの仕様上、発行から24時間以上経過したトークンのみ更新可能。
function refreshInstagramToken() {
  const props = PropertiesService.getScriptProperties();
  const accessToken = props.getProperty('INSTAGRAM_ACCESS_TOKEN');
  if (!accessToken) return;

  const url = 'https://graph.instagram.com/refresh_access_token'
    + '?grant_type=ig_refresh_token'
    + '&access_token=' + encodeURIComponent(accessToken);

  try {
    const res = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    const body = JSON.parse(res.getContentText());
    if (res.getResponseCode() !== 200 || !body.access_token) {
      throw new Error('Instagramトークン更新に失敗: ' + res.getContentText());
    }
    props.setProperty('INSTAGRAM_ACCESS_TOKEN', body.access_token);
    Logger.log('Instagramアクセストークンを更新しました。');
  } catch (err) {
    sendErrorAlert_('refreshInstagramToken', err);
  }
}
