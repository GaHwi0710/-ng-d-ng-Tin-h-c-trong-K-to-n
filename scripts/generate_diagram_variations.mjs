import fs from 'fs';
import zlib from 'zlib';

// 1. Horizontal / natural high-res flow
const codeWide = `flowchart TD
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

// 2. Vertical stacked flow (exact match of user's mobile/vertical view)
const codeVertical = `flowchart TD
    classDef core fill:#e1f5fe,stroke:#0288d1,stroke-width:2px;
    classDef trans fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px;
    classDef ledger fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px;
    classDef report fill:#fff3e0,stroke:#f57c00,stroke-width:2px;

    subgraph BAN_HANG ["2. Bán hàng & Xuất kho"]
        POS["Đơn Hàng Bán Lẻ (DH)"] -->|Hoàn thành| INV["Hóa Đơn (HD)"]:::core
        POS -->|Tự động xuất kho| GI["Phiếu Xuất Kho (PX)"]:::core
        INV -->|Bán chịu ghi nợ| DEBT_CUST["Sổ Công Nợ KH (CN)"]:::ledger
    end

    subgraph MUA_HANG ["1. Mua hàng & Quản lý Kho"]
        PO["Đơn Đặt Hàng (DDH)"] -->|Nhận hàng thực tế| GR["Phiếu Nhập Kho (PN)"]:::core
        GR -->|Ghi nhận nợ phải trả| DEBT_SUPP["Sổ Công Nợ NCC (CN)"]:::ledger
        GR -->|Cộng dồn thẻ kho| STOCK["Tồn Kho (TonKho)"]:::ledger
    end

    subgraph DONG_TIEN ["3. Quỹ Tiền Mặt & Ngân Hàng"]
        PT["Phiếu Thu Quỹ (PT)"]:::trans
        PC["Phiếu Chi Quỹ / Ngân Hàng (PC)"]:::trans
        PT --> TT["Nhật Ký Thanh Toán (ThanhToan)"]:::ledger
        PC --> TT
    end

    subgraph BAO_CAO ["4. Báo Cáo Kế Toán & Quản Trị"]
        R_REV["Báo Cáo Doanh Thu (Ngày/Tháng/Năm)"]:::report
        R_DEBT["Báo Cáo Công Nợ"]:::report
        R_CASH["Báo Cáo Thu - Chi / Sổ Quỹ"]:::report
        R_INV["Báo Cáo Nhập - Xuất - Tồn"]:::report
    end

    GI -->|Trừ dồn thẻ kho| STOCK
    INV -->|Thu tiền ngay| PT
    DEBT_CUST -->|Khách nộp tiền| PT
    GR -->|Trả tiền ngay| PC
    DEBT_SUPP -->|Kế toán trả nợ| PC

    INV --> R_REV
    DEBT_CUST --> R_DEBT
    DEBT_SUPP --> R_DEBT
    TT --> R_CASH
    STOCK --> R_INV
`;

async function fetchKroki(code, filename) {
  const deflated = zlib.deflateSync(Buffer.from(code, 'utf8'), { level: 9 });
  const b64 = deflated.toString('base64').replace(/\+/g, '-').replace(/\//g, '_');
  
  for (const ext of ['png', 'svg']) {
    const url = `https://kroki.io/mermaid/${ext}/${b64}`;
    try {
      const res = await fetch(url);
      if (res.ok) {
        const buf = await res.arrayBuffer();
        const p1 = `d:/Ứng dụng tin học trong kế toán/${filename}.${ext}`;
        const p2 = `C:/Users/HP/.gemini/antigravity/brain/c2d30583-6ab9-43e3-b3f0-cc3448a96ee4/${filename}.${ext}`;
        fs.writeFileSync(p1, Buffer.from(buf));
        fs.writeFileSync(p2, Buffer.from(buf));
        console.log(`Saved ${filename}.${ext} (${buf.byteLength} bytes)`);
      } else {
        console.error(`Failed ${filename}.${ext}: HTTP ${res.status}`);
      }
    } catch (e) {
      console.error(`Error ${filename}.${ext}:`, e.message);
    }
  }
}

async function main() {
  console.log("Generating high-resolution vertical diagram (exact screenshot match)...");
  await fetchKroki(codeVertical, 'so_do_luong_nghiep_vu_doc_hd');
  console.log("Generating high-resolution wide diagram (panoramic view)...");
  await fetchKroki(codeWide, 'so_do_luong_nghiep_vu_ngang_hd');
}

main();
