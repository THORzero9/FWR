/**
 * Calculates the progress percentage for expiry.
 * Returns a value between 0 and 1, where:
 * - 1 means plenty of time left (≥ 14 days)
 * - 0 means expired
 * 
 * @param expiryDate The expiry date to calculate progress for
 * @returns Progress as a value between 0 and 1
 */
export function calculateExpiryProgress(expiryDate: Date | string): number {
  const now = new Date();
  const expiry = new Date(expiryDate);
  
  // Calculate the days until expiry
  const daysUntilExpiry = Math.max(0, Math.ceil(
    (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  ));
  
  // Calculate progress percentage (assuming 14 days is "full")
  // If more than 14 days, consider it 100%
  const progressPercentage = Math.min(daysUntilExpiry / 14, 1);
  
  return progressPercentage;
}

/**
 * Formats a date as a relative string (e.g., "today", "tomorrow", "in 5 days")
 * 
 * @param date The date to format
 * @returns Formatted date string
 */
export function formatRelativeDate(date: Date | string): string {
  const now = new Date();
  const targetDate = new Date(date);
  
  // Reset time components for day comparison
  now.setHours(0, 0, 0, 0);
  targetDate.setHours(0, 0, 0, 0);
  
  // Calculate difference in days
  const diffTime = targetDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) return "Expired";
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  return `In ${diffDays} days`;
}
