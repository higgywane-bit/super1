/** A tag reader types the code and Enter. Codes have a digit and no spaces; anything else is a name. */
export function looksLikeCode(s: string): boolean {
  const v = s.trim();
  return /^[0-9A-Za-z-]{3,32}$/.test(v) && /\d/.test(v);
}
