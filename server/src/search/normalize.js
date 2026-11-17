// Text normalisation shared by the search index and the queries: lower case, no accents, punctuation as spaces.
// "Logística", "LOGISTICA" and "logistica" are the same term; "EE. UU." becomes "ee uu".

const fold = (ch) => ch.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const isWord = (ch) => /[\p{L}\p{N}]/u.test(ch);

export function norm(value) {
  let out = '';
  for (const ch of String(value ?? '')) out += isWord(ch) ? fold(ch) : ' ';
  return out.replace(/\s+/g, ' ').trim();
}

// Normalised text plus, for each normalised character, the index of the original character it came from, so a match
// found in the normalised text can be highlighted in the original. Spaces are not collapsed here.
export function normMap(value) {
  const source = String(value ?? '');
  let text = '';
  const map = [];
  let i = 0;
  for (const ch of source) {
    const folded = isWord(ch) ? fold(ch) : ' ';
    for (const c of folded) { text += c; for (let k = 0; k < c.length; k += 1) map.push(i); }
    i += ch.length;
  }
  return { text, map, source };
}

// Escape for LIKE ... ESCAPE '\'.
export const likeEscape = (s) => s.replace(/[\\%_]/g, (c) => `\\${c}`);
