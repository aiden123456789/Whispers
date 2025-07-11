// lib/slurFilter.ts

// Add your banned words to this list (lowercase only)
const bannedWords = [
  "nigger",
  "faggot",
  // Add more here
];

export function containsSlur(text: string): boolean {
  const lower = text.toLowerCase();
  return bannedWords.some(word => lower.includes(word));
}
