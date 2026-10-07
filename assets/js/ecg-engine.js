/* Синтез ЭКГ (отведение II). Ритм = последовательность сокращений желудочков (комплексы QRS-T),
   отдельная последовательность зубцов P и, при необходимости, непрерывный «фон» (волны f/F, ФЖ).
   Каждый зубец — гауссова кривая; масштаб стандартный: 25 мм/с, 10 мм/мВ.
   MED.ecg.build(type, opts) → полоса; MED.ecg.draw(canvas, strip) — бумажная лента;
   MED.ecg.monitor(canvas) — прикроватный монитор с бегущей разверткой. */
(function () {
  const TAU = Math.PI * 2;
  const g = (x, mu, s) => Math.exp(-((x - mu) * (x - mu)) / (2 * s * s));
  const smooth = (x, a, b) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };

  function rng(seed) {
    let h = 2166136261;
    const s = String(seed);
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return function () {
      h += 0x6D2B79F5;
      let t = h;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // QT укорачивается с ростом частоты (приблизительно по Базетту, QTc ≈ 0,40 с).
  const qtFor = (rr, qtc = 0.4) => Math.min(0.6, qtc * Math.sqrt(Math.max(0.25, rr)));

  /* Описание ритмов для тренажёра и уроков. */
  const RHYTHMS = [
    { id: 'sinus', name: 'Синусовый ритм', level: 1, rate: '60–100',
      key: 'Перед каждым QRS есть зубец P, PR постоянный (0,12–0,20 с), QRS узкий, интервалы R–R одинаковые.',
      why: 'Нормальный ритм: импульс рождается в синусовом узле и проходит обычным путём.' },
    { id: 'sinus-tachy', name: 'Синусовая тахикардия', level: 1, rate: '> 100',
      key: 'Всё как при синусовом ритме, но ЧСС выше 100. Зубцы P могут «наезжать» на T предыдущего комплекса.',
      why: 'Почти всегда ответ на что-то: боль, лихорадка, гиповолемия, анемия, ТЭЛА, тревога, тиреотоксикоз. Лечат причину, а не ритм.' },
    { id: 'sinus-brady', name: 'Синусовая брадикардия', level: 1, rate: '< 60',
      key: 'Синусовый ритм с ЧСС ниже 60: P перед каждым QRS, длинные паузы между комплексами.',
      why: 'Норма у спортсменов и во сне; патология — при β-блокаторах, гипотиреозе, гипотермии, нижнем инфаркте, повышенном ВЧД.' },
    { id: 'af', name: 'Фибрилляция предсердий', level: 1, rate: 'любая, обычно 100–160',
      key: 'Нерегулярно-нерегулярные R–R, зубцов P нет, изолиния «дрожит» мелкими волнами f.',
      why: 'Самая частая устойчивая аритмия. Главная опасность — тромб в ушке левого предсердия и инсульт: оцените CHA₂DS₂-VASc.' },
    { id: 'flutter', name: 'Трепетание предсердий', level: 2, rate: 'предсердия ≈ 300, желудочки 75–150',
      key: 'Регулярные «пилообразные» волны F около 300 в минуту, особенно видны в II, III, aVF. Проведение 2:1, 3:1 или 4:1.',
      why: 'Макро-ри-энтри вокруг трикуспидального клапана. При ЧСС ровно ≈150 всегда ищите скрытое трепетание 2:1.' },
    { id: 'svt', name: 'Наджелудочковая (АВ-узловая) тахикардия', level: 2, rate: '150–250',
      key: 'Очень частый регулярный ритм с узкими QRS, зубцы P не видны (спрятаны в QRS).',
      why: 'Повторный вход возбуждения в АВ-узле. Первая помощь — вагусные пробы (модифицированный Вальсальва), затем аденозин.' },
    { id: 'vt', name: 'Желудочковая тахикардия', level: 1, rate: '120–250',
      key: 'Регулярные широкие (> 0,12 с) уродливые QRS, P не связаны с комплексами.',
      why: 'Жизнеугрожающая аритмия. Без пульса — дефибрилляция как при ФЖ; с пульсом и признаками нестабильности — синхронизированная кардиоверсия.' },
    { id: 'vf', name: 'Фибрилляция желудочков', level: 1, rate: 'не определяется',
      key: 'Хаотичные волны разной формы и амплитуды, ни одного узнаваемого комплекса.',
      why: 'Остановка кровообращения. Немедленно — СЛР и дефибрилляция; каждая минута задержки снижает выживаемость примерно на 10%.' },
    { id: 'torsades', name: 'Пируэтная тахикардия (torsades de pointes)', level: 3, rate: '200–250',
      key: 'Полиморфная ЖТ, амплитуда комплексов волнообразно нарастает и спадает — «скручивается» вокруг изолинии.',
      why: 'Возникает на фоне удлинённого QT (препараты, гипокалиемия, гипомагниемия). Лечение — магния сульфат в/в; без пульса — дефибрилляция.' },
    { id: 'asystole', name: 'Асистолия', level: 1, rate: '0',
      key: 'Почти прямая линия. Проверьте электроды и усиление, прежде чем поверить.',
      why: 'Не дефибриллируемый ритм: СЛР, адреналин как можно раньше, поиск обратимых причин (4Г и 4Т).' },
    { id: 'avb1', name: 'АВ-блокада I степени', level: 2, rate: 'обычная',
      key: 'Каждый P проводится, но интервал PR постоянно удлинён — больше 0,20 с (больше одного большого квадрата).',
      why: 'Обычно безобидна: спортсмены, β-блокаторы, дигоксин. Лечения не требует.' },
    { id: 'mobitz1', name: 'АВ-блокада II степени, Мобитц I (Венкебах)', level: 3, rate: 'обычно 50–80',
      key: 'PR удлиняется от комплекса к комплексу, пока один P не останется без QRS; затем цикл повторяется. R–R группируются.',
      why: 'Уровень блока — сам АВ-узел, прогноз благоприятный. Бывает во сне, у спортсменов, при нижнем инфаркте.' },
    { id: 'mobitz2', name: 'АВ-блокада II степени, Мобитц II', level: 3, rate: 'часто < 60',
      key: 'PR одинаковый у всех проведённых комплексов, но время от времени P внезапно не проводится.',
      why: 'Блок ниже АВ-узла, может внезапно перейти в полную блокаду. Показан постоянный кардиостимулятор.' },
    { id: 'chb', name: 'Полная АВ-блокада (III степени)', level: 2, rate: 'желудочки 25–45',
      key: 'Зубцы P идут в своём ритме, QRS — в своём, гораздо более редком; PR всё время разный. QRS часто широкие.',
      why: 'Предсердия и желудочки работают независимо. Риск асистолии; при нестабильности — атропин, адреналин или наружная стимуляция, затем ЭКС.' },
    { id: 'pvc', name: 'Желудочковая экстрасистолия', level: 2, rate: 'основной ритм обычный',
      key: 'На фоне синусового ритма — преждевременные широкие комплексы без P, после них компенсаторная пауза.',
      why: 'Единичные экстрасистолы часты и у здоровых. Насторожиться — при частых, парных, на фоне ишемии, гипокалиемии или сниженной ФВ.' },
    { id: 'stemi', name: 'Подъём сегмента ST (острый инфаркт)', level: 2, rate: 'любая',
      key: 'Сегмент ST выпуклой дугой приподнят над изолинией и сливается с зубцом T («кошачья спинка»).',
      why: 'Окклюзия коронарной артерии. Цель — реперфузия: ЧКВ в течение 120 минут от постановки диагноза.' },
    { id: 'hyperk', name: 'Гиперкалиемия', level: 3, rate: 'обычная или ниже',
      key: 'Высокие узкие остроконечные («шатровые») зубцы T, уплощённые P, расширение QRS.',
      why: 'Угроза остановки сердца. Кальций в/в стабилизирует мембрану кардиомиоцитов за минуты; инсулин с глюкозой перемещают калий в клетки.' },
    { id: 'wpw', name: 'Синдром WPW (предвозбуждение)', level: 3, rate: 'обычная',
      key: 'Короткий PR (< 0,12 с) и пологое начало QRS — дельта-волна; QRS немного уширен.',
      why: 'Дополнительный путь (пучок Кента) в обход АВ-узла. При ФП на фоне WPW нельзя давать блокаторы АВ-узла.' },
    { id: 'paced', name: 'Ритм электрокардиостимулятора', level: 2, rate: 'фиксированная, часто 60–70',
      key: 'Перед каждым широким QRS — узкий вертикальный «спайк» стимула.',
      why: 'Желудочковая стимуляция из верхушки правого желудочка даёт картину, похожую на блокаду левой ножки.' },
    { id: 'longqt', name: 'Удлинённый интервал QT', level: 3, rate: 'обычная',
      key: 'От начала QRS до конца T больше половины интервала R–R; QTc > 470 мс у мужчин и > 480 мс у женщин.',
      why: 'Риск пируэтной тахикардии. Причины: препараты (макролиды, антипсихотики, ондансетрон), гипокалиемия, гипомагниемия, врождённые каналопатии.' }
  ];

  /* Построить полосу ЭКГ. opts: { seed, duration, rate } */
  function build(type, opts = {}) {
    const rnd = rng(opts.seed || type + Math.random());
    const dur = opts.duration || 10;
    const beats = [], ps = [];
    let bg = null;
    const start = -1.2;   // начинаем чуть раньше нуля, чтобы полоса не начиналась с пустоты

    const regular = (hr, beatExtra = {}, pr = 0.16, jitter = 0.015) => {
      let t = start + rnd() * 0.5;
      while (t < dur + 1) {
        const rr = 60 / hr * (1 + (rnd() - 0.5) * jitter * 2);
        const b = Object.assign({ t, kind: 'n', amp: 1.15, qt: qtFor(rr), tAmp: 0.28 }, beatExtra);
        beats.push(b);
        if (pr) ps.push({ t: t - pr, amp: 0.13 });
        t += rr;
      }
    };
    const phases = [rnd() * TAU, rnd() * TAU, rnd() * TAU, rnd() * TAU];

    switch (type) {
      case 'sinus': regular(opts.rate || 62 + rnd() * 30); break;
      case 'sinus-tachy': regular(opts.rate || 112 + rnd() * 28, { tAmp: 0.24 }, 0.13); break;
      case 'sinus-brady': regular(opts.rate || 40 + rnd() * 12, {}, 0.18); break;
      case 'avb1': regular(opts.rate || 62 + rnd() * 18, {}, 0.3 + rnd() * 0.06); break;
      case 'longqt': regular(opts.rate || 60 + rnd() * 12, { qt: 0.56, tAmp: 0.24, tWide: 1.35 }); break;
      case 'wpw': regular(opts.rate || 68 + rnd() * 20, { delta: true }, 0.1); break;
      case 'stemi': regular(opts.rate || 72 + rnd() * 25, { st: 0.32 + rnd() * 0.15, tAmp: 0.42 }); break;
      case 'hyperk': regular(opts.rate || 56 + rnd() * 14, { peaked: true, tAmp: 0.95, wideish: true, amp: 0.85 }, 0.18); ps.forEach(p => { p.amp = 0.05; }); break;
      case 'svt': regular(opts.rate || 175 + rnd() * 40, { tAmp: 0.22 }, 0, 0.004); break;
      case 'paced': regular(opts.rate || 60 + Math.round(rnd()) * 10, { kind: 'w', pace: true, amp: 1.25 }, 0, 0); break;
      case 'vt': regular(opts.rate || 165 + rnd() * 50, { kind: 'w', amp: 1.6 }, 0, 0.006); break;
      case 'af': {
        const mean = 60 / (opts.rate || 95 + rnd() * 50);
        let t = start + rnd() * 0.3;
        while (t < dur + 1) {
          const rr = mean * (0.55 + rnd() * 0.95);
          beats.push({ t, kind: 'n', amp: 1.0 + rnd() * 0.25, qt: qtFor(mean), tAmp: 0.22 });
          t += Math.max(0.33, rr);
        }
        bg = t => 0.045 * (Math.sin(TAU * 6.1 * t + phases[0]) + 0.8 * Math.sin(TAU * 7.7 * t + phases[1]) + 0.6 * Math.sin(TAU * 4.9 * t + phases[2]) * Math.sin(TAU * 0.4 * t + phases[3]));
        break;
      }
      case 'flutter': {
        const atr = 0.2;                       // 300 в минуту
        const ratio = opts.ratio || (rnd() < 0.5 ? 4 : 3);
        const off = rnd() * atr;
        let k = 0;
        for (let t = start + off; t < dur + 1; t += atr, k++) {
          if (k % ratio === 0) beats.push({ t: t + 0.14, kind: 'n', amp: 1.05, qt: qtFor(atr * ratio), tAmp: 0.12 });
        }
        bg = t => { const f = ((t - off) / atr % 1 + 1) % 1; return 0.3 * (f < 0.78 ? 0.5 - f / 0.78 : -0.5 + (f - 0.78) / 0.22); };
        break;
      }
      case 'mobitz1': {
        const pp = 60 / (opts.rate || 78 + rnd() * 14);
        const cycle = 3 + Math.floor(rnd() * 2); // 3:2 или 4:3
        let t = start, k = 0;
        while (t < dur + 1) {
          const pos = k % (cycle + 1);
          ps.push({ t, amp: 0.13 });
          if (pos < cycle) beats.push({ t: t + 0.18 + pos * 0.1, kind: 'n', amp: 1.1, qt: qtFor(pp), tAmp: 0.26 });
          t += pp; k++;
        }
        break;
      }
      case 'mobitz2': {
        const pp = 60 / (opts.rate || 80 + rnd() * 14);
        let t = start, k = 0;
        const dropEvery = 3 + Math.floor(rnd() * 2);
        while (t < dur + 1) {
          ps.push({ t, amp: 0.13 });
          if ((k + 1) % dropEvery !== 0) beats.push({ t: t + 0.18, kind: 'n', amp: 1.1, qt: qtFor(pp), tAmp: 0.26, wideish: true });
          t += pp; k++;
        }
        break;
      }
      case 'chb': {
        const pp = 60 / (opts.rate || 72 + rnd() * 18);
        const vv = 60 / (30 + rnd() * 12);
        for (let t = start + rnd() * pp; t < dur + 1; t += pp) ps.push({ t, amp: 0.13 });
        for (let t = start + 0.4 + rnd() * vv; t < dur + 1; t += vv) beats.push({ t, kind: 'w', amp: 1.3, qt: 0.46 });
        break;
      }
      case 'pvc': {
        const rr = 60 / (opts.rate || 68 + rnd() * 15);
        let t = start, k = 0;
        const every = 2 + Math.floor(rnd() * 3); // бигеминия, тригеминия или квадригеминия
        while (t < dur + 1) {
          if (k % every === every - 1) {
            beats.push({ t: t - rr * 0.38, kind: 'w', amp: 1.5, qt: 0.42 });
          } else {
            beats.push({ t, kind: 'n', amp: 1.1, qt: qtFor(rr), tAmp: 0.27 });
            ps.push({ t: t - 0.16, amp: 0.13 });
          }
          t += rr; k++;
        }
        break;
      }
      case 'vf': {
        const coarse = opts.fine ? 0.35 : 0.75 + rnd() * 0.3;
        bg = t => coarse * (0.55 * Math.sin(TAU * 4.3 * t + phases[0] + 0.8 * Math.sin(TAU * 0.37 * t))
          + 0.35 * Math.sin(TAU * 6.1 * t + phases[1]) + 0.25 * Math.sin(TAU * 2.9 * t + phases[2]))
          * (0.6 + 0.4 * Math.sin(TAU * 0.23 * t + phases[3]));
        break;
      }
      case 'torsades': {
        bg = t => 0.95 * Math.sin(TAU * 3.7 * t + phases[0]) * (0.25 + 0.75 * Math.abs(Math.sin(TAU * t / 3.4 + phases[1])))
          + 0.15 * Math.sin(TAU * 7.4 * t + phases[2]);
        break;
      }
      case 'asystole': break;
      default: regular(70);
    }
    return { type, beats, ps, bg, dur, wander: [rnd() * TAU, 0.25 + rnd() * 0.2], noise: rnd() * 1000 };
  }

  // Комплекс QRS-T относительно момента начала QRS (x = t − beat.t).
  function qrst(x, b) {
    if (x < -0.08 || x > 0.85) return 0;
    let v = 0;
    if (b.pace) v += 2.2 * g(x, -0.03, 0.0025);
    if (b.kind === 'w') {
      v += b.amp * g(x, 0.07, 0.034) - 0.45 * g(x, 0.15, 0.03);
      v += -0.38 * g(x, (b.qt || 0.42) - 0.1, 0.065);
    } else {
      const wide = b.wideish ? 1.5 : 1;
      if (b.delta) v += 0.42 * g(x, -0.012, 0.024);
      v += -0.08 * g(x, 0.005, 0.008 * wide);
      v += b.amp * g(x, 0.036, 0.0115 * wide);
      v += -0.22 * g(x, 0.068 * (b.wideish ? 1.15 : 1), 0.0105 * wide);
      const qt = b.qt || 0.38;
      const tc = qt - 0.085 * (b.tWide || 1);
      if (b.peaked) v += b.tAmp * g(x, tc - 0.02, 0.026);
      else v += (b.tAmp || 0.28) * g(x, tc, 0.045 * (b.tWide || 1));
      if (b.st) v += b.st * smooth(x, 0.07, 0.1) * (1 - smooth(x, tc + 0.02, tc + 0.09));
    }
    return v;
  }

  // Индекс первого элемента с t ≥ x (массивы отсортированы по времени).
  function lower(arr, x) {
    let lo = 0, hi = arr.length;
    while (lo < hi) { const m = (lo + hi) >> 1; if (arr[m].t < x) lo = m + 1; else hi = m; }
    return lo;
  }

  function value(strip, t) {
    let v = 0.03 * Math.sin(TAU * strip.wander[1] * t + strip.wander[0]);
    v += 0.008 * Math.sin(t * 173.1 + strip.noise) + 0.006 * Math.sin(t * 311.7 + strip.noise * 2);
    const { ps, beats } = strip;
    for (let i = Math.max(0, lower(ps, t - 0.15)); i < ps.length && ps[i].t < t + 0.15; i++) v += ps[i].amp * g(t, ps[i].t + 0.05, 0.022);
    for (let i = Math.max(0, lower(beats, t - 0.85)); i < beats.length && beats[i].t < t + 0.1; i++) v += qrst(t - beats[i].t, beats[i]);
    if (strip.bg) v += strip.bg(t);
    return v;
  }

  // Пульсовая волна (плетизмограмма) — для монитора: запаздывает за QRS примерно на 0,2 с.
  function pleth(strip, t) {
    if (!strip.beats.length || strip.pulseless) return 0.01 * Math.sin(t * 9);
    let v = 0;
    const bs = strip.beats;
    for (let i = Math.max(0, lower(bs, t - 1.2)); i < bs.length && bs[i].t < t; i++) {
      const x = t - bs[i].t - 0.2;
      if (x < 0) continue;
      v += 0.9 * g(x, 0.12, 0.07) + 0.3 * g(x, 0.36, 0.06) + 0.2 * Math.exp(-x * 2.5) * smooth(x, 0.1, 0.3);
    }
    return v;
  }

  function css(name, fallback) {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  }

  function setup(canvas) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.clientWidth || canvas.width, h = canvas.clientHeight || canvas.height;
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    }
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, w, h };
  }

  /* Бумажная лента: сетка 1 мм / 5 мм, 25 мм/с. opts: { seconds, from, calib } */
  function draw(canvas, strip, opts = {}) {
    const { ctx, w, h } = setup(canvas);
    const seconds = opts.seconds || 6;
    const from = opts.from || 0;
    const mm = w / (seconds * 25);
    const pulse = css('--pulse', '#e0464b');
    ctx.fillStyle = css('--surface', '#fff');
    ctx.fillRect(0, 0, w, h);
    ctx.lineWidth = 1;
    ctx.strokeStyle = pulse;
    for (let i = 0, x = 0; x <= w + 1; i++, x = i * mm) {
      ctx.globalAlpha = i % 5 === 0 ? 0.32 : 0.11;
      ctx.beginPath(); ctx.moveTo(Math.round(x) + 0.5, 0); ctx.lineTo(Math.round(x) + 0.5, h); ctx.stroke();
    }
    const mid = Math.round(h * 0.58 / mm / 5) * 5 * mm;
    for (let i = -Math.ceil(mid / mm); mid + i * mm <= h + 1; i++) {
      const y = mid + i * mm;
      if (y < 0) continue;
      ctx.globalAlpha = i % 5 === 0 ? 0.32 : 0.11;
      ctx.beginPath(); ctx.moveTo(0, Math.round(y) + 0.5); ctx.lineTo(w, Math.round(y) + 0.5); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.strokeStyle = css('--ink', '#0f1f1c');
    ctx.lineWidth = Math.max(1.4, mm * 0.32);
    ctx.lineJoin = 'round';
    ctx.beginPath();
    let x0 = 0;
    if (opts.calib !== false) {
      // Калибровочный импульс 1 мВ = 10 мм
      ctx.moveTo(0, mid); ctx.lineTo(mm, mid); ctx.lineTo(mm, mid - 10 * mm); ctx.lineTo(6 * mm, mid - 10 * mm); ctx.lineTo(6 * mm, mid); ctx.lineTo(8 * mm, mid);
      x0 = 8 * mm;
    }
    for (let px = x0; px <= w; px += 0.75) {
      const t = from + px / (25 * mm);
      const y = mid - value(strip, t) * 10 * mm;
      if (px === x0) ctx.moveTo(px, y); else ctx.lineTo(px, y);
    }
    ctx.stroke();
    if (opts.label) {
      ctx.fillStyle = css('--ink-3', '#667a74');
      ctx.font = '600 12px ' + css('--f-mono', 'monospace');
      ctx.fillText(opts.label, 10 * mm, 14);
    }
  }

  /* Прикроватный монитор с бегущей развёрткой.
     monitor(canvas, { strip, speed, plethStrip }) → { set(strip), stop() } */
  function monitor(canvas, init = {}) {
    let strip = init.strip || build('sinus', { duration: 600 });
    let stripStart = 0;      // время монитора, с которого началась текущая полоса
    let raf = 0, last = 0, now = 0, lastX = 0;
    const seconds = init.seconds || 5;
    const showPleth = init.pleth !== false;
    const colors = () => ({ bg: css('--mon-bg', '#06110f'), ecg: '#3ef0a0', pl: '#56c8ff', grid: 'rgba(80,200,160,.08)' });
    let col = colors();
    let ctx, w, h;
    const resize = () => { ({ ctx, w, h } = setup(canvas)); col = colors(); ctx.fillStyle = col.bg; ctx.fillRect(0, 0, w, h); lastX = 0; };
    resize();
    const ro = window.ResizeObserver ? new ResizeObserver(resize) : null;
    if (ro) ro.observe(canvas);

    const ecgY = v => (showPleth ? h * 0.42 : h * 0.6) - v * (showPleth ? h * 0.22 : h * 0.32);
    const plY = v => h * 0.93 - v * h * 0.2;
    let prev = null;

    function frame(ts) {
      if (!document.body.contains(canvas)) { stop(); return; }
      if (!last) last = ts;
      const dt = Math.min(0.1, (ts - last) / 1000);
      last = ts;
      const t0 = now; now += dt;
      const pxPerSec = w / seconds;
      const xFrom = (t0 * pxPerSec) % w, xTo = (now * pxPerSec) % w;
      const span = xTo >= xFrom ? xTo - xFrom : xTo + w - xFrom;
      // Стираем «окно» впереди луча
      ctx.fillStyle = col.bg;
      const clearW = 14;
      if (xTo + clearW <= w) ctx.fillRect(xTo, 0, clearW, h);
      else { ctx.fillRect(xTo, 0, w - xTo, h); ctx.fillRect(0, 0, clearW - (w - xTo), h); }
      ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      const steps = Math.max(1, Math.ceil(span / 1.5));
      for (let k = 1; k <= steps; k++) {
        const tt = t0 + (now - t0) * k / steps;
        const x = (tt * pxPerSec) % w;
        const st = tt - stripStart;
        const ve = value(strip, st), vp = pleth(strip, st);
        if (prev && x > prev.x) {
          ctx.strokeStyle = col.ecg;
          ctx.beginPath(); ctx.moveTo(prev.x, ecgY(prev.e)); ctx.lineTo(x, ecgY(ve)); ctx.stroke();
          if (showPleth) {
            ctx.strokeStyle = col.pl;
            ctx.beginPath(); ctx.moveTo(prev.x, plY(prev.p)); ctx.lineTo(x, plY(vp)); ctx.stroke();
          }
        }
        prev = { x, e: ve, p: vp };
      }
      raf = requestAnimationFrame(frame);
    }
    function stop() { cancelAnimationFrame(raf); if (ro) ro.disconnect(); }
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      // Без анимации: просто рисуем статичную полосу
      for (let px = 0; px < w; px += 1.5) {
        const tt = px / (w / seconds);
        const ve = value(strip, tt), vp = pleth(strip, tt);
        if (prev) {
          ctx.strokeStyle = col.ecg; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(prev.x, ecgY(prev.e)); ctx.lineTo(px, ecgY(ve)); ctx.stroke();
          if (showPleth) { ctx.strokeStyle = col.pl; ctx.beginPath(); ctx.moveTo(prev.x, plY(prev.p)); ctx.lineTo(px, plY(vp)); ctx.stroke(); }
        }
        prev = { x: px, e: ve, p: vp };
      }
    } else raf = requestAnimationFrame(frame);

    return {
      set(next) { strip = next; stripStart = now; },
      get strip() { return strip; },
      stop,
      repaint() { resize(); }
    };
  }

  MED.ecg = { RHYTHMS, build, draw, monitor, value, rhythm: id => RHYTHMS.find(r => r.id === id) };
})();
