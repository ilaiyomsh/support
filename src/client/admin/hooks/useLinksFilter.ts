import { useMemo, useState, useEffect } from 'react';
import mondaySdk from 'monday-sdk-js';
import type { LinkIndexItem } from '../services/api';

const monday = mondaySdk();

export type FilterType = 'all' | 'mine';

interface UseLinksFilterOptions {
  links: LinkIndexItem[];
  searchQuery: string;
  filter: FilterType;
}

export function useLinksFilter({ links, searchQuery, filter }: UseLinksFilterOptions) {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    monday.get('context').then((context: any) => {
      setUserId(context.data?.user?.id || null);
    }).catch(() => {
      setUserId(null);
    });
  }, []);

  const filteredLinks = useMemo(() => {
    let result = links;

    // Filter by creator (if filter is "mine")
    if (filter === 'mine' && userId) {
      result = result.filter(link => link.creatorId === userId);
    }

    // Filter by search query (name or code)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(link => 
        link.name.toLowerCase().includes(query) ||
        link.code.toLowerCase().includes(query)
      );
    }

    return result;
  }, [links, searchQuery, filter, userId]);

  return filteredLinks;
}

