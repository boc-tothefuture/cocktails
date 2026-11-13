import { escapeMarkup, getCleanSpecName } from './dom-utils.ts';
import type { FillPattern, GlassType, IceType, LayerStyle, SpecLayer } from './types.ts';

interface GlassGeometry {
  readonly cx: number;
  readonly yTop: number;
  readonly yBot: number;
  readonly clip: string;
  readonly outline: string;
  readonly widthAtY: (y: number) => readonly [number, number];
}

interface DropSpec {
  readonly count: number;
  readonly color: string;
}

interface CalloutItem {
  readonly midY: number;
  readonly xr: number;
  readonly lyr: SpecLayer;
}

const FALLBACK_STYLES: readonly [LayerStyle, ...LayerStyle[]] = [
  { color: '#e08c38', pattern: 'woven' },
  { color: '#e5b968', pattern: 'dots' },
  { color: '#d16647', pattern: 'cross' },
  { color: '#e8c86b', pattern: 'diagonal' },
  { color: '#d68a3e', pattern: 'dashes' }
];

const ALT_PATTERNS: readonly FillPattern[] = [
  'woven',
  'dots',
  'cross',
  'diagonal',
  'dashes',
  'diagonal_weave'
];

const SHORT_LABEL_REPLACEMENTS: readonly (readonly [string, string])[] = [
  ['Tullamore D.E.W. Irish Whiskey', 'Tullamore D.E.W.'],
  ['High-Proof Bourbon or Rye Whiskey', 'Bourbon / Rye'],
  ['Laird’s Straight Apple Brandy', 'Apple Brandy'],
  ["Laird's Straight Apple Brandy", 'Apple Brandy'],
  ['Conniption Navy Strength Gin', 'Navy Strength Gin'],
  ['Woodford Reserve Bourbon Whiskey', 'Woodford Bourbon'],
  ['Single pot still Irish whiskey', 'Pot Still Irish'],
  ['Baileys Original Irish Cream', 'Baileys Irish Cream'],
  ['Thawed orange juice concentrate', 'OJ Concentrate'],
  ['Hardwood charcoal smoked honey', 'Smoked Honey'],
  ['Amaro Nonino Quintessentia', 'Amaro Nonino'],
  ['Carpano Antica sweet vermouth', 'Sweet Vermouth'],
  ['St-Germain Elderflower Liqueur', 'St-Germain'],
  ['Luxardo Maraschino Liqueur', 'Maraschino'],
  ['Chambord raspberry liqueur', 'Chambord'],
  ['Jalapeño-Hibiscus Reposado', 'Jalapeño-Hibiscus'],
  ['House pineapple chili syrup', 'Pineapple Chili Syr.'],
  ['Rosemary-infused simple syrup', 'Rosemary Syrup'],
  ['Thyme-infused simple syrup', 'Thyme Syrup'],
  ['Frozen limeade concentrate', 'Limeade Conc.'],
  ['Crisp lager or pilsner', 'Crisp Lager'],
  ['Hot French Press Coffee', 'Hot Coffee'],
  ['Fresh whipped cream', 'Whipped Cream'],
  ['Fat-free half-and-half', 'Half & Half'],
  ['Peaty Islay Scotch', 'Islay Scotch Float'],
  ['Blended Scotch whisky', 'Blended Scotch'],
  ['Smoky blended Scotch', 'Smoky Scotch'],
  ['Peated Scotch whisky', 'Peated Scotch'],
  ['Gracias a Dios Oaxaca Gin', 'Oaxaca Gin'],
  ['Wild Turkey 101 Bourbon', 'Wild Turkey 101'],
  ['Vanilla-Demerara Syrup', 'Vanilla-Demerara'],
  ['Pumpkin spice creamer', 'Pumpkin Creamer'],
  ['White chocolate syrup', 'White Choc. Syrup'],
  ['Reposado golden tequila', 'Reposado Tequila'],
  ['Grand Marnier liqueur', 'Grand Marnier'],
  ['Pure dark maple syrup', 'Dark Maple Syrup'],
  ['Guinness Draught stout', 'Guinness Draught'],
  ['Heering Cherry Liqueur', 'Cherry Heering'],
  ['Fresh pineapple juice', 'Pineapple Juice'],
  ['London Dry or Plymouth Gin', 'London Dry Gin'],
  ['Lime sparkling club soda', 'Lime Club Soda'],
  ['Pure cane simple syrup', 'Cane Simple Syrup'],
  ['Old Forester straight bourbon', 'Old Forester Bourbon'],
  ['House strawberry simple syrup', 'Strawberry Syrup'],
  ['House fresh ginger syrup', 'Fresh Ginger Syrup'],
  ['Bushmills Irish Whiskey', 'Bushmills Irish'],
  ['Cointreau Orange Liqueur', 'Cointreau']
];

function classifyGlassAndIce(
  glassDesc: string,
  cardId: string
): { glassType: GlassType; iceType: IceType } {
  const g = glassDesc.toLowerCase();
  let ice: IceType = 'neat';
  if (
    g.includes('chili-embedded') ||
    cardId === 'archive-hot-and-unbothered' ||
    cardId === 'archive-heaven-or-hell-margarita'
  ) {
    ice = 'chili_cube';
  } else if (
    [
      'large ice',
      'large cube',
      'large clear',
      '1 large',
      'clear ice block',
      'crystal clear',
      'one large cube'
    ].some((k) => g.includes(k))
  ) {
    ice = 'king_cube';
  } else if (g.includes('crushed ice')) {
    ice = 'crushed';
  } else if (['over ice', 'fresh ice', 'with ice', 'halfway with ice'].some((k) => g.includes(k))) {
    ice = 'cubes';
  }

  if (g.includes('bottle')) return { glassType: 'bottle', iceType: 'neat' };
  if (g.includes('irish coffee') || g.includes('footed mug')) {
    return { glassType: 'irish_coffee', iceType: 'neat' };
  }
  if (g.includes('mug') || g.includes('teacup')) return { glassType: 'mug', iceType: ice };
  if (g.includes('julep')) return { glassType: 'julep', iceType: 'crushed' };
  if (g.includes('mason jar')) return { glassType: 'rocks', iceType: ice };
  if (g.includes('martini')) return { glassType: 'martini', iceType: 'neat' };
  if (g.includes('nick') && !g.includes('coupe'))
    return { glassType: 'nick_nora', iceType: 'neat' };
  if (g.includes('coupe') || g.includes('sour glass') || g.includes('nick')) {
    return { glassType: 'coupe', iceType: 'neat' };
  }
  if (g.includes('pint')) return { glassType: 'pint', iceType: ice };
  if (g.includes('highball') || g.includes('collins')) {
    return { glassType: 'highball', iceType: ice };
  }
  return { glassType: 'rocks', iceType: ice };
}

function classifyIngredientStyle(name: string, idx: number): LayerStyle {
  const n = name.toLowerCase();
  if (n.includes('hibiscus')) return { color: '#cc5c58', pattern: 'cross' };
  if (
    [
      'egg white',
      'whipped cream',
      'heavy cream',
      'half-and-half',
      'creamer',
      'baileys',
      'bourbon cream',
      'white chocolate',
      'crème de cacao'
    ].some((k) => n.includes(k))
  ) {
    return { color: '#f2e6d8', pattern: 'foam' };
  }
  if (
    ['club soda', 'ginger beer', 'ginger ale', 'lager', 'pilsner', 'miller high life'].some((k) =>
      n.includes(k)
    )
  ) {
    return { color: '#dfd2c0', pattern: 'bubbles' };
  }
  if (n.includes('monster energy')) return { color: '#8ab868', pattern: 'bubbles' };
  if (n.includes('guinness') || n.includes('stout')) return { color: '#8c6246', pattern: 'woven' };
  if (['coffee', 'espresso', 'kahlúa'].some((k) => n.includes(k))) {
    return { color: '#9e6b47', pattern: 'woven' };
  }
  if (
    [
      'midori',
      'ancho reyes verde',
      'mint',
      'absinthe',
      'herbsaint',
      'chili vodka',
      'lime cordial'
    ].some((k) => n.includes(k))
  ) {
    return { color: '#82b078', pattern: 'dots' };
  }
  if (
    ['violette', 'chambord', 'grenadine', 'strawberry', 'cranberry', 'heering', 'blackberry'].some(
      (k) => n.includes(k)
    )
  ) {
    return { color: '#cc6668', pattern: 'cross' };
  }
  if (n.includes('nonino')) return { color: '#d89440', pattern: 'dots' };
  if (
    ['campari', 'aperol', 'cynar', 'amaro', 'sweet vermouth', 'carpano antica', 'pimm'].some((k) =>
      n.includes(k)
    )
  ) {
    return { color: '#d16647', pattern: 'cross' };
  }
  if (
    [
      'dry vermouth',
      'blanc vermouth',
      'maraschino',
      'st-germain',
      'elderflower',
      'bénédictine',
      'strega',
      'cointreau',
      'triple sec',
      'grand marnier',
      'orange liqueur',
      'amaretto',
      'peppermint',
      'allspice',
      'ginger liqueur'
    ].some((k) => n.includes(k))
  ) {
    return { color: '#e5b968', pattern: 'dots' };
  }
  if (
    ['lemon', 'lime', 'orange juice', 'pineapple', 'apple cider', 'grapefruit'].some((k) =>
      n.includes(k)
    )
  ) {
    return { color: '#e8c86b', pattern: 'diagonal' };
  }
  if (['syrup', 'honey', 'maple', 'agave', 'sugar', 'pumpkin'].some((k) => n.includes(k))) {
    return { color: '#d68a3e', pattern: 'dashes' };
  }
  if (['gin', 'vodka', 'water'].some((k) => n.includes(k))) {
    return { color: '#d4ccc2', pattern: 'dots' };
  }
  if (['tequila', 'mezcal'].some((k) => n.includes(k))) {
    return { color: '#e2a44c', pattern: 'diagonal_weave' };
  }
  if (['cognac', 'brandy', 'applejack'].some((k) => n.includes(k))) {
    return { color: '#c96d38', pattern: 'diagonal_weave' };
  }
  if (
    [
      'bourbon',
      'rye',
      'whiskey',
      'whisky',
      'scotch',
      'rum',
      'tullamore',
      'bushmills',
      'jameson',
      'redbreast'
    ].some((k) => n.includes(k))
  ) {
    return { color: '#e08c38', pattern: 'woven' };
  }
  return FALLBACK_STYLES[idx % FALLBACK_STYLES.length] ?? FALLBACK_STYLES[0];
}

function shortenSpecLabel(name: string): string {
  let shortened = (name.replace(/\s*\([^)]*\)/g, '').split(',')[0] ?? '').trim();
  for (const [oldStr, newStr] of SHORT_LABEL_REPLACEMENTS) {
    if (shortened.toLowerCase().includes(oldStr.toLowerCase())) {
      shortened = newStr;
      break;
    }
  }
  if (shortened.length > 20) {
    shortened = `${shortened.slice(0, 19).trimEnd()}…`;
  }
  return shortened;
}

function getGlassGeometry(glassType: GlassType, cx: number): GlassGeometry {
  if (glassType === 'coupe') {
    const yTop = 176;
    const yBot = 266;
    return {
      cx,
      yTop,
      yBot,
      clip: `M ${cx - 74} ${yTop} C ${cx - 74} ${yTop + 52}, ${cx - 42} ${yBot}, ${cx} ${yBot} C ${cx + 42} ${yBot}, ${cx + 74} ${yTop + 52}, ${cx + 74} ${yTop} Z`,
      outline: `<path d="M ${cx - 75} ${yTop} C ${cx - 75} ${yTop + 53}, ${cx - 43} ${yBot + 1}, ${cx} ${yBot + 1} C ${cx + 43} ${yBot + 1}, ${cx + 75} ${yTop + 53}, ${cx + 75} ${yTop}" fill="none" stroke="#d8c7b4" stroke-width="2" stroke-linecap="round"/><line x1="${cx}" y1="${yBot + 1}" x2="${cx}" y2="350" stroke="#d8c7b4" stroke-width="2"/><path d="M ${cx - 44} 350 L ${cx + 44} 350" stroke="#d8c7b4" stroke-width="2.2" stroke-linecap="round"/>`,
      widthAtY: (y) => {
        const t = Math.max(0, Math.min(1, (yBot - y) / (yBot - yTop)));
        const hw = 74 * Math.sqrt(t);
        return [cx - hw, cx + hw];
      }
    };
  }
  if (glassType === 'nick_nora') {
    const yTop = 172;
    const yBot = 270;
    return {
      cx,
      yTop,
      yBot,
      clip: `M ${cx - 58} ${yTop} C ${cx - 58} ${yTop + 62}, ${cx - 32} ${yBot}, ${cx} ${yBot} C ${cx + 32} ${yBot}, ${cx + 58} ${yTop + 62}, ${cx + 58} ${yTop} Z`,
      outline: `<path d="M ${cx - 59} ${yTop} C ${cx - 59} ${yTop + 63}, ${cx - 33} ${yBot + 1}, ${cx} ${yBot + 1} C ${cx + 33} ${yBot + 1}, ${cx + 59} ${yTop + 63}, ${cx + 59} ${yTop}" fill="none" stroke="#d8c7b4" stroke-width="2" stroke-linecap="round"/><line x1="${cx}" y1="${yBot + 1}" x2="${cx}" y2="350" stroke="#d8c7b4" stroke-width="2"/><path d="M ${cx - 40} 350 L ${cx + 40} 350" stroke="#d8c7b4" stroke-width="2.2" stroke-linecap="round"/>`,
      widthAtY: (y) => {
        const t = Math.max(0, Math.min(1, (yBot - y) / (yBot - yTop)));
        const hw = 58 * t ** 0.45;
        return [cx - hw, cx + hw];
      }
    };
  }
  if (glassType === 'martini') {
    const yTop = 174;
    const yBot = 272;
    return {
      cx,
      yTop,
      yBot,
      clip: `M ${cx - 78} ${yTop} L ${cx} ${yBot} L ${cx + 78} ${yTop} Z`,
      outline: `<path d="M ${cx - 79} ${yTop} L ${cx} ${yBot + 1} L ${cx + 79} ${yTop}" fill="none" stroke="#d8c7b4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><line x1="${cx}" y1="${yBot + 1}" x2="${cx}" y2="350" stroke="#d8c7b4" stroke-width="2"/><path d="M ${cx - 44} 350 L ${cx + 44} 350" stroke="#d8c7b4" stroke-width="2.2" stroke-linecap="round"/>`,
      widthAtY: (y) => {
        const t = Math.max(0, Math.min(1, (yBot - y) / (yBot - yTop)));
        const hw = 78 * t;
        return [cx - hw, cx + hw];
      }
    };
  }
  if (glassType === 'highball' || glassType === 'pint') {
    const yTop = 146;
    const yBot = 346;
    const topHw = glassType === 'highball' ? 54 : 62;
    const botHw = glassType === 'highball' ? 44 : 46;
    return {
      cx,
      yTop,
      yBot,
      clip: `M ${cx - topHw} ${yTop} L ${cx - botHw} ${yBot} L ${cx + botHw} ${yBot} L ${cx + topHw} ${yTop} Z`,
      outline: `<path d="M ${cx - topHw - 1} ${yTop} L ${cx - botHw - 1} ${yBot + 2} Q ${cx - botHw - 1} ${yBot + 6} ${cx - botHw + 4} ${yBot + 6} L ${cx + botHw - 4} ${yBot + 6} Q ${cx + botHw + 1} ${yBot + 6} ${cx + botHw + 1} ${yBot + 2} L ${cx + topHw + 1} ${yTop}" fill="none" stroke="#d8c7b4" stroke-width="2" stroke-linecap="round"/>`,
      widthAtY: (y) => {
        const t = Math.max(0, Math.min(1, (yBot - y) / (yBot - yTop)));
        const hw = botHw + (topHw - botHw) * t;
        return [cx - hw, cx + hw];
      }
    };
  }
  if (glassType === 'mug' || glassType === 'irish_coffee') {
    const yTop = glassType === 'irish_coffee' ? 165 : 185;
    const yBot = glassType === 'irish_coffee' ? 312 : 344;
    const topHw = 56;
    const botHw = 48;
    const handle = `<path d="M ${cx - topHw + 2} ${yTop + 24} C ${cx - topHw - 30} ${yTop + 24}, ${cx - botHw - 30} ${yBot - 24}, ${cx - botHw + 2} ${yBot - 24}" fill="none" stroke="#d8c7b4" stroke-width="2" stroke-linecap="round"/>`;
    const foot =
      glassType === 'irish_coffee'
        ? `<line x1="${cx}" y1="${yBot + 5}" x2="${cx}" y2="350" stroke="#d8c7b4" stroke-width="2.2"/><path d="M ${cx - 38} 350 L ${cx + 38} 350" stroke="#d8c7b4" stroke-width="2.2" stroke-linecap="round"/>`
        : '';
    return {
      cx,
      yTop,
      yBot,
      clip: `M ${cx - topHw} ${yTop} L ${cx - botHw} ${yBot} L ${cx + botHw} ${yBot} L ${cx + topHw} ${yTop} Z`,
      outline: `<path d="M ${cx - topHw - 1} ${yTop} L ${cx - botHw - 1} ${yBot + 1} Q ${cx - botHw - 1} ${yBot + 5} ${cx - botHw + 4} ${yBot + 5} L ${cx + botHw - 4} ${yBot + 5} Q ${cx + botHw + 1} ${yBot + 5} ${cx + botHw + 1} ${yBot + 1} L ${cx + topHw + 1} ${yTop}" fill="none" stroke="#d8c7b4" stroke-width="2" stroke-linecap="round"/>${handle}${foot}`,
      widthAtY: (y) => {
        const t = Math.max(0, Math.min(1, (yBot - y) / (yBot - yTop)));
        const hw = botHw + (topHw - botHw) * t;
        return [cx - hw, cx + hw];
      }
    };
  }
  if (glassType === 'bottle') {
    const yTop = 132;
    const yBot = 350;
    return {
      cx,
      yTop,
      yBot,
      clip: `M ${cx - 16} ${yTop} L ${cx - 18} 190 C ${cx - 18} 218, ${cx - 44} 230, ${cx - 44} 256 L ${cx - 44} ${yBot} L ${cx + 44} ${yBot} L ${cx + 44} 256 C ${cx + 44} 230, ${cx + 18} 218, ${cx + 18} 190 L ${cx + 16} ${yTop} Z`,
      outline: `<path d="M ${cx - 17} ${yTop} L ${cx - 19} 190 C ${cx - 19} 218, ${cx - 45} 230, ${cx - 45} 256 L ${cx - 45} ${yBot} Q ${cx - 45} ${yBot + 4} ${cx - 40} ${yBot + 4} L ${cx + 40} ${yBot + 4} Q ${cx + 45} ${yBot + 4} ${cx + 45} ${yBot} L ${cx + 45} 256 C ${cx + 45} 230, ${cx + 19} 218, ${cx + 19} 190 L ${cx + 17} ${yTop}" fill="none" stroke="#d8c7b4" stroke-width="2" stroke-linecap="round"/>`,
      widthAtY: (y) => {
        if (y < 195) return [cx - 17, cx + 17];
        if (y < 250) {
          const hw = 17 + 27 * ((y - 195) / 55);
          return [cx - hw, cx + hw];
        }
        return [cx - 44, cx + 44];
      }
    };
  }

  const yTop = 184;
  const yBot = 346;
  const topHw = 74;
  const botHw = 53;
  const beads =
    glassType === 'julep'
      ? `<line x1="${cx - topHw - 2}" y1="${yTop + 3}" x2="${cx + topHw + 2}" y2="${yTop + 3}" stroke="#d8c7b4" stroke-width="1.2" stroke-dasharray="2 2"/>`
      : '';
  return {
    cx,
    yTop,
    yBot,
    clip: `M ${cx - topHw} ${yTop} L ${cx - botHw} ${yBot} L ${cx + botHw} ${yBot} L ${cx + topHw} ${yTop} Z`,
    outline: `<path d="M ${cx - topHw - 1} ${yTop} L ${cx - botHw - 1} ${yBot + 1} Q ${cx - botHw - 1} ${yBot + 5} ${cx - botHw + 4} ${yBot + 5} L ${cx + botHw - 4} ${yBot + 5} Q ${cx + botHw + 1} ${yBot + 5} ${cx + botHw + 1} ${yBot + 1} L ${cx + topHw + 1} ${yTop}" fill="none" stroke="#d8c7b4" stroke-width="2" stroke-linecap="round"/>${beads}`,
    widthAtY: (y) => {
      const t = Math.max(0, Math.min(1, (yBot - y) / (yBot - yTop)));
      const hw = botHw + (topHw - botHw) * t;
      return [cx - hw, cx + hw];
    }
  };
}

const PATTERN_BUILDERS: Readonly<Record<FillPattern, (pid: string, col: string) => string>> = {
  woven: (pid, col) =>
    `<pattern id="${pid}" width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="${col}" fill-opacity="0.11"/><line x1="2" y1="1.5" x2="2" y2="6.5" stroke="${col}" stroke-width="1.15" stroke-opacity="0.82" stroke-linecap="round"/><line x1="5.5" y1="1.5" x2="5.5" y2="6.5" stroke="${col}" stroke-width="1.15" stroke-opacity="0.82" stroke-linecap="round"/><line x1="2" y1="4" x2="5.5" y2="4" stroke="${col}" stroke-width="0.9" stroke-opacity="0.55"/></pattern>`,
  dots: (pid, col) =>
    `<pattern id="${pid}" width="7" height="7" patternUnits="userSpaceOnUse"><rect width="7" height="7" fill="${col}" fill-opacity="0.09"/><circle cx="2" cy="2" r="1.15" fill="${col}" fill-opacity="0.85"/><circle cx="5.5" cy="5.5" r="1.15" fill="${col}" fill-opacity="0.85"/></pattern>`,
  cross: (pid, col) =>
    `<pattern id="${pid}" width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="${col}" fill-opacity="0.12"/><path d="M4 1.8V6.2M1.8 4H6.2" stroke="${col}" stroke-width="1.05" stroke-opacity="0.82" stroke-linecap="round"/></pattern>`,
  diagonal_weave: (pid, col) =>
    `<pattern id="${pid}" width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="${col}" fill-opacity="0.11"/><path d="M1.5 6L4 2L6.5 6" fill="none" stroke="${col}" stroke-width="1.05" stroke-opacity="0.8" stroke-linecap="round" stroke-linejoin="round"/></pattern>`,
  diagonal: (pid, col) =>
    `<pattern id="${pid}" width="7" height="7" patternUnits="userSpaceOnUse"><rect width="7" height="7" fill="${col}" fill-opacity="0.10"/><line x1="1.5" y1="5.5" x2="5.5" y2="1.5" stroke="${col}" stroke-width="1.1" stroke-opacity="0.82" stroke-linecap="round"/></pattern>`,
  dashes: (pid, col) =>
    `<pattern id="${pid}" width="10" height="6" patternUnits="userSpaceOnUse"><rect width="10" height="6" fill="${col}" fill-opacity="0.12"/><line x1="1.5" y1="2" x2="5.5" y2="2" stroke="${col}" stroke-width="1.15" stroke-opacity="0.85" stroke-linecap="round"/><line x1="5.5" y1="5" x2="9" y2="5" stroke="${col}" stroke-width="1.15" stroke-opacity="0.85" stroke-linecap="round"/></pattern>`,
  bubbles: (pid, col) =>
    `<pattern id="${pid}" width="12" height="12" patternUnits="userSpaceOnUse"><rect width="12" height="12" fill="${col}" fill-opacity="0.07"/><circle cx="3.5" cy="8.5" r="1.7" fill="none" stroke="${col}" stroke-width="0.95" stroke-opacity="0.78"/><circle cx="9" cy="4" r="1.2" fill="none" stroke="${col}" stroke-width="0.9" stroke-opacity="0.7"/><circle cx="6.5" cy="10.5" r="0.7" fill="${col}" fill-opacity="0.65"/></pattern>`,
  foam: (pid, col) =>
    `<pattern id="${pid}" width="5" height="5" patternUnits="userSpaceOnUse"><rect width="5" height="5" fill="${col}" fill-opacity="0.18"/><circle cx="1.5" cy="1.5" r="0.9" fill="${col}" fill-opacity="0.9"/><circle cx="4" cy="3.8" r="0.75" fill="${col}" fill-opacity="0.75"/></pattern>`
};

function buildPatternDefs(layers: readonly SpecLayer[], uid: string): string {
  return layers
    .map((lyr, i) => PATTERN_BUILDERS[lyr.pattern](`pat-${uid}-${i}`, lyr.color))
    .join('');
}

/**
 * Generates an architectural "Regarding Cocktails" proportional SVG diagram for a cocktail card.
 */
export function buildCocktailSpecSvg(
  card: Element,
  scopePrefix = 'vault',
  compact = false
): string {
  const uid = `${scopePrefix}-${card.id.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`;
  const glassDesc = (
    card.querySelector('.glassware-badge span')?.textContent ?? 'Cocktail glass'
  ).trim();
  const eyebrowSpans = card.querySelectorAll('.course-eyebrow span');
  const secondEyebrow = eyebrowSpans[1];
  const technique = secondEyebrow ? secondEyebrow.textContent.trim() : '';

  const { glassType, iceType } = classifyGlassAndIce(glassDesc, card.id);
  const cx = compact ? 204 : 152;
  const geom = getGlassGeometry(glassType, cx);

  const layers: SpecLayer[] = [];
  const drops: DropSpec[] = [];
  let hasAbsintheRinse = false;
  let sugarCubes = 0;
  const garnishParts: string[] = [];
  let rimText = '';
  let hasSmoke =
    technique.toUpperCase().includes('SMOKED') || glassDesc.toLowerCase().includes('smoked');

  for (const li of card.querySelectorAll('.spec-list .spec-item')) {
    const isGarnish = li.classList.contains('spec-garnish');
    const mEl = li.querySelector('.spec-measure');
    const mText = (mEl?.textContent ?? '').trim();
    const lowMeas = mText.toLowerCase();

    const cleanName = getCleanSpecName(li);
    const lowName = cleanName.toLowerCase();

    const ozAttr = Number.parseFloat(mEl?.getAttribute('data-oz') ?? '0');
    const cntAttr = Number.parseFloat(mEl?.getAttribute('data-count') ?? '0');
    const unitAttr = mEl?.getAttribute('data-unit') ?? '';
    const isBarspoon = mEl?.getAttribute('data-barspoon') === 'true';

    if (isGarnish) {
      if (lowMeas === 'rim' || lowName.includes('rim')) rimText = cleanName;
      garnishParts.push(cleanName);
      continue;
    }
    if (lowMeas === 'smoke' || lowMeas === 'prep' || lowName.includes('smoke')) {
      hasSmoke = true;
      continue;
    }
    if (lowMeas === 'ampule' && !lowName.includes('0.5 oz')) {
      garnishParts.push(cleanName);
      continue;
    }
    if (isBarspoon && (lowName.includes('rinse') || lowName.includes('absinthe'))) {
      hasAbsintheRinse = true;
      continue;
    }
    if (['dash', 'drop', 'spray'].includes(unitAttr)) {
      const c = Math.max(1, Math.round(cntAttr));
      let bColor = '#d9783a';
      if (lowName.includes('peychaud') || lowName.includes('fire')) bColor = '#d65a4a';
      else if (lowName.includes('celery') || lowName.includes('absinthe')) bColor = '#86b478';
      else if (lowName.includes('orange')) bColor = '#eba844';
      drops.push({ count: c, color: bColor });
      continue;
    }
    if (unitAttr === 'cube') {
      sugarCubes += Math.max(1, Math.round(cntAttr));
      continue;
    }
    if (['leaf', 'slice', 'bean', 'sprig'].includes(unitAttr)) {
      garnishParts.push(cleanName);
      continue;
    }

    let oz: number;
    if (unitAttr === 'piece') {
      if (lowName.includes('egg white')) {
        oz = 0.75;
      } else {
        garnishParts.push(cleanName);
        continue;
      }
    } else if (ozAttr > 0) {
      oz = ozAttr;
    } else if (unitAttr === 'tsp') {
      if (lowName.includes('cinnamon') || lowName.includes('nutmeg')) {
        garnishParts.push(cleanName);
        continue;
      }
      oz = cntAttr * 0.167;
    } else if (unitAttr === 'tbsp') {
      oz = cntAttr * 0.5;
    } else if (unitAttr === 'cup') {
      oz = cntAttr * 8.0;
    } else if (unitAttr === 'splash') {
      oz = cntAttr * 0.2;
    } else if (lowMeas === 'to top') {
      oz = lowName.includes('cream') ? 1.0 : 2.0;
    } else if (lowMeas.startsWith('ampule')) {
      oz = 0.5;
    } else {
      continue;
    }

    const baseStyle = classifyIngredientStyle(cleanName, layers.length);
    let { pattern } = baseStyle;
    const prevLayer = layers.at(-1);
    if (prevLayer?.pattern === pattern && pattern !== 'bubbles' && pattern !== 'foam') {
      pattern = ALT_PATTERNS.find((p) => p !== pattern) ?? 'dots';
    }

    let measLbl = mText;
    if (lowMeas.startsWith('ampule')) measLbl = '0.5 oz';
    else if (lowMeas.includes('barspoon')) measLbl = '1 bsp';
    else if (lowMeas === '1' && lowName.includes('egg white')) measLbl = '1 egg';

    layers.push({
      name: cleanName,
      shortLabel: shortenSpecLabel(cleanName),
      measureLabel: measLbl,
      oz,
      rawOz: ozAttr,
      rawCount: cntAttr,
      rawUnit: unitAttr,
      isBarspoon,
      color: baseStyle.color,
      pattern
    });
  }

  if (!rimText && glassDesc.toLowerCase().includes('rim')) {
    rimText = glassDesc;
  }
  const garnishText = garnishParts.join(' · ');

  const { yTop, yBot } = geom;
  const glassH = yBot - yTop;
  const totalOz = layers.reduce((acc, l) => acc + l.oz, 0) || 3.0;

  let fillRatio = Math.min(0.75, Math.max(0.5, totalOz / 4.8));
  if (iceType === 'king_cube' || iceType === 'chili_cube') fillRatio = 0.76;
  else if (iceType === 'cubes' || iceType === 'crushed') fillRatio = 0.8;
  else if (['coupe', 'nick_nora', 'martini'].includes(glassType)) fillRatio = 0.78;
  else if (glassType === 'bottle') fillRatio = 0.84;

  const totalLiqH = glassH * fillRatio;
  const liquidTopY = yBot - totalLiqH;
  const rawHeights = layers.map((l) => Math.max(7.0, (l.oz / totalOz) * totalLiqH));
  const sumRaw = rawHeights.reduce((a, b) => a + b, 0) || 1.0;
  const layerHeights = rawHeights.map((h) => h * (totalLiqH / sumRaw));
  const patternDefs = buildPatternDefs(layers, uid);

  const iceMaskCutouts: string[] = [];
  const iceOutlines: string[] = [];
  if (iceType === 'king_cube' || iceType === 'chili_cube') {
    const cubeW = 66;
    const cubeH = 68;
    const [xlAtLiq] = geom.widthAtY(liquidTopY + 25);
    const cubeX = xlAtLiq + 10;
    const cubeY = liquidTopY + 1;
    iceMaskCutouts.push(
      `<rect x="${cubeX.toFixed(1)}" y="${cubeY.toFixed(1)}" width="${cubeW}" height="${cubeH}" rx="1.5" fill="black"/>`
    );
    iceOutlines.push(
      `<rect x="${cubeX.toFixed(1)}" y="${cubeY.toFixed(1)}" width="${cubeW}" height="${cubeH}" rx="1.5" fill="#110c0a" fill-opacity="0.25" stroke="#dfd2c0" stroke-width="0.9" stroke-opacity="0.22"/>`
    );
    if (iceType === 'chili_cube') {
      const chX = cubeX + cubeW * 0.5;
      const chY = cubeY + cubeH * 0.52;
      iceOutlines.push(
        `<path d="M ${chX - 12} ${chY + 6} Q ${chX} ${chY - 8} ${chX + 14} ${chY - 4} Q ${chX + 2} ${chY + 4} ${chX - 12} ${chY + 6} Z" fill="#d65a4a" fill-opacity="0.88"/><path d="M ${chX + 14} ${chY - 4} Q ${chX + 19} ${chY - 7} ${chX + 20} ${chY - 10}" fill="none" stroke="#82b078" stroke-width="1.2" stroke-linecap="round"/>`
      );
    }
  } else if (iceType === 'cubes') {
    const [xlAtLiq] = geom.widthAtY(liquidTopY + 20);
    const cubes: readonly (readonly [number, number, number, number])[] = [
      [xlAtLiq + 11, liquidTopY + 3, 42, -5],
      [xlAtLiq + 21, liquidTopY + 49, 38, 7]
    ];
    for (const [cxI, cyI, csI, rot] of cubes) {
      const rotStr = `rotate(${rot} ${(cxI + csI / 2).toFixed(1)} ${(cyI + csI / 2).toFixed(1)})`;
      iceMaskCutouts.push(
        `<rect x="${cxI.toFixed(1)}" y="${cyI.toFixed(1)}" width="${csI}" height="${csI}" rx="1.5" transform="${rotStr}" fill="black"/>`
      );
      iceOutlines.push(
        `<rect x="${cxI.toFixed(1)}" y="${cyI.toFixed(1)}" width="${csI}" height="${csI}" rx="1.5" transform="${rotStr}" fill="#110c0a" fill-opacity="0.25" stroke="#dfd2c0" stroke-width="0.85" stroke-opacity="0.22"/>`
      );
    }
  } else if (iceType === 'crushed') {
    const shards: readonly (readonly [number, number, number])[] = [
      [-34, 4, 15],
      [-15, 9, 14],
      [5, 4, 15],
      [-25, 22, 13],
      [-5, 24, 14]
    ];
    for (const [dx, dy, sz] of shards) {
      const px = cx + dx;
      const py = liquidTopY + dy;
      const rotStr = `rotate(18 ${(px + sz / 2).toFixed(1)} ${(py + sz / 2).toFixed(1)})`;
      iceMaskCutouts.push(
        `<rect x="${px.toFixed(1)}" y="${py.toFixed(1)}" width="${sz}" height="${sz}" rx="2" transform="${rotStr}" fill="black"/>`
      );
      iceOutlines.push(
        `<rect x="${px.toFixed(1)}" y="${py.toFixed(1)}" width="${sz}" height="${sz}" rx="2" transform="${rotStr}" fill="none" stroke="#dfd2c0" stroke-width="0.85" stroke-opacity="0.26"/>`
      );
    }
  }

  const layerRects: string[] = [];
  const calloutItems: CalloutItem[] = [];
  let currBottom = yBot;
  layers.forEach((lyr, i) => {
    const lh = layerHeights[i] ?? 0;
    const ly = currBottom - lh;
    const pid = `pat-${uid}-${i}`;
    const col = lyr.color;
    layerRects.push(
      `<rect x="${cx - 110}" y="${ly.toFixed(2)}" width="220" height="${lh.toFixed(2)}" fill="url(#${pid})"/>`
    );
    if (i < layers.length - 1) {
      layerRects.push(
        `<line x1="${cx - 110}" y1="${ly.toFixed(2)}" x2="${cx + 110}" y2="${ly.toFixed(2)}" stroke="${col}" stroke-width="0.7" stroke-opacity="0.45" stroke-dasharray="2 2"/>`
      );
    } else {
      layerRects.push(
        `<line x1="${cx - 110}" y1="${ly.toFixed(2)}" x2="${cx + 110}" y2="${ly.toFixed(2)}" stroke="${col}" stroke-width="1.1" stroke-opacity="0.7"/>`
      );
    }
    const midY = ly + lh * 0.5;
    const [, xrMid] = geom.widthAtY(midY);
    calloutItems.push({ midY, xr: xrMid, lyr });
    currBottom = ly;
  });

  let calloutSvg = '';
  if (!compact) {
    calloutItems.sort((a, b) => a.midY - b.midY);
    const minGap = 15.5;
    const labelYs = calloutItems.map((c) => c.midY);
    for (let i = 1; i < labelYs.length; i++) {
      const prev = labelYs[i - 1];
      const curr = labelYs[i];
      if (prev !== undefined && curr !== undefined && curr - prev < minGap) {
        labelYs[i] = prev + minGap;
      }
    }
    calloutSvg = calloutItems
      .map((c, idx) => {
        const lyLbl = labelYs[idx] ?? c.midY;
        const xStart = c.xr + 4;
        const xElbow = 240;
        const xText = 245;
        const col = c.lyr.color;
        let dataAttrs = '';
        if (c.lyr.rawOz > 0) {
          dataAttrs += ` data-oz="${c.lyr.rawOz}"`;
          if (c.lyr.isBarspoon) dataAttrs += ' data-barspoon="true" data-short="true"';
        } else if (c.lyr.rawCount > 0 && c.lyr.rawUnit) {
          dataAttrs += ` data-count="${c.lyr.rawCount}" data-unit="${c.lyr.rawUnit}"`;
        }
        return `<g class="spec-svg-callout"><polyline points="${xStart.toFixed(1)},${c.midY.toFixed(1)} ${xElbow - 6},${lyLbl.toFixed(1)} ${xElbow},${lyLbl.toFixed(1)}" fill="none" stroke="${col}" stroke-width="0.85" stroke-opacity="0.65"/><circle cx="${xStart.toFixed(1)}" cy="${c.midY.toFixed(1)}" r="1.5" fill="${col}"/><text x="${xText}" y="${(lyLbl + 3).toFixed(1)}" fill="#f5efe8" font-family="'JetBrains Mono', monospace" font-size="8.2" letter-spacing="0.01em"><tspan class="spec-measure"${dataAttrs} fill="${col}" font-weight="600">${escapeMarkup(c.lyr.measureLabel)}</tspan> <tspan fill="#c7b9ab">${escapeMarkup(c.lyr.shortLabel)}</tspan></text></g>`;
      })
      .join('');
  }

  const garnishEls: string[] = [];
  const [xlTop, xrTop] = geom.widthAtY(yTop);
  const [xlBot, xrBot] = geom.widthAtY(yBot);
  const [, xrLiq] = geom.widthAtY(liquidTopY);
  const gLow = garnishText.toLowerCase();

  if (hasAbsintheRinse) {
    garnishEls.push(
      `<path d="M ${(xlTop + 4).toFixed(1)} ${yTop + 6} L ${(xlBot + 3).toFixed(1)} ${yBot - 3} L ${(xrBot - 3).toFixed(1)} ${yBot - 3} L ${(xrTop - 4).toFixed(1)} ${yTop + 6}" fill="none" stroke="#86b478" stroke-width="3" stroke-opacity="0.55" stroke-dasharray="4 3" stroke-linecap="round"/>`
    );
  }
  if (sugarCubes > 0) {
    for (let cIdx = 0; cIdx < Math.min(sugarCubes, 3); cIdx++) {
      garnishEls.push(
        `<rect x="${cx - 14 + cIdx * 16}" y="${yBot - 14}" width="11" height="11" rx="1.5" fill="#14100e" stroke="#e8c86b" stroke-width="1.2" stroke-dasharray="2 1.5"/>`
      );
    }
  }
  if (rimText) {
    let rCol = '#f2e6d8';
    const rimLow = rimText.toLowerCase();
    if (rimLow.includes('tajín') || rimLow.includes('chili')) rCol = '#d65a4a';
    else if (rimLow.includes('cinnamon')) rCol = '#d9822b';
    else if (rimLow.includes('chocolate')) rCol = '#c96567';
    for (let d = 0; d <= 26; d++) {
      const rx = xlTop + (xrTop - xlTop) * (d / 26);
      const ry = yTop + (d % 2 === 0 ? 2.5 : -1.5);
      garnishEls.push(
        `<circle cx="${rx.toFixed(1)}" cy="${ry.toFixed(1)}" r="1.3" fill="${rCol}" fill-opacity="0.88"/>`
      );
    }
  }

  const flatDrops: string[] = [];
  for (const d of drops) {
    for (let k = 0; k < d.count; k++) flatDrops.push(d.color);
  }
  const dropX = xrLiq - 16;
  const baseDropY = Math.min(liquidTopY - 9, yTop + 26);
  flatDrops.slice(0, 6).forEach((dCol, idx) => {
    const dy = baseDropY - idx * 12.5;
    garnishEls.push(
      `<path d="M ${dropX.toFixed(1)} ${(dy - 5).toFixed(1)} C ${(dropX + 3.5).toFixed(1)} ${(dy - 0.5).toFixed(1)}, ${(dropX + 3.5).toFixed(1)} ${(dy + 3.5).toFixed(1)}, ${dropX.toFixed(1)} ${(dy + 3.5).toFixed(1)} C ${(dropX - 3.5).toFixed(1)} ${(dy + 3.5).toFixed(1)}, ${(dropX - 3.5).toFixed(1)} ${(dy - 0.5).toFixed(1)}, ${dropX.toFixed(1)} ${(dy - 5).toFixed(1)} Z" fill="none" stroke="${dCol}" stroke-width="1.35"/>`
    );
  });

  const gy = Math.min(liquidTopY - 8, yTop + 6);
  if (['twist', 'peel', 'swath'].some((k) => gLow.includes(k))) {
    let pCol = '#e8c86b';
    if (gLow.includes('orange')) pCol = '#e8993a';
    else if (gLow.includes('grapefruit')) pCol = '#df7362';
    else if (gLow.includes('lime')) pCol = '#a8c66c';
    const sx = cx - 42;
    const sy = gy - 4;
    garnishEls.push(
      `<g fill="none" stroke="${pCol}" stroke-width="1.45" stroke-linecap="round" stroke-linejoin="round"><path d="M ${sx} ${sy - 12} C ${sx} ${sy + 10}, ${sx + 34} ${sy + 12}, ${sx + 36} ${sy - 12} C ${sx + 38} ${sy - 30}, ${sx + 16} ${sy - 30}, ${sx + 18} ${sy - 10} C ${sx + 20} ${sy + 12}, ${sx + 64} ${sy + 12}, ${sx + 66} ${sy - 10} C ${sx + 68} ${sy - 28}, ${sx + 48} ${sy - 28}, ${sx + 50} ${sy - 8} C ${sx + 52} ${sy + 10}, ${sx + 82} ${sy + 8}, ${sx + 88} ${sy - 10}"/><path d="M ${sx + 4} ${sy - 12} C ${sx + 4} ${sy + 6}, ${sx + 30} ${sy + 8}, ${sx + 32} ${sy - 12}" stroke-opacity="0.55" stroke-width="1.0"/></g>`
    );
  } else if (['wheel', 'slice', 'wedge', 'dehydrated'].some((k) => gLow.includes(k))) {
    let wCol = '#e8c86b';
    if (gLow.includes('jalapeño')) wCol = '#82b078';
    else if (gLow.includes('lime') || gLow.includes('cucumber')) wCol = '#a8c66c';
    else if (gLow.includes('orange')) wCol = '#e8993a';
    else if (gLow.includes('apple')) wCol = '#df7362';
    const wx = cx + 8;
    const wy = liquidTopY - 2;
    if (gLow.includes('jalapeño')) {
      garnishEls.push(
        `<g fill="#120d0b" stroke="${wCol}" stroke-width="1.4"><circle cx="${wx}" cy="${wy}" r="14"/><circle cx="${wx}" cy="${wy}" r="9" fill="none" stroke-dasharray="3 2"/><circle cx="${wx - 3}" cy="${wy - 2}" r="1" fill="${wCol}"/><circle cx="${wx + 3}" cy="${wy + 2}" r="1" fill="${wCol}"/><circle cx="${wx + 2}" cy="${wy - 3}" r="1" fill="${wCol}"/></g>`
      );
    } else {
      let spokes = '';
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4;
        spokes += `<line x1="${wx}" y1="${wy}" x2="${(wx + 15 * Math.cos(a)).toFixed(1)}" y2="${(wy + 15 * Math.sin(a)).toFixed(1)}" stroke="${wCol}" stroke-width="0.9" stroke-opacity="0.7"/>`;
      }
      garnishEls.push(
        `<g><circle cx="${wx}" cy="${wy}" r="16" fill="#120d0b" stroke="${wCol}" stroke-width="1.5"/><circle cx="${wx}" cy="${wy}" r="13" fill="none" stroke="${wCol}" stroke-width="0.8" stroke-opacity="0.6"/>${spokes}</g>`
      );
    }
  }

  if (['cherry', 'raspberr', 'blackberr', 'cranberr'].some((k) => gLow.includes(k))) {
    const cCol = '#c95959';
    if (gLow.includes('base of glass')) {
      garnishEls.push(
        `<circle cx="${cx}" cy="${yBot - 10}" r="6.5" fill="#180d0d" stroke="${cCol}" stroke-width="1.5"/>`
      );
    } else {
      const px = cx + 16;
      const py = liquidTopY - 4;
      garnishEls.push(
        `<g stroke="${cCol}" stroke-width="1.4" fill="none"><line x1="${px - 14}" y1="${py + 16}" x2="${px + 18}" y2="${py - 22}" stroke="#d8c7b4" stroke-width="1.2"/><circle cx="${px + 18}" cy="${py - 22}" r="2" fill="#d8c7b4" stroke="none"/><circle cx="${px}" cy="${py}" r="6.5" fill="#180d0d" stroke="${cCol}" stroke-width="1.5"/></g>`
      );
    }
  }

  if (['rosemary', 'mint', 'thyme', 'sprig', 'leaf'].some((k) => gLow.includes(k))) {
    const bCol = '#86b478';
    const bx = cx - 20;
    const by = liquidTopY + 6;
    garnishEls.push(
      `<g fill="none" stroke="${bCol}" stroke-width="1.35" stroke-linecap="round"><path d="M ${bx} ${by + 10} Q ${bx - 8} ${by - 15} ${bx - 16} ${by - 38}"/><path d="M ${bx - 4} ${by - 4} C ${bx - 14} ${by - 8}, ${bx - 14} ${by - 14}, ${bx - 5} ${by - 12}"/><path d="M ${bx - 4} ${by - 4} C ${bx + 4} ${by - 10}, ${bx + 4} ${by - 16}, ${bx - 5} ${by - 12}"/><path d="M ${bx - 9} ${by - 18} C ${bx - 19} ${by - 22}, ${bx - 19} ${by - 28}, ${bx - 10} ${by - 25}"/><path d="M ${bx - 9} ${by - 18} C ${bx - 1} ${by - 24}, ${bx - 1} ${by - 30}, ${bx - 10} ${by - 25}"/><path d="M ${bx - 13} ${by - 30} C ${bx - 22} ${by - 34}, ${bx - 20} ${by - 40}, ${bx - 14} ${by - 36}"/></g>`
    );
  }

  if (gLow.includes('cinnamon stick')) {
    garnishEls.push(
      `<g transform="translate(${cx + 20}, ${liquidTopY - 14}) rotate(18)"><rect x="-3.5" y="-22" width="7" height="48" rx="2" fill="#14100e" stroke="#c87638" stroke-width="1.4"/><line x1="-1" y1="-18" x2="-1" y2="20" stroke="#c87638" stroke-width="0.8" stroke-opacity="0.6"/></g>`
    );
  }

  if (gLow.includes('coffee bean')) {
    const beans: readonly (readonly [number, number, number])[] = [
      [-12, -2, -15],
      [0, -4, 10],
      [12, -2, -25]
    ];
    for (const [dx, dy, rot] of beans) {
      garnishEls.push(
        `<g transform="translate(${cx + dx}, ${liquidTopY + dy}) rotate(${rot})"><ellipse cx="0" cy="0" rx="5" ry="3.2" fill="#14100e" stroke="#c88d55" stroke-width="1.2"/><path d="M -3.5 0 Q 0 1.2 3.5 0" fill="none" stroke="#c88d55" stroke-width="0.9"/></g>`
      );
    }
  }

  if (hasSmoke) {
    garnishEls.push(
      `<g fill="none" stroke="#c7b9ab" stroke-width="1.1" stroke-opacity="0.45" stroke-linecap="round" stroke-dasharray="3 3"><path d="M ${cx - 26} ${yTop - 6} C ${cx - 36} ${yTop - 22}, ${cx - 12} ${yTop - 30}, ${cx - 22} ${yTop - 46}"/><path d="M ${cx + 8} ${yTop - 10} C ${cx - 2} ${yTop - 26}, ${cx + 22} ${yTop - 34}, ${cx + 12} ${yTop - 50}"/></g>`
    );
  }

  const vb = compact ? '60 75 290 305' : '0 0 420 460';
  const frameRect = compact
    ? ''
    : '<rect x="14" y="14" width="392" height="432" rx="8" fill="none" stroke="#e8c59e" stroke-opacity="0.1" stroke-width="1"/>';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" width="100%" height="100%" class="cocktail-spec-svg" aria-hidden="true">
    <defs>
      <clipPath id="glass-clip-${uid}"><path d="${geom.clip}"/></clipPath>
      <mask id="ice-mask-${uid}">
        <rect x="0" y="0" width="420" height="460" fill="white"/>
        ${iceMaskCutouts.join('')}
      </mask>
      ${patternDefs}
    </defs>
    ${frameRect}
    <g clip-path="url(#glass-clip-${uid})">
      <g mask="url(#ice-mask-${uid})">${layerRects.join('')}</g>
      ${iceOutlines.join('')}
    </g>
    ${geom.outline}
    ${garnishEls.join('')}
    ${calloutSvg}
  </svg>`;
}

/**
 * Appends the Spec View / Photo View toggle button onto a cocktail card visual container.
 */
export function attachSpecViewToggle(visualContainer: Element): void {
  const toggleBtn = document.createElement('button');
  toggleBtn.type = 'button';
  toggleBtn.className = 'spec-view-toggle';
  toggleBtn.title = 'Switch between Regarding Cocktails spec diagram and photo';
  toggleBtn.textContent = '📐 Spec View';
  toggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const forcedPhoto = visualContainer.getAttribute('data-force-photo') === 'true';
    if (forcedPhoto) {
      visualContainer.removeAttribute('data-force-photo');
      toggleBtn.textContent = '📐 Spec View';
    } else {
      visualContainer.setAttribute('data-force-photo', 'true');
      toggleBtn.textContent = '📷 Photo View';
    }
  });
  visualContainer.appendChild(toggleBtn);
}

/**
 * Lazily injects the SVG spec diagram into a Vault cocktail card if not already mounted.
 */
export function mountVaultCardSpecDiagram(card: Element): void {
  const visualEl = card.querySelector('.card-visual');
  if (!visualEl || visualEl.querySelector('.spec-diagram-wrap')) return;
  const wrap = document.createElement('div');
  wrap.className = 'spec-diagram-wrap';
  wrap.innerHTML = buildCocktailSpecSvg(card, 'vault', false);
  visualEl.appendChild(wrap);
  attachSpecViewToggle(visualEl);
}

/**
 * Defers Vault SVG diagram generation until cards near the viewport.
 */
export function initLazyVaultDiagrams(): void {
  const vaultDiagramCards = document.querySelectorAll('.vault-card:not(.vault-missing-card)');
  const IntersectionObserverCtor: typeof IntersectionObserver | undefined =
    globalThis.IntersectionObserver;
  const scheduleIdle: ((callback: IdleRequestCallback) => number) | undefined =
    globalThis.requestIdleCallback;

  if (typeof IntersectionObserverCtor === 'function') {
    const diagramObserver = new IntersectionObserverCtor(
      (entries, observer) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          mountVaultCardSpecDiagram(entry.target);
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: '400px 0px' }
    );
    for (const card of vaultDiagramCards) {
      diagramObserver.observe(card);
    }
  } else if (typeof scheduleIdle === 'function') {
    scheduleIdle(() => {
      for (const card of vaultDiagramCards) {
        mountVaultCardSpecDiagram(card);
      }
    });
  } else {
    setTimeout(() => {
      for (const card of vaultDiagramCards) {
        mountVaultCardSpecDiagram(card);
      }
    }, 0);
  }
}
