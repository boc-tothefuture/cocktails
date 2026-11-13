import { scrollIntoViewAsync } from './dom-utils.ts';
import { parseHash } from './route.ts';
import { initScalingAndAccordions } from './scaler.ts';
import {
  initFeatureSessionBanners,
  initHostRotationDropdown,
  renderActiveStageSession
} from './stage.ts';
import { initLazyVaultDiagrams, mountVaultCardSpecDiagram } from './svg-diagram.ts';
import type {
  AppState,
  HashRouteInfo,
  HistoryMode,
  PageView,
  PageViewOptions,
  ViewMode
} from './types.ts';
import { initVaultAndBackbar } from './vault-matcher.ts';

/**
 * Session ids pinned in the top timeline, read from the scrubber markup (newest first).
 * The first one doubles as the default landing session.
 */
const TOP_SESSION_IDS: readonly string[] = Array.from(
  document.querySelectorAll<HTMLElement>('.scrubber-pill[data-stage-session]')
)
  .map((pill) => pill.getAttribute('data-stage-session') ?? '')
  .filter(Boolean);

const DEFAULT_SESSION_ID: string =
  TOP_SESSION_IDS[0] ?? document.querySelector('.archive-session')?.id ?? '';

function parseLocationHash(): HashRouteInfo {
  return parseHash(window.location.hash);
}

async function revealVaultCard(cardId: string, prefersReduced: boolean): Promise<void> {
  const card = document.getElementById(cardId);
  if (!card) return;
  if (card.classList.contains('vault-card') && !card.classList.contains('vault-missing-card')) {
    mountVaultCardSpecDiagram(card);
  }
  const parentSession = card.closest<HTMLElement>('.archive-session');
  if (parentSession) parentSession.hidden = false;
  card.hidden = false;
  for (const s of document.querySelectorAll<HTMLElement>('.archive-session')) {
    s.style.contentVisibility = 'visible';
  }
  await scrollIntoViewAsync(card, {
    behavior: prefersReduced ? 'auto' : 'smooth',
    block: 'center'
  });
  card.classList.add('is-lucky-pick');
  setTimeout(() => {
    card.classList.remove('is-lucky-pick');
  }, 3000);
}

const copyResetTimers = new WeakMap<HTMLButtonElement, number>();

function getAppBaseUrl(): string {
  const cleanPath = window.location.pathname.replace(/index\.html$/, '');
  const normalizedPath = cleanPath.endsWith('/') ? cleanPath : `${cleanPath}/`;
  return `${window.location.origin}${normalizedPath}`;
}

async function copyUrlWithFeedback(button: HTMLButtonElement, url: string): Promise<void> {
  const defaultLabel = button.getAttribute('data-default-label') ?? button.textContent.trim();
  button.setAttribute('data-default-label', defaultLabel);

  let copied: boolean;
  try {
    await navigator.clipboard.writeText(url);
    copied = true;
  } catch {
    copied = false;
  }

  button.textContent = copied ? '✓ Link Copied!' : url;
  button.classList.add('is-copied');
  const prevTimer = copyResetTimers.get(button);
  if (prevTimer !== undefined) window.clearTimeout(prevTimer);
  const timerId = window.setTimeout(() => {
    button.textContent = defaultLabel;
    button.classList.remove('is-copied');
    copyResetTimers.delete(button);
  }, 1800);
  copyResetTimers.set(button, timerId);
}

function initCardVisualBadgeGroups(): void {
  for (const visual of document.querySelectorAll(
    '.vault-card:not(.vault-missing-card) .card-visual'
  )) {
    if (visual.querySelector('.card-visual-badges')) continue;
    const badgeRow = document.createElement('div');
    badgeRow.className = 'card-visual-badges';
    const overlay = visual.querySelector('.card-visual-overlay');
    if (overlay) {
      overlay.after(badgeRow);
    } else {
      visual.appendChild(badgeRow);
    }
    for (const selector of ['.course-tag-overlay', '.provenance-badge', '.spec-view-toggle']) {
      const child = visual.querySelector(selector);
      if (child) badgeRow.appendChild(child);
    }
  }
}

function initVaultCopyLinkButtons(): void {
  for (const card of document.querySelectorAll<HTMLElement>(
    '.vault-card:not(.vault-missing-card)'
  )) {
    if (!card.id || card.querySelector('.copy-link-btn')) continue;
    let actions = card.querySelector('.card-actions');
    if (!actions) {
      const body = card.querySelector('.card-body') ?? card;
      actions = document.createElement('div');
      actions.className = 'card-actions';
      body.appendChild(actions);
    }
    const title = (card.querySelector('.card-title')?.textContent ?? 'this cocktail').trim();
    const copyBtn = document.createElement('button');
    copyBtn.type = 'button';
    copyBtn.className = 'copy-link-btn';
    copyBtn.setAttribute('data-copy-card', card.id);
    copyBtn.title = `Copy direct link to ${title}`;
    copyBtn.textContent = '🔗 Copy Link';
    actions.appendChild(copyBtn);
  }
}

function bootstrapApp(): void {
  const body = document.body;
  const btnGuest = document.getElementById('btn-guest');
  const btnBartender = document.getElementById('btn-bartender');
  const navVaultBtn = document.getElementById('nav-vault-btn');
  const stagePrepLink = document.getElementById('stage-prep-link');
  const stageCardsGridEl = document.getElementById('stage-cards-grid');
  const prepLedgerTbodyEl = document.getElementById('prep-ledger-tbody');
  const dynamicSessionPill = document.getElementById('scrubber-dynamic-session-pill');
  const dynamicSessionTitle = document.getElementById('scrubber-dynamic-session-title');

  const state: AppState = {
    currentScale: 1,
    currentPageView: 'session',
    currentSessionId: DEFAULT_SESSION_ID
  };

  function setMode(mode: ViewMode, persist = true): void {
    body.setAttribute('data-mode', mode);
    const isBartender = mode === 'bartender';
    btnGuest?.setAttribute('aria-pressed', String(!isBartender));
    btnBartender?.setAttribute('aria-pressed', String(isBartender));
    if (persist) {
      try {
        localStorage.setItem('hcc_menu_mode', mode);
      } catch {
        // Ignore storage failures in restricted contexts
      }
    }
  }

  btnGuest?.addEventListener('click', () => {
    setMode('guest', true);
  });
  btnBartender?.addEventListener('click', () => {
    setMode('bartender', true);
  });

  const initialHashInfo = parseLocationHash();
  let savedMode: string | null = null;
  try {
    savedMode = localStorage.getItem('hcc_menu_mode');
  } catch {
    // Ignore storage failures in restricted contexts
  }
  if (initialHashInfo.hasBartender) {
    setMode('bartender', false);
  } else if (savedMode === 'bartender') {
    setMode('bartender', false);
  }

  initCardVisualBadgeGroups();
  initVaultCopyLinkButtons();
  initScalingAndAccordions(state, mountVaultCardSpecDiagram);
  initFeatureSessionBanners();
  initLazyVaultDiagrams();
  initHostRotationDropdown();

  function setPageView(view: PageView, options: PageViewOptions = {}): void {
    state.currentPageView = view;
    body.setAttribute('data-page-view', view);
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const historyMode: HistoryMode = options.history ?? 'replace';

    if (view === 'vault') {
      navVaultBtn?.setAttribute('aria-pressed', 'true');
      for (const pill of document.querySelectorAll('.scrubber-pill[data-stage-session]')) {
        pill.setAttribute('aria-pressed', 'false');
      }

      if (options.scroll) {
        window.scrollTo({ top: 0, behavior: prefersReduced ? 'auto' : 'smooth' });
      }

      const archiveHeading = document.getElementById('archive-heading');
      if (archiveHeading) {
        archiveHeading.setAttribute('tabindex', '-1');
        archiveHeading.focus({ preventScroll: true });
      }

      if (options.targetCardId) {
        const cardId = options.targetCardId;
        setTimeout(() => {
          void revealVaultCard(cardId, prefersReduced);
        }, 80);
      }

      if (historyMode !== 'none') {
        try {
          const keepBartender = historyMode === 'replace' && parseLocationHash().hasBartender;
          const nextHash = `#vault${keepBartender ? '&bartender' : ''}`;
          if (historyMode === 'push') {
            if (window.location.hash !== nextHash) {
              history.pushState(null, '', nextHash);
            }
          } else {
            history.replaceState(null, '', nextHash);
          }
        } catch {
          // Ignore history failures in restricted contexts
        }
      }
      return;
    }

    navVaultBtn?.setAttribute('aria-pressed', 'false');
    if (options.sessionId) {
      state.currentSessionId = options.sessionId;
    }

    renderActiveStageSession(state.currentSessionId, state, false);

    const isTopSession = TOP_SESSION_IDS.includes(state.currentSessionId);
    if (dynamicSessionPill) {
      if (isTopSession) {
        dynamicSessionPill.style.display = 'none';
      } else {
        dynamicSessionPill.style.display = 'inline-flex';
        dynamicSessionPill.setAttribute('data-stage-session', state.currentSessionId);
        const sessionEl = document.getElementById(state.currentSessionId);
        const sTitle =
          (sessionEl?.querySelector('.session-title')?.textContent ?? '').trim() ||
          'Historical Session';
        const sDate = (sessionEl?.querySelector('.session-date')?.textContent ?? '').trim();
        if (dynamicSessionTitle) {
          dynamicSessionTitle.textContent = `${sDate ? `${sDate}: ` : ''}${sTitle}`;
        }
      }
    }

    for (const pill of document.querySelectorAll('.scrubber-pill[data-stage-session]')) {
      const isMatch = pill.getAttribute('data-stage-session') === state.currentSessionId;
      pill.setAttribute('aria-pressed', String(isMatch));
    }

    if (options.scroll) {
      window.scrollTo({ top: 0, behavior: prefersReduced ? 'auto' : 'smooth' });
    }

    const stageHeading = document.getElementById('stage-heading');
    if (stageHeading) {
      stageHeading.setAttribute('tabindex', '-1');
      stageHeading.focus({ preventScroll: true });
    }

    if (historyMode !== 'none') {
      try {
        const keepBartender = historyMode === 'replace' && parseLocationHash().hasBartender;
        const nextHash = `#${state.currentSessionId}${keepBartender ? '&bartender' : ''}`;
        if (historyMode === 'push') {
          if (window.location.hash !== nextHash) {
            history.pushState(null, '', nextHash);
          }
        } else {
          history.replaceState(null, '', nextHash);
        }
      } catch {
        // Ignore history failures in restricted contexts
      }
    }
  }

  function transitionPageView(view: PageView, options: PageViewOptions = {}): void {
    const update = (): void => {
      setPageView(view, { history: 'push', ...options });
    };
    const docWithVt: { startViewTransition?: Document['startViewTransition'] } = document;
    const startVt = docWithVt.startViewTransition?.bind(document);
    if (!startVt || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      update();
    } else {
      const vt = startVt(update);
      void vt.ready.catch(() => undefined);
      void vt.finished.catch(() => undefined);
    }
  }

  let hasRoutedInitialHash = false;
  function routeFromHash(historyMode: HistoryMode = 'replace'): void {
    const { target, hasBartender } = parseLocationHash();
    if (hasBartender) {
      setMode('bartender', false);
    }

    let targetView: PageView = 'session';
    let targetSessionId = DEFAULT_SESSION_ID;
    let targetCardId: string | null = null;
    const targetEl = target ? document.getElementById(target) : null;

    if (target === 'vault' || target === 'league-archive') {
      targetView = 'vault';
    } else if (target && targetEl?.classList.contains('archive-session')) {
      targetView = 'session';
      targetSessionId = target;
    } else if (target && targetEl?.classList.contains('vault-card')) {
      targetView = 'vault';
      targetCardId = target;
    }

    if (
      hasRoutedInitialHash &&
      !targetCardId &&
      targetView === state.currentPageView &&
      (targetView === 'vault' || targetSessionId === state.currentSessionId)
    ) {
      return;
    }

    hasRoutedInitialHash = true;
    if (targetView === 'vault') {
      setPageView('vault', { scroll: false, history: historyMode, targetCardId });
    } else {
      setPageView('session', { sessionId: targetSessionId, scroll: false, history: historyMode });
    }
  }

  navVaultBtn?.addEventListener('click', () => {
    transitionPageView('vault', { scroll: true });
  });

  stagePrepLink?.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('prep-summary')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  const stagePrintBtn = document.getElementById('stage-print-btn');
  if (stagePrintBtn instanceof HTMLButtonElement) {
    stagePrintBtn.addEventListener('click', () => {
      window.print();
    });
  }

  const stageCopySessionBtn = document.getElementById('stage-copy-session-btn');
  if (stageCopySessionBtn instanceof HTMLButtonElement) {
    stageCopySessionBtn.addEventListener('click', () => {
      const shareUrl = `${getAppBaseUrl()}s/${encodeURIComponent(state.currentSessionId)}/`;
      void copyUrlWithFeedback(stageCopySessionBtn, shareUrl);
    });
  }

  document.addEventListener('click', (e) => {
    if (!(e.target instanceof Element)) return;
    const copyBtn = e.target.closest<HTMLButtonElement>('.copy-link-btn[data-copy-card]');
    if (!copyBtn) return;
    const cardId = copyBtn.getAttribute('data-copy-card');
    if (!cardId) return;
    const cardUrl = `${getAppBaseUrl()}#${encodeURIComponent(cardId)}`;
    void copyUrlWithFeedback(copyBtn, cardUrl);
  });

  stageCardsGridEl?.addEventListener('click', (e) => {
    if (!(e.target instanceof Element)) return;
    const jumpBtn = e.target.closest('.stage-jump-btn');
    if (jumpBtn) {
      e.preventDefault();
      const href = jumpBtn.getAttribute('href') ?? '';
      const cardId = href.replace(/^#/, '');
      if (cardId) {
        transitionPageView('vault', { targetCardId: cardId });
      }
    }
  });

  prepLedgerTbodyEl?.addEventListener('click', (e) => {
    if (!(e.target instanceof Element)) return;
    const link = e.target.closest('a[href^="#"]');
    if (link) {
      e.preventDefault();
      const href = link.getAttribute('href') ?? '';
      const cardId = href.replace(/^#/, '');
      if (cardId) {
        transitionPageView('vault', { targetCardId: cardId });
      }
    }
  });

  for (const brandEl of document.querySelectorAll('.brand-lockup, .brand-center-title')) {
    brandEl.addEventListener('click', (e) => {
      e.preventDefault();
      transitionPageView('session', { sessionId: DEFAULT_SESSION_ID, scroll: true });
    });
  }

  document.getElementById('session-scrubber')?.addEventListener('click', (e) => {
    if (!(e.target instanceof Element)) return;
    const pill = e.target.closest('.scrubber-pill[data-stage-session]');
    if (pill) {
      const targetSession = pill.getAttribute('data-stage-session');
      if (targetSession) {
        transitionPageView('session', { sessionId: targetSession, scroll: true });
      }
    }
  });

  for (const btn of document.querySelectorAll('[data-trigger-stage]')) {
    btn.addEventListener('click', () => {
      const targetSession = btn.getAttribute('data-trigger-stage');
      if (targetSession) {
        transitionPageView('session', { sessionId: targetSession, scroll: true });
      }
    });
  }

  routeFromHash('replace');
  window.addEventListener('popstate', () => {
    routeFromHash('none');
  });
  window.addEventListener('hashchange', () => {
    routeFromHash('none');
  });

  initVaultAndBackbar(state, (options) => {
    setPageView('vault', options);
  });

  const qrDialog = document.getElementById('qr-dialog');
  const openQrBtn = document.getElementById('open-qr-modal');
  const closeQrBtn = document.getElementById('close-qr-modal');

  if (qrDialog instanceof HTMLDialogElement && openQrBtn && closeQrBtn) {
    openQrBtn.addEventListener('click', () => {
      qrDialog.showModal();
    });
    closeQrBtn.addEventListener('click', () => {
      qrDialog.close();
    });
    qrDialog.addEventListener('click', (e) => {
      if (e.target === qrDialog) qrDialog.close();
    });
  }
}

bootstrapApp();
