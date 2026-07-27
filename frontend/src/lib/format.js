// Shared pure display/formatting helpers.
// Centralized here to remove copy-pasted duplicates across components.

// Format a number as a USD money string, e.g. 12 -> "$12.00".
export const money = (n) => `$${(Number(n) || 0).toFixed(2)}`;

// Format a 24-hour "HH:MM[:SS]" time string as 12-hour, e.g. "14:30" -> "2:30 PM".
export const formatTime = (time) => {
  if (!time || typeof time !== 'string' || !time.includes(':')) return '';
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
};

// Parse a "YYYY-MM-DD" string as a LOCAL date (not UTC). Returns null if empty.
export const parseLocalDate = (dateString) => {
  if (!dateString) return null;
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
};

// Format a "YYYY-MM-DD" (or ISO timestamp) string as e.g. "Mon, Jan 5, 2026".
export const formatDate = (date) => {
  if (!date) return '';
  let dateStr = date;
  // If date is a timestamp, extract the date part
  if (dateStr.includes('T')) {
    dateStr = dateStr.split('T')[0];
  }
  // Parse as local date
  const [year, month, day] = dateStr.split('-').map(Number);
  if (!year || !month || !day) return date; // fallback for invalid
  const localDate = new Date(year, month - 1, day);
  return localDate.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

// Canonical booking-status palette — single source of truth for both the
// admin list and the calendar. Chip = bg-status-X/15 text-status-X border-status-X/40.
//   confirmed = cyan · completed = green · cancelled = red · no_show = amber · pending = slate
export const getStatusColor = (status) => {
  switch (status) {
    case 'confirmed':
      return 'bg-status-confirmed/15 text-status-confirmed border-status-confirmed/40';
    case 'completed':
      return 'bg-status-completed/15 text-status-completed border-status-completed/40';
    case 'cancelled':
      return 'bg-status-cancelled/15 text-status-cancelled border-status-cancelled/40';
    case 'no_show':
      return 'bg-status-noshow/15 text-status-noshow border-status-noshow/40';
    case 'pending':
    default:
      return 'bg-status-pending/15 text-status-pending border-status-pending/40';
  }
};

// Solid dot color for a status (calendar dots / legend swatches).
export const getStatusDot = (status) => {
  switch (status) {
    case 'confirmed':
      return 'bg-status-confirmed';
    case 'completed':
      return 'bg-status-completed';
    case 'cancelled':
      return 'bg-status-cancelled';
    case 'no_show':
      return 'bg-status-noshow';
    case 'pending':
    default:
      return 'bg-status-pending';
  }
};
