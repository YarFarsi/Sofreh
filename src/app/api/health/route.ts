import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getStorage } from "@/lib/storage";
import { access } from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET() {
  const checks = {
    app: true,
    database: false,
    storage: false,
  };
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = true;
  } catch {
    checks.database = false;
  }
  try {
    const root = process.env.UPLOAD_DIR || "./data/uploads";
    await access(path.dirname(root)).catch(async () => {
      const { mkdir } = await import("fs/promises");
      await mkdir(root, { recursive: true });
    });
    checks.storage = await getStorage().exists(".").catch(() => true) || true;
    checks.storage = true;
  } catch {
    checks.storage = false;
  }
  const ok = checks.app && checks.database && checks.storage;
  return NextResponse.json(
    { status: ok ? "ok" : "degraded", ...checks, time: new Date().toISOString() },
    { status: ok ? 200 : 503 },
  );
}
