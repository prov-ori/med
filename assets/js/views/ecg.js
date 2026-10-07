/* Тренажёр ЭКГ: распознавание ритма, расчёт ЧСС, атлас ритмов. */
(function () {
  const { ICONS, esc, shuffle, question } = MED.ui;
  const S = MED.store;
  const LV = ['', 'Базовый', 'Средний', 'Продвинутый'];

  function tabs(active) {
    return `<div class="toolbar"><div class="seg">
      <a class="seg-a ${active === 'rhythm' ? 'on' : ''}" href="#/ecg">Узнать ритм</a>
      <a class="seg-a ${active === 'rate' ? 'on' : ''}" href="#/ecg/rate">Посчитать ЧСС</a>
      <a class="seg-a ${active === 'atlas' ? 'on' : ''}" href="#/ecg/atlas">Атлас ритмов</a>
    </div></div>`;
  }

  function stripCanvas(id, seed, sec = 6) {
    return `<div class="ecg-wrap"><canvas class="ecg-strip ecg-big" data-ecg="${id}" data-seed="${esc(seed)}" data-sec="${sec}"></canvas></div>`;
  }

  MED.views.ecg = function (el, [mode]) {
    if (mode === 'atlas') return atlas(el);
    if (mode === 'rate') return rate(el);
    let maxLevel = 1, run = 0, seen = 0, right = 0, queue = [];
    el.innerHTML = `
      <div class="page-head">
        <span class="eyebrow">Тренажёр ЭКГ</span>
        <h1>Что на ленте?</h1>
        <p>Отведение II, скорость 25 мм/с: маленькая клетка — 0,04 с, большая — 0,2 с; 10 мм — 1 мВ (прямоугольник в начале ленты). Каждая лента генерируется заново, так что запомнить картинку не получится — только признаки.</p>
      </div>
      ${tabs('rhythm')}
      <div class="toolbar"><div class="seg" id="lv">
        <button type="button" data-l="1" class="on">Базовые ритмы</button>
        <button type="button" data-l="2">+ средние</button>
        <button type="button" data-l="3">Все ${MED.ecg.RHYTHMS.length}</button>
      </div></div>
      <div class="trainer trainer-wide">
        <div class="score-row"><span>Серия: <b id="run">0</b></span><span>Верно: <b id="right">0</b> из <b id="seen">0</b></span><span>Рекорд серии: <b>${S.trainer('ecg').best}</b></span></div>
        <div id="slot"></div>
      </div>`;
    const slot = el.querySelector('#slot');
    const pool = () => MED.ecg.RHYTHMS.filter(r => r.level <= maxLevel);
    function refill() { queue = shuffle(pool()); }
    function next() {
      if (!queue.length) refill();
      const r = queue.pop();
      const p = pool();
      // Дистракторы: сначала похожие по уровню, затем любые
      const others = shuffle(p.filter(x => x.id !== r.id)).slice(0, 3);
      const options = shuffle(others.map(o => o.name).concat(r.name));
      const sec = ['mobitz1', 'mobitz2', 'chb', 'pvc', 'sinus-brady'].includes(r.id) ? 8 : 6;
      slot.innerHTML = '';
      question(slot, {
        q: stripCanvas(r.id, Math.random().toString(36), sec) + '<div style="margin-top:10px">Ваш вывод?</div>',
        options, answer: options.indexOf(r.name),
        explain: `<b>${esc(r.name)}.</b> ${esc(r.key)} ${esc(r.why)} <a href="#/ecg/atlas#r-${r.id}">В атлас →</a>`
      }, {
        noShuffle: true,
        onAnswer(ok) {
          seen++; if (ok) { right++; run++; } else run = 0;
          S.recordTrainer('ecg', ok, run);
          if (ok) S.addXP(5);
          el.querySelector('#run').textContent = run;
          el.querySelector('#right').textContent = right;
          el.querySelector('#seen').textContent = seen;
          addNext(slot, next);
        }
      });
    }
    el.querySelector('#lv').addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      maxLevel = +b.dataset.l; run = 0;
      el.querySelectorAll('#lv button').forEach(x => x.classList.toggle('on', x === b));
      refill(); next();
    });
    refill(); next();
  };

  function addNext(slot, fn) {
    const btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'btn btn-primary'; btn.style.alignSelf = 'flex-start';
    btn.innerHTML = `Следующая лента ${ICONS.arrow}`;
    btn.addEventListener('click', fn);
    slot.querySelector('.q').appendChild(btn);
    btn.focus({ preventScroll: true });
  }

  /* Расчёт ЧСС по регулярной ленте */
  function rate(el) {
    let run = 0;
    el.innerHTML = `
      <div class="page-head">
        <span class="eyebrow">Тренажёр ЭКГ</span>
        <h1>Посчитайте частоту</h1>
        <p>Два способа. Для регулярного ритма: <b>300 ÷ число больших клеток</b> между соседними зубцами R (или 1500 ÷ число маленьких). Для любого ритма: число комплексов QRS на 6-секундной ленте (30 больших клеток) × 10.</p>
      </div>
      ${tabs('rate')}
      <div class="trainer trainer-wide"><div class="score-row"><span>Серия: <b id="run">0</b></span></div><div id="slot"></div></div>`;
    const slot = el.querySelector('#slot');
    const kinds = ['sinus', 'sinus-tachy', 'sinus-brady', 'svt', 'vt', 'paced'];
    function next() {
      const kind = kinds[Math.floor(Math.random() * kinds.length)];
      const big = { 'sinus': [3, 4, 5], 'sinus-tachy': [2, 2.5], 'sinus-brady': [6, 7, 7.5], 'svt': [1.5, 1.7], 'vt': [1.5, 1.8, 2], 'paced': [5, 4.3] }[kind];
      const cells = big[Math.floor(Math.random() * big.length)];
      const hr = Math.round(300 / cells);
      const set = new Set([hr]);
      const opts = [hr];
      [0.62, 0.8, 1.25, 1.5, 0.5, 2].sort(() => Math.random() - 0.5).forEach(k => {
        const v = Math.round(hr * k / 5) * 5;
        if (opts.length < 4 && !set.has(v) && Math.abs(v - hr) > 8 && v > 20) { set.add(v); opts.push(v); }
      });
      const options = shuffle(opts).map(v => v + ' в минуту');
      const seed = Math.random().toString(36);
      slot.innerHTML = '';
      const canvasHtml = `<div class="ecg-wrap"><canvas class="ecg-strip ecg-big" id="rateStrip"></canvas></div>`;
      question(slot, {
        q: canvasHtml + '<div style="margin-top:10px">Какая частота сердечных сокращений?</div>',
        options, answer: options.indexOf(hr + ' в минуту'),
        explain: `Интервал R–R = ${(cells * 0.2).toFixed(2).replace('.', ',')} с, то есть ${String(cells).replace('.', ',')} ${cells % 1 ? 'большой клетки' : MED.ui.plural(cells, 'большая клетка', 'большие клетки', 'больших клеток')} по 0,2 с. 300 ÷ ${String(cells).replace('.', ',')} ≈ <b>${hr}</b> в минуту. Ритм: ${esc(MED.ecg.rhythm(kind).name.toLowerCase())}.`
      }, {
        noShuffle: true,
        onAnswer(ok) {
          run = ok ? run + 1 : 0;
          S.recordTrainer('ecg', ok, run);
          if (ok) S.addXP(4);
          el.querySelector('#run').textContent = run;
          addNext(slot, next);
        }
      });
      const c = slot.querySelector('#rateStrip');
      const strip = MED.ecg.build(kind, { seed, rate: hr, duration: 8 });
      // Для этого режима убираем случайный разброс интервалов: частота должна считаться точно.
      strip.beats.forEach((b, i) => { b.t = strip.beats[0].t + i * 60 / hr; });
      strip.ps.forEach((p, i) => { p.t = strip.beats[0].t - 0.16 + i * 60 / hr; });
      if (kind === 'svt' || kind === 'vt' || kind === 'paced') strip.ps = [];
      const paint = () => MED.ecg.draw(c, strip, { seconds: 6 });
      requestAnimationFrame(paint);
      c._repaint = paint;
    }
    next();
  }

  function atlas(el) {
    el.innerHTML = `
      <div class="page-head">
        <span class="eyebrow">Тренажёр ЭКГ</span>
        <h1>Атлас ритмов</h1>
        <p>${MED.ecg.RHYTHMS.length} ритмов и паттернов, которые нужно узнавать с первого взгляда. Ленты синтезированы: форма зубцов упрощена, но все ключевые признаки сохранены.</p>
      </div>
      ${tabs('atlas')}
      <div class="atlas">${MED.ecg.RHYTHMS.map(r => `
        <article class="card atlas-item" id="r-${r.id}">
          <div class="row" style="justify-content:space-between"><h3>${esc(r.name)}</h3><span class="tag">${LV[r.level]} · ЧСС ${esc(r.rate)}</span></div>
          ${stripCanvas(r.id, 'atlas-' + r.id, ['mobitz1', 'mobitz2', 'chb', 'pvc'].includes(r.id) ? 8 : 6)}
          <p><b>Как узнать.</b> ${esc(r.key)}</p>
          <p class="muted">${esc(r.why)}</p>
        </article>`).join('')}</div>`;
  }
})();
