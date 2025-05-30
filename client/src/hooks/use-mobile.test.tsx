import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useIsMobile } from './use-mobile';

const MOBILE_BREAKPOINT = 768;

// Store original window properties
const originalInnerWidth = Object.getOwnPropertyDescriptor(window, 'innerWidth');
const originalMatchMedia = window.matchMedia;

describe('useIsMobile Hook', () => {
  let matchMediaMock: {
    matches: boolean;
    media: string;
    onchange: null | ((this: MediaQueryList, ev: MediaQueryListEvent) => any);
    addListener: (callback: any) => void; // deprecated but still used in some older code
    removeListener: (callback: any) => void; // deprecated
    addEventListener: ReturnType<typeof vi.fn>;
    removeEventListener: ReturnType<typeof vi.fn>;
    dispatchEvent: (event: Event) => boolean;
  };

  const setDeviceWidth = (width: number) => {
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: width });
    // Update matchMediaMock.matches based on the new width
    matchMediaMock.matches = width < MOBILE_BREAKPOINT;
  };

  const triggerResize = (width: number) => {
    setDeviceWidth(width);
    // Simulate the change event for matchMedia
    // This requires invoking the callback passed to addEventListener
    // Vitest's JSDOM environment might not fully implement MediaQueryListEvent
    // We need to manually call the stored listener
    
    // Find the most recent listener added.
    const eventListenerCallback = matchMediaMock.addEventListener.mock.calls.find(call => call[0] === 'change')?.[1];
    if (eventListenerCallback) {
       act(() => {
        eventListenerCallback({ matches: matchMediaMock.matches, media: `(max-width: ${MOBILE_BREAKPOINT - 1}px)` });
      });
    } else {
      // Fallback for older listener style if needed, though the hook uses addEventListener
      if (typeof matchMediaMock.onchange === 'function') {
        act(() => {
            matchMediaMock.onchange!({ matches: matchMediaMock.matches, media: `(max-width: ${MOBILE_BREAKPOINT - 1}px)` } as any);
        });
      }
    }
  };


  beforeEach(() => {
    matchMediaMock = {
      matches: false,
      media: `(max-width: ${MOBILE_BREAKPOINT - 1}px)`,
      onchange: null,
      addListener: vi.fn(), // for older browser compatibility, not used by hook
      removeListener: vi.fn(), // for older browser compatibility, not used by hook
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    };
    window.matchMedia = vi.fn().mockImplementation(() => matchMediaMock);
  });

  afterEach(() => {
    // Restore original window properties
    if (originalInnerWidth) {
      Object.defineProperty(window, 'innerWidth', originalInnerWidth);
    } else {
      // If it wasn't originally defined, set it to undefined
      (window as any).innerWidth = undefined;
    }
    window.matchMedia = originalMatchMedia;
    vi.clearAllMocks();
  });

  it('should initialize with undefined then determine mobile state based on initial window.innerWidth', () => {
    setDeviceWidth(MOBILE_BREAKPOINT - 100); // Mobile width
    const { result, rerender } = renderHook(() => useIsMobile());
    // The hook initializes state to undefined, then useEffect runs.
    // So, the first render might give true (if undefined is falsy) or initial undefined.
    // The hook returns `!!isMobile`, so undefined becomes false.
    // Let's check after useEffect has run.
    // The state update in useEffect causes a re-render.
    expect(result.current).toBe(true); // Initially mobile

    setDeviceWidth(MOBILE_BREAKPOINT + 100); // Desktop width
    const { result: resultDesktop } = renderHook(() => useIsMobile());
    expect(resultDesktop.current).toBe(false); // Initially desktop
  });
  
  it('should return true if window width is less than MOBILE_BREAKPOINT', () => {
    setDeviceWidth(MOBILE_BREAKPOINT - 1); // e.g., 767px
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
  });

  it('should return false if window width is equal to or greater than MOBILE_BREAKPOINT', () => {
    setDeviceWidth(MOBILE_BREAKPOINT); // e.g., 768px
    const { result: res1 } = renderHook(() => useIsMobile());
    expect(res1.current).toBe(false);

    setDeviceWidth(MOBILE_BREAKPOINT + 100); // e.g., 868px
    const { result: res2 } = renderHook(() => useIsMobile());
    expect(res2.current).toBe(false);
  });

  it('should add event listener for "change" on mount', () => {
    setDeviceWidth(800);
    renderHook(() => useIsMobile());
    expect(window.matchMedia).toHaveBeenCalledWith(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    expect(matchMediaMock.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
  });

  it('should update isMobile state when matchMedia change event occurs', () => {
    setDeviceWidth(800); // Initial: desktop
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);

    // Simulate window resize to mobile
    act(() => {
      triggerResize(500);
    });
    expect(result.current).toBe(true);

    // Simulate window resize back to desktop
     act(() => {
      triggerResize(900);
    });
    expect(result.current).toBe(false);
  });
  
  it('should use window.innerWidth inside the change event listener', () => {
    setDeviceWidth(800); // Initial: desktop
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);

    // Spy on innerWidth access during the change handler
    const innerWidthSpy = vi.spyOn(window, 'innerWidth', 'get');

    // Simulate a "change" event from matchMedia, but keep innerWidth such that it's mobile
    // The hook's `onChange` handler explicitly checks `window.innerWidth`
    act(() => {
      // Make matchMedia.matches true (as if media query matched)
      matchMediaMock.matches = true; 
      // Set innerWidth to a mobile value
      Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 500 });
      
      // Trigger the listener
      const eventListenerCallback = matchMediaMock.addEventListener.mock.calls.find(call => call[0] === 'change')?.[1];
      eventListenerCallback({ matches: true, media: `(max-width: ${MOBILE_BREAKPOINT - 1}px)` });
    });
    
    expect(innerWidthSpy).toHaveBeenCalled(); // Ensure the getter for innerWidth was called
    expect(result.current).toBe(true); // State should update based on the new innerWidth

    innerWidthSpy.mockRestore();
  });


  it('should remove event listener on unmount', () => {
    setDeviceWidth(800);
    const { unmount } = renderHook(() => useIsMobile());
    const handler = matchMediaMock.addEventListener.mock.calls[0][1]; // Get the passed handler

    unmount();
    expect(matchMediaMock.removeEventListener).toHaveBeenCalledWith('change', handler);
  });
  
  it('should handle initial undefined state correctly and return boolean', () => {
    // Temporarily make useEffect not run immediately or set initial state to undefined
    // The hook itself initializes with `undefined` then `useEffect` sets it.
    // `useIsMobile` returns `!!isMobile`, so `undefined` becomes `false`.
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 500 }); // mobile
    
    // If React runs useEffect synchronously in test (it often does with renderHook),
    // then `isMobile` will be set before the first `expect`.
    // The hook's internal state `isMobile` is `undefined` only very briefly.
    // The hook always returns a boolean because of `!!isMobile`.
    const { result } = renderHook(() => useIsMobile());
    expect(typeof result.current).toBe('boolean');
    
    // If we want to check the sequence:
    // 1. useState(undefined)
    // 2. useEffect -> setIsMobile(...)
    // The return is `!!isMobile`. So if `isMobile` is `undefined`, it returns `false`.
    // If `isMobile` is `true`, it returns `true`. If `isMobile` is `false`, it returns `false`.

    // Test with desktop
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1024 }); // desktop
    const { result: desktopResult } = renderHook(() => useIsMobile());
    expect(typeof desktopResult.current).toBe('boolean');
    expect(desktopResult.current).toBe(false);

  });
});
