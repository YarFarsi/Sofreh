import { NextResponse } from "next/server";
import { getStorage } from "@/lib/storage";
import { currentUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ path: string[] }> },
) {
  const user = await currentUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });
  const { path } = await ctx.params;
  const relative = path.join("/");
  if (!/^(users|foods)\//.test(relative)) {
    return new NextResponse("Forbidden", { status: 403 });
  }
  try {
    const buf = await getStorage().read(relative);
    const ext = relative.split(".").pop();
    const mime =
      ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": mime,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
