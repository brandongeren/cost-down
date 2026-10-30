// TCGplayer Mass Entry: `massentry?productline=YuGiOh&c=<lines>`, lines joined by "||". Lines by name
// ("3 Ash Blossom & Joyous Spring") let TCGplayer pick among all printings (verified 2026-10-30, DESIGN.md §5).

export const MASS_ENTRY = 'https://www.tcgplayer.com/massentry'

export function massEntryUrl(items: { name: string; qty: number }[]): string {
  const c = items
    .filter((i) => i.qty > 0)
    .map((i) => encodeURIComponent(`${i.qty} ${i.name}`))
    .join('||')
  return `${MASS_ENTRY}?productline=YuGiOh&c=${c}`
}
