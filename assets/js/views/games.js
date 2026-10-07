/* Игровые тренажёры: конструктор терминов и «диагноз по подсказкам». */
(function () {
  const { ICONS, esc, shuffle } = MED.ui;
  const S = MED.store;
  const root = id => MED.roots.find(r => r.id === id);

  /* ---------- Конструктор терминов ---------- */
  MED.views.terms = function (el, [tab]) {
    if (tab === 'roots') return rootsTable(el);
    let run = 0, queue = [];
    el.innerHTML = `
      <div class="page-head">
        <span class="eyebrow">Конструктор терминов</span>
        <h1>Соберите слово из корней</h1>
        <p>Большинство медицинских терминов — конструктор из греческих и латинских частей. Выучив около 70 морфем, можно понять тысячи слов, которых вы никогда не видели. Выберите части по порядку: приставка → корень → суффикс.</p>
      </div>
      <div class="toolbar"><div class="seg"><a class="seg-a on" href="#/terms">Конструктор</a><a class="seg-a" href="#/terms/roots">Все корни (${MED.roots.length})</a></div>
        <span class="muted small">Серия: <b id="run">0</b> · рекорд ${S.trainer('terms').best}</span></div>
      <div class="trainer" id="slot"></div>`;
    const slot = el.querySelector('#slot');
    function next() {
      if (!queue.length) queue = shuffle(MED.termTasks);
      const [def, parts, term] = queue.pop();
      const others = shuffle(MED.roots.filter(r => !parts.includes(r.id))).slice(0, Math.max(4, 8 - parts.length));
      const tiles = shuffle(parts.map(root).concat(others));
      let picked = [];
      slot.innerHTML = `
        <div class="card term-task">
          <span class="eyebrow">Определение</span>
          <h2 class="term-def">${esc(def)}</h2>
          <div class="term-build" id="build"><span class="muted">Нажимайте на части ниже…</span></div>
          <div class="term-tiles" id="tiles">${tiles.map(r => `<button type="button" class="tile tile-${r.type}" data-id="${r.id}" title="${esc(r.meaning)}">${esc(r.form)}</button>`).join('')}</div>
          <div class="row"><button type="button" class="btn" id="undo">Убрать последнюю</button><button type="button" class="btn btn-primary" id="ok" disabled>Проверить</button></div>
          <div id="fb"></div>
        </div>`;
      const build = slot.querySelector('#build');
      const okBtn = slot.querySelector('#ok');
      const draw = () => {
        build.innerHTML = picked.length ? picked.map(id => `<span class="tile tile-${root(id).type}">${esc(root(id).form)}</span>`).join('<span class="plus">+</span>') : '<span class="muted">Нажимайте на части ниже…</span>';
        okBtn.disabled = !picked.length;
        slot.querySelectorAll('#tiles .tile').forEach(b => { b.disabled = picked.includes(b.dataset.id); });
      };
      slot.querySelector('#tiles').addEventListener('click', e => {
        const b = e.target.closest('.tile'); if (!b || b.disabled || okBtn.dataset.done) return;
        picked.push(b.dataset.id); draw();
      });
      slot.querySelector('#undo').addEventListener('click', () => { if (okBtn.dataset.done) return; picked.pop(); draw(); });
      okBtn.addEventListener('click', () => {
        okBtn.dataset.done = '1';
        const ok = picked.length === parts.length && picked.every((id, i) => id === parts[i]);
        run = ok ? run + 1 : 0;
        S.recordTrainer('terms', ok, run);
        if (ok) S.addXP(3);
        el.querySelector('#run').textContent = run;
        slot.querySelectorAll('.tile').forEach(b => { b.disabled = true; });
        slot.querySelector('#fb').innerHTML = `
          <div class="q-explain ${ok ? 'ok' : 'bad'}"><b>${ok ? 'Верно:' : 'Правильно:'} ${esc(term)}</b><br>
          ${parts.map(id => `<span class="mono">${esc(root(id).form)}</span> — ${esc(root(id).meaning)}`).join('<br>')}</div>
          <button type="button" class="btn btn-primary" id="nx" style="margin-top:12px">Следующее слово ${ICONS.arrow}</button>`;
        slot.querySelector('#nx').addEventListener('click', next);
        slot.querySelector('#nx').focus({ preventScroll: true });
      });
    }
    next();
  };

  function rootsTable(el) {
    const T = { prefix: 'Приставки', root: 'Корни', suffix: 'Суффиксы' };
    el.innerHTML = `
      <div class="page-head"><span class="eyebrow">Конструктор терминов</span><h1>Корни медицинских терминов</h1>
        <p>Части слов из греческого и латыни. Наведите их на знакомые термины — и незнакомые слова начнут «читаться» сами.</p></div>
      <div class="toolbar"><div class="seg"><a class="seg-a" href="#/terms">Конструктор</a><a class="seg-a on" href="#/terms/roots">Все корни</a></div></div>
      ${Object.keys(T).map(t => `<h2 class="letter">${T[t]}</h2><div class="gloss-list">${MED.roots.filter(r => r.type === t).map(r => `
        <div class="gloss"><h3><span class="mono">${esc(r.form)}</span></h3><p><b>${esc(r.meaning)}</b></p><p class="muted small">${esc(r.example)}</p></div>`).join('')}</div>`).join('')}`;
  }

  /* ---------- Диагноз по подсказкам ---------- */
  MED.views.riddles = function (el) {
    let queue = [], total = 0, solved = 0, run = 0;
    el.innerHTML = `
      <div class="page-head">
        <span class="eyebrow">Диагноз по подсказкам</span>
        <h1>Угадайте как можно раньше</h1>
        <p>Подсказки открываются по одной — от расплывчатых к специфичным, как реальная информация о пациенте. Ответ с первой подсказки — 5 очков, с последней — 1. Неверный ответ стоит очко, но вариант исчезает.</p>
      </div>
      <div class="score-row" style="margin-bottom:14px"><span>Очки за сессию: <b id="pts">0</b></span><span>Разгадано: <b id="sv">0</b></span></div>
      <div class="trainer" id="slot"></div>`;
    const slot = el.querySelector('#slot');
    function next() {
      if (!queue.length) queue = shuffle(MED.riddles);
      const r = queue.pop();
      const options = shuffle(r.options.concat(r.answer));
      let shown = 1, lost = 0, done = false;
      slot.innerHTML = `
        <div class="card riddle">
          <div class="row" style="justify-content:space-between"><span class="eyebrow">${esc(r.area)}</span><span class="tag" id="worth"></span></div>
          <ol class="clues" id="clues"></ol>
          <div class="row"><button type="button" class="btn" id="more">${ICONS.magnifier}Следующая подсказка</button></div>
          <div class="riddle-opts" id="opts">${options.map(o => `<button type="button" class="opt" data-o="${esc(o)}"><span class="opt-mark"></span><span>${esc(o)}</span></button>`).join('')}</div>
          <div id="fb"></div>
        </div>`;
      const clues = slot.querySelector('#clues');
      const worth = () => Math.max(0, 6 - shown - lost);
      function drawClues() {
        clues.innerHTML = r.clues.slice(0, shown).map((c, i) => `<li class="${i === shown - 1 ? 'new' : ''}">${c}</li>`).join('');
        slot.querySelector('#more').disabled = shown >= r.clues.length || done;
        slot.querySelector('#worth').textContent = done ? '' : `сейчас стоит ${worth()} ${MED.ui.plural(worth(), 'очко', 'очка', 'очков')}`;
        MED.ui.bindTerms(clues);
      }
      slot.querySelector('#more').addEventListener('click', () => { if (shown < r.clues.length) { shown++; drawClues(); } });
      slot.querySelector('#opts').addEventListener('click', e => {
        const b = e.target.closest('.opt'); if (!b || done || b.disabled) return;
        if (b.dataset.o === r.answer) {
          done = true;
          const pts = worth();
          total += pts; solved++; run++;
          S.recordTrainer('riddles', true, run);
          S.addXP(2 + pts * 2);
          b.classList.add('is-correct');
          finish(true, pts);
        } else {
          b.classList.add('is-wrong'); b.disabled = true; lost++;
          run = 0;
          if (shown < r.clues.length) { shown++; drawClues(); }
          if (worth() <= 0) { done = true; S.recordTrainer('riddles', false, 0); finish(false, 0); }
          else drawClues();
        }
      });
      function finish(ok, pts) {
        shown = r.clues.length; drawClues();
        slot.querySelectorAll('.opt').forEach(x => { x.disabled = true; if (x.dataset.o === r.answer) x.classList.add('is-correct'); });
        el.querySelector('#pts').textContent = total;
        el.querySelector('#sv').textContent = solved;
        const d = r.disease && MED.diseases.find(x => x.id === r.disease);
        slot.querySelector('#fb').innerHTML = `<div class="q-explain ${ok ? 'ok' : 'bad'}"><b>${ok ? `+${pts} · ${esc(r.answer)}` : `Ответ: ${esc(r.answer)}`}.</b> ${r.explain}${d ? ` <a href="#/disease/${d.id}">Подробнее о болезни →</a>` : ''}</div>
          <button type="button" class="btn btn-primary" id="nx" style="margin-top:12px">Следующая загадка ${ICONS.arrow}</button>`;
        MED.ui.bindTerms(slot.querySelector('#fb'));
        slot.querySelector('#nx').addEventListener('click', next);
      }
      drawClues();
    }
    next();
  };
})();
