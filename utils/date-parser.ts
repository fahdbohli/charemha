/**
 * Parse date and time strings into a comparable timestamp
 * Handles formats like "23/06/2025" and "20:00"
 */
export function parseMatchDateTime(dateStr: string, timeStr: string): number {
  if (!dateStr || !timeStr) return 0

  try {
    // Handle DD/MM/YYYY format
    const dateParts = dateStr.split("/")
    if (dateParts.length !== 3) return 0

    const day = Number.parseInt(dateParts[0], 10)
    const month = Number.parseInt(dateParts[1], 10) - 1 // Month is 0-indexed in Date constructor
    const year = Number.parseInt(dateParts[2], 10)

    // Handle HH:MM format
    const timeParts = timeStr.split(":")
    if (timeParts.length !== 2) return 0

    const hours = Number.parseInt(timeParts[0], 10)
    const minutes = Number.parseInt(timeParts[1], 10)

    // Create date object and return timestamp
    const dateTime = new Date(year, month, day, hours, minutes)
    return dateTime.getTime()
  } catch (error) {
    console.warn(`Failed to parse date/time: ${dateStr} ${timeStr}`, error)
    return 0
  }
}

/**
 * Format a timestamp back to readable date/time for debugging
 */
export function formatDateTime(timestamp: number): string {
  if (!timestamp) return "Invalid date"
  return new Date(timestamp).toLocaleString()
}
