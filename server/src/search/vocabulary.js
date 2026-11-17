// Common tags for the 13 categories (Javier, 17 Nov 2026): one controlled vocabulary, taken only from fields the sheet
// already has. Nothing is inferred from free text: a value outside the lists below gets no tag (the import counts
// it and tools/search-tags.mjs --from <export> lists it privately for review). Two countries are kept apart: where a
// company is based (hq) and where a deployment takes place (site). Deployment status is not product maturity: the
// sheet has no product-maturity field, so there is no maturity tag. Public words only: no premium content here.

import { norm } from './normalize.js';

export const FACETS = [
  ['sector', 'Sector'],
  ['task', 'Task'],
  ['site', 'Deployment country'],
  ['hq', 'Company country'],
  ['type', 'Type or role'],
  ['status', 'Deployment status'],
  ['evidence', 'Evidence level'],
  ['platform', 'Robot platform'],
];
export const FACET_LABELS = Object.fromEntries(FACETS);

const SECTORS = {
  automotive: 'Automotive', electronics: 'Electronics', batteries: 'Batteries', manufacturing: 'Manufacturing',
  logistics: 'Logistics and warehousing', retail: 'Retail', healthcare: 'Healthcare', energy: 'Energy and utilities',
  rail: 'Railways', research: 'Research', components: 'Components and sensors',
};
const TASKS = { material_handling: 'Material handling', machine_tending: 'Machine tending', internal_transport: 'Internal transport', assembly: 'Assembly' };
const STATUS = {
  planned: 'Planned (announced)', pilot: 'Pilot', testing: 'Testing', operational: 'Operational (confirmed)',
  vendor_claimed_operational: 'Operational (vendor claim)', unresolved: 'Unresolved',
};
const TYPES = {
  humanoid_robot: 'Humanoid robot', other_robot: 'Other robot', educational_robot: 'Educational robot', robot_model: 'Robot model',
  manufacturer: 'Manufacturer', customer_operator: 'Customer or operator', investor: 'Investor', technology_partner: 'Technology partner',
  integrator: 'Integrator', listed_company: 'Listed company', software: 'Software', world_model: 'World model', dataset: 'Dataset', hardware: 'Hardware',
};
const PLATFORMS = { bipedal: 'Bipedal', wheeled: 'Wheeled', bipedal_or_wheeled: 'Bipedal or wheeled', torso_or_arms: 'Torso or arms' };
const EVIDENCE = Object.fromEntries(['E0', 'E1', 'E2', 'E3', 'E4', 'E5'].map((e) => [e.toLowerCase(), e]));

// Country names as the sheet writes them (English and Spanish), normalised, to one English name.
const COUNTRY_LIST = [
  ['United States', 'united states', 'usa', 'us', 'ee uu', 'eeuu', 'estados unidos'],
  ['United Kingdom', 'united kingdom', 'uk', 'reino unido'],
  ['China', 'china'], ['Germany', 'germany', 'alemania'], ['Japan', 'japan', 'japon'], ['South Korea', 'south korea', 'korea', 'corea del sur'],
  ['Taiwan', 'taiwan'], ['France', 'france', 'francia'], ['Canada', 'canada'], ['Switzerland', 'switzerland', 'suiza'],
  ['Sweden', 'sweden', 'suecia'], ['Finland', 'finland', 'finlandia'], ['Norway', 'norway', 'noruega'], ['Italy', 'italy', 'italia'],
  ['Spain', 'spain', 'espana'], ['Poland', 'poland', 'polonia'], ['Netherlands', 'netherlands', 'paises bajos'], ['Israel', 'israel'],
  ['Australia', 'australia'], ['Brazil', 'brazil', 'brasil'], ['Malaysia', 'malaysia', 'malasia'], ['Türkiye', 'turkiye', 'turkey', 'turquia'],
  ['Uruguay', 'uruguay'], ['Hungary', 'hungary', 'hungria'], ['Hong Kong', 'hong kong'], ['Luxembourg', 'luxembourg', 'luxemburgo'],
  ['Singapore', 'singapore', 'singapur'], ['Vietnam', 'vietnam'], ['India', 'india'], ['Denmark', 'denmark', 'dinamarca'],
  ['Austria', 'austria'], ['Belgium', 'belgium', 'belgica'], ['Portugal', 'portugal'], ['Ireland', 'ireland', 'irlanda'],
];
const COUNTRY = new Map();
const COUNTRY_NAME = {};
for (const [name, ...keys] of COUNTRY_LIST) {
  const slug = norm(name).replace(/ /g, '_');
  COUNTRY_NAME[slug] = name;
  for (const k of keys) COUNTRY.set(k, slug);
}

export function tagLabel(tag) {
  const [facet, value] = tag.split(':');
  const table = { sector: SECTORS, task: TASKS, status: STATUS, type: TYPES, platform: PLATFORMS, evidence: EVIDENCE, hq: COUNTRY_NAME, site: COUNTRY_NAME }[facet];
  return table?.[value] ?? null;
}
export const isKnownTag = (tag) => /^[a-z]+:[a-z0-9_]+$/.test(tag) && tagLabel(tag) !== null;

// "Germany; Hungary" and "USA / UK" name two countries; a parenthesis is a note ("USA (New York City)"). A value that
// says the place is not confirmed, a partner country or a claim names no country at all.
function countries(value, unmapped) {
  const v = String(value ?? '').trim();
  if (!v || /not confirmed|unconfirmed|partner country|claimed|not disclosed|multiple|^n\/?a$/i.test(v)) return [];
  const out = [];
  for (const part of v.replace(/\([^)]*\)/g, ' ').split(/[;/,]/)) {
    const key = norm(part);
    if (!key) continue;
    const slug = COUNTRY.get(key);
    if (slug) out.push(slug);
    else unmapped.push(['country', key]);
  }
  return out;
}

const SECTOR_OF = {
  automotive_manufacturing: ['automotive', 'manufacturing'], automotive_components: ['automotive', 'manufacturing'],
  consumer_electronics_manufacturing: ['electronics', 'manufacturing'], electronics_manufacturing: ['electronics', 'manufacturing'],
  battery_manufacturing: ['batteries', 'manufacturing'], manufacturing: ['manufacturing'], robot_manufacturing: ['manufacturing'],
  aerospace_manufacturing: ['manufacturing'], food_manufacturing: ['manufacturing'], shipbuilding: ['manufacturing'],
  logistics: ['logistics'], ecommerce_logistics: ['logistics', 'retail'], retail_logistics: ['logistics', 'retail'],
  retail: ['retail'], pharmacy_retail: ['retail', 'healthcare'], healthcare: ['healthcare'],
  electricity_transmission: ['energy'], railway: ['rail'], robotics_research: ['research'],
  multiple: [], not_disclosed: [], '': [],
};
// Listed companies: the SEGMENT column (Spanish). ETF labels such as "Automatización / tecnología (RBOT)" are fund
// categories, not sectors, so they get no sector tag.
const SEGMENT_RULES = [
  [/automoci/, 'automotive'], [/semiconductor|electronica/, 'electronics'], [/logistica|almacen/, 'logistics'],
  [/medica|hospital/, 'healthcare'],
  [/reductor|actuador|motor|engranaje|transmision|accionamiento|componente|sensor|vision artificial|movimiento lineal/, 'components'],
];

function platform(value) {
  const t = String(value ?? '').split(';')[0].toLowerCase();
  if (!t || /\bdiy\b|duplicate/.test(t)) return null;
  if (/bipedal or wheeled|wheeled or bipedal/.test(t)) return 'bipedal_or_wheeled';
  if (/wheel|mobile manipulat|omnidirectional/.test(t)) return 'wheeled';
  if (/bipedal/.test(t)) return 'bipedal';
  if (/torso|\barms?\b|manipulat|bimanual/.test(t)) return 'torso_or_arms';
  return null;
}

const ENTITY_TYPE = {
  manufacturer: 'manufacturer', customer_operator: 'customer_operator', integrator_catalogue_entry: 'integrator',
  robot_model: 'robot_model', robot_family: 'robot_model', robot_variant: 'robot_model', software_resource: 'software',
};
const ROLE = { customer_operator: ['customer_operator'], customer_investor: ['customer_operator', 'investor'], technology_partner: ['technology_partner'] };
const LIST_TYPE = { other_robot: 'other_robot', edubot: 'educational_robot', software: 'software', world_model: 'world_model', dataset: 'dataset', hardware: 'hardware', integrator: 'integrator' };

// Tags of one imported row (its field values as served). unmapped collects [kind, value] pairs for the private report.
export function tagsFor(datasetId, d, unmapped = []) {
  const tags = new Set();
  const add = (facet, values) => { for (const v of values) if (v) tags.add(`${facet}:${v}`); };
  const known = (table, kind, v) => {
    const k = String(v ?? '').trim();
    if (!k || /^(unspecified|not_disclosed|not disclosed)$/i.test(k)) return [];
    if (table[k] !== undefined) return [].concat(table[k]);
    unmapped.push([kind, norm(k)]);
    return [];
  };
  switch (datasetId) {
    case 'humanoids':
      add('type', ['humanoid_robot']);
      add('hq', countries(d.Country, unmapped));
      add('platform', [platform(d['Platform / mobility'])]);
      break;
    case 'deployments':
      add('sector', known(SECTOR_OF, 'sector', d.sector));
      add('task', known(Object.fromEntries(Object.keys(TASKS).map((k) => [k, k])), 'task', d.task_category));
      add('site', countries(d.country, unmapped));
      add('hq', countries(d.organization_country, unmapped));
      add('type', known(ROLE, 'role', d.organization_role));
      add('status', known(Object.fromEntries(Object.keys(STATUS).map((k) => [k, k])), 'status', d.operational_status));
      add('evidence', known(Object.fromEntries(Object.keys(EVIDENCE).map((k) => [k.toUpperCase(), k])), 'evidence', d.evidence_level));
      break;
    case 'evidence-links':
      add('status', known(Object.fromEntries(Object.keys(STATUS).map((k) => [k, k])), 'status', d.stage_at_source_date));
      // Only a link whose source performed the task is tagged with it.
      if (/container_handling/.test(d.task_id ?? '') && d.task_relevance === 'performed_related_task') add('task', ['material_handling']);
      break;
    case 'task-evaluations':
      if (/container_handling/.test(d.task_id ?? '')) add('task', ['material_handling']);
      break;
    case 'container-handling':
      add('task', ['material_handling']);
      break;
    case 'entities':
      add('type', known(ENTITY_TYPE, 'entity_type', d.entity_type));
      break;
    case 'stocks': {
      add('type', ['listed_company']);
      add('hq', countries(d.country, unmapped));
      const seg = norm(d.segment);
      add('sector', SEGMENT_RULES.filter(([re]) => re.test(seg)).map(([, s]) => s));
      break;
    }
    case 'integrators':
    case 'software':
    case 'datasets':
    case 'hardware':
    case 'other-robots':
      add('type', [LIST_TYPE[d.list]]);
      break;
    default:
      break;
  }
  return [...tags].sort();
}

// Query words that mean a vocabulary term (English and common Spanish commercial searches), normalised. Each word or
// phrase also matches the listed terms, so "almacén" finds warehousing and "EE. UU." finds the United States.
const SYNONYM_LIST = [
  [['automocion', 'automovil', 'automoviles', 'coche', 'coches', 'car', 'cars', 'carmaker', 'carmakers', 'automaker', 'automakers'], ['automotive']],
  [['logistica', 'almacen', 'almacenes', 'warehouse', 'warehouses', 'warehousing', 'intralogistica', 'intralogistics', 'distribucion', 'fulfillment', 'fulfilment'], ['logistics', 'warehouse', 'distribution']],
  [['fabrica', 'fabricas', 'factory', 'factories', 'planta', 'plantas', 'fabricacion', 'industria', 'industrial', 'manufactura'], ['manufacturing', 'factory', 'plant']],
  [['electronica'], ['electronics']],
  [['bateria', 'baterias', 'battery'], ['battery', 'batteries']],
  [['salud', 'sanidad', 'hospital', 'hospitales', 'farmacia', 'farmacias', 'pharmacy'], ['healthcare', 'hospital', 'pharmacy']],
  [['comercio', 'tienda', 'tiendas', 'store', 'stores', 'supermercado', 'supermercados', 'supermarket', 'minorista'], ['retail', 'store']],
  [['ferrocarril', 'tren', 'trenes', 'railway', 'railways'], ['railway', 'rail']],
  [['energia', 'electricidad'], ['energy', 'electricity']],
  [['investigacion', 'universidad'], ['research', 'university']],
  [['manipulacion', 'picking', 'contenedor', 'contenedores', 'cajas', 'tote', 'totes', 'paquetes', 'carga', 'descarga'], ['material handling', 'container', 'tote']],
  [['montaje', 'ensamblaje', 'ensamblado'], ['assembly']],
  [['transporte'], ['transport']],
  [['tending', 'alimentacion de maquinas', 'carga de maquinas'], ['machine tending']],
  [['piloto', 'pilotos'], ['pilot']],
  [['prueba', 'pruebas', 'test', 'tests'], ['testing']],
  [['operativo', 'operativos', 'operacion', 'produccion', 'production'], ['operational']],
  [['anunciado', 'anunciados', 'planificado', 'previsto', 'previstos', 'announced'], ['planned']],
  [['fabricante', 'fabricantes', 'maker', 'makers', 'oem'], ['manufacturer']],
  [['cliente', 'clientes', 'operador', 'operadores'], ['customer', 'operator']],
  [['inversor', 'inversores', 'inversion'], ['investor', 'investment']],
  [['integrador', 'integradores'], ['integrator']],
  [['cotizada', 'cotizadas', 'bolsa', 'listed', 'stock', 'stocks', 'ticker'], ['listed company']],
  [['humanoide', 'humanoides'], ['humanoid']],
  [['sensores', 'actuadores', 'componentes', 'reductores', 'motores'], ['components', 'sensors', 'actuators']],
  [['ruedas'], ['wheeled']],
  [['bipedo', 'bipedos'], ['bipedal']],
];
export const SYNONYMS = new Map();
for (const [words, terms] of SYNONYM_LIST) for (const w of words) SYNONYMS.set(w, terms);
for (const [name, ...keys] of COUNTRY_LIST) for (const k of keys) if (k !== norm(name)) SYNONYMS.set(k, [norm(name)]);

// Words that carry no meaning on their own in a search (English and Spanish).
export const STOPWORDS = new Set(['de', 'del', 'la', 'las', 'el', 'los', 'en', 'y', 'e', 'o', 'a', 'con', 'para', 'por', 'un', 'una', 'the', 'of', 'and', 'or', 'in', 'for', 'with', 'to', 'at', 'on', 'by']);
