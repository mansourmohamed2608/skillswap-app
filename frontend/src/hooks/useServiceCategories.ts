'use client';

import { useEffect, useState } from 'react';
import { fetchServiceCategories, type ServiceCategoryDefinition } from '@/services/serviceCategories';

export function useServiceCategories() {
  const [categories, setCategories] = useState<ServiceCategoryDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetchServiceCategories()
      .then((result) => { if (active) setCategories(result); })
      .catch(() => { if (active) { setCategories([]); setError('CATEGORY_LOAD_FAILED'); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return { categories, loading, error };
}
