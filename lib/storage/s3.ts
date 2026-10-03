import { AwsClient } from "aws4fetch";

import { assertSafeKey, type PutOptions, type StorageDriver } from "./types";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required when STORAGE_DRIVER=s3`);
  return value;
}

/**
 * Any S3-compatible object store — Cloudflare R2, Backblaze B2, Wasabi,
 * iDrive e2, AWS S3 itself. Signing is done with aws4fetch (a few KB) over
 * plain fetch rather than pulling in the full AWS SDK.
 *
 * Set S3_PUBLIC_BASE_URL to a CDN / custom-domain base that serves the
 * bucket read-only, and public images will be handed to the client
 * directly from there — their bytes never touch the app server. Leave it
 * unset and every image is proxied through the app instead (still off the
 * app's own disk, just not off its bandwidth).
 */
export class S3StorageDriver implements StorageDriver {
  readonly name = "s3";

  private readonly endpoint: string;
  private readonly bucket: string;
  private readonly publicBase: string | null;
  private readonly client: AwsClient;

  constructor() {
    this.endpoint = required("S3_ENDPOINT").replace(/\/+$/, "");
    this.bucket = required("S3_BUCKET");
    this.publicBase = process.env.S3_PUBLIC_BASE_URL?.replace(/\/+$/, "") || null;
    this.client = new AwsClient({
      accessKeyId: required("S3_ACCESS_KEY_ID"),
      secretAccessKey: required("S3_SECRET_ACCESS_KEY"),
      region: process.env.S3_REGION || "auto",
      service: "s3",
    });
  }

  private objectUrl(key: string): string {
    return `${this.endpoint}/${this.bucket}/${encodeURIComponent(key)}`;
  }

  /**
   * Signs with aws4fetch but sends with a plain `fetch(url, init)` — NOT
   * `client.fetch()`, which hands fetch() a pre-built Request object. Inside
   * a Next.js server, that Request-with-body path occasionally went out
   * without a Content-Length (R2 answered 411 MissingContentLength on ~5%
   * of uploads; never reproducible outside Next). A Uint8Array body on a
   * plain fetch always carries its length. `cache: "no-store"` also keeps
   * Next's fetch cache away from object bytes.
   *
   * Transient failures (network errors, 5xx, 408/411/429) are retried
   * briefly; anything else is returned to the caller to judge.
   */
  private async send(method: string, key: string, body?: Uint8Array<ArrayBuffer>, contentType?: string): Promise<Response> {
    const url = this.objectUrl(key);
    let lastError: unknown;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const signed = await this.client.sign(url, {
          method,
          body,
          headers: contentType ? { "Content-Type": contentType } : undefined,
        });
        const res = await fetch(signed.url, {
          method,
          headers: signed.headers,
          body,
          cache: "no-store",
        });
        const transient = res.status >= 500 || res.status === 408 || res.status === 411 || res.status === 429;
        if (!transient || attempt === 3) return res;
        await res.arrayBuffer().catch(() => undefined); // drain before retrying
      } catch (err) {
        lastError = err;
        if (attempt === 3) throw err;
      }
      await new Promise((r) => setTimeout(r, 150 * attempt));
    }
    throw lastError;
  }

  async put(key: string, body: Buffer, opts: PutOptions): Promise<void> {
    assertSafeKey(key);
    // Buffer is a Uint8Array at runtime; copy to a plain Uint8Array so the
    // body is typed as a valid BodyInit.
    const res = await this.send("PUT", key, new Uint8Array(body), opts.contentType);
    if (!res.ok) {
      throw new Error(`S3 put failed (${res.status}): ${await res.text().catch(() => "")}`);
    }
  }

  async get(key: string): Promise<Buffer> {
    assertSafeKey(key);
    const res = await this.send("GET", key);
    if (!res.ok) throw new Error(`S3 get failed (${res.status})`);
    return Buffer.from(await res.arrayBuffer());
  }

  async delete(key: string): Promise<void> {
    assertSafeKey(key);
    const res = await this.send("DELETE", key);
    // 204 = deleted, 404 = already gone — both are fine.
    if (!res.ok && res.status !== 404) {
      throw new Error(`S3 delete failed (${res.status})`);
    }
  }

  publicUrl(key: string): string | null {
    if (!this.publicBase) return null;
    assertSafeKey(key);
    return `${this.publicBase}/${encodeURIComponent(key)}`;
  }
}
