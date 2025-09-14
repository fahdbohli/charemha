"use client"

import { useState, useEffect, useRef } from "react"
import type { MatchGroup } from "../types/arbitrage"
import { ArbitrageCard } from "./arbitrage-card"
import type { OpportunityChange } from "../utils/opportunity-tracker"

interface AnimatedOpportunityCardProps {
  matchGroup: MatchGroup & { selectedOpportunity: any }
  onClick: () => void
  autoRefresh: boolean
  refreshDelay: number
  changes: OpportunityChange[]
  index: number
}

export function AnimatedOpportunityCard({
  matchGroup,
  onClick,
  autoRefresh,
  refreshDelay,
  changes,
  index,
}: AnimatedOpportunityCardProps) {
  const [showProfitAnimation, setShowProfitAnimation] = useState<"increase" | "decrease" | null>(null)
  const cardRef = useRef<HTMLDivElement>(null)

  const opportunityId = matchGroup.selectedOpportunity.unique_id

  useEffect(() => {
    const relevantChanges = changes.filter((change) => change.id === opportunityId)

    relevantChanges.forEach((change) => {
      switch (change.type) {
        case "profit_increase":
          setShowProfitAnimation("increase")
          setTimeout(() => setShowProfitAnimation(null), 3000) // Increased duration to 3 seconds
          break
        case "profit_decrease":
          setShowProfitAnimation("decrease")
          setTimeout(() => setShowProfitAnimation(null), 3000) // Increased duration to 3 seconds
          break
      }
    })
  }, [changes, opportunityId])

  return (
    <div ref={cardRef} className="relative">
      {/* Profit Change Animation Overlay */}
      {showProfitAnimation && (
        <div
          className={`absolute inset-0 rounded-lg pointer-events-none z-20 transition-opacity duration-3000 ${ // Increased duration here too
            showProfitAnimation === "increase"
              ? "bg-emerald-500/10 border-2 border-emerald-400/20" // Lowered opacity
              : "bg-red-500/10 border-2 border-red-400/20" // Lowered opacity
          }`}
          style={{
            animation: "profitPulse 3s ease-out", // Increased animation duration
          }}
        >
          {/* Removed the inner div with text and icon */}
        </div>
      )}

      <ArbitrageCard
        matchGroup={matchGroup}
        onClick={onClick}
        autoRefresh={autoRefresh}
        refreshDelay={refreshDelay}
        profitAnimationType={showProfitAnimation} // Pass the state down
      />
    </div>
  )
}