import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { createApp } from './index'; // Import the createApp function
import { type Express } from 'express';
import http from 'http';
import { hashPassword as actualHashPassword } from './crypto.utils'; // For login test

// Mock storage module
// Define the mock storage object that will be used by the mock factory
const mockStorageObjectForFactory = {
  getUserByUsername: vi.fn(),
  createUser: vi.fn(),
  // Mock sessionStore as it's used in auth.ts
  sessionStore: {
    get: vi.fn((sid, cb) => cb(null, null)), // Simulate session not found
    set: vi.fn((sid, session, cb) => cb(null)),
    destroy: vi.fn((sid, cb) => cb(null)),
    on: vi.fn(), // For event listeners if any
  } as any, // Use 'as any' to simplify complex SessionStore type
};

vi.mock('./storage', () => ({
  storage: mockStorageObjectForFactory,
}));

// Mock parts of auth.ts specifically for password functions if needed,
// but since we are using actualHashPassword for test setup,
// and comparePasswords is used internally by LocalStrategy,
// the LocalStrategy itself will use the real comparePasswords from crypto.utils.
// We don't need to mock crypto.utils here, as we want its real behavior for password checks.

describe('API Endpoints', () => {
  let app: Express;
  let server: http.Server;

  beforeEach(async () => {
    // Reset mocks for storage methods before each test
    mockStorageObjectForFactory.getUserByUsername.mockReset();
    mockStorageObjectForFactory.createUser.mockReset();
    
    // Reset session store mocks
    vi.fn(mockStorageObjectForFactory.sessionStore.get).mockImplementation((sid, cb) => cb(null, null));
    vi.fn(mockStorageObjectForFactory.sessionStore.set).mockImplementation((sid, session, cb) => cb(null));
    vi.fn(mockStorageObjectForFactory.sessionStore.destroy).mockImplementation((sid, cb) => cb(null));
    vi.fn(mockStorageObjectForFactory.sessionStore.on).mockReset();


    // Recreate app before each test to ensure clean state
    const appSetup = await createApp();
    app = appSetup.app;
    server = appSetup.server; 
  });

  afterEach(async () => {
    // Close the server if it's listening. Supertest usually handles this,
    // but good practice if the server instance from createApp might persist.
    if (server && server.listening) {
      await new Promise<void>(resolve => server.close(() => resolve()));
    }
  });

  describe('POST /api/register', () => {
    it('should register a new user successfully and return 201', async () => {
      const userData = { username: 'newuser', email: 'new@example.com', password: 'password123' };
      const createdUser = { id: 1, username: userData.username, email: userData.email };
      const hashedPassword = await actualHashPassword(userData.password); // Use actual for expectation

      mockStorageObjectForFactory.getUserByUsername.mockResolvedValue(undefined); // No existing user
      mockStorageObjectForFactory.createUser.mockResolvedValue(createdUser);

      const response = await request(app)
        .post('/api/register')
        .send(userData);

      expect(response.status).toBe(201);
      expect(response.body).toEqual(createdUser); // createUser mock returns this
      expect(mockStorageObjectForFactory.getUserByUsername).toHaveBeenCalledWith(userData.username);
      // Check that createUser was called with a hashed password (any string is fine for this check as hashing is dynamic)
      expect(mockStorageObjectForFactory.createUser).toHaveBeenCalledWith({
        username: userData.username,
        email: userData.email,
        hashedPassword: expect.any(String),
      });
      // More specific check for the hashed password structure if needed, but hash is dynamic
      const createUserCallArg = mockStorageObjectForFactory.createUser.mock.calls[0][0];
      expect(createUserCallArg.hashedPassword.split('.')).toHaveLength(2); // hash.salt
    });

    it('should return 400 if username already exists', async () => {
      const userData = { username: 'existinguser', email: 'exist@example.com', password: 'password123' };
      mockStorageObjectForFactory.getUserByUsername.mockResolvedValue({ id: 2, username: userData.username, email: userData.email, hashedPassword: 'somehash.somesalt' });

      const response = await request(app)
        .post('/api/register')
        .send(userData);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Username already exists');
      expect(mockStorageObjectForFactory.createUser).not.toHaveBeenCalled();
    });
  });

  describe('POST /api/login', () => {
    const loginUsername = 'testlogin';
    const loginPassword = 'password123';
    let hashedTestPassword = '';

    beforeEach(async () => {
      // Hash the test password once for this describe block
      hashedTestPassword = await actualHashPassword(loginPassword);
    });

    it('should login an existing user with correct credentials and return 200', async () => {
      const userFromDb = { 
        id: 3, 
        username: loginUsername, 
        email: 'testlogin@example.com', 
        hashedPassword: hashedTestPassword 
      };
      mockStorageObjectForFactory.getUserByUsername.mockResolvedValue(userFromDb);

      const response = await request(app)
        .post('/api/login')
        .send({ username: loginUsername, password: loginPassword });
      
      expect(response.status).toBe(200);
      const { hashedPassword, ...expectedUserResponse } = userFromDb; // API returns user without hash
      expect(response.body).toEqual(expectedUserResponse);
      expect(mockStorageObjectForFactory.getUserByUsername).toHaveBeenCalledWith(loginUsername);
    });

    it('should return 401 if user not found', async () => {
      mockStorageObjectForFactory.getUserByUsername.mockResolvedValue(undefined);

      const response = await request(app)
        .post('/api/login')
        .send({ username: 'nouser', password: 'password123' });

      expect(response.status).toBe(401);
      // The message comes from passport's LocalStrategy
      expect(response.body.message).toBe('Invalid username or password');
    });

    it('should return 401 if password incorrect', async () => {
      const userFromDb = { 
        id: 3, 
        username: loginUsername, 
        email: 'testlogin@example.com', 
        hashedPassword: hashedTestPassword 
      };
      mockStorageObjectForFactory.getUserByUsername.mockResolvedValue(userFromDb);

      const response = await request(app)
        .post('/api/login')
        .send({ username: loginUsername, password: 'wrongpassword' });

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Invalid username or password');
    });
  });
});
