import bcrypt from 'bcrypt';
import logger from './logger';

const SALT_ROUNDS = 10; // Standard number of rounds for bcrypt

/**
 * Hashes a plain-text password using bcrypt.
 * @param password The plain-text password to hash.
 * @returns A promise that resolves to the hashed password.
 */
export async function hashPassword(password: string): Promise<string> {
  try {
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    return hashedPassword;
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, "Error during password hashing");
    throw new Error("Could not hash password."); // Generic error to avoid leaking details
  }
}

/**
 * Compares a plain-text password with a hashed password using bcrypt.
 * @param password The plain-text password.
 * @param hashedPassword The hashed password to compare against.
 * @returns A promise that resolves to true if the passwords match, false otherwise.
 */
export async function comparePasswords(password: string, hashedPassword: string): Promise<boolean> {
  try {
    const match = await bcrypt.compare(password, hashedPassword);
    return match;
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, "Error during password comparison");
    // In case of an error (e.g., malformed hash), it's safer to treat as non-match
    return false;
  }
}
