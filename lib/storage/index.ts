import { LocalStorageDriver } from "./local";
import { S3StorageDriver } from "./s3";
import type { StorageDriver } from "./types";

export type { StorageDriver, PutOptions } from "./types";

const cache = new Map<string, StorageDriver>();

function build(name: string): StorageDriver {
  switch (name) {
    case "local":
      return new LocalStorageDriver();
    case "s3":
      return new S3StorageDriver();
    default:
      throw new Error(`Unknown storage driver "${name}" (expected "local" or "s3")`);
  }
}

/**
 * The driver a specific existing image was stored with. Every Image row
 * records its own `storageDriver`, so changing STORAGE_DRIVER later leaves
 * older uploads reachable on whichever backend they were written to.
 */
export function getStorageDriverByName(name: string): StorageDriver {
  let driver = cache.get(name);
  if (!driver) {
    driver = build(name);
    cache.set(name, driver);
  }
  return driver;
}

/** The driver new uploads go to — STORAGE_DRIVER env, default "local". */
export function getStorageDriver(): StorageDriver {
  return getStorageDriverByName(process.env.STORAGE_DRIVER || "local");
}
