export type PutOptions = { contentType: string };

/**
 * A place uploaded image bytes live. Two implementations ship: "local"
 * (the app server's own disk, the default) and "s3" (any S3-compatible
 * object store — Cloudflare R2, Backblaze B2, AWS S3, …).
 *
 * Every Image row records the `storageDriver` its file was written with, so
 * turning on S3 later doesn't strand anything already stored on local disk —
 * old images keep being read from where they are.
 */
export interface StorageDriver {
  /** Stable identifier persisted on `Image.storageDriver`. */
  readonly name: string;

  /** Store an object under `key` (an opaque, filesystem-safe string). */
  put(key: string, body: Buffer, opts: PutOptions): Promise<void>;

  /** Fetch the full object bytes — used when the app proxies the file. */
  get(key: string): Promise<Buffer>;

  /** Remove the object. Resolves (does not throw) if it's already gone. */
  delete(key: string): Promise<void>;

  /**
   * A directly-fetchable URL for `key`, or null if the app must serve the
   * bytes itself. Only ever consulted for public images — private images
   * are always proxied through the access-controlled route regardless, so
   * a backend without a public URL still works, it just can't take traffic
   * off the app server.
   */
  publicUrl(key: string): string | null;
}

/**
 * Storage keys are always `${slug}.${ext}` built from a trusted alphabet,
 * but this is the boundary between the DB and a filesystem / bucket path,
 * so reject anything that could escape the intended location.
 */
export function assertSafeKey(key: string): void {
  if (!/^[a-zA-Z0-9._-]+$/.test(key) || key.includes("..")) {
    throw new Error(`Unsafe storage key: ${JSON.stringify(key)}`);
  }
}
