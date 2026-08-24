import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { View } from 'react-native';
import type { FeedItem } from '../data/fcFeed';
import { fetchFeedPage } from '../data/fcFeed';

/**
 * useInfiniteFeed — the Instagram/YouTube home-feed pattern.
 *
 * - Renders page 1 immediately.
 * - An invisible sentinel at the end of the feed is watched with
 *   IntersectionObserver. rootMargin 600px means the NEXT page starts
 *   loading a full screen before the user runs out of content — the
 *   feed never visibly "stops" while scrolling.
 * - A busy flag de-duplicates requests during fast scrolling.
 * - When the "server" says there is no next page, hasMore flips and
 *   the screen shows "all caught up".
 *
 * Re-key the component that uses this hook on category change to reset.
 */
export function useInfiniteFeed(category: string) {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);

  const pageRef = useRef(0);
  const hasMoreRef = useRef(true);
  const busyRef = useRef(false);
  const categoryRef = useRef(category);
  categoryRef.current = category;

  const sentinelRef = useRef<View | null>(null);

  const loadNext = useCallback(async () => {
    if (busyRef.current || !hasMoreRef.current) return;
    busyRef.current = true;
    const page = pageRef.current;
    const res = await fetchFeedPage(categoryRef.current, page);
    pageRef.current += 1;
    setItems((prev) => [...prev, ...res.items]);
    hasMoreRef.current = res.hasMore;
    setHasMore(res.hasMore);
    setLoading(false);
    busyRef.current = false;
  }, []);

  useEffect(() => {
    loadNext();
  }, [loadNext]);

  // The sentinel observer — the actual "infinite" mechanism.
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || typeof IntersectionObserver === 'undefined') return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) loadNext();
      },
      { rootMargin: '600px 0px' },
    );
    // RN-web forwards this ref to the underlying DOM node on web.
    obs.observe(sentinel as unknown as Element);
    return () => obs.disconnect();
  }, [loadNext]);

  return { items, loading, hasMore, sentinelRef };
}
