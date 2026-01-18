// Simple date helpers to avoid heavy libraries for this demo

export const formatDate = (isoString: string): string => {
  const date = new Date(isoString);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
  }).format(date);
};

export const formatCurrency = (cents: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
};

// Add working days (skip Sat/Sun)
export const addWorkingDays = (startDate: Date, days: number): Date => {
  const date = new Date(startDate);
  let added = 0;
  while (added < days) {
    date.setDate(date.getDate() + 1);
    const day = date.getDay();
    if (day !== 0 && day !== 6) {
      added++;
    }
  }
  return date;
};

export const isWorkingDay = (date: Date): boolean => {
  const day = date.getDay();
  return day !== 0 && day !== 6;
};

export const getNextWorkingDay = (date: Date): Date => {
  const next = new Date(date);
  next.setDate(next.getDate() + 1);
  while (!isWorkingDay(next)) {
    next.setDate(next.getDate() + 1);
  }
  return next;
};

export const generateId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
};

export const getRelativeTime = (isoString: string): { label: string, isPast: boolean } => {
  const target = new Date(isoString).getTime();
  const now = new Date().getTime();
  const diffInMs = target - now;
  const isPast = diffInMs < 0;
  const absDiff = Math.abs(diffInMs);

  const minutes = Math.floor(absDiff / (1000 * 60));
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return { label: `${days}d ${isPast ? 'ago' : 'away'}`, isPast };
  if (hours > 0) return { label: `${hours}h ${isPast ? 'ago' : 'away'}`, isPast };
  if (minutes > 0) return { label: `${minutes}m ${isPast ? 'ago' : 'away'}`, isPast };
  return { label: isPast ? 'Just now' : 'Starting now', isPast };
};