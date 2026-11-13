import type { AppState } from './types.ts';

const PLURAL_UNIT_MAP: ReadonlyMap<string, string> = new Map([
  ['dash', 'dashes'],
  ['dashes', 'dashes'],
  ['drop', 'drops'],
  ['drops', 'drops'],
  ['leaf', 'leaves'],
  ['splash', 'splashes'],
  ['tsp', 'tsp'],
  ['tbsp', 'tbsp'],
  ['ml', 'ml'],
  ['cup', 'cups'],
  ['cube', 'cubes'],
  ['slice', 'slices'],
  ['sprig', 'sprigs'],
  ['bean', 'beans'],
  ['piece', 'pieces'],
  ['spray', 'sprays'],
  ['can', 'cans'],
  ['bottle', 'bottles']
]);

/**
 * Formats a scaled quantity to at most two decimal places without trailing zeros.
 */
export function formatNumber(n: number): string {
  const rounded = Math.round(n * 100) / 100;
  return rounded.toString();
}

/**
 * Returns the singular or plural unit label appropriate for a scaled quantity.
 */
export function pluralizeUnit(unit: string | null, scaledVal: number): string {
  if (!unit) return '';
  if (scaledVal <= 1) {
    if (unit === 'dashes') return 'dash';
    if (unit === 'drops') return 'drop';
    return unit;
  }
  return PLURAL_UNIT_MAP.get(unit) ?? (unit.endsWith('s') ? unit : `${unit}s`);
}

/**
 * Rewrites scaled `.spec-measure` quantities and `.scale-indicator` labels inside `rootEl`.
 */
export function applyScaleToContainer(rootEl: Document | Element, scale: number): void {
  for (const el of rootEl.querySelectorAll('.scale-indicator')) {
    el.textContent = scale === 1 ? '1 SERVING' : `${scale} SERVINGS`;
  }

  for (const el of rootEl.querySelectorAll('.spec-measure[data-oz]')) {
    const rawOz = el.getAttribute('data-oz');
    const baseOz = rawOz !== null ? Number.parseFloat(rawOz) : Number.NaN;
    if (!Number.isFinite(baseOz)) continue;

    const isBarspoon = el.getAttribute('data-barspoon') === 'true';
    const isShort = el.getAttribute('data-short') === 'true';
    const scaledOz = formatNumber(baseOz * scale);
    if (isBarspoon) {
      const spoons = formatNumber(1 * scale);
      el.textContent = isShort
        ? `${spoons} bsp`
        : `${spoons} barspoon${scale > 1 ? 's' : ''} (${scaledOz} oz)`;
    } else {
      el.textContent = `${scaledOz} oz`;
    }
  }

  for (const el of rootEl.querySelectorAll('.spec-measure[data-count]')) {
    const rawCount = el.getAttribute('data-count');
    const baseCount = rawCount !== null ? Number.parseFloat(rawCount) : Number.NaN;
    if (!Number.isFinite(baseCount)) continue;

    const unit = el.getAttribute('data-unit');
    const scaled = formatNumber(baseCount * scale);
    el.textContent = `${scaled} ${pluralizeUnit(unit, baseCount * scale)}`;
  }
}

/**
 * Binds batch scaling controls (1x–6x) and guest-mode card spec accordions.
 */
export function initScalingAndAccordions(
  state: AppState,
  onExpandVaultCard: (card: Element) => void
): void {
  const cardToggleBtns = document.querySelectorAll<HTMLButtonElement>('.toggle-spec-btn');
  for (const btn of cardToggleBtns) {
    btn.addEventListener('click', () => {
      const card = btn.closest('.cocktail-card');
      if (!card) return;
      if (card.classList.contains('vault-card')) {
        onExpandVaultCard(card);
      }
      const expanded = card.getAttribute('data-expanded') === 'true';
      const nextState = !expanded;
      card.setAttribute('data-expanded', String(nextState));
      btn.setAttribute('aria-expanded', String(nextState));
      const labelSpan = btn.querySelector('span');
      if (labelSpan) {
        labelSpan.textContent = nextState
          ? 'Hide Bartender Specs'
          : 'Show Bartender Specs & Recipe';
      }
    });
  }

  const scaleBtns = document.querySelectorAll<HTMLButtonElement>('.scale-btn');
  for (const btn of scaleBtns) {
    btn.addEventListener('click', () => {
      const parsed = Number.parseFloat(btn.getAttribute('data-scale') ?? '1');
      state.currentScale = Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
      for (const b of scaleBtns) {
        b.setAttribute(
          'aria-pressed',
          String(b.getAttribute('data-scale') === String(state.currentScale))
        );
      }
      applyScaleToContainer(document, state.currentScale);
    });
  }
}
