// utils/opportunity-duration.ts
type Subscriber = (displayText: string, elapsedMs: number) => void

interface TrackerEntry {
  startTs: number
  subscribers: Set<Subscriber>
  timerId?: NodeJS.Timeout
}

/** Parse "X seconds", "Y minutes", "Z hours" or "Xs", "Ym", "Zh" into elapsed ms */
function parseInitialDuration(dur: string): number {
  if (!dur || typeof dur !== "string") return 0

  // Try to match formats like "34 seconds", "5 minutes", "1 hour", or "34s", "5m", "1h"
  const match = dur.match(/(\d+)\s*(second|minute|hour|s|m|h)/i)
  if (!match) {
    // Fallback for just a number, assume seconds (e.g., "34")
    const numberMatch = dur.match(/(\d+)/)
    if (numberMatch) {
      return Number.parseInt(numberMatch[1], 10) * 1000 // Convert to ms
    }
    return 0
  }

  const value = Number.parseInt(match[1], 10)
  const unitStr = match[2].toLowerCase()

  let ms = 0
  if (unitStr.startsWith("s")) { // "second" or "s"
    ms = value * 1_000
  } else if (unitStr.startsWith("m")) { // "minute" or "m"
    ms = value * 60_000
  } else if (unitStr.startsWith("h")) { // "hour" or "h"
    ms = value * 3_600_000
  }
  return ms
}

/** Format only the largest unit */
function formatDuration(ms: number): string {
  if (ms < 60_000) {
    const s = Math.floor(ms / 1_000)
    return `Active for ${s}s`
  }
  if (ms < 3_600_000) {
    const m = Math.floor(ms / 60_000)
    return `Active for ${m}m`
  }
  const h = Math.floor(ms / 3_600_000)
  return `Active for ${h}h`
}

export class DurationTracker {
  private entries = new Map<string, TrackerEntry>()

  /** (Re)start tracking for this ID using its raw JSON duration */
  trackOpportunity(id: string, initialDur: string) {
    const elapsed = parseInitialDuration(initialDur)
    const now = Date.now()
    const entry = this.entries.get(id)
    if (entry) {
      // refresh existing startTs
      entry.startTs = now - elapsed
      return
    }
    // new entry
    const newEntry: TrackerEntry = {
      startTs: now - elapsed,
      subscribers: new Set(),
    }
    this.entries.set(id, newEntry)
  }

  subscribe(id: string, cb: Subscriber) {
    const entry = this.entries.get(id)
    if (!entry) return
    entry.subscribers.add(cb)

    if (!entry.timerId) {
      entry.timerId = setInterval(() => {
        const now = Date.now()
        const elapsed = now - entry.startTs
        const txt = formatDuration(elapsed)
        for (const sub of entry.subscribers) sub(txt, elapsed)
      }, 1_000)
    }
    // fire immediately
    const initialElapsed = Date.now() - entry.startTs
    cb(formatDuration(initialElapsed), initialElapsed)
  }

  unsubscribe(id: string, cb: Subscriber) {
    const entry = this.entries.get(id)
    if (!entry) return
    entry.subscribers.delete(cb)
    if (entry.subscribers.size === 0) {
      // Clear the timer but keep the entry data for when components mount again
      if (entry.timerId) {
        clearInterval(entry.timerId)
        entry.timerId = undefined
      }
      // DON'T delete the entry - keep the startTs so filtering works correctly
    }
  }

  /** One-off read (no subscription) */
  getOpportunityDuration(id: string): { displayText: string; isNew: boolean } {
    const entry = this.entries.get(id)
    if (!entry) return { displayText: "Active for 0s", isNew: true }
    const elapsed = Date.now() - entry.startTs
    return {
      displayText: formatDuration(elapsed),
      isNew: elapsed < 10000, // New if less than 10 seconds
    }
  }

  /** Batch (re)sync from JSON data */
  updateOpportunities(list: { unique_id: string; activity_duration: string }[]) {
    list.forEach(({ unique_id, activity_duration }) => this.trackOpportunity(unique_id, activity_duration))
  }

  /** Clean up entries that are no longer in the current data set */
  cleanupStaleEntries(currentIds: Set<string>) {
    for (const [id, entry] of this.entries) {
      if (!currentIds.has(id)) {
        // Only remove entries that are truly stale (not in current data)
        if (entry.timerId) {
          clearInterval(entry.timerId)
        }
        this.entries.delete(id)
      }
    }
  }

  reset() {
    for (const entry of this.entries.values()) {
      if (entry.timerId) clearInterval(entry.timerId)
    }
    this.entries.clear()
  }

  // Debug method to see current state
  getDebugInfo(): any {
    return {
      trackedOpportunities: Array.from(this.entries.keys()),
      activeTimers: Array.from(this.entries.entries())
        .filter(([, entry]) => entry.timerId)
        .map(([id]) => id),
      subscribersCount: Array.from(this.entries.entries()).map(([id, entry]) => [id, entry.subscribers.size]),
    }
  }
}

export const durationTracker = new DurationTracker()

// Keep backward compatibility types
export interface OpportunityDurationData {
  duration: number
  unit: "seconds" | "minutes" | "hours"
  displayText: string
}

// Legacy functions for backward compatibility
export const calculateOpportunityDuration = (
  activityDuration?: string,
): {
  duration: number
  unit: "seconds" | "minutes" | "hours"
  displayText: string
} => {
  if (!activityDuration || typeof activityDuration !== "string") {
    return { duration: 0, unit: "seconds", displayText: "Active for 0s" }
  }

  const match = activityDuration.match(/(\d+)\s*(second|minute|hour|s|m|h)/i)
  if (!match) {
    const numberMatch = activityDuration.match(/(\d+)/)
    if (numberMatch) {
      const duration = Number.parseInt(numberMatch[1])
      return { duration, unit: "seconds", displayText: `Active for ${duration}s` }
    }
    return { duration: 0, unit: "seconds", displayText: "Active for 0s" }
  }

  const duration = Number.parseInt(match[1])
  const unitStr = match[2].toLowerCase()

  let unit: "seconds" | "minutes" | "hours"
  let unitLabel: string

  if (unitStr.startsWith("s") || unitStr === "second") {
    unit = "seconds"
    unitLabel = "s"
  } else if (unitStr.startsWith("m") || unitStr === "minute") {
    unit = "minutes"
    unitLabel = "m"
  } else if (unitStr.startsWith("h") || unitStr === "hour") {
    unit = "hours"
    unitLabel = "h"
  } else {
    unit = "seconds"
    unitLabel = "s"
  }

  return {
    duration,
    unit,
    displayText: `Active for ${duration}${unitLabel}`,
  }
}

export const getOpportunityDurationInSeconds = (activityDuration?: string): number => {
  if (!activityDuration || typeof activityDuration !== "string") return 0

  const match = activityDuration.match(/(\d+)\s*(second|minute|hour|s|m|h)/i)
  if (!match) {
    const numberMatch = activityDuration.match(/(\d+)/)
    if (numberMatch) {
      return Number.parseInt(numberMatch[1])
    }
    return 0
  }

  const duration = Number.parseInt(match[1])
  const unitStr = match[2].toLowerCase()

  if (unitStr.startsWith("s") || unitStr === "second") {
    return duration
  } else if (unitStr.startsWith("m") || unitStr === "minute") {
    return duration * 60
  } else if (unitStr.startsWith("h") || unitStr === "hour") {
    return duration * 3600
  } else {
    return duration
  }
}