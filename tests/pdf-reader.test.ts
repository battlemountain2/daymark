import { test } from "node:test";
import assert from "node:assert/strict";
function examplePdf() {
  const stream =
    "BT /F1 18 Tf 50 700 Td (A synthetic passage for reader verification.) Tj ET";
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
  ];
  let body = "%PDF-1.4\n";
  const offsets = [0];
  for (let i = 0; i < objects.length; i++) {
    offsets.push(Buffer.byteLength(body));
    body += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const xref = Buffer.byteLength(body);
  body += `xref\n0 6\n0000000000 65535 f \n${offsets
    .slice(1)
    .map((n) => `${String(n).padStart(10, "0")} 00000 n \n`)
    .join("")}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new Uint8Array(Buffer.from(body));
}
test("installed PDF.js parses real text geometry from a synthetic PDF without user files", async () => {
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const task = getDocument({ data: examplePdf(), useSystemFonts: true });
  try {
    const doc = await task.promise;
    assert.equal(doc.numPages, 1);
    const page = await doc.getPage(1);
    const text = await page.getTextContent();
    assert.ok(
      text.items.some(
        (item) => "str" in item && item.str.includes("synthetic passage"),
      ),
    );
    const viewport = page.getViewport({ scale: 1.25 });
    assert.equal(viewport.width, 765);
    assert.equal(viewport.height, 990);
  } finally {
    await task.destroy();
  }
});
