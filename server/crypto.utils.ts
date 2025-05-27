import bcrypt from 'bcrypt';
import logger from './logger';

const SALT_ROUNDS = 10; // Standard number of rounds for bcrypt

/**
 * Hashes a plain-text password using bcrypt with a fixed salt round count.
 *
 * @param password - The plain-text password to hash.
 * @returns A promise that resolves to the hashed password string.
 *
 * @throws {Error} If password hashing fails.
 * @remark Throws a generic error message to prevent leaking sensitive error details.
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
 * Compares a plain-text password to a hashed password and determines if they match.
 *
 * @param password - The plain-text password to verify.
 * @param hashedPassword - The bcrypt-hashed password to compare against.
 * @returns A promise resolving to true if the password matches the hash, or false otherwise.
 *
 * @remark If an error occurs during comparison (such as a malformed hash), the function logs the error and returns false for safety.
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
