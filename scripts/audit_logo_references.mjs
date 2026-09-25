import fs from "node:fs";
import path from "node:path";

const targetDirs = [
  "frontend/src",
  "frontend/public",
  "backend/src",
];
const targetFiles = [
  "frontend/index.html",
  "frontend/src/styles.css",
];

const results = [];

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split("\n");

  const hits = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    // Checks
    const hasLogoWord = /logo|brand|favicon/i.test(line);
    const hasImgTag = /<img\b/i.test(line);
    const hasImgExt = /\.(png|svg|jpg|jpeg|webp|ico)\b/i.test(line);
    const hasBase64 = /data:image/i.test(line);
    const hasPrint = /document\.write|window\.open/i.test(line);

    if (hasLogoWord || hasImgTag || (hasImgExt && !line.includes("node_modules")) || hasBase64) {
      hits.push({
        lineNum,
        text: line.trim().slice(0, 140),
        reason: [
          hasLogoWord ? "logo/brand/favicon" : null,
          hasImgTag ? "<img" : null,
          hasImgExt ? "image-ext" : null,
          hasBase64 ? "base64" : null,
        ].filter(Boolean).join(", "),
      });
    }
  }

  if (hits.length > 0) {
    results.push({ file: filePath, hits });
  }
}

function walkDir(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name).replace(/\\/g, "/");
    if (entry.isDirectory()) {
      if (entry.name !== "node_modules" && entry.name !== ".git" && entry.name !== "dist") {
        walkDir(fullPath);
      }
    } else if (entry.isFile()) {
      if (/\.(jsx?|tsx?|html|css|json)$/i.test(entry.name)) {
        scanFile(fullPath);
      }
    }
  }
}

for (const d of targetDirs) {
  walkDir(d);
}
for (const f of targetFiles) {
  if (fs.existsSync(f)) scanFile(f);
}

console.log("=== COMPREHENSIVE LOGO & BRAND REFERENCE AUDIT ===");
console.log(`Scanned ${results.length} files with relevant references.\n`);

for (const r of results) {
  console.log(`--- ${r.file} (${r.hits.length} matches) ---`);
  for (const h of r.hits) {
    console.log(`  Line ${h.lineNum} [${h.reason}]: ${h.text}`);
  }
}
