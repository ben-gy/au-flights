// Click-to-reveal glossary popovers. Any element with class "glossary-link" and a
// data-term attribute pointing at a GLOSSARY key opens a definition popover.
import { GLOSSARY } from './glossary.ts';
import { esc } from './format.ts';

let pop: HTMLDivElement | null = null;

/** Wrap a term in a glossary link span. */
export function term(label: string, key: string): string {
  return `<span class="glossary-link" data-term="${esc(key)}" tabindex="0" role="button" aria-label="Define ${esc(label)}">${esc(label)}<span class="gloss-icon" aria-hidden="true">i</span></span>`;
}

function ensure(): HTMLDivElement {
  if (!pop) {
    pop = document.createElement('div');
    pop.className = 'glossary-pop';
    document.body.appendChild(pop);
  }
  return pop;
}

function hide(): void {
  if (pop) pop.classList.remove('visible');
}

function show(target: HTMLElement): void {
  const key = target.getAttribute('data-term') ?? '';
  const entry = GLOSSARY[key];
  if (!entry) return;
  const el = ensure();
  el.innerHTML = `<strong>${esc(entry.term)}</strong><p>${esc(entry.definition)}</p>`;
  el.classList.add('visible');
  const rect = target.getBoundingClientRect();
  const elRect = el.getBoundingClientRect();
  let left = rect.left;
  let top = rect.bottom + 8;
  if (left + elRect.width + 12 > window.innerWidth) left = window.innerWidth - elRect.width - 12;
  if (top + elRect.height + 12 > window.innerHeight) top = rect.top - elRect.height - 8;
  el.style.left = `${Math.max(12, left)}px`;
  el.style.top = `${Math.max(12, top)}px`;
}

export function initGlossary(): void {
  document.addEventListener('click', (e) => {
    const target = (e.target as Element).closest('.glossary-link') as HTMLElement | null;
    if (target) {
      e.stopPropagation();
      show(target);
    } else if (!(e.target as Element).closest('.glossary-pop')) {
      hide();
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') hide();
    if ((e.key === 'Enter' || e.key === ' ') && (e.target as Element).classList?.contains('glossary-link')) {
      e.preventDefault();
      show(e.target as HTMLElement);
    }
  });
  window.addEventListener('scroll', hide, true);
}
