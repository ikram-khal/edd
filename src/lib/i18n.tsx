import { createContext, useContext, useState, ReactNode } from 'react';

export type Lang = 'qq' | 'ru' | 'en' | 'uz';

export const langMeta: Record<Lang, { label: string; short: string }> = {
  qq: { label: 'Qaraqalpaqsha', short: 'QQ' },
  ru: { label: 'Русский',       short: 'RU' },
  en: { label: 'English',       short: 'EN' },
  uz: { label: "O'zbekcha",     short: 'UZ' },
};

const translations = {
  app_name:        { qq: 'EDawis', ru: 'EDawis', en: 'EDawis', uz: 'EDawis' },
  app_subtitle:    { qq: 'Жасырын даўыс бериў системасы', ru: 'Система тайного голосования', en: 'Secret ballot voting system', uz: 'Yashirin ovoz berish tizimi' },
  admin_panel:     { qq: 'Хаткер панели', ru: 'Панель секретаря', en: 'Secretary panel', uz: 'Kotib paneli' },
  dashboard:       { qq: 'Бас бет', ru: 'Главная', en: 'Dashboard', uz: 'Bosh sahifa' },
  members:         { qq: 'Ағзалар', ru: 'Члены совета', en: 'Members', uz: "A'zolar" },
  meetings:        { qq: 'Мәжилислер', ru: 'Заседания', en: 'Meetings', uz: 'Majlislar' },
  active_votes:    { qq: 'Актив даўыс бериў', ru: 'Активные голосования', en: 'Active votes', uz: 'Faol ovoz berishlar' },
  add_member:      { qq: 'Ағза қосыў', ru: 'Добавить члена совета', en: 'Add member', uz: "A'zo qo'shish" },
  delete:          { qq: 'Өшириў', ru: 'Удалить', en: 'Delete', uz: "O'chirish" },
  full_name:       { qq: 'Аты-жөни', ru: 'ФИО', en: 'Full name', uz: 'To\'liq ism' },
  pin_code:        { qq: 'PIN код', ru: 'PIN код', en: 'PIN code', uz: 'PIN kod' },
  registered:      { qq: 'Дизимнен өткен', ru: 'Зарегистрирован', en: 'Registered', uz: "Ro'yxatdan o'tgan" },
  pending:         { qq: 'Күтилмекте', ru: 'Ожидается', en: 'Pending', uz: 'Kutilmoqda' },
  new_meeting:     { qq: 'Жаңа мәжилис', ru: 'Новое заседание', en: 'New meeting', uz: 'Yangi majlis' },
  date:            { qq: 'Сәне', ru: 'Дата', en: 'Date', uz: 'Sana' },
  protocol_number: { qq: 'Протокол номери', ru: 'Номер протокола', en: 'Protocol number', uz: 'Protokol raqami' },
  attendees:       { qq: 'Қатнасыўшылар', ru: 'Присутствующие', en: 'Attendees', uz: 'Ishtirokchilar' },
  select_all:      { qq: 'Бәрин белгилеў', ru: 'Выбрать всех', en: 'Select all', uz: 'Barchasini belgilash' },
  questions:       { qq: 'Даўысқа қойылған мәселе', ru: 'Вопросы на голосование', en: 'Questions for vote', uz: "Ovozga qo'yilgan masalalar" },
  add_question:    { qq: 'Мәселе қосыў', ru: 'Добавить вопрос', en: 'Add question', uz: 'Savol qo\'shish' },
  start_voting:    { qq: 'Даўыс бериўди баслаў', ru: 'Начать голосование', en: 'Start voting', uz: 'Ovoz berishni boshlash' },
  stop_voting:     { qq: 'Тоқтатыў', ru: 'Остановить', en: 'Stop', uz: "To'xtatish" },
  vote_for:        { qq: '✅ Қосыламан', ru: '✅ За', en: '✅ For', uz: '✅ Yoqlayma' },
  vote_against:    { qq: '❌ Қарсыман', ru: '❌ Против', en: '❌ Against', uz: '❌ Qarshiman' },
  vote_abstain:    { qq: '⬜ Бийтәреп', ru: '⬜ Воздержался', en: '⬜ Abstain', uz: '⬜ Betaraf' },
  accepted:        { qq: 'ҚАРАР ҚАБЫЛ ЕТИЛДИ', ru: 'РЕШЕНИЕ ПРИНЯТО', en: 'DECISION ACCEPTED', uz: 'QAROR QABUL QILINDI' },
  rejected:        { qq: 'ҚАРАР ҚАБЫЛ ЕТИЛМЕДИ', ru: 'РЕШЕНИЕ НЕ ПРИНЯТО', en: 'DECISION REJECTED', uz: 'QAROR QABUL QILINMADI' },
  tie:             { qq: 'ДАЎЫСЛАР ТЕҢ', ru: 'ГОЛОСА РАВНЫ', en: 'VOTES TIED', uz: 'OVOZLAR TENG' },
  all_voted:       { qq: 'Барлық мәселелерге даўыс бердиңиз. Рахмет!', ru: 'Вы проголосовали по всем вопросам. Спасибо!', en: 'You have voted on all questions. Thank you!', uz: 'Barcha masalalar bo\'yicha ovoz berdingiz. Rahmat!' },
  no_active_votes: { qq: 'Актив даўыс бериў жоқ', ru: 'Нет активных голосований', en: 'No active votes', uz: 'Faol ovoz berish yo\'q' },
  already_voted:   { qq: 'Сиз даўыс бергенсиз', ru: 'Вы уже проголосовали', en: 'You have already voted', uz: 'Siz allaqachon ovoz berdingiz' },
  enter_pin:       { qq: 'PIN кодыңызды киргизиң', ru: 'Введите ваш PIN код', en: 'Enter your PIN code', uz: 'PIN kodingizni kiriting' },
  login:           { qq: 'Кириў', ru: 'Войти', en: 'Login', uz: 'Kirish' },
  logout:          { qq: 'Шығыў', ru: 'Выйти', en: 'Logout', uz: 'Chiqish' },
  register_admin:  { qq: 'Админ аккаунтын жаратыў', ru: 'Создать аккаунт админа', en: 'Create admin account', uz: 'Admin akkountini yaratish' },
  username:        { qq: 'Логин', ru: 'Логин', en: 'Username', uz: 'Login' },
  password:        { qq: 'Пароль', ru: 'Пароль', en: 'Password', uz: 'Parol' },
  confirm_password:{ qq: 'Паролди тастыйықлаң', ru: 'Подтвердите пароль', en: 'Confirm password', uz: 'Parolni tasdiqlang' },
  change_password: { qq: 'Паролди өзгертиў', ru: 'Изменить пароль', en: 'Change password', uz: "Parolni o'zgartirish" },
  settings:        { qq: 'Баптаўлар', ru: 'Настройки', en: 'Settings', uz: 'Sozlamalar' },
  download_report: { qq: 'Есабат жүклеў', ru: 'Скачать отчёт', en: 'Download report', uz: 'Hisobotni yuklab olish' },
  download_template:{ qq: 'Шаблон жүклеў', ru: 'Скачать шаблон', en: 'Download template', uz: 'Shablonni yuklab olish' },
  upload_xlsx:     { qq: 'xlsx жүклеў', ru: 'Загрузить xlsx', en: 'Upload xlsx', uz: 'xlsx yuklash' },
  status:          { qq: 'Статус', ru: 'Статус', en: 'Status', uz: 'Holat' },
  back:            { qq: 'Артқа', ru: 'Назад', en: 'Back', uz: 'Orqaga' },
  total:           { qq: 'Жәми', ru: 'Итого', en: 'Total', uz: 'Jami' },
  chairman:        { qq: 'Баслық', ru: 'Председатель', en: 'Chairman', uz: 'Rais' },
  secretary:       { qq: 'Хаткер', ru: 'Секретарь', en: 'Secretary', uz: 'Kotib' },
  report_title:    { qq: 'ЖАСЫРЫН ДАЎЫС БЕРИЎ НӘТИЙЖЕЛЕРИ', ru: 'РЕЗУЛЬТАТЫ ТАЙНОГО ГОЛОСОВАНИЯ', en: 'SECRET BALLOT RESULTS', uz: 'YASHIRIN OVOZ BERISH NATIJALARI' },
  admin_exists:    { qq: 'Админ аккаунты бар', ru: 'Аккаунт админа уже существует', en: 'Admin account already exists', uz: 'Admin akkounti mavjud' },
  not_in_list:     { qq: 'Сиз қатнасыўшылар дизиминде жоқсыз', ru: 'Вас нет в списке присутствующих', en: 'You are not in the attendees list', uz: "Siz ishtirokchilar ro'yxatida yo'qsiz" },
  pin_not_found:   { qq: 'PIN табылмады', ru: 'PIN не найден', en: 'PIN not found', uz: 'PIN topilmadi' },
  pin_bound_other: { qq: 'Бул PIN басқа аккаунтқа байланған', ru: 'Этот PIN привязан к другому аккаунту', en: 'This PIN is bound to another account', uz: "Bu PIN boshqa akkountga bog'langan" },
  loading:         { qq: 'Жүкленбекте...', ru: 'Загрузка...', en: 'Loading...', uz: 'Yuklanmoqda...' },
  voter:           { qq: 'Кеңес ағзасы', ru: 'Член совета', en: 'Council member', uz: "Kengash a'zosi" },
  admin:           { qq: 'Хаткер (Админ)', ru: 'Секретарь (Админ)', en: 'Secretary (Admin)', uz: 'Kotib (Admin)' },
  admin_login:     { qq: 'Админ кириси', ru: 'Вход для админа', en: 'Admin login', uz: 'Admin kirishi' },
  welcome:         { qq: 'Хош келдиңиз', ru: 'Добро пожаловать', en: 'Welcome', uz: 'Xush kelibsiz' },
  error:           { qq: 'Қәте', ru: 'Ошибка', en: 'Error', uz: 'Xato' },
  wrong_password:  { qq: 'Қәте пароль', ru: 'Неверный пароль', en: 'Wrong password', uz: "Noto'g'ri parol" },
  checking:        { qq: 'Тексерилмекте...', ru: 'Проверка...', en: 'Checking...', uz: 'Tekshirilmoqda...' },
  create:          { qq: 'Жаратыў', ru: 'Создать', en: 'Create', uz: 'Yaratish' },
  add:             { qq: 'Қосыў', ru: 'Добавить', en: 'Add', uz: "Qo'shish" },
  question_added:  { qq: 'Мәселе қосылды', ru: 'Вопрос добавлен', en: 'Question added', uz: 'Savol qo\'shildi' },
  meeting_created: { qq: 'Мәжилис жаратылды', ru: 'Заседание создано', en: 'Meeting created', uz: 'Majlis yaratildi' },
  member_added:    { qq: 'Ағза қосылды', ru: 'Участник добавлен', en: 'Member added', uz: "A'zo qo'shildi" },
  pin_generated:   { qq: 'PIN код жаратылды: {pin}', ru: 'Сгенерирован PIN код: {pin}', en: 'Generated PIN code: {pin}', uz: 'PIN kod yaratildi: {pin}' },
  deleted:         { qq: 'Өширилди', ru: 'Удалено', en: 'Deleted', uz: "O'chirildi" },
  voting_started:  { qq: 'Даўыс бериў басланды!', ru: 'Голосование началось!', en: 'Voting started!', uz: 'Ovoz berish boshlandi!' },
  voting_stopped:  { qq: 'Даўыс бериў тоқтатылды', ru: 'Голосование остановлено', en: 'Voting stopped', uz: "Ovoz berish to'xtatildi" },
  vote_accepted:   { qq: 'Даўысыңыз қабыл етилди!', ru: 'Ваш голос принят!', en: 'Your vote has been accepted!', uz: 'Sizning ovozingiz qabul qilindi!' },
  vote_not_possible:{ qq: 'Даўыс бериў мүмкин емес', ru: 'Голосование невозможно', en: 'Voting is not possible', uz: 'Ovoz berish mumkin emas' },
  select_attendees_first:{ qq: 'Алдын ала қатнасыўшыларды белгилең', ru: 'Сначала отметьте присутствующих', en: 'First select attendees', uz: 'Avval ishtirokchilarni belgilang' },
  voted:           { qq: 'даўыс берди', ru: 'проголосовали', en: 'voted', uz: 'ovoz berdi' },
  not_voted:       { qq: 'даўыс бермеди', ru: 'не проголосовали', en: 'not voted', uz: 'ovoz bermadi' },
  no_questions:    { qq: 'Мәселелер жоқ', ru: 'Вопросов нет', en: 'No questions', uz: 'Savollar yo\'q' },
  no_meetings:     { qq: 'Мәжилислер жоқ', ru: 'Заседаний нет', en: 'No meetings', uz: 'Majlislar yo\'q' },
  no_members:      { qq: 'Ағзалар жоқ', ru: 'Участников нет', en: 'No members', uz: "A'zolar yo'q" },
  meeting_not_found:{ qq: 'Мәжилис табылмады', ru: 'Заседание не найдено', en: 'Meeting not found', uz: 'Majlis topilmadi' },
  new_question_placeholder:{ qq: 'Жаңа мәселе текстин киргизиң', ru: 'Введите текст нового вопроса', en: 'Enter new question text', uz: 'Yangi savol matnini kiriting' },
  date_placeholder:{ qq: 'Сәне (мыс. 22.03.2026)', ru: 'Дата (напр. 22.03.2026)', en: 'Date (e.g. 22.03.2026)', uz: 'Sana (mas. 22.03.2026)' },
  delete_member_confirm:{ qq: 'ағзасын өширесиз бе?', ru: 'Удалить участника?', en: 'Delete member?', uz: "a'zoni o'chirasizmi?" },
  delete_meeting_confirm:{ qq: 'Мәжилисти өширесиз бе?', ru: 'Удалить заседание?', en: 'Delete meeting?', uz: "Majlisni o'chirasizmi?" },
  delete_question_confirm:{ qq: 'Мәселени өширесиз бе?', ru: 'Удалить вопрос?', en: 'Delete question?', uz: "Savalni o'chirasizmi?" },
  duplicate_pin:   { qq: 'Бул PIN аллақашан бар', ru: 'Этот PIN уже существует', en: 'This PIN already exists', uz: 'Bu PIN allaqachon mavjud' },
  import_result:   { qq: 'Қосылды: {added}, Өткизилди (дубликат PIN): {skipped}', ru: 'Добавлено: {added}, Пропущено (дубликат PIN): {skipped}', en: 'Added: {added}, Skipped (duplicate PIN): {skipped}', uz: "Qo'shildi: {added}, O'tkazildi (dublikat PIN): {skipped}" },
  import_error:    { qq: 'Импорт қәтеси', ru: 'Ошибка импорта', en: 'Import error', uz: 'Import xatosi' },
  report_downloaded:{ qq: 'Есабат жүклеп алынды', ru: 'Отчёт скачан', en: 'Report downloaded', uz: 'Hisobot yuklab olindi' },
  voted_check:     { qq: 'Даўыс берилди ✓', ru: 'Проголосовано ✓', en: 'Voted ✓', uz: 'Ovoz berildi ✓' },
  meeting_label:   { qq: 'Мәжилис', ru: 'Заседание', en: 'Meeting', uz: 'Majlis' },
  question_label:  { qq: 'мәселе', ru: 'вопрос', en: 'question', uz: 'savol' },
  closed_label:    { qq: 'жабық', ru: 'закрыто', en: 'closed', uz: 'yopiq' },
  passwords_mismatch:{ qq: 'Парольлер сәйкес келмейди', ru: 'Пароли не совпадают', en: 'Passwords do not match', uz: 'Parollar mos kelmadi' },
  password_changed:{ qq: 'Пароль өзгертилди', ru: 'Пароль изменён', en: 'Password changed', uz: "Parol o'zgartirildi" },
  current_password:{ qq: 'Ағымдағы пароль', ru: 'Текущий пароль', en: 'Current password', uz: 'Joriy parol' },
  new_password:    { qq: 'Жаңа пароль', ru: 'Новый пароль', en: 'New password', uz: 'Yangi parol' },
  for_label:       { qq: 'Қосыламан', ru: 'За', en: 'For', uz: 'Yoqlayma' },
  against_label:   { qq: 'Қарсыман', ru: 'Против', en: 'Against', uz: 'Qarshiman' },
  abstain_label:   { qq: 'Бийтәреп', ru: 'Воздержался', en: 'Abstain', uz: 'Betaraf' },
  result_label:    { qq: 'Нәтийже', ru: 'Результат', en: 'Result', uz: 'Natija' },
  report_attendees_count:{ qq: 'Қатнасыўшылар саны', ru: 'Количество присутствующих', en: 'Number of attendees', uz: 'Ishtirokchilar soni' },
  control_panel:   { qq: 'Басқарыў панели', ru: 'Панель управления', en: 'Control panel', uz: 'Boshqaruv paneli' },
  register:        { qq: 'Дизимнен өтиў', ru: 'Регистрация', en: 'Register', uz: "Ro'yxatdan o'tish" },
  account_created: { qq: 'Аккаунт жаратылды!', ru: 'Аккаунт создан!', en: 'Account created!', uz: 'Akkount yaratildi!' },
  password_too_short:{ qq: 'Пароль кеминде 6 символ болыўы керек', ru: 'Пароль должен быть не менее 6 символов', en: 'Password must be at least 6 characters', uz: 'Parol kamida 6 ta belgidan iborat bo\'lishi kerak' },
  password_min_length:{ qq: 'Пароль кеминде 6 символ', ru: 'Минимум 6 символов', en: 'Minimum 6 characters', uz: 'Kamida 6 ta belgi' },
  username_taken:  { qq: 'Бул логин бос емес', ru: 'Этот логин уже занят', en: 'This username is already taken', uz: 'Bu login band' },
  supabase_env_title:{ qq: 'Сервер баптаўлары жоқ', ru: 'Не настроены переменные Supabase', en: 'Supabase not configured', uz: 'Server sozlamalari yo\'q' },
  supabase_env_body:{ qq: 'Vercel-де VITE_SUPABASE_URL және VITE_SUPABASE_PUBLISHABLE_KEY қосың.', ru: 'В Vercel добавьте VITE_SUPABASE_URL и VITE_SUPABASE_PUBLISHABLE_KEY.', en: 'Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in Vercel.', uz: "Vercel'da VITE_SUPABASE_URL va VITE_SUPABASE_PUBLISHABLE_KEY qo'shing." },
  fetch_failed_hint:{ qq: 'Серверге қосылу мүмкин емес. URL тексерің, VPN өшириң.', ru: 'Не удаётся связаться с Supabase. Проверь URL и сеть.', en: 'Cannot connect to server. Check the URL and network.', uz: 'Serverga ulanib bo\'lmadi. URL va tarmoqni tekshiring.' },
  recent_meetings: { qq: 'Соңғы мәжилислер', ru: 'Последние заседания', en: 'Recent meetings', uz: "So'nggi majlislar" },
  quick_actions:   { qq: 'Тез ис-қәреке', ru: 'Быстрые действия', en: 'Quick actions', uz: 'Tezkor amallar' },
  search_placeholder:{ qq: 'Излеў...', ru: 'Поиск...', en: 'Search...', uz: 'Qidirish...' },
  account_info:    { qq: 'Аккаунт мағлыўматы', ru: 'Информация об аккаунте', en: 'Account info', uz: "Akkount ma'lumoti" },
  logged_in_as:    { qq: 'Кирген аккаунт', ru: 'Вы вошли как', en: 'Logged in as', uz: 'Kirgan akkount' },
  no_results:      { qq: 'Нәтийже табылмады', ru: 'Ничего не найдено', en: 'No results found', uz: 'Natija topilmadi' },
  go_to_members:   { qq: 'Ағзаларға өтиў', ru: 'Перейти к участникам', en: 'Go to members', uz: "A'zolarga o'tish" },
  go_to_meetings:  { qq: 'Мәжилислерге өтиў', ru: 'Перейти к заседаниям', en: 'Go to meetings', uz: "Majlislarga o'tish" },
  live_badge:      { qq: 'Даўыс жүрип атыр', ru: 'Идёт голосование', en: 'Live voting', uz: 'Ovoz berish ketmoqda' },
  reset_sessions:  { qq: 'Сессияларды тазалаў', ru: 'Сбросить сессии', en: 'Reset sessions', uz: 'Sessiyalarni tozalash' },
  reset_sessions_confirm:{ qq: 'Барлық ағзалар сессияларын тазалаўды қалайсыз ба?', ru: 'Сбросить сессии всех участников?', en: 'Reset sessions for all members?', uz: "Barcha a'zolar sessiyalarini tozalaysizmi?" },
  sessions_reset:  { qq: 'Сессиялар тазаланды', ru: 'Сессии сброшены', en: 'Sessions reset', uz: 'Sessiyalar tozalandi' },
  copy_pins:       { qq: 'PIN-ларды көширіў', ru: 'Скопировать PIN-ы', en: 'Copy PINs', uz: 'PIN-larni nusxalash' },
  pins_copied:     { qq: 'PIN-лар көширилди', ru: 'PIN-ы скопированы', en: 'PINs copied', uz: 'PIN-lar nusxalandi' },
  members_online:  { qq: 'Онлайн ағзалар', ru: 'Участников онлайн', en: 'Members online', uz: "Onlayn a'zolar" },
  edit:            { qq: 'Өзгертиў', ru: 'Редактировать', en: 'Edit', uz: 'Tahrirlash' },
  save:            { qq: 'Сақлаў', ru: 'Сохранить', en: 'Save', uz: 'Saqlash' },
  cancel:          { qq: 'Бийкар етиў', ru: 'Отмена', en: 'Cancel', uz: 'Bekor qilish' },
  question_updated:{ qq: 'Мәселе жаңартылды', ru: 'Вопрос обновлён', en: 'Question updated', uz: 'Savol yangilandi' },
  show_results:    { qq: 'Нәтийжелерди көрсетиў', ru: 'Показать результаты', en: 'Show results', uz: 'Natijalarni ko\'rsatish' },
  hide_results:    { qq: 'Жасырыў', ru: 'Скрыть', en: 'Hide', uz: 'Yashirish' },
  next_question:   { qq: 'Кейинги мәселе', ru: 'Следующий вопрос', en: 'Next question', uz: 'Keyingi savol' },
  finish_voting:   { qq: 'Даўыс бериўди жабыў', ru: 'Завершить голосование', en: 'Finish voting', uz: 'Ovoz berishni yakunlash' },
} as const;

type TranslationKey = keyof typeof translations;

interface I18nContextType {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextType>({
  lang: 'qq',
  setLang: () => {},
  t: (key) => key,
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    return (localStorage.getItem('edawis_lang') as Lang) || 'qq';
  });

  const setLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem('edawis_lang', l);
  };

  const t = (key: TranslationKey, params?: Record<string, string | number>): string => {
    let text: string = translations[key]?.[lang] ?? key;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        text = text.replace(`{${k}}`, String(v));
      });
    }
    return text;
  };

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
