import React from "react";
import OceanFloor from "./OceanFloor.jsx";
import { FISH_CATALOG, TIERS, isOwned } from "./fishCatalog.js";
import { CoinIcon } from "../components/icons.jsx";

const TIER_ORDER = ["common", "uncommon", "rare", "legendary"];

export default function AquariumView({ state, setState, flash }) {
  const { coins, aquarium } = state.game;

  function buy(fish) {
    const cost = TIERS[fish.tier].cost;
    if (isOwned(aquarium, fish.id)) return;
    if (coins < cost) {
      flash(`Need ${cost - coins} more coins for the ${fish.name}`);
      return;
    }
    setState(s => ({
      ...s,
      game: {
        ...s.game,
        coins: s.game.coins - cost,
        aquarium: [...s.game.aquarium, { speciesId: fish.id, acquiredAt: Date.now(), via: "shop" }],
      },
    }));
    flash(`${fish.name} joined your tank`);
  }

  return (
    <div className="view">
      <div className="tankFrame">
        <OceanFloor aquarium={aquarium} wasteThisMonth={state.game.wasteThisMonth} />
      </div>

      <div className="wallet">
        <CoinIcon size={22} />
        <span>{coins} coins</span>
      </div>

      {TIER_ORDER.map(tier => (
        <div key={tier} className="group">
          <p className="grouph">{TIERS[tier].label} · {TIERS[tier].cost} coins</p>
          <div className="shopgrid">
            {FISH_CATALOG.filter(f => f.tier === tier).map(f => {
              const owned = isOwned(aquarium, f.id);
              const afford = coins >= TIERS[f.tier].cost;
              return (
                <div key={f.id} className={`shopcard ${owned ? "owned" : ""}`}>
                  <svg viewBox="0 0 64 64" width="48" height="48" dangerouslySetInnerHTML={{ __html: f.svg }} />
                  <p className="shopname">{f.name}</p>
                  <p className="shopfact">{f.fact}</p>
                  {owned ? (
                    <span className="shopowned">In your tank</span>
                  ) : (
                    <button className={`btn tiny ${afford ? "primary" : "ghost"}`} onClick={() => buy(f)}>
                      Buy · {TIERS[f.tier].cost}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <p className="footnote">
        Coins come from the same events as points — cooking, put-away runs, and rescuing near-expiry food (which also has a chance to gift a fish directly). A messy tank is cosmetic only: it never touches your fish, coins, or streak.
      </p>
    </div>
  );
}
