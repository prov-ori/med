/* Практика: тренажёр феноменов, карточки, экзамен, вызов дня. */
(function () {
  const { ICONS, esc, shuffle, seeded, ring, question, plural } = MED.ui;
  const S = MED.store;

  /* ---------- Вопрос по ЭКГ для вызова дня ---------- */
  function ecgQuestion(rnd) {
    const pool = MED.ecg.RHYTHMS.filter(r => r.level <= 2);
    const r = pool[Math.floor(rnd() * pool.length)];
    const others = shuffle(MED.ecg.RHYTHMS.filter(x => x.id !== r.id && x.level <= 3), rnd).slice(0, 3);
    const options = others.map(o => o.name).concat(r.name);
    return {
      q: `<canvas class="ecg-strip" data-ecg="${r.id}" data-seed="daily-${S.today()}"></canvas><div style="margin-top:10px">Какой ритм на ленте (отведение II, 25 мм/с)?</div>`,
      options, answer: options.length - 1, explain: `${r.key} ${r.why}`
    };
  }

  /* ---------- Карточки ---------- */
  function strip(html) { return String(html).replace(/<[^>]+>/g, ''); }
  function decks() {
    const out = [];
    const cats = [...new Set(MED.glossary.map(t => t.cat))];
    cats.forEach(c => out.push({
      id: 'g-' + c, title: 'Термины: ' + c, desc: 'Термин → определение',
      cards: MED.glossary.filter(t => t.cat === c).map(t => ({ id: 'g:' + t.term, label: 'Что это?', front: t.term, back: t.def + (t.lat ? `<br><span class="muted" lang="la">${esc(t.lat)}</span>` : '') }))
    }));
    out.push({
      id: 'lat', title: 'Латынь в анатомии', desc: 'Орган → латинское название',
      cards: MED.organs.map(o => ({ id: 'lat:' + o.id, label: 'Как по-латыни?', front: o.name, back: `<b lang="la">${esc(o.lat)}</b><br><span class="muted">${esc(o.fn)}</span>` }))
    });
    out.push({
      id: 'drugs', title: 'Препараты', desc: 'Название → класс, механизм, главное',
      cards: MED.drugs.map(d => ({
        id: 'd:' + d.id, label: 'Класс и механизм?', front: d.name,
        back: `<b>${esc(d.class)}</b><br>${d.mechanism}<br><span class="muted">Главное: ${d.pearl || ''}</span>`
      }))
    });
    out.push({
      id: 'labs', title: 'Нормы анализов', desc: 'Показатель → референсный интервал',
      cards: MED.labs.map(l => ({ id: 'lab:' + l.id, label: 'Норма у взрослого?', front: l.name, back: `<b>${esc(l.range)} ${esc(l.unit)}</b><br><span class="muted">↑ ${esc(l.high || '—')}<br>↓ ${esc(l.low || '—')}</span>` }))
    });
    out.push({
      id: 'ecg', title: 'Ритмы ЭКГ', desc: 'Ритм → главный признак',
      cards: MED.ecg.RHYTHMS.map(r => ({ id: 'ecg:' + r.id, label: 'Как узнать на ЭКГ?', front: r.name, back: `${esc(r.key)}<br><span class="muted">${esc(r.why)}</span>` }))
    });
    out.push({
      id: 'roots', title: 'Корни медицинских терминов', desc: 'Корень → значение',
      cards: MED.roots.map(r => ({ id: 'root:' + r.id, label: r.type === 'suffix' ? 'Что значит суффикс?' : r.type === 'prefix' ? 'Что значит приставка?' : 'Что значит корень?', front: r.form, back: `<b>${esc(r.meaning)}</b><br><span class="muted">${esc(r.example || '')}</span>` }))
    });
    out.push({
      id: 'diseases', title: 'Болезни', desc: 'Болезнь → ключевые признаки',
      cards: MED.diseases.map(d => ({ id: 'dz:' + d.id, label: 'Ключевые признаки?', front: d.name, back: `<span class="code">МКБ-10 ${esc(d.icd10)}</span><br>${esc(d.core)}` }))
    });
    out.push({
      id: 'mnemo', title: 'Мнемоники', desc: 'Ключ → расшифровка',
      cards: MED.mnemonics.map(m => ({
        id: 'm:' + m.id, label: m.topic, front: m.key,
        back: `<ul style="margin:0;padding-left:1.1em">${m.items.map(i => `<li>${i}</li>`).join('')}</ul>`
      }))
    });
    return out.filter(d => d.cards.length);
  }
  const deckStats = d => {
    const now = Date.now();
    let fresh = 0, due = 0, learned = 0;
    d.cards.forEach(c => {
      const st = S.state.cards[c.id];
      if (!st) fresh++;
      else { if (st.due <= now) due++; if (st.box >= 3) learned++; }
    });
    return { fresh, due, learned };
  };

  MED.views.cards = function (el, [deckId]) {
    const all = decks();
    if (deckId) return review(el, all.find(d => d.id === deckId) || mixed(all));
    const totalDue = all.reduce((s, d) => s + deckStats(d).due, 0);
    el.innerHTML = `
      <div class="page-head">
        <span class="eyebrow">Карточки</span>
        <h1>Интервальное повторение</h1>
        <p>Карточка, которую вы помните, вернётся через 1, 3, 7, 16, 35 и 80 дней. Забытая — через минуту. Так материал переходит в долговременную память при минимуме времени.</p>
      </div>
      <div class="card continue" style="margin-bottom:22px">
        <div class="tool-ico">${ICONS.shuffle}</div>
        <div class="continue-body"><b>Смешанная сессия</b><span class="muted">${totalDue ? `${totalDue} ${plural(totalDue, 'карточка ждёт', 'карточки ждут', 'карточек ждут')} повторения` : 'Повторять пока нечего — возьмём новые карточки из всех колод'}</span></div>
        <a class="btn btn-primary" href="#/cards/mixed">Начать</a>
      </div>
      <div class="grid">${all.map(d => {
        const st = deckStats(d);
        return `<a class="card deck" href="#/cards/${encodeURIComponent(d.id)}">
          <h3>${esc(d.title)}</h3><span class="muted small">${esc(d.desc)} · ${d.cards.length} шт.</span>
          ${MED.ui.bar(Math.round(st.learned / Math.max(1, d.cards.length) * 100))}
          <div class="deck-count"><span>Новые <b>${st.fresh}</b></span><span>К повторению <b>${st.due}</b></span><span>Выучено <b>${st.learned}</b></span></div>
        </a>`;
      }).join('')}</div>`;
  };

  function mixed(all) {
    return { id: 'mixed', title: 'Смешанная сессия', cards: all.flatMap(d => d.cards) };
  }

  function review(el, deck) {
    const now = Date.now();
    const due = shuffle(deck.cards.filter(c => S.state.cards[c.id] && S.state.cards[c.id].due <= now));
    const fresh = shuffle(deck.cards.filter(c => !S.state.cards[c.id])).slice(0, 15);
    let queue = due.concat(fresh).slice(0, 30);
    let doneN = 0;
    const total = queue.length;
    el.innerHTML = `
      <nav class="crumbs"><a href="#/cards">Карточки</a><span>/</span><span>${esc(deck.title)}</span></nav>
      <div class="flash-wrap" id="fw"></div>`;
    const fw = el.querySelector('#fw');
    if (!total) {
      fw.innerHTML = `<div class="empty"><h2>На сегодня всё</h2><p>В этой колоде нет карточек к повторению. Загляните завтра или выберите другую колоду.</p><a class="btn btn-primary" href="#/cards">К колодам</a></div>`;
      return;
    }
    function show() {
      if (!queue.length) {
        fw.innerHTML = `<div class="empty"><h2>Сессия завершена</h2><p>Повторено карточек: ${doneN}. Следующие повторения уже запланированы.</p><div class="row"><a class="btn btn-primary" href="#/cards">К колодам</a></div></div>`;
        S.addXP(Math.min(40, doneN * 2), 'повторение карточек');
        S.checkAchievements();
        return;
      }
      const c = queue[0];
      const box = S.state.cards[c.id] ? S.state.cards[c.id].box : 0;
      fw.innerHTML = `
        <div class="score-row"><span>Осталось: <b>${queue.length}</b></span><span>Коробка: <b>${box}</b></span></div>
        <div class="flash" id="flash" tabindex="0" role="button" aria-label="Перевернуть карточку">
          <div class="flash-inner">
            <div class="flash-face"><span class="fl-label">${esc(c.label)}</span><div class="fl-main">${esc(c.front)}</div><span class="muted small">Нажмите или пробел, чтобы перевернуть</span></div>
            <div class="flash-face back"><span class="fl-label">${esc(c.front)}</span><div class="fl-main">${c.back}</div></div>
          </div>
        </div>
        <div class="grades" id="grades" hidden>
          <button type="button" class="btn" data-g="again">Не помню<small>клавиша 1 · через минуту</small></button>
          <button type="button" class="btn" data-g="hard">С трудом<small>клавиша 2 · скоро</small></button>
          <button type="button" class="btn btn-primary" data-g="good">Помню<small>клавиша 3 · позже</small></button>
        </div>`;
      const flash = fw.querySelector('#flash');
      const flip = () => { flash.classList.toggle('flipped'); fw.querySelector('#grades').hidden = false; };
      flash.addEventListener('click', flip);
      flash.addEventListener('keydown', e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); flip(); } });
      // Клавиши 1/2/3 оценивают карточку после переворота.
      const onKey = e => {
        if (!document.body.contains(flash)) { document.removeEventListener('keydown', onKey); return; }
        const g = { '1': 'again', '2': 'hard', '3': 'good' }[e.key];
        if (g && !fw.querySelector('#grades').hidden) { document.removeEventListener('keydown', onKey); fw.querySelector(`[data-g="${g}"]`).click(); }
      };
      document.addEventListener('keydown', onKey);
      fw.querySelector('#grades').addEventListener('click', e => {
        const b = e.target.closest('button'); if (!b) return;
        S.rateCard(c.id, b.dataset.g);
        queue.shift();
        doneN++;
        if (b.dataset.g === 'again') queue.push(c);
        show();
      });
      flash.focus();
    }
    show();
  }

  /* ---------- Экзамен ---------- */
  function questionsFor(levelIds) {
    return MED.levels.filter(l => levelIds.includes(l.id))
      .flatMap(l => l.lessons.flatMap(ls => ls.quiz.map((q, i) => Object.assign({}, q, { levelId: l.id, lessonId: ls.id, key: ls.id + '#' + i }))));
  }

  MED.views.exam = function (el) {
    el.innerHTML = `
      <div class="page-head">
        <span class="eyebrow">Пробный экзамен</span>
        <h1>Проверка без подсказок</h1>
        <p>Вопросы берутся из тестов выбранных уровней в случайном порядке. Разбор — только в конце, как на настоящем экзамене.</p>
      </div>
      <div class="card" style="max-width:760px;display:flex;flex-direction:column;gap:18px">
        <div><b>Уровни</b><div class="check-list" id="lvls" style="margin-top:8px">
          ${MED.levels.map(l => `<label><input type="checkbox" value="${l.id}" checked> ${MED.levelBadge(l)}. ${esc(l.title)}</label>`).join('')}
        </div></div>
        <div><b>Количество вопросов</b><div class="seg" id="cnt" style="margin-top:8px">
          ${[10, 20, 40, 60].map((n, i) => `<button type="button" data-n="${n}" class="${i === 1 ? 'on' : ''}">${n}</button>`).join('')}
        </div></div>
        <label class="row" style="gap:8px"><input type="checkbox" id="timed" checked style="accent-color:var(--accent)"> Ограничение по времени: 1 минута на вопрос</label>
        <div><button type="button" class="btn btn-primary" id="go">${ICONS.exam}Начать экзамен</button></div>
      </div>
      ${S.state.exams.length ? `<section class="section"><h2 style="margin-bottom:12px">Прошлые попытки</h2>
        <div class="table-wrap" style="max-width:760px"><table><thead><tr><th>Дата</th><th>Результат</th><th>Уровни</th></tr></thead><tbody>
        ${S.state.exams.slice(0, 10).map(x => `<tr><td>${new Date(x.at).toLocaleDateString('ru-RU')}</td><td><b>${Math.round(x.score / x.total * 100)}%</b> <span class="muted">(${x.score}/${x.total})</span></td><td>${x.levels.map(id => id.replace('l', '')).join(', ')}</td></tr>`).join('')}
        </tbody></table></div></section>` : ''}`;
    let count = 20;
    el.querySelector('#cnt').addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      count = +b.dataset.n;
      el.querySelectorAll('#cnt button').forEach(x => x.classList.toggle('on', x === b));
    });
    el.querySelector('#go').addEventListener('click', () => {
      const lv = [...el.querySelectorAll('#lvls input:checked')].map(i => i.value);
      if (!lv.length) { MED.ui.toast('Выберите хотя бы один уровень'); return; }
      const pool = shuffle(questionsFor(lv)).slice(0, count);
      runExam(el, pool, lv, el.querySelector('#timed').checked);
    });
  };

  function runExam(el, pool, levels, timed) {
    const answers = [];
    let i = 0, timer = null, left = pool.length * 60;
    el.innerHTML = `<div class="exam-top"><b id="prog"></b>${timed ? '<span class="timer" id="timer"></span>' : ''}</div>
      <div style="max-width:68ch" id="slot"></div>`;
    const slot = el.querySelector('#slot');
    if (timed) {
      const tEl = el.querySelector('#timer');
      const tick = () => {
        if (!document.body.contains(tEl)) { clearInterval(timer); return; }
        const m = Math.floor(left / 60), s = left % 60;
        tEl.textContent = `${m}:${String(s).padStart(2, '0')}`;
        tEl.classList.toggle('low', left < 60);
        if (left-- <= 0) { clearInterval(timer); finish(); }
      };
      tick(); timer = setInterval(tick, 1000);
    }
    function show() {
      if (i >= pool.length) return finish();
      el.querySelector('#prog').textContent = `Вопрос ${i + 1} из ${pool.length}`;
      slot.innerHTML = '';
      question(slot, pool[i], {
        mode: 'exam',
        onAnswer(ok, chosen) {
          S.recordAnswer(pool[i].key, ok);
          answers[i] = { ok, chosen };
          i++;
          setTimeout(show, 250);
        }
      });
    }
    function finish() {
      clearInterval(timer);
      const score = answers.filter(a => a && a.ok).length;
      S.recordExam(score, pool.length, levels);
      const pct = Math.round(score / pool.length * 100);
      const byLevel = levels.map(id => {
        const qs = pool.map((q, k) => ({ q, a: answers[k] })).filter(x => x.q.levelId === id);
        return { id, n: qs.length, ok: qs.filter(x => x.a && x.a.ok).length };
      }).filter(x => x.n);
      el.innerHTML = `
        <div class="card result" style="max-width:760px">
          ${ring(pct, 84)}
          <div class="result-body"><span class="eyebrow">Экзамен завершён</span><h2>${score} из ${pool.length} верно</h2>
          <p class="muted">${pct >= 90 ? 'Отлично.' : pct >= 70 ? 'Хорошо. Посмотрите разбор ошибок ниже.' : 'Есть пробелы — разбор ниже подскажет, какие уроки перечитать.'}</p></div>
          <div class="row"><a class="btn btn-primary" href="#/exam">Новый экзамен</a></div>
        </div>
        <section class="section" style="max-width:760px">
          <h2 style="margin-bottom:12px">По уровням</h2>
          <div class="rank-list">${byLevel.map(b => {
            const lv = MED.levels.find(l => l.id === b.id);
            return `<div class="rank-item" style="grid-template-columns:28px minmax(0,1fr) 120px 48px"><b>${MED.levelBadge(lv)}</b><span>${esc(lv.title)}</span>${MED.ui.bar(Math.round(b.ok / b.n * 100))}<span class="n">${b.ok}/${b.n}</span></div>`;
          }).join('')}</div>
        </section>
        <section class="section" style="max-width:760px">
          <h2 style="margin-bottom:6px">Разбор</h2>
          ${pool.map((q, k) => {
            const a = answers[k];
            const correct = (Array.isArray(q.answer) ? q.answer : [q.answer]).map(x => q.options[x]).join('; ');
            const lesson = MED.lesson(q.lessonId);
            return `<div class="review-item">
              <span class="${a && a.ok ? 'mark-ok' : 'mark-bad'}">${k + 1}. ${a ? (a.ok ? 'Верно' : 'Ошибка') : 'Нет ответа'}</span>
              <div>${q.q}</div>
              ${a && a.ok ? '' : `<div><b>Правильно:</b> ${correct}</div><div class="muted">${q.explain || ''}</div>
              <a href="#/lesson/${q.lessonId}" class="small">Урок: ${esc(lesson ? lesson.title : '')}</a>`}
            </div>`;
          }).join('')}
        </section>`;
      window.scrollTo(0, 0);
    }
    show();
  }

  /* ---------- Работа над ошибками ---------- */
  MED.views.mistakes = function (el) {
    const list = shuffle(S.mistakeQuestions());
    el.innerHTML = `
      <div class="page-head">
        <span class="eyebrow">Работа над ошибками</span>
        <h1>${list.length ? `${list.length} ${plural(list.length, 'вопрос ждёт', 'вопроса ждут', 'вопросов ждут')} повторения` : 'Ошибок для повторения нет'}</h1>
        <p>Сюда попадают вопросы из уроков, экзамена и вызова дня, на которые вы ответили неверно. Верный ответ убирает вопрос из списка. Повторное извлечение из памяти — один из самых эффективных способов учиться.</p>
      </div>
      <div class="quiz" style="margin-top:0" id="ml"></div>`;
    const box = el.querySelector('#ml');
    if (!list.length) {
      box.innerHTML = `<div class="card"><p class="muted">Пройдите тесты уроков, экзамен или вызов дня — неверные ответы появятся здесь.</p>
        <div class="row" style="margin-top:12px"><a class="btn btn-primary" href="#/exam">${ICONS.exam}Экзамен</a><a class="btn" href="#/daily">${ICONS.bolt}Вызов дня</a></div></div>`;
      return;
    }
    list.forEach((q, k) => {
      const wrap = document.createElement('div');
      wrap.innerHTML = `<div class="muted small" style="margin-bottom:6px">Урок: <a href="#/lesson/${q.lessonId}">${esc(q.lessonTitle)}</a></div>`;
      box.appendChild(wrap);
      question(wrap, q, { number: `${k + 1} / ${list.length}`, onAnswer(ok) { S.recordAnswer(q.key, ok); if (ok) S.addXP(3); } });
    });
  };

  /* ---------- Вызов дня ---------- */
  MED.views.daily = function (el) {
    const key = S.today();
    const rnd = seeded('daily-' + key);
    const qs = shuffle(MED.allLessons().flatMap(l => l.quiz.map((q, i) => Object.assign({}, q, { lessonId: l.id, key: l.id + '#' + i }))), rnd).slice(0, 5);
    const pool = qs.concat([ecgQuestion(rnd)]);
    const prevScore = S.state.daily[key];
    el.innerHTML = `
      <div class="page-head">
        <span class="eyebrow">Вызов дня · ${new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}</span>
        <h1>${pool.length} вопросов со всего курса</h1>
        <p>Набор меняется каждый день и одинаков для всех: пять вопросов из уроков и одна ЭКГ. Хорошая разминка, даже если вы ещё не дошли до этих тем — разбор после каждого ответа.${prevScore !== undefined ? ` Сегодня вы уже набрали ${prevScore} из ${pool.length}.` : ''}</p>
      </div>
      <div class="quiz" style="margin-top:0" id="dl"></div>
      <div id="dres" style="max-width:68ch;margin-top:16px"></div>`;
    const list = el.querySelector('#dl');
    let answered = 0, right = 0;
    pool.forEach((q, k) => question(list, q, {
      number: `${k + 1} / ${pool.length}`,
      onAnswer(ok) {
        S.recordAnswer(q.key, ok);
        answered++; if (ok) right++;
        if (answered === pool.length) {
          S.recordDaily(right);
          el.querySelector('#dres').innerHTML = `<div class="card result">${ring(Math.round(right / pool.length * 100), 64)}
            <div class="result-body"><h3>${right} из ${pool.length}</h3><p class="muted">Возвращайтесь завтра за новым набором. Дни подряд считаются в серию.</p></div>
            <a class="btn btn-primary" href="#/">На главную</a></div>`;
        }
      }
    }));
  };
})();
