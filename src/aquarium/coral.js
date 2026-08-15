// Round coral centerpiece for the ocean floor scene. One continuous mound built
// from overlapping circles (not separate "ears") — see GAMIFICATION.md §6.
// stage: 0 (bud) .. 3 (full bloom), from coralStageForCount() in fishCatalog.js.

export function coralInnerSVG(stage) {
  const rock = `<ellipse cx="80" cy="104" rx="58" ry="14" fill="#9c8552"/>`;
  const domeBase = `<ellipse cx="80" cy="90" rx="36" ry="22" fill="#E8899F"/>`;
  const lobes = [
    `<circle cx="58" cy="80" r="15" fill="#F2A5B6"/>`,
    `<circle cx="102" cy="80" r="15" fill="#F2A5B6"/>`,
    `<circle cx="80" cy="72" r="18" fill="#D9536B"/>`,
    `<circle cx="68" cy="76" r="13" fill="#D9536B"/>`,
    `<circle cx="93" cy="76" r="13" fill="#D9536B"/>`,
  ];
  const branch = (x, h, color) =>
    `<path d="M${x} 90 Q${x - 4} ${90 - h * 0.6} ${x} ${90 - h} Q${x + 4} ${90 - h * 0.6} ${x} 90 Z" fill="${color}"/>`;
  const dots = `<g fill="#B03955" opacity="0.45">
    <circle cx="72" cy="82" r="2"/><circle cx="88" cy="80" r="2"/><circle cx="80" cy="88" r="2"/>
    <circle cx="62" cy="84" r="1.6"/><circle cx="98" cy="84" r="1.6"/></g>`;
  const glow = `<ellipse cx="80" cy="82" rx="52" ry="30" fill="#FFE39A" opacity="0.16"/>`;

  if (stage === 0) return `${rock}<ellipse cx="80" cy="94" rx="15" ry="12" fill="#F2B9C6"/>`;
  if (stage === 1) return `${rock}${domeBase}${lobes[2]}`;
  if (stage === 2) return `${rock}${domeBase}${lobes.join("")}${branch(48, 24, "#F0A868")}${dots}`;
  return `${glow}${rock}${domeBase}${lobes.join("")}${branch(46, 28, "#F0A868")}${branch(114, 24, "#F0A868")}${dots}
    <g fill="#FFE39A"><circle cx="80" cy="58" r="1.6"/><circle cx="68" cy="62" r="1.2"/><circle cx="92" cy="62" r="1.2"/></g>`;
}

export const CORAL_SCALE = [0.5, 0.68, 0.86, 1.05];
