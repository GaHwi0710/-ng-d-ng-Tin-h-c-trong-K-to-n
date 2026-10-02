import fs from 'fs';
import zlib from 'zlib';

const code = `flowchart TD
    classDef core fill:#e1f5fe,stroke:#0288d1,stroke-width:2px;
    classDef trans fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px;
    classDef ledger fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px;
    classDef report fill:#fff3e0,stroke:#f57c00,stroke-width:2px;

    subgraph MUA_HANG ["1. Mua hàng & Quản lý Kho"]
        PO["Đơn Đặt Hàng (DDH)"] -->|Nhận hàng thực tế| GR["Phiếu Nhập Kho (PN)"]:::core
        GR -->|Cộng dồn thẻ kho| STOCK["Tồn Kho (TonKho)"]:::ledger
        GR -->|Ghi nhận nợ phải trả| DEBT_SUPP["Sổ Công Nợ NCC (CN)"]:::ledger
    end

    subgraph BAN_HANG ["2. Bán hàng & Xuất kho"]
        POS["Đơn Hàng Bán Lẻ (DH)"] -->|Hoàn thành| INV["Hóa Đơn (HD)"]:::core
        POS -->|Tự động xuất kho| GI["Phiếu Xuất Kho (PX)"]:::core
        GI -->|Trừ dồn thẻ kho| STOCK
        INV -->|Bán chịu ghi nợ| DEBT_CUST["Sổ Công Nợ KH (CN)"]:::ledger
    end

    subgraph DONG_TIEN ["3. Quỹ Tiền Mặt & Ngân Hàng"]
        DEBT_SUPP -->|Kế toán trả nợ| PC["Phiếu Chi Quỹ / Ngân Hàng (PC)"]:::trans
        DEBT_CUST -->|Khách nộp tiền| PT["Phiếu Thu Quỹ (PT)"]:::trans
        INV -->|Thu tiền ngay| PT
        GR -->|Trả tiền ngay| PC
        PC & PT --> TT["Nhật Ký Thanh Toán (ThanhToan)"]:::ledger
    end

    subgraph BAO_CAO ["4. Báo Cáo Kế Toán & Quản Trị"]
        STOCK --> R_INV["Báo Cáo Nhập - Xuất - Tồn"]:::report
        INV --> R_REV["Báo Cáo Doanh Thu (Ngày/Tháng/Năm)"]:::report
        DEBT_SUPP & DEBT_CUST --> R_DEBT["Báo Cáo Công Nợ"]:::report
        PC & PT --> R_CASH["Báo Cáo Thu - Chi / Sổ Quỹ"]:::report
    end`;

const deflated = zlib.deflateSync(Buffer.from(code, 'utf8'), { level: 9 });
const base64UrlSafe = deflated.toString('base64').replace(/\+/g, '-').replace(/\//g, '_');

async function downloadFormat(ext) {
  const url = `https://kroki.io/mermaid/${ext}/${base64UrlSafe}`;
  console.log(`Downloading ${ext} from: ${url.slice(0, 50)}...`);
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    const buf = await res.arrayBuffer();
    const destProject = `d:/Ứng dụng tin học trong kế toán/so_do_luong_nghiep_vu_sac_net.${ext}`;
    const destBrain = `C:/Users/HP/.gemini/antigravity/brain/c2d30583-6ab9-43e3-b3f0-cc3448a96ee4/so_do_luong_nghiep_vu_sac_net.${ext}`;
    fs.writeFileSync(destProject, Buffer.from(buf));
    fs.writeFileSync(destBrain, Buffer.from(buf));
    console.log(`✅ Saved ${ext}! Size: ${buf.byteLength} bytes`);
  } catch (err) {
    console.error(`❌ Error downloading ${ext}:`, err.message);
  }
}

async function main() {
  await downloadFormat('svg');
  await downloadFormat('png');
}

main();
