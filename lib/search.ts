// Search that matches every word typed, in any order, ignoring case and commas: "gulberg 10900"
// finds Test Mart Gulberg's Rs 10,900 order. Shared by the lists' search boxes.
export function matchesWords(query: string, text: string): boolean {
  const words = query.toLowerCase().replace(/,/g, "").split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const hay = text.toLowerCase().replace(/,/g, "");
  return words.every((w) => hay.includes(w));
}
