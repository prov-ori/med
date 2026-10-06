/* Анатомическая карта: схема тела спереди (правая сторона пациента — слева на экране).
   Режим «Изучение» — карточка органа по клику; режим «Найди орган» — по названию, латыни или функции. */
(function () {
  const { ICONS, esc, shuffle } = MED.ui;
  const S = MED.store;

  // Формы органов (viewBox 0 0 360 720). Порядок = порядок отрисовки (снизу вверх).
  const SHAPES = [
    ['aorta', '<path class="tube" d="M200,252 C198,228 176,222 172,240 C170,262 182,290 184,330 L184,470 M184,470 L160,530 M184,470 L208,530"/>', '#d5484c', 7],
    ['pancreas', '<path d="M150,412 C172,402 214,406 252,392 C262,394 262,404 254,410 C224,422 192,422 164,428 C150,430 144,418 150,412 Z"/>', '#e8b26a'],
    ['esophagus', '<path class="tube" d="M181,152 C181,200 186,260 192,310 C196,330 204,342 214,350"/>', '#d9917b', 6],
    ['trachea', '<path d="M175,118 L185,118 L186,198 L204,222 L198,228 L181,206 L164,228 L158,222 L174,198 Z"/>', '#9fb3c8'],
    ['lung-r', '<path d="M166,196 C150,190 116,204 104,236 C94,264 94,300 98,330 C120,318 146,314 166,320 C172,290 174,240 166,196 Z"/>', '#e6a1a6'],
    ['lung-l', '<path d="M196,196 C212,190 246,204 258,236 C268,264 268,300 264,330 C246,320 230,316 222,318 C224,300 214,284 202,276 C200,250 200,220 196,196 Z"/>', '#e6a1a6'],
    ['heart', '<path d="M186,246 C204,232 234,242 238,264 C242,292 218,314 200,326 C186,312 164,296 166,270 C168,256 176,248 186,246 Z"/>', '#d63f4a'],
    ['diaphragm', '<path class="tube" d="M96,338 C120,304 160,310 180,334 C200,310 242,304 266,338"/>', '#b5806c', 5],
    ['liver', '<path d="M94,344 C120,330 196,330 226,346 C222,362 200,370 176,380 C150,394 118,402 100,394 C90,378 88,358 94,344 Z"/>', '#9c4a3c'],
    ['gallbladder', '<path d="M156,378 C164,376 170,384 168,396 C166,406 156,410 150,402 C146,394 148,382 156,378 Z"/>', '#6aa84f'],
    ['stomach', '<path d="M210,346 C240,334 266,346 266,372 C266,400 246,418 222,418 C204,418 194,406 200,392 C212,396 226,390 230,376 C232,362 220,358 208,360 Z"/>', '#e9a47e'],
    ['spleen', '<path d="M268,346 C282,350 286,372 278,392 C272,404 262,400 262,388 C264,374 260,358 268,346 Z"/>', '#7d3e5c'],
    ['small-int', '<path d="M140,470 C150,458 176,462 182,470 C190,458 214,458 222,470 C232,484 220,494 210,494 C224,500 230,516 216,526 C206,534 192,526 186,520 C180,532 158,536 148,524 C138,514 144,500 156,496 C140,492 132,480 140,470 Z"/>', '#efb8a0'],
    ['colon', '<path class="tube" d="M114,540 L110,470 C110,456 120,452 134,454 L232,454 C244,454 252,460 252,474 L252,536 C252,556 236,566 214,566 C200,566 192,574 186,596"/>', '#c98b5a', 16],
    ['appendix', '<path class="tube" d="M114,548 C116,560 122,568 130,572"/>', '#a8704a', 6],
    ['bladder', '<path d="M162,600 C162,586 198,586 198,600 C200,618 188,626 180,626 C172,626 160,618 162,600 Z"/>', '#e7c75a'],
    ['kidneys', '<path d="M118,402 C104,404 98,424 102,442 C106,458 120,464 130,456 C122,446 124,428 132,418 C134,408 128,400 118,402 Z M242,396 C256,398 262,418 258,436 C254,452 240,458 230,450 C238,440 236,422 228,412 C226,402 232,394 242,396 Z"/>', '#c96a5b'],
    ['adrenals', '<path d="M110,404 L120,388 L132,404 Z M228,398 L240,382 L252,398 Z"/>', '#e2a64b'],
    ['thyroid', '<path d="M166,138 C160,140 158,160 166,166 C172,168 176,162 176,156 L184,156 C184,162 188,168 194,166 C202,160 200,140 194,138 C188,136 186,148 184,150 L176,150 C174,148 172,136 166,138 Z"/>', '#cf7d93'],
    ['brain', '<path d="M180,24 C214,22 222,48 218,70 C214,90 196,96 180,94 C164,96 146,90 142,70 C138,48 146,22 180,24 Z"/><path class="sulcus" d="M180,26 L180,92 M150,56 C160,50 168,60 176,54 M184,54 C192,60 200,50 210,56 M150,74 C158,70 166,78 174,72 M186,72 C194,78 202,70 210,74"/>', '#e3a8b8']
  ];

  // Забрюшинные органы рисуем поверх кишечника пунктиром, чтобы их можно было найти.
  const RETRO = ['kidneys', 'adrenals'];

  const BODY = `<path class="body" d="M180,14 C210,14 226,36 226,64 C226,90 214,104 204,110 L206,124 C212,132 222,136 238,140 L272,150 C292,158 300,174 302,196 L312,330 C314,360 316,400 318,432 L304,434 L292,330 L284,236 L280,300 C278,360 276,420 272,470 C268,520 264,560 260,600 L254,720 L192,720 L186,606 L174,606 L168,720 L106,720 L100,600 C96,560 92,520 88,470 C84,420 82,360 80,300 L76,236 L68,330 L56,434 L42,432 C44,400 46,360 48,330 L58,196 C60,174 68,158 88,150 L122,140 C138,136 148,132 154,124 L156,110 C146,104 134,90 134,64 C134,36 150,14 180,14 Z"/>`;

  function svg() {
    return `<svg class="anat" viewBox="0 0 360 720" role="img" aria-label="Схема расположения органов человека, вид спереди">
      ${BODY}
      ${SHAPES.map(([id, d, color, w]) => `<g class="organ${RETRO.includes(id) ? ' retro' : ''}" data-id="${id}" style="--oc:${color}${w ? `;--ow:${w}px` : ''}" tabindex="0" role="button" aria-label="${esc(MED.organs.find(o => o.id === id).name)}">${d}</g>`).join('')}
      <text x="22" y="712" class="anat-side">правая сторона пациента</text><text x="338" y="712" class="anat-side" text-anchor="end">левая</text>
    </svg>`;
  }

  function card(o) {
    const ds = (o.diseases || []).map(id => MED.diseases.find(d => d.id === id)).filter(Boolean);
    return `<span class="eyebrow">${esc(o.sys)}</span>
      <h2>${esc(o.name)}</h2>
      <div class="lat"><span lang="la">${esc(o.lat)}</span> · <span lang="en">${esc(o.en)}</span></div>
      <p>${esc(o.fn)}</p>
      <ul class="facts-list">${o.facts.map(f => `<li>${esc(f)}</li>`).join('')}</ul>
      ${ds.length ? `<div class="tags">${ds.map(d => `<a class="tag tag-accent" href="#/disease/${d.id}">${esc(d.name)}</a>`).join('')}</div>` : ''}`;
  }

  MED.views.anatomy = function (el, [openId]) {
    let mode = 'learn', target = null, run = 0, qkind = 'name';
    el.innerHTML = `
      <div class="page-head">
        <span class="eyebrow">Анатомическая карта</span>
        <h1>Где что лежит</h1>
        <p>Схема туловища спереди. Помните главное правило анатомических рисунков: <b>правая сторона пациента — слева от вас</b>, как у человека, который стоит к вам лицом. Нажмите на орган, чтобы узнать о нём больше, или проверьте себя.</p>
      </div>
      <div class="toolbar"><div class="seg" id="mode">
        <button type="button" data-m="learn" class="on">Изучение</button>
        <button type="button" data-m="name">Найди по названию</button>
        <button type="button" data-m="lat">Найди по латыни</button>
        <button type="button" data-m="fn">Найди по функции</button>
      </div></div>
      <div class="anat-layout">
        <div class="anat-wrap">${svg()}</div>
        <aside class="card anat-card" id="info" aria-live="polite"></aside>
      </div>`;
    const info = el.querySelector('#info');
    const groups = [...el.querySelectorAll('.organ')];

    function learnIntro() {
      info.innerHTML = `<span class="eyebrow">${MED.organs.length} органов</span><h2>Выберите орган</h2><p class="muted">Наведите курсор или нажмите на любой орган на схеме. Почки и надпочечники лежат забрюшинно, позади кишечника; аорта — вдоль позвоночника.</p>
        <div class="tags" style="margin-top:12px">${MED.organs.map(o => `<button type="button" class="tag organ-chip" data-id="${o.id}">${esc(o.name)}</button>`).join('')}</div>`;
      info.querySelectorAll('.organ-chip').forEach(b => b.addEventListener('click', () => select(b.dataset.id)));
    }
    function select(id) {
      const o = MED.organs.find(x => x.id === id);
      groups.forEach(g => g.classList.toggle('sel', g.dataset.id === id));
      info.innerHTML = card(o) + `<button type="button" class="btn" id="back" style="margin-top:14px">${ICONS.back}Все органы</button>`;
      info.querySelector('#back').addEventListener('click', () => { groups.forEach(g => g.classList.remove('sel')); learnIntro(); });
    }
    function ask() {
      groups.forEach(g => g.classList.remove('sel', 'right', 'wrong'));
      const pool = MED.organs.filter(o => o.id !== (target && target.id));
      target = shuffle(pool)[0];
      const prompt = qkind === 'name' ? `Найдите: <b>${esc(target.name)}</b>` : qkind === 'lat' ? `Найдите: <b lang="la">${esc(target.lat)}</b>` : esc(target.ask);
      info.innerHTML = `<span class="eyebrow">Серия: ${run} · рекорд ${S.trainer('anatomy').best}</span><h2 style="font-size:19px;margin-top:6px">${prompt}</h2><p class="muted" style="margin-top:8px">Нажмите на орган на схеме.</p>`;
    }
    function answer(id) {
      const ok = id === target.id;
      run = ok ? run + 1 : 0;
      S.recordTrainer('anatomy', ok, run);
      if (ok) S.addXP(3);
      groups.forEach(g => { if (g.dataset.id === target.id) g.classList.add('right'); if (!ok && g.dataset.id === id) g.classList.add('wrong'); });
      const chosen = MED.organs.find(o => o.id === id);
      info.innerHTML = `<div class="q-explain ${ok ? 'ok' : 'bad'}"><b>${ok ? 'Верно!' : `Это ${esc(chosen.name.toLowerCase())}.`}</b> ${ok ? '' : `Нужный орган подсвечен зелёным.`}</div>
        <div style="margin-top:14px">${card(target)}</div>
        <button type="button" class="btn btn-primary" id="nx" style="margin-top:14px">Следующий ${ICONS.arrow}</button>`;
      target.answered = true;
      info.querySelector('#nx').addEventListener('click', ask);
      info.querySelector('#nx').focus({ preventScroll: true });
    }
    groups.forEach(g => {
      const act = () => {
        if (mode === 'learn') select(g.dataset.id);
        else if (target && !info.querySelector('#nx')) answer(g.dataset.id);
      };
      g.addEventListener('click', act);
      g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); act(); } });
    });
    el.querySelector('#mode').addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      mode = b.dataset.m === 'learn' ? 'learn' : 'quiz';
      qkind = b.dataset.m;
      el.querySelectorAll('#mode button').forEach(x => x.classList.toggle('on', x === b));
      el.querySelector('.anat').classList.toggle('quiz', mode === 'quiz');
      run = 0;
      if (mode === 'learn') { groups.forEach(g => g.classList.remove('sel', 'right', 'wrong')); learnIntro(); } else ask();
    });
    if (openId && MED.organs.some(o => o.id === openId)) select(openId); else learnIntro();
  };
})();
