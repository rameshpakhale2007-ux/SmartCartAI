/**
 * Formats ISO date string to readable format e.g. "10 Oct 2026, 09:45 PM"
 */
export function formatDate(isoString, includeTime = false) {
  if (!isoString) return '—';
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '—';

    const dateOptions = { day: 'numeric', month: 'short', year: 'numeric' };
    if (includeTime) {
      dateOptions.hour = '2-digit';
      dateOptions.minute = '2-digit';
    }
    return date.toLocaleDateString('en-IN', dateOptions);
  } catch {
    return '—';
  }
}

/**
 * Returns human-readable relative time (e.g. "2 hours ago", "yesterday")
 */
export function formatRelativeTime(isoString) {
  if (!isoString) return '—';
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSec < 60) return 'Just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;
    return formatDate(isoString);
  } catch {
    return '—';
  }
}
