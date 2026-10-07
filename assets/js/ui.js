/* Общие UI-компоненты: иконки, тосты, тест-движок, всплывающие термины. */
(function () {
  const esc = s => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const svg = body => `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
  const ICONS = {
    home: svg('<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>'),
    path: svg('<circle cx="5" cy="18" r="2"/><circle cx="19" cy="6" r="2"/><path d="M7 18h6a4 4 0 0 0 0-8h-2a4 4 0 0 1 0-8h6"/>'),
    case: svg('<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M9 3v3h6V3"/><path d="M8 11h8M8 15h5"/>'),
    eye: svg('<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'),
    cards: svg('<rect x="3" y="6" width="13" height="15" rx="2"/><path d="M8 3h11a2 2 0 0 1 2 2v13"/>'),
    exam: svg('<path d="M9 11l2 2 4-4"/><rect x="4" y="3" width="16" height="18" rx="2"/>'),
    sun: svg('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'),
    moon: svg('<path d="M21 13A9 9 0 1 1 11 3a7 7 0 0 0 10 10z"/>'),
    auto: svg('<circle cx="12" cy="12" r="9"/><path d="M12 3v18" /><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor"/>'),
    book: svg('<path d="M4 4h6a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4z"/><path d="M20 4h-6a3 3 0 0 0-3 3"/><path d="M20 4v14h-7"/>'),
    pill: svg('<rect x="2.5" y="8.5" width="19" height="7" rx="3.5" transform="rotate(-35 12 12)"/><path d="M9.5 8.5l5 7"/>'),
    chart: svg('<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'),
    gauge: svg('<path d="M4 16a8 8 0 1 1 16 0"/><path d="M12 16l4-5"/><circle cx="12" cy="16" r="1.2"/>'),
    abc: svg('<path d="M4 18l4-12 4 12M5.5 14h5"/><path d="M15 6h3a2.5 2.5 0 0 1 0 5h-3zM15 11h3.5a2.5 2.5 0 0 1 0 5H15z"/>'),
    clock: svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
    trophy: svg('<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H4a3 3 0 0 0 4 4M16 6h4a3 3 0 0 1-4 4"/><path d="M12 13v4M8 21h8M9 17h6"/>'),
    gear: svg('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'),
    bolt: svg('<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>'),
    brain: svg('<path d="M9 4a3 3 0 0 0-3 3 3 3 0 0 0-2 5 3 3 0 0 0 2 5 3 3 0 0 0 3 3h1V4z"/><path d="M15 4a3 3 0 0 1 3 3 3 3 0 0 1 2 5 3 3 0 0 1-2 5 3 3 0 0 1-3 3h-1V4z"/>'),
    bulb: svg('<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3z"/>'),
    menu: svg('<path d="M4 6h16M4 12h16M4 18h16"/>'),
    search: svg('<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>'),
    check: svg('<path d="M5 12l5 5 9-10"/>'),
    x: svg('<path d="M6 6l12 12M18 6L6 18"/>'),
    arrow: svg('<path d="M5 12h14M13 6l6 6-6 6"/>'),
    back: svg('<path d="M19 12H5M11 6l-6 6 6 6"/>'),
    lock: svg('<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>'),
    flame: svg('<path d="M12 22a7 7 0 0 0 7-7c0-4-3-6-4-10-2 2-3 4-3 6-1-1-2-2-2-4-2 2-5 5-5 8a7 7 0 0 0 7 7z"/>'),
    shuffle: svg('<path d="M3 7h3c5 0 7 10 12 10h3M3 17h3c2 0 3.5-1.5 4.7-3.5M14 7.5C15 7 16.2 7 18 7h3"/><path d="M18 4l3 3-3 3M18 14l3 3-3 3"/>'),
    alert: svg('<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18v.5"/>'),
    star: svg('<path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z"/>'),
    heart: svg('<path d="M12 20s-7.5-4.6-9.3-9.2C1.4 7.4 3.6 4 7 4c2 0 3.4 1.1 5 3 1.6-1.9 3-3 5-3 3.4 0 5.6 3.4 4.3 6.8C19.5 15.4 12 20 12 20z"/>'),
    ecg: svg('<path d="M2 12h4l2-5 3 11 3-14 2 8h6"/>'),
    monitor: svg('<rect x="2.5" y="4" width="19" height="13" rx="2"/><path d="M5.5 11h3l1.5-3 2 6 1.5-3h5"/><path d="M8 21h8M12 17v4"/>'),
    flask: svg('<path d="M9 3h6M10 3v6L4.5 18.5A2 2 0 0 0 6.2 21h11.6a2 2 0 0 0 1.7-2.5L14 9V3"/><path d="M7 15h10"/>'),
    body: svg('<circle cx="12" cy="4.5" r="2"/><path d="M12 7v7M8 9.5l4-1 4 1M9.5 21l2.5-7 2.5 7"/>'),
    calc: svg('<rect x="5" y="2.5" width="14" height="19" rx="2"/><path d="M8 6.5h8M8.5 11h.01M12 11h.01M15.5 11h.01M8.5 14.5h.01M12 14.5h.01M15.5 14.5h.01M8.5 18h.01M12 18h3.5"/>'),
    puzzle: svg('<path d="M10 3h4v2.5a1.5 1.5 0 0 0 3 0V3h4v7h-2.5a1.5 1.5 0 0 0 0 3H21v8h-7v-2.5a1.5 1.5 0 0 0-3 0V21H3v-8h2.5a1.5 1.5 0 0 0 0-3H3V3h7z"/>'),
    magnifier: svg('<circle cx="10" cy="10" r="6.5"/><path d="M15 15l6 6"/><path d="M7.5 10h5M10 7.5v5"/>'),
    steth: svg('<path d="M5 3v6a5 5 0 0 0 10 0V3"/><path d="M10 14v2a5 5 0 0 0 10 0v-2"/><circle cx="20" cy="12" r="2"/>'),
    drop: svg('<path d="M12 3c-1 4-6 6-6 11a6 6 0 0 0 12 0c0-5-5-7-6-11z"/>'),
    syringe: svg('<path d="M18 2l4 4M20 4l-9.5 9.5M14 4l6 6M7 13l4 4M4.5 15.5l4 4M8.5 11.5l-5 5 4 4 5-5M3.5 20.5L2 22"/>'),
    lungs: svg('<path d="M12 3v8M12 11l-3 2M12 11l3 2"/><path d="M8.5 7C6 7 3 11 3 17c0 2 1 3 2.5 3 2 0 3.5-1.5 3.5-4V8.5"/><path d="M15.5 7C18 7 21 11 21 17c0 2-1 3-2.5 3-2 0-3.5-1.5-3.5-4V8.5"/>')
  };

  function toast(msg, kind) {
    const box = document.getElementById('toasts');
    if (!box) return;
    const t = document.createElement('div');
    t.className = 'toast' + (kind ? ' toast-' + kind : '');
    t.textContent = msg;
    box.appendChild(t);
    setTimeout(() => t.classList.add('out'), 2600);
    setTimeout(() => t.remove(), 3100);
  }

  function shuffle(arr, rnd = Math.random) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  // Детерминированный генератор для «вызова дня»: у всех в один день одинаковый набор.
  function seeded(seedStr) {
    let h = 1779033703 ^ seedStr.length;
    for (let i = 0; i < seedStr.length; i++) {
      h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    return function () {
      h = Math.imul(h ^ (h >>> 16), 2246822507);
      h = Math.imul(h ^ (h >>> 13), 3266489909);
      h ^= h >>> 16;
      return (h >>> 0) / 4294967296;
    };
  }

  function ring(pct, size = 44, label) {
    const r = (size - 6) / 2, c = 2 * Math.PI * r;
    const off = c * (1 - pct / 100);
    return `<svg class="ring" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" role="img" aria-label="${pct}%">
      <circle cx="${size / 2}" cy="${size / 2}" r="${r}" class="ring-bg"/>
      <circle cx="${size / 2}" cy="${size / 2}" r="${r}" class="ring-fg" stroke-dasharray="${c.toFixed(2)}" stroke-dashoffset="${off.toFixed(2)}" transform="rotate(-90 ${size / 2} ${size / 2})"/>
      <text x="50%" y="50%" dominant-baseline="central" text-anchor="middle">${label != null ? label : pct + '%'}</text></svg>`;
  }

  function bar(pct) {
    return `<div class="bar"><span style="width:${Math.max(0, Math.min(100, pct))}%"></span></div>`;
  }

  /* Вопрос теста. q: { q, options[], answer: number | number[], explain, multi? }
     mode 'learn' — сразу показывает разбор; 'exam' — только фиксирует выбор. */
  function question(container, q, opts = {}) {
    const mode = opts.mode || 'learn';
    const multi = Array.isArray(q.answer);
    const correctSet = new Set(multi ? q.answer : [q.answer]);
    const order = opts.noShuffle ? q.options.map((_, i) => i) : shuffle(q.options.map((_, i) => i));
    const root = document.createElement('div');
    root.className = 'q';
    root.innerHTML = `
      ${opts.number ? `<div class="q-num">${opts.number}</div>` : ''}
      <div class="q-text">${q.q}</div>
      ${multi ? '<div class="q-hint">Выберите все верные варианты</div>' : ''}
      <div class="q-opts">${order.map(i => `
        <button type="button" class="opt" data-i="${i}">
          <span class="opt-mark" aria-hidden="true"></span><span>${q.options[i]}</span>
        </button>`).join('')}</div>
      ${multi ? '<button type="button" class="btn btn-primary q-submit" disabled>Ответить</button>' : ''}
      <div class="q-explain" hidden></div>`;
    container.appendChild(root);
    paintECG(root);

    const chosen = new Set();
    let locked = false;
    const buttons = [...root.querySelectorAll('.opt')];
    const submitBtn = root.querySelector('.q-submit');

    function finish() {
      locked = true;
      const ok = chosen.size === correctSet.size && [...chosen].every(i => correctSet.has(i));
      buttons.forEach(b => {
        const i = +b.dataset.i;
        b.disabled = true;
        if (mode === 'learn') {
          if (correctSet.has(i)) b.classList.add('is-correct');
          else if (chosen.has(i)) b.classList.add('is-wrong');
        }
      });
      if (submitBtn) submitBtn.hidden = true;
      if (mode === 'learn') {
        const ex = root.querySelector('.q-explain');
        ex.hidden = false;
        ex.className = 'q-explain ' + (ok ? 'ok' : 'bad');
        ex.innerHTML = `<b>${ok ? 'Верно.' : 'Неверно.'}</b> ${q.explain || ''}`;
        bindTerms(ex);
      }
      opts.onAnswer && opts.onAnswer(ok, [...chosen]);
    }

    buttons.forEach(b => b.addEventListener('click', () => {
      if (locked) return;
      const i = +b.dataset.i;
      if (multi) {
        if (chosen.has(i)) { chosen.delete(i); b.classList.remove('is-chosen'); }
        else { chosen.add(i); b.classList.add('is-chosen'); }
        submitBtn.disabled = chosen.size === 0;
      } else {
        chosen.add(i);
        b.classList.add('is-chosen');
        finish();
      }
    }));
    if (submitBtn) submitBtn.addEventListener('click', finish);
    bindTerms(root);
    return root;
  }

  /* Ленты ЭКГ в тексте: <canvas class="ecg-strip" data-ecg="af" data-seed="..."></canvas> */
  function paintECG(root) {
    root.querySelectorAll('canvas[data-ecg]').forEach(c => {
      if (!MED.ecg) return;
      const strip = MED.ecg.build(c.dataset.ecg, { seed: c.dataset.seed || c.dataset.ecg, duration: +(c.dataset.sec || 6) + 1 });
      const paint = () => MED.ecg.draw(c, strip, { seconds: +(c.dataset.sec || 6) });
      requestAnimationFrame(paint);
      c._repaint = paint;
    });
  }
  document.addEventListener('med:theme', () => document.querySelectorAll('canvas[data-ecg]').forEach(c => c._repaint && c._repaint()));

  /* Термины глоссария в тексте: <span class="t">галлюцинация</span>
     или <span class="t" data-t="ключ">форма слова</span>. */
  function bindTerms(root) {
    root.querySelectorAll('.t').forEach(el => {
      if (el.dataset.bound) return;
      el.dataset.bound = '1';
      const key = el.dataset.t || el.textContent;
      const term = MED.term(key);
      if (!term) { el.classList.add('t-missing'); return; }
      el.tabIndex = 0;
      el.setAttribute('role', 'button');
      const show = e => { e.stopPropagation(); showTerm(el, term); };
      el.addEventListener('click', show);
      el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); show(e); } });
    });
  }
  function showTerm(anchor, term) {
    const pop = document.getElementById('termPop');
    pop.innerHTML = `<div class="pop-term">${esc(term.term)}</div>${term.lat || term.en ? `<div class="pop-et">${term.lat ? `<span lang="la">${esc(term.lat)}</span>` : ''}${term.lat && term.en ? ' · ' : ''}${term.en ? `<span lang="en">${esc(term.en)}</span>` : ''}</div>` : ''}<div class="pop-def">${term.def}</div>
      <a class="pop-link" href="#/glossary/${encodeURIComponent(term.term)}">Открыть в глоссарии</a>`;
    pop.hidden = false;
    const r = anchor.getBoundingClientRect();
    const w = Math.min(340, window.innerWidth - 32);
    pop.style.width = w + 'px';
    let left = r.left + window.scrollX;
    left = Math.max(16, Math.min(left, window.scrollX + window.innerWidth - w - 16));
    pop.style.left = left + 'px';
    pop.style.top = (r.bottom + window.scrollY + 8) + 'px';
  }
  document.addEventListener('click', e => {
    const pop = document.getElementById('termPop');
    if (pop && !pop.hidden && !pop.contains(e.target)) pop.hidden = true;
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { const pop = document.getElementById('termPop'); if (pop) pop.hidden = true; }
  });

  /* Подтверждение внутри страницы (без window.confirm). */
  function confirmInline(button, text, onYes) {
    const holder = document.createElement('div');
    holder.className = 'confirm-inline';
    holder.innerHTML = `<span>${esc(text)}</span>
      <button type="button" class="btn btn-danger">Да</button>
      <button type="button" class="btn">Отмена</button>`;
    button.hidden = true;
    button.after(holder);
    const [yes, no] = holder.querySelectorAll('button');
    yes.addEventListener('click', () => { holder.remove(); button.hidden = false; onYes(); });
    no.addEventListener('click', () => { holder.remove(); button.hidden = false; });
  }

  function plural(n, one, few, many) {
    const m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return one;
    if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
    return many;
  }

  MED.ui = { esc, ICONS, toast, shuffle, seeded, ring, bar, question, bindTerms, paintECG, confirmInline, plural };
})();
