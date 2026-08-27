/**
 * Browser Push & OS Notification Engine
 */

export function isPushNotificationSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function getNotificationPermission(): NotificationPermission | "unsupported" {
  if (!isPushNotificationSupported()) return "unsupported";
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission | "unsupported"> {
  if (!isPushNotificationSupported()) return "unsupported";
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (err) {
    console.error("Error requesting notification permission:", err);
    return Notification.permission;
  }
}

export interface PushNotificationOptions {
  title: string;
  body: string;
  tag?: string;
  icon?: string;
  leadId?: string;
  onClick?: () => void;
}

export function triggerBrowserPushNotification({
  title,
  body,
  tag,
  icon = "/favicon.ico",
  leadId,
  onClick,
}: PushNotificationOptions) {
  if (!isPushNotificationSupported()) return null;
  if (Notification.permission !== "granted") return null;

  try {
    const notification = new Notification(title, {
      body,
      tag: tag || (leadId ? `lead-${leadId}` : undefined),
      icon,
      badge: icon,
      requireInteraction: true,
    });

    notification.onclick = (event) => {
      event.preventDefault();
      window.focus();
      notification.close();
      if (onClick) {
        onClick();
      }
    };

    return notification;
  } catch (err) {
    console.error("Error showing system notification:", err);
    return null;
  }
}
