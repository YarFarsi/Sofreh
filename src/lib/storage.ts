import { mkdir, readFile, writeFile, access } from "fs/promises";
import path from "path";
import { randomToken } from "@/lib/crypto";
import { AppError, ErrorCodes } from "@/lib/errors";

export interface StorageAdapter {
  save(kind: "users" | "foods", originalName: string, buffer: Buffer): Promise<string>;
  read(relativePath: string): Promise<Buffer>;
  exists(relativePath: string): Promise<boolean>;
}

const MAGIC: Array<{ mime: string; ext: string; test: (b: Buffer) => boolean }> = [
  {
    mime: "image/jpeg",
    ext: "jpg",
    test: (b) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  },
  {
    mime: "image/png",
    ext: "png",
    test: (b) =>
      b.length > 8 &&
      b[0] === 0x89 &&
      b[1] === 0x50 &&
      b[2] === 0x4e &&
      b[3] === 0x47,
  },
  {
    mime: "image/webp",
    ext: "webp",
    test: (b) =>
      b.length > 12 &&
      b.toString("ascii", 0, 4) === "RIFF" &&
      b.toString("ascii", 8, 12) === "WEBP",
  },
];

const MAX_BYTES = 2 * 1024 * 1024;
const DEFAULT_ROOT = path.join(process.cwd(), "data", "uploads");

export class LocalFilesystemStorage implements StorageAdapter {
  constructor(private root = process.env.UPLOAD_DIR || DEFAULT_ROOT) {}

  async save(
    kind: "users" | "foods",
    _originalName: string,
    buffer: Buffer,
  ): Promise<string> {
    if (buffer.length > MAX_BYTES) {
      throw new AppError(ErrorCodes.VALIDATION, "حجم تصویر بیش از ۲ مگابایت است.");
    }
    const kindMatch = MAGIC.find((m) => m.test(buffer));
    if (!kindMatch) {
      throw new AppError(
        ErrorCodes.VALIDATION,
        "فقط تصویر JPEG، PNG یا WebP مجاز است.",
      );
    }
    const dir = path.join(/*turbopackIgnore: true*/ this.root, kind);
    await mkdir(dir, { recursive: true });
    const filename = `${randomToken(16)}.${kindMatch.ext}`;
    const abs = path.join(/*turbopackIgnore: true*/ dir, filename);
    await writeFile(abs, buffer);
    return `${kind}/${filename}`;
  }

  async read(relativePath: string): Promise<Buffer> {
    return readFile(this.resolve(relativePath));
  }

  async exists(relativePath: string): Promise<boolean> {
    try {
      await access(this.resolve(relativePath));
      return true;
    } catch {
      return false;
    }
  }

  private resolve(relativePath: string): string {
    const normalized = path
      .normalize(relativePath)
      .replace(/^(\.\.(\/|\\|$))+/, "");
    const abs = path.join(/*turbopackIgnore: true*/ this.root, normalized);
    const root = path.resolve(this.root);
    if (!abs.startsWith(root)) {
      throw new AppError(ErrorCodes.FORBIDDEN, "مسیر نامعتبر است.", 403);
    }
    return abs;
  }
}

export function getStorage(): StorageAdapter {
  return new LocalFilesystemStorage();
}
