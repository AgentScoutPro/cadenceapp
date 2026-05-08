const signaturePatterns = [
  /^--\s*$/m,
  /^best,?$/im,
  /^thanks,?$/im,
  /^sent from my /im,
  /^on .* wrote:$/im
];

export function cleanText(text = "") {
  let cleaned = text
    .replace(/\r/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();

  for (const pattern of signaturePatterns) {
    const match = cleaned.search(pattern);
    if (match > 200) {
      cleaned = cleaned.slice(0, match).trim();
    }
  }

  return cleaned;
}

export function compactForPrompt(text = "", maxChars = 9000) {
  const cleaned = cleanText(text);
  if (cleaned.length <= maxChars) return cleaned;
  return `${cleaned.slice(0, maxChars)}\n\n[Trimmed for MVP prompt length]`;
}
