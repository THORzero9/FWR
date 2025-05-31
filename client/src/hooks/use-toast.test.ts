import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useToast, toast, reducer } from './use-toast'; // Assuming TOAST_REMOVE_DELAY is exported or known
import type { ToastActionElement, ToastProps } from "@/components/ui/toast";

const TOAST_REMOVE_DELAY = 1000000; // Value from use-toast.ts

// Helper to get the internal memoryState for assertions
// This is a bit of a hack, ideally we wouldn't need to access internal state directly
// but the hook's design with external state makes it tricky.
const getMemoryState = () => {
  let state;
  // The dispatch function updates memoryState and then calls listeners.
  // We can add a temporary listener to capture the state.
  const tempListener = (s: any) => { state = s; };
  // @ts-ignore: Accessing internal listeners array
  const listeners = useToast_internal_getListeners(); 
  listeners.push(tempListener);
  // Trigger a benign dispatch to get current state if needed, or just read after a toast action
  toast({ title: 'temp for state reading', duration: 0 }); // this will update memoryState
  listeners.pop(); // remove temp listener
  
  // The above is too complex. Instead, let's get the state via the hook itself.
  const { result } = renderHook(() => useToast());
  return result.current;
};

// Access internal listeners for advanced testing if absolutely necessary (use with caution)
const useToast_internal_getListeners = () => {
  // This is a placeholder. In a real scenario, if you absolutely must test listeners,
  // you might need to expose them or use a more indirect way to verify their effects.
  // For this test, we'll rely on observing state changes through the hook or `toast` actions.
  // Let's assume `listeners` array is not directly accessible for robust tests.
  // We will test the effect of listeners by checking if `useToast` updates.
  return (globalThis as any).__USE_TOAST_LISTENERS__ || [];
};

// A function to reset the internal state of the toast system for clean tests
const resetToastState = () => {
  // This function directly manipulates the module's internal state.
  // This is generally not recommended for testing external modules,
  // but given the design of use-toast.ts, it's pragmatic for ensuring test isolation.
  
  // 1. Clear toasts
  const { result: hookResult } = renderHook(() => useToast());
  act(() => {
    hookResult.current.dismiss(); // Dismiss all existing toasts
  });
  // 2. Advance timers to remove them if they were dismissed
  vi.advanceTimersByTime(TOAST_REMOVE_DELAY);
   act(() => {
    // This should trigger REMOVE_TOAST for any toasts that were added to queue
  });


  // 3. Reset the internal count for genId
  // @ts-ignore: Accessing internal count variable
  // This requires count to be exposed or a reset function in the module itself.
  // For now, we assume genId will continue to generate unique IDs across tests,
  // or we acknowledge that ID predictability is not strictly required if we fetch by other means.
  // Let's assume `count` is reset by some internal mechanism or we don't rely on specific IDs.

  // 4. Clear any pending timeouts
  // @ts-ignore: Accessing internal toastTimeouts map
  // const toastTimeouts = useToast_internal_getToastTimeouts();
  // toastTimeouts.forEach(clearTimeout);
  // toastTimeouts.clear();
  // This is also hard if not exposed. We'll rely on vi.clearAllTimers() in beforeEach/afterEach.
};


describe('useToast Hook and API', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Reset the internal state of the toast module before each test
    // This is crucial because the module maintains state outside React components.
    // We need a way to reset `memoryState` and `count`.
    // For `memoryState.toasts`, we can call `dismiss()` with no args, then advance timers.
    
    // Get current toasts from the hook
    const { result } = renderHook(() => useToast());
    const currentToasts = result.current.toasts;
    
    // Dismiss all current toasts
    act(() => {
      for (const t of currentToasts) {
        result.current.dismiss(t.id);
      }
    });
    
    // Advance timers to ensure all dismissed toasts are processed for removal
    vi.advanceTimersByTime(TOAST_REMOVE_DELAY);
    
    // At this point, memoryState.toasts should be empty.
    // Resetting `count` for `genId` is harder without modifying the original code.
    // We'll proceed assuming `genId` continues to work across tests.
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.clearAllMocks(); // Clear any mocks
  });

  describe('reducer', () => {
    let initialState: { toasts: any[] };

    beforeEach(() => {
      initialState = { toasts: [] };
    });

    it('ADD_TOAST: should add a toast', () => {
      const toastToAdd = { id: '1', title: 'Test', open: true };
      const state = reducer(initialState, { type: 'ADD_TOAST', toast: toastToAdd as any });
      expect(state.toasts).toEqual([toastToAdd]);
    });

    it('ADD_TOAST: should limit toasts to TOAST_LIMIT (1)', () => {
      const toast1 = { id: '1', title: 'Toast 1', open: true };
      const toast2 = { id: '2', title: 'Toast 2', open: true };
      let state = reducer(initialState, { type: 'ADD_TOAST', toast: toast1 as any });
      state = reducer(state, { type: 'ADD_TOAST', toast: toast2 as any });
      expect(state.toasts.length).toBe(1);
      expect(state.toasts[0]).toEqual(toast2); // Newest toast is kept
    });

    it('UPDATE_TOAST: should update an existing toast', () => {
      const toast1 = { id: '1', title: 'Toast 1', open: true, description: "Initial" };
      initialState = { toasts: [toast1 as any] };
      const state = reducer(initialState, {
        type: 'UPDATE_TOAST',
        toast: { id: '1', title: 'Updated Toast 1', description: "Updated" },
      });
      expect(state.toasts[0].title).toBe('Updated Toast 1');
      expect(state.toasts[0].description).toBe('Updated');
    });

    it('DISMISS_TOAST: should mark a specific toast as not open and queue for removal', () => {
      const toast1 = { id: '1', title: 'Toast 1', open: true };
      initialState = { toasts: [toast1 as any] };
      const state = reducer(initialState, { type: 'DISMISS_TOAST', toastId: '1' });
      expect(state.toasts[0].open).toBe(false);
      // Test addToRemoveQueue implicitly: after TOAST_REMOVE_DELAY, REMOVE_TOAST should be called
      // This part is tricky to test directly in reducer, better tested via `toast` function or `useToast` hook
    });
    
    it('DISMISS_TOAST: should mark all toasts as not open if no toastId', () => {
      const toast1 = { id: '1', title: 'Toast 1', open: true };
      const toast2 = { id: '2', title: 'Toast 2', open: true };
      initialState = { toasts: [toast1 as any, toast2 as any] };
      const state = reducer(initialState, { type: 'DISMISS_TOAST' });
      expect(state.toasts.every(t => !t.open)).toBe(true);
    });

    it('REMOVE_TOAST: should remove a specific toast', () => {
      const toast1 = { id: '1', title: 'Toast 1' };
      const toast2 = { id: '2', title: 'Toast 2' };
      initialState = { toasts: [toast1 as any, toast2 as any] };
      const state = reducer(initialState, { type: 'REMOVE_TOAST', toastId: '1' });
      expect(state.toasts.length).toBe(1);
      expect(state.toasts[0].id).toBe('2');
    });

    it('REMOVE_TOAST: should remove all toasts if no toastId', () => {
      const toast1 = { id: '1', title: 'Toast 1' };
      initialState = { toasts: [toast1 as any] };
      const state = reducer(initialState, { type: 'REMOVE_TOAST' });
      expect(state.toasts.length).toBe(0);
    });
  });

  describe('toast function (imperative API)', () => {
    it('should add a toast and return id, dismiss, and update functions', () => {
      let tst;
      act(() => {
        tst = toast({ title: 'Test Toast' });
      });
      
      const { result } = renderHook(() => useToast());
      expect(result.current.toasts.length).toBe(1);
      expect(result.current.toasts[0].title).toBe('Test Toast');
      expect(result.current.toasts[0].id).toBe(tst.id);
      expect(tst.dismiss).toBeInstanceOf(Function);
      expect(tst.update).toBeInstanceOf(Function);
    });

    it('returned dismiss function should dismiss the toast', () => {
      let tst;
      act(() => {
        tst = toast({ title: 'Dismiss Test' });
      });
      
      act(() => {
        tst.dismiss();
      });
      
      const { result } = renderHook(() => useToast());
      expect(result.current.toasts[0].open).toBe(false);

      // Check if it's removed after delay
      act(() => {
        vi.advanceTimersByTime(TOAST_REMOVE_DELAY);
      });
      expect(result.current.toasts.length).toBe(0);
    });

    it('returned update function should update the toast', () => {
      let tst;
      act(() => {
        tst = toast({ title: 'Update Test' });
      });
      
      act(() => {
        tst.update({ title: 'Updated Title', description: 'New Description' });
      });
      
      const { result } = renderHook(() => useToast());
      expect(result.current.toasts[0].title).toBe('Updated Title');
      expect(result.current.toasts[0].description).toBe('New Description');
    });
    
    it('onOpenChange(false) should dismiss the toast', () => {
      let tst;
      act(() => {
        tst = toast({ title: 'onOpenChange Test' });
      });
      
      const { result: hookResult } = renderHook(() => useToast());
      const addedToast = hookResult.current.toasts.find(t => t.id === tst.id);
      expect(addedToast).toBeDefined();

      act(() => {
        addedToast!.onOpenChange!(false); // Simulate the component calling onOpenChange
      });
      
      expect(hookResult.current.toasts[0].open).toBe(false);
      act(() => {
        vi.advanceTimersByTime(TOAST_REMOVE_DELAY);
      });
      expect(hookResult.current.toasts.length).toBe(0);
    });
  });

  describe('useToast hook', () => {
    it('should return current toasts and toast functions', () => {
      const { result } = renderHook(() => useToast());
      expect(result.current.toasts).toEqual([]); // Initially empty after reset
      expect(result.current.toast).toBeInstanceOf(Function);
      expect(result.current.dismiss).toBeInstanceOf(Function);
    });

    it('state should update when a new toast is added via global toast()', () => {
      const { result } = renderHook(() => useToast());
      act(() => {
        toast({ title: 'Global Toast' });
      });
      expect(result.current.toasts.length).toBe(1);
      expect(result.current.toasts[0].title).toBe('Global Toast');
    });

    it('hook"s dismiss function should dismiss a toast by ID', () => {
      let tst;
      act(() => {
        tst = toast({ title: 'Hook Dismiss Test' });
      });
      
      const { result } = renderHook(() => useToast());
      act(() => {
        result.current.dismiss(tst.id);
      });
      
      expect(result.current.toasts[0].open).toBe(false);
      act(() => { vi.advanceTimersByTime(TOAST_REMOVE_DELAY); });
      expect(result.current.toasts.length).toBe(0);
    });

    it('hook"s dismiss function should dismiss all toasts if no ID', () => {
      act(() => {
        toast({ title: 'Toast 1' });
        // The toast system only allows one toast at a time.
        // To test dismissing all, we'd need to change TOAST_LIMIT,
        // or acknowledge that dismissing one (the only one) is equivalent here.
      });
      // Add another toast (it will replace the first one due to TOAST_LIMIT = 1)
      act(() => {
        toast({ title: 'Toast 2' });
      });

      const { result } = renderHook(() => useToast());
      expect(result.current.toasts.length).toBe(1); // Still one toast
      
      act(() => {
        result.current.dismiss(); // Dismiss all (the single current toast)
      });
      
      expect(result.current.toasts[0].open).toBe(false);
      act(() => { vi.advanceTimersByTime(TOAST_REMOVE_DELAY); });
      expect(result.current.toasts.length).toBe(0);
    });
    
    it('should update multiple hook instances when state changes', () => {
      const { result: res1 } = renderHook(() => useToast());
      const { result: res2 } = renderHook(() => useToast());

      act(() => {
        toast({ title: 'Shared Toast' });
      });

      expect(res1.current.toasts.length).toBe(1);
      expect(res1.current.toasts[0].title).toBe('Shared Toast');
      expect(res2.current.toasts.length).toBe(1);
      expect(res2.current.toasts[0].title).toBe('Shared Toast');

      act(() => {
        res1.current.dismiss(res1.current.toasts[0].id);
      });
      
      vi.advanceTimersByTime(TOAST_REMOVE_DELAY);

      expect(res1.current.toasts.length).toBe(0);
      expect(res2.current.toasts.length).toBe(0);
    });
  });
});
