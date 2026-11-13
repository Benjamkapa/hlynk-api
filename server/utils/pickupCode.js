// Utility to generate a pleasant, memorable 2-word pickup name (e.g., "Bright Sun", "Sweet Mango")
const ADJECTIVES = [
  "Bright", "Sweet", "Golden", "Sunny", "Fresh", "Cool", "Royal", "Lucky",
  "Warm", "Happy", "Magic", "Velvet", "Brave", "Calm", "Amber", "Merry",
  "Gentle", "Jolly", "Silver", "Crisp", "Kind", "Cozy", "Pure", "Ruby"
];

const NOUNS = [
  "Sun", "Mango", "Star", "Breeze", "Lion", "River", "Peach", "Moon",
  "Clover", "Berry", "Harbor", "Melon", "Dawn", "Tulip", "Comet", "Bloom",
  "Spark", "Valley", "Honey", "Robin", "Cedar", "Cloud", "Willow", "Pearl"
];

/**
 * Generate a deterministic or pseudo-random 2-word pickup name.
 * If a seed string (like a saleId or orderId) is provided, it consistently derives the name.
 */
export function generatePickupCode(seed) {
  if (seed && typeof seed === "string") {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = (hash << 5) - hash + seed.charCodeAt(i);
      hash |= 0;
    }
    const abs = Math.abs(hash);
    const adj = ADJECTIVES[abs % ADJECTIVES.length];
    const noun = NOUNS[Math.floor(abs / ADJECTIVES.length) % NOUNS.length];
    return `${adj} ${noun}`;
  }

  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  return `${adj} ${noun}`;
}

