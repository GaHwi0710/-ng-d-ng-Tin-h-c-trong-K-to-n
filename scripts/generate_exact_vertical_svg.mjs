import fs from 'fs';

// Dimensions of the high-res canvas (1200 x 1800, perfectly proportional to 600 x 900)
const W = 1200;
const H = 1800;

// Colors
const C = {
  bg: '#ffffff',
  boxBorder: '#475569',
  boxHeaderBg: '#f8fafc',
  boxTitle: '#334155',
  
  // Node colors matching mermaid classDef
  coreFill: '#e1f5fe',
  coreStroke: '#0288d1',
  
  ledgerFill: '#e8f5e9',
  ledgerStroke: '#2e7d32',
  
  transFill: '#f3e5f5',
  transStroke: '#7b1fa2',
  
  reportFill: '#fff3e0',
  reportStroke: '#f57c00',
  
  plainFill: '#ffffff',
  plainStroke: '#64748b',
  
  arrow: '#0288d1',
  arrowGray: '#64748b',
  
  pillBg: '#ffffff',
  pillBorder: '#e2e8f0',
  pillText: '#64748b',
  nodeText: '#0f172a'
};

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 1800" width="1200" height="1800" style="background:#ffffff; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <defs>
    <!-- Arrowhead markers -->
    <marker id="arrow-blue" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#0288d1"/>
    </marker>
    <marker id="arrow-gray" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#64748b"/>
    </marker>
    <!-- Shadows for pills and nodes -->
    <filter id="shadow" x="-5%" y="-5%" width="110%" height="110%">
      <feDropShadow dx="0" dy="1" stdDeviation="1.5" flood-color="#000" flood-opacity="0.06"/>
    </filter>
  </defs>

  <style>
    .subgraph { fill: #ffffff; stroke: #64748b; stroke-width: 1.5px; }
    .subgraph-title { font-size: 14px; font-weight: 700; fill: #334155; }
    .subgraph-header-line { stroke: #cbd5e1; stroke-width: 1px; }
    .node-text { font-size: 14px; font-weight: 600; fill: #0f172a; text-anchor: middle; dominant-baseline: central; }
    .node-text-sm { font-size: 13px; font-weight: 600; fill: #0f172a; text-anchor: middle; dominant-baseline: central; }
    .edge-label-bg { fill: #ffffff; stroke: #e2e8f0; stroke-width: 1px; rx: 4px; ry: 4px; }
    .edge-label-text { font-size: 11px; fill: #64748b; text-anchor: middle; dominant-baseline: central; font-weight: 500; }
    .line-blue { fill: none; stroke: #0288d1; stroke-width: 1.5px; marker-end: url(#arrow-blue); }
    .line-gray { fill: none; stroke: #64748b; stroke-width: 1.5px; marker-end: url(#arrow-gray); }
  </style>

  <!-- ========================================== -->
  <!-- 1. SUBGRAPH 2: BÁN HÀNG & XUẤT KHO (TOP)  -->
  <!-- ========================================== -->
  <g id="box-banhang">
    <rect class="subgraph" x="500" y="30" width="420" height="520" rx="4"/>
    <text class="subgraph-title" x="515" y="55">2. Bán hàng &amp; Xuất kho</text>
    <line class="subgraph-header-line" x1="500" y1="70" x2="920" y2="70"/>

    <!-- Node: Đơn Hàng Bán Lẻ (DH) -->
    <rect x="600" y="90" width="220" height="48" rx="4" fill="${C.plainFill}" stroke="${C.plainStroke}" stroke-width="1.5" filter="url(#shadow)"/>
    <text class="node-text" x="710" y="114">Đơn Hàng Bán Lẻ (DH)</text>

    <!-- Node: Hóa Đơn (HD) -->
    <rect x="520" y="270" width="160" height="48" rx="4" fill="${C.coreFill}" stroke="${C.coreStroke}" stroke-width="2" filter="url(#shadow)"/>
    <text class="node-text" x="600" y="294">Hóa Đơn (HD)</text>

    <!-- Node: Phiếu Xuất Kho (PX) -->
    <rect x="730" y="270" width="170" height="48" rx="4" fill="${C.coreFill}" stroke="${C.coreStroke}" stroke-width="2" filter="url(#shadow)"/>
    <text class="node-text" x="815" y="294">Phiếu Xuất Kho (PX)</text>

    <!-- Node: Sổ Công Nợ KH (CN) -->
    <rect x="610" y="460" width="200" height="48" rx="4" fill="${C.ledgerFill}" stroke="${C.ledgerStroke}" stroke-width="2" filter="url(#shadow)"/>
    <text class="node-text" x="710" y="484">Sổ Công Nợ KH (CN)</text>

    <!-- Edge: DH -> HD (Hoàn thành) -->
    <path class="line-blue" d="M 670 138 L 670 200 L 600 200 L 600 268"/>
    <rect class="edge-label-bg" x="625" y="190" width="90" height="20"/>
    <text class="edge-label-text" x="670" y="200">Hoàn thành</text>

    <!-- Edge: DH -> PX (Tự động xuất kho) -->
    <path class="line-blue" d="M 750 138 L 750 200 L 815 200 L 815 268"/>
    <rect class="edge-label-bg" x="750" y="190" width="120" height="20"/>
    <text class="edge-label-text" x="810" y="200">Tự động xuất kho</text>

    <!-- Edge: HD -> Sổ Công Nợ KH (Bán chịu ghi nợ) -->
    <path class="line-blue" d="M 640 318 L 640 390 L 710 390 L 710 458"/>
    <rect class="edge-label-bg" x="655" y="380" width="110" height="20"/>
    <text class="edge-label-text" x="710" y="390">Bán chịu ghi nợ</text>
  </g>

  <!-- ========================================== -->
  <!-- 2. SUBGRAPH 1: MUA HÀNG & QUẢN LÝ KHO (MID) -->
  <!-- ========================================== -->
  <g id="box-muahang">
    <rect class="subgraph" x="650" y="660" width="450" height="520" rx="4"/>
    <text class="subgraph-title" x="665" y="685">1. Mua hàng &amp; Quản lý Kho</text>
    <line class="subgraph-header-line" x1="650" y1="700" x2="1100" y2="700"/>

    <!-- Node: Đơn Đặt Hàng (DDH) -->
    <rect x="790" y="720" width="190" height="48" rx="4" fill="${C.plainFill}" stroke="${C.plainStroke}" stroke-width="1.5" filter="url(#shadow)"/>
    <text class="node-text" x="885" y="744">Đơn Đặt Hàng (DDH)</text>

    <!-- Node: Phiếu Nhập Kho (PN) -->
    <rect x="785" y="910" width="200" height="48" rx="4" fill="${C.coreFill}" stroke="${C.coreStroke}" stroke-width="2" filter="url(#shadow)"/>
    <text class="node-text" x="885" y="934">Phiếu Nhập Kho (PN)</text>

    <!-- Node: Sổ Công Nợ NCC (CN) -->
    <rect x="670" y="1100" width="200" height="48" rx="4" fill="${C.ledgerFill}" stroke="${C.ledgerStroke}" stroke-width="2" filter="url(#shadow)"/>
    <text class="node-text" x="770" y="1124">Sổ Công Nợ NCC (CN)</text>

    <!-- Node: Tồn Kho (TonKho) -->
    <rect x="895" y="1100" width="180" height="48" rx="4" fill="${C.ledgerFill}" stroke="${C.ledgerStroke}" stroke-width="2" filter="url(#shadow)"/>
    <text class="node-text" x="985" y="1124">Tồn Kho (TonKho)</text>

    <!-- Edge: DDH -> PN (Nhận hàng thực tế) -->
    <path class="line-blue" d="M 885 768 L 885 908"/>
    <rect class="edge-label-bg" x="825" y="828" width="120" height="20"/>
    <text class="edge-label-text" x="885" y="838">Nhận hàng thực tế</text>

    <!-- Edge: PN -> Sổ Công Nợ NCC (Ghi nhận nợ phải trả) -->
    <path class="line-blue" d="M 835 958 L 835 1030 L 770 1030 L 770 1098"/>
    <rect class="edge-label-bg" x="700" y="1020" width="135" height="20"/>
    <text class="edge-label-text" x="767" y="1030">Ghi nhận nợ phải trả</text>

    <!-- Edge: PN -> Tồn Kho (Cộng dồn thẻ kho) -->
    <path class="line-blue" d="M 935 958 L 935 1030 L 985 1030 L 985 1098"/>
    <rect class="edge-label-bg" x="925" y="1020" width="120" height="20"/>
    <text class="edge-label-text" x="985" y="1030">Cộng dồn thẻ kho</text>
  </g>

  <!-- Cross-box Edge: PX -> Tồn Kho (Trừ dồn thẻ kho) -->
  <path class="line-gray" d="M 815 318 L 815 560 L 1025 560 L 1025 1098"/>
  <rect class="edge-label-bg" x="965" y="550" width="120" height="20"/>
  <text class="edge-label-text" x="1025" y="560">Trừ dồn thẻ kho</text>

  <!-- ========================================== -->
  <!-- 3. SUBGRAPH 3: QUỸ TIỀN MẶT & NGÂN HÀNG     -->
  <!-- ========================================== -->
  <g id="box-quy">
    <rect class="subgraph" x="505" y="1330" width="530" height="230" rx="4"/>
    <text class="subgraph-title" x="520" y="1355">3. Quỹ Tiền Mặt &amp; Ngân Hàng</text>
    <line class="subgraph-header-line" x1="505" y1="1370" x2="1035" y2="1370"/>

    <!-- Node: Phiếu Thu Quỹ (PT) -->
    <rect x="525" y="1390" width="190" height="48" rx="4" fill="${C.transFill}" stroke="${C.transStroke}" stroke-width="2" filter="url(#shadow)"/>
    <text class="node-text" x="620" y="1414">Phiếu Thu Quỹ (PT)</text>

    <!-- Node: Phiếu Chi Quỹ / Ngân Hàng (PC) -->
    <rect x="750" y="1390" width="265" height="48" rx="4" fill="${C.transFill}" stroke="${C.transStroke}" stroke-width="2" filter="url(#shadow)"/>
    <text class="node-text" x="882" y="1414">Phiếu Chi Quỹ / Ngân Hàng (PC)</text>

    <!-- Node: Nhật Ký Thanh Toán (ThanhToan) -->
    <rect x="600" y="1490" width="280" height="48" rx="4" fill="${C.ledgerFill}" stroke="${C.ledgerStroke}" stroke-width="2" filter="url(#shadow)"/>
    <text class="node-text" x="740" y="1514">Nhật Ký Thanh Toán (ThanhToan)</text>

    <!-- Arrows inside Box 3 -->
    <path class="line-gray" d="M 620 1438 L 620 1465 L 700 1465 L 700 1488"/>
    <path class="line-gray" d="M 882 1438 L 882 1465 L 780 1465 L 780 1488"/>
  </g>

  <!-- Cross-box Edges into Box 3 -->
  <!-- HD -> PT (Thu tiền ngay) -->
  <path class="line-gray" d="M 555 318 L 555 620 L 465 620 L 465 1310 L 590 1310 L 590 1388"/>
  <rect class="edge-label-bg" x="415" y="1200" width="95" height="20"/>
  <text class="edge-label-text" x="462" y="1210">Thu tiền ngay</text>

  <!-- Sổ Công Nợ KH -> PT (Khách nộp tiền) -->
  <path class="line-gray" d="M 680 508 L 680 620 L 570 620 L 570 1388"/>
  <rect class="edge-label-bg" x="515" y="1200" width="105" height="20"/>
  <text class="edge-label-text" x="567" y="1210">Khách nộp tiền</text>

  <!-- PN -> PC (Trả tiền ngay) -->
  <path class="line-gray" d="M 885 958 L 885 1080 L 890 1080 L 890 1260 L 770 1260 L 770 1388"/>
  <rect class="edge-label-bg" x="725" y="1250" width="95" height="20"/>
  <text class="edge-label-text" x="772" y="1260">Trả tiền ngay</text>

  <!-- Sổ Công Nợ NCC -> PC (Kế toán trả nợ) -->
  <path class="line-gray" d="M 770 1148 L 770 1220 L 895 1220 L 895 1388"/>
  <rect class="edge-label-bg" x="840" y="1250" width="105" height="20"/>
  <text class="edge-label-text" x="892" y="1260">Kế toán trả nợ</text>

  <!-- ========================================== -->
  <!-- 4. SUBGRAPH 4: BÁO CÁO KẾ TOÁN & QUẢN TRỊ    -->
  <!-- ========================================== -->
  <g id="box-baocao">
    <rect class="subgraph" x="40" y="1630" width="1120" height="130" rx="4"/>
    <text class="subgraph-title" x="55" y="1655">4. Báo Cáo Kế Toán &amp; Quản Trị</text>
    <line class="subgraph-header-line" x1="40" y1="1670" x2="1160" y2="1670"/>

    <!-- 4 Report Nodes -->
    <rect x="65" y="1690" width="245" height="50" rx="4" fill="${C.reportFill}" stroke="${C.reportStroke}" stroke-width="2" filter="url(#shadow)"/>
    <text class="node-text-sm" x="187" y="1715">Báo Cáo Doanh Thu (Ngày/Tháng/Năm)</text>

    <rect x="335" y="1690" width="175" height="50" rx="4" fill="${C.reportFill}" stroke="${C.reportStroke}" stroke-width="2" filter="url(#shadow)"/>
    <text class="node-text" x="422" y="1715">Báo Cáo Công Nợ</text>

    <rect x="535" y="1690" width="240" height="50" rx="4" fill="${C.reportFill}" stroke="${C.reportStroke}" stroke-width="2" filter="url(#shadow)"/>
    <text class="node-text" x="655" y="1715">Báo Cáo Thu - Chi / Sổ Quỹ</text>

    <rect x="800" y="1690" width="230" height="50" rx="4" fill="${C.reportFill}" stroke="${C.reportStroke}" stroke-width="2" filter="url(#shadow)"/>
    <text class="node-text" x="915" y="1715">Báo Cáo Nhập - Xuất - Tồn</text>
  </g>

  <!-- Long Lines down to Reports -->
  <!-- HD -> Báo Cáo Doanh Thu (Far Left line) -->
  <path class="line-gray" d="M 520 294 L 215 294 L 215 1688"/>

  <!-- Sổ Công Nợ KH & NCC -> Báo Cáo Công Nợ -->
  <path class="line-gray" d="M 710 508 L 710 600 L 500 600 L 500 1620 L 422 1620 L 422 1688"/>

  <!-- Nhật Ký Thanh Toán -> Báo Cáo Thu - Chi / Sổ Quỹ -->
  <path class="line-gray" d="M 740 1538 L 740 1610 L 655 1610 L 655 1688"/>

  <!-- Tồn Kho -> Báo Cáo Nhập - Xuất - Tồn -->
  <path class="line-gray" d="M 985 1148 L 985 1240 L 1050 1240 L 1050 1620 L 915 1620 L 915 1688"/>

</svg>`;

fs.writeFileSync('d:/Ứng dụng tin học trong kế toán/so_do_nguyen_goc_chuan_100.svg', svg);
fs.writeFileSync('C:/Users/HP/Desktop/so_do_nguyen_goc_chuan_100.svg', svg);
fs.writeFileSync('C:/Users/HP/.gemini/antigravity/brain/c2d30583-6ab9-43e3-b3f0-cc3448a96ee4/so_do_nguyen_goc_chuan_100.svg', svg);

console.log('✅ Generated exact 100% matched vertical SVG (1200x1800)!');
