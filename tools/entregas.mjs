#!/usr/bin/env node
// Delivery register of Why Humanoid? (ops/entregas, outside the published site).
// Every piece of work that finishes, is blocked or ends with nothing new gets one immutable close
// (cierre) with a stable id. Codex reads the register to tell Javier about new closes without repeating
// them. Delivery and notice states are never written by the agent that did the work: Codex or Javier
// confirm them in ops/entregas/confirmaciones/. Protocol: ops/entregas/README.md.
//
//   node tools/entregas.mjs nuevo --desde <borrador.json>      create a close (id and Madrid time assigned here)
//   node tools/entregas.mjs informe <id>                       print the close as the Spanish report for the chat
//   node tools/entregas.mjs pendientes [--tipo aviso-codex|entrega-usuario] [--json]
//                                                             closes still without that confirmation
//   node tools/entregas.mjs confirmar <id> --tipo <tipo> --por <actor> --evidencia <texto>
//                                                             record a confirmation given by Codex or Javier
//   node tools/entregas.mjs --check [--base <git ref>]         validate the register (and, with a base, that
//                                                             no existing close or confirmation was changed)

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ZONA = 'Europe/Madrid';
export const ESTADOS = ['completado', 'bloqueado', 'sin_novedades'];
export const TIPOS = ['aviso-codex', 'entrega-usuario'];
const ID = /^WH-(\d{8})-(\d{4})-([a-z0-9]+(?:-[a-z0-9]+)*)$/;
const CAMPOS = ['id', 'tarea', 'origen', 'fecha', 'zona', 'estado', 'ejecuta', 'cambios', 'urls', 'despliegue', 'verificaciones', 'pendientes', 'siguiente_accion'];
const OPCIONALES = ['corrige'];
const LISTAS = ['cambios', 'despliegue', 'verificaciones', 'pendientes'];
// Content that must never reach the register: workbook or Drive links, e-mail addresses, credentials.
const PROHIBIDO = [
  [/docs\.google\.com|drive\.google\.com/i, 'enlace a Google Docs o Drive'],
  [/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/, 'dirección de correo'],
  [/\b(?:sk|rk|pk)_(?:live|test)_[A-Za-z0-9]{8,}|\bwhsec_[A-Za-z0-9]{8,}|\bre_[A-Za-z0-9]{16,}|\bAKIA[0-9A-Z]{16}\b|\bgh[pousr]_[A-Za-z0-9]{20,}|-----BEGIN [A-Z ]*PRIVATE KEY/, 'credencial o clave'],
];

const repo = fileURLToPath(new URL('../', import.meta.url));
export const dirs = (raiz = join(repo, 'ops/entregas')) => ({ raiz, cierres: join(raiz, 'cierres'), confirmaciones: join(raiz, 'confirmaciones') });

// Wall-clock parts in Madrid for an instant, with the offset in force then (+01:00 in winter, +02:00 in summer).
export function madrid(date = new Date()) {
  const f = new Intl.DateTimeFormat('en-GB', {
    timeZone: ZONA, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23', timeZoneName: 'longOffset',
  });
  const p = Object.fromEntries(f.formatToParts(date).map((x) => [x.type, x.value]));
  const off = p.timeZoneName === 'GMT' ? '+00:00' : p.timeZoneName.slice(3);
  return { ...p, off, iso: `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}${off}` };
}

export const slugify = (s) => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40).replace(/-+$/, '');

const leer = (f) => JSON.parse(readFileSync(f, 'utf8'));
const jsonDe = (dir) => (existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.json')).sort() : []);

export function cargar(d = dirs()) {
  const cierres = jsonDe(d.cierres).map((f) => ({ fichero: f, datos: leer(join(d.cierres, f)) }));
  const confirmaciones = jsonDe(d.confirmaciones).map((f) => ({ fichero: f, datos: leer(join(d.confirmaciones, f)) }));
  return { cierres, confirmaciones };
}

function revisarTexto(valor, donde, errores) {
  const texto = JSON.stringify(valor);
  for (const [re, que] of PROHIBIDO) if (re.test(texto)) errores.push(`${donde}: contiene ${que}`);
}

export function validarCierre(c, fichero = `${c?.id}.json`) {
  const e = [];
  const donde = `cierres/${fichero}`;
  if (!c || typeof c !== 'object' || Array.isArray(c)) return [`${donde}: no es un objeto JSON`];
  for (const k of CAMPOS) if (!(k in c)) e.push(`${donde}: falta el campo ${k}`);
  for (const k of Object.keys(c)) if (!CAMPOS.includes(k) && !OPCIONALES.includes(k)) e.push(`${donde}: campo no previsto ${k} (los avisos y entregas se confirman aparte)`);
  const m = ID.exec(c.id ?? '');
  if (!m) e.push(`${donde}: id con formato inválido (WH-AAAAMMDD-HHMM-slug)`);
  if (`${c.id}.json` !== fichero) e.push(`${donde}: el id no coincide con el nombre del fichero`);
  if (c.zona !== ZONA) e.push(`${donde}: zona debe ser ${ZONA}`);
  const instante = new Date(c.fecha);
  if (typeof c.fecha !== 'string' || Number.isNaN(instante.getTime()) || madrid(instante).iso !== c.fecha) {
    e.push(`${donde}: fecha debe ser la hora de Madrid con su desfase, AAAA-MM-DDTHH:MM:SS+01:00 o +02:00`);
  } else if (m) {
    const p = madrid(instante);
    if (`${p.year}${p.month}${p.day}` !== m[1] || `${p.hour}${p.minute}` !== m[2]) e.push(`${donde}: el id no corresponde a la fecha del cierre`);
  }
  if (!ESTADOS.includes(c.estado)) e.push(`${donde}: estado debe ser ${ESTADOS.join(', ')}`);
  for (const k of ['tarea', 'origen', 'ejecuta', 'siguiente_accion']) if (typeof c[k] !== 'string' || !c[k].trim()) e.push(`${donde}: ${k} vacío`);
  for (const k of LISTAS) if (!Array.isArray(c[k]) || c[k].some((x) => typeof x !== 'string' || !x.trim())) e.push(`${donde}: ${k} debe ser una lista de textos`);
  for (const k of ['despliegue', 'verificaciones']) if (Array.isArray(c[k]) && !c[k].length) e.push(`${donde}: ${k} no puede estar vacío (si no aplica, dilo y por qué)`);
  if (c.estado === 'completado' && Array.isArray(c.cambios) && !c.cambios.length) e.push(`${donde}: un cierre completado debe listar sus cambios`);
  if (c.estado === 'bloqueado' && Array.isArray(c.pendientes) && !c.pendientes.length) e.push(`${donde}: un cierre bloqueado debe listar qué queda pendiente`);
  if (!Array.isArray(c.urls) || c.urls.some((u) => !u || typeof u.etiqueta !== 'string' || !u.etiqueta.trim() || !/^https:\/\/\S+$/.test(u.url ?? ''))) {
    e.push(`${donde}: urls debe ser una lista de { etiqueta, url https }`);
  }
  if ('corrige' in c && !ID.test(c.corrige ?? '')) e.push(`${donde}: corrige debe ser el id de otro cierre`);
  revisarTexto(c, donde, e);
  return e;
}

export function validarConfirmacion(x, fichero, ids) {
  const e = [];
  const donde = `confirmaciones/${fichero}`;
  if (!x || typeof x !== 'object') return [`${donde}: no es un objeto JSON`];
  const campos = ['id', 'tipo', 'fecha', 'por', 'evidencia'];
  for (const k of campos) if (typeof x[k] !== 'string' || !x[k].trim()) e.push(`${donde}: falta ${k}`);
  for (const k of Object.keys(x)) if (!campos.includes(k)) e.push(`${donde}: campo no previsto ${k}`);
  if (!TIPOS.includes(x.tipo)) e.push(`${donde}: tipo debe ser ${TIPOS.join(' o ')}`);
  if (`${x.id}.${x.tipo}.json` !== fichero) e.push(`${donde}: el nombre debe ser <id>.<tipo>.json`);
  if (!ids.has(x.id)) e.push(`${donde}: no existe el cierre ${x.id}`);
  if (/^claude\b/i.test(x.por ?? '')) e.push(`${donde}: Claude no puede confirmar avisos ni entregas; confirma Codex o Javier`);
  const t = new Date(x.fecha);
  if (Number.isNaN(t.getTime()) || !/[+-]\d\d:\d\d$|Z$/.test(x.fecha ?? '')) e.push(`${donde}: fecha ISO con desfase`);
  revisarTexto(x, donde, e);
  return e;
}

export function validar(d = dirs()) {
  const errores = [];
  let datos;
  try {
    datos = cargar(d);
  } catch (err) {
    return { errores: [`JSON ilegible: ${err.message}`], cierres: 0, confirmaciones: 0 };
  }
  const ids = new Set();
  const minus = new Set();
  for (const { fichero, datos: c } of datos.cierres) {
    errores.push(...validarCierre(c, fichero));
    if (ids.has(c.id) || minus.has(String(c.id).toLowerCase())) errores.push(`cierres/${fichero}: id repetido`);
    ids.add(c.id);
    minus.add(String(c.id).toLowerCase());
  }
  for (const { datos: c, fichero } of datos.cierres) if (c.corrige && !ids.has(c.corrige)) errores.push(`cierres/${fichero}: corrige un cierre que no existe`);
  for (const { fichero, datos: x } of datos.confirmaciones) errores.push(...validarConfirmacion(x, fichero, ids));
  return { errores, cierres: datos.cierres.length, confirmaciones: datos.confirmaciones.length };
}

// Closes and confirmations are append-only: compared with a base commit, none may be modified or deleted.
export function inmutables(base, cwd = repo) {
  try {
    execFileSync('git', ['cat-file', '-e', `${base}^{commit}`], { cwd, stdio: 'ignore' });
  } catch {
    return { errores: [], aviso: `base ${base} no disponible; no se comprueba la inmutabilidad` };
  }
  const out = execFileSync('git', ['diff', '--name-status', '--no-renames', base, 'HEAD', '--', 'ops/entregas/cierres', 'ops/entregas/confirmaciones'], { cwd }).toString();
  const errores = out.split('\n').filter(Boolean).map((l) => l.split('\t')).filter(([s]) => s !== 'A').map(([s, f]) => `${f}: ${s === 'D' ? 'borrado' : 'modificado'}; los cierres no se editan, se corrigen con un cierre nuevo (campo corrige)`);
  return { errores };
}

export function estadoAvisos(id, d = dirs()) {
  const r = {};
  for (const t of TIPOS) {
    const f = join(d.confirmaciones, `${id}.${t}.json`);
    r[t] = existsSync(f) ? leer(f) : null;
  }
  return r;
}

const fechaLegible = (iso) => {
  const p = madrid(new Date(iso));
  return `${p.day}/${p.month}/${p.year} ${p.hour}:${p.minute} (${ZONA}, UTC${p.off})`;
};
const lista = (xs, vacio = 'Ninguno.') => (xs.length ? xs.map((x) => `- ${x}`).join('\n') : `- ${vacio}`);

export function informe(c, avisos = { 'aviso-codex': null, 'entrega-usuario': null }) {
  const conf = (x, quien) => (x ? `confirmado por ${x.por} el ${fechaLegible(x.fecha)}` : `pendiente de confirmación de ${quien}`);
  // Metadata as a table: no "Label: Value" lines, so the house style (lower case after a colon) holds.
  const celda = (s) => String(s).replace(/\|/g, '\\|').replace(/\n/g, ' ');
  return [
    `## Cierre ${c.id}`,
    '',
    '| Campo | Valor |',
    '|---|---|',
    `| Tarea | ${celda(c.tarea)} |`,
    `| Fecha | ${fechaLegible(c.fecha)} |`,
    `| Estado | ${c.estado.replace('_', ' ')} |`,
    `| Origen | ${celda(c.origen)} |`,
    `| Ejecuta | ${celda(c.ejecuta)} |`,
    ...(c.corrige ? [`| Corrige | ${c.corrige} |`] : []),
    '',
    '### Cambios',
    lista(c.cambios, 'Sin cambios.'),
    '',
    '### URLs',
    lista(c.urls.map((u) => `${u.etiqueta}: ${u.url}`), 'Sin URLs.'),
    '',
    '### Evidencia de despliegue',
    lista(c.despliegue),
    '',
    '### Verificaciones',
    lista(c.verificaciones),
    '',
    '### Pendientes',
    lista(c.pendientes),
    '',
    '### Siguiente acción',
    c.siguiente_accion,
    '',
    '### Avisos',
    `- Aviso de Codex a Javier: ${conf(avisos['aviso-codex'], 'Codex')}`,
    `- Entrega a Javier: ${conf(avisos['entrega-usuario'], 'Javier')}`,
  ].join('\n');
}

export function nuevo(borrador, { d = dirs(), ahora = new Date() } = {}) {
  const { slug, ...resto } = borrador;
  const asignados = ['id', 'fecha', 'zona'].filter((k) => k in resto);
  if (asignados.length) throw new Error(`${asignados.join(', ')} los asigna la herramienta; quítalos del borrador`);
  const extra = Object.keys(resto).filter((k) => !CAMPOS.includes(k) && !OPCIONALES.includes(k));
  if (extra.length) throw new Error(`campos no previstos en el borrador: ${extra.join(', ')}`);
  const s = slugify(slug || borrador.tarea || '');
  if (!s) throw new Error('el borrador necesita slug o tarea');
  const p = madrid(ahora);
  const base = `WH-${p.year}${p.month}${p.day}-${p.hour}${p.minute}-${s}`;
  let id = base;
  for (let n = 2; existsSync(join(d.cierres, `${id}.json`)); n += 1) id = `${base}-${n}`;
  const c = { id, ...Object.fromEntries(CAMPOS.filter((k) => k !== 'id').map((k) => [k, resto[k]])), ...(resto.corrige ? { corrige: resto.corrige } : {}) };
  c.fecha = p.iso;
  c.zona = ZONA;
  const errores = validarCierre(c, `${id}.json`);
  if (errores.length) throw new Error(`cierre no válido:\n${errores.join('\n')}`);
  mkdirSync(d.cierres, { recursive: true });
  writeFileSync(join(d.cierres, `${id}.json`), `${JSON.stringify(c, null, 2)}\n`);
  return c;
}

export function confirmar(id, { tipo, por, evidencia }, { d = dirs(), ahora = new Date() } = {}) {
  const f = join(d.confirmaciones, `${id}.${tipo}.json`);
  if (existsSync(f)) throw new Error(`${id} ya tiene confirmación de ${tipo}; no se duplica`);
  const x = { id, tipo, fecha: madrid(ahora).iso, por, evidencia };
  const ids = new Set(cargar(d).cierres.map((c) => c.datos.id));
  const errores = validarConfirmacion(x, `${id}.${tipo}.json`, ids);
  if (errores.length) throw new Error(errores.join('\n'));
  mkdirSync(d.confirmaciones, { recursive: true });
  writeFileSync(f, `${JSON.stringify(x, null, 2)}\n`);
  return x;
}

export function pendientes(tipo = 'aviso-codex', d = dirs()) {
  return cargar(d).cierres.map((c) => c.datos).filter((c) => !existsSync(join(d.confirmaciones, `${c.id}.${tipo}.json`)))
    .map((c) => ({ id: c.id, fecha: c.fecha, estado: c.estado, tarea: c.tarea, fichero: `ops/entregas/cierres/${c.id}.json` }));
}

function opcion(args, nombre) {
  const i = args.indexOf(`--${nombre}`);
  return i >= 0 ? args[i + 1] : undefined;
}

function main(args) {
  const [orden, arg] = args;
  if (orden === '--check' || args.includes('--check')) {
    const r = validar();
    const base = opcion(args, 'base');
    const inm = base ? inmutables(base) : { errores: [] };
    if (inm.aviso) console.log(inm.aviso);
    const errores = [...r.errores, ...inm.errores];
    if (errores.length) {
      console.error(`Registro de entregas no válido:\n${errores.map((x) => `  ${x}`).join('\n')}`);
      process.exit(1);
    }
    console.log(`Registro de entregas válido: ${r.cierres} cierres, ${r.confirmaciones} confirmaciones${base && !inm.aviso ? ', ninguno modificado' : ''}.`);
    return;
  }
  if (orden === 'nuevo') {
    const desde = opcion(args, 'desde');
    if (!desde) throw new Error('uso: nuevo --desde <borrador.json>');
    const c = nuevo(leer(desde));
    console.log(`Creado ops/entregas/cierres/${c.id}.json\n`);
    console.log(informe(c));
    return;
  }
  if (orden === 'informe') {
    const f = join(dirs().cierres, `${arg}.json`);
    if (!existsSync(f)) throw new Error(`no existe el cierre ${arg}`);
    console.log(informe(leer(f), estadoAvisos(arg)));
    return;
  }
  if (orden === 'pendientes') {
    const tipo = opcion(args, 'tipo') ?? 'aviso-codex';
    if (!TIPOS.includes(tipo)) throw new Error(`tipo debe ser ${TIPOS.join(' o ')}`);
    const r = pendientes(tipo);
    if (args.includes('--json')) console.log(JSON.stringify(r, null, 2));
    else console.log(r.length ? r.map((c) => `${c.id}  ${c.estado}  ${c.tarea}`).join('\n') : `Sin cierres pendientes de ${tipo}.`);
    return;
  }
  if (orden === 'confirmar') {
    const x = confirmar(arg, { tipo: opcion(args, 'tipo'), por: opcion(args, 'por'), evidencia: opcion(args, 'evidencia') });
    console.log(`Confirmado ${x.tipo} de ${x.id} por ${x.por}.`);
    return;
  }
  console.error('uso: node tools/entregas.mjs nuevo --desde <borrador.json> | informe <id> | pendientes [--tipo t] [--json] | confirmar <id> --tipo t --por actor --evidencia texto | --check [--base ref]');
  process.exit(2);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    main(process.argv.slice(2));
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}
