export const APP_CONFIG = {
  name: "Remobile Hub",
  company: "Remobile Tech GmbH",
  defaultChannel: "bol_nl" as const,
  defaultSupplier: "foxway" as const,
  foxwayCatalogSlug: process.env.FOXWAY_CATALOG_SLUG ?? "working",
  foxwayBaseUrl: process.env.FOXWAY_API_BASE_URL ?? "https://foxway.shop/api/v1",
  bolApiBaseUrl: process.env.BOL_API_BASE_URL ?? "https://api.bol.com/retailer",
  bolTokenUrl: process.env.BOL_TOKEN_URL ?? "https://login.bol.com/token",
  demoMode:
    !process.env.DATABASE_URL ||
    !process.env.FOXWAY_API_KEY ||
    !process.env.BOL_CLIENT_ID ||
    !process.env.BOL_CLIENT_SECRET,
} as const;

export const isFoxwayConfigured = Boolean(process.env.FOXWAY_API_KEY);
export const isBolConfigured = Boolean(process.env.BOL_CLIENT_ID && process.env.BOL_CLIENT_SECRET);
export const isClerkConfigured = Boolean(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY,
);

export const GRADE_MAPPING = {
  "Grade B": "A",
  "Grade C+": "B",
  "Grade C": "C",
} as const;
