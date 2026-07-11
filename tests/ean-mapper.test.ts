import { describe, expect, it } from "vitest";
import { extractModelFamily, extractStorage, matchEan, validateEan13 } from "@/lib/ean/mapper";

describe("EAN mapper", () => {
  it("validates EAN-13 checksums", () => {
    expect(validateEan13("4006381333931")).toBe(true);
    expect(validateEan13("4006381333932")).toBe(false);
    expect(validateEan13("123" )).toBe(false);
  });

  it("normalizes model names and extracts storage", () => {
    expect(extractStorage("Apple iPhone 15 Pro 256 GB")).toBe("256GB");
    expect(extractModelFamily("Apple iPhone 15 Pro 256GB Brand New Battery")).toBe("iphone 15 pro");
  });

  it("returns high confidence when model, storage, and color match", () => {
    const result = matchEan("Apple iPhone 15 128GB Black", "Black", [
      { ean: "4006381333931", title: "Apple iPhone 15 128GB Black" },
    ]);
    expect(result).toMatchObject({ ean: "4006381333931", confidence: "HIGH" });
  });

  it("returns no match when model or storage differ", () => {
    expect(matchEan("Apple iPhone 15 128GB", "Black", [
      { ean: "4006381333931", title: "Apple iPhone 14 256GB Black" },
    ]).confidence).toBe("NO_MATCH");
  });
});
