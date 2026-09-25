/**
 * Tiện ích xuất dữ liệu ra file CSV / Excel hỗ trợ tiếng Việt đầy đủ (UTF-8 with BOM)
 * Phục vụ báo cáo tài chính, danh mục sản phẩm, công nợ, tồn kho.
 */

/**
 * Xuất dữ liệu mảng ra file CSV chuẩn UTF-8
 * @param {string} filename - Tên file xuất (ví dụ: 'BaoCaoDoanhThu.csv')
 * @param {string[]} headers - Mảng tiêu đề cột
 * @param {Array<Array<any>>} rows - Mảng các dòng dữ liệu
 */
export function exportToCsv(filename, headers, rows) {
  const sanitize = (val) => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const headerRow = headers.map(sanitize).join(",");
  const dataRows = rows.map((row) => row.map(sanitize).join(","));
  const csvContent = "\uFEFF" + [headerRow, ...dataRows].join("\r\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename.endsWith(".csv") ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Xuất bảng dữ liệu ra file Excel (.xls) có định dạng trực quan (mở được ngay bằng MS Excel)
 * @param {string} filename - Tên file (ví dụ: 'TonKho_2026.xls')
 * @param {string} title - Tiêu đề báo cáo
 * @param {string[]} headers - Danh sách cột
 * @param {Array<Array<any>>} rows - Danh sách dòng
 * @param {Array<any>} summaryRow - Dòng tổng cộng nếu có
 */
export function exportToExcel(filename, title, headers, rows, summaryRow = null) {
  const now = new Date().toLocaleString("vi-VN");

  let tableHtml = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
      <!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Báo cáo</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
      <style>
        body { font-family: Arial, sans-serif; font-size: 13px; }
        .report-title { font-size: 16px; font-weight: bold; color: #2A4F49; text-align: center; }
        .report-sub { font-size: 11px; color: #64748B; text-align: center; margin-bottom: 15px; }
        th { background-color: #3D7068; color: #ffffff; font-weight: bold; border: 1px solid #CBD5E1; padding: 8px; text-align: center; }
        td { border: 1px solid #E2E8F0; padding: 6px; }
        .num { text-align: right; }
        .center { text-align: center; }
        .summary-row { font-weight: bold; background-color: #F1F5F9; }
      </style>
    </head>
    <body>
      <div class="report-title">${title}</div>
      <div class="report-sub">Thời điểm xuất: ${now} | Hệ thống Quản lý Cửa hàng Mẹ & Bé</div>
      <table>
        <thead>
          <tr>
            ${headers.map((h) => `<th>${h}</th>`).join("")}
          </tr>
        </thead>
        <tbody>
          ${rows
            .map(
              (r) =>
                `<tr>${r
                  .map((cell) => {
                    const isNum = typeof cell === "number" || (!isNaN(cell) && cell !== "" && typeof cell !== "boolean");
                    return `<td class="${isNum ? "num" : ""}">${cell ?? "—"}</td>`;
                  })
                  .join("")}</tr>`
            )
            .join("")}
          ${
            summaryRow
              ? `<tr class="summary-row">${summaryRow
                  .map((cell) => `<td class="${typeof cell === "number" ? "num" : ""}">${cell ?? ""}</td>`)
                  .join("")}</tr>`
              : ""
          }
        </tbody>
      </table>
    </body>
    </html>
  `;

  const blob = new Blob(["\uFEFF" + tableHtml], { type: "application/vnd.ms-excel;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename.endsWith(".xls") ? filename : `${filename}.xls`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Xuất bảng dữ liệu ra file PDF chuẩn A4 tải trực tiếp về máy
 * @param {string} filename - Tên file (ví dụ: 'BaoCaoDoanhThu.pdf')
 * @param {string} title - Tiêu đề báo cáo
 * @param {string[]} headers - Danh sách cột
 * @param {Array<Array<any>>} rows - Danh sách dòng
 * @param {Array<any>} summaryRow - Dòng tổng cộng nếu có
 * @param {'portrait' | 'landscape'} orientation - Hướng trang
 */
export async function exportToPdf(filename, title, headers, rows, summaryRow = null, orientation = "portrait") {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({
    orientation,
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 12;
  let currentY = 16;

  // Chuyển ký tự tiếng Việt an toàn cho font chuẩn PDF
  const clean = (val) => {
    if (val === null || val === undefined) return "";
    return String(val)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "D");
  };

  // Header cửa hàng
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(42, 79, 73);
  doc.text("CUA HANG ME & BE", margin, currentY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text("He thong quan ly Cua hang Me va Be | Hotline: 0987 654 321 | Email: contact@cuahangmebe.vn", margin, currentY + 5);
  doc.text("Dia chi: 123 Duong Cau Giay, Phuong Dich Vong, Quan Cau Giay, Ha Noi", margin, currentY + 9.5);

  currentY += 17;

  // Tiêu đề báo cáo
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12.5);
  doc.setTextColor(15, 23, 42);
  doc.text(clean(title).toUpperCase(), pageWidth / 2, currentY, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  const now = new Date().toLocaleString("vi-VN");
  doc.text(`Thoi diem xuat: ${now}`, pageWidth / 2, currentY + 5, { align: "center" });

  currentY += 12;

  // Tính độ rộng cột
  const availableWidth = pageWidth - margin * 2;
  const colCount = Math.max(1, headers.length);
  const colWidth = availableWidth / colCount;

  // Vẽ Header bảng
  doc.setFillColor(61, 112, 104); // #3D7068
  doc.rect(margin, currentY, availableWidth, 7.5, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);

  headers.forEach((h, i) => {
    const x = margin + i * colWidth + 2;
    doc.text(clean(h), x, currentY + 5, { maxWidth: colWidth - 4 });
  });

  currentY += 7.5;

  // Vẽ các dòng dữ liệu
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(30, 41, 59);

  const rowHeight = 6.5;
  rows.forEach((row, rIdx) => {
    if (currentY + rowHeight > pageHeight - 22) {
      doc.addPage();
      currentY = 16;
      doc.setFillColor(61, 112, 104);
      doc.rect(margin, currentY, availableWidth, 7.5, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      headers.forEach((h, i) => {
        doc.text(clean(h), margin + i * colWidth + 2, currentY + 5, { maxWidth: colWidth - 4 });
      });
      currentY += 7.5;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(30, 41, 59);
    }

    if (rIdx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, currentY, availableWidth, rowHeight, "F");
    }

    row.forEach((cell, cIdx) => {
      const isNum = typeof cell === "number";
      const txt = isNum ? cell.toLocaleString("vi-VN") : clean(cell);
      const x = isNum ? margin + (cIdx + 1) * colWidth - 2 : margin + cIdx * colWidth + 2;
      const align = isNum ? "right" : "left";
      doc.text(txt, x, currentY + 4.5, { align, maxWidth: colWidth - 4 });
    });

    doc.setDrawColor(226, 232, 240);
    doc.line(margin, currentY + rowHeight, margin + availableWidth, currentY + rowHeight);
    currentY += rowHeight;
  });

  // Dòng tổng cộng
  if (summaryRow) {
    if (currentY + rowHeight > pageHeight - 22) {
      doc.addPage();
      currentY = 16;
    }
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, currentY, availableWidth, rowHeight + 1, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);

    summaryRow.forEach((cell, cIdx) => {
      const isNum = typeof cell === "number";
      const txt = isNum ? cell.toLocaleString("vi-VN") : clean(cell);
      const x = isNum ? margin + (cIdx + 1) * colWidth - 2 : margin + cIdx * colWidth + 2;
      const align = isNum ? "right" : "left";
      doc.text(txt, x, currentY + 5, { align, maxWidth: colWidth - 4 });
    });
    currentY += rowHeight + 2;
  }

  // Chữ ký
  if (currentY + 24 < pageHeight) {
    currentY += 8;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text("Nguoi lap bieu", margin + 15, currentY);
    doc.text("Ke toan truong", pageWidth / 2, currentY, { align: "center" });
    doc.text("Giam doc / Quan ly", pageWidth - margin - 30, currentY);

    doc.setFont("helvetica", "italic");
    doc.setFontSize(7);
    doc.text("(Ky, ho ten)", margin + 15, currentY + 4);
    doc.text("(Ky, ho ten)", pageWidth / 2, currentY + 4, { align: "center" });
    doc.text("(Ky, dong dau)", pageWidth - margin - 30, currentY + 4);
  }

  const cleanName = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;
  doc.save(cleanName);
}

