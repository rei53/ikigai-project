// IKIGAIプロジェクト 講座・スケジュール データ
// ここを編集するだけで、トップページの「スケジュール」「募集中の講座」と
// 予約詳細ページ（booking.html）の内容が両方とも更新されます。
//
// bookingType: "internal"（このサイトのフォームで予約）/ "external"（会場に直接申し込み）
// formUrl は Google フォームの共有URL（例: https://forms.gle/xxxxxxxx）に置き換えてください。※internalのみ使用
// status: "open"（募集中）/ "few"（残りわずか）/ "closed"（締切）

const COURSES = [
  {
    id: 'tera-yoga-hosenji',
    category: 'tera-yoga',
    target: '個人向け',
    bookingType: 'internal',
    name: '寺ヨガ（法泉寺）',
    venue: '法泉寺',
    scheduleText: '毎月第3日曜日',
    nextDate: '2026-07-19',
    nextDateText: '2026年7月19日（日）',
    time: '10:00〜11:00',
    capacity: '定員10名',
    price: '1回 2,000円',
    image: 'images/tera-yoga.jpg',
    description: '静かな本堂で、心身を整える寺ヨガ。ヨガが初めての方も歓迎です。',
    formUrl: 'YOUR_GOOGLE_FORM_URL',
    status: 'open'
  },
  {
    id: 'tera-yoga-saihoji',
    category: 'tera-yoga',
    target: '個人向け',
    bookingType: 'internal',
    name: '寺ヨガ（西方寺）',
    venue: '西方寺',
    scheduleText: '偶数月・第1土曜日',
    nextDate: '2026-08-01',
    nextDateText: '2026年8月1日（土）',
    time: '10:00〜11:00',
    capacity: '定員10名',
    price: '1回 2,000円',
    image: 'images/tera-yoga.jpg',
    description: '静かな本堂で、心身を整える寺ヨガ。ヨガが初めての方も歓迎です。',
    formUrl: 'YOUR_GOOGLE_FORM_URL',
    status: 'open'
  },
  {
    id: 'kodomo-yoga-event-summer',
    category: 'kodomo-yoga',
    target: '個人向け',
    bookingType: 'internal',
    name: 'こどもヨーガ 単発イベント',
    venue: '地域コミュニティ会場',
    scheduleText: '単発イベント（不定期開催）',
    nextDate: '2026-07-20',
    nextDateText: '2026年7月20日（月・祝）',
    time: '10:00〜11:00',
    capacity: '定員15組',
    price: '1回 1,000円（お子さま1名につき）',
    image: 'images/origin-story.jpg',
    description: '発達段階に応じた内容で、子どもが「自分を感じる」時間と生きる力を育む単発イベントです。おやこでの参加も歓迎。',
    formUrl: 'YOUR_GOOGLE_FORM_URL',
    status: 'open'
  },
  {
    id: 'isu-yoga-sansan',
    category: 'isu-yoga',
    target: '個人向け',
    bookingType: 'external',
    name: 'いすヨーガ（サンサン館みき）',
    venue: 'サンサン館みき',
    scheduleText: '月1回開催',
    nextDate: '2026-07-25',
    nextDateText: '2026年7月25日（土）',
    time: '13:30〜14:15',
    capacity: '定員15名',
    price: '1回 1,000円',
    image: 'images/isu-yoga.png',
    description: '「姿勢が変われば、未来が変わる」。椅子に座ったまま行える、無理のないヨーガです。',
    facilityNote: 'サンサン館みきの窓口・予約システムより直接お申し込みください。',
    status: 'open'
  },
  {
    id: 'mindfulness-living-culture',
    category: 'mindfulness-yoga',
    target: '個人向け',
    bookingType: 'external',
    name: 'マインドフルネスヨーガ（リビングカルチャー高松）',
    venue: 'リビングカルチャー高松',
    scheduleText: '月2回開催',
    nextDate: '2026-07-12',
    nextDateText: '2026年7月12日（日）',
    time: '10:30〜11:30',
    capacity: '定員12名',
    price: '1回 1,500円',
    image: 'images/hero-yoga.jpg',
    description: '心身を整えるマインドフルネスを取り入れたヨーガです。',
    facilityNote: 'リビングカルチャー高松の窓口・カルチャー会員申し込みより直接お申し込みください。',
    status: 'few'
  },
  {
    id: 'mindfulness-setouchi-fitness',
    category: 'mindfulness-yoga',
    target: '個人向け',
    bookingType: 'external',
    name: 'マインドフルネスヨーガ（瀬戸内フィットネス）',
    venue: '瀬戸内フィットネス',
    scheduleText: '月2回開催',
    nextDate: '2026-07-26',
    nextDateText: '2026年7月26日（日）',
    time: '10:30〜11:30',
    capacity: '定員12名',
    price: '1回 1,500円',
    image: 'images/hero-yoga.jpg',
    description: '心身を整えるマインドフルネスを取り入れたヨーガです。',
    facilityNote: '瀬戸内フィットネスの会員申し込み・フロントより直接お申し込みください。',
    status: 'open'
  }
];

// 日付が近い順に並び替え
COURSES.sort((a, b) => new Date(a.nextDate) - new Date(b.nextDate));
