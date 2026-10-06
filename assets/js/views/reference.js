/* Справочники: болезни, препараты, глоссарий, история медицины, мнемоники. */
(function () {
  const { ICONS, esc } = MED.ui;
  const S = MED.store;
  const list = arr => `<ul>${(arr || []).map(x => `<li>${x}</li>`).join('')}</ul>`;

  /* ---------- Глоссарий ---------- */
  MED.views.glossary = function (el, [focus]) {
    S.visit('glossary');
    const cats = [...new Set(MED.glossary.map(t => t.cat))];
    let cat = 'all', q = '';
    el.innerHTML = `
      <div class="page-head">
        <span class="eyebrow">Глоссарий</span>
        <h1>${MED.glossary.length} медицинских терминов</h1>
        <p>У терминов есть латинский (LA) и английский (EN) эквиваленты: латынь — язык анатомии и рецептов, английский — язык научной литературы. Поиск работает на всех трёх языках. В уроках эти термины подчёркнуты пунктиром.</p>
      </div>
      <div class="toolbar">
        <input class="input" id="gq" type="search" placeholder="Найти термин…" value="">
        <select class="input" id="gc" style="max-width:260px"><option value="all">Все разделы</option>${cats.map(c => `<option>${esc(c)}</option>`).join('')}</select>
      </div>
      <div class="alpha" id="alpha"></div>
      <div id="glist"></div>`;
    const box = el.querySelector('#glist');
    function draw() {
      const items = MED.glossary
        .filter(t => (cat === 'all' || t.cat === cat) && (!q || (t.term + ' ' + (t.aliases || []).join(' ') + ' ' + (t.lat || '') + ' ' + (t.en || '') + ' ' + t.def).toLowerCase().includes(q)))
        .sort((a, b) => a.term.localeCompare(b.term, 'ru'));
      const groups = {};
      items.forEach(t => { const L = t.term[0].toUpperCase(); (groups[L] = groups[L] || []).push(t); });
      const letters = Object.keys(groups);
      el.querySelector('#alpha').innerHTML = letters.map(L => `<a href="#" data-l="${L}">${L}</a>`).join('');
      box.innerHTML = letters.map(L => `<div class="letter" id="L-${L}">${L}</div><div class="gloss-list">${groups[L].map(t => `
        <div class="gloss" id="g-${esc(t.term)}"><h3>${esc(t.term)} <span class="tag">${esc(t.cat)}</span></h3>
        ${t.lat || t.en ? `<div class="gloss-et">${t.lat ? `<span class="lang">LA</span> <span lang="la">${esc(t.lat)}</span>` : ''}${t.en ? ` <span class="lang">EN</span> <span lang="en">${esc(t.en)}</span>` : ''}</div>` : ''}
        ${t.aliases && t.aliases.length ? `<div class="muted small">Также: ${esc(t.aliases.join(', '))}</div>` : ''}
        <p>${t.def}</p></div>`).join('')}</div>`).join('') || '<p class="muted">Ничего не найдено.</p>';
      MED.ui.bindTerms(box);
    }
    el.querySelector('#gq').addEventListener('input', e => { q = e.target.value.trim().toLowerCase(); draw(); });
    el.querySelector('#gc').addEventListener('change', e => { cat = e.target.value; draw(); });
    el.querySelector('#alpha').addEventListener('click', e => {
      const a = e.target.closest('a'); if (!a) return; e.preventDefault();
      document.getElementById('L-' + a.dataset.l).scrollIntoView({ behavior: 'smooth' });
    });
    draw();
    if (focus) {
      const t = MED.term(focus);
      const node = t && document.getElementById('g-' + t.term);
      if (node) { node.classList.add('hl'); setTimeout(() => node.scrollIntoView({ block: 'center' }), 30); }
    }
  };

  /* ---------- Болезни ---------- */
  MED.views.diseases = function (el) {
    S.visit('diseases');
    const areas = [...new Set(MED.diseases.map(d => d.area))];
    let q = '';
    el.innerHTML = `
      <div class="page-head">
        <span class="eyebrow">Справочник болезней</span>
        <h1>${MED.diseases.length} болезней: признаки, диагностика, лечение</h1>
        <p>Краткие клинические карточки с кодами МКБ-10. Сначала — то, что нельзя пропустить («красные флаги»), затем диагностика и принципы лечения. Материал упрощён для обучения.</p>
      </div>
      <div class="toolbar"><input class="input" id="dq" type="search" placeholder="Название, код или система: I21, почки…"></div>
      <div id="dlist"></div>`;
    const box = el.querySelector('#dlist');
    function draw() {
      box.innerHTML = areas.map(a => {
        const items = MED.diseases.filter(d => d.area === a && (!q || (d.name + ' ' + d.icd10 + ' ' + a + ' ' + (d.aka || '') + ' ' + (d.en || '')).toLowerCase().includes(q)));
        if (!items.length) return '';
        return `<section class="section" style="margin-top:22px"><h2 style="margin-bottom:12px;font-size:18px">${esc(a)}</h2><div class="grid">
          ${items.map(d => `<a class="card drug-card" href="#/disease/${d.id}">
            <div class="row" style="gap:6px"><span class="code">${esc(d.icd10)}</span></div>
            <h3>${esc(d.name)}</h3><p>${esc(d.core)}</p></a>`).join('')}
        </div></section>`;
      }).join('') || '<p class="muted">Ничего не найдено.</p>';
    }
    el.querySelector('#dq').addEventListener('input', e => { q = e.target.value.trim().toLowerCase(); draw(); });
    draw();
  };

  MED.views.disease = function (el, [id]) {
    const d = MED.diseases.find(x => x.id === id);
    if (!d) return MED.views.notfound(el);
    const lesson = d.lesson && MED.lesson(d.lesson);
    const organs = MED.organs.filter(o => (o.diseases || []).includes(d.id));
    const cases = MED.cases.filter(c => (c.diseases || []).includes(d.id));
    el.innerHTML = `
      <nav class="crumbs"><a href="#/diseases">Болезни</a><span>/</span><span>${esc(d.area)}</span></nav>
      <div class="page-head">
        <div class="row" style="gap:6px"><span class="code">МКБ-10 ${esc(d.icd10)}</span>${d.en ? `<span class="code">${esc(d.en)}</span>` : ''}</div>
        <h1>${esc(d.name)}</h1>
        <p>${esc(d.core)}</p>
      </div>
      <dl class="facts">
        ${d.cause ? `<dt>Причины и механизм</dt><dd>${d.cause}</dd>` : ''}
        <dt>Клиника</dt><dd>${list(d.symptoms)}</dd>
        ${d.red ? `<dt>Красные флаги</dt><dd class="red-flags">${list(d.red)}</dd>` : ''}
        <dt>Диагностика</dt><dd>${list(d.diagnosis)}</dd>
        <dt>Лечение</dt><dd>${list(d.treatment)}</dd>
        ${d.epi ? `<dt>Эпидемиология</dt><dd>${d.epi}</dd>` : ''}
        ${d.pearl ? `<dt>Жемчужина</dt><dd>${d.pearl}</dd>` : ''}
      </dl>
      <div class="row" style="margin-top:20px">
        ${lesson ? `<a class="btn btn-primary" href="#/lesson/${lesson.id}">${ICONS.book}Урок: ${esc(lesson.title)}</a>` : ''}
        ${organs.map(o => `<a class="btn" href="#/anatomy/${o.id}">${ICONS.body}${esc(o.name)}</a>`).join('')}
        ${cases.map(c => `<a class="btn" href="#/case/${c.id}">${ICONS.case}Случай: ${esc(c.title)}</a>`).join('')}
        <a class="btn" href="#/diseases">${ICONS.back}Все болезни</a>
      </div>`;
  };

  /* ---------- Препараты ---------- */
  MED.views.drugs = function (el) {
    S.visit('drugs');
    const areas = [...new Set(MED.drugs.map(d => d.area))];
    let q = '';
    el.innerHTML = `
      <div class="page-head">
        <span class="eyebrow">Справочник препаратов</span>
        <h1>${MED.drugs.length} препаратов, которые нужно знать</h1>
        <p>Основа — список основных лекарственных средств ВОЗ и препараты неотложной помощи. Международные непатентованные названия, механизм, показания, главные побочные эффекты и «жемчужина» — то, о чём спросят на экзамене и что важно у постели больного. Дозы ориентировочные для взрослых.</p>
      </div>
      <div class="toolbar"><input class="input" id="dq" type="search" placeholder="Название, класс, показание…"></div>
      <div id="dlist"></div>`;
    const box = el.querySelector('#dlist');
    function draw() {
      box.innerHTML = areas.map(a => {
        const items = MED.drugs.filter(d => d.area === a && (!q || (d.name + ' ' + d.class + ' ' + (d.en || '') + ' ' + (d.brands || '') + ' ' + (d.indications || []).join(' ')).toLowerCase().includes(q)));
        if (!items.length) return '';
        return `<section class="section" style="margin-top:22px"><h2 style="margin-bottom:12px;font-size:18px">${esc(a)}</h2><div class="grid">
          ${items.map(d => `<a class="card drug-card" href="#/drug/${d.id}"><h3>${esc(d.name)}</h3><span class="en">${esc(d.en || '')}</span><span class="tag tag-accent">${esc(d.class)}</span><p>${esc(d.pearlShort || '')}</p></a>`).join('')}
        </div></section>`;
      }).join('') || '<p class="muted">Ничего не найдено.</p>';
    }
    el.querySelector('#dq').addEventListener('input', e => { q = e.target.value.trim().toLowerCase(); draw(); });
    draw();
  };

  MED.views.drug = function (el, [id]) {
    const d = MED.drugs.find(x => x.id === id);
    if (!d) return MED.views.notfound(el);
    const lesson = d.lesson && MED.lesson(d.lesson);
    el.innerHTML = `
      <nav class="crumbs"><a href="#/drugs">Препараты</a><span>/</span><span>${esc(d.area)}</span></nav>
      <div class="page-head">
        <span class="tag tag-accent" style="align-self:flex-start">${esc(d.class)}</span>
        <h1>${esc(d.name)}</h1>
        <div class="muted mono small">${esc(d.en || '')}${d.brands ? ' · ' + esc(d.brands) : ''}</div>
      </div>
      <dl class="facts">
        <dt>Механизм</dt><dd>${d.mechanism}</dd>
        <dt>Показания</dt><dd>${list(d.indications)}</dd>
        ${d.dose ? `<dt>Типичная доза</dt><dd>${d.dose}</dd>` : ''}
        <dt>Побочные эффекты</dt><dd>${list(d.side)}</dd>
        ${d.contra ? `<dt>Противопоказания и осторожность</dt><dd>${list(d.contra)}</dd>` : ''}
        <dt>Главное</dt><dd>${d.pearl}</dd>
      </dl>
      <div class="row" style="margin-top:20px">
        ${lesson ? `<a class="btn btn-primary" href="#/lesson/${lesson.id}">${ICONS.book}Урок: ${esc(lesson.title)}</a>` : ''}
        <a class="btn" href="#/drugs">${ICONS.back}Все препараты</a>
      </div>`;
  };

  /* ---------- История ---------- */
  MED.views.timeline = function (el) {
    S.visit('timeline');
    el.innerHTML = `
      <div class="page-head">
        <span class="eyebrow">История медицины</span>
        <h1>От Гиппократа до мРНК-вакцин</h1>
        <p>${MED.timeline.length} событий, которые изменили то, как мы лечим. Многие открытия были случайными, многие — отвергнуты современниками, а некоторые стоили исследователям жизни.</p>
      </div>
      <div class="timeline">${MED.timeline.map(t => `
        <div class="tl-item"><div class="tl-year">${esc(t.year)}</div><h3>${esc(t.title)}</h3><p>${t.text}</p></div>`).join('')}</div>`;
    MED.ui.bindTerms(el);
  };

  /* ---------- Мнемоники ---------- */
  MED.views.mnemonics = function (el) {
    S.visit('mnemonics');
    el.innerHTML = `
      <div class="page-head">
        <span class="eyebrow">Мнемоники</span>
        <h1>Как запомнить то, что нужно помнить</h1>
        <p>Мнемоники не заменяют понимания, но в три часа ночи на дежурстве помогают ничего не забыть. Все они есть и в карточках.</p>
      </div>
      <div class="grid">${MED.mnemonics.map(m => `
        <div class="card mn"><span class="eyebrow">${esc(m.topic)}</span><div class="mn-key">${esc(m.key)}</div>
        <ul>${m.items.map(i => `<li>${i}</li>`).join('')}</ul></div>`).join('')}</div>`;
  };
})();
