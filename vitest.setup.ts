// This file is run before each test file.
import { vi } from 'vitest';

// Mock environment variables if necessary
// For example, to prevent errors if code expects DATABASE_URL
process.env.DATABASE_URL = 'postgresql://testuser:testpass@localhost:5432/testdb';

// You can also set up global mocks here, for example:
// vi.mock('some-module', () => ({
//   default: vi.fn(),
//   someNamedExport: vi.fn(),
// }));

console.log('Vitest global setup: DATABASE_URL mocked.');
