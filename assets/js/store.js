/* Прогресс пользователя: опыт, уроки, случаи, тренажёры, карточки (интервальные повторения),
   достижения. Всё хранится в localStorage этого браузера. */
(function () {
  const KEY = 'med-progress-v1';

  const RANKS = [
    { xp: 0, title: 'Гимназист' },
    { xp: 120, title: 'Абитуриент' },
    { xp: 400, title: 'Первокурсник' },
    { xp: 900, title: 'Студент-доклиник' },
    { xp: 1700, title: 'Студент-клиницист' },
    { xp: 2800, title: 'Субординатор' },
    { xp: 4300, title: 'Резидент' },
    { xp: 6300, title: 'Врач' },
    { xp: 9000, title: 'Старший врач' },
    { xp: 12500, title: 'Заведующий отделением' },
    { xp: 17000, title: 'Профессор' },
    { xp: 24000, title: 'Легенда медицины' }
  ];

  // Интервалы повторения карточек по «коробкам» Лейтнера, в днях.
  const SRS_DAYS = [0, 1, 3, 7, 16, 35, 80];
  const DAY = 86400000;
  // Тренажёры с общей механикой «верно / неверно / серия».
  const TRAINERS = ['ecg', 'labs', 'anatomy', 'terms', 'riddles', 'abg', 'myths', 'triage', 'pairs'];

  function defaults() {
    const tr = {};
    TRAINERS.forEach(t => { tr[t] = { seen: 0, correct: 0, best: 0 }; });
    return {
      xp: 0,
      lessons: {},      // id -> { done, best, at }
      cases: {},        // id -> { best, max, at }
      sims: {},         // id -> { best, at, survived }
      cards: {},        // cardId -> { box, due }
      trainers: tr,
      exams: [],        // { at, score, total, levels }
      daily: {},        // 'YYYY-MM-DD' -> score
      activity: {},     // 'YYYY-MM-DD' -> xp
      achievements: {}, // id -> timestamp
      calcsUsed: {},
      mistakes: {},     // 'урок#номер' -> { at, n }
      visited: {},
      settings: { theme: 'system', track: null },
      createdAt: Date.now()
    };
  }

  let state = defaults();
  const listeners = [];

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const d = defaults();
        state = Object.assign(d, JSON.parse(raw));
        state.trainers = Object.assign(d.trainers, state.trainers);
        state.settings = Object.assign(d.settings, state.settings);
      }
    } catch (e) { state = defaults(); }
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* приватный режим */ }
    listeners.forEach(fn => fn(state));
  }

  function today(d) {
    const t = d ? new Date(d) : new Date();
    const m = String(t.getMonth() + 1).padStart(2, '0');
    const day = String(t.getDate()).padStart(2, '0');
    return `${t.getFullYear()}-${m}-${day}`;
  }

  function rank(xp = state.xp) {
    let current = RANKS[0], next = null;
    for (let i = 0; i < RANKS.length; i++) {
      if (xp >= RANKS[i].xp) { current = RANKS[i]; next = RANKS[i + 1] || null; }
    }
    const span = next ? next.xp - current.xp : 1;
    const pct = next ? Math.min(100, Math.round(((xp - current.xp) / span) * 100)) : 100;
    return { current, next, pct, index: RANKS.indexOf(current) };
  }

  function streak() {
    let n = 0;
    const d = new Date();
    // Сегодняшний день засчитывается, если уже была активность; иначе считаем со вчера.
    if (!state.activity[today(d)]) d.setDate(d.getDate() - 1);
    while (state.activity[today(d)]) { n++; d.setDate(d.getDate() - 1); }
    return n;
  }

  function addXP(n, reason) {
    if (!n) return;
    const before = rank().current;
    state.xp += n;
    const k = today();
    state.activity[k] = (state.activity[k] || 0) + n;
    save();
    MED.ui && MED.ui.toast(`+${n} XP${reason ? ' · ' + reason : ''}`);
    const after = rank().current;
    if (after !== before && MED.ui) MED.ui.toast(`Новый ранг: ${after.title}`, 'rank');
    checkAchievements();
  }

  function completeLesson(id, score, total) {
    const rec = state.lessons[id] || { done: false, best: 0 };
    const pct = total ? Math.round((score / total) * 100) : 100;
    const first = !rec.done;
    const improved = pct > rec.best;
    rec.done = true;
    rec.best = Math.max(rec.best, pct);
    rec.at = Date.now();
    state.lessons[id] = rec;
    save();
    if (first) addXP(40 + score * 10, 'урок пройден');
    else if (improved) addXP(score * 3, 'улучшен результат');
    return { first, pct };
  }

  function finishCase(id, score, max) {
    const rec = state.cases[id];
    const first = !rec;
    state.cases[id] = { best: Math.max(score, rec ? rec.best : 0), max, at: Date.now() };
    save();
    if (first) addXP(60 + score * 5, 'клинический случай');
    return first;
  }

  function finishSim(id, score, survived) {
    const rec = state.sims[id];
    const first = !rec || !rec.survived;
    state.sims[id] = { best: Math.max(score, rec ? rec.best : 0), survived: survived || (rec && rec.survived), at: Date.now() };
    save();
    if (survived && first) addXP(80 + Math.round(score / 2), 'пациент стабилизирован');
    else checkAchievements();
  }

  // Карточки
  function card(id) { return state.cards[id] || { box: 0, due: 0 }; }
  function rateCard(id, grade) {
    const c = card(id);
    if (grade === 'again') { c.box = 0; c.due = Date.now() + 60 * 1000; }
    else if (grade === 'hard') { c.box = Math.max(1, c.box); c.due = Date.now() + DAY * Math.max(1, Math.ceil(SRS_DAYS[c.box] / 2)); }
    else { c.box = Math.min(SRS_DAYS.length - 1, c.box + 1); c.due = Date.now() + DAY * SRS_DAYS[c.box]; }
    state.cards[id] = c;
    save();
  }

  // Тренажёры: ЭКГ, анализы, анатомия, термины, загадки, газы крови.
  function recordTrainer(name, correct, run) {
    const t = state.trainers[name] || (state.trainers[name] = { seen: 0, correct: 0, best: 0 });
    t.seen++;
    if (correct) t.correct++;
    t.best = Math.max(t.best, run || 0);
    save();
    checkAchievements();
  }

  function recordExam(score, total, levels) {
    state.exams.unshift({ at: Date.now(), score, total, levels });
    state.exams = state.exams.slice(0, 30);
    save();
    addXP(Math.round(score * 4), 'экзамен');
  }

  function recordDaily(score) {
    const k = today();
    const first = state.daily[k] === undefined;
    state.daily[k] = Math.max(score, state.daily[k] || 0);
    save();
    if (first) addXP(30 + score * 5, 'вызов дня');
  }

  // Работа над ошибками: неверный ответ добавляет вопрос, верный — убирает.
  function recordAnswer(key, ok) {
    if (!key) return;
    if (ok) { if (state.mistakes[key]) { delete state.mistakes[key]; save(); } return; }
    const m = state.mistakes[key] || { n: 0 };
    state.mistakes[key] = { at: Date.now(), n: m.n + 1 };
    save();
  }
  function mistakeQuestions() {
    return Object.keys(state.mistakes || {}).map(key => {
      const [lessonId, idx] = key.split('#');
      const l = MED.lesson(lessonId);
      const q = l && l.quiz[+idx];
      return q ? Object.assign({}, q, { key, lessonId, lessonTitle: l.title }) : null;
    }).filter(Boolean);
  }

  function markCalc(id) { if (!state.calcsUsed[id]) { state.calcsUsed[id] = Date.now(); save(); checkAchievements(); } }
  function visit(section) {
    if (!state.visited[section]) { state.visited[section] = Date.now(); save(); checkAchievements(); }
  }

  // Достижения
  const tr = (s, n) => s.trainers[n] || { seen: 0, correct: 0, best: 0 };
  const ACH = [
    { id: 'first-lesson', title: 'Первый шаг', desc: 'Пройти первый урок', test: s => doneCount(s) >= 1 },
    { id: 'ten-lessons', title: 'Втянулся', desc: 'Пройти 10 уроков', test: s => doneCount(s) >= 10 },
    { id: 'thirty-lessons', title: 'Марафонец', desc: 'Пройти 30 уроков', test: s => doneCount(s) >= 30 },
    { id: 'all-lessons', title: 'Диплом', desc: 'Пройти все уроки платформы', test: s => doneCount(s) > 0 && doneCount(s) >= MED.allLessons().length },
    { id: 'level-0', title: 'Знаю своё тело', desc: 'Закрыть уровень 0', test: s => levelDone(s, 'l0') },
    { id: 'level-1', title: 'Анатом и физиолог', desc: 'Закрыть уровень 1', test: s => levelDone(s, 'l1') },
    { id: 'level-2', title: 'Патолог', desc: 'Закрыть уровень 2', test: s => levelDone(s, 'l2') },
    { id: 'level-3', title: 'Диагност', desc: 'Закрыть уровень 3', test: s => levelDone(s, 'l3') },
    { id: 'level-4', title: 'Клиницист', desc: 'Закрыть уровень 4', test: s => levelDone(s, 'l4') },
    { id: 'level-5', title: 'Врач', desc: 'Закрыть уровень 5', test: s => levelDone(s, 'l5') },
    { id: 'perfect', title: 'Без единой ошибки', desc: 'Пройти тест урока на 100%', test: s => Object.values(s.lessons).some(l => l.best === 100) },
    { id: 'first-case', title: 'Первый пациент', desc: 'Разобрать клинический случай', test: s => Object.keys(s.cases).length >= 1 },
    { id: 'five-cases', title: 'Ночное дежурство', desc: 'Разобрать 5 клинических случаев', test: s => Object.keys(s.cases).length >= 5 },
    { id: 'all-cases', title: 'Видел всё', desc: 'Разобрать все клинические случаи', test: s => MED.cases.length > 0 && Object.keys(s.cases).length >= MED.cases.length },
    { id: 'case-ace', title: 'Чистая работа', desc: 'Пройти случай на максимальный балл', test: s => Object.values(s.cases).some(c => c.best === c.max) },
    { id: 'sim-1', title: 'Руки помнят', desc: 'Стабилизировать пациента в симуляторе', test: s => Object.values(s.sims).some(x => x.survived) },
    { id: 'sim-all', title: 'Реаниматолог', desc: 'Стабилизировать пациентов во всех сценариях симулятора', test: s => MED.sims.length > 0 && MED.sims.every(x => s.sims[x.id] && s.sims[x.id].survived) },
    { id: 'ecg-25', title: 'Читаю ЭКГ', desc: 'Верно распознать 25 ЭКГ', test: s => tr(s, 'ecg').correct >= 25 },
    { id: 'ecg-run', title: 'Кардиолог', desc: '10 ЭКГ подряд без ошибок', test: s => tr(s, 'ecg').best >= 10 },
    { id: 'labs-15', title: 'Лаборант', desc: 'Верно расшифровать 15 анализов', test: s => tr(s, 'labs').correct >= 15 },
    { id: 'abg-10', title: 'Кислота и щёлочь', desc: 'Верно разобрать 10 газов крови', test: s => tr(s, 'abg').correct >= 10 },
    { id: 'anatomy-30', title: 'Топограф', desc: 'Найти 30 органов на анатомической карте', test: s => tr(s, 'anatomy').correct >= 30 },
    { id: 'terms-20', title: 'Латинист', desc: 'Собрать 20 терминов в конструкторе', test: s => tr(s, 'terms').correct >= 20 },
    { id: 'riddle-10', title: 'Доктор Хаус', desc: 'Разгадать 10 диагнозов по подсказкам', test: s => tr(s, 'riddles').correct >= 10 },
    { id: 'myths-30', title: 'Разрушитель мифов', desc: 'Верно оценить 30 утверждений в игре «Миф или факт»', test: s => tr(s, 'myths').correct >= 30 },
    { id: 'triage-run', title: 'Старший смены', desc: '5 пациентов подряд точно отсортировать в приёмном', test: s => tr(s, 'triage').best >= 5 },
    { id: 'pairs-50', title: 'Ассоциации', desc: 'Найти 50 пар', test: s => tr(s, 'pairs').correct >= 50 },
    { id: 'cards-50', title: 'Зубрила', desc: 'Изучить 50 карточек', test: s => Object.keys(s.cards).length >= 50 },
    { id: 'cards-master', title: 'Долговременная память', desc: '25 карточек в коробке 4 и выше', test: s => Object.values(s.cards).filter(c => c.box >= 4).length >= 25 },
    { id: 'exam', title: 'Сессия', desc: 'Сдать пробный экзамен', test: s => s.exams.length >= 1 },
    { id: 'exam-90', title: 'Красный диплом', desc: 'Набрать 90% на экзамене из 20+ вопросов', test: s => s.exams.some(e => e.total >= 20 && e.score / e.total >= 0.9) },
    { id: 'daily-1', title: 'Разминка', desc: 'Выполнить вызов дня', test: s => Object.keys(s.daily).length >= 1 },
    { id: 'daily-7', title: 'Привычка', desc: 'Выполнить 7 вызовов дня', test: s => Object.keys(s.daily).length >= 7 },
    { id: 'streak-7', title: 'Неделя без пропусков', desc: 'Заниматься 7 дней подряд', test: () => streak() >= 7 },
    { id: 'calcs', title: 'Считаю в уме и на калькуляторе', desc: 'Попробовать 5 разных калькуляторов', test: s => Object.keys(s.calcsUsed).length >= 5 },
    { id: 'explorer', title: 'Исследователь', desc: 'Заглянуть во все справочники', test: s => ['drugs', 'diseases', 'glossary', 'timeline', 'labref', 'mnemonics'].every(k => s.visited[k]) }
  ];
  function doneCount(s) { return Object.values(s.lessons).filter(l => l.done).length; }
  function levelDone(s, id) {
    const lv = MED.levels.find(l => l.id === id);
    return !!lv && lv.lessons.length > 0 && lv.lessons.every(ls => s.lessons[ls.id] && s.lessons[ls.id].done);
  }
  function checkAchievements() {
    let changed = false;
    for (const a of ACH) {
      if (!state.achievements[a.id] && a.test(state)) {
        state.achievements[a.id] = Date.now();
        changed = true;
        MED.ui && MED.ui.toast(`Достижение: ${a.title}`, 'ach');
      }
    }
    if (changed) save();
  }

  function setTheme(t) { state.settings.theme = t; save(); }
  function setTrack(t) { state.settings.track = t; save(); }
  function exportJSON() { return JSON.stringify(state, null, 2); }
  function importJSON(text) {
    const data = JSON.parse(text);
    if (typeof data !== 'object' || data === null || typeof data.xp !== 'number') throw new Error('Это не файл прогресса платформы');
    const d = defaults();
    state = Object.assign(d, data);
    state.trainers = Object.assign(d.trainers, data.trainers);
    state.settings = Object.assign(d.settings, data.settings);
    save();
  }
  function reset() { state = defaults(); save(); }

  load();

  MED.store = {
    get state() { return state; },
    RANKS, ACH, SRS_DAYS,
    today, rank, streak, addXP, completeLesson, finishCase, finishSim,
    card, rateCard, recordTrainer, recordExam, recordDaily, recordAnswer, mistakeQuestions,
    markCalc, visit, checkAchievements, setTheme, setTrack, exportJSON, importJSON, reset,
    doneCount: () => doneCount(state),
    trainer: name => tr(state, name),
    levelProgress(id) {
      const lv = MED.levels.find(l => l.id === id);
      if (!lv) return { done: 0, total: 0, pct: 0 };
      const done = lv.lessons.filter(ls => state.lessons[ls.id] && state.lessons[ls.id].done).length;
      return { done, total: lv.lessons.length, pct: lv.lessons.length ? Math.round(done / lv.lessons.length * 100) : 0 };
    },
    onChange(fn) { listeners.push(fn); }
  };
})();
