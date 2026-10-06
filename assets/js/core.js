/* Общее пространство имён. Файлы data/*.js наполняют его контентом,
   assets/js/*.js — логикой. Порядок подключения задан в index.html. */
window.MED = {
  levels: [],      // уровни пути обучения с уроками
  glossary: [],    // термины
  drugs: [],       // препараты
  diseases: [],    // справочник болезней
  cases: [],       // клинические случаи
  labs: [],        // лабораторные показатели и нормы
  labCases: [],    // задачи «расшифруйте анализ»
  organs: [],      // интерактивная анатомия
  roots: [],       // греко-латинские корни для конструктора терминов
  riddles: [],     // «диагноз по подсказкам»
  sims: [],        // сценарии симулятора реанимации
  timeline: [],    // история медицины
  mnemonics: [],   // мнемоники
  views: {},       // обработчики маршрутов

  addLevel(level) {
    this.levels.push(level);
    this.levels.sort((a, b) => a.num - b.num);
  },
  // Большие уровни разбиты на несколько файлов: следующие части дописывают уроки.
  extendLevel(id, lessons) {
    const level = this.levels.find(l => l.id === id);
    if (!level) throw new Error('Неизвестный уровень ' + id);
    level.lessons.push(...lessons);
  },
  allLessons() {
    return this.levels.flatMap(l => l.lessons.map(ls => Object.assign(ls, { levelId: l.id })));
  },
  lesson(id) {
    return this.allLessons().find(l => l.id === id);
  },
  levelOf(lessonId) {
    return this.levels.find(l => l.lessons.some(ls => ls.id === lessonId));
  },
  levelBadge(lv) { return lv.badge || String(lv.num); },
  levelName(lv) { return lv.kind || ('Уровень ' + lv.num); },
  term(key) {
    const k = String(key).toLowerCase();
    return this.glossary.find(t => t.term.toLowerCase() === k || (t.aliases || []).some(a => a.toLowerCase() === k));
  }
};
