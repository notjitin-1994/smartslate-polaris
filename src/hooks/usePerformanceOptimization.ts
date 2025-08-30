// Performance optimization hooks for production
import { useEffect, useCallback, useMemo, useRef, useState } from 'react';
import { productionConfig } from '@/config/production';

// Virtual scrolling hook for large lists
export function useVirtualScrolling<T>(
  items: T[],
  itemHeight: number,
  containerHeight: number,
  overscan = 5
) {
  const [scrollTop, setScrollTop] = useState(0);
  
  const visibleRange = useMemo(() => {
    const start = Math.floor(scrollTop / itemHeight);
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const end = start + visibleCount;
    
    return {
      start: Math.max(0, start - overscan),
      end: Math.min(items.length - 1, end + overscan)
    };
  }, [scrollTop, itemHeight, containerHeight, items.length, overscan]);

  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.start, visibleRange.end + 1);
  }, [items, visibleRange]);

  const totalHeight = items.length * itemHeight;
  const offsetY = visibleRange.start * itemHeight;

  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(event.currentTarget.scrollTop);
  }, []);

  return {
    visibleItems,
    totalHeight,
    offsetY,
    handleScroll,
    visibleRange
  };
}

// Debounced value hook
export function useDebounce<T>(value: T, delay: number = productionConfig.performance.debounceDelay): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Intersection observer hook for lazy loading
export function useIntersectionObserver(
  ref: React.RefObject<HTMLElement | null>,
  options: IntersectionObserverInit = {}
) {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [hasIntersected, setHasIntersected] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const intersecting = entry.isIntersecting;
        setIsIntersecting(intersecting);
        
        if (intersecting && !hasIntersected) {
          setHasIntersected(true);
        }
      },
      {
        threshold: productionConfig.performance.lazyLoadThreshold,
        ...options
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [ref, hasIntersected, options]);

  return { isIntersecting, hasIntersected };
}

// Memory usage monitoring
export function useMemoryMonitor() {
  const [memoryInfo, setMemoryInfo] = useState<{
    used: number;
    total: number;
    percentage: number;
  } | null>(null);

  useEffect(() => {
    if (!productionConfig.monitoring.enablePerformanceTracking) return;

    const updateMemoryInfo = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        setMemoryInfo({
          used: memory.usedJSHeapSize,
          total: memory.totalJSHeapSize,
          percentage: (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100
        });
      }
    };

    updateMemoryInfo();
    const interval = setInterval(updateMemoryInfo, 10000); // Every 10 seconds

    return () => clearInterval(interval);
  }, []);

  return memoryInfo;
}

// Image optimization hook
export function useOptimizedImage(src: string, options: {
  lazy?: boolean;
  placeholder?: string;
  sizes?: string;
} = {}) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const { isIntersecting, hasIntersected } = useIntersectionObserver(imgRef);

  const shouldLoad = !options.lazy || hasIntersected;

  useEffect(() => {
    if (!shouldLoad) return;

    const img = new Image();
    img.onload = () => setLoaded(true);
    img.onerror = () => setError(true);
    img.src = src;

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [src, shouldLoad]);

  return {
    ref: imgRef,
    src: shouldLoad ? src : (options.placeholder || ''),
    loaded,
    error,
    isVisible: isIntersecting
  };
}

// Bundle size monitoring
export function useBundleAnalytics() {
  const [bundleInfo, setBundleInfo] = useState<{
    totalSize: number;
    loadedChunks: string[];
    pendingChunks: string[];
  } | null>(null);

  useEffect(() => {
    if (!productionConfig.dev.enablePerformanceMonitoring) return;

    // Monitor dynamic imports
    const originalImport = (window as any).import || ((specifier: string) => import(specifier));
    
    const loadedChunks = new Set<string>();
    
    // Override dynamic import to track chunks
    (window as any).import = async (specifier: string) => {
      loadedChunks.add(specifier);
      setBundleInfo(prev => ({
        totalSize: prev?.totalSize || 0,
        loadedChunks: Array.from(loadedChunks),
        pendingChunks: prev?.pendingChunks || []
      }));
      
      return originalImport(specifier);
    };

    return () => {
      (window as any).import = originalImport;
    };
  }, []);

  return bundleInfo;
}

// Resource preloading
export function useResourcePreloader(resources: string[], priority: 'high' | 'low' = 'low') {
  useEffect(() => {
    if (!productionConfig.performance.enableLazyLoading) return;

    resources.forEach(resource => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = resource;
      
      // Determine resource type
      if (resource.endsWith('.js')) {
        link.as = 'script';
      } else if (resource.endsWith('.css')) {
        link.as = 'style';
      } else if (resource.match(/\.(png|jpg|jpeg|webp|svg)$/)) {
        link.as = 'image';
      } else if (resource.match(/\.(woff|woff2|ttf|eot)$/)) {
        link.as = 'font';
        link.crossOrigin = 'anonymous';
      }

      // Set priority
      if ('fetchPriority' in link) {
        (link as any).fetchPriority = priority;
      }

      document.head.appendChild(link);
    });

    // Cleanup function
    return () => {
      resources.forEach(resource => {
        const existingLink = document.querySelector(`link[href="${resource}"]`);
        if (existingLink) {
          document.head.removeChild(existingLink);
        }
      });
    };
  }, [resources, priority]);
}

// Performance metrics collection
export function usePerformanceMetrics() {
  const [metrics, setMetrics] = useState<{
    renderTime: number;
    componentCount: number;
    rerenderCount: number;
    memoryUsage?: number;
  } | null>(null);

  const renderCountRef = useRef(0);
  const startTimeRef = useRef(Date.now());

  useEffect(() => {
    renderCountRef.current++;
    
    const updateMetrics = () => {
      const renderTime = Date.now() - startTimeRef.current;
      const componentCount = document.querySelectorAll('[data-react-component]').length;
      
      let memoryUsage: number | undefined;
      if ('memory' in performance) {
        memoryUsage = (performance as any).memory.usedJSHeapSize;
      }

      setMetrics({
        renderTime,
        componentCount,
        rerenderCount: renderCountRef.current,
        memoryUsage
      });
    };

    // Use requestIdleCallback if available, otherwise setTimeout
    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(updateMetrics);
    } else {
      setTimeout(updateMetrics, 0);
    }
  });

  return metrics;
}

// Adaptive loading based on network conditions
export function useAdaptiveLoading() {
  const [networkInfo, setNetworkInfo] = useState<{
    effectiveType: string;
    downlink: number;
    saveData: boolean;
  } | null>(null);

  useEffect(() => {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      
      const updateNetworkInfo = () => {
        setNetworkInfo({
          effectiveType: connection.effectiveType || '4g',
          downlink: connection.downlink || 10,
          saveData: connection.saveData || false
        });
      };

      updateNetworkInfo();
      connection.addEventListener('change', updateNetworkInfo);

      return () => {
        connection.removeEventListener('change', updateNetworkInfo);
      };
    }
  }, []);

  // Determine loading strategy based on network
  const loadingStrategy = useMemo(() => {
    if (!networkInfo) return 'normal';
    
    if (networkInfo.saveData || networkInfo.effectiveType === 'slow-2g') {
      return 'minimal';
    } else if (networkInfo.effectiveType === '2g' || networkInfo.downlink < 1) {
      return 'reduced';
    } else if (networkInfo.downlink > 10) {
      return 'aggressive';
    }
    
    return 'normal';
  }, [networkInfo]);

  return {
    networkInfo,
    loadingStrategy,
    shouldReduceQuality: loadingStrategy === 'minimal' || loadingStrategy === 'reduced',
    shouldPreload: loadingStrategy === 'aggressive',
    shouldLazyLoad: loadingStrategy !== 'aggressive'
  };
}

// Component render optimization
export function useRenderOptimization<T>(
  data: T[],
  keyExtractor: (item: T) => string,
  maxItems = productionConfig.performance.maxRenderItems
) {
  const [visibleItems, setVisibleItems] = useState<T[]>([]);
  const [showingAll, setShowingAll] = useState(false);

  useEffect(() => {
    if (showingAll || data.length <= maxItems) {
      setVisibleItems(data);
    } else {
      setVisibleItems(data.slice(0, maxItems));
    }
  }, [data, maxItems, showingAll]);

  const showMore = useCallback(() => {
    setShowingAll(true);
  }, []);

  const hasMore = data.length > maxItems && !showingAll;

  return {
    visibleItems,
    hasMore,
    showMore,
    totalCount: data.length,
    visibleCount: visibleItems.length
  };
}
