/* Короткие игры: «Миф или факт», «Сортировка в приёмном», «Пары». Данные — data/games.js. */
(function () {
  const { ICONS, esc, shuffle, plural } = MED.ui;
  const S = MED.store;
  const alive = node => document.body.contains(node);

  /* ---------- Миф или факт ---------- */
  const MYTH_LEVELS = [
    { id: 'all', label: 'Все' },
    { id: '0', label: 'Для всех' },
    { id: '1', label: 'Студент' },
    { id: '2', label: 'Клиницист' }
  ];
  const ROUND = 10;

  MED.views.myths = function (el, [lvl = 'all']) {
    const pool = MED.myths.filter(m => lvl === 'all' || String(m.level) === lvl);
    el.innerHTML = `
      <div class="page-head">
        <span class="eyebrow">Миф или факт</span>
        <h1>Чему из этого можно верить?</h1>
        <p>Десять утверждений о здоровье и медицине — от того, что говорят на кухне, до того, во что верят в ординаторской. Решите, правда это или нет, и прочитайте разбор. Клавиши: ← миф, → факт.</p>
      </div>
      <div class="toolbar"><div class="seg">${MYTH_LEVELS.map(l => `<a class="seg-a ${l.id === lvl ? 'on' : ''}" href="#/myths/${l.id}">${l.label}</a>`).join('')}</div>
        <span class="muted small">Рекорд серии: ${S.trainer('myths').best}</span></div>
      <div class="trainer" id="slot"></div>`;
    const slot = el.querySelector('#slot');
    if (!pool.length) { slot.innerHTML = '<p class="muted">Здесь пока пусто.</p>'; return; }
    let deck = [], i = 0, right = 0, run = 0, answered = false;
    const wrong = [];

    function round() {
      deck = shuffle(pool).slice(0, Math.min(ROUND, pool.length));
      i = 0; right = 0; wrong.length = 0;
      show();
    }
    function show() {
      if (i >= deck.length) return finish();
      const m = deck[i];
      answered = false;
      slot.innerHTML = `
        <div class="card myth">
          <div class="row" style="justify-content:space-between"><span class="eyebrow">Утверждение ${i + 1} из ${deck.length}</span><span class="muted small">Верно: ${right}</span></div>
          <p class="myth-text">${esc(m.text)}</p>
          <div class="myth-btns">
            <button type="button" class="btn myth-btn myth-no" data-v="0">${ICONS.x}Миф</button>
            <button type="button" class="btn myth-btn myth-yes" data-v="1">${ICONS.check}Факт</button>
          </div>
          <div id="fb"></div>
        </div>`;
      slot.querySelectorAll('.myth-btn').forEach(b => b.addEventListener('click', () => answer(b.dataset.v === '1')));
    }
    function answer(said) {
      if (answered) return;
      answered = true;
      const m = deck[i];
      const ok = said === m.truth;
      if (ok) right++; else wrong.push(m);
      run = ok ? run + 1 : 0;
      S.recordTrainer('myths', ok, run);
      if (ok) S.addXP(2);
      slot.querySelectorAll('.myth-btn').forEach(b => {
        b.disabled = true;
        if ((b.dataset.v === '1') === m.truth) b.classList.add('is-correct');
        else if ((b.dataset.v === '1') === said) b.classList.add('is-wrong');
      });
      slot.querySelector('#fb').innerHTML = `
        <div class="q-explain ${ok ? 'ok' : 'bad'}"><b>${m.truth ? 'Факт.' : 'Миф.'}</b> ${m.explain}</div>
        <button type="button" class="btn btn-primary" id="nx" style="margin-top:12px">${i + 1 < deck.length ? 'Дальше' : 'Итог'} ${ICONS.arrow}</button>`;
      MED.ui.bindTerms(slot.querySelector('#fb'));
      const nx = slot.querySelector('#nx');
      nx.addEventListener('click', () => { i++; show(); });
      nx.focus({ preventScroll: true });
    }
    function finish() {
      const pct = Math.round(100 * right / deck.length);
      slot.innerHTML = `
        <div class="card result">
          ${MED.ui.ring(pct, 72)}
          <div class="result-body"><span class="eyebrow">Раунд окончен</span><h2>${right} из ${deck.length}</h2>
            <p class="muted">${pct === 100 ? 'Ни одного мифа не пропустили.' : pct >= 70 ? 'Хороший критический взгляд.' : 'Мифы живучи — поэтому их и разбирают.'}</p></div>
        </div>
        ${wrong.length ? `<h3 style="margin:18px 0 8px">Где ошиблись</h3><div class="myth-review">${wrong.map(m => `<div class="card"><p><b>${esc(m.text)}</b></p><p class="muted">${m.truth ? 'Факт' : 'Миф'}. ${m.explain}</p></div>`).join('')}</div>` : ''}
        <div class="row" style="margin-top:16px"><button type="button" class="btn btn-primary" id="again">Ещё раунд</button></div>`;
      slot.querySelector('#again').addEventListener('click', round);
    }
    const onKey = e => {
      if (!alive(slot)) { document.removeEventListener('keydown', onKey); return; }
      if (answered || e.ctrlKey || e.metaKey || /INPUT|TEXTAREA/.test(document.activeElement.tagName)) return;
      if (e.key === 'ArrowLeft') answer(false);
      if (e.key === 'ArrowRight') answer(true);
    };
    document.addEventListener('keydown', onKey);
    round();
  };

  /* ---------- Сортировка в приёмном ---------- */
  const TRIAGE = [
    { n: 1, name: 'Немедленно', sub: 'реанимация', cls: 'tr-1' },
    { n: 2, name: 'Очень срочно', sub: '≤ 10 мин', cls: 'tr-2' },
    { n: 3, name: 'Срочно', sub: '≤ 60 мин', cls: 'tr-3' },
    { n: 4, name: 'Стандартно', sub: '≤ 2 ч', cls: 'tr-4' },
    { n: 5, name: 'Не срочно', sub: '≤ 4 ч', cls: 'tr-5' }
  ];
  const SHIFT = 8;

  MED.views.triage = function (el) {
    el.innerHTML = `
      <div class="page-head">
        <span class="eyebrow">Сортировка в приёмном</span>
        <h1>Кого смотреть первым?</h1>
        <p>Смена в приёмном отделении: ${SHIFT} пациентов, у каждого — жалоба и витальные показатели. Присвойте категорию срочности по пятиуровневой шкале (как в ESI и Манчестерской системе). Точное попадание — 3 очка, соседняя категория — 1. Недооценить тяжёлого пациента опаснее, чем переоценить лёгкого.</p>
      </div>
      <div class="trainer trainer-wide" id="slot"></div>`;
    const slot = el.querySelector('#slot');
    if (!MED.triage.length) { slot.innerHTML = '<p class="muted">Здесь пока пусто.</p>'; return; }
    let deck, i, pts, under, over, run = 0;

    function shift() {
      deck = shuffle(MED.triage).slice(0, Math.min(SHIFT, MED.triage.length));
      i = 0; pts = 0; under = 0; over = 0;
      show();
    }
    function show() {
      if (i >= deck.length) return finish();
      const p = deck[i];
      slot.innerHTML = `
        <div class="card triage-card">
          <div class="row" style="justify-content:space-between"><span class="eyebrow">Пациент ${i + 1} из ${deck.length}</span><span class="muted small">Очки: ${pts}</span></div>
          <p class="triage-text">${esc(p.text)}</p>
          <div class="triage-vitals mono">${esc(p.vitals)}</div>
          <div class="triage-btns">${TRIAGE.map(t => `<button type="button" class="tr-btn ${t.cls}" data-n="${t.n}"><b>${t.n}</b><span>${t.name}</span><small>${t.sub}</small></button>`).join('')}</div>
          <div id="fb"></div>
        </div>`;
      slot.querySelector('.triage-btns').addEventListener('click', e => {
        const b = e.target.closest('.tr-btn'); if (!b || b.disabled) return;
        answer(+b.dataset.n);
      });
    }
    function answer(n) {
      const p = deck[i];
      const diff = n - p.level;              // > 0 — недооценили срочность
      const got = diff === 0 ? 3 : Math.abs(diff) === 1 ? 1 : 0;
      pts += got;
      if (diff > 0) under++;
      if (diff < 0) over++;
      run = diff === 0 ? run + 1 : 0;
      S.recordTrainer('triage', diff === 0, run);
      S.addXP(got);
      slot.querySelectorAll('.tr-btn').forEach(b => {
        b.disabled = true;
        if (+b.dataset.n === p.level) b.classList.add('is-correct');
        else if (+b.dataset.n === n) b.classList.add('is-wrong');
      });
      const verdict = diff === 0 ? 'Точно.'
        : diff > 0 ? `Недооценка срочности на ${diff} ${plural(diff, 'уровень', 'уровня', 'уровней')}.`
          : `Переоценка на ${-diff} ${plural(-diff, 'уровень', 'уровня', 'уровней')}.`;
      slot.querySelector('#fb').innerHTML = `
        <div class="q-explain ${diff === 0 ? 'ok' : 'bad'}"><b>${verdict} Категория ${p.level} — ${TRIAGE[p.level - 1].name.toLowerCase()}.</b> ${p.explain}</div>
        <button type="button" class="btn btn-primary" id="nx" style="margin-top:12px">${i + 1 < deck.length ? 'Следующий пациент' : 'Итоги смены'} ${ICONS.arrow}</button>`;
      MED.ui.bindTerms(slot.querySelector('#fb'));
      const nx = slot.querySelector('#nx');
      nx.addEventListener('click', () => { i++; show(); });
      nx.focus({ preventScroll: true });
    }
    function finish() {
      const max = deck.length * 3;
      const pct = Math.round(100 * pts / max);
      slot.innerHTML = `
        <div class="card result">
          ${MED.ui.ring(pct, 72)}
          <div class="result-body"><span class="eyebrow">Смена окончена</span><h2>${pts} из ${max} очков</h2>
            <p class="muted">Недооценили срочность: <b>${under}</b> · переоценили: <b>${over}</b>. ${under ? 'Недооценка — главная опасность сортировки: тяжёлый пациент ждёт в коридоре.' : 'Ни один тяжёлый пациент не остался ждать.'}</p></div>
        </div>
        <div class="row" style="margin-top:16px"><button type="button" class="btn btn-primary" id="again">Новая смена</button><a class="btn" href="#/calc/news2">Калькулятор NEWS2</a></div>`;
      slot.querySelector('#again').addEventListener('click', shift);
    }
    shift();
  };

  /* ---------- Пары ---------- */
  const PAIRS_PER_ROUND = 6;

  MED.views.pairs = function (el, [setId]) {
    const set = setId && MED.pairSets.find(s => s.id === setId);
    if (!set) {
      el.innerHTML = `
        <div class="page-head">
          <span class="eyebrow">Пары</span>
          <h1>Соедините то, что связано</h1>
          <p>Яд и антидот, витамин и болезнь его дефицита, микроб и инфекция. Выберите набор: в каждом раунде — ${PAIRS_PER_ROUND} случайных пар. Нажмите на элемент слева, затем на его пару справа.</p>
        </div>
        <div class="grid">${MED.pairSets.map(s => `<a class="card case-card" href="#/pairs/${s.id}">
          <h3>${esc(s.title)}</h3><p>${esc(s.desc)}</p>
          <div class="case-foot"><span class="tag">${s.pairs.length} ${plural(s.pairs.length, 'пара', 'пары', 'пар')}</span></div></a>`).join('')}</div>`;
      return;
    }
    el.innerHTML = `
      <nav class="crumbs"><a href="#/pairs">Пары</a><span>/</span><span>${esc(set.title)}</span></nav>
      <div class="page-head"><h1>${esc(set.title)}</h1><p>${esc(set.desc)}</p></div>
      <div class="trainer trainer-wide" id="slot"></div>`;
    const slot = el.querySelector('#slot');
    let run = 0;

    function round() {
      const pairs = shuffle(set.pairs).slice(0, Math.min(PAIRS_PER_ROUND, set.pairs.length));
      const left = shuffle(pairs.map((p, k) => ({ k, t: p[0] })));
      const right = shuffle(pairs.map((p, k) => ({ k, t: p[1] })));
      let sel = null, found = 0, miss = 0;
      const t0 = Date.now();
      slot.innerHTML = `
        <div class="card">
          <div class="row" style="justify-content:space-between"><span class="eyebrow">${esc(set.left)} → ${esc(set.right)}</span><span class="muted small">Ошибок: <b id="miss">0</b></span></div>
          <div class="pairs">
            <div class="pairs-col">${left.map(x => `<button type="button" class="pair" data-side="l" data-k="${x.k}">${esc(x.t)}</button>`).join('')}</div>
            <div class="pairs-col">${right.map(x => `<button type="button" class="pair" data-side="r" data-k="${x.k}">${esc(x.t)}</button>`).join('')}</div>
          </div>
          <div id="fb"></div>
        </div>`;
      slot.querySelector('.pairs').addEventListener('click', e => {
        const b = e.target.closest('.pair'); if (!b || b.disabled) return;
        if (!sel || sel.dataset.side === b.dataset.side) {
          if (sel) sel.classList.remove('on');
          sel = b; b.classList.add('on');
          return;
        }
        const a = sel; sel = null; a.classList.remove('on');
        if (a.dataset.k === b.dataset.k) {
          [a, b].forEach(x => { x.disabled = true; x.classList.add('is-correct'); });
          found++; run++;
          S.recordTrainer('pairs', true, run);
          S.addXP(1);
          if (found === pairs.length) done();
        } else {
          miss++; run = 0;
          S.recordTrainer('pairs', false, 0);
          slot.querySelector('#miss').textContent = miss;
          [a, b].forEach(x => { x.classList.add('is-wrong'); setTimeout(() => x.classList.remove('is-wrong'), 600); });
        }
      });
      function done() {
        const sec = Math.round((Date.now() - t0) / 1000);
        slot.querySelector('#fb').innerHTML = `
          <div class="q-explain ${miss ? '' : 'ok'}" style="margin-top:14px"><b>${miss ? `Готово: ${miss} ${plural(miss, 'ошибка', 'ошибки', 'ошибок')}` : 'Без ошибок!'}</b> · ${sec} с</div>
          <div class="row" style="margin-top:12px"><button type="button" class="btn btn-primary" id="again">Ещё раунд ${ICONS.arrow}</button><a class="btn" href="#/pairs">Другие наборы</a></div>`;
        slot.querySelector('#again').addEventListener('click', round);
      }
    }
    round();
  };
})();
