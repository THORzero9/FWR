// This file is used to set up the testing environment for Vitest.
// You can add global mocks, polyfills, or other setup code here.

// Import Jest DOM matchers
import '@testing-library/jest-dom';

// You might also want to extend Vitest's expect with jest-dom matchers explicitly,
// though importing '@testing-library/jest-dom' usually handles this.
// import * as matchers from '@testing-library/jest-dom/matchers'
// import { expect } from 'vitest'
// expect.extend(matchers)

// Example of a global mock (if needed for other tests, e.g. matchMedia)
// import { vi } from 'vitest';
// Object.defineProperty(window, 'matchMedia', {
//   writable: true,
//   value: vi.fn().mockImplementation(query => ({
//     matches: false,
//     media: query,
//     onchange: null,
//     addListener: vi.fn(), // deprecated
//     removeListener: vi.fn(), // deprecated
//     addEventListener: vi.fn(),
//     removeEventListener: vi.fn(),
//     dispatchEvent: vi.fn(),
//   })),
// });
