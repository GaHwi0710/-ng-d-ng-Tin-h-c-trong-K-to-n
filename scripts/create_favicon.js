import fs from "fs";

const pngBase64 = fs.readFileSync("frontend/public/logo.png").toString("base64");
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
  <defs>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.2"/>
    </filter>
  </defs>
  <rect x="4" y="4" width="120" height="120" rx="30" fill="#FFFFFF" stroke="#0F5C53" stroke-width="2" filter="url(#shadow)"/>
  <image href="data:image/png;base64,${pngBase64}" x="14" y="14" width="100" height="100" preserveAspectRatio="xMidYMid meet"/>
</svg>`;

fs.writeFileSync("frontend/public/favicon.svg", svg);
console.log("Successfully generated frontend/public/favicon.svg (length:", svg.length, ")");
