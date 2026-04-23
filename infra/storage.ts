import crypto from "crypto";
import fs from "fs";
import path from "path";

const UPLOADS_DIR = process.env.UPLOADS_DIR
  ? path.resolve(process.env.UPLOADS_DIR)
  : path.resolve(process.cwd(), "uploads");

if (process.env.NODE_ENV !== "test") {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

export interface SaveFileResult {
  key: string;
  size: number;
  id: string;
}

export async function saveFile(
  file: Buffer,
  originalFilename: string,
): Promise<SaveFileResult> {
  const id = crypto.randomUUID();
  const ext = path.extname(originalFilename);
  const key = `${id}${ext}`;

  if (process.env.NODE_ENV === "test") {
    return { key, size: file.length, id };
  }

  const filePath = path.join(UPLOADS_DIR, key);
  await fs.promises.writeFile(filePath, file);

  return { key, size: file.length, id };
}

export async function deleteFile(key: string): Promise<void> {
  if (process.env.NODE_ENV === "test") {
    return;
  }

  const filePath = path.join(UPLOADS_DIR, key);

  try {
    await fs.promises.unlink(filePath);
  } catch (err: unknown) {
    if ((err as { code?: string }).code !== "ENOENT") {
      throw err;
    }
  }
}

const storage = {
  saveFile,
  deleteFile,
};

export default storage;
