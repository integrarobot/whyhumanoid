// Tests of the delivery register (tools/entregas.mjs). Run: node --test tools/test-entregas.mjs
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { confirmar, dirs, estadoAvisos, informe, madrid, nuevo, pendientes, validar } from './entregas.mjs';

const borrador = (extra = {}) => ({
  slug: 'Prueba de cierre',
  tarea: 'Tarea de prueba',
  origen: 'Prueba automática',
  estado: 'completado',
  ejecuta: 'claude/test',
  cambios: ['Un cambio'],
  urls: [{ etiqueta: 'Web', url: 'https://whyhumanoid.com/' }],
  despliegue: ['No aplica: prueba'],
  verificaciones: ['Prueba'],
  pendientes: [],
  siguiente_accion: 'Ninguna.',
  ...extra,
});
const tmp = () => dirs(mkdtempSync(join(tmpdir(), 'entregas-')));
const invierno = new Date('2026-11-16T14:40:05Z');
const verano = new Date('2026-07-01T10:05:00Z');

test('Madrid time uses the offset in force (CET and CEST)', () => {
  assert.equal(madrid(invierno).iso, '2026-11-16T15:40:05+01:00');
  assert.equal(madrid(verano).iso, '2026-07-01T12:05:00+02:00');
});

test('a new close gets a stable id from Madrid time and a slug, and validates', () => {
  const d = tmp();
  const c = nuevo(borrador(), { d, ahora: invierno });
  assert.equal(c.id, 'WH-20261116-1540-prueba-de-cierre');
  assert.equal(c.zona, 'Europe/Madrid');
  assert.deepEqual(validar(d).errores, []);
  const c2 = nuevo(borrador(), { d, ahora: invierno });
  assert.equal(c2.id, 'WH-20261116-1540-prueba-de-cierre-2', 'same minute and slug never reuse an id');
  assert.deepEqual(validar(d).errores, []);
});

test('the report is Spanish, complete and shows notices as pending', () => {
  const d = tmp();
  const c = nuevo(borrador(), { d, ahora: invierno });
  const r = informe(c, estadoAvisos(c.id, d));
  for (const s of ['## Cierre WH-20261116-1540-prueba-de-cierre', '16/11/2026 15:40 (Europe/Madrid, UTC+01:00)', '### Evidencia de despliegue', '### Siguiente acción', 'pendiente de confirmación de Codex', 'pendiente de confirmación de Javier']) {
    assert.ok(r.includes(s), s);
  }
  assert.ok(!r.includes('—') && !r.includes('–'), 'no long dashes');
});

test('drafts cannot set id, time or delivery state, and incomplete closes are refused', () => {
  const d = tmp();
  assert.throws(() => nuevo(borrador({ id: 'WH-20260101-0000-x' }), { d }), /los asigna la herramienta/);
  assert.throws(() => nuevo(borrador({ entregado: true }), { d }), /no previstos/);
  assert.throws(() => nuevo(borrador({ estado: 'hecho' }), { d }), /estado debe ser/);
  assert.throws(() => nuevo(borrador({ verificaciones: [] }), { d }), /verificaciones no puede estar vacío/);
  assert.throws(() => nuevo(borrador({ estado: 'bloqueado', pendientes: [] }), { d }), /bloqueado debe listar/);
  assert.throws(() => nuevo(borrador({ urls: [{ etiqueta: 'Libro', url: 'https://drive.google.com/drive/folders/x' }] }), { d }), /Google Docs o Drive/);
  assert.throws(() => nuevo(borrador({ origen: 'Correo de alguien@example.com' }), { d }), /correo/);
  assert.equal(validar(d).cierres, 0);
});

test('validation catches edited ids, wrong offsets and delivery flags written into a close', () => {
  const d = tmp();
  const c = nuevo(borrador(), { d, ahora: invierno });
  const f = join(d.cierres, `${c.id}.json`);
  const orig = readFileSync(f, 'utf8');
  writeFileSync(f, orig.replace('+01:00', '+02:00'));
  assert.match(validar(d).errores.join('\n'), /hora de Madrid/);
  writeFileSync(f, JSON.stringify({ ...JSON.parse(orig), aviso_codex: true }));
  assert.match(validar(d).errores.join('\n'), /campo no previsto aviso_codex/);
  writeFileSync(f, JSON.stringify({ ...JSON.parse(orig), id: 'WH-20261116-1541-otro' }));
  assert.match(validar(d).errores.join('\n'), /no coincide con el nombre/);
});

test('confirmations come from Codex or Javier, once per type, and drive the pending list', () => {
  const d = tmp();
  const c = nuevo(borrador(), { d, ahora: invierno });
  assert.deepEqual(pendientes('aviso-codex', d).map((x) => x.id), [c.id]);
  assert.throws(() => confirmar(c.id, { tipo: 'aviso-codex', por: 'claude/opus-5.5', evidencia: 'yo' }, { d }), /Claude no puede confirmar/);
  assert.throws(() => confirmar('WH-20261116-1540-no-existe', { tipo: 'aviso-codex', por: 'codex', evidencia: 'x' }, { d }), /no existe el cierre/);
  confirmar(c.id, { tipo: 'aviso-codex', por: 'codex', evidencia: 'Aviso enviado a Javier' }, { d, ahora: invierno });
  assert.throws(() => confirmar(c.id, { tipo: 'aviso-codex', por: 'codex', evidencia: 'otra vez' }, { d }), /no se duplica/);
  assert.deepEqual(pendientes('aviso-codex', d), []);
  assert.deepEqual(pendientes('entrega-usuario', d).map((x) => x.id), [c.id]);
  assert.match(informe(c, estadoAvisos(c.id, d)), /Aviso de Codex a Javier: confirmado por codex/);
  assert.deepEqual(validar(d).errores, []);
});
