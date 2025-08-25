// src/polaris/needs-analysis/json.ts
export function tryExtractJson(input: string): string {
  // Strip markdown fences and hidden/think tags often returned by some models
  let stripped = input.trim().replace(/^```[a-z]*\n?|```$/gmi, '');
  // Remove <think>...</think> or similar hidden reasoning tags
  stripped = stripped.replace(/<think>[\s\S]*?<\/think>/gmi, '');
  // Remove XML-like preambles e.g., <analysis>...</analysis>
  stripped = stripped.replace(/<analysis>[\s\S]*?<\/analysis>/gmi, '');
  // Remove any leading non-JSON characters before first '{'
  const firstBrace = stripped.indexOf('{');
  if (firstBrace > 0) stripped = stripped.slice(firstBrace);
  // Find first { ... } block
  const start = stripped.indexOf('{');
  const end = stripped.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) throw new Error('No JSON block found');
  // Replace smart quotes
  const slice = stripped.slice(start, end + 1).replace(/[\u2018\u2019\u201C\u201D]/g, '"');
  return slice;
}
