import { SERVICE_CATEGORIES, resolveServiceCategory } from '../core/categories';

describe('canonical service categories', () => {
  it('has unique stable IDs', () => {
    const ids = SERVICE_CATEGORIES.map((category) => category.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('contains the exact 29 approved category names', () => {
    expect(SERVICE_CATEGORIES.map((category) => category.label)).toEqual([
      'Study buddy', 'Modeling', 'Pets zone', 'Ladies hangout', 'Delicious food', 'Medical consultation', 'Dental care', 'Sporty', 'Hear me out / I’m all ears', 'Babysitting', 'Diet guide', 'Share a ride / Carpooling', 'Beauty and makeup', 'Hobby and happy', 'Business consulting', 'Graphic design', 'Content creation', 'Copy writing', 'Photography', 'Videography', 'Reels making', 'Video editing', 'Social media management', 'Media buying', 'Web development / programming', 'Home / Office repair', 'AI services', 'Teaching', 'Other',
    ]);
  });

  it('resolves IDs and exact display labels to the same category', () => {
    expect(resolveServiceCategory('web-development-programming')).toEqual({ id: 'web-development-programming', label: 'Web development / programming' });
    expect(resolveServiceCategory(' Hear me out / I’m all ears ')).toEqual({ id: 'hear-me-out-im-all-ears', label: 'Hear me out / I’m all ears' });
  });

  it('does not silently coerce an unknown legacy category', () => {
    expect(resolveServiceCategory('Legacy Unknown Category')).toBeNull();
  });
});
