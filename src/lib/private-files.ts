import { createHash } from "node:crypto";
import { db } from "@/lib/db";
export type PrivateFile = {
  id: string;
  name: string;
  type: string;
  size: number;
  course: string;
  created: string;
};
let schema: Promise<unknown> | undefined;
export async function ensureFiles() {
  await (schema ||= db()
    .batch(
      [
        "CREATE TABLE IF NOT EXISTS private_files(id TEXT PRIMARY KEY,name TEXT NOT NULL,type TEXT NOT NULL,size INTEGER NOT NULL,course TEXT NOT NULL,created TEXT NOT NULL)",
        "CREATE TABLE IF NOT EXISTS private_file_chunks(file_id TEXT NOT NULL,part INTEGER NOT NULL,data BLOB NOT NULL,PRIMARY KEY(file_id,part))",
      ],
      "write",
    )
    .catch((e) => {
      schema = undefined;
      throw e;
    }));
}
export function fileType(bytes: Uint8Array) {
  const b = Buffer.from(bytes);
  if (b.subarray(0, 5).toString() === "%PDF-") return "application/pdf";
  if (b[0] === 255 && b[1] === 216 && b[2] === 255) return "image/jpeg";
  if (b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])))
    return "image/png";
  if (
    b.subarray(0, 4).toString() === "RIFF" &&
    b.subarray(8, 12).toString() === "WEBP"
  )
    return "image/webp";
  return null;
}
export async function listFiles(): Promise<PrivateFile[]> {
  await ensureFiles();
  const r = await db().execute(
    "SELECT id,name,type,size,course,created FROM private_files ORDER BY created DESC",
  );
  return r.rows.map((row) => ({
    id: String(row.id),
    name: String(row.name),
    type: String(row.type),
    size: Number(row.size),
    course: String(row.course),
    created: String(row.created),
  }));
}
export async function saveFile(
  bytes: Uint8Array,
  name: string,
  course: string,
) {
  await ensureFiles();
  const type = fileType(bytes);
  if (!type) throw Error("Choose a PDF, JPEG, PNG, or WebP.");
  const id = createHash("sha256").update(bytes).digest("hex");
  const tx = await db().transaction("write");
  try {
    await tx.execute({
      sql: "INSERT OR IGNORE INTO private_files(id,name,type,size,course,created) VALUES(?,?,?,?,?,?)",
      args: [
        id,
        name.slice(0, 240),
        type,
        bytes.length,
        course.slice(0, 80),
        new Date().toISOString(),
      ],
    });
    for (
      let offset = 0, part = 0;
      offset < bytes.length;
      offset += 512 * 1024, part++
    )
      await tx.execute({
        sql: "INSERT OR IGNORE INTO private_file_chunks(file_id,part,data) VALUES(?,?,?)",
        args: [id, part, bytes.slice(offset, offset + 512 * 1024)],
      });
    await tx.commit();
    return id;
  } catch (e) {
    await tx.rollback();
    throw e;
  } finally {
    tx.close();
  }
}
export async function readFile(id: string) {
  await ensureFiles();
  const m = await db().execute({
    sql: "SELECT name,type,size FROM private_files WHERE id=?",
    args: [id],
  });
  if (!m.rows[0]) return null;
  const r = await db().execute({
    sql: "SELECT data FROM private_file_chunks WHERE file_id=? ORDER BY part",
    args: [id],
  });
  const bytes = Buffer.concat(
    r.rows.map((row) => Buffer.from(row.data as ArrayBuffer)),
  );
  if (bytes.length !== Number(m.rows[0].size)) throw Error("Incomplete file");
  return { bytes, type: String(m.rows[0].type), name: String(m.rows[0].name) };
}
