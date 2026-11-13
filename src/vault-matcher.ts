import { escapeMarkup, getCleanSpecName, scrollIntoViewAsync } from './dom-utils.ts';
import { mountVaultCardSpecDiagram } from './svg-diagram.ts';
import type {
  AppState,
  BackbarMatchMode,
  BackbarShelf,
  CardIngredientInfo,
  CardMatchEval,
  CatalogIngredient,
  IngredientRule,
  PageViewOptions
} from './types.ts';

// First match wins; keep specific rules above generic ones.
export const CANONICAL_INGREDIENT_RULES: readonly IngredientRule[] = [
  // Theatrical / non-blocking elements (automatically treated as optional like garnishes)
  {
    id: '_optional',
    shelf: 'optional',
    label: 'Optional',
    shortLabel: 'Optional',
    keywords: [
      'smoke',
      'mist',
      'boiling hot water',
      'filtered water',
      'sidecar dropper',
      'whipped cream',
      'ground cinnamon',
      'candied ginger',
      'vanilla extract',
      'roasted coffee beans',
      'grapefruit peel',
      'rosemary sprig',
      'fire tincture'
    ]
  },

  // Specific cream/liqueur modifiers that share base-spirit words (must precede whiskey rules)
  {
    id: 'coffee_cream',
    shelf: 'modifiers',
    label: '☕ Coffee Liqueur & Cream',
    shortLabel: 'Coffee Liqueur & Cream',
    keywords: [
      'coffee liqueur',
      'baileys',
      'irish cream',
      'bourbon cream',
      'pumpkin spice creamer',
      'half-and-half',
      'heavy cream',
      'peppermint schnapps'
    ]
  },

  // Shelf 1: Base Spirits (check specific whiskeys before generic whiskey)
  {
    id: 'irish_whiskey',
    shelf: 'spirits',
    label: '🍀 Irish Whiskey',
    shortLabel: 'Irish Whiskey',
    keywords: ['irish whiskey', 'tullamore', 'bushmills', 'pot still irish']
  },
  {
    id: 'scotch',
    shelf: 'spirits',
    label: '🔥 Scotch',
    shortLabel: 'Scotch',
    keywords: ['scotch']
  },
  {
    id: 'whiskey',
    shelf: 'spirits',
    label: '🥃 Bourbon & Rye',
    shortLabel: 'Bourbon / Rye',
    keywords: ['bourbon', 'rye whiskey', 'straight rye', 'whiskey']
  },
  {
    id: 'gin',
    shelf: 'spirits',
    label: '🍸 Gin',
    shortLabel: 'Gin',
    keywords: ['gin', "pimm's", 'pimms']
  },
  {
    id: 'mezcal',
    shelf: 'spirits',
    label: '🌵 Mezcal',
    shortLabel: 'Mezcal',
    keywords: ['mezcal']
  },
  {
    id: 'tequila',
    shelf: 'spirits',
    label: '🌵 Tequila',
    shortLabel: 'Tequila',
    keywords: ['tequila', 'reposado']
  },
  {
    id: 'vodka',
    shelf: 'spirits',
    label: '❄️ Vodka',
    shortLabel: 'Vodka',
    keywords: ['vodka']
  },
  {
    id: 'brandy',
    shelf: 'spirits',
    label: '🍎 Cognac & Applejack',
    shortLabel: 'Cognac / Applejack',
    keywords: ['cognac', 'applejack', 'apple brandy']
  },
  {
    id: 'rum',
    shelf: 'spirits',
    label: '🏝️ Rum',
    shortLabel: 'Rum',
    keywords: ['rum']
  },
  {
    id: 'beer',
    shelf: 'spirits',
    label: '🍺 Beer & Stout',
    shortLabel: 'Beer / Stout',
    keywords: ['stout', 'lager', 'pilsner', 'high life', 'guinness']
  },

  // Shelf 2: Backbar Liqueurs, Vermouth & Amari
  {
    id: 'orange_liqueur',
    shelf: 'modifiers',
    label: '🍊 Cointreau / Grand Marnier',
    shortLabel: 'Orange Liqueur',
    keywords: ['cointreau', 'grand marnier', 'orange liqueur', 'triple sec']
  },
  {
    id: 'aperol',
    shelf: 'modifiers',
    label: '🍊 Aperol',
    shortLabel: 'Aperol',
    keywords: ['aperol']
  },
  {
    id: 'campari',
    shelf: 'modifiers',
    label: '🔴 Campari',
    shortLabel: 'Campari',
    keywords: ['campari']
  },
  {
    id: 'benedictine',
    shelf: 'modifiers',
    label: '🍯 Bénédictine D.O.M.',
    shortLabel: 'Bénédictine',
    keywords: ['bénédictine', 'benedictine']
  },
  {
    id: 'maraschino',
    shelf: 'modifiers',
    label: '🍒 Luxardo Maraschino',
    shortLabel: 'Luxardo Maraschino',
    keywords: ['maraschino']
  },
  {
    id: 'sweet_vermouth',
    shelf: 'modifiers',
    label: '🍷 Sweet Vermouth',
    shortLabel: 'Sweet Vermouth',
    keywords: ['sweet vermouth', 'carpano antica']
  },
  {
    id: 'dry_vermouth',
    shelf: 'modifiers',
    label: '🍸 Dry / Blanc Vermouth',
    shortLabel: 'Dry Vermouth',
    keywords: ['dry vermouth', 'blanc vermouth']
  },
  {
    id: 'amaro_nonino',
    shelf: 'modifiers',
    label: '🌿 Amaro Nonino',
    shortLabel: 'Amaro Nonino',
    keywords: ['nonino']
  },
  {
    id: 'dark_amaro',
    shelf: 'modifiers',
    label: '🌱 Cynar / Averna / Amaro',
    shortLabel: 'Cynar / Amaro',
    keywords: ['cynar', 'averna', 'gentian amaro', 'strega']
  },
  {
    id: 'absinthe',
    shelf: 'modifiers',
    label: '🧚 Absinthe',
    shortLabel: 'Absinthe',
    keywords: ['absinthe', 'herbsaint']
  },
  {
    id: 'cherry_berry',
    shelf: 'modifiers',
    label: '🍒 Cherry Heering / Chambord',
    shortLabel: 'Cherry Heering / Chambord',
    keywords: ['chambord', 'heering']
  },
  {
    id: 'amaretto',
    shelf: 'modifiers',
    label: '🌰 Amaretto',
    shortLabel: 'Amaretto',
    keywords: ['amaretto']
  },
  {
    id: 'floral_liqueur',
    shelf: 'modifiers',
    label: '🌸 St-Germain / Crème de Violette',
    shortLabel: 'St-Germain / Violette',
    keywords: ['st-germain', 'elderflower', 'violette']
  },
  {
    id: 'cacao_ancho',
    shelf: 'modifiers',
    label: '🍫 Crème de Cacao / Ancho Reyes',
    shortLabel: 'Crème de Cacao / Ancho',
    keywords: ['crème de cacao', 'ancho reyes']
  },
  {
    id: 'spiced_melon_ginger',
    shelf: 'modifiers',
    label: '🍈 Midori / Allspice / Ginger Liqueur',
    shortLabel: 'Midori / Allspice / Ginger',
    keywords: ['midori', 'allspice dram', 'ginger liqueur']
  },

  // Shelf 3: Citrus, Syrups, Bitters & Mixers (not assumed stocked)
  {
    id: 'lemon',
    shelf: 'pantry',
    label: '🍋 Lemon Juice',
    shortLabel: 'Lemon Juice',
    keywords: ['lemon juice']
  },
  {
    id: 'lime',
    shelf: 'pantry',
    label: '🍈 Lime Juice',
    shortLabel: 'Lime Juice',
    keywords: ['lime juice', 'lime cordial', 'limeade']
  },
  {
    id: 'simple_syrup',
    shelf: 'pantry',
    label: '🍯 Simple / Demerara Syrup',
    shortLabel: 'Simple Syrup',
    keywords: [
      'simple syrup',
      'demerara',
      'sugar',
      'grenadine',
      'cinnamon syrup',
      'spiced syrup',
      'white chocolate syrup',
      'chili syrup',
      'passionfruit syrup',
      'ginger syrup'
    ]
  },
  {
    id: 'maple_honey_agave',
    shelf: 'pantry',
    label: '🍁 Maple, Honey & Agave',
    shortLabel: 'Maple / Honey / Agave',
    keywords: ['maple syrup', 'honey', 'agave']
  },
  {
    id: 'bitters',
    shelf: 'pantry',
    label: "💧 Angostura & Peychaud's Bitters",
    shortLabel: 'Bitters',
    keywords: ['bitters']
  },
  {
    id: 'soda_ginger',
    shelf: 'pantry',
    label: '🫧 Club Soda & Ginger Beer',
    shortLabel: 'Club Soda / Ginger Beer',
    keywords: ['club soda', 'ginger beer', 'ginger ale', 'monster energy']
  },
  {
    id: 'juices_cider',
    shelf: 'pantry',
    label: '🍎 Cider, Juice & Espresso',
    shortLabel: 'Cider / Juice / Coffee',
    keywords: [
      'apple cider',
      'cranberry juice',
      'orange juice',
      'pineapple juice',
      'espresso',
      'press coffee',
      'pumpkin purée'
    ]
  },
  {
    id: 'fresh_pantry',
    shelf: 'pantry',
    label: '🌿 Egg White, Mint & Produce',
    shortLabel: 'Egg / Mint / Berries',
    keywords: ['egg white', 'mint leaves', 'blackberries', 'cucumber']
  }
];

function parseExplicitShelf(rawShelf: string | null): BackbarShelf | null {
  if (rawShelf === 'spirits' || rawShelf === 'modifiers' || rawShelf === 'pantry') {
    return rawShelf;
  }
  return null;
}

/**
 * Initializes the Cellar Vault filters, "What Can I Make?" Backbar matcher,
 * Doug/Quinn 404 Easter egg, curated search index, and "I'm Feeling Lucky" selector.
 */
export function initVaultAndBackbar(
  state: AppState,
  onRequestVaultView: (options: PageViewOptions) => void
): void {
  const navVaultBtn = document.getElementById('nav-vault-btn');
  const searchInputEl = document.getElementById('archive-search');
  const searchInput = searchInputEl instanceof HTMLInputElement ? searchInputEl : null;
  const hostBtns = document.querySelectorAll<HTMLButtonElement>('[data-filter-host]');
  const spiritBtns = document.querySelectorAll<HTMLButtonElement>('[data-filter-spirit]');
  const provBtns = document.querySelectorAll<HTMLButtonElement>('[data-filter-provenance]');
  const quickChips = document.querySelectorAll<HTMLElement>('[data-quick-search]');
  const resetBtn = document.getElementById('reset-archive-filters');
  const archiveCountEl = document.getElementById('archive-count');
  const archiveSessionsContainer = document.getElementById('archive-sessions-container');
  const archiveSessions = document.querySelectorAll<HTMLElement>('.archive-session');
  const box404 = document.getElementById('doug-quinn-404');
  const culpritEl = document.getElementById('err-404-culprit');
  const bypass404Btn = document.getElementById('bypass-404-btn');

  const vaultMakerBtn = document.getElementById('vault-maker-btn');
  const vaultMakerBtnLabel = document.getElementById('vault-maker-btn-label');
  const vaultLuckyBtnLabel = document.getElementById('vault-lucky-btn-label');
  const backbarDrawer = document.getElementById('backbar-drawer');
  const backbarSpiritsChips = document.getElementById('backbar-spirits-chips');
  const backbarSpiritsHint = document.getElementById('backbar-spirits-hint');
  const backbarStepModifiers = document.getElementById('backbar-step-modifiers');
  const backbarModifiersTitle = document.getElementById('backbar-modifiers-title');
  const backbarModifiersChips = document.getElementById('backbar-modifiers-chips');
  const backbarStepPantry = document.getElementById('backbar-step-pantry');
  const backbarPantryChips = document.getElementById('backbar-pantry-chips');
  const backbarFooter = document.getElementById('backbar-footer');
  const backbarReadyCountEl = document.getElementById('backbar-ready-count');
  const backbarAlmostCountEl = document.getElementById('backbar-almost-count');
  const backbarPantryToggleBtn = document.getElementById('backbar-pantry-toggle-btn');
  const backbarModeToggleBtn = document.getElementById('backbar-mode-toggle-btn');
  const backbarClearBtn = document.getElementById('backbar-clear-btn');

  let activeHost = 'all';
  let activeSpirit = 'all';
  let activeProv = 'all';
  const bypassed404For = new Set<string>();

  const ingredientCatalog = new Map<string, CatalogIngredient>();
  const cardIngredientMap = new Map<string, CardIngredientInfo>();
  const cardSearchMap = new Map<string, string>();
  const selectedBackbarSpirits = new Set<string>();
  const selectedBackbarModifiers = new Set<string>();
  const selectedBackbarPantry = new Set<string>();
  let backbarMatchMode: BackbarMatchMode = 'smart';
  let backbarPantryCollapsed = false;
  let totalVaultCocktails = 0;
  let lastLuckyCardId: string | null = null;
  let luckyScrollToken = 0;

  function updateVaultCounts(): void {
    totalVaultCocktails = document.querySelectorAll('.vault-card:not(.vault-missing-card)').length;
    const totalMissingCards = document.querySelectorAll('.vault-card.vault-missing-card').length;
    const totalVaultSessions = document.querySelectorAll('.archive-session').length;

    const navVaultLabelEl = document.getElementById('nav-vault-label');
    if (navVaultLabelEl) {
      navVaultLabelEl.textContent = `The Vault (${totalVaultCocktails} Cocktails)`;
    }
    if (navVaultBtn) {
      navVaultBtn.title = `Explore the full ${totalVaultCocktails}-cocktail Cellar Vault`;
    }
    const vaultCountHeadingEl = document.getElementById('vault-count-heading');
    if (vaultCountHeadingEl) {
      vaultCountHeadingEl.textContent = `${totalVaultCocktails} Cocktails`;
    }
    const vaultSessionCountEl = document.getElementById('vault-session-count');
    if (vaultSessionCountEl) {
      vaultSessionCountEl.textContent = String(totalVaultSessions);
    }
    if (searchInput) {
      searchInput.placeholder = `Search ${totalVaultCocktails} cocktails, spirits, ingredients, hosts, or try "Doug" / "Quinn"...`;
    }
    const footerCocktailEl = document.getElementById('footer-cocktail-count');
    if (footerCocktailEl) {
      footerCocktailEl.textContent = String(totalVaultCocktails);
    }
    const footerSessionEl = document.getElementById('footer-session-count');
    if (footerSessionEl) {
      footerSessionEl.textContent = String(totalVaultSessions);
    }
    if (archiveCountEl?.getAttribute('data-filtered') === null) {
      const missingSuffix =
        totalMissingCards > 0 ? ` (+ ${totalMissingCards} missing cold cases)` : '';
      archiveCountEl.textContent = `Showing all ${totalVaultCocktails} cocktails across ${totalVaultSessions} sessions${missingSuffix}`;
    }
  }

  function buildCardSearchIndex(): void {
    cardSearchMap.clear();
    for (const card of document.querySelectorAll('.vault-card')) {
      const title = card.querySelector('.card-title')?.textContent ?? '';
      const story = card.querySelector('.card-story')?.textContent ?? '';
      const hostAttr = card.getAttribute('data-host') ?? '';
      const hostEyebrow =
        card.querySelector('.course-eyebrow > span:first-child')?.textContent ?? '';
      const sessionTitle =
        card.closest('.archive-session')?.querySelector('.session-title')?.textContent ?? '';
      const specText = Array.from(card.querySelectorAll('.spec-list .spec-item .spec-name'))
        .map((el) => el.textContent)
        .join(' ');
      const glassware = card.querySelector('.glassware-badge')?.textContent ?? '';
      const combined = [title, story, hostAttr, hostEyebrow, sessionTitle, specText, glassware]
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
      cardSearchMap.set(card.id, combined);
    }
  }

  function classifySpecIngredient(
    li: Element
  ): CatalogIngredient | { id: '_optional'; shelf: 'optional' } {
    if (li.classList.contains('spec-garnish') || li.getAttribute('data-optional') === 'true') {
      return { id: '_optional', shelf: 'optional' };
    }
    const explicitId = li.getAttribute('data-ing');
    if (explicitId) {
      const explicitEntry = ingredientCatalog.get(explicitId);
      if (explicitEntry) return explicitEntry;
    }

    const cleanName = getCleanSpecName(li);
    if (!cleanName) return { id: '_optional', shelf: 'optional' };
    const low = cleanName.toLowerCase();

    for (const rule of CANONICAL_INGREDIENT_RULES) {
      for (const kw of rule.keywords) {
        const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const pattern = new RegExp(`\\b${escaped}\\b`, 'i');
        if (pattern.test(low)) {
          return (
            ingredientCatalog.get(rule.id) ?? {
              ...rule,
              recipeIds: new Set<string>()
            }
          );
        }
      }
    }

    const slug = `auto_${low.replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')}`;
    const existingAuto = ingredientCatalog.get(slug);
    if (existingAuto) return existingAuto;

    const inferredShelf: BackbarShelf = /\b(syrup|juice|soda|bitters|cordial)\b/i.test(low)
      ? 'pantry'
      : 'modifiers';
    const explicitShelf = parseExplicitShelf(li.getAttribute('data-shelf')) ?? inferredShelf;
    const autoRule: CatalogIngredient = {
      id: slug,
      shelf: explicitShelf,
      label: `🍾 ${cleanName}`,
      shortLabel: cleanName,
      isAutoDiscovered: true,
      recipeIds: new Set<string>()
    };
    ingredientCatalog.set(slug, autoRule);
    return autoRule;
  }

  function isBackbarIngredientOnHand(id: string): boolean {
    return (
      selectedBackbarSpirits.has(id) ||
      selectedBackbarModifiers.has(id) ||
      selectedBackbarPantry.has(id)
    );
  }

  function renderMatchingChips(
    idsSet: ReadonlySet<string>,
    selectedSet: ReadonlySet<string>,
    unlockMap: ReadonlyMap<string, number>,
    totalMap: ReadonlyMap<string, number>,
    dataAttr: string
  ): { count: number; html: string } {
    const list = Array.from(idsSet)
      .map((id) => ingredientCatalog.get(id))
      .filter((item): item is CatalogIngredient => item !== undefined)
      .sort((a, b) => {
        const aSel = selectedSet.has(a.id) ? 1 : 0;
        const bSel = selectedSet.has(b.id) ? 1 : 0;
        if (aSel !== bSel) return bSel - aSel;
        const aReady = unlockMap.get(a.id) ?? 0;
        const bReady = unlockMap.get(b.id) ?? 0;
        if (aReady !== bReady) return bReady - aReady;
        return (totalMap.get(b.id) ?? 0) - (totalMap.get(a.id) ?? 0);
      });

    return {
      count: list.length,
      html: list
        .map((item) => {
          const isSelected = selectedSet.has(item.id);
          const readyUnlock = unlockMap.get(item.id) ?? 0;
          const candCount = totalMap.get(item.id) ?? 0;
          let badgeText = `${candCount}`;
          let extraClass = '';
          if (isSelected) {
            badgeText = '✓';
          } else if (readyUnlock > 0) {
            badgeText = `+${readyUnlock} Ready!`;
            extraClass = 'is-unlock-suggestion is-ready-unlock';
          } else if (candCount > 0) {
            badgeText = `+${candCount} drink${candCount > 1 ? 's' : ''}`;
            extraClass = 'is-unlock-suggestion';
          }
          return `
            <button type="button" class="backbar-chip ${extraClass}" ${dataAttr}="${escapeMarkup(item.id)}" aria-pressed="${isSelected}">
              <span>${escapeMarkup(item.label)}</span>
              <span class="backbar-chip-badge">${escapeMarkup(badgeText)}</span>
            </button>
          `;
        })
        .join('')
    };
  }

  function renderBackbarShelves(): void {
    if (!backbarSpiritsChips || !backbarModifiersChips || !backbarPantryChips) return;

    const spiritsList = Array.from(ingredientCatalog.values())
      .filter((item) => item.shelf === 'spirits' && item.recipeIds.size > 0)
      .sort((a, b) => b.recipeIds.size - a.recipeIds.size);

    backbarSpiritsChips.innerHTML = spiritsList
      .map((sp) => {
        const isSelected = selectedBackbarSpirits.has(sp.id);
        const countText = isSelected ? `✓ ${sp.recipeIds.size}` : `${sp.recipeIds.size}`;
        return `
          <button type="button" class="backbar-chip" data-backbar-spirit="${escapeMarkup(sp.id)}" aria-pressed="${isSelected}">
            <span>${escapeMarkup(sp.label)}</span>
            <span class="backbar-chip-badge">${escapeMarkup(countText)}</span>
          </button>
        `;
      })
      .join('');

    if (selectedBackbarSpirits.size === 0) {
      if (backbarStepModifiers) backbarStepModifiers.hidden = true;
      if (backbarStepPantry) backbarStepPantry.hidden = true;
      if (backbarFooter) backbarFooter.hidden = true;
      if (backbarSpiritsHint) {
        backbarSpiritsHint.textContent = 'Select 1 or more spirits to reveal matching liqueurs ➔';
      }
      return;
    }

    if (backbarStepModifiers) backbarStepModifiers.hidden = false;
    if (backbarStepPantry) backbarStepPantry.hidden = backbarPantryCollapsed;
    if (backbarFooter) backbarFooter.hidden = false;

    const candidateCards: { readonly cardId: string; readonly info: CardIngredientInfo }[] = [];
    for (const [cardId, info] of cardIngredientMap.entries()) {
      const usesSelectedSpirit = Array.from(info.spiritIds).some((sid) =>
        selectedBackbarSpirits.has(sid)
      );
      if (usesSelectedSpirit) candidateCards.push({ cardId, info });
    }

    const selectedSpiritNames = Array.from(selectedBackbarSpirits)
      .map((sid) => ingredientCatalog.get(sid)?.shortLabel ?? sid)
      .join(' + ');

    if (backbarSpiritsHint) {
      backbarSpiritsHint.textContent = `${selectedBackbarSpirits.size} spirit${selectedBackbarSpirits.size > 1 ? 's' : ''} selected · ${candidateCards.length} candidate cocktail${candidateCards.length === 1 ? '' : 's'}`;
    }
    if (backbarModifiersTitle) {
      backbarModifiersTitle.textContent = `Matching Liqueurs, Vermouth & Amari for ${selectedSpiritNames}`;
    }

    const relevantModIds = new Set(selectedBackbarModifiers);
    const modUnlockReadyCount = new Map<string, number>();
    const modTotalCandidateCount = new Map<string, number>();
    const relevantPantryIds = new Set(selectedBackbarPantry);
    const pantryUnlockReadyCount = new Map<string, number>();
    const pantryTotalCandidateCount = new Map<string, number>();

    for (const { info } of candidateCards) {
      for (const mid of info.modifierIds) {
        relevantModIds.add(mid);
        modTotalCandidateCount.set(mid, (modTotalCandidateCount.get(mid) ?? 0) + 1);
      }
      for (const pid of info.pantryIds) {
        relevantPantryIds.add(pid);
        pantryTotalCandidateCount.set(pid, (pantryTotalCandidateCount.get(pid) ?? 0) + 1);
      }
      const missingAll = info.requiredIds.filter((reqId) => !isBackbarIngredientOnHand(reqId));
      const [onlyMissingId] = missingAll;
      if (missingAll.length === 1 && onlyMissingId !== undefined) {
        if (info.modifierIds.has(onlyMissingId)) {
          modUnlockReadyCount.set(onlyMissingId, (modUnlockReadyCount.get(onlyMissingId) ?? 0) + 1);
        } else if (info.pantryIds.has(onlyMissingId)) {
          pantryUnlockReadyCount.set(
            onlyMissingId,
            (pantryUnlockReadyCount.get(onlyMissingId) ?? 0) + 1
          );
        }
      }
    }

    const modifiersRendered = renderMatchingChips(
      relevantModIds,
      selectedBackbarModifiers,
      modUnlockReadyCount,
      modTotalCandidateCount,
      'data-backbar-modifier'
    );

    if (modifiersRendered.count === 0) {
      backbarModifiersChips.innerHTML =
        '<span style="font-family: var(--font-mono); font-size: 0.74rem; color: #86efac;">✓ No extra liqueurs required — select any citrus, syrups, or mixers below.</span>';
    } else {
      backbarModifiersChips.innerHTML = modifiersRendered.html;
    }

    const pantryRendered = renderMatchingChips(
      relevantPantryIds,
      selectedBackbarPantry,
      pantryUnlockReadyCount,
      pantryTotalCandidateCount,
      'data-backbar-pantry'
    );

    if (pantryRendered.count === 0) {
      backbarPantryChips.innerHTML =
        '<span style="font-family: var(--font-mono); font-size: 0.74rem; color: #86efac;">✓ No citrus, syrups, or mixers needed for these recipes!</span>';
    } else {
      backbarPantryChips.innerHTML = pantryRendered.html;
    }

    if (backbarPantryToggleBtn && backbarStepPantry) {
      const isOpen = !backbarStepPantry.hidden;
      backbarPantryToggleBtn.setAttribute('aria-expanded', String(isOpen));
      backbarPantryToggleBtn.textContent = `Pantry & Mixers (${selectedBackbarPantry.size}/${pantryRendered.count}) ${isOpen ? '▴' : '▾'}`;
    }
  }

  function indexVaultIngredients(): void {
    ingredientCatalog.clear();
    cardIngredientMap.clear();

    for (const rule of CANONICAL_INGREDIENT_RULES) {
      if (rule.shelf === 'optional') continue;
      ingredientCatalog.set(rule.id, {
        ...rule,
        recipeIds: new Set<string>()
      });
    }

    for (const card of document.querySelectorAll('.vault-card:not(.vault-missing-card)')) {
      const spiritIds = new Set<string>();
      const modifierIds = new Set<string>();
      const pantryIds = new Set<string>();

      for (const li of card.querySelectorAll('.spec-list .spec-item')) {
        const matched = classifySpecIngredient(li);
        if (matched.shelf === 'optional') continue;
        const entry = ingredientCatalog.get(matched.id);
        if (entry) entry.recipeIds.add(card.id);

        if (matched.shelf === 'spirits') spiritIds.add(matched.id);
        else if (matched.shelf === 'modifiers') modifierIds.add(matched.id);
        else pantryIds.add(matched.id);
      }

      const requiredIds = [...spiritIds, ...modifierIds, ...pantryIds];
      cardIngredientMap.set(card.id, {
        spiritIds,
        modifierIds,
        pantryIds,
        requiredIds
      });
    }

    updateVaultCounts();
    buildCardSearchIndex();
    renderBackbarShelves();
  }

  function applyArchiveFilters(): void {
    const q = (searchInput ? searchInput.value : '').trim().toLowerCase();

    const isDougTrigger = (activeHost === 'doug' || q === 'doug') && !bypassed404For.has('doug');
    const isQuinnTrigger =
      (activeHost === 'quinn' || q === 'quinn') && !bypassed404For.has('quinn');

    if (isDougTrigger || isQuinnTrigger) {
      const who = isQuinnTrigger ? 'Quinn (and Doug)' : 'Doug';
      if (culpritEl) culpritEl.textContent = who;
      if (box404) box404.classList.add('is-visible');
      if (archiveSessionsContainer) archiveSessionsContainer.style.display = 'none';
      if (archiveCountEl) {
        archiveCountEl.textContent = `ERROR 404: Recipe sector corrupted for ${who} — click Bypass below to recover surviving evidence`;
      }
      return;
    }

    if (box404) box404.classList.remove('is-visible');
    if (archiveSessionsContainer) archiveSessionsContainer.style.display = '';

    const isBackbarActive = selectedBackbarSpirits.size > 0;
    let visibleCocktails = 0;
    let visibleMissing = 0;
    let readyCount = 0;
    let almostCount = 0;

    const backbarCardEval = new Map<string, CardMatchEval>();
    if (isBackbarActive) {
      for (const card of document.querySelectorAll('.vault-card:not(.vault-missing-card)')) {
        const info = cardIngredientMap.get(card.id);
        if (!info) continue;
        const hasSelectedSpirit = Array.from(info.spiritIds).some((sid) =>
          selectedBackbarSpirits.has(sid)
        );
        if (!hasSelectedSpirit) {
          backbarCardEval.set(card.id, { matchesSpirit: false });
          continue;
        }
        const missingIds = info.requiredIds.filter((reqId) => !isBackbarIngredientOnHand(reqId));
        const status =
          missingIds.length === 0 ? 'ready' : missingIds.length === 1 ? 'almost' : 'partial';
        if (status === 'ready') readyCount++;
        else if (status === 'almost') almostCount++;
        backbarCardEval.set(card.id, {
          matchesSpirit: true,
          status,
          missingIds,
          totalReq: info.requiredIds.length
        });
      }
    }

    for (const card of document.querySelectorAll<HTMLElement>('.vault-card')) {
      const cardHost = (card.getAttribute('data-host') ?? '').toLowerCase();
      const cardSpirit = (card.getAttribute('data-spirit') ?? '').toLowerCase().split(/\s+/);
      const cardProv = (card.getAttribute('data-provenance') ?? '').toLowerCase();
      const isMissingCard = card.classList.contains('vault-missing-card');

      const hostMatch = activeHost === 'all' || cardHost === activeHost;
      const spiritMatch = activeSpirit === 'all' || cardSpirit.includes(activeSpirit);
      const provMatch = activeProv === 'all' || cardProv === activeProv;
      const searchableText = cardSearchMap.get(card.id) ?? '';
      const textMatch = !q || searchableText.includes(q);

      let backbarMatch = true;
      const existingRibbon = card.querySelector('.card-match-ribbon');
      if (existingRibbon) existingRibbon.remove();

      if (isBackbarActive) {
        if (isMissingCard) {
          backbarMatch = false;
        } else {
          const evalInfo = backbarCardEval.get(card.id);
          if (!evalInfo?.matchesSpirit) {
            backbarMatch = false;
          } else {
            const effectiveSmart = backbarMatchMode === 'smart' && readyCount + almostCount > 0;
            backbarMatch = effectiveSmart
              ? evalInfo.status === 'ready' || evalInfo.status === 'almost'
              : true;

            if (backbarMatch) {
              const contentEl =
                card.querySelector('.card-body') ?? card.querySelector('.card-content') ?? card;
              const ribbon = document.createElement('div');
              if (evalInfo.status === 'ready') {
                ribbon.className = 'card-match-ribbon is-ready';
                ribbon.innerHTML = `<span>🟢 READY TO POUR (${evalInfo.totalReq}/${evalInfo.totalReq} ON HAND)</span><span>Garnish Optional</span>`;
              } else if (evalInfo.status === 'almost') {
                const missId = evalInfo.missingIds[0] ?? '';
                const missItem = ingredientCatalog.get(missId);
                const missLabel = missItem ? missItem.shortLabel : missId;
                ribbon.className = 'card-match-ribbon is-almost';
                ribbon.innerHTML = `
                  <span>🟡 MISSING 1 BOTTLE: ${escapeMarkup(missLabel.toUpperCase())}</span>
                  <button type="button" class="ribbon-add-btn" data-add-backbar-ing="${escapeMarkup(missId)}">+ Have It</button>
                `;
              } else {
                const missNames = evalInfo.missingIds
                  .map((id) => ingredientCatalog.get(id)?.shortLabel ?? id)
                  .join(', ');
                ribbon.className = 'card-match-ribbon is-partial';
                ribbon.innerHTML = `<span>⚪ MISSING ${evalInfo.missingIds.length}: ${escapeMarkup(missNames)}</span>`;
              }
              contentEl.insertBefore(ribbon, contentEl.firstChild);
            }
          }
        }
      }

      const show = hostMatch && spiritMatch && provMatch && textMatch && backbarMatch;
      card.hidden = !show;
      if (show) {
        if (isMissingCard) visibleMissing++;
        else visibleCocktails++;
      }
    }

    if (isBackbarActive) {
      if (backbarReadyCountEl) {
        backbarReadyCountEl.textContent = `🟢 ${readyCount} Ready to Pour Tonight`;
      }
      if (backbarAlmostCountEl) {
        backbarAlmostCountEl.textContent = `🟡 ${almostCount} Just 1 Bottle Away`;
      }
      const totalSelectedBottles = selectedBackbarSpirits.size + selectedBackbarModifiers.size;
      if (vaultMakerBtnLabel) {
        vaultMakerBtnLabel.textContent = `What Can I Make? (${totalSelectedBottles})`;
      }
      if (vaultLuckyBtnLabel) {
        const luckyPoolCount =
          readyCount > 0 ? readyCount : almostCount > 0 ? almostCount : visibleCocktails;
        vaultLuckyBtnLabel.textContent =
          luckyPoolCount > 0 ? `Roll From My Shelf (${luckyPoolCount})` : "I'm Feeling Lucky";
      }
    } else {
      if (vaultMakerBtnLabel) vaultMakerBtnLabel.textContent = 'What Can I Make?';
      if (vaultLuckyBtnLabel) vaultLuckyBtnLabel.textContent = "I'm Feeling Lucky";
    }

    for (const session of archiveSessions) {
      const anyVisible = session.querySelectorAll('.vault-card:not([hidden])').length > 0;
      session.hidden = !anyVisible;
    }

    if (archiveCountEl) {
      const isFiltered =
        isBackbarActive ||
        activeHost !== 'all' ||
        activeSpirit !== 'all' ||
        activeProv !== 'all' ||
        Boolean(q);
      if (isFiltered) {
        archiveCountEl.setAttribute('data-filtered', 'true');
      } else {
        archiveCountEl.removeAttribute('data-filtered');
      }
      if (isBackbarActive) {
        archiveCountEl.textContent = `What Can I Make: Showing ${visibleCocktails} matching cocktail${visibleCocktails === 1 ? '' : 's'} (${readyCount} Ready to Pour · ${almostCount} Just 1 Bottle Away)`;
      } else {
        const missingSuffix =
          visibleMissing > 0
            ? ` (+ ${visibleMissing} missing cold case${visibleMissing > 1 ? 's' : ''})`
            : '';
        archiveCountEl.textContent = `Showing ${visibleCocktails} of ${totalVaultCocktails} cocktails${missingSuffix}`;
      }
    }
  }

  function clearBackbarSelection(): void {
    selectedBackbarSpirits.clear();
    selectedBackbarModifiers.clear();
    selectedBackbarPantry.clear();
    backbarPantryCollapsed = false;
    renderBackbarShelves();
  }

  async function triggerFeelingLucky(): Promise<void> {
    const opId = ++luckyScrollToken;

    if (box404?.classList.contains('is-visible')) {
      bypassed404For.add('doug');
      bypassed404For.add('quinn');
      applyArchiveFilters();
    }

    if (state.currentPageView !== 'vault') {
      onRequestVaultView({ scroll: false, history: 'push' });
    }

    const allCurrentCards = Array.from(document.querySelectorAll<HTMLElement>('.vault-card'));
    let candidates = allCurrentCards.filter(
      (c) => !c.hidden && !c.classList.contains('vault-missing-card')
    );

    if (selectedBackbarSpirits.size > 0 && candidates.length > 0) {
      const readyCandidates = candidates.filter((c) =>
        c.querySelector('.card-match-ribbon.is-ready')
      );
      if (readyCandidates.length > 0) {
        candidates = readyCandidates;
      }
    }

    if (candidates.length === 0) {
      if (archiveCountEl) {
        archiveCountEl.textContent =
          'No drinks match your filters. Clear them to roll from the full vault.';
      }
      return;
    }

    let pool = candidates;
    if (candidates.length > 1 && lastLuckyCardId) {
      const withoutPrev = candidates.filter((c) => c.id !== lastLuckyCardId);
      if (withoutPrev.length > 0) pool = withoutPrev;
    }
    const pickedCard = pool[Math.floor(Math.random() * pool.length)];
    if (!pickedCard) return;
    lastLuckyCardId = pickedCard.id;

    for (const c of document.querySelectorAll('.is-lucky-pick')) {
      c.classList.remove('is-lucky-pick');
    }
    for (const b of document.querySelectorAll('.lucky-pick-badge')) {
      b.remove();
    }

    const parentSession = pickedCard.closest<HTMLElement>('.archive-session');
    if (parentSession) parentSession.hidden = false;
    pickedCard.hidden = false;
    mountVaultCardSpecDiagram(pickedCard);

    if (document.body.getAttribute('data-mode') === 'guest') {
      pickedCard.setAttribute('data-expanded', 'true');
      const toggleBtn = pickedCard.querySelector('.toggle-spec-btn');
      if (toggleBtn) {
        toggleBtn.setAttribute('aria-expanded', 'true');
        const toggleSpan = toggleBtn.querySelector('span');
        if (toggleSpan) toggleSpan.textContent = 'Hide Bartender Specs';
      }
    }

    for (const s of archiveSessions) {
      s.style.contentVisibility = 'visible';
    }

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    await scrollIntoViewAsync(pickedCard, {
      behavior: prefersReduced ? 'auto' : 'smooth',
      block: 'center'
    });

    if (opId !== luckyScrollToken) return;

    const initialRect = pickedCard.getBoundingClientRect();
    if (initialRect.top < 0 || initialRect.bottom > window.innerHeight) {
      pickedCard.scrollIntoView({ behavior: prefersReduced ? 'auto' : 'smooth', block: 'center' });
    }

    pickedCard.classList.add('is-lucky-pick');

    const cardVisual = pickedCard.querySelector('.card-visual');
    if (cardVisual) {
      const badge = document.createElement('div');
      badge.className = 'lucky-pick-badge';
      badge.setAttribute('aria-label', "Tonight's Lucky Pour");
      badge.innerHTML = `
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <rect width="18" height="18" x="3" y="3" rx="4" />
          <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" />
          <circle cx="15.5" cy="8.5" r="1.5" fill="currentColor" />
          <circle cx="8.5" cy="15.5" r="1.5" fill="currentColor" />
          <circle cx="15.5" cy="15.5" r="1.5" fill="currentColor" />
          <circle cx="12" cy="12" r="1.5" fill="currentColor" />
        </svg>
        <span>Tonight's Lucky Pour</span>
      `;
      cardVisual.appendChild(badge);
    }

    const drinkTitle = pickedCard.querySelector('.card-title')?.textContent ?? 'Cocktail';
    const sessionHeading = parentSession?.querySelector('.session-title')?.textContent ?? '';
    if (archiveCountEl) {
      archiveCountEl.textContent = '';
      archiveCountEl.append("🎲 I'm Feeling Lucky selected: ");
      const strong = document.createElement('strong');
      strong.textContent = drinkTitle.trim();
      archiveCountEl.appendChild(strong);
      if (sessionHeading.trim()) {
        archiveCountEl.append(` (${sessionHeading.trim()})`);
      }
    }

    const titleEl = pickedCard.querySelector<HTMLElement>('.card-title');
    if (titleEl) {
      titleEl.setAttribute('tabindex', '-1');
      titleEl.focus({ preventScroll: true });
    }
  }

  window.reindexVaultIngredients = indexVaultIngredients;

  if (bypass404Btn) {
    bypass404Btn.addEventListener('click', () => {
      bypassed404For.add('doug');
      bypassed404For.add('quinn');
      applyArchiveFilters();
    });
  }

  for (const btn of hostBtns) {
    btn.addEventListener('click', () => {
      activeHost = btn.getAttribute('data-filter-host') ?? 'all';
      if (activeHost === 'doug') bypassed404For.delete('doug');
      if (activeHost === 'quinn') bypassed404For.delete('quinn');
      for (const b of hostBtns) b.setAttribute('aria-pressed', String(b === btn));
      applyArchiveFilters();
    });
  }

  for (const btn of spiritBtns) {
    btn.addEventListener('click', () => {
      activeSpirit = btn.getAttribute('data-filter-spirit') ?? 'all';
      for (const b of spiritBtns) b.setAttribute('aria-pressed', String(b === btn));
      applyArchiveFilters();
    });
  }

  for (const btn of provBtns) {
    btn.addEventListener('click', () => {
      activeProv = btn.getAttribute('data-filter-provenance') ?? 'all';
      for (const b of provBtns) b.setAttribute('aria-pressed', String(b === btn));
      applyArchiveFilters();
    });
  }

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      const val = searchInput.value.trim().toLowerCase();
      if (val === 'doug') bypassed404For.delete('doug');
      if (val === 'quinn') bypassed404For.delete('quinn');
      applyArchiveFilters();
    });
  }

  for (const chip of quickChips) {
    chip.addEventListener('click', () => {
      const term = chip.getAttribute('data-quick-search') ?? '';
      if (searchInput) searchInput.value = term;
      if (term === 'doug') bypassed404For.delete('doug');
      if (term === 'quinn') bypassed404For.delete('quinn');
      applyArchiveFilters();
    });
  }

  if (vaultMakerBtn && backbarDrawer) {
    vaultMakerBtn.addEventListener('click', () => {
      const willOpen = backbarDrawer.hidden;
      backbarDrawer.hidden = !willOpen;
      vaultMakerBtn.setAttribute('aria-expanded', String(willOpen));
    });
  }

  if (backbarDrawer) {
    backbarDrawer.addEventListener('click', (e) => {
      if (!(e.target instanceof Element)) return;

      const spiritBtn = e.target.closest('[data-backbar-spirit]');
      if (spiritBtn) {
        const sid = spiritBtn.getAttribute('data-backbar-spirit');
        if (!sid) return;
        if (selectedBackbarSpirits.has(sid)) selectedBackbarSpirits.delete(sid);
        else selectedBackbarSpirits.add(sid);
        renderBackbarShelves();
        applyArchiveFilters();
        return;
      }

      const modBtn = e.target.closest('[data-backbar-modifier]');
      if (modBtn) {
        const mid = modBtn.getAttribute('data-backbar-modifier');
        if (!mid) return;
        if (selectedBackbarModifiers.has(mid)) selectedBackbarModifiers.delete(mid);
        else selectedBackbarModifiers.add(mid);
        renderBackbarShelves();
        applyArchiveFilters();
        return;
      }

      const panBtn = e.target.closest('[data-backbar-pantry]');
      if (panBtn) {
        const pid = panBtn.getAttribute('data-backbar-pantry');
        if (!pid) return;
        if (selectedBackbarPantry.has(pid)) selectedBackbarPantry.delete(pid);
        else selectedBackbarPantry.add(pid);
        renderBackbarShelves();
        applyArchiveFilters();
      }
    });
  }

  if (backbarPantryToggleBtn && backbarStepPantry) {
    backbarPantryToggleBtn.addEventListener('click', () => {
      backbarPantryCollapsed = !backbarPantryCollapsed;
      backbarStepPantry.hidden = backbarPantryCollapsed;
      backbarPantryToggleBtn.setAttribute('aria-expanded', String(!backbarPantryCollapsed));
      renderBackbarShelves();
    });
  }

  if (backbarModeToggleBtn) {
    backbarModeToggleBtn.addEventListener('click', () => {
      backbarMatchMode = backbarMatchMode === 'smart' ? 'any' : 'smart';
      backbarModeToggleBtn.setAttribute('data-match-mode', backbarMatchMode);
      backbarModeToggleBtn.classList.toggle('active', backbarMatchMode === 'smart');
      backbarModeToggleBtn.textContent =
        backbarMatchMode === 'smart' ? 'Mode: Ready + 1-Away' : 'Mode: All With Spirit';
      applyArchiveFilters();
    });
  }

  if (backbarClearBtn) {
    backbarClearBtn.addEventListener('click', () => {
      clearBackbarSelection();
      applyArchiveFilters();
    });
  }

  if (archiveSessionsContainer) {
    archiveSessionsContainer.addEventListener('click', (e) => {
      if (!(e.target instanceof Element)) return;
      const addBtn = e.target.closest('[data-add-backbar-ing]');
      if (!addBtn) return;
      const ingId = addBtn.getAttribute('data-add-backbar-ing');
      if (!ingId) return;
      const item = ingredientCatalog.get(ingId);
      if (!item) return;
      if (item.shelf === 'spirits') selectedBackbarSpirits.add(ingId);
      else if (item.shelf === 'modifiers') selectedBackbarModifiers.add(ingId);
      else if (item.shelf === 'pantry') selectedBackbarPantry.add(ingId);
      renderBackbarShelves();
      applyArchiveFilters();
    });
  }

  indexVaultIngredients();

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      activeHost = 'all';
      activeSpirit = 'all';
      activeProv = 'all';
      if (searchInput) searchInput.value = '';
      clearBackbarSelection();
      for (const b of hostBtns) {
        b.setAttribute('aria-pressed', String(b.getAttribute('data-filter-host') === 'all'));
      }
      for (const b of spiritBtns) {
        b.setAttribute('aria-pressed', String(b.getAttribute('data-filter-spirit') === 'all'));
      }
      for (const b of provBtns) {
        b.setAttribute('aria-pressed', String(b.getAttribute('data-filter-provenance') === 'all'));
      }
      applyArchiveFilters();
    });
  }

  const luckyBtns = [
    document.getElementById('vault-lucky-btn'),
    document.getElementById('vault-lucky-btn-secondary')
  ].filter((el): el is HTMLElement => el !== null);

  for (const btn of luckyBtns) {
    btn.addEventListener('click', () => {
      void triggerFeelingLucky();
    });
  }
}
