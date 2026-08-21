/**
 * A dependency-free .docx writer.
 *
 * The final tab could only hand out .txt, which loses every heading and is not
 * what anyone submits. A real .docx is just a ZIP holding three XML parts, so
 * it is written by hand here rather than pulling in a document library that
 * would ship to every visitor's browser. Word and 한글(HWP) both open .docx
 * directly — 한글's own .hwp is a closed binary format that cannot be produced
 * honestly, so .docx is the format that serves both.
 */

export type DocxBlock = { text: string; style?: "title" | "heading" | "body" };

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    table[index] = value >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function escapeXml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[character]!);
}

// Half-points, as Word measures them: 32 = 16pt.
const STYLE_SIZE: Record<NonNullable<DocxBlock["style"]>, number> = { title: 32, heading: 24, body: 20 };

function paragraph(block: DocxBlock) {
  const style = block.style ?? "body";
  const bold = style === "title" || style === "heading" ? "<w:b/>" : "";
  const runProperties = `<w:rPr><w:rFonts w:ascii="맑은 고딕" w:hAnsi="맑은 고딕" w:eastAsia="맑은 고딕"/>${bold}<w:sz w:val="${STYLE_SIZE[style]}"/></w:rPr>`;
  const spacing = `<w:pPr><w:spacing w:before="${style === "heading" ? 240 : 0}" w:after="120" w:line="300" w:lineRule="auto"/></w:pPr>`;
  const run = block.text ? `<w:r>${runProperties}<w:t xml:space="preserve">${escapeXml(block.text)}</w:t></w:r>` : "";
  return `<w:p>${spacing}${run}</w:p>`;
}

function documentXml(blocks: readonly DocxBlock[]) {
  // A blank line inside a block is still a paragraph break in Word.
  const paragraphs = blocks.flatMap((block) => block.text.split("\n").map((line) => paragraph({ ...block, text: line })));
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${paragraphs.join("")}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1418" w:right="1418" w:bottom="1418" w:left="1418"/></w:sectPr></w:body></w:document>`;
}

const CONTENT_TYPES_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`;

const RELS_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`;

type ZipEntry = { name: string; data: Uint8Array };

/** Stored (uncompressed) ZIP. Word accepts it and it keeps this file small. */
function zip(entries: readonly ZipEntry[]): Uint8Array<ArrayBuffer> {
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;

  for (const entry of entries) {
    const name = encoder.encode(entry.name);
    const crc = crc32(entry.data);
    const local = new Uint8Array(30 + name.length);
    const localView = new DataView(local.buffer);
    localView.setUint32(0, 0x04034b50, true);
    localView.setUint16(4, 20, true);
    localView.setUint16(6, 0x0800, true); // UTF-8 file names
    localView.setUint32(14, crc, true);
    localView.setUint32(18, entry.data.length, true);
    localView.setUint32(22, entry.data.length, true);
    localView.setUint16(26, name.length, true);
    local.set(name, 30);

    const header = new Uint8Array(46 + name.length);
    const headerView = new DataView(header.buffer);
    headerView.setUint32(0, 0x02014b50, true);
    headerView.setUint16(4, 20, true);
    headerView.setUint16(6, 20, true);
    headerView.setUint16(8, 0x0800, true);
    headerView.setUint32(16, crc, true);
    headerView.setUint32(20, entry.data.length, true);
    headerView.setUint32(24, entry.data.length, true);
    headerView.setUint16(28, name.length, true);
    headerView.setUint32(42, offset, true);
    header.set(name, 46);

    chunks.push(local, entry.data);
    central.push(header);
    offset += local.length + entry.data.length;
  }

  const centralSize = central.reduce((total, part) => total + part.length, 0);
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(8, entries.length, true);
  endView.setUint16(10, entries.length, true);
  endView.setUint32(12, centralSize, true);
  endView.setUint32(16, offset, true);

  const all = [...chunks, ...central, end];
  const output = new Uint8Array(all.reduce((total, part) => total + part.length, 0));
  let cursor = 0;
  for (const part of all) {
    output.set(part, cursor);
    cursor += part.length;
  }
  return output;
}

export function buildDocx(blocks: readonly DocxBlock[]): Uint8Array<ArrayBuffer> {
  const encoder = new TextEncoder();
  return zip([
    { name: "[Content_Types].xml", data: encoder.encode(CONTENT_TYPES_XML) },
    { name: "_rels/.rels", data: encoder.encode(RELS_XML) },
    { name: "word/document.xml", data: encoder.encode(documentXml(blocks)) },
  ]);
}

export const DOCX_MIME_TYPE = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
