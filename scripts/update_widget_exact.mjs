import fs from 'fs';

const svgContent = fs.readFileSync('d:/Ứng dụng tin học trong kế toán/so_do_nguyen_goc_chuan_100.svg', 'utf8');

// Strip xml declaration for inline SVG
const inlineSvg = svgContent.replace(/<\?xml.*?\?>/, '').trim();

const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <script src="https://www.gstatic.com/antigravity/web/dev/tailwindcss.min.js"></script>
  <style>
    body {
      margin: 0;
      padding: 12px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    .svg-wrapper {
      background: #ffffff;
      border-radius: 8px;
      padding: 16px;
      overflow: auto;
      display: flex;
      justify-content: center;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      max-height: 85vh;
    }
    .svg-wrapper svg {
      width: 100%;
      max-width: 900px;
      height: auto;
      display: block;
    }
  </style>
</head>
<body class="bg-transparent text-[var(--foreground)] antialiased">
  <div class="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 shadow-sm">
    <div class="flex flex-wrap items-center justify-between gap-3 mb-3 border-b border-[var(--border)] pb-3">
      <div>
        <h2 class="text-base font-bold text-[var(--foreground)]">SƠ ĐỒ NGUYÊN GỐC (BÁO CÁO ULTIMATE FULL AUDIT)</h2>
        <p class="text-xs text-[var(--muted-foreground)]">Đúng 100% bố cục dọc nguyên bản • Độ phân giải cao 1600 × 2400 px</p>
      </div>
      <div class="flex items-center gap-2">
        <a href="so_do_nguyen_goc_chuan_100.png" download="so_do_nguyen_goc_ultimate_full.png" class="px-3 py-1.5 bg-[#0288d1] hover:bg-[#0277bd] text-white text-xs font-semibold rounded-lg shadow-sm transition">
          📥 Tải Ảnh PNG (1600x2400)
        </a>
        <a href="so_do_nguyen_goc_chuan_100.svg" download="so_do_nguyen_goc_ultimate_full.svg" class="px-3 py-1.5 bg-[#10b981] hover:bg-[#059669] text-white text-xs font-semibold rounded-lg shadow-sm transition">
          🎨 Tải File Vector SVG
        </a>
      </div>
    </div>

    <div class="svg-wrapper" id="svg-container">
      ${inlineSvg}
    </div>
  </div>
</body>
</html>`;

fs.writeFileSync('C:/Users/HP/.gemini/antigravity/brain/c2d30583-6ab9-43e3-b3f0-cc3448a96ee4/so_do_truc_tiep.html', html);
fs.writeFileSync('d:/Ứng dụng tin học trong kế toán/so_do_truc_tiep.html', html);
fs.writeFileSync('C:/Users/HP/Desktop/so_do_truc_tiep.html', html);

console.log('✅ Updated so_do_truc_tiep.html with exact vertical layout!');
