'use client';

import { useEffect, useState } from 'react';
import { fetchServiceCategories, type ServiceCategoryDefinition } from '@/services/serviceCategories';

export function useServiceCategories() {
  const [categories, setCategories] = useState<ServiceCategoryDefinition[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetchServiceCategories()
      .then((result) => { if (active) setCategories(result); })
      .catch(() => { if (active) setCategories([]); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return { categories, loading };
}
