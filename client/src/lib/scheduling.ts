import parser from "cron-parser";

/**
 * Validate a cron pattern
 * @param cronPattern - Cron expression to validate
 * @returns { valid: boolean, error?: string }
 */
export function validateCronPattern(cronPattern: string): { valid: boolean; error?: string } {
  if (!cronPattern || cronPattern.trim() === "") {
    return { valid: false, error: "Cron pattern cannot be empty" };
  }

  try {
    parser.parseExpression(cronPattern);
    return { valid: true };
  } catch (error) {
    return { 
      valid: false, 
      error: error instanceof Error ? error.message : "Invalid cron pattern" 
    };
  }
}

/**
 * Calculate next N occurrences for a cron pattern
 * @param cronPattern - Cron expression
 * @param count - Number of occurrences to calculate (default: 3)
 * @param startFrom - Start date (default: now)
 * @returns Array of Date objects representing next occurrences
 */
export function getNextCronOccurrences(
  cronPattern: string, 
  count: number = 3,
  startFrom: Date = new Date()
): Date[] {
  try {
    const interval = parser.parseExpression(cronPattern, { currentDate: startFrom });
    const occurrences: Date[] = [];
    
    for (let i = 0; i < count; i++) {
      occurrences.push(interval.next().toDate());
    }
    
    return occurrences;
  } catch (error) {
    return [];
  }
}

/**
 * Format a date/time for display in local timezone
 * @param date - Date to format
 * @param includeSeconds - Whether to include seconds (default: false)
 * @returns Formatted date string
 */
export function formatScheduledTime(date: Date | string, includeSeconds: boolean = false): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    ...(includeSeconds && { second: '2-digit' }),
  };
  
  return dateObj.toLocaleString(undefined, options);
}

/**
 * Format a relative time (e.g., "in 2 hours", "in 3 days")
 * @param date - Target date
 * @returns Relative time string
 */
export function formatRelativeTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = dateObj.getTime() - now.getTime();
  
  if (diffMs < 0) {
    return "in the past";
  }
  
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 60) {
    return `in ${diffMins} minute${diffMins !== 1 ? 's' : ''}`;
  } else if (diffHours < 24) {
    return `in ${diffHours} hour${diffHours !== 1 ? 's' : ''}`;
  } else if (diffDays < 7) {
    return `in ${diffDays} day${diffDays !== 1 ? 's' : ''}`;
  } else {
    const weeks = Math.floor(diffDays / 7);
    return `in ${weeks} week${weeks !== 1 ? 's' : ''}`;
  }
}

/**
 * Check if a date is in the past
 * @param date - Date to check
 * @returns true if date is in the past
 */
export function isDateInPast(date: Date | string): boolean {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.getTime() < Date.now();
}
