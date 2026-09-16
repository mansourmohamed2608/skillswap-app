import { SERVICE_CATEGORIES, resolveServiceCategory } from '../core/categories';

describe('canonical service categories', () => {
  it('has unique stable IDs', () => {
    const ids = SERVICE_CATEGORIES.map((category) => category.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('resolves IDs and legacy labels to the same category', () => {
    expect(resolveServiceCategory('arts-and-crafts')).toEqual({ id: 'arts-and-crafts', label: 'Arts & Crafts' });
    expect(resolveServiceCategory(' Arts & Crafts ')).toEqual({ id: 'arts-and-crafts', label: 'Arts & Crafts' });
  });

  it('does not silently coerce an unknown legacy category', () => {
    expect(resolveServiceCategory('Legacy Unknown Category')).toBeNull();
  });
});
