// src/lib/subcategories.ts
// ─────────────────────────────────────────────────────────────
// Single source of truth for subcategories.
// Used by: marketplace/page.tsx  AND  marketplace/new/page.tsx
// To add a new subcategory just edit this file — nothing else.
// ─────────────────────────────────────────────────────────────

export const SUBCATEGORIES: Record<string, string[]> = {
  Books:       ['Horror', 'Romance', 'Sci-Fi', 'Textbooks', 'Comics'],
  Electronics: ['Mobiles', 'Laptops', 'Audio', 'Gaming'],
  Clothes:     ['Tops', 'Bottoms', 'Shoes', 'Accessories'],
  Sports:      ['Cricket', 'Football', 'Fitness', 'Outdoor'],
}
