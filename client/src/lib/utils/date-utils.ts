import { formatDistanceToNow, isPast, isToday, isTomorrow, isYesterday } from "date-fns";

/**
 * Calculates the progress percentage for expiration date visualization.
 * Returns a value between 0.0 and 1.0 representing how much time has passed.
 * 
 * @param expiryDate - The expiration date
 * @returns A number between 0.0 and 1.0, where 1.0 means it's not expired yet, and 0.0 means it's expired
 */
export function calculateExpiryProgress(expiryDate: string | Date): number {
  const expiryTime = new Date(expiryDate).getTime();
  const currentTime = new Date().getTime();
  
  if (currentTime > expiryTime) {
    return 0; // Already expired
  }
  
  // We'll use a 14-day window for visualization
  const twoWeeksTime = 14 * 24 * 60 * 60 * 1000; // 14 days in milliseconds
  const timeLeft = expiryTime - currentTime;
  
  // If more than two weeks left, we'll show full progress
  if (timeLeft > twoWeeksTime) {
    return 1;
  }
  
  // Otherwise, calculate the ratio of time left to two weeks
  return timeLeft / twoWeeksTime;
}

/**
 * Formats a date into a human-readable relative format like "Expired!", "Today", "Tomorrow", etc.
 * 
 * @param date - The date to format
 * @returns A human-readable string representing the relative date
 */
export function formatRelativeDate(date: string | Date): string {
  const dateObj = new Date(date);
  
  if (isPast(dateObj) && !isToday(dateObj)) {
    return "Expired!";
  }
  
  if (isToday(dateObj)) {
    return "Today";
  }
  
  if (isTomorrow(dateObj)) {
    return "Tomorrow";
  }
  
  if (isYesterday(dateObj)) {
    return "Yesterday";
  }
  
  return formatDistanceToNow(dateObj, { addSuffix: true });
}

/**
 * Groups a list of food items by expiration status.
 * Returns an object with three arrays: expired, expiringSoon (within 3 days), and ok.
 * 
 * @param items - The list of food items
 * @returns An object with three arrays: expired, expiringSoon, and ok
 */
export function groupItemsByExpiryStatus<T extends { expiryDate: string | Date }>(items: T[]) {
  const now = new Date();
  const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  
  const expired: T[] = [];
  const expiringSoon: T[] = [];
  const ok: T[] = [];
  
  items.forEach(item => {
    const expiryDate = new Date(item.expiryDate);
    
    if (expiryDate < now) {
      expired.push(item);
    } else if (expiryDate <= threeDaysFromNow) {
      expiringSoon.push(item);
    } else {
      ok.push(item);
    }
  });
  
  return { expired, expiringSoon, ok };
}