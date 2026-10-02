import fs from 'fs';

const svgContent = fs.readFileSync('d:/Ứng dụng tin học trong kế toán/so_do_luong_nghiep_vu_doc_hd.svg', 'utf8');

// Ensure responsive width
const responsiveSvg = svgContent
  .replace('width="1697.08984375"', 'width="100%"')
  .replace('height="884"', 'style="max-height: 80vh; width: 100%; height: auto; display: block;"');

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
    }
    .svg-wrapper svg {
      min-width: 800px;
    }
  </style>
</head>
<body class="bg-transparent text-[var(--foreground)] antialiased">
  <div class="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 shadow-sm">
    <div class="flex flex-wrap items-center justify-between gap-3 mb-3 border-b border-[var(--border)] pb-3">
      <div>
        <h2 class="text-base font-bold text-[var(--foreground)]">SƠ ĐỒ NGUYÊN GỐC (BÁO CÁO ULTIMATE FULL AUDIT)</h2>
        <p class="text-xs text-[var(--muted-foreground)]">Định dạng Vector SVG trực tiếp • Không mờ • Không vỡ nét</p>
      </div>
      <div class="flex items-center gap-2">
        <button onclick="downloadPNG()" class="px-3 py-1.5 bg-[#0288d1] hover:bg-[#0277bd] text-white text-xs font-semibold rounded-lg shadow-sm transition">
          📥 Tải PNG
        </button>
        <button onclick="downloadSVG()" class="px-3 py-1.5 bg-[#10b981] hover:bg-[#059669] text-white text-xs font-semibold rounded-lg shadow-sm transition">
          🎨 Tải SVG
        </button>
      </div>
    </div>

    <div class="svg-wrapper" id="svg-container">
      ${responsiveSvg}
    </div>
  </div>

  <script>
    function downloadSVG() {
      const svg = document.querySelector('svg');
      const data = new XMLSerializer().serializeToString(svg);
      const blob = new Blob([data], { type: 'image/svg+xml;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'so_do_nguyen_goc_ultimate_full.svg';
      a.click();
    }

    function downloadPNG() {
      const svg = document.querySelector('svg');
      const data = new XMLSerializer().serializeToString(svg);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      const blob = new Blob([data], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);

      img.onload = function() {
        canvas.width = 1697 * 2;
        canvas.height = 884 * 2;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const a = document.createElement('a');
        a.href = canvas.toDataURL('image/png');
        a.download = 'so_do_nguyen_goc_ultimate_full.png';
        a.click();
      };
      img.src = url;
    }
  </script>
</body>
</html>`;

fs.writeFileSync('C:/Users/HP/.gemini/antigravity/brain/c2d30583-6ab9-43e3-b3f0-cc3448a96ee4/so_do_truc_tiep.html', html);
fs.writeFileSync('d:/Ứng dụng tin học trong kế toán/so_do_truc_tiep.html', html);
console.log('✅ Generated so_do_truc_tiep.html successfully!');
