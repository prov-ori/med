/* Реанимационный зал: сценарии с состоянием пациента, которое меняется в реальном времени.
   Сценарий (data/sims.js) задаёт начальное состояние, действия с длительностью и эффектом,
   функцию ухудшения tick(), критерии стабилизации и смерти, чек-лист для разбора. */
(function () {
  const { ICONS, esc, ring } = MED.ui;
  const S = MED.store;
  const SPEED = 4;          // секунд игрового времени за секунду реального
  const DIFF = ['', 'Базовый', 'Средний', 'Сложный'];
  const PULSELESS = ['vf', 'asystole', 'pvt', 'pea', 'torsades-pl'];

  const mmss = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  const map = st => Math.round((st.sbp + 2 * st.dbp) / 3);

  MED.views.sim = function (el) {
    el.innerHTML = `
      <div class="page-head">
        <span class="eyebrow">Реанимационный зал</span>
        <h1>Пациент ухудшается прямо сейчас</h1>
        <p>Время идёт в ${SPEED} раза быстрее реального, каждое действие занимает время, а состояние пациента меняется от ваших решений. Работайте по ABCDE, не забудьте позвать помощь — команда работает быстрее. В конце — разбор по чек-листу современных рекомендаций.</p>
      </div>
      <div class="grid">${MED.sims.map(x => {
        const rec = S.state.sims[x.id];
        return `<a class="card case-card" href="#/simrun/${x.id}">
          <div class="row" style="justify-content:space-between">
            <span class="tag">${esc(x.place)}</span>
            <span class="dots" title="Сложность: ${DIFF[x.difficulty]}">${[1, 2, 3].map(i => `<i class="${i <= x.difficulty ? 'on' : ''}"></i>`).join('')}</span>
          </div>
          <h3>${esc(x.title)}</h3>
          <p>${esc(x.teaser)}</p>
          <div class="case-foot"><div class="tags">${(x.tags || []).map(t => `<span class="tag tag-accent">${esc(t)}</span>`).join('')}</div>
          ${rec ? `<span class="tag ${rec.survived ? 'tag-ok' : 'tag-bad'}">${rec.survived ? 'спасён · ' + rec.best : 'не спасён'}</span>` : ''}</div>
        </a>`;
      }).join('')}</div>
      <div class="card" style="margin-top:22px;max-width:760px">
        <h3 style="margin-bottom:6px">Как играть</h3>
        <p class="muted">Слева — монитор и журнал. Справа — действия, сгруппированные по ABCDE. Осмотр («A — дыхательные пути», «B — дыхание»…) показывает находки в журнале. Некоторым препаратам нужен венозный доступ. Ни одна кнопка не подписана «правильно» — как и в жизни. Пауза — клавиша P или кнопка над монитором.</p>
      </div>`;
  };

  MED.views.simrun = function (el, [id]) {
    const sc = MED.sims.find(x => x.id === id);
    if (!sc) return MED.views.notfound(el);

    const st = Object.assign({ temp: 36.8, gcs: 15, glucose: 5.5, rhythm: 'sinus' }, JSON.parse(JSON.stringify(sc.init)));
    const sim = {
      t: 0, st, flags: {}, history: [], busy: null, paused: false, over: false, help: false,
      did(aid) { const h = this.history.find(x => x.id === aid); return h ? h.t : undefined; },
      count(aid) { return this.history.filter(x => x.id === aid).length; },
      since(aid) { const hs = this.history.filter(x => x.id === aid); return hs.length ? this.t - hs[hs.length - 1].t : Infinity; },
      log(text, kind) { addLog(text, kind); },
      setRhythm(r) { st.rhythm = r; }
    };

    el.innerHTML = `
      <nav class="crumbs"><a href="#/sim">Реанимационный зал</a><span>/</span><span>${esc(sc.title)}</span></nav>
      <div class="sim">
        <div class="sim-left">
          <div class="sim-intro card"><span class="eyebrow">${esc(sc.place)} · ${DIFF[sc.difficulty]} уровень</span><h1 style="font-size:clamp(20px,2.6vw,26px);margin:4px 0 8px">${esc(sc.title)}</h1><div class="stage-text">${sc.intro}</div></div>
          <div class="mon mon-sim">
            <div class="mon-head"><span id="clock">0:00</span><span><button type="button" class="mon-btn" id="pause">Пауза</button></span></div>
            <canvas id="simMon" aria-label="Монитор пациента"></canvas>
            <div class="mon-vitals">
              <div class="mv mv-hr" id="vHr"><small>ЧСС</small><b></b></div>
              <div class="mv mv-sp" id="vSp"><small>SpO₂ %</small><b></b></div>
              <div class="mv mv-bp" id="vBp"><small>АД (ср.)</small><b></b></div>
              <div class="mv mv-rr" id="vRr"><small>ЧДД</small><b></b></div>
            </div>
            <div class="mon-extra" id="vEx"></div>
          </div>
          <div class="sim-busy" id="busy" hidden><span id="busyText"></span><div class="bar"><span id="busyBar"></span></div></div>
          <div class="sim-log card" id="log" aria-live="polite"></div>
        </div>
        <div class="sim-right" id="actions"></div>
      </div>`;

    const logEl = el.querySelector('#log');
    function addLog(text, kind = 'info') {
      const d = document.createElement('div');
      d.className = 'log-item log-' + kind;
      d.innerHTML = `<span class="log-t">${mmss(sim.t)}</span><span>${text}</span>`;
      logEl.prepend(d);
      MED.ui.bindTerms(d);
    }

    // Монитор
    const canvas = el.querySelector('#simMon');
    let curRhythm = null, curHr = 0;
    const stripFor = () => {
      const strip = MED.ecg.build(st.rhythm === 'pea' ? 'sinus' : st.rhythm === 'pvt' ? 'vt' : st.rhythm, { rate: Math.max(20, st.hr || 60), duration: 1200, seed: Math.random() });
      strip.pulseless = PULSELESS.includes(st.rhythm) || st.cpr;
      return strip;
    };
    const mon = MED.ecg.monitor(canvas, { strip: stripFor() });
    curRhythm = st.rhythm; curHr = st.hr;

    function vitalsView() {
      const pl = PULSELESS.includes(st.rhythm);
      const set = (id, val, alarm) => { const b = el.querySelector(id); b.querySelector('b').textContent = val; b.classList.toggle('alarm', !!alarm); };
      set('#vHr', pl && !st.cpr ? '—' : st.cpr ? 'СЛР' : Math.round(st.hr), pl || st.hr < 45 || st.hr > 130);
      set('#vSp', pl || st.spo2 < 50 ? '—' : Math.round(st.spo2), pl || st.spo2 < 90);
      set('#vBp', pl ? '—' : `${Math.round(st.sbp)}/${Math.round(st.dbp)} (${map(st)})`, pl || st.sbp < 90);
      set('#vRr', pl ? '0' : Math.round(st.rr), pl || st.rr > 24 || st.rr < 9);
      const ex = [];
      if (sim.flags.glucoseKnown) ex.push(`Глюкоза ${st.glucose.toFixed(1)} ммоль/л`);
      if (sim.flags.tempKnown) ex.push(`T ${st.temp.toFixed(1)} °C`);
      if (sim.flags.gcsKnown) ex.push(`ШКГ ${Math.round(st.gcs)}`);
      if (st.lactate != null && sim.flags.lactateKnown) ex.push(`Лактат ${st.lactate.toFixed(1)}`);
      if (st.cpr) ex.push('<b class="pulse-txt">Идут компрессии</b>');
      el.querySelector('#vEx').innerHTML = ex.join(' · ');
      el.querySelector('#clock').textContent = '⏱ ' + mmss(sim.t) + (sim.help ? ' · команда на месте' : '');
    }

    // Действия
    const groups = [];
    sc.actions.forEach(a => { if (!groups.includes(a.group)) groups.push(a.group); });
    function renderActions() {
      const box = el.querySelector('#actions');
      box.innerHTML = groups.map(g => `<div class="act-group"><div class="act-title">${esc(g)}</div><div class="act-list">${
        sc.actions.filter(a => a.group === g && (!a.show || a.show(st, sim))).map(a => {
          const used = sim.count(a.id);
          const off = sim.over || !!sim.busy || (a.max && used >= a.max);
          const label = typeof a.label === 'function' ? a.label(st, sim) : a.label;
          return `<button type="button" class="act" data-a="${a.id}" ${off ? 'disabled' : ''}>${esc(label)}${used && a.max !== 1 ? ` <span class="act-n">×${used}</span>` : ''}${a.max === 1 && used ? ' ✓' : ''}<small>${dur(a)} с</small></button>`;
        }).join('')}</div></div>`).join('');
    }
    const dur = a => Math.round((typeof a.dur === 'function' ? a.dur(st, sim) : a.dur) * (sim.help && !a.solo ? 0.5 : 1));

    el.querySelector('#actions').addEventListener('click', e => {
      const b = e.target.closest('.act'); if (!b || sim.busy || sim.over) return;
      const a = sc.actions.find(x => x.id === b.dataset.a);
      if (a.need === 'iv' && !sim.flags.iv && !sim.flags.io) { addLog('Нет венозного доступа — сначала установите катетер.', 'warn'); return; }
      const d = dur(a);
      sim.busy = { a, left: d, total: d };
      el.querySelector('#busy').hidden = false;
      el.querySelector('#busyText').textContent = (typeof a.label === 'function' ? a.label(st, sim) : a.label) + '…';
      renderActions();
    });

    function complete(a) {
      sim.history.push({ id: a.id, t: sim.t });
      const msg = a.run(st, sim);
      if (msg) addLog(msg, a.kind || (a.harm && a.harm(st, sim) ? 'bad' : 'act'));
      vitalsView();
    }

    // Главный цикл
    let last = 0, raf = 0, stable = 0, lastVitals = 0;
    function loop(ts) {
      if (!document.body.contains(el.querySelector('#simMon'))) return;
      if (!last) last = ts;
      const real = Math.min(0.25, (ts - last) / 1000);
      last = ts;
      if (!sim.paused && !sim.over) {
        const dt = real * SPEED;
        sim.t += dt;
        sc.tick(st, dt, sim);
        clampAll();
        if (sim.busy) {
          sim.busy.left -= dt;
          el.querySelector('#busyBar').style.width = (100 * (1 - Math.max(0, sim.busy.left) / sim.busy.total)) + '%';
          if (sim.busy.left <= 0) {
            const a = sim.busy.a; sim.busy = null;
            el.querySelector('#busy').hidden = true;
            complete(a);
            renderActions();
          }
        }
        // Смена ритма или заметное изменение ЧСС — перестраиваем ленту монитора
        if (st.rhythm !== curRhythm || Math.abs(st.hr - curHr) > Math.max(8, curHr * 0.12) || (st.cpr && !mon.strip.pulseless) || (!st.cpr && mon.strip.pulseless && !PULSELESS.includes(st.rhythm))) {
          curRhythm = st.rhythm; curHr = st.hr;
          mon.set(stripFor());
          renderActions();
        }
        if (sim.t - lastVitals > 2) { lastVitals = sim.t; vitalsView(); }
        if (sc.dead(st, sim)) return end(false);
        if (sc.goal(st, sim)) { stable += dt; if (stable >= (sc.holdFor || 45)) return end(true); } else stable = 0;
        if (sim.t > (sc.limit || 900)) return end(false, 'Время вышло: пациент так и не стабилизирован.');
      }
      raf = requestAnimationFrame(loop);
    }
    function clampAll() {
      st.spo2 = Math.max(0, Math.min(100, st.spo2));
      st.sbp = Math.max(0, Math.min(240, st.sbp));
      st.dbp = Math.max(0, Math.min(st.sbp - 5, st.dbp));
      st.hr = Math.max(0, Math.min(230, st.hr));
      st.rr = Math.max(0, Math.min(50, st.rr));
      st.gcs = Math.max(3, Math.min(15, st.gcs));
    }

    function end(survived, reason) {
      sim.over = true;
      cancelAnimationFrame(raf);
      vitalsView();
      renderActions();
      const checks = sc.checklist.map(c => ({ c, ok: !!c.test(sim) }));
      const harms = (sc.harms || []).filter(h => h.test(sim));
      const got = checks.filter(x => x.ok).reduce((s, x) => s + (x.c.pts || 10), 0);
      const max = checks.reduce((s, x) => s + (x.c.pts || 10), 0);
      let score = Math.round(100 * got / max) - harms.length * 10;
      if (!survived) score = Math.min(score, 40);
      score = Math.max(0, Math.min(100, score));
      S.finishSim(sc.id, score, survived);
      addLog(survived ? 'Пациент стабилизирован и передан в отделение интенсивной терапии.' : (reason || sc.deathText || 'Пациент погиб.'), survived ? 'good' : 'bad');
      const d = document.createElement('div');
      d.className = 'debrief sim-debrief';
      d.innerHTML = `
        <div class="result">
          ${ring(score, 72)}
          <div class="result-body">
            <span class="eyebrow">${survived ? 'Пациент стабилизирован' : 'Исход неблагоприятный'} · ${mmss(sim.t)}</span>
            <h2>${esc(sc.diagnosis)}</h2>
          </div>
        </div>
        <div><h3 style="margin-bottom:8px">Чек-лист</h3>
          <ul class="checklist">${checks.map(x => `<li class="${x.ok ? 'ok' : 'no'}"><span>${x.ok ? ICONS.check : ICONS.x}</span>${x.c.label}</li>`).join('')}
          ${harms.map(h => `<li class="harm"><span>${ICONS.alert}</span>${h.label}</li>`).join('')}</ul>
        </div>
        <div class="prose">${sc.debrief}</div>
        <div class="row">
          ${(sc.links || []).map(lid => { const l = MED.lesson(lid); return l ? `<a class="btn" href="#/lesson/${lid}">${ICONS.book}${esc(l.title)}</a>` : ''; }).join('')}
        </div>
        <div class="row"><button type="button" class="btn btn-primary" id="again">Ещё раз</button><a class="btn" href="#/sim">Другие сценарии</a></div>`;
      el.querySelector('.sim').after(d);
      MED.ui.bindTerms(d);
      d.querySelector('#again').addEventListener('click', () => MED.views.simrun(el, [id]));
      setTimeout(() => d.scrollIntoView({ behavior: 'smooth', block: 'start' }), 300);
    }

    const pauseBtn = el.querySelector('#pause');
    const togglePause = () => { if (sim.over) return; sim.paused = !sim.paused; pauseBtn.textContent = sim.paused ? 'Продолжить' : 'Пауза'; el.querySelector('.sim').classList.toggle('paused', sim.paused); };
    pauseBtn.addEventListener('click', togglePause);
    const onKey = e => {
      if (!document.body.contains(pauseBtn)) { document.removeEventListener('keydown', onKey); return; }
      if ((e.key === 'p' || e.key === 'з') && !e.ctrlKey && !e.metaKey && document.activeElement.tagName !== 'INPUT') togglePause();
    };
    document.addEventListener('keydown', onKey);

    addLog(sc.start || 'Вы подходите к пациенту. Монитор подключён.', 'info');
    renderActions();
    vitalsView();
    raf = requestAnimationFrame(loop);
  };
})();
