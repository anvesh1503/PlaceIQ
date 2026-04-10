import { Timestamp } from "firebase/firestore";

export function toDate(
  value: Timestamp | Date | null | undefined
): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof (value as Timestamp).toDate === "function") {
    return (value as Timestamp).toDate();
  }
  return null;
}

export function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

export function isOlderThanDays(date: Date | null, days: number): boolean {
  if (!date) return true;
  return date.getTime() < Date.now() - days * 24 * 60 * 60 * 1000;
}
