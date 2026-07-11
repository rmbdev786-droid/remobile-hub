import type { Confidence } from "@/types";

export const COLOR_MAP: Readonly<Record<string, readonly string[]>> = {
  Black: ["midnight", "black", "space black", "space gray"],
  White: ["starlight", "white", "silver", "white titanium"],
  Blue: ["blue", "sierra blue", "alpine blue", "ultramarine"],
  Green: ["green", "alpine green"],
  Pink: ["pink"],
  Red: ["red", "product red"],
  Purple: ["purple", "deep purple"],
  Yellow: ["yellow"],
  Grey: ["titanium", "natural titanium", "black titanium", "graphite", "gray", "grey"],
  Gold: ["gold", "desert titanium"],
};

function normalize(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function extractStorage(name: string): string {
  const match = name.match(/\b(\d+)\s*(GB|TB)\b/i);
  return match ? `${match[1]}${match[2]?.toUpperCase()}` : "";
}

export function extractModelFamily(name: string): string {
  return normalize(name)
    .replace(/^apple\s+/, "")
    .replace(/\b\d+\s*(gb|tb)\b/g, "")
    .replace(/\bbrand\s+new\s+battery\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function validateEan13(ean: string): boolean {
  if (!/^\d{13}$/.test(ean)) return false;
  const digits = Array.from(ean, Number);
  const checksum = digits[12];
  if (checksum === undefined) return false;
  const sum = digits.slice(0, 12).reduce((total, digit, index) => {
    return total + digit * (index % 2 === 0 ? 1 : 3);
  }, 0);
  return (10 - (sum % 10)) % 10 === checksum;
}

function colorAliases(color: string): readonly string[] {
  const normalizedColor = normalize(color);
  const direct = Object.entries(COLOR_MAP).find(([generic]) => normalize(generic) === normalizedColor);
  if (direct) return direct[1];

  const family = Object.entries(COLOR_MAP).find(([, aliases]) =>
    aliases.some((alias) => normalize(alias) === normalizedColor),
  );
  return family?.[1] ?? [normalizedColor];
}

function titleMatchesColor(title: string, foxwayColor: string): boolean {
  const normalizedTitle = normalize(title);
  return colorAliases(foxwayColor).some((alias) => normalizedTitle.includes(normalize(alias)));
}

export interface BolEanCandidate {
  ean: string;
  title: string;
}

export interface EanMatch {
  ean: string;
  confidence: Exclude<Confidence, "MANUAL" | "PENDING">;
  note: string;
  title: string;
}

export function matchEan(
  foxwayProductName: string,
  foxwayColor: string,
  bolEanList: BolEanCandidate[],
): EanMatch {
  const model = extractModelFamily(foxwayProductName);
  const storage = extractStorage(foxwayProductName).toLowerCase();
  const modelAndStorageMatches = bolEanList.filter((candidate) => {
    return (
      extractModelFamily(candidate.title) === model &&
      extractStorage(candidate.title).toLowerCase() === storage
    );
  });

  if (modelAndStorageMatches.length === 0) {
    return {
      ean: "",
      confidence: "NO_MATCH",
      note: `No bol.com title matched ${model || "the model"} ${storage.toUpperCase()}.`,
      title: "",
    };
  }

  const colorMatches = modelAndStorageMatches.filter((candidate) =>
    titleMatchesColor(candidate.title, foxwayColor),
  );

  if (colorMatches.length === 1) {
    const match = colorMatches[0];
    if (!match) throw new Error("Color-match selection failed.");
    return {
      ean: match.ean,
      confidence: "HIGH",
      note: "Model, storage, and color all match.",
      title: match.title,
    };
  }

  if (colorMatches.length > 1) {
    const match = colorMatches[0];
    if (!match) throw new Error("Color-match selection failed.");
    return {
      ean: match.ean,
      confidence: "MEDIUM",
      note: "Model, storage, and color match, but multiple candidate EANs require review.",
      title: match.title,
    };
  }

  const match = modelAndStorageMatches[0];
  if (!match) throw new Error("Model-match selection failed.");
  return {
    ean: match.ean,
    confidence: modelAndStorageMatches.length === 1 ? "MEDIUM" : "LOW",
    note:
      modelAndStorageMatches.length === 1
        ? "Model and storage match; the color name is uncertain."
        : "Model and storage match, but the color could not identify one candidate.",
    title: match.title,
  };
}
