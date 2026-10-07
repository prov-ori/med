/* Лаборатория: тренажёр «расшифруйте анализ», генератор задач по газам крови, справочник норм. */
(function () {
  const { ICONS, esc, shuffle, question, plural } = MED.ui;
  const S = MED.store;
  const lab = id => MED.labs.find(l => l.id === id);
  const num = v => String(v).replace('.', ',');

  function flag(l, v, override) {
    if (override !== undefined) return override;
    if (l.lo != null && v < l.lo) return 'L';
    if (l.hi != null && v > l.hi) return 'H';
    return '';
  }

  /* ---------- Расшифровка анализов ---------- */
  MED.views.labs = function (el) {
    let maxLevel = 3, run = 0, queue = [];
    el.innerHTML = `
      <div class="page-head">
        <span class="eyebrow">Расшифровка анализов</span>
        <h1>Что не так в этом бланке?</h1>
        <p>Два шага. Сначала отметьте показатели, которые выходят за пределы нормы, — так, как это делает врач, прежде чем думать о диагнозе. Затем ответьте на клинический вопрос. Нормы — в <a href="#/labref">справочнике</a>.</p>
      </div>
      <div class="toolbar"><div class="seg" id="lv">
        <button type="button" data-l="1">Базовые</button>
        <button type="button" data-l="2">+ средние</button>
        <button type="button" data-l="3" class="on">Все ${MED.labCases.length}</button>
      </div><span class="muted small">Серия: <b id="run">0</b> · рекорд ${S.trainer('labs').best}</span></div>
      <div class="trainer trainer-wide" id="slot"></div>`;
    const slot = el.querySelector('#slot');
    function refill() { queue = shuffle(MED.labCases.filter(c => c.level <= maxLevel)); }
    function next() {
      if (!queue.length) refill();
      show(queue.pop());
    }
    function show(c) {
      const rows = c.panel.map(([id, v, f]) => { const l = lab(id); return { l, v, f: flag(l, v, f) }; });
      slot.innerHTML = `
        <div class="card lab-sheet">
          <div class="lab-ctx"><span class="eyebrow">Пациент</span><p>${esc(c.context)}</p></div>
          <div class="table-wrap"><table class="lab-table"><thead><tr><th>Показатель</th><th>Результат</th><th>Ед.</th><th class="ref">Норма</th><th class="mark-col">Отклонение?</th></tr></thead>
          <tbody>${rows.map((r, i) => `<tr data-i="${i}" class="lab-row" tabindex="0" role="button" aria-pressed="false">
            <td>${esc(r.l.name)}</td><td class="mono"><b>${num(r.v)}</b></td><td class="muted small">${esc(r.l.unit)}</td><td class="ref muted small">${esc(r.l.range)}</td><td class="mark-col"><span class="lab-mark"></span></td></tr>`).join('')}</tbody></table></div>
          <div class="row" id="step1"><button type="button" class="btn btn-primary" id="check">Проверить отметки</button><span class="muted small">Нажмите на строки с отклонениями</span></div>
        </div>
        <div id="step2"></div>`;
      const trs = [...slot.querySelectorAll('.lab-row')];
      const toggle = tr => { if (tr.classList.contains('locked')) return; tr.classList.toggle('picked'); tr.setAttribute('aria-pressed', tr.classList.contains('picked')); };
      trs.forEach(tr => {
        tr.addEventListener('click', () => toggle(tr));
        tr.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(tr); } });
      });
      slot.querySelector('#check').addEventListener('click', () => {
        let hit = 0, miss = 0, extra = 0;
        trs.forEach((tr, i) => {
          const r = rows[i];
          const picked = tr.classList.contains('picked');
          tr.classList.add('locked');
          tr.querySelector('.lab-mark').innerHTML = r.f === 'H' ? '<span class="hi">↑ выше</span>' : r.f === 'L' ? '<span class="lo">↓ ниже</span>' : '<span class="muted">норма</span>';
          if (r.f && picked) { hit++; tr.classList.add('ok'); }
          else if (r.f && !picked) { miss++; tr.classList.add('missed'); }
          else if (!r.f && picked) { extra++; tr.classList.add('wrong'); }
        });
        const exact = !miss && !extra;
        slot.querySelector('#step1').innerHTML = `<span class="${exact ? 'mark-ok' : 'mark-bad'}">${exact ? 'Все отклонения найдены верно.' : `Найдено ${hit} из ${hit + miss}${extra ? `, лишних отметок: ${extra}` : ''}.`}</span>`;
        if (exact) S.addXP(2);
        question(slot.querySelector('#step2'), { q: c.q, options: c.options, answer: c.answer, explain: c.explain }, {
          onAnswer(ok) {
            run = ok ? run + 1 : 0;
            S.recordTrainer('labs', ok, run);
            if (ok) S.addXP(5);
            el.querySelector('#run').textContent = run;
            const btn = document.createElement('button');
            btn.type = 'button'; btn.className = 'btn btn-primary'; btn.style.alignSelf = 'flex-start';
            btn.innerHTML = `Следующий пациент ${ICONS.arrow}`;
            btn.addEventListener('click', () => { next(); el.scrollIntoView({ block: 'start' }); window.scrollTo(0, 0); });
            slot.querySelector('#step2 .q').appendChild(btn);
          }
        });
      });
    }
    el.querySelector('#lv').addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      maxLevel = +b.dataset.l;
      el.querySelectorAll('#lv button').forEach(x => x.classList.toggle('on', x === b));
      refill(); next();
    });
    refill(); next();
  };

  /* ---------- Газы крови: генератор задач ---------- */
  const R = (a, b) => a + Math.random() * (b - a);
  const TYPES = {
    'mac-hag': { prim: 'mac', ctx: ['Мужчина, 24 года, диабет 1 типа, три дня рвота, глубокое шумное дыхание.', 'Женщина, 70 лет, септический шок, холодные конечности, лактат не измеряли.', 'Мужчина, 45 лет, выпил «технический спирт», видит «как в метель».', 'Мужчина, 30 лет, пролежал сутки после передозировки, мышцы болезненны, мало мочи.'] },
    'mac-nag': { prim: 'mac', ctx: ['Мужчина, 35 лет, неделю профузная водянистая диарея.', 'Женщина, 40 лет, после илеостомии большие потери по стоме.', 'Женщина, 28 лет, синдром Шёгрена, рецидивирующие камни в почках.'] },
    'malk': { prim: 'malk', ctx: ['Мужчина, 42 года, неделю многократная рвота.', 'Женщина, 78 лет, принимает высокие дозы фуросемида, ест мало.', 'Мужчина, 50 лет, резистентная гипертония и гипокалиемия.'] },
    'rac-a': { prim: 'rac', chronic: false, ctx: ['Мужчина, 26 лет, найден без сознания, точечные зрачки, ЧДД 6.', 'Женщина, 60 лет, после операции получила много морфина, сонлива, дышит редко.'] },
    'rac-c': { prim: 'rac', chronic: true, ctx: ['Мужчина, 68 лет, тяжёлая ХОБЛ, 50 пачка-лет, постоянная одышка, в стабильном состоянии на плановом приёме.', 'Женщина, 55 лет, ИМТ 48, дневная сонливость, храп с остановками дыхания.'] },
    'ralk-a': { prim: 'ralk', chronic: false, ctx: ['Студентка, 20 лет, паническая атака перед экзаменом, покалывание вокруг рта.', 'Женщина, 34 года, внезапная одышка через неделю после перелёта, ЧСС 118.', 'Мужчина, 40 лет, сильная боль после травмы, дышит часто.'] },
    'ralk-c': { prim: 'ralk', chronic: true, ctx: ['Альпинист, 30 лет, вторую неделю живёт в базовом лагере на высоте 5000 м.', 'Женщина, 29 лет, третий триместр беременности, плановый анализ.'] }
  };
  const PRIM = { mac: 'Метаболический ацидоз', rac: 'Респираторный ацидоз', malk: 'Метаболический алкалоз', ralk: 'Респираторный алкалоз' };

  function makeABG() {
    for (;;) {
      const key = shuffle(Object.keys(TYPES))[0];
      const T = TYPES[key];
      let hco3, pco2;
      if (T.prim === 'mac') { hco3 = R(7, 17); pco2 = 1.5 * hco3 + 8 + R(-1.5, 1.5); }
      if (T.prim === 'malk') { hco3 = R(31, 40); pco2 = 40 + 0.7 * (hco3 - 24) + R(-1.5, 1.5); }
      if (T.prim === 'rac') { pco2 = R(56, 80); hco3 = 24 + (T.chronic ? 0.38 : 0.1) * (pco2 - 40) + R(-0.6, 0.6); }
      if (T.prim === 'ralk') { pco2 = R(21, 31); hco3 = 24 - (T.chronic ? 0.5 : 0.2) * (40 - pco2) + R(-0.5, 0.5); }
      const ph = 6.1 + Math.log10(hco3 / (0.03 * pco2));
      if (ph >= 7.35 && ph <= 7.45) continue;
      const na = Math.round(R(134, 143));
      const ag = key === 'mac-hag' ? Math.round(R(20, 30)) : Math.round(R(8, 12));
      const cl = Math.round(na - hco3 - ag);
      const po2 = T.prim === 'rac' ? Math.round(R(52, 68)) : key === 'ralk-a' && T.ctx ? Math.round(R(68, 98)) : Math.round(R(82, 98));
      const be = 0.93 * (hco3 - 24.4 + 14.8 * (ph - 7.4));
      return { key, T, ctx: shuffle(T.ctx)[0], ph, pco2, hco3, na, cl, ag, po2, be };
    }
  }

  MED.views.abg = function (el) {
    let run = 0;
    el.innerHTML = `
      <div class="page-head">
        <span class="eyebrow">Газы артериальной крови</span>
        <h1>Разбор за четыре шага</h1>
        <p>Каждая задача рассчитывается заново по уравнению Хендерсона–Хассельбаха с правилами компенсации, так что вариантов бесконечно много. Алгоритм: <b>1)</b> pH — ацидемия или алкалемия; <b>2)</b> что объясняет сдвиг — pCO₂ (респираторный) или HCO₃⁻ (метаболический); <b>3)</b> при метаболическом ацидозе — анионный интервал, при респираторном — острый или хронический; <b>4)</b> адекватна ли компенсация.</p>
      </div>
      <div class="card abg-help">
        <b>Шпаргалка.</b> Норма: pH 7,35–7,45 · pCO₂ 35–45 мм рт. ст. · HCO₃⁻ 22–26 ммоль/л · АИ = Na⁺ − (Cl⁻ + HCO₃⁻) = 8–12.
        Ожидаемый pCO₂ при метаболическом ацидозе (Винтерс): 1,5 × HCO₃⁻ + 8 ± 2. Респираторный ацидоз: HCO₃⁻ растёт на 1 на каждые 10 мм рт. ст. pCO₂ (остро) или на 3,5–4 (хронически).
      </div>
      <div class="trainer trainer-wide" style="margin-top:16px"><div class="score-row"><span>Серия: <b id="run">0</b></span><span>Рекорд: <b>${S.trainer('abg').best}</b></span></div><div id="slot"></div></div>`;
    const slot = el.querySelector('#slot');

    function next() {
      const g = makeABG();
      const acid = g.ph < 7.35;
      const expW = 1.5 * g.hco3 + 8;
      const steps = [];
      steps.push({
        q: 'Шаг 1. Что с pH?', options: ['Ацидемия', 'Алкалемия', 'pH в норме'], answer: acid ? 0 : 1,
        explain: `pH ${g.ph.toFixed(2).replace('.', ',')} — ${acid ? 'ниже 7,35: ацидемия' : 'выше 7,45: алкалемия'}.`
      });
      steps.push({
        q: 'Шаг 2. Какое нарушение первично?', options: Object.values(PRIM), answer: Object.keys(PRIM).indexOf(g.T.prim),
        explain: g.T.prim === 'mac' ? `HCO₃⁻ ${num(g.hco3.toFixed(1))} снижен и объясняет ацидемию; pCO₂ снижен компенсаторно.` :
          g.T.prim === 'malk' ? `HCO₃⁻ ${num(g.hco3.toFixed(1))} повышен и объясняет алкалемию; pCO₂ немного повышен — компенсаторная гиповентиляция.` :
          g.T.prim === 'rac' ? `pCO₂ ${Math.round(g.pco2)} повышен и объясняет ацидемию; HCO₃⁻ растёт компенсаторно.` :
          `pCO₂ ${Math.round(g.pco2)} снижен и объясняет алкалемию; HCO₃⁻ снижается компенсаторно.`
      });
      if (g.T.prim === 'mac') {
        steps.push({
          q: 'Шаг 3. Анионный интервал?', options: ['Повышен (> 12): накопление «неизмеряемых» кислот', 'Нормальный: потеря бикарбоната, хлориды высокие'], answer: g.key === 'mac-hag' ? 0 : 1,
          explain: `АИ = ${g.na} − (${g.cl} + ${Math.round(g.hco3)}) = <b>${g.ag}</b>. ${g.key === 'mac-hag' ? 'Повышен: кетоны, лактат, токсичные спирты, уремия (мнемоника КЛУТ или MUDPILES).' : 'Нормальный (гиперхлоремический) ацидоз: диарея, свищи, почечный канальцевый ацидоз, много физраствора.'}`
        });
        steps.push({
          q: `Шаг 4. Ожидаемый pCO₂ по Винтерсу — ${num(expW.toFixed(0))} ± 2. Фактический ${Math.round(g.pco2)}. Вывод?`,
          options: ['Компенсация адекватна', 'Сопутствующий респираторный ацидоз', 'Сопутствующий респираторный алкалоз'], answer: 0,
          explain: 'Фактический pCO₂ укладывается в ожидаемый диапазон — дополнительного респираторного нарушения нет. Если бы pCO₂ был выше — значит, пациент устаёт и не может компенсировать: сигнал к респираторной поддержке.'
        });
      } else if (g.T.prim === 'rac' || g.T.prim === 'ralk') {
        const d = Math.abs(g.pco2 - 40) / 10;
        steps.push({
          q: 'Шаг 3. Острый или хронический процесс?', options: ['Острый (почки ещё не успели компенсировать)', 'Хронический (почечная компенсация за 3–5 дней)'], answer: g.T.chronic ? 1 : 0,
          explain: `pCO₂ отклонился на ${num(d.toFixed(1))} × 10 мм рт. ст. ${g.T.prim === 'rac'
            ? `Остро HCO₃⁻ вырос бы примерно на ${num((d * 1).toFixed(1))}, хронически — на ${num((d * 3.5).toFixed(1))}–${num((d * 4).toFixed(1))}.`
            : `Остро HCO₃⁻ снизился бы примерно на ${num((d * 2).toFixed(1))}, хронически — на ${num((d * 5).toFixed(1))}.`} Фактический HCO₃⁻ ${num(g.hco3.toFixed(1))} → ${g.T.chronic ? 'хронический' : 'острый'} процесс.`
        });
      } else {
        steps.push({
          q: 'Шаг 3. Что поддерживает метаболический алкалоз чаще всего?', options: ['Дефицит объёма, хлоридов и калия', 'Избыток бикарбоната в пище', 'Гипервентиляция', 'Кетоны'], answer: 0,
          explain: 'Почки легко выводят лишний бикарбонат — если только им не мешают дефицит объёма (альдостерон), хлоридов и калия. Поэтому «хлоридчувствительный» алкалоз (рвота, диуретики) лечат физраствором с калием. Если хлорид мочи высокий и есть гипертензия — ищут гиперальдостеронизм.'
        });
      }
      slot.innerHTML = `
        <div class="card abg-print">
          <div class="lab-ctx"><span class="eyebrow">Пациент</span><p>${esc(g.ctx)}</p></div>
          <pre class="abg-out">pH      ${g.ph.toFixed(2)}     (7.35–7.45)
pCO₂    ${String(Math.round(g.pco2)).padEnd(4)}     мм рт. ст. (35–45)   ${(g.pco2 * 0.1333).toFixed(1)} кПа
pO₂     ${String(g.po2).padEnd(4)}     мм рт. ст. (80–100)  на воздухе
HCO₃⁻   ${g.hco3.toFixed(1).padEnd(5)}    ммоль/л (22–26)
BE      ${(g.be > 0 ? '+' : '') + g.be.toFixed(1)}     ммоль/л (−2…+2)
Na⁺     ${g.na}      ммоль/л
Cl⁻     ${g.cl}      ммоль/л</pre>
        </div>
        <div id="steps" style="display:flex;flex-direction:column;gap:14px;margin-top:14px"></div>`;
      const box = slot.querySelector('#steps');
      let i = 0, allOk = true;
      function step() {
        if (i >= steps.length) {
          run = allOk ? run + 1 : 0;
          S.recordTrainer('abg', allOk, run);
          if (allOk) S.addXP(8);
          el.querySelector('#run').textContent = run;
          const diag = g.T.prim === 'mac' ? `Метаболический ацидоз ${g.key === 'mac-hag' ? 'с повышенным' : 'с нормальным'} анионным интервалом` :
            g.T.prim === 'malk' ? 'Метаболический алкалоз' : `${g.T.chronic ? 'Хронический' : 'Острый'} ${PRIM[g.T.prim].toLowerCase()}`;
          const d = document.createElement('div');
          d.className = 'card result';
          d.innerHTML = `<div class="result-body"><span class="eyebrow">${allOk ? 'Всё верно' : 'Есть ошибки'}</span><h3>${diag}, компенсация адекватна</h3></div><button type="button" class="btn btn-primary">Новый анализ ${ICONS.arrow}</button>`;
          d.querySelector('button').addEventListener('click', () => { next(); window.scrollTo(0, 0); });
          box.appendChild(d);
          return;
        }
        question(box, steps[i], { noShuffle: true, onAnswer(ok) { if (!ok) allOk = false; i++; setTimeout(step, 350); } });
      }
      step();
    }
    next();
  };

  /* ---------- Справочник норм ---------- */
  MED.views.labref = function (el) {
    S.visit('labref');
    const cats = [...new Set(MED.labs.map(l => l.cat))];
    el.innerHTML = `
      <div class="page-head">
        <span class="eyebrow">Справочник</span>
        <h1>Нормы анализов и что значат отклонения</h1>
        <p>${MED.labs.length} показателей. Интервалы ориентировочные для взрослых: у каждой лаборатории и метода свои — всегда смотрите на бланк. Нормой считают значения у 95% здоровых людей, поэтому каждый двадцатый здоровый человек выходит за её пределы.</p>
      </div>
      <div class="toolbar"><input class="input" id="q" type="search" placeholder="Фильтр: калий, печень, ТТГ…" aria-label="Фильтр"></div>
      <div id="list"></div>`;
    const list = el.querySelector('#list');
    function draw(q = '') {
      const k = q.trim().toLowerCase();
      list.innerHTML = cats.map(c => {
        const items = MED.labs.filter(l => l.cat === c && (!k || (l.name + ' ' + (l.en || '') + ' ' + (l.aka || '') + ' ' + l.low + ' ' + l.high + ' ' + c).toLowerCase().includes(k)));
        if (!items.length) return '';
        return `<h2 class="letter">${esc(c)}</h2><div class="table-wrap"><table class="labref"><thead><tr><th>Показатель</th><th>Норма</th><th>↑ Повышение</th><th>↓ Снижение</th></tr></thead><tbody>
          ${items.map(l => `<tr id="lab-${l.id}"><td><b>${esc(l.name)}</b><div class="muted small">${esc(l.en || '')}</div></td><td class="mono small">${esc(l.range)}<div class="muted">${esc(l.unit)}</div></td><td class="small">${esc(l.high || '—')}</td><td class="small">${esc(l.low || '—')}</td></tr>`).join('')}
        </tbody></table></div>`;
      }).join('') || '<p class="muted">Ничего не найдено.</p>';
    }
    el.querySelector('#q').addEventListener('input', e => draw(e.target.value));
    draw();
  };
})();
