import { NextResponse } from "next/server";
import { runCatalogSync, validateCronSecret } from "@/lib/sync";

async function handler(request: Request) {
  if (!validateCronSecret(request)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  try {
    return NextResponse.json({ ok: true, stats: await runCatalogSync() });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Catalog sync failed." },
      { status: 500 },
    );
  }
}

export { handler as GET, handler as POST };
