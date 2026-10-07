#!/usr/bin/env node
/* Проверка целостности контента: id, ответы тестов, ссылки на уроки, термины глоссария.
   Запуск: node tools/validate.js */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m => m[1]).filter(s => s.startsWith('data/') || /core|ecg-engine/.test(s));
const ctx = { window: {}, console };
ctx.window = ctx;
vm.createContext(ctx);
for (const s of scripts) vm.runInContext(fs.readFileSync(path.join(root, s), 'utf8'), ctx, { filename: s });
const MED = ctx.MED;
const errors = [];
const err = m => errors.push(m);

const lessons = MED.allLessons();
const ids = new Set();
lessons.forEach(l => { if (ids.has(l.id)) err('Дубликат урока ' + l.id); ids.add(l.id); });
const lessonIds = new Set(lessons.map(l => l.id));
let qn = 0;
lessons.forEach(l => {
  if (!l.quiz || l.quiz.length < 3) err(`${l.id}: мало вопросов`);
  l.quiz.forEach((q, i) => {
    qn++;
    const ans = Array.isArray(q.answer) ? q.answer : [q.answer];
    ans.forEach(a => { if (a < 0 || a >= q.options.length) err(`${l.id}#${i}: ответ вне диапазона`); });
    if (new Set(q.options).size !== q.options.length) err(`${l.id}#${i}: повтор вариантов`);
  });
  for (const m of l.content.matchAll(/href="#\/lesson\/([^"#]+)"/g)) if (!lessonIds.has(m[1])) err(`${l.id}: ссылка на несуществующий урок ${m[1]}`);
});

// Термины в тексте
const allText = lessons.map(l => l.content).join('\n') + MED.cases.map(c => c.intro + c.debrief + c.stages.map(s => (s.text || '') + s.question).join('')).join('');
for (const m of allText.matchAll(/<span class="t"(?: data-t="([^"]+)")?>([^<]+)<\/span>/g)) {
  const key = m[1] || m[2];
  if (!MED.term(key)) err('Нет термина в глоссарии: ' + key);
}
// Болезни
const dz = new Set(MED.diseases.map(d => d.id));
MED.diseases.forEach(d => { if (d.lesson && !lessonIds.has(d.lesson)) err(`Болезнь ${d.id}: нет урока ${d.lesson}`); });
MED.drugs.forEach(d => { if (d.lesson && !lessonIds.has(d.lesson)) err(`Препарат ${d.id}: нет урока ${d.lesson}`); });
MED.organs.forEach(o => (o.diseases || []).forEach(x => { if (!dz.has(x)) err(`Орган ${o.id}: нет болезни ${x}`); }));
MED.riddles.forEach(r => { if (r.disease && !dz.has(r.disease)) err(`Загадка ${r.id}: нет болезни ${r.disease}`); if (r.options.includes(r.answer)) err(`Загадка ${r.id}: ответ среди дистракторов`); });
MED.cases.forEach(c => {
  (c.links || []).forEach(x => { if (!lessonIds.has(x)) err(`Случай ${c.id}: нет урока ${x}`); });
  (c.diseases || []).forEach(x => { if (!dz.has(x)) err(`Случай ${c.id}: нет болезни ${x}`); });
  c.stages.forEach((s, i) => { if (!s.options.some(o => o.score === 3)) err(`Случай ${c.id} шаг ${i + 1}: нет лучшего ответа`); });
});
MED.sims.forEach(s => (s.links || []).forEach(x => { if (!lessonIds.has(x)) err(`Симулятор ${s.id}: нет урока ${x}`); }));
MED.labCases.forEach(c => c.panel.forEach(([id]) => { if (!MED.labs.some(l => l.id === id)) err(`Анализ ${c.id}: нет показателя ${id}`); }));
MED.termTasks.forEach(([d, parts]) => parts.forEach(p => { if (!MED.roots.some(r => r.id === p)) err(`Термин «${d}»: нет корня ${p}`); }));
// Дубликаты id и терминов во всех справочниках (контент разнесён по нескольким файлам)
const dupCheck = (arr, key, name) => { const seen = new Set(); (arr || []).forEach(x => { const k = String(key(x)).toLowerCase(); if (seen.has(k)) err(`Дубликат ${name}: ${k}`); seen.add(k); }); };
dupCheck(MED.glossary, t => t.term, 'термина');
dupCheck(MED.diseases, d => d.id, 'болезни');
dupCheck(MED.drugs, d => d.id, 'препарата');
dupCheck(MED.cases, c => c.id, 'случая');
dupCheck(MED.sims, s => s.id, 'сценария');
dupCheck(MED.riddles, r => r.id, 'загадки');
dupCheck(MED.labs, l => l.id, 'показателя');
dupCheck(MED.labCases, l => l.id, 'задачи по анализам');
dupCheck(MED.mnemonics, m => m.id || m.title, 'мнемоники');
dupCheck(MED.myths, m => m.id, 'мифа');
dupCheck(MED.triage, m => m.id, 'пациента сортировки');
(MED.pairSets || []).forEach(ps => { dupCheck(ps.pairs, p => p[0], 'пары в наборе ' + ps.id); if (ps.pairs.length < 8) err(`Набор пар ${ps.id}: меньше 8 пар`); });
(MED.triage || []).forEach(t => { if (![1, 2, 3, 4, 5].includes(t.level)) err(`Сортировка ${t.id}: уровень вне 1–5`); });
(MED.myths || []).forEach(m => { if (typeof m.truth !== 'boolean') err(`Миф ${m.id}: нет truth`); });
// ECG-канвасы
for (const m of allText.matchAll(/data-ecg="([^"]+)"/g)) if (!MED.ecg.rhythm(m[1])) err('Нет ритма ЭКГ ' + m[1]);

console.log(`Мифов ${(MED.myths || []).length}, сортировка ${(MED.triage || []).length}, наборов пар ${(MED.pairSets || []).length}, мнемоник ${MED.mnemonics.length}`);
console.log(`Уроков ${lessons.length}, вопросов ${qn}, случаев ${MED.cases.length}, сценариев ${MED.sims.length}, терминов ${MED.glossary.length}, болезней ${MED.diseases.length}, препаратов ${MED.drugs.length}, анализов ${MED.labs.length}/${MED.labCases.length}, загадок ${MED.riddles.length}, ритмов ${MED.ecg.RHYTHMS.length}`);
if (errors.length) { console.log(errors.join('\n')); process.exit(1); }
console.log('OK');
