import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

const LOCAL_UPLOAD_DIR = path.resolve("uploads");

export interface StorageFile {
  key: string;
  size: number;
}

export async function saveFile(
  buffer: Buffer,
  originalFilename: string,
): Promise<StorageFile> {
  const ext = path.extname(originalFilename).toLowerCase();
  const key = `${crypto.randomUUID()}${ext}`;

  if (process.env.NODE_ENV !== "test") {
    await fs.mkdir(LOCAL_UPLOAD_DIR, { recursive: true });
    await fs.writeFile(path.join(LOCAL_UPLOAD_DIR, key), buffer);
  }

  return { key, size: buffer.length };
}

export async function deleteFile(key: string): Promise<void> {
  if (process.env.NODE_ENV === "test") return;

  try {
    await fs.unlink(path.join(LOCAL_UPLOAD_DIR, key));
  } catch {
    // File may already be gone — not a hard error
  }
}
