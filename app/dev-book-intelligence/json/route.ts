// TEMPORARY development diagnostics for Book Intelligence research — delete with this folder.
import { NextResponse, type NextRequest } from "next/server";
import { buildReport } from "../inputs";

export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV !== "development") return new NextResponse(null, { status: 404 });
  const params = Object.fromEntries(request.nextUrl.searchParams.entries());
  return NextResponse.json(await buildReport(params));
}
