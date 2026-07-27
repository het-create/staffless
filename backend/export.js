const { Document, Packer, Paragraph, HeadingLevel, TextRun } = require("docx");

/**
 * Turns the final package's plain text (which uses "=== SECTION ===" markers
 * from agents.js / simulate.js) into a structured .docx buffer, so an agency
 * can open it directly in Word and edit before sending to a client.
 */
async function buildDocx(productName, content) {
  const lines = content.split("\n");
  const children = [
    new Paragraph({
      text: productName || "Campaign Package",
      heading: HeadingLevel.TITLE,
    }),
    new Paragraph({
      children: [new TextRun({ text: "Prepared by STAFFLESS", italics: true, color: "666666" })],
    }),
    new Paragraph({ text: "" }),
  ];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      children.push(new Paragraph({ text: "" }));
      continue;
    }
    const sectionMatch = line.match(/^===\s*(.+?)\s*===$/);
    if (sectionMatch) {
      children.push(
        new Paragraph({
          text: sectionMatch[1],
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 300, after: 150 },
        })
      );
      continue;
    }
    children.push(new Paragraph({ text: line, spacing: { after: 80 } }));
  }

  const doc = new Document({
    sections: [{ properties: {}, children }],
  });

  return Packer.toBuffer(doc);
}

module.exports = { buildDocx };
