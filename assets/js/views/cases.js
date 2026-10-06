/* Клинические случаи: пошаговое ведение пациента с оценкой решений. */
(function () {
  const { ICONS, esc, shuffle, ring } = MED.ui;
  const S = MED.store;
  const DIFF = ['', 'Базовый', 'Средний', 'Сложный'];

  const maxScore = c => c.stages.reduce((s, st) => s + Math.max(...st.options.map(o => o.score)), 0);

  MED.views.cases = function (el) {
    const done = Object.keys(S.state.cases).length;
    let filter = 'all';
    el.innerHTML = `
      <div class="page-head">
        <span class="eyebrow">Клинические случаи</span>
        <h1>Ведите пациента сами</h1>
        <p>Каждый случай — несколько решений в условиях неполной информации. Баллы показывают не «угадал / не угадал», а насколько решение безопасно и обосновано. Разобрано: ${done} из ${MED.cases.length}.</p>
      </div>
      <div class="toolbar"><div class="seg" id="diff">
        <button type="button" data-d="all" class="on">Все</button>
        <button type="button" data-d="1">Базовые</button>
        <button type="button" data-d="2">Средние</button>
        <button type="button" data-d="3">Сложные</button>
        <button type="button" data-d="new">Не пройденные</button>
      </div></div>
      <div class="grid" id="caseGrid"></div>`;
    const grid = el.querySelector('#caseGrid');
    function draw() {
      const list = MED.cases.filter(c => filter === 'all' || (filter === 'new' ? !S.state.cases[c.id] : String(c.difficulty) === filter));
      grid.innerHTML = list.map(c => {
        const rec = S.state.cases[c.id];
        return `<a class="card case-card" href="#/case/${c.id}">
          <div class="row" style="justify-content:space-between">
            <span class="tag">${esc(c.patient.setting)}</span>
            <span class="dots" title="Сложность: ${DIFF[c.difficulty]}">${[1, 2, 3].map(i => `<i class="${i <= c.difficulty ? 'on' : ''}"></i>`).join('')}</span>
          </div>
          <h3>${esc(c.title)}</h3>
          <p>${esc(c.teaser)}</p>
          <div class="case-foot">
            <div class="tags">${(c.tags || []).slice(0, 3).map(t => `<span class="tag tag-accent">${esc(t)}</span>`).join('')}</div>
            ${rec ? `<span class="tag tag-ok">${rec.best}/${rec.max}</span>` : ''}
          </div>
        </a>`;
      }).join('') || '<p class="muted">В этой категории всё пройдено.</p>';
    }
    el.querySelector('#diff').addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      filter = b.dataset.d;
      el.querySelectorAll('#diff button').forEach(x => x.classList.toggle('on', x === b));
      draw();
    });
    draw();
  };

  MED.views.case = function (el, [id]) {
    const c = MED.cases.find(x => x.id === id);
    if (!c) return MED.views.notfound(el);
    const max = maxScore(c);
    let score = 0;

    el.innerHTML = `
      <nav class="crumbs"><a href="#/cases">Клинические случаи</a><span>/</span><span>${esc(c.title)}</span></nav>
      <div class="chart">
        <div class="patient">
          <div class="avatar">${esc(c.patient.name[0])}</div>
          <div class="patient-meta">
            <span class="eyebrow">${esc(c.patient.setting)} · ${DIFF[c.difficulty]} уровень</span>
            <h1 style="font-size:clamp(22px,3vw,30px)">${esc(c.title)}</h1>
            <span class="muted">${esc(c.patient.name)}, ${c.patient.age} ${MED.ui.plural(c.patient.age, 'год', 'года', 'лет')}</span>
          </div>
        </div>
        <div class="stage current">
          <span class="stage-label">Поступление</span>
          <div class="stage-text">${c.intro}</div>
          ${c.vitals ? `<div class="vitals">${c.vitals.map(v => `<span>${esc(v)}</span>`).join('')}</div>` : ''}
        </div>
        <div id="stages" style="display:flex;flex-direction:column;gap:16px"></div>
      </div>`;
    const box = el.querySelector('#stages');

    function stage(i) {
      el.querySelectorAll('.stage').forEach(s => s.classList.remove('current'));
      if (i >= c.stages.length) return finish();
      const st = c.stages[i];
      const wrap = document.createElement('div');
      wrap.className = 'stage current';
      wrap.innerHTML = `
        <span class="stage-label">Шаг ${i + 1} из ${c.stages.length}${st.label ? ' · ' + esc(st.label) : ''}</span>
        ${st.text ? `<div class="stage-text">${st.text}</div>` : ''}
        <div class="q-text">${st.question}</div>
        <div class="q-opts">${shuffle(st.options.map((o, k) => k)).map(k => `
          <button type="button" class="opt" data-k="${k}"><span class="opt-mark" aria-hidden="true"></span><span>${st.options[k].text}</span></button>`).join('')}
        </div>
        <div class="fb"></div>`;
      box.appendChild(wrap);
      MED.ui.bindTerms(wrap);
      const best = Math.max(...st.options.map(o => o.score));
      wrap.querySelectorAll('.opt').forEach(b => b.addEventListener('click', () => {
        const o = st.options[+b.dataset.k];
        score += o.score;
        wrap.querySelectorAll('.opt').forEach(x => {
          x.disabled = true;
          const ox = st.options[+x.dataset.k];
          if (ox.score === best) x.classList.add('is-correct');
        });
        if (o.score !== best) b.classList.add('is-wrong');
        else b.classList.add('is-chosen');
        const cls = o.score === best ? 'good' : o.score > 0 ? 'mid' : 'poor';
        const head = o.score === best ? 'Лучшее решение' : o.score > 0 ? 'Допустимо, но не оптимально' : 'Ошибочное решение';
        const fb = wrap.querySelector('.fb');
        fb.innerHTML = `<div class="choice-fb ${cls}"><b>${head} (+${o.score})</b>${o.feedback}</div>
          <div style="margin-top:12px"><button type="button" class="btn btn-primary">${i + 1 < c.stages.length ? 'Далее' : 'К разбору'} ${ICONS.arrow}</button></div>`;
        MED.ui.bindTerms(fb);
        fb.querySelector('button').addEventListener('click', e => { e.target.closest('div').remove(); stage(i + 1); });
      }));
      wrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function finish() {
      const first = S.finishCase(c.id, score, max);
      const pct = Math.round(score / max * 100);
      const d = document.createElement('div');
      d.className = 'debrief';
      d.innerHTML = `
        <div class="result">
          ${ring(pct, 72)}
          <div class="result-body">
            <span class="eyebrow">Итог: ${score} из ${max}</span>
            <h2>${esc(c.diagnosis)}</h2>
            ${first ? '' : '<span class="muted small">Повторное прохождение: опыт начисляется только за первое.</span>'}
          </div>
        </div>
        <div class="prose">${c.debrief}</div>
        ${c.links && c.links.length ? `<div class="row">${c.links.map(lid => {
          const l = MED.lesson(lid); return l ? `<a class="btn" href="#/lesson/${lid}">${ICONS.book}${esc(l.title)}</a>` : '';
        }).join('')}</div>` : ''}
        <div class="row"><a class="btn btn-primary" href="#/cases">К списку случаев</a><button type="button" class="btn" id="again">Пройти ещё раз</button></div>`;
      box.appendChild(d);
      MED.ui.bindTerms(d);
      d.querySelector('#again').addEventListener('click', () => MED.views.case(el, [id]));
      d.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    stage(0);
    window.scrollTo(0, 0);
  };
})();
