import type { CardOverflowResult, OverflowIssue, OverflowRegionId } from './types';
import { auditCardLayout } from './layoutEngine';

const REGION_LABEL_MAP: Record<OverflowRegionId, string> = {
  header: 'card.region.header',
  score: 'card.region.score',
  chart: 'card.region.chart',
  axes: 'card.region.axes',
  reasons: 'card.region.reasons',
  comment: 'card.region.comment',
  story: 'card.region.story',
  footer: 'card.region.footer',
  card: 'card.region.card',
};

export function detectCardOverflow(cardElement: HTMLElement | null): CardOverflowResult {
  if (!cardElement) {
    return { hasOverflow: false, issues: [], collisions: [], outOfBounds: [] };
  }

  const issues: OverflowIssue[] = [];
  const seenRegions = new Set<OverflowRegionId>();
  const layoutAudit = auditCardLayout(cardElement);

  const addIssue = (region: OverflowRegionId) => {
    if (seenRegions.has(region)) return;
    seenRegions.add(region);
    issues.push({ region, labelKey: REGION_LABEL_MAP[region] ?? 'card.region.card' });
  };

  // Check designated sub-regions
  const regionElements = cardElement.querySelectorAll<HTMLElement>('[data-card-region]');
  regionElements.forEach((el) => {
    const regionName = el.getAttribute('data-card-region') as OverflowRegionId;
    if (!regionName || regionName === 'card') return;

    const isOverflowingY = el.scrollHeight > el.clientHeight + 1.5;
    const isOverflowingX = el.scrollWidth > el.clientWidth + 1.5;

    if (isOverflowingY || isOverflowingX) addIssue(regionName);
  });

  layoutAudit.outOfBounds.forEach(addIssue);
  layoutAudit.collisions.forEach((collision) => {
    addIssue(collision.firstRegion);
    addIssue(collision.secondRegion);
  });

  // Check root card element
  const isCardOverflowingY = cardElement.scrollHeight > cardElement.clientHeight + 1.5;
  const isCardOverflowingX = cardElement.scrollWidth > cardElement.clientWidth + 1.5;

  if (isCardOverflowingY || isCardOverflowingX) addIssue('card');

  return {
    hasOverflow: issues.length > 0,
    issues,
    collisions: layoutAudit.collisions,
    outOfBounds: layoutAudit.outOfBounds,
  };
}
