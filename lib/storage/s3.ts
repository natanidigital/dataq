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

  async put(key: string, body: Buffer, opts: PutOptions): Promise<void> {
    assertSafeKey(key);
    const res = await this.client.fetch(this.objectUrl(key), {
      method: "PUT",
      // Buffer is a Uint8Array at runtime and a valid fetch body; the cast
      // is only to satisfy the DOM BodyInit type aws4fetch is typed against.
      body: new Uint8Array(body),
      headers: { "Content-Type": opts.contentType },
    });
    if (!res.ok) {
      throw new Error(`S3 put failed (${res.status}): ${await res.text().catch(() => "")}`);
    }
  }

  async get(key: string): Promise<Buffer> {
    assertSafeKey(key);
    const res = await this.client.fetch(this.objectUrl(key), { method: "GET" });
    if (!res.ok) throw new Error(`S3 get failed (${res.status})`);
    return Buffer.from(await res.arrayBuffer());
  }

  async delete(key: string): Promise<void> {
    assertSafeKey(key);
    const res = await this.client.fetch(this.objectUrl(key), { method: "DELETE" });
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
