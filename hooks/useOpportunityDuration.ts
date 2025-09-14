"use client"

import { useState, useEffect } from "react"
import { durationTracker } from "../utils/opportunity-duration"

export function useOpportunityDuration(opportunityId: string) {
  const [displayText, setDisplayText] = useState("Active for 0s")
  const [isNew, setIsNew] = useState(false)

  useEffect(() => {
    if (!opportunityId) return

    const cb = (text: string, elapsedMs: number) => {
      setDisplayText(text)
      // mark new if total elapsed < 10s
      setIsNew(elapsedMs < 10_000)
    }

    durationTracker.subscribe(opportunityId, cb)
    return () => {
      durationTracker.unsubscribe(opportunityId, cb)
    }
  }, [opportunityId])

  return { displayText, isNew }
}
