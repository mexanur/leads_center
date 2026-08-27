import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow, isPast, isToday, isTomorrow, addMinutes } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "N/A";
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "MMM d, yyyy h:mm a");
}

export function formatShortDate(date: string | Date | null | undefined): string {
  if (!date) return "N/A";
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "MMM d, yyyy");
}

export function formatRelativeTime(date: string | Date | null | undefined): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return formatDistanceToNow(d, { addSuffix: true });
}

export function formatPhoneNumber(phone: string): string {
  const cleaned = ('' + phone).replace(/\D/g, '');
  const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
  if (match) {
    return '(' + match[1] + ') ' + match[2] + '-' + match[3];
  }
  return phone;
}

export function isReminderAlerting(dueAt: string | Date, advanceMinutes: number = 15): {
  isOverdue: boolean;
  isDueSoon: boolean;
  alertText: string;
} {
  const due = typeof dueAt === "string" ? new Date(dueAt) : dueAt;
  const now = new Date();
  const alertWindowStart = new Date(due.getTime() - advanceMinutes * 60 * 1000);

  const isOverdue = now > due;
  const isDueSoon = now >= alertWindowStart && now <= due;

  let alertText = "";
  if (isOverdue) {
    alertText = `Overdue (${formatDistanceToNow(due, { addSuffix: true })})`;
  } else if (isDueSoon) {
    alertText = `Due in ${formatDistanceToNow(due)}`;
  } else {
    alertText = `Due ${format(due, "MMM d, h:mm a")}`;
  }

  return { isOverdue, isDueSoon, alertText };
}
