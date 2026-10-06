/* Достижения, ранги, активность и настройки. */
(function () {
  const { ICONS, esc, bar } = MED.ui;
  const S = MED.store;

  MED.views.achievements = function (el) {
    const st = S.state;
    const r = S.rank();
    const got = S.ACH.filter(a => st.achievements[a.id]).length;
    // Активность за последние 20 недель
    const days = [];
    const start = new Date(); start.setDate(start.getDate() - 139);
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7)); // с понедельника
    for (let t = new Date(start); t <= new Date(); t.setDate(t.getDate() + 1)) {
      const xp = st.activity[S.today(t)] || 0;
      days.push({ k: S.today(t), xp });
    }
    const lvl = xp => xp === 0 ? '' : xp < 50 ? 'a1' : xp < 150 ? 'a2' : 'a3';

    el.innerHTML = `
      <div class="page-head">
        <span class="eyebrow">Профиль</span>
        <h1>${esc(r.current.title)}</h1>
        <p>${st.xp} XP${r.next ? ` · до ранга «${esc(r.next.title)}» осталось ${r.next.xp - st.xp} XP` : ' · максимальный ранг'}</p>
        <div style="max-width:420px">${bar(r.pct)}</div>
      </div>
      <section class="section" style="margin-top:0">
        <div class="section-head"><h2>Активность</h2><span class="muted small">последние 20 недель · серия ${S.streak()} дн.</span></div>
        <div class="card"><div class="heatmap">${days.map(x => `<i class="${lvl(x.xp)}" title="${x.k}: ${x.xp} XP"></i>`).join('')}</div></div>
      </section>
      <section class="section">
        <div class="section-head"><h2>Достижения</h2><span class="muted">${got} из ${S.ACH.length}</span></div>
        <div class="grid">${S.ACH.map(a => `
          <div class="card ach ${st.achievements[a.id] ? 'got' : ''}">
            <span class="ach-ico">${st.achievements[a.id] ? ICONS.star : ICONS.lock}</span>
            <div><b>${esc(a.title)}</b><span>${esc(a.desc)}</span></div>
          </div>`).join('')}</div>
      </section>
      <section class="section">
        <h2 style="margin-bottom:12px">Ранги</h2>
        <div class="card ranks" style="max-width:520px">${S.RANKS.map(x => `
          <div class="rank-row ${x === r.current ? 'on' : ''}"><span>${esc(x.title)}</span><span>${x.xp} XP</span></div>`).join('')}</div>
        <p class="muted small" style="margin-top:10px">Опыт: урок — 40 XP + 10 за каждый верный ответ; клинический случай — 60 XP + 5 за балл; стабилизированный пациент в симуляторе — от 80 XP; вызов дня — от 30 XP; верный ответ в тренажёре — 5 XP; повторение карточек — до 40 XP за сессию.</p>
      </section>`;
  };

  MED.views.settings = function (el) {
    const t = S.state.settings.theme;
    el.innerHTML = `
      <div class="page-head"><span class="eyebrow">Настройки</span><h1>Тема, трек и прогресс</h1>
        <p>Прогресс хранится только в этом браузере. Чтобы перенести его на другое устройство, скопируйте код прогресса и вставьте его там.</p></div>
      <div style="display:flex;flex-direction:column;gap:16px;max-width:760px">
        <div class="card"><h3 style="margin-bottom:10px">Тема</h3>
          <div class="seg" id="th">
            <button type="button" data-t="system" class="${t === 'system' ? 'on' : ''}">Как в системе</button>
            <button type="button" data-t="light" class="${t === 'light' ? 'on' : ''}">Светлая</button>
            <button type="button" data-t="dark" class="${t === 'dark' ? 'on' : ''}">Тёмная</button>
          </div></div>
        <div class="card"><h3 style="margin-bottom:10px">Ваша подготовка</h3>
          <div class="seg" id="tr">
            ${MED.TRACKS.map(x => `<button type="button" data-t="${x.id}" class="${S.state.settings.track === x.id ? 'on' : ''}">${x.title}</button>`).join('')}
          </div>
          <p class="muted small" style="margin-top:8px">Влияет на то, какой урок главная страница предложит следующим.</p></div>
        <div class="card" style="display:flex;flex-direction:column;gap:10px"><h3>Перенос прогресса</h3>
          <textarea class="input" id="exp" spellcheck="false" aria-label="Код прогресса"></textarea>
          <div class="row">
            <button type="button" class="btn" id="copy">Скопировать код</button>
            <button type="button" class="btn" id="dl">Скачать файлом</button>
            <button type="button" class="btn btn-primary" id="imp">Загрузить из поля</button>
          </div>
          <span class="muted small">Чтобы загрузить прогресс, вставьте код в поле выше и нажмите «Загрузить из поля». Текущий прогресс будет заменён.</span>
        </div>
        <div class="card" style="display:flex;flex-direction:column;gap:10px"><h3>Сброс</h3>
          <p class="muted">Удалит опыт, пройденные уроки, карточки и достижения в этом браузере.</p>
          <div><button type="button" class="btn btn-danger" id="reset">Сбросить прогресс</button></div>
        </div>
        <div class="card"><h3 style="margin-bottom:8px">О платформе</h3>
          <p class="muted">Учебный проект с открытым исходным кодом. Содержание опирается на классические учебники (Гайтон и Холл, Роббинс, «Медицина Дэвидсона», Оксфордский справочник по клинической медицине), рекомендации ERC 2021, ESC, NICE, Surviving Sepsis Campaign, ВОЗ и KDIGO. Материал упрощён для обучения и не является клиническими рекомендациями: дозы и пороги сверяйте с действующими местными протоколами. Если вы нашли ошибку, сообщите о ней в репозитории проекта.</p>
        </div>
      </div>`;
    const exp = el.querySelector('#exp');
    exp.value = S.exportJSON();
    el.querySelector('#th').addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      S.setTheme(b.dataset.t);
      MED.app.applyTheme();
      el.querySelectorAll('#th button').forEach(x => x.classList.toggle('on', x === b));
    });
    el.querySelector('#tr').addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      S.setTrack(b.dataset.t);
      el.querySelectorAll('#tr button').forEach(x => x.classList.toggle('on', x === b));
    });
    el.querySelector('#copy').addEventListener('click', () => {
      const done = () => MED.ui.toast('Код скопирован');
      if (navigator.clipboard) navigator.clipboard.writeText(exp.value).then(done, () => { exp.select(); MED.ui.toast('Выделите и скопируйте вручную'); });
      else { exp.select(); }
    });
    const dl = el.querySelector('#dl');
    if (dl) dl.addEventListener('click', () => {
      try {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([exp.value], { type: 'application/json' }));
        a.download = 'pulse-progress.json';
        document.body.appendChild(a); a.click(); a.remove();
      } catch (e) { MED.ui.toast('Скачивание недоступно — скопируйте код'); }
    });
    el.querySelector('#imp').addEventListener('click', () => {
      try { S.importJSON(exp.value); MED.ui.toast('Прогресс загружен'); location.hash = '#/'; }
      catch (e) { MED.ui.toast('Не удалось прочитать код: ' + e.message); }
    });
    const rb = el.querySelector('#reset');
    rb.addEventListener('click', () => MED.ui.confirmInline(rb, 'Точно сбросить весь прогресс?', () => {
      S.reset(); MED.ui.toast('Прогресс сброшен'); location.hash = '#/';
    }));
  };
})();
