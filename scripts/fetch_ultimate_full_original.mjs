import fs from 'fs';

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

async function main() {
  console.log("Fetching SVG from kroki...");
  const resSvg = await fetch('https://kroki.io/mermaid/svg', {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    body: code
  });
  if (resSvg.ok) {
    const svgText = await resSvg.text();
    fs.writeFileSync('d:/Ứng dụng tin học trong kế toán/so_do_nguyen_goc_ultimate_full.svg', svgText);
    fs.writeFileSync('C:/Users/HP/.gemini/antigravity/brain/c2d30583-6ab9-43e3-b3f0-cc3448a96ee4/so_do_nguyen_goc_ultimate_full.svg', svgText);
    console.log("✅ Saved SVG! Size:", svgText.length);
  } else {
    console.error("❌ SVG failed HTTP:", resSvg.status);
  }

  console.log("Fetching PNG from kroki...");
  const resPng = await fetch('https://kroki.io/mermaid/png', {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    body: code
  });
  if (resPng.ok) {
    const buf = await resPng.arrayBuffer();
    fs.writeFileSync('d:/Ứng dụng tin học trong kế toán/so_do_nguyen_goc_ultimate_full.png', Buffer.from(buf));
    fs.writeFileSync('C:/Users/HP/Desktop/so_do_nguyen_goc_ultimate_full.png', Buffer.from(buf));
    fs.writeFileSync('C:/Users/HP/.gemini/antigravity/brain/c2d30583-6ab9-43e3-b3f0-cc3448a96ee4/so_do_nguyen_goc_ultimate_full.png', Buffer.from(buf));
    console.log("✅ Saved PNG! Size:", buf.byteLength);
  } else {
    console.error("❌ PNG failed HTTP:", resPng.status);
  }
}

main();
