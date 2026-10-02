/**
 * Migration: Fix ObjectId hex strings leaked into PhieuChi.LyDo and PhieuChi.ChungTuGoc
 *
 * This script:
 * 1. Finds all PhieuChi records where LyDo contains a 24-char hex ObjectId
 * 2. Resolves each ObjectId to the human-readable MaPN (PhieuNhap code) or MaCN (CongNo code)
 * 3. Replaces the hex string in LyDo with the resolved code
 * 4. Fixes ChungTuGoc if it is undefined/null or contains ObjectId
 * 5. Reports changes made
 */
import { MongoClient, ObjectId } from "mongodb";

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017";
const DB_NAME   = process.env.DB_NAME   || "baby_shop_management";
const HEX_24    = /[0-9a-fA-F]{24}/g;

async function main() {
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  const db = client.db(DB_NAME);

  console.log("═══════════════════════════════════════════════════════════");
  console.log("  FIX ObjectId in PhieuChi.LyDo & ChungTuGoc");
  console.log("═══════════════════════════════════════════════════════════\n");

  // Cache: ObjectId hex -> human-readable code
  const resolveCache = {};

  // Pre-load PhieuNhap codes
  const allPN = await db.collection("PhieuNhap").find({}, { projection: { MaPN: 1 } }).toArray();
  for (const pn of allPN) {
    resolveCache[String(pn._id)] = pn.MaPN || `PN-${String(pn._id).slice(-6)}`;
  }
  console.log(`  Loaded ${allPN.length} PhieuNhap records into cache`);

  // Pre-load CongNo codes
  const allCN = await db.collection("CongNo").find({}, { projection: { MaCN: 1, MaPN: 1 } }).toArray();
  for (const cn of allCN) {
    resolveCache[String(cn._id)] = cn.MaCN || `CN-${String(cn._id).slice(-6)}`;
  }
  console.log(`  Loaded ${allCN.length} CongNo records into cache`);

  // Pre-load NhaCungCap codes
  const allNCC = await db.collection("NhaCungCap").find({}, { projection: { MaNCC: 1 } }).toArray();
  for (const ncc of allNCC) {
    resolveCache[String(ncc._id)] = ncc.MaNCC || `NCC-${String(ncc._id).slice(-6)}`;
  }
  console.log(`  Loaded ${allNCC.length} NhaCungCap records into cache`);

  // Find PhieuChi with hex ObjectId in LyDo
  const allPC = await db.collection("PhieuChi").find({}).toArray();
  let fixedLyDo    = 0;
  let fixedCTG     = 0;
  let totalChecked = 0;

  for (const pc of allPC) {
    totalChecked++;
    const updates = {};
    let needUpdate = false;

    // --- Fix LyDo ---
    const lydo = String(pc.LyDo || "");
    if (HEX_24.test(lydo)) {
      HEX_24.lastIndex = 0; // reset
      const newLyDo = lydo.replace(HEX_24, (match) => {
        if (resolveCache[match]) return resolveCache[match];
        // Try to resolve live
        return pc.MaPNCode || pc.MaCNCode || "chứng từ";
      });
      if (newLyDo !== lydo) {
        updates.LyDo = newLyDo;
        needUpdate = true;
        fixedLyDo++;
      }
    }

    // --- Fix ChungTuGoc ---
    const ctg = pc.ChungTuGoc;
    if (!ctg || ctg === "undefined" || (typeof ctg === "string" && HEX_24.test(ctg))) {
      HEX_24.lastIndex = 0;
      // Best resolution: MaPNCode from the record, then look up from cache
      let resolved = pc.MaPNCode || null;
      if (!resolved && pc.MaPN) {
        resolved = resolveCache[String(pc.MaPN)] || null;
      }
      if (!resolved && pc.MaCN) {
        resolved = resolveCache[String(pc.MaCN)] || null;
      }
      if (!resolved) {
        resolved = pc.MaCNCode || "";
      }
      if (resolved && resolved !== ctg) {
        updates.ChungTuGoc = resolved;
        needUpdate = true;
        fixedCTG++;
      }
    }

    if (needUpdate) {
      await db.collection("PhieuChi").updateOne(
        { _id: pc._id },
        { $set: updates }
      );
      console.log(`  ✔ ${pc.MaPC}: LyDo=${updates.LyDo ? "FIXED" : "OK"}, ChungTuGoc=${updates.ChungTuGoc ? "FIXED→" + updates.ChungTuGoc : "OK"}`);
    }
  }

  console.log(`\n═══════════════════════════════════════════════════════════`);
  console.log(`  RESULTS`);
  console.log(`  Total PhieuChi checked: ${totalChecked}`);
  console.log(`  LyDo fixed:            ${fixedLyDo}`);
  console.log(`  ChungTuGoc fixed:      ${fixedCTG}`);
  console.log(`═══════════════════════════════════════════════════════════`);

  // Also check PhieuThu for the same issue
  const allPT = await db.collection("PhieuThu").find({}).toArray();
  let ptFixed = 0;
  for (const pt of allPT) {
    const lydo = String(pt.LyDo || "");
    if (HEX_24.test(lydo)) {
      HEX_24.lastIndex = 0;
      const newLyDo = lydo.replace(HEX_24, (match) => {
        if (resolveCache[match]) return resolveCache[match];
        return "chứng từ";
      });
      if (newLyDo !== lydo) {
        await db.collection("PhieuThu").updateOne(
          { _id: pt._id },
          { $set: { LyDo: newLyDo } }
        );
        ptFixed++;
        console.log(`  ✔ PhieuThu ${pt.MaPT}: LyDo FIXED`);
      }
    }
  }
  if (ptFixed > 0) {
    console.log(`  PhieuThu LyDo fixed: ${ptFixed}`);
  } else {
    console.log(`  PhieuThu: all clean (${allPT.length} records checked)`);
  }

  // Also check ThanhToan for the same issue
  const allTT = await db.collection("ThanhToan").find({}).toArray();
  let ttFixed = 0;
  for (const tt of allTT) {
    const ghiChu = String(tt.GhiChu || tt.note || "");
    if (HEX_24.test(ghiChu)) {
      HEX_24.lastIndex = 0;
      const newGhiChu = ghiChu.replace(HEX_24, (match) => {
        if (resolveCache[match]) return resolveCache[match];
        return "chứng từ";
      });
      if (newGhiChu !== ghiChu) {
        const field = tt.GhiChu ? "GhiChu" : "note";
        await db.collection("ThanhToan").updateOne(
          { _id: tt._id },
          { $set: { [field]: newGhiChu } }
        );
        ttFixed++;
        console.log(`  ✔ ThanhToan ${tt.MaTT}: ${field} FIXED`);
      }
    }
  }
  if (ttFixed > 0) {
    console.log(`  ThanhToan fixed: ${ttFixed}`);
  } else {
    console.log(`  ThanhToan: all clean (${allTT.length} records checked)`);
  }

  await client.close();
  console.log("\nDone! ✅");
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
