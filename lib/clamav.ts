import net from "net";

// Set CLAMAV_HOST (and optionally CLAMAV_PORT, default 3310) to point at a
// clamd daemon — e.g. the optional `clamav` service in docker-compose.yml,
// started with `docker compose --profile with-clamav up -d`. Left unset,
// scanning is simply skipped: format validation in lib/image-validation.ts
// still runs regardless, ClamAV is an additional, opt-in layer on top.
const HOST = process.env.CLAMAV_HOST;
const PORT = Number(process.env.CLAMAV_PORT ?? 3310);
const SOCKET_TIMEOUT_MS = 15_000;
const CHUNK_SIZE = 4096;

export function isClamAvConfigured(): boolean {
  return Boolean(HOST);
}

export type ScanResult = { clean: boolean; signature?: string };

/**
 * Streams a buffer to clamd over its native INSTREAM protocol. Resolves to
 * null (rather than throwing) when scanning isn't configured, the daemon is
 * unreachable, or its reply can't be parsed — a scanner that's down
 * shouldn't be able to take the whole upload feature offline. Callers treat
 * null as "couldn't confirm either way" and fall back to the other
 * validation layers rather than blocking every upload on it.
 */
export async function scanBuffer(buffer: Buffer): Promise<ScanResult | null> {
  if (!HOST) return null;

  return new Promise((resolve) => {
    const socket = net.createConnection({ host: HOST, port: PORT });
    let response = "";
    let settled = false;

    const finish = (result: ScanResult | null) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(result);
    };

    socket.setTimeout(SOCKET_TIMEOUT_MS, () => finish(null));
    socket.on("error", () => finish(null));

    socket.on("connect", () => {
      socket.write("zINSTREAM\0");
      for (let offset = 0; offset < buffer.length; offset += CHUNK_SIZE) {
        const chunk = buffer.subarray(offset, offset + CHUNK_SIZE);
        const size = Buffer.alloc(4);
        size.writeUInt32BE(chunk.length, 0);
        socket.write(size);
        socket.write(chunk);
      }
      socket.write(Buffer.alloc(4)); // zero-length chunk signals end-of-stream
    });

    socket.on("data", (data) => {
      response += data.toString("utf8");
    });

    socket.on("end", () => {
      // Typical replies: "stream: OK\0" or "stream: Eicar-Test-Signature FOUND\0"
      const match = response.match(/stream:\s*(.*?)\s*(OK|FOUND|ERROR)\0?$/);
      if (!match) return finish(null);
      const [, name, verdict] = match;
      if (verdict === "OK") return finish({ clean: true });
      if (verdict === "FOUND") return finish({ clean: false, signature: name.trim() });
      finish(null);
    });
  });
}
