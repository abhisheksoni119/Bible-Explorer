export const CATEGORIES = [
  { value: 'questions',        label: 'Questions' },
  { value: 'guides',           label: 'Guides' },
  { value: 'topics',           label: 'Topics' },
  { value: 'bible-verses',     label: 'Bible Verses' },
  { value: 'bible-characters', label: 'Bible Characters' },
];

export const CATEGORY_VALUES = CATEGORIES.map(c => c.value);

export const ACTIVE_CATEGORIES = new Set(CATEGORY_VALUES);

export function isCategoryActive(category) {
  return ACTIVE_CATEGORIES.has(category);
}

export function categoryLabel(value) {
  return CATEGORIES.find(c => c.value === value)?.label || value;
}
// step0-rebuild-marker
