// TCGplayer Mass Entry: `massentry?productline=YuGiOh&c=<lines>`, lines joined by "||". A line is "3-184763"
// (quantity-productId: one exact TCGplayer product, what Limitless sends) or "3 Ash Blossom & Joyous Spring" (by
// name). Cost Down sends product ids: a name line only finds listings named exactly that, and TCGplayer names many
// with the rarity in parentheses ("Gaia Knight, the Force of Earth (Super Rare)"). Names are the fallback for cards
// without a priced product. Both forms, mixed in one link, verified 2026-11-10 (DESIGN.md §5).

import type { ShoppingItem } from './prices.ts'

export const MASS_ENTRY = 'https://www.tcgplayer.com/massentry'

export function massEntryUrl(items: ShoppingItem[]): string {
  const c = items
    .filter((i) => i.qty > 0)
    .map((i) => encodeURIComponent(i.productId ? `${i.qty}-${i.productId}` : `${i.qty} ${i.name}`))
    .join('||')
  return `${MASS_ENTRY}?productline=YuGiOh&c=${c}`
}
