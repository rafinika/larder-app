// Fish catalog for the coin shop + ocean floor scene. This is a fixed catalog,
// not user data — see GAMIFICATION.md §1 for why it lives in code, not the database.
// Edit freely: swap species, facts, costs, or add more. `svg` is the inner markup
// of a 0 0 64 64 viewBox icon (see src/assets/fish-*.svg for the source files this
// was copied from — keep them in sync if you redraw one).

export const TIERS = {
  common: { label: "Common", cost: 30 },
  uncommon: { label: "Uncommon", cost: 90 },
  rare: { label: "Rare", cost: 220 },
  legendary: { label: "Legendary", cost: 500 },
};

export const FISH_CATALOG = [
  {
    id: "clownfish", name: "Clownfish", tier: "common", size: 32, speed: 11, dir: 1, lane: 10,
    fact: "All clownfish are born male — the dominant one in a group becomes female.",
    svg: `<path d="M14 32 L2 18 L2 46 Z" fill="#D9601C"/><path d="M26 21 L33 7 L40 21 Z" fill="#D9601C"/><path d="M34 38 L29 50 L41 43 Z" fill="#D9601C"/><ellipse cx="32" cy="32" rx="18" ry="12" fill="#F4762B"/><path d="M23 20 Q21 32 23 44 L27 44 Q25 32 27 20 Z" fill="#fff" stroke="#1a1a1a" stroke-width="1"/><path d="M34 20 Q32 32 34 44 L38 44 Q36 32 38 20 Z" fill="#fff" stroke="#1a1a1a" stroke-width="1"/><circle cx="45" cy="28" r="3" fill="#fff"/><circle cx="46" cy="28" r="1.4" fill="#111"/>`,
  },
  {
    id: "sergeant-major", name: "Sergeant Major", tier: "common", size: 32, speed: 10, dir: -1, lane: 20,
    fact: "Named for its black bars, which resemble a sergeant's rank stripes.",
    svg: `<path d="M14 32 L2 18 L2 46 Z" fill="#E0C468"/><path d="M26 21 L33 7 L40 21 Z" fill="#E0C468"/><path d="M34 38 L29 50 L41 43 Z" fill="#E0C468"/><ellipse cx="32" cy="32" rx="18" ry="12" fill="#F2D680"/><g stroke="#1a1a1a" stroke-width="2"><line x1="21" y1="21" x2="21" y2="43"/><line x1="27" y1="20" x2="27" y2="44"/><line x1="33" y1="20" x2="33" y2="44"/><line x1="39" y1="21" x2="39" y2="43"/></g><circle cx="46" cy="28" r="3" fill="#fff"/><circle cx="47" cy="28" r="1.4" fill="#111"/>`,
  },
  {
    id: "blue-tang", name: "Blue Tang", tier: "uncommon", size: 38, speed: 14, dir: 1, lane: 30,
    fact: "Can shift the intensity of its blue coloring with mood and stress.",
    svg: `<path d="M14 32 L2 18 L2 46 Z" fill="#F5C518"/><path d="M26 21 L33 7 L40 21 Z" fill="#20558F"/><path d="M34 38 L29 50 L41 43 Z" fill="#20558F"/><ellipse cx="32" cy="32" rx="18" ry="12" fill="#2C6FBB"/><path d="M16 24 Q26 32 16 40" fill="none" stroke="#173A5E" stroke-width="2" opacity="0.55"/><path d="M44 22 Q40 32 44 42" fill="none" stroke="#173A5E" stroke-width="2" opacity="0.4"/><circle cx="45" cy="28" r="3" fill="#fff"/><circle cx="46" cy="28" r="1.4" fill="#111"/>`,
  },
  {
    id: "lionfish", name: "Lionfish", tier: "uncommon", size: 40, speed: 16, dir: -1, lane: 40,
    fact: "Venomous spines are for defense, not hunting.",
    svg: `<path d="M14 32 L2 20 L2 44 Z" fill="#C1272D"/><g fill="#C1272D"><path d="M22 20 L18 4 L26 18 Z"/><path d="M28 19 L27 2 L33 18 Z"/><path d="M35 19 L38 2 L39 18 Z"/><path d="M41 21 L48 6 L44 22 Z"/></g><g fill="#C1272D"><path d="M35 37 L44 34 L38 46 Z"/><path d="M35 40 L46 42 L37 50 Z"/></g><ellipse cx="32" cy="32" rx="17" ry="11" fill="#EFC9A6"/><g stroke="#C1272D" stroke-width="2.5"><line x1="20" y1="22" x2="20" y2="42"/><line x1="26" y1="21" x2="26" y2="43"/><line x1="32" y1="21" x2="32" y2="43"/><line x1="38" y1="22" x2="38" y2="42"/></g><circle cx="44" cy="28" r="2.6" fill="#fff"/><circle cx="45" cy="28" r="1.2" fill="#111"/>`,
  },
  {
    id: "mandarinfish", name: "Mandarinfish", tier: "rare", size: 32, speed: 18, dir: 1, lane: 50,
    fact: "One of the few animals whose blue color is true pigment, not structural color.",
    svg: `<path d="M18 32 L8 22 L8 42 Z" fill="#1F8A70"/><path d="M27 23 L33 12 L38 23 Z" fill="#F5891F"/><ellipse cx="34" cy="32" rx="15" ry="10" fill="#1F8A70"/><path d="M22 26 Q30 32 22 38" fill="none" stroke="#F5891F" stroke-width="2.2"/><path d="M29 24 Q37 32 29 40" fill="none" stroke="#3AA8E0" stroke-width="2.2"/><path d="M36 25 Q42 32 36 39" fill="none" stroke="#F5891F" stroke-width="2.2"/><circle cx="42" cy="21" r="1.6" fill="#F5891F"/><circle cx="46" cy="26" r="1.4" fill="#3AA8E0"/><circle cx="45" cy="28" r="2.6" fill="#fff"/><circle cx="46" cy="28" r="1.2" fill="#111"/>`,
  },
  {
    id: "seahorse", name: "Seahorse", tier: "rare", size: 36, speed: 22, dir: -1, lane: 58,
    fact: "Males carry and give birth to the babies, not females.",
    svg: `<path d="M30 8 C40 8 42 16 36 20 C46 22 44 32 36 34 C44 38 40 50 30 52 C24 54 18 50 18 44 C18 40 22 40 22 44 C22 47 26 48 28 46 C32 43 30 38 24 36 C18 34 18 26 24 24 C18 22 18 14 26 10 C27 9 28.5 8.5 30 8 Z" fill="#D98E3B"/><path d="M30 8 C33 6 37 6 38 9 C39 11 36 13 33 12" fill="#D98E3B"/><g fill="none" stroke="#B06F24" stroke-width="1.6"><path d="M22 18 L26 18"/><path d="M22 24 L27 24"/><path d="M23 30 L28 30"/></g><path d="M36 20 L44 18 L40 26 Z" fill="#C77F2E"/><circle cx="33" cy="14" r="2.4" fill="#fff"/><circle cx="34" cy="14" r="1.1" fill="#111"/>`,
  },
  {
    id: "anglerfish", name: "Anglerfish", tier: "legendary", size: 48, speed: 26, dir: 1, lane: 66,
    fact: "Its glow comes from bioluminescent bacteria living on the lure.",
    svg: `<path d="M12 34 L2 24 L2 46 Z" fill="#12121F"/><path d="M26 24 L30 12 L36 24 Z" fill="#12121F"/><path d="M32 42 L26 52 L38 48 Z" fill="#12121F"/><path d="M18 8 Q22 16 30 20" fill="none" stroke="#12121F" stroke-width="2" stroke-linecap="round"/><circle cx="18" cy="8" r="3.2" fill="#8CFFA6"/><circle cx="18" cy="8" r="1.4" fill="#E9FFEF"/><ellipse cx="34" cy="34" rx="19" ry="13" fill="#1B1B2F"/><path d="M42 40 Q50 34 44 26 Q52 30 52 38 Q52 44 42 40 Z" fill="#1B1B2F"/><path d="M28 42 L32 36 L36 42 L40 37 L44 42" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><circle cx="46" cy="30" r="2.8" fill="#fff"/><circle cx="47" cy="30" r="1.3" fill="#111"/>`,
  },
  {
    id: "mola-mola", name: "Mola Mola", tier: "legendary", size: 52, speed: 24, dir: -1, lane: 22,
    fact: "The heaviest bony fish alive — a female can carry 300 million eggs.",
    svg: `<path d="M32 8 Q40 10 40 18" fill="none" stroke="#7C97A8" stroke-width="4" stroke-linecap="round"/><path d="M32 56 Q40 54 40 46" fill="none" stroke="#7C97A8" stroke-width="4" stroke-linecap="round"/><path d="M50 32 Q56 30 56 26 Q60 30 56 34 Q56 32 50 32 Z" fill="#9FB8C9"/><ellipse cx="30" cy="32" rx="21" ry="19" fill="#AFC5D3"/><path d="M13 20 Q30 32 13 44" fill="none" stroke="#8AA5B5" stroke-width="1.6" opacity="0.7"/><circle cx="42" cy="26" r="3" fill="#fff"/><circle cx="43" cy="26" r="1.4" fill="#111"/><path d="M46 36 Q50 38 47 41" fill="none" stroke="#7C97A8" stroke-width="2" stroke-linecap="round"/>`,
  },
];

export function fishById(id) {
  return FISH_CATALOG.find(f => f.id === id);
}

export function isOwned(aquarium, speciesId) {
  return aquarium.some(f => f.speciesId === speciesId);
}

// Coral grows in 4 discrete stages rather than continuously — see GAMIFICATION.md §6.
export const CORAL_LABELS = [
  "Bud (0–1 fish)",
  "Small (2–4 fish)",
  "Growing (5–7 fish)",
  "Full bloom (8/8 fish)",
];

export function coralStageForCount(count) {
  if (count >= 8) return 3;
  if (count >= 5) return 2;
  if (count >= 2) return 1;
  return 0;
}

// Rescue events (using up something ≤2 days from expiry) sometimes grant a fish
// directly, on top of the coin bonus — weighted toward common/uncommon so it
// doesn't trivialize the shop. See GAMIFICATION.md §2.
export function rollRescueFish(aquarium) {
  const unowned = FISH_CATALOG.filter(f => !isOwned(aquarium, f.id));
  if (unowned.length === 0) return null;
  if (Math.random() > 0.5) return null; // ~50% chance of any drop at all

  const weights = { common: 45, uncommon: 30, rare: 18, legendary: 7 };
  const pool = [];
  unowned.forEach(f => {
    for (let i = 0; i < weights[f.tier]; i++) pool.push(f);
  });
  return pool[Math.floor(Math.random() * pool.length)] || null;
}
