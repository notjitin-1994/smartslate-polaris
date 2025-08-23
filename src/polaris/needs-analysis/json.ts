// src/polaris/needs-analysis/json.ts
export function tryExtractJson(input: string): string {
  // Strip markdown fences
  const stripped = input.trim().replace(/^```[a-z]*\n?|```$/gmi, '');
  // Find first { ... } block
  const start = stripped.indexOf('{');
  const end = stripped.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) throw new Error('No JSON block found');
  // Replace smart quotes
  const slice = stripped.slice(start, end + 1).replace(/[\u2018\u2019\u201C\u201D]/g, '"');
  return slice;
}
