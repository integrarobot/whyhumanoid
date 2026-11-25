// Clause-level cleaning shared by the public preview export and the paid import.
//   strip    private links, personal contacts and internal action items (sheet rows, aliases, editor tasks)
//   rewrite  a flagged clause whose neutral rewrite was checked against its source (editorial map)
//   flag     other instruction-like clauses: excluded from the public preview as unverified; kept in the
//            paid product and listed for editorial review

export const STRIP_RULES = [
  ['private_link', /(?:docs|drive)\.google\.com|\bmailto:|\bfile:\/\/|https?:\/\/(?:localhost|127\.0\.0\.1|10\.\d|192\.168\.)/i],
  ['personal_contact_email', /[\w.+-]+@[\w-]+\.[a-z]{2,}/i],
  ['personal_contact_phone', /(?:\+\d{1,3}[\s.-]?|\btel[:.]?\s*)\(?\d{2,4}\)?[\s.-]?\d{3,4}[\s.-]?\d{3,4}\b/i],
  ['internal_sheet_reference', /\b(?:sheet )?rows? \d+\b|\bthe sheet\b|\bcanonical record\b|\balias\b/i],
  ['internal_editor_task', /^(?:keep|merge|update|add|move|fix|revalidate|re-?check|do not duplicate|todo|fixme)\b/i],
  ['internal_marker', /\b(?:internal only|confidential|do not publish|not for publication|uso interno|confidencial|no publicar)\b/i],
];
export const FLAG_RULES = [['instruction_wording', /^(?:do not|don't|never)\b/i]];
// Within a clause, a sentence that is an editor's instruction about the catalogue itself ("NOT a humanoid in the
// bipedal sense: consider moving to Other Robots", 25 Nov 2026) is removed; the factual sentences around it stay.
export const SENTENCE_STRIP_RULES = [['internal_editor_task', /\bconsider (?:moving|reclassifying|relabell?ing)\b/i]];
function stripSentences(clause, stripped) {
  const sentences = clause.split(/(?<=\.)\s+/);
  const kept = sentences.filter((sentence) => {
    const hit = SENTENCE_STRIP_RULES.find(([, re]) => re.test(sentence));
    if (hit) stripped.push({ reason: hit[0], text: sentence });
    return !hit;
  });
  return kept.length === sentences.length ? clause : kept.join(' ');
}

// Splits on ';' outside parentheses so "checked (A; B)" stays one clause.
export function splitClauses(text) {
  const out = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === '(') depth += 1;
    else if (ch === ')') depth = Math.max(0, depth - 1);
    else if (ch === ';' && depth === 0) {
      out.push(text.slice(start, i));
      start = i + 1;
    }
  }
  out.push(text.slice(start));
  return out.map((c) => c.trim()).filter(Boolean);
}

// Stable short key for a clause (FNV-1a, 32 bit), so the editorial map never needs the clause text.
export function clauseKey(field, clause) {
  let h = 0x811c9dc5;
  for (const ch of `${field}|${clause}`) {
    h ^= ch.codePointAt(0);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

// options.mode: 'preview' drops unverified flagged clauses; 'full' keeps them.
// options.editorial: { [clauseKey]: { text, source_url, verified_at } } with verified neutral rewrites.
// Private links (the master workbook or other Google Docs/Drive files, mailto:, file:, local addresses) never leave
// the import, in any tab or mode: a workbook link would bypass every access rule. Tabs that skip clause cleaning
// still go through this.
const PRIVATE_LINK = /https?:\/\/(?:docs|drive)\.google\.com\/\S*|\bmailto:\S+|\bfile:\/\/\S+|https?:\/\/(?:localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+)\S*/gi;
export function redactPrivateLinks(value) {
  if (value == null || value === '') return { value: value === '' ? null : value, redacted: false };
  const text = String(value);
  const out = text.replace(PRIVATE_LINK, '').replace(/[ \t]{2,}/g, ' ').trim();
  return { value: out === '' ? null : out, redacted: out !== text.trim() };
}

export function cleanValue(value, { field = '', mode = 'full', editorial = {} } = {}) {
  if (value == null || value === '') return { value: null, stripped: [], flagged: [], rewritten: [], excluded: [] };
  const stripped = [];
  const flagged = [];
  const rewritten = [];
  const excluded = [];
  let changed = false;
  const cleaned = String(value)
    .split('\n')
    .map((line) =>
      line
        .split(' | ')
        .map((part) =>
          splitClauses(part)
            .map((whole) => {
              const clause = stripSentences(whole, stripped);
              if (clause !== whole) changed = true;
              if (!clause) return null;
              const hit = STRIP_RULES.find(([, re]) => re.test(clause));
              if (hit) {
                stripped.push({ reason: hit[0], text: clause });
                changed = true;
                return null;
              }
              const flag = FLAG_RULES.find(([, re]) => re.test(clause));
              if (!flag) return clause;
              const key = clauseKey(field, clause);
              const rewrite = editorial[key];
              if (rewrite?.verified_at && rewrite.text) {
                rewritten.push({ reason: 'verified_rewrite', key, text: clause });
                changed = true;
                return rewrite.text;
              }
              if (mode === 'preview') {
                excluded.push({ reason: 'unverified_instruction_wording', key, text: clause });
                changed = true;
                return null;
              }
              flagged.push({ reason: flag[0], key, text: clause });
              return clause;
            })
            .filter(Boolean)
            .join('; '),
        )
        .filter(Boolean)
        .join(' | '),
    )
    .filter(Boolean)
    .join('\n');
  return { value: changed ? cleaned || null : String(value), stripped, flagged, rewritten, excluded };
}
