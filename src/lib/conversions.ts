import { FileItem } from '../types';

const CONVERSIONS_LOG_KEY = 'filefly_conversions_log';

export interface ConversionEvent {
  id: string;
  userId: string;
  timestamp: string; // ISO string
  sourceFormat: string;
  targetFormat: string;
  fileName: string;
}

/**
 * Get current month key in format "YYYY-MM"
 */
export function getCurrentMonthKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Retrieve all conversion log entries from storage
 */
export function getConversionLogs(userId?: string): ConversionEvent[] {
  try {
    const raw = localStorage.getItem(CONVERSIONS_LOG_KEY);
    if (!raw) return [];
    const all: ConversionEvent[] = JSON.parse(raw);
    if (!userId) return all;
    return all.filter((e) => e.userId === userId);
  } catch {
    return [];
  }
}

/**
 * Record a successful conversion event
 */
export function recordSuccessfulConversion(
  userId: string,
  fileName: string,
  sourceFormat: string,
  targetFormat: string
): void {
  try {
    const logs = getConversionLogs();
    const newEvent: ConversionEvent = {
      id: `conv_evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      userId: userId || 'guest',
      timestamp: new Date().toISOString(),
      sourceFormat,
      targetFormat,
      fileName,
    };
    logs.push(newEvent);
    // Keep max 500 recent events
    const trimmed = logs.slice(-500);
    localStorage.setItem(CONVERSIONS_LOG_KEY, JSON.stringify(trimmed));
  } catch (err) {
    console.warn('Failed to record conversion event:', err);
  }
}

/**
 * Calculate the exact number of conversions the user made in the current calendar month.
 * Accounts for both files stored in the portal with conversion metadata
 * and direct one-click conversions made during the current month.
 */
export function getMonthlyConversionsCount(userId: string, files: FileItem[]): number {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  // 1. Count converted files in the user's library created this month
  const convertedFilesInLibraryThisMonth = files.filter((f) => {
    if (!f.conversionFormat && !f.convertedFromId) return false;
    const fileDate = new Date(f.uploadedAt);
    return fileDate.getMonth() === currentMonth && fileDate.getFullYear() === currentYear;
  });

  // 2. Count logged conversion events performed this month
  const userLogs = getConversionLogs(userId);
  const loggedEventsThisMonth = userLogs.filter((evt) => {
    const evtDate = new Date(evt.timestamp);
    return evtDate.getMonth() === currentMonth && evtDate.getFullYear() === currentYear;
  });

  // Unique count taking the maximum between direct logs and saved library records
  return Math.max(convertedFilesInLibraryThisMonth.length, loggedEventsThisMonth.length);
}
