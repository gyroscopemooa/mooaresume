import { diffText } from "@/lib/text-diff";

export type CodexRedpenSegment = {
  type: "unchanged" | "removed" | "added";
  value: string;
};

export type CodexRedpenMirror = {
  original: CodexRedpenSegment[];
  revised: CodexRedpenSegment[];
  removedPhrases: string[];
  addedPhrases: string[];
};

function uniqueMeaningfulPhrases(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

export function buildCodexRedpenMirror(original: string, revised: string): CodexRedpenMirror {
  const parts = diffText(original, revised);
  return {
    original: parts
      .filter((part) => part.type !== "added")
      .map((part) => ({ type: part.type === "removed" ? "removed" : "unchanged", value: part.value })),
    revised: parts
      .filter((part) => part.type !== "removed")
      .map((part) => ({ type: part.type === "added" ? "added" : "unchanged", value: part.value })),
    removedPhrases: uniqueMeaningfulPhrases(parts.filter((part) => part.type === "removed").map((part) => part.value)),
    addedPhrases: uniqueMeaningfulPhrases(parts.filter((part) => part.type === "added").map((part) => part.value)),
  };
}
