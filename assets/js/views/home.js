/* Главная: живой монитор с «ритмом дня», выбор трека, прогресс, уровни, тренажёры. */
(function () {
  const { ICONS, ring, bar, esc, seeded } = MED.ui;
  const S = MED.store;

  // С чего начинать в зависимости от подготовки.
  const TRACKS = [
    { id: 'school', title: 'Школьник или гимназист', desc: 'Начнём с устройства тела, первой помощи и того, как стать врачом.', level: 'l0' },
    { id: 'pre', title: 'Студент 1–3 курса', desc: 'Анатомия, физиология, патология, фармакология — доклиническая база.', level: 'l1' },
    { id: 'clin', title: 'Студент-клиницист', desc: 'Анамнез, анализы, ЭКГ, клинические случаи и болезни по системам.', level: 'l3' },
    { id: 'doc', title: 'Врач или резидент', desc: 'Неотложка, симулятор, доказательная медицина, быстрое повторение.', level: 'l5' }
  ];
  MED.TRACKS = TRACKS;

  function nextLesson() {
    const track = TRACKS.find(t => t.id === S.state.settings.track);
    const levels = MED.levels.slice();
    if (track) {
      const i = levels.findIndex(l => l.id === track.level);
      if (i > 0) levels.push(...levels.splice(0, i));
    }
    for (const lv of levels) for (const l of lv.lessons) {
      if (!(S.state.lessons[l.id] && S.state.lessons[l.id].done)) return { lv, l };
    }
    return null;
  }

  // «Ритм дня»: одинаковый для всех в этот день, из базовых и средних ритмов.
  function rhythmOfDay(seed) {
    const pool = MED.ecg.RHYTHMS.filter(r => r.level <= 2 && r.id !== 'asystole');
    const rnd = seeded('rhythm-' + seed);
    return pool[Math.floor(rnd() * pool.length)];
  }
  const vitalsFor = id => ({
    'sinus': [74, '98', '122/78', 16], 'sinus-tachy': [124, '95', '104/66', 22], 'sinus-brady': [46, '98', '108/70', 14],
    'af': [128, '94', '112/74', 20], 'flutter': [75, '96', '118/76', 16], 'svt': [188, '96', '96/62', 22],
    'vt': [182, '—', '—', '—'], 'vf': ['—', '—', '—', '—'], 'avb1': [66, '98', '128/80', 14], 'chb': [36, '93', '84/50', 18],
    'pvc': [72, '97', '130/82', 16], 'stemi': [92, '94', '102/68', 20], 'paced': [70, '97', '126/78', 15]
  }[id] || [78, '97', '120/80', 16]);

  MED.views.home = function (el) {
    const st = S.state;
    const total = MED.allLessons().length;
    const done = S.doneCount();
    const nx = nextLesson();
    const r = S.rank();
    const casesDone = Object.keys(st.cases).length;
    const dailyDone = st.daily[S.today()] !== undefined;
    const isNew = st.xp === 0;
    const rh = rhythmOfDay(S.today());
    const vit = vitalsFor(rh.id);
    const trainers = ['ecg', 'labs', 'abg', 'anatomy', 'riddles', 'terms', 'myths', 'triage', 'pairs'].reduce((s, k) => s + S.trainer(k).correct, 0);

    el.innerHTML = `
      <section class="hero">
        <div class="hero-text">
          <span class="eyebrow">Интерактивная медицина · от гимназии до врача</span>
          <h1>Как устроен человек, почему он болеет и <em>что делать у постели больного</em></h1>
          <p>${MED.levels.length} уровней и ${total} ${MED.ui.plural(total, 'урок', 'урока', 'уроков')} с тестами — от клетки и первой помощи до ЭКГ, сепсиса и остановки сердца. ${MED.cases.length} ${MED.ui.plural(MED.cases.length, 'клинический случай', 'клинических случая', 'клинических случаев')}, реанимационный симулятор, тренажёры ЭКГ, анализов и анатомии, калькуляторы и справочники.</p>
          <div class="row">
            ${nx ? `<a class="btn btn-primary" href="#/lesson/${nx.l.id}">${ICONS.arrow}${isNew ? 'Начать' : 'Продолжить обучение'}</a>` : `<a class="btn btn-primary" href="#/exam">${ICONS.exam}Итоговый экзамен</a>`}
            <a class="btn" href="#/sim">${ICONS.monitor}Реанимационный зал</a>
          </div>
        </div>
        <figure class="mon" style="margin:0">
          <div class="mon-head"><span>Палата 3 · отведение II</span><span class="mon-live">● LIVE</span></div>
          <canvas id="mon" aria-label="Монитор пациента с ритмом дня"></canvas>
          <div class="mon-vitals">
            <div class="mv mv-hr"><small>ЧСС</small><b>${vit[0]}</b></div>
            <div class="mv mv-sp"><small>SpO₂ %</small><b>${vit[1]}</b></div>
            <div class="mv mv-bp"><small>АД</small><b>${vit[2]}</b></div>
            <div class="mv mv-rr"><small>ЧДД</small><b>${vit[3]}</b></div>
          </div>
          <figcaption class="mon-cap">
            <span><b>Ритм дня.</b> Что на мониторе?</span>
            <button type="button" class="btn btn-sm" id="reveal">Показать ответ</button>
          </figcaption>
          <div class="mon-answer" id="answer" hidden><b>${esc(rh.name)}.</b> ${esc(rh.key)} <a href="#/ecg">Тренажёр ЭКГ →</a></div>
        </figure>
      </section>

      ${!st.settings.track ? `
      <section class="section" style="margin-top:0;margin-bottom:30px">
        <div class="card track-pick">
          <div><span class="eyebrow">С чего начать</span><h2>Кто вы?</h2><p class="muted">Подберём первый урок под вашу подготовку. Всё остальное тоже открыто, выбор можно поменять в настройках.</p></div>
          <div class="tracks">${TRACKS.map(t => `<button type="button" class="track" data-t="${t.id}"><b>${t.title}</b><span>${t.desc}</span></button>`).join('')}</div>
        </div>
      </section>` : ''}

      <section class="stats">
        <div class="stat"><b>${st.xp}</b><span>опыта · ${esc(r.current.title)}</span></div>
        <div class="stat"><b>${done}/${total}</b><span>уроков пройдено</span></div>
        <div class="stat"><b>${casesDone}/${MED.cases.length}</b><span>случаев разобрано</span></div>
        <div class="stat"><b>${trainers}</b><span>верных ответов в тренажёрах</span></div>
        <div class="stat"><b>${S.streak()}</b><span>дней подряд</span></div>
      </section>

      ${nx ? `
      <section class="section">
        <div class="card continue">
          ${ring(Math.round(done / total * 100), 64)}
          <div class="continue-body">
            <span class="eyebrow">${isNew ? 'Первый урок' : 'Следующий урок'} · ${MED.levelName(nx.lv).toLowerCase()}</span>
            <h2>${esc(nx.l.title)}</h2>
            <p class="muted">${esc(nx.l.summary || '')}</p>
          </div>
          <a class="btn btn-primary" href="#/lesson/${nx.l.id}">Открыть ${ICONS.arrow}</a>
        </div>
      </section>` : ''}

      <section class="section">
        <div class="section-head"><h2>Шесть уровней</h2><a href="#/path">Весь путь</a></div>
        <div class="levels-strip">
          ${MED.levels.map(lv => {
            const p = S.levelProgress(lv.id);
            return `<a class="lv-tile" style="--c:var(--lv${lv.num})" href="#/path#${lv.id}">
              <span class="lv-num">${MED.levelBadge(lv)}</span>
              <span class="lv-title">${esc(lv.title)}</span>
              <span class="muted small">${esc(lv.audience)}</span>
              ${bar(p.pct)}
              <span class="muted small">${p.done} из ${p.total}</span>
            </a>`;
          }).join('')}
        </div>
      </section>

      <section class="section">
        <div class="section-head"><h2>Тренажёры</h2></div>
        <div class="tools">
          <a class="tool tool-hot" href="#/sim"><span class="tool-ico">${ICONS.monitor}</span><div><b>Реанимационный зал</b><span>Пациент ухудшается в реальном времени — ваши действия решают исход</span></div></a>
          <a class="tool" href="#/ecg"><span class="tool-ico">${ICONS.ecg}</span><div><b>Тренажёр ЭКГ</b><span>${MED.ecg.RHYTHMS.length} ритмов, каждый раз новая лента, расчёт ЧСС</span></div></a>
          <a class="tool" href="#/labs"><span class="tool-ico">${ICONS.flask}</span><div><b>Расшифровка анализов</b><span>Найдите отклонения и поставьте лабораторный диагноз</span></div></a>
          <a class="tool" href="#/abg"><span class="tool-ico">${ICONS.drop}</span><div><b>Газы крови</b><span>Пошагово: ацидоз или алкалоз, компенсация, анионный интервал</span></div></a>
          <a class="tool" href="#/anatomy"><span class="tool-ico">${ICONS.body}</span><div><b>Анатомическая карта</b><span>Органы с латынью, функциями и болезнями. Режим «найди орган»</span></div></a>
          <a class="tool" href="#/riddles"><span class="tool-ico">${ICONS.magnifier}</span><div><b>Диагноз по подсказкам</b><span>Чем раньше догадаетесь, тем больше очков</span></div></a>
          <a class="tool" href="#/terms"><span class="tool-ico">${ICONS.puzzle}</span><div><b>Конструктор терминов</b><span>Соберите слово из греческих и латинских корней</span></div></a>
          <a class="tool" href="#/triage"><span class="tool-ico">${ICONS.alert}</span><div><b>Сортировка в приёмном</b><span>${MED.triage.length} пациентов: кого смотреть первым, а кто подождёт</span></div></a>
          <a class="tool" href="#/myths"><span class="tool-ico">${ICONS.bulb}</span><div><b>Миф или факт</b><span>${MED.myths.length} утверждений — от бабушкиных советов до мифов ординаторской</span></div></a>
          <a class="tool" href="#/pairs"><span class="tool-ico">${ICONS.shuffle}</span><div><b>Пары</b><span>Яд — антидот, витамин — болезнь, микроб — инфекция</span></div></a>
          <a class="tool" href="#/cases"><span class="tool-ico">${ICONS.case}</span><div><b>Клинические случаи</b><span>Ведите пациента: решения, ошибки, разбор</span></div></a>
          <a class="tool" href="#/daily"><span class="tool-ico">${ICONS.bolt}</span><div><b>Вызов дня ${dailyDone ? '· выполнен' : ''}</b><span>6 вопросов, одинаковых для всех сегодня</span></div></a>
          <a class="tool" href="#/cards"><span class="tool-ico">${ICONS.cards}</span><div><b>Карточки</b><span>Интервальное повторение: термины, препараты, нормы</span></div></a>
          <a class="tool" href="#/calc"><span class="tool-ico">${ICONS.calc}</span><div><b>Калькуляторы</b><span>СКФ, CHA₂DS₂-VASc, CURB-65, Глазго, NEWS2 и другие</span></div></a>
          <a class="tool" href="#/mistakes"><span class="tool-ico">${ICONS.shuffle}</span><div><b>Работа над ошибками${S.mistakeQuestions().length ? ' · ' + S.mistakeQuestions().length : ''}</b><span>Повторите вопросы, на которых ошиблись</span></div></a>
        </div>
      </section>

      ${isNew ? `
      <section class="section">
        <div class="card">
          <h2 style="margin-bottom:10px">Как здесь учиться</h2>
          <div class="grid-2">
            <p><b>1. Идите по уровням.</b> Уровень 0 рассчитан на школьника: клетка, сердце, кровь, иммунитет, первая помощь. Дальше — анатомия и физиология, механизмы болезней, клинические навыки, болезни по системам и, наконец, работа врача.</p>
            <p><b>2. Закрепляйте.</b> После каждого урока — тест с разбором. Подчёркнутые пунктиром термины открывают определение с латынью по клику.</p>
            <p><b>3. Тренируйте глаз и решения.</b> ЭКГ, анализы, газы крови и анатомия — тренажёры без конца. В реанимационном зале ошибка стоит пациенту жизни, но только виртуальной.</p>
            <p><b>4. Повторяйте.</b> Карточки сами напоминают, что пора повторить. Прогресс хранится в этом браузере; перенести его можно в настройках.</p>
          </div>
        </div>
      </section>` : ''}
    `;

    const canvas = el.querySelector('#mon');
    MED.ecg.monitor(canvas, { strip: MED.ecg.build(rh.id, { seed: 'day-' + S.today(), duration: 900 }) });
    el.querySelector('#reveal').addEventListener('click', e => { el.querySelector('#answer').hidden = false; e.target.hidden = true; });
    el.querySelectorAll('.track').forEach(b => b.addEventListener('click', () => {
      S.setTrack(b.dataset.t);
      MED.ui.toast('Первый урок подобран под вашу подготовку');
      MED.views.home(el);
    }));
  };
})();
