import { test, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { panelPreference, spacePreference, pinnedPanels } from "../src/lib/dashboard-layout";
import { splitRecords, joinRecords } from "../src/lib/sync-contract";
import {
  saveFile,
  readFile,
  listFiles,
  fileType,
} from "../src/lib/private-files";
import { db } from "../src/lib/db";
test("customization keeps shared panels independent across spaces and migrates legacy preferences", () => {
  const layout = {
    "panel:news": { hidden: false, collapsed: true },
    "panel:main:news": { hidden: true, collapsed: false },
    "space:media": { accent: "dusk", density: "compact" },
  };
  assert.equal(panelPreference(layout, "main", "news").hidden, true);
  assert.deepEqual(panelPreference(layout, "media", "news"), {
    hidden: false,
    collapsed: true,
    pinned: false,
    order: undefined,
  });
  assert.deepEqual(spacePreference(layout, "main"), {
    accent: "palette",
    density: "comfortable",
    palette: "shared",
  });
  assert.deepEqual(spacePreference(layout, "media"), {
    accent: "palette",
    density: "compact",
    palette: "shared",
  });
  const raw = JSON.stringify(layout);
  assert.deepEqual(
    JSON.parse(
      joinRecords("daymark:layout", splitRecords("daymark:layout", raw)),
    ),
    layout,
  );
});
test('sidebar pins belong to each space, respect hidden panels and follow panel order', () => {
  assert.deepEqual(pinnedPanels({},'main').map(p=>p.id),['gmail','music','projects']);
  const layout={'panel:school:readings':{pinned:false},'panel:school:todo':{pinned:true,order:0},'panel:school:study':{hidden:true}};
  assert.deepEqual(pinnedPanels(layout,'school').map(p=>p.id),['todo']);
  assert.deepEqual(pinnedPanels(layout,'media').map(p=>p.id),['music','entertainment','releases']);
});
test("private file chunks round-trip, duplicate uploads do not multiply content, unsupported types are rejected", async () => {
  process.env.TURSO_DATABASE_URL = `file:${join(await mkdtemp(join(tmpdir(), "daymark-files-test-")), "files.db")}`;
  const bytes = Buffer.alloc(1200000, 17);
  bytes.write("%PDF-1.7");
  const id = await saveFile(bytes, "Test reading.pdf", "HIST 300");
  assert.equal(id.length, 64);
  assert.deepEqual((await readFile(id))?.bytes, bytes);
  assert.equal(await saveFile(bytes, "Second name.pdf", "HIST 300"), id);
  assert.equal((await listFiles()).length, 1);
  assert.equal(await readFile("0".repeat(64)), null);
  assert.equal(fileType(Buffer.from("<svg/>")), null);
  await assert.rejects(saveFile(Buffer.from("<svg/>"), "bad.svg", "Personal"));
});
after(() => db().close());
