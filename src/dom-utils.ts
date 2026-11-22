/**
 * Extracts a spec item's canonical ingredient name without parenthetical `.spec-note` details.
 */
export function getCleanSpecName(specItem: Element): string {
  const nameEl = specItem.querySelector('.spec-name');
  if (!nameEl) return '';
  const clone = nameEl.cloneNode(true);
  if (!(clone instanceof Element)) return '';
  for (const note of clone.querySelectorAll('.spec-note')) {
    note.remove();
  }
  return clone.textContent.replace(/\s+/g, ' ').trim();
}

/**
 * Escapes XML/HTML special characters for safe attribute and text interpolation.
 */
export function escapeMarkup(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Resolves once smooth or instant scrolling settles, working around Chromium's
 * root-scroller scrollend quirks with an idle timeout fallback.
 */
export function scrollIntoViewAsync(
  element: Element,
  options: ScrollIntoViewOptions
): Promise<void> {
  element.scrollIntoView(options);

  return new Promise<void>((resolve) => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const finish = (): void => {
      if (timeoutId !== undefined) clearTimeout(timeoutId);
      window.removeEventListener('scrollend', finish);
      window.removeEventListener('scroll', onScroll);
      resolve();
    };
    const onScroll = (): void => {
      if (timeoutId !== undefined) clearTimeout(timeoutId);
      timeoutId = setTimeout(finish, 120);
    };
    window.addEventListener('scrollend', finish, { once: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    timeoutId = setTimeout(finish, 140);
  });
}
