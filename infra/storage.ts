import fs from "fs/promises";
import path from "path";
import type { StorageAdapter } from "../types/index";

const UPLOAD_DIR =
  process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");

const localStorageAdapter: StorageAdapter = {
  async save(key: string, buffer: Buffer): Promise<void> {
    const filePath = path.join(UPLOAD_DIR, key);
    const dir = path.dirname(filePath);

    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(filePath, buffer);
  },

  async delete(key: string): Promise<void> {
    const filePath = path.join(UPLOAD_DIR, key);

    try {
      await fs.unlink(filePath);
    } catch {
      // File already gone — not an error
    }
  },
};

export default localStorageAdapter;
