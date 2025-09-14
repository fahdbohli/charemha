"use client"

import { useState, useEffect } from "react"
import type { MatchGroup } from "../types/arbitrage"
import { AnimatedOpportunityCard } from "./animated-opportunity-card"
import { opportunityTracker, type OpportunityChange } from "../utils/opportunity-tracker"

interface AnimatedOpportunityListProps {
  data: (MatchGroup & { selectedOpportunity: any })[]
  onMatchClick: (matchGroup: MatchGroup & { selectedOpportunity: any }) => void
  autoRefresh: boolean
  refreshDelay: number
}

export function AnimatedOpportunityList({
  data,
  onMatchClick,
  autoRefresh,
  refreshDelay,
}: AnimatedOpportunityListProps) {
  const [changes, setChanges] = useState<OpportunityChange[]>([])
  const [displayData, setDisplayData] = useState(data)

  useEffect(() => {
    const newChanges = opportunityTracker.trackChanges(data)
    setChanges(newChanges)

    // Update display data with a slight delay for animations
    if (newChanges.length > 0) {
      setTimeout(() => {
        setDisplayData(data)
      }, 100)
    } else {
      setDisplayData(data)
    }

    // Clear changes after animation duration
    setTimeout(() => {
      setChanges([])
    }, 3000)
  }, [data])

  return (
    <div className="grid gap-4 opportunity-list">
      {displayData.map((matchGroup, index) => (
        <AnimatedOpportunityCard
          key={matchGroup.selectedOpportunity.unique_id}
          matchGroup={matchGroup}
          onClick={() => onMatchClick(matchGroup)}
          autoRefresh={autoRefresh}
          refreshDelay={refreshDelay}
          changes={changes}
          index={index}
        />
      ))}
    </div>
  )
}
