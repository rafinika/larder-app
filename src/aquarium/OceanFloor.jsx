import React, { useMemo } from "react";
import { FISH_CATALOG, fishById, coralStageForCount, CORAL_LABELS } from "./fishCatalog.js";
import { coralInnerSVG, CORAL_SCALE } from "./coral.js";

const DEBRIS_SHAPES = [
  `<path d="M2 2 L2 20 Q6 24 10 20 L10 2 Q6 -2 2 2 Z" fill="#6b6b6b"/>`, // bottle
  `<path d="M0 0 L14 3 L10 14 L2 12 Z" fill="#7a6a4a"/>`, // wrapper
  `<rect x="0" y="0" width="16" height="10" rx="2" fill="#8a8a8a"/>`, // can
];

// Maps a raw "items thrown out this month" count onto a 0–5 murkiness level.
export function wasteLevelFor(wasteThisMonth) {
  if (wasteThisMonth <= 0) return 0;
  if (wasteThisMonth <= 2) return 1;
  if (wasteThisMonth <= 4) return 2;
  if (wasteThisMonth <= 7) return 3;
  if (wasteThisMonth <= 11) return 4;
  return 5;
}

export default function OceanFloor({ aquarium, wasteThisMonth, height = 420 }) {
  const owned = useMemo(
    () => aquarium.map(a => fishById(a.speciesId)).filter(Boolean),
    [aquarium]
  );
  const stage = coralStageForCount(owned.length);
  const wasteLevel = wasteLevelFor(wasteThisMonth || 0);

  const { fishStyle, fishNodes } = useMemo(() => {
    let rules = "";
    const nodes = owned.map((f, i) => {
      const animName = `swim-${f.id}`;
      const startX = f.dir === 1 ? "-15%" : "115%";
      const endX = f.dir === 1 ? "115%" : "-15%";
      const flip = f.dir === -1 ? " scaleX(-1)" : "";
      rules += `@keyframes ${animName} { from { transform: translateX(${startX})${flip}; } to { transform: translateX(${endX})${flip}; } }\n`;
      return { f, i, animName };
    });
    return { fishStyle: rules, fishNodes: nodes };
  }, [owned]);

  const algaeCount = Math.min(wasteLevel * 2, 8);
  const debrisCount = Math.max(0, wasteLevel - 1);

  return (
    <div className="oceanTank" style={{ height }}>
      <style>{fishStyle}</style>
      <div className="oceanRays" />

      <div className="fishLayer">
        {fishNodes.map(({ f, i, animName }) => (
          <div
            key={f.id + i}
            className="oceanFish"
            style={{
              top: `${f.lane}%`,
              animation: `${animName} ${f.speed}s linear infinite`,
              animationDelay: `${-i * 2.3}s`,
            }}
          >
            <div className="oceanFishBob" style={{ animationDelay: `${i * 0.4}s` }}>
              <svg viewBox="0 0 64 64" width={f.size} height={f.size} dangerouslySetInnerHTML={{ __html: f.svg }} />
            </div>
          </div>
        ))}
      </div>

      <div className="coralWrap" style={{ transform: `translateX(-50%) scale(${CORAL_SCALE[stage]})` }}>
        <svg viewBox="0 0 160 112" width={150} height={112} dangerouslySetInnerHTML={{ __html: coralInnerSVG(stage) }} />
      </div>

      <div className="algaeLayer">
        {Array.from({ length: algaeCount }).map((_, i) => (
          <div
            key={i}
            className="oceanAlgae"
            style={{
              height: `${18 + (i % 3) * 8}px`,
              left: `${6 + i * 11 + (i % 2) * 4}%`,
              animationDelay: `${i * 0.3}s`,
            }}
          />
        ))}
      </div>

      <div className="debrisLayer">
        {Array.from({ length: debrisCount }).map((_, i) => (
          <div key={i} className="oceanDebris" style={{ left: `${15 + i * 18}%` }}>
            <svg viewBox="0 0 16 24" width="16" height="24" dangerouslySetInnerHTML={{ __html: DEBRIS_SHAPES[i % DEBRIS_SHAPES.length] }} />
          </div>
        ))}
      </div>

      <div className="oceanDirt" style={{ opacity: Math.min(wasteLevel / 5, 1) * 0.85 }} />
      <div className="oceanFloorBed" />

      <p className="oceanCaption">
        {CORAL_LABELS[stage]}
        {wasteLevel > 0 && <> · tank could use a clean this month</>}
      </p>
    </div>
  );
}
