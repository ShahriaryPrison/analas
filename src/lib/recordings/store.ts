// Storage layer for session-recording event chunks.
//
// A recording is written as a set of IMMUTABLE, gzipped NDJSON chunks under a
// per-session prefix:
//
//   <root>/<workspaceId>/<sessionId>/<paddedEpochMs>-<rand>.ndjson.gz
//
// Two drivers are available (select via RECORDINGS_STORAGE env var):
//
//   disk  (default) — LocalDiskStore writes to RECORDINGS_DIR on the local FS.
//                     Fine for single-node Docker deployments; back up the volume.
//   s3             — S3Store writes to any S3-compatible endpoint (AWS S3, MinIO,
//                     Cloudflare R2). Required for multi-instance deployments.
//                     Set S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY.
//
// Design invariants shared by both drivers:
//  - One file per flush (never appended) — maps 1:1 onto object-store semantics.
//  - gzip is a concatenable container: streaming chunks back-to-back yields one
//    valid gzip stream the browser inflates itself; server never decompresses on read.
//  - DB stores only the relative key "<workspaceId>/<sessionId>", never an absolute
//    path, so changing drivers or RECORDINGS_DIR needs no data migration.

import crypto from "node:crypto";
import fs from "node:fs/promises";
import { createReadStream } from "node:fs";
import { PassThrough, Readable } from "node:stream";
import path from "node:path";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";

const CHUNK_SUFFIX = ".ndjson.gz";

// ── Public interface ──────────────────────────────────────────────────────────

export interface RecordingStore {
  /**
   * Persist one flush as a new immutable gzipped-NDJSON chunk.
   * @param gzip  gzip of `<json-event>\n<json-event>\n…` (NOT a JSON array).
   * @returns the relative session key to store in the DB.
   */
  putChunk(workspaceId: string, sessionId: string, gzip: Buffer): Promise<string>;
  /**
   * Concatenated gzip stream of every chunk for a session, in write order.
   * The body is gzip-encoded — serve it with `Content-Encoding: gzip`.
   * Returns null when the session has no chunks.
   */
  openSession(storageKey: string): Promise<ReadableStream | null>;
  /** Remove every chunk for a session. No-op if it does not exist. */
  deleteSession(storageKey: string): Promise<void>;
  /** All session keys ("<ws>/<sid>") that currently exist — for orphan sweeps. */
  listSessionKeys(): Promise<string[]>;
}

// ── Driver 1: local disk ──────────────────────────────────────────────────────

class LocalDiskStore implements RecordingStore {
  constructor(private readonly root: string) {}

  /** Resolve a session key to an absolute dir, refusing path-traversal. */
  private sessionDir(storageKey: string): string {
    const full = path.resolve(this.root, storageKey);
    if (full !== this.root && !full.startsWith(this.root + path.sep)) {
      throw new Error("Invalid storage key");
    }
    return full;
  }

  async putChunk(workspaceId: string, sessionId: string, gzip: Buffer): Promise<string> {
    const storageKey = `${workspaceId}/${sessionId}`;
    const dir = this.sessionDir(storageKey);
    await fs.mkdir(dir, { recursive: true });
    // 15-digit zero-padded epoch keeps filenames lexicographically time-ordered;
    // the random suffix avoids same-millisecond collisions.
    const name = `${Date.now().toString().padStart(15, "0")}-${crypto
      .randomBytes(4)
      .toString("hex")}${CHUNK_SUFFIX}`;
    await fs.writeFile(path.join(dir, name), gzip);
    return storageKey;
  }

  async openSession(storageKey: string): Promise<ReadableStream | null> {
    const dir = this.sessionDir(storageKey);
    let files: string[];
    try {
      files = (await fs.readdir(dir)).filter((f) => f.endsWith(CHUNK_SUFFIX)).sort();
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw err;
    }
    if (files.length === 0) return null;

    const pass = new PassThrough();
    (async () => {
      try {
        for (const f of files) {
          await new Promise<void>((resolve, reject) => {
            const rs = createReadStream(path.join(dir, f));
            rs.on("error", reject);
            rs.on("end", resolve);
            rs.pipe(pass, { end: false });
          });
        }
        pass.end();
      } catch (err) {
        pass.destroy(err as Error);
      }
    })();

    return Readable.toWeb(pass) as ReadableStream;
  }

  async deleteSession(storageKey: string): Promise<void> {
    await fs.rm(this.sessionDir(storageKey), { recursive: true, force: true });
  }

  async listSessionKeys(): Promise<string[]> {
    const keys: string[] = [];
    let workspaces: import("node:fs").Dirent[];
    try {
      workspaces = await fs.readdir(this.root, { withFileTypes: true });
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw err;
    }
    for (const ws of workspaces) {
      if (!ws.isDirectory()) continue;
      let sessions: import("node:fs").Dirent[];
      try {
        sessions = await fs.readdir(path.join(this.root, ws.name), { withFileTypes: true });
      } catch {
        continue;
      }
      for (const s of sessions) {
        if (s.isDirectory()) keys.push(`${ws.name}/${s.name}`);
      }
    }
    return keys;
  }
}

// ── Driver 2: S3-compatible object storage (AWS S3, MinIO, Cloudflare R2) ────

class S3Store implements RecordingStore {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(cfg: {
    bucket: string;
    endpoint?: string;
    region?: string;
    accessKeyId: string;
    secretAccessKey: string;
    forcePathStyle?: boolean;
  }) {
    this.bucket = cfg.bucket;
    this.client = new S3Client({
      region: cfg.region ?? "us-east-1",
      ...(cfg.endpoint ? { endpoint: cfg.endpoint } : {}),
      credentials: {
        accessKeyId: cfg.accessKeyId,
        secretAccessKey: cfg.secretAccessKey,
      },
      // Path-style required for MinIO and most non-AWS endpoints.
      forcePathStyle: cfg.forcePathStyle ?? !!cfg.endpoint,
    });
  }

  async putChunk(workspaceId: string, sessionId: string, gzip: Buffer): Promise<string> {
    const storageKey = `${workspaceId}/${sessionId}`;
    const name = `${Date.now().toString().padStart(15, "0")}-${crypto
      .randomBytes(4)
      .toString("hex")}${CHUNK_SUFFIX}`;
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: `${storageKey}/${name}`,
        Body: gzip,
        ContentType: "application/x-ndjson",
        ContentEncoding: "gzip",
      })
    );
    return storageKey;
  }

  private async listChunkKeys(storageKey: string): Promise<string[]> {
    const keys: string[] = [];
    let token: string | undefined;
    do {
      const res = await this.client.send(
        new ListObjectsV2Command({
          Bucket: this.bucket,
          Prefix: `${storageKey}/`,
          ContinuationToken: token,
        })
      );
      for (const obj of res.Contents ?? []) {
        if (obj.Key?.endsWith(CHUNK_SUFFIX)) keys.push(obj.Key);
      }
      token = res.IsTruncated ? res.NextContinuationToken : undefined;
    } while (token);
    return keys.sort(); // lexicographic = chronological (zero-padded epoch prefix)
  }

  async openSession(storageKey: string): Promise<ReadableStream | null> {
    const keys = await this.listChunkKeys(storageKey);
    if (keys.length === 0) return null;

    const { client, bucket } = this;
    const pass = new PassThrough();

    (async () => {
      try {
        for (const key of keys) {
          const { Body } = await client.send(
            new GetObjectCommand({ Bucket: bucket, Key: key })
          );
          if (!Body) continue;
          await new Promise<void>((resolve, reject) => {
            // AWS SDK v3 returns a Node.js Readable in the Node.js runtime.
            const body = Body as Readable;
            body.on("error", reject);
            body.on("end", resolve);
            body.pipe(pass, { end: false });
          });
        }
        pass.end();
      } catch (err) {
        pass.destroy(err as Error);
      }
    })();

    return Readable.toWeb(pass) as ReadableStream;
  }

  async deleteSession(storageKey: string): Promise<void> {
    let token: string | undefined;
    do {
      const res = await this.client.send(
        new ListObjectsV2Command({
          Bucket: this.bucket,
          Prefix: `${storageKey}/`,
          ContinuationToken: token,
        })
      );
      const objects = (res.Contents ?? [])
        .filter((o) => !!o.Key)
        .map((o) => ({ Key: o.Key! }));
      if (objects.length > 0) {
        await this.client.send(
          new DeleteObjectsCommand({
            Bucket: this.bucket,
            Delete: { Objects: objects },
          })
        );
      }
      token = res.IsTruncated ? res.NextContinuationToken : undefined;
    } while (token);
  }

  async listSessionKeys(): Promise<string[]> {
    const sessions = new Set<string>();
    let token: string | undefined;
    do {
      const res = await this.client.send(
        new ListObjectsV2Command({
          Bucket: this.bucket,
          ContinuationToken: token,
        })
      );
      for (const obj of res.Contents ?? []) {
        // Key format: <ws>/<sid>/<chunk>.ndjson.gz — extract the first two segments.
        const parts = obj.Key?.split("/");
        if (parts && parts.length >= 3) sessions.add(`${parts[0]}/${parts[1]}`);
      }
      token = res.IsTruncated ? res.NextContinuationToken : undefined;
    } while (token);
    return [...sessions];
  }
}

// ── Factory (process-wide singleton) ─────────────────────────────────────────

let singleton: RecordingStore | null = null;

/**
 * Returns the process-wide recording store.
 * Driver is selected by RECORDINGS_STORAGE:
 *   "s3"   → S3Store (AWS S3 / MinIO / Cloudflare R2)
 *   other  → LocalDiskStore (default; uses RECORDINGS_DIR or ./.recordings)
 */
export function getRecordingStore(): RecordingStore {
  if (!singleton) {
    if (process.env.RECORDINGS_STORAGE === "s3") {
      const bucket = process.env.S3_BUCKET;
      const accessKeyId = process.env.S3_ACCESS_KEY_ID;
      const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
      if (!bucket || !accessKeyId || !secretAccessKey) {
        throw new Error(
          "RECORDINGS_STORAGE=s3 requires S3_BUCKET, S3_ACCESS_KEY_ID, and S3_SECRET_ACCESS_KEY"
        );
      }
      singleton = new S3Store({
        bucket,
        endpoint: process.env.S3_ENDPOINT,
        region: process.env.S3_REGION ?? "us-east-1",
        accessKeyId,
        secretAccessKey,
        forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
      });
    } else {
      // Default: local disk. Lazy process.cwd() avoids Turbopack over-tracing.
      const root = path.resolve(
        process.env.RECORDINGS_DIR || path.join(process.cwd(), ".recordings")
      );
      singleton = new LocalDiskStore(root);
    }
  }
  return singleton;
}
