import { mkdir, readFile, unlink, writeFile } from "fs/promises";
import path from "path";

import { UPLOAD_DIR } from "@/lib/upload-config";

import { assertSafeKey, type PutOptions, type StorageDriver } from "./types";

/**
 * The default backend: bytes on the app server's own disk under
 * `storage/uploads/`. Always proxied through `app/i/[slug]/route.ts` — the
 * whole point of keeping uploads out of `public/` is that every read passes
 * the public/private check and gets counted, so there's no public URL.
 */
export class LocalStorageDriver implements StorageDriver {
  readonly name = "local";

  async put(key: string, body: Buffer, _opts: PutOptions): Promise<void> {
    assertSafeKey(key);
    await mkdir(UPLOAD_DIR, { recursive: true });
    await writeFile(path.join(UPLOAD_DIR, key), body);
  }

  async get(key: string): Promise<Buffer> {
    assertSafeKey(key);
    return readFile(path.join(UPLOAD_DIR, key));
  }

  async delete(key: string): Promise<void> {
    assertSafeKey(key);
    await unlink(path.join(UPLOAD_DIR, key)).catch(() => {
      // Already gone — deleting the DB row still succeeds.
    });
  }

  publicUrl(): string | null {
    return null;
  }
}
