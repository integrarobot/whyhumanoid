// Clause-level cleaning shared by the public preview export and the paid import.
//   strip  private links, personal contacts and internal action items (sheet rows, aliases, editor tasks)
//   flag   ambiguous instruction-like clauses: kept, listed for editorial review

export const STRIP_RULES = [
  ['private_link', /(?:docs|drive)\.google\.com|\bmailto:|\bfile:\/\/|https?:\/\/(?:localhost|127\.0\.0\.1|10\.\d|192\.168\.)/i],
  ['personal_contact_email', /[\w.+-]+@[\w-]+\.[a-z]{2,}/i],
  ['personal_contact_phone', /(?:\+\d{1,3}[\s.-]?|\btel[:.]?\s*)\(?\d{2,4}\)?[\s.-]?\d{3,4}[\s.-]?\d{3,4}\b/i],
  ['internal_sheet_reference', /\b(?:sheet )?rows? \d+\b|\bthe sheet\b|\bcanonical record\b|\balias\b/i],
  ['internal_editor_task', /^(?:keep|merge|update|add|move|fix|revalidate|re-?check|do not duplicate|todo|fixme)\b/i],
  ['internal_marker', /\b(?:internal only|confidential|do not publish|not for publication|uso interno|confidencial|no publicar)\b/i],
];
export const FLAG_RULES = [['instruction_wording', /^(?:do not|don't|never)\b/i]];

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

export function cleanValue(value) {
  if (value == null || value === '') return { value: null, stripped: [], flagged: [] };
  const stripped = [];
  const flagged = [];
  const cleaned = String(value)
    .split('\n')
    .map((line) =>
      line
        .split(' | ')
        .map((part) =>
          splitClauses(part)
            .filter((clause) => {
              const hit = STRIP_RULES.find(([, re]) => re.test(clause));
              if (hit) {
                stripped.push({ reason: hit[0], text: clause });
                return false;
              }
              const flag = FLAG_RULES.find(([, re]) => re.test(clause));
              if (flag) flagged.push({ reason: flag[0], text: clause });
              return true;
            })
            .join('; '),
        )
        .filter(Boolean)
        .join(' | '),
    )
    .filter(Boolean)
    .join('\n');
  return { value: stripped.length ? cleaned || null : String(value), stripped, flagged };
}
