/* Маршрутизация, навигация, тема, глобальный поиск. */
(function () {
  const { ICONS, esc } = MED.ui;
  const S = MED.store;

  const NAV = [
    { group: 'Учёба' },
    { href: '#/', id: 'home', icon: 'home', label: 'Главная' },
    { href: '#/path', id: 'path', icon: 'path', label: 'Путь обучения' },
    { href: '#/cases', id: 'cases', icon: 'case', label: 'Клинические случаи' },
    { group: 'Тренажёры' },
    { href: '#/sim', id: 'sim', icon: 'monitor', label: 'Реанимационный зал' },
    { href: '#/ecg', id: 'ecg', icon: 'ecg', label: 'Тренажёр ЭКГ' },
    { href: '#/labs', id: 'labs', icon: 'flask', label: 'Расшифровка анализов' },
    { href: '#/abg', id: 'abg', icon: 'drop', label: 'Газы крови' },
    { href: '#/anatomy', id: 'anatomy', icon: 'body', label: 'Анатомическая карта' },
    { href: '#/riddles', id: 'riddles', icon: 'magnifier', label: 'Диагноз по подсказкам' },
    { href: '#/terms', id: 'terms', icon: 'puzzle', label: 'Конструктор терминов' },
    { group: 'Повторение' },
    { href: '#/cards', id: 'cards', icon: 'cards', label: 'Карточки' },
    { href: '#/daily', id: 'daily', icon: 'bolt', label: 'Вызов дня' },
    { href: '#/mistakes', id: 'mistakes', icon: 'shuffle', label: 'Работа над ошибками' },
    { href: '#/exam', id: 'exam', icon: 'exam', label: 'Экзамен' },
    { group: 'Справочники' },
    { href: '#/calc', id: 'calc', icon: 'calc', label: 'Калькуляторы' },
    { href: '#/diseases', id: 'diseases', icon: 'steth', label: 'Болезни' },
    { href: '#/drugs', id: 'drugs', icon: 'pill', label: 'Препараты' },
    { href: '#/labref', id: 'labref', icon: 'chart', label: 'Нормы анализов' },
    { href: '#/glossary', id: 'glossary', icon: 'abc', label: 'Глоссарий' },
    { href: '#/mnemonics', id: 'mnemonics', icon: 'bulb', label: 'Мнемоники' },
    { href: '#/timeline', id: 'timeline', icon: 'clock', label: 'История медицины' },
    { group: 'Профиль' },
    { href: '#/achievements', id: 'achievements', icon: 'trophy', label: 'Достижения' },
    { href: '#/settings', id: 'settings', icon: 'gear', label: 'Настройки' }
  ];

  // Какой пункт меню подсветить для вложенных маршрутов.
  const ACTIVE = { lesson: 'path', case: 'cases', drug: 'drugs', disease: 'diseases', simrun: 'sim' };

  function renderNav() {
    document.getElementById('nav').innerHTML = NAV.map(n => n.group
      ? `<div class="nav-group">${n.group}</div>`
      : `<a class="nav-link" data-id="${n.id}" href="${n.href}">${ICONS[n.icon]}<span>${n.label}</span></a>`).join('');
    document.getElementById('menuBtn').innerHTML = ICONS.menu;
    document.getElementById('sideClose').innerHTML = ICONS.x;
    document.getElementById('searchClose').innerHTML = ICONS.x;
    document.querySelector('.search-ico').innerHTML = ICONS.search;
  }

  function renderChip() {
    const r = S.rank();
    const st = S.streak();
    document.getElementById('xpChip').innerHTML = `
      <span class="chip-rank">${r.current.title}</span>
      <span class="chip-xp">${S.state.xp} XP</span>
      ${st ? `<span class="chip-streak" title="Дней подряд">${ICONS.flame}${st}</span>` : ''}`;
  }

  // Тема: system → light → dark → system
  function applyTheme() {
    const t = S.state.settings.theme;
    if (t === 'system') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', t);
    const btn = document.getElementById('themeBtn');
    btn.innerHTML = t === 'dark' ? ICONS.moon : t === 'light' ? ICONS.sun : ICONS.auto;
    btn.title = { system: 'Тема: как в системе', light: 'Тема: светлая', dark: 'Тема: тёмная' }[t];
    document.dispatchEvent(new CustomEvent('med:theme'));
  }
  function cycleTheme() {
    const order = ['system', 'light', 'dark'];
    S.setTheme(order[(order.indexOf(S.state.settings.theme) + 1) % order.length]);
    applyTheme();
  }

  function route() {
    const [hash, anchor] = location.hash.replace(/^#\/?/, '').split('#');
    const [name, ...rest] = hash.split('/');
    const key = name || 'home';
    const params = rest.map(decodeURIComponent);
    const view = document.getElementById('view');
    const handler = MED.views[key] || MED.views.notfound;
    closeMenu();
    document.getElementById('termPop').hidden = true;
    view.innerHTML = '';
    view.className = 'view view-' + key;
    try {
      handler(view, params);
    } catch (err) {
      console.error(err);
      view.innerHTML = `<div class="empty"><h2>Не удалось открыть страницу</h2><p>${esc(err.message)}</p><a class="btn" href="#/">На главную</a></div>`;
    }
    MED.ui.bindTerms(view);
    MED.ui.paintECG(view);
    const active = ACTIVE[key] || key;
    document.querySelectorAll('.nav-link').forEach(a => a.classList.toggle('active', a.dataset.id === active));
    view.focus({ preventScroll: true });
    const target = anchor && document.getElementById(anchor);
    if (target) target.scrollIntoView({ block: 'start' });
    else window.scrollTo(0, 0);
  }

  MED.views.notfound = el => {
    el.innerHTML = `<div class="empty"><h2>Страница не найдена</h2><p>Возможно, ссылка устарела.</p><a class="btn btn-primary" href="#/">На главную</a></div>`;
  };

  // Мобильное меню
  function openMenu() { document.body.classList.add('menu-open'); document.getElementById('scrim').hidden = false; }
  function closeMenu() {
    document.body.classList.remove('menu-open');
    if (document.getElementById('searchModal').hidden) document.getElementById('scrim').hidden = true;
  }

  // Поиск
  let index = null;
  function buildIndex() {
    const items = [];
    MED.levels.forEach(lv => lv.lessons.forEach(l => items.push({
      kind: 'Урок', title: l.title, sub: `${MED.levelName(lv)} · ${l.summary || ''}`, href: '#/lesson/' + l.id,
      text: (l.title + ' ' + (l.summary || '') + ' ' + (l.keyPoints || []).join(' ')).toLowerCase()
    })));
    MED.glossary.forEach(t => items.push({
      kind: 'Термин', title: t.term, sub: strip(t.def).slice(0, 110), href: '#/glossary/' + encodeURIComponent(t.term),
      text: (t.term + ' ' + (t.aliases || []).join(' ') + ' ' + (t.lat || '') + ' ' + (t.en || '') + ' ' + strip(t.def)).toLowerCase()
    }));
    MED.drugs.forEach(d => items.push({
      kind: 'Препарат', title: d.name, sub: d.class, href: '#/drug/' + d.id,
      text: (d.name + ' ' + (d.brands || '') + ' ' + d.class + ' ' + (d.en || '')).toLowerCase()
    }));
    MED.diseases.forEach(d => items.push({
      kind: 'Болезнь', title: d.name, sub: `МКБ-10 ${d.icd10} · ${d.area}`, href: '#/disease/' + d.id,
      codes: String(d.icd10).toLowerCase().split(/[\s/(),–-]+/).filter(Boolean),
      text: (d.name + ' ' + d.icd10 + ' ' + d.area + ' ' + (d.aka || '') + ' ' + (d.en || '')).toLowerCase()
    }));
    MED.cases.forEach(c => items.push({
      kind: 'Случай', title: c.title, sub: c.teaser, href: '#/case/' + c.id,
      text: (c.title + ' ' + c.teaser + ' ' + (c.tags || []).join(' ')).toLowerCase()
    }));
    MED.labs.forEach(l => items.push({
      kind: 'Анализ', title: l.name, sub: `${l.range} ${l.unit}`, href: '#/labref#lab-' + l.id,
      text: (l.name + ' ' + (l.aka || '') + ' ' + (l.en || '')).toLowerCase()
    }));
    MED.ecg.RHYTHMS.forEach(r => items.push({
      kind: 'ЭКГ', title: r.name, sub: r.key, href: '#/ecg/atlas#r-' + r.id, text: (r.name + ' экг ' + r.key).toLowerCase()
    }));
    MED.sims.forEach(x => items.push({
      kind: 'Симулятор', title: x.title, sub: x.teaser, href: '#/simrun/' + x.id, text: (x.title + ' ' + x.teaser).toLowerCase()
    }));
    (MED.calcs || []).forEach(c => items.push({
      kind: 'Калькулятор', title: c.name, sub: c.desc, href: '#/calc/' + c.id, text: (c.name + ' ' + c.desc + ' калькулятор').toLowerCase()
    }));
    MED.organs.forEach(o => items.push({
      kind: 'Анатомия', title: o.name, sub: o.lat, href: '#/anatomy/' + o.id, text: (o.name + ' ' + o.lat + ' ' + (o.en || '')).toLowerCase()
    }));
    return items;
  }
  function strip(html) { return String(html).replace(/<[^>]+>/g, ''); }

  function openSearch() {
    index = index || buildIndex();
    document.getElementById('searchModal').hidden = false;
    document.getElementById('scrim').hidden = false;
    const inp = document.getElementById('searchInput');
    inp.value = '';
    renderResults('');
    setTimeout(() => inp.focus(), 10);
  }
  function closeSearch() {
    document.getElementById('searchModal').hidden = true;
    document.getElementById('scrim').hidden = true;
  }
  function renderResults(q) {
    const box = document.getElementById('searchResults');
    const query = q.trim().toLowerCase();
    if (!query) {
      box.innerHTML = `<div class="search-empty">Например: <i>инфаркт</i>, <i>калий</i>, <i>I21</i>, <i>фибрилляция</i>, <i>печень</i></div>`;
      return;
    }
    const words = query.split(/\s+/);
    const hits = index
      .map(it => {
        if (!words.every(w => it.text.includes(w))) return null;
        const t = it.title.toLowerCase();
        const code = (it.codes || []).some(c => c === query || c.startsWith(query + '.')) ? 90 : 0;
        const score = code + (t === query ? 100 : 0) + (t.startsWith(query) ? 50 : 0) + (t.includes(query) ? 20 : 0) + (it.kind === 'Урок' ? 0 : 2);
        return { it, score };
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score)
      .slice(0, 30);
    box.innerHTML = hits.length
      ? hits.map(({ it }) => `<a class="search-hit" href="${it.href}"><span class="hit-kind">${it.kind}</span><span class="hit-title">${esc(it.title)}</span><span class="hit-sub">${esc(it.sub || '')}</span></a>`).join('')
      : `<div class="search-empty">Ничего не найдено по запросу «${esc(q)}»</div>`;
  }

  function init() {
    renderNav();
    applyTheme();
    renderChip();
    S.onChange(renderChip);
    document.getElementById('themeBtn').addEventListener('click', cycleTheme);
    document.getElementById('menuBtn').addEventListener('click', () =>
      document.body.classList.contains('menu-open') ? closeMenu() : openMenu());
    document.getElementById('scrim').addEventListener('click', () => { closeMenu(); closeSearch(); });
    document.getElementById('searchBtn').addEventListener('click', openSearch);
    document.getElementById('searchClose').addEventListener('click', closeSearch);
    document.getElementById('sideClose').addEventListener('click', closeMenu);
    document.getElementById('searchInput').addEventListener('input', e => renderResults(e.target.value));
    document.getElementById('searchInput').addEventListener('keydown', e => {
      if (e.key === 'Enter') { const first = document.querySelector('.search-hit'); if (first) { location.hash = first.getAttribute('href'); closeSearch(); } }
    });
    document.getElementById('searchResults').addEventListener('click', e => { if (e.target.closest('.search-hit')) closeSearch(); });
    document.addEventListener('keydown', e => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openSearch(); }
      if (e.key === 'Escape') { closeSearch(); closeMenu(); }
    });
    window.addEventListener('hashchange', route);
    route();
    S.checkAchievements();
  }

  MED.app = { route, buildIndex, applyTheme };
  init();
})();
