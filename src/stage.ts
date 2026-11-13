import { escapeMarkup, getCleanSpecName } from './dom-utils.ts';
import { applyScaleToContainer, formatNumber, pluralizeUnit } from './scaler.ts';
import { attachSpecViewToggle, buildCocktailSpecSvg } from './svg-diagram.ts';
import type { AppState } from './types.ts';

const HOST_ROTATION = ['Doug', 'Brian', 'Matt', 'Jason', 'Quinn'] as const;

let currentFeaturedHost = 'Doug';

/**
 * Injects the "↑ Feature This Session" button into each Vault session banner once on boot.
 */
export function initFeatureSessionBanners(): void {
  for (const sec of document.querySelectorAll('.archive-session')) {
    const banner = sec.querySelector('.session-banner');
    if (banner && !banner.querySelector('.stage-this-session-btn')) {
      const children = Array.from(banner.children);
      const copyWrap = document.createElement('div');
      copyWrap.className = 'session-banner-copy';
      for (const ch of children) {
        copyWrap.appendChild(ch);
      }
      banner.appendChild(copyWrap);

      const stageBtn = document.createElement('button');
      stageBtn.type = 'button';
      stageBtn.className = 'stage-this-session-btn';
      stageBtn.setAttribute('data-trigger-stage', sec.id);
      stageBtn.textContent = '↑ Feature This Session';
      banner.appendChild(stageBtn);
    }
  }
}

/**
 * Synchronizes the cyclical host rotation tracker dropdown and "UP NEXT" badge.
 */
export function updateHostRotation(hostText?: string): void {
  if (hostText) currentFeaturedHost = hostText;
  const norm = currentFeaturedHost.toLowerCase();
  let currentIdx = HOST_ROTATION.findIndex((host) => norm.includes(host.toLowerCase()));
  if (currentIdx === -1) {
    currentIdx = 0;
  }
  const nextIdx = (currentIdx + 1) % HOST_ROTATION.length;
  const nextHost = HOST_ROTATION[nextIdx] ?? 'Doug';

  const upNextNameEl = document.getElementById('up-next-name');
  if (upNextNameEl) {
    upNextNameEl.textContent = nextHost.toUpperCase();
  }

  const stepsList = document.getElementById('rotation-steps-list');
  if (stepsList) {
    stepsList.innerHTML = HOST_ROTATION.map((name, i) => {
      const isCurrent = i === currentIdx;
      const isNext = i === nextIdx;
      let rowClass = 'rotation-step-row';
      let tagHtml = '';
      if (isCurrent) {
        rowClass += ' is-current';
        tagHtml = '<span class="step-tag">CURRENT HOST</span>';
      } else if (isNext) {
        rowClass += ' is-next';
        tagHtml = '<span class="step-tag">UP NEXT</span>';
      }
      return `
        <li class="${rowClass}">
          <div class="step-left">
            <span class="step-idx">${i + 1}.</span>
            <span class="step-name">${escapeMarkup(name)}</span>
          </div>
          ${tagHtml}
        </li>
      `;
    }).join('');
  }
}

function toggleRotationDropdown(
  upNextBtn: HTMLElement,
  rotationDropdown: HTMLElement,
  show?: boolean
): void {
  const willShow = show ?? Boolean(rotationDropdown.hidden);
  if (willShow) {
    const list = document.getElementById('rotation-steps-list');
    if (!list || list.children.length === 0) {
      updateHostRotation(currentFeaturedHost);
    }
  }
  rotationDropdown.hidden = !willShow;
  upNextBtn.setAttribute('aria-expanded', String(willShow));
  upNextBtn.classList.toggle('is-open', willShow);
}

/**
 * Wires the header "UP NEXT" host rotation popover menu and light-dismiss listeners.
 */
export function initHostRotationDropdown(): void {
  const upNextBtn = document.getElementById('up-next-btn');
  const rotationDropdown = document.getElementById('rotation-dropdown');
  if (!upNextBtn || !rotationDropdown) return;

  upNextBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleRotationDropdown(upNextBtn, rotationDropdown);
  });

  document.addEventListener('click', (e) => {
    const target = e.target;
    if (
      !rotationDropdown.hidden &&
      target instanceof Node &&
      !rotationDropdown.contains(target) &&
      target !== upNextBtn &&
      !upNextBtn.contains(target)
    ) {
      toggleRotationDropdown(upNextBtn, rotationDropdown, false);
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !rotationDropdown.hidden) {
      toggleRotationDropdown(upNextBtn, rotationDropdown, false);
      upNextBtn.focus();
    }
  });

  updateHostRotation('Doug');
}

/**
 * Populates the Active Tasting Stage split cards and Bartender Prep & Batching Ledger
 * for the requested session ID.
 */
export function renderActiveStageSession(
  sessionId: string,
  state: AppState,
  scrollStageIntoView = false
): void {
  const sessionEl = document.getElementById(sessionId);
  if (!sessionEl) return;

  for (const pill of document.querySelectorAll('.scrubber-pill[data-stage-session]')) {
    const isMatch = pill.getAttribute('data-stage-session') === sessionId;
    pill.setAttribute('aria-pressed', String(isMatch));
  }

  const stageKickerEl = document.getElementById('stage-kicker');
  const stageSessionNameEl = document.getElementById('stage-session-name');
  const stageSessionDescEl = document.getElementById('stage-session-desc');
  const stageJumpLinkEl = document.getElementById('stage-jump-session-link');
  const stageCardsGridEl = document.getElementById('stage-cards-grid');
  const prepLedgerTbodyEl = document.getElementById('prep-ledger-tbody');
  const prepSessionLabelEl = document.getElementById('prep-session-label');

  const dateText = (sessionEl.querySelector('.session-date')?.textContent ?? '').trim();
  const hostText = (sessionEl.querySelector('.session-host')?.textContent ?? '').trim();
  const titleText = (sessionEl.querySelector('.session-title')?.textContent ?? '').trim();
  const descText = (sessionEl.querySelector('.session-desc')?.textContent ?? '').trim();

  if (stageKickerEl) stageKickerEl.textContent = `${dateText} // ${hostText}`;
  if (stageSessionNameEl) stageSessionNameEl.textContent = titleText;
  if (stageSessionDescEl) stageSessionDescEl.textContent = descText;
  if (stageJumpLinkEl) stageJumpLinkEl.setAttribute('href', `#${sessionId}`);
  if (prepSessionLabelEl) {
    const servingText = state.currentScale === 1 ? '1 SERVING' : `${state.currentScale} SERVINGS`;
    prepSessionLabelEl.innerHTML = `${escapeMarkup(titleText.toUpperCase())} · BATCH LEDGER · <span class="scale-indicator">${servingText}</span>`;
  }

  updateHostRotation(hostText);

  const cards = Array.from(sessionEl.querySelectorAll('.vault-card:not(.vault-missing-card)'));

  if (stageCardsGridEl) {
    stageCardsGridEl.innerHTML = '';
    cards.forEach((card, idx) => {
      const cardId = card.id;
      const imgEl = card.querySelector('.card-visual img');
      const imgSrc = imgEl?.getAttribute('src') ?? '';
      const imgAlt = imgEl?.getAttribute('alt') ?? '';
      const drinkTitle = (card.querySelector('.card-title')?.textContent ?? '').trim();
      const eyebrowSpans = card.querySelectorAll('.course-eyebrow span');
      const secondEyebrow = eyebrowSpans[1];
      const techniqueText = secondEyebrow ? secondEyebrow.textContent.trim() : 'CRAFT BUILD';
      const glasswareText = (
        card.querySelector('.glassware-badge span')?.textContent ?? 'Cocktail glass'
      ).trim();

      const specItems = Array.from(card.querySelectorAll('.spec-list .spec-item'));
      const liquidSpecs = specItems
        .filter((li) => !li.classList.contains('spec-garnish'))
        .slice(0, 5);
      const garnishSpec = specItems.find((li) => li.classList.contains('spec-garnish'));

      const specListHtml = liquidSpecs
        .map((li) => {
          const measureEl = li.querySelector('.spec-measure');
          let measureText = '';
          if (measureEl) {
            const rawOz = measureEl.getAttribute('data-oz');
            const baseOz = rawOz !== null ? Number.parseFloat(rawOz) : Number.NaN;
            const isBarspoon = measureEl.getAttribute('data-barspoon') === 'true';
            const rawCount = measureEl.getAttribute('data-count');
            const baseCount = rawCount !== null ? Number.parseFloat(rawCount) : Number.NaN;
            const unit = measureEl.getAttribute('data-unit');
            if (Number.isFinite(baseOz)) {
              measureText = isBarspoon ? '1 barspoon (0.125 oz)' : `${formatNumber(baseOz)} oz`;
            } else if (Number.isFinite(baseCount) && unit) {
              measureText = `${formatNumber(baseCount)} ${pluralizeUnit(unit, baseCount)}`;
            } else {
              measureText = measureEl.textContent.trim();
            }
          }
          const cleanName = getCleanSpecName(li);
          return `<li><span class="stage-oz stage-ref-measure">${escapeMarkup(measureText)}</span><span>${escapeMarkup(cleanName)}</span></li>`;
        })
        .join('');

      const garnishText = garnishSpec
        ? (garnishSpec.querySelector('.spec-name')?.textContent ?? '').trim()
        : (card.querySelector('.garnish-item')?.textContent ?? '')
            .replace(/^Garnish:\s*/i, '')
            .trim();

      const guestItems = Array.from(
        card.querySelectorAll('.guest-ingredients li:not(.garnish-item)')
      )
        .slice(0, 5)
        .map(
          (li) =>
            `<li><span class="stage-oz">•</span><span>${escapeMarkup(li.textContent.trim())}</span></li>`
        )
        .join('');

      const chipsText = Array.from(card.querySelectorAll('.tasting-chip'))
        .slice(0, 3)
        .map((c) => c.textContent.trim())
        .join(' · ');

      const stageSpecSvg = buildCocktailSpecSvg(card, `stage-${idx}`, true);

      const splitCard = document.createElement('article');
      splitCard.className = 'stage-split-card';
      splitCard.innerHTML = `
        <div class="stage-card-photo">
          <img src="${escapeMarkup(imgSrc)}" alt="${escapeMarkup(imgAlt)}" loading="${idx < 3 ? 'eager' : 'lazy'}">
          <div class="stage-photo-shade"></div>
          <div class="spec-diagram-wrap">${stageSpecSvg}</div>
          <div class="stage-photo-caption">
            <span class="stage-course-badge">POUR 0${idx + 1} // ${escapeMarkup(techniqueText)}</span>
            <h2 class="stage-drink-title">${escapeMarkup(drinkTitle)}</h2>
          </div>
        </div>
        <div class="stage-card-pane">
          <div class="stage-guest-pane-content">
            <div class="stage-pane-header">
              <h3 class="stage-pane-title">Elements in Glass</h3>
              <span class="stage-pane-sub">${escapeMarkup(chipsText || 'Tasting Notes')}</span>
            </div>
            <ul class="stage-spec-lines">
              ${guestItems}
            </ul>
          </div>
          <div class="stage-bartender-pane-content">
            <div class="stage-pane-header">
              <h3 class="stage-pane-title">Bartender Spec</h3>
              <span class="stage-pane-sub">Single-Drink Reference Spec</span>
            </div>
            <ul class="stage-spec-lines">
              ${specListHtml}
            </ul>
          </div>
          <div>
            ${garnishText ? `<div class="stage-garnish-line">Garnish: ${escapeMarkup(garnishText)}</div>` : ''}
            <div class="stage-card-footer">
              <span style="font-family: var(--font-mono); font-size: 0.66rem; color: var(--text-slate);">${escapeMarkup(glasswareText)}</span>
              <a href="#${escapeMarkup(cardId)}" class="stage-jump-btn">Full Recipe ↓</a>
            </div>
          </div>
        </div>
      `;
      const stagePhotoEl = splitCard.querySelector('.stage-card-photo');
      if (stagePhotoEl) attachSpecViewToggle(stagePhotoEl);
      stageCardsGridEl.appendChild(splitCard);
    });
  }

  if (prepLedgerTbodyEl) {
    prepLedgerTbodyEl.innerHTML = '';
    for (const card of cards) {
      const drinkTitle = (card.querySelector('.card-title')?.textContent ?? '').trim();
      const glasswareText = (
        card.querySelector('.glassware-badge span')?.textContent ?? 'Cocktail glass'
      ).trim();
      const eyebrowSpans = card.querySelectorAll('.course-eyebrow span');
      const secondEyebrow = eyebrowSpans[1];
      const techniqueText = secondEyebrow ? secondEyebrow.textContent.trim() : 'Craft Build';

      const specItems = Array.from(card.querySelectorAll('.spec-list .spec-item'));
      const liquidSpecs = specItems.filter((li) => !li.classList.contains('spec-garnish'));
      const garnishSpec = specItems.find((li) => li.classList.contains('spec-garnish'));

      const buildLinesHtml = liquidSpecs
        .map((li) => {
          const measureEl = li.querySelector('.spec-measure');
          const cleanName = getCleanSpecName(li);
          let measureHtml = '';
          if (measureEl) {
            const cloneMeasure = measureEl.cloneNode(true);
            if (cloneMeasure instanceof Element) {
              cloneMeasure.className = 'spec-measure prep-measure';
              measureHtml = cloneMeasure.outerHTML;
            }
          }
          return `<li class="prep-build-item">${measureHtml}<span class="prep-ingredient-name">${escapeMarkup(cleanName)}</span></li>`;
        })
        .join('');

      const garnishText = garnishSpec
        ? (garnishSpec.querySelector('.spec-name')?.textContent ?? '').trim()
        : '';
      const chips = Array.from(card.querySelectorAll('.tasting-chip'))
        .map((c) => c.textContent.trim())
        .join(', ');

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="prep-cocktail-name"><a href="#${escapeMarkup(card.id)}" style="color: inherit; text-decoration: none;">${escapeMarkup(drinkTitle)}</a></td>
        <td style="color: var(--text-mist); font-size: 0.84rem;">${escapeMarkup(glasswareText)}</td>
        <td><ul class="prep-build-list">${buildLinesHtml}</ul></td>
        <td style="font-size: 0.82rem; color: var(--text-mist);">${garnishText ? `<strong>Garnish:</strong> ${escapeMarkup(garnishText)}<br>` : ''}<span style="color: var(--text-slate);">${escapeMarkup(chips)}</span></td>
        <td><span class="technique-badge">${escapeMarkup(techniqueText)}</span></td>
      `;
      prepLedgerTbodyEl.appendChild(tr);
    }

    const prepSummaryEl = document.getElementById('prep-summary') ?? prepLedgerTbodyEl;
    applyScaleToContainer(prepSummaryEl, state.currentScale);
  }

  if (scrollStageIntoView) {
    document
      .getElementById('active-tasting-stage')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
