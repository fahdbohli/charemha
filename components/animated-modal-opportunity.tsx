"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, Clock4, Sparkles } from "lucide-react"
import type { Opportunity } from "../types/arbitrage"
import { getComplementarySetLabel, getOddLabel } from "../utils/arbitrage-label-helpers" // Updated import
import type { OpportunityChange } from "../utils/opportunity-tracker"
import { durationTracker } from "../utils/opportunity-duration"
import { useOpportunityDuration } from "../hooks/useOpportunityDuration"
import { useCachedLogo } from "../utils/logo-cache"
import { useArbitrageLabels } from "../hooks/use-arbitrage-labels" // New import

interface AnimatedModalOpportunityProps {
  opportunity: Opportunity
  isDisplayedInMainList: boolean
  isSelected: boolean
  onClick: () => void
  onOddClick: (url: string) => void
  changes: OpportunityChange[]
  durationText: string // This prop is now unused but kept for compatibility
}

export function AnimatedModalOpportunity({
  opportunity,
  isDisplayedInMainList,
  isSelected,
  onClick,
  onOddClick,
  changes,
}: AnimatedModalOpportunityProps) {
  const [showProfitAnimation, setShowProfitAnimation] = useState<"increase" | "decrease" | null>(null)
  // Removed showOddsAnimation state as it's no longer needed for this effect.

  const opportunityId = opportunity.unique_id

  // Use the new hook for live duration updates
  const { displayText, isNew } = useOpportunityDuration(opportunityId)
  const { labels } = useArbitrageLabels(); // Use the new hook

  // Track this opportunity when component mounts or data changes
  useEffect(() => {
    if (opportunity.activity_duration) {
      durationTracker.trackOpportunity(opportunityId, opportunity.activity_duration)
    }
  }, [opportunityId, opportunity.activity_duration])

  useEffect(() => {
    const relevantChanges = changes.filter((change) => change.id === opportunityId)

    relevantChanges.forEach((change) => {
      switch (change.type) {
        case "profit_increase":
          setShowProfitAnimation("increase")
          setTimeout(() => {
            setShowProfitAnimation(null)
          }, 3000) // Increased duration to 3 seconds
          break
        case "profit_decrease":
          setShowProfitAnimation("decrease")
          setTimeout(() => {
            setShowProfitAnimation(null)
          }, 3000) // Increased duration to 3 seconds
          break
      }
    })
  }, [changes, opportunityId])

  // Cached SourceIcon component - no more flickering!
  const SourceIcon = ({ source }: { source: string }) => {
    const showLogo = useCachedLogo(source)

    return (
      <div className="flex items-center justify-center w-12 h-12">
        {showLogo ? (
          <img src={`/icons/${source}.png`} alt={source} className="w-12 h-12 object-contain" />
        ) : (
          <span className="text-xs text-slate-400 px-2 py-1 bg-slate-800/60 rounded whitespace-nowrap">{source}</span>
        )}
      </div>
    )
  }

  return (
    <Card
      className={`cursor-pointer transition-all duration-200 flex-shrink-0 relative ${
        isSelected ? "border-blue-500 bg-blue-500/10" : "border-slate-700 hover:border-slate-600 bg-slate-800/50"
      } ${isDisplayedInMainList ? "ring-2 ring-emerald-500/30" : ""} ${
        isNew ? "ring-2 ring-yellow-400/50 shadow-lg shadow-yellow-400/20" : ""
      }`}
      onClick={onClick}
    >
      {/* New Opportunity Glow Effect */}
      {isNew && (
        <div className="absolute inset-0 rounded-lg pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/10 via-orange-400/10 to-yellow-400/10 rounded-lg animate-pulse" />
        </div>
      )}

      {/* Profit Change Animation Overlay */}
      {showProfitAnimation && (
        <div
          className={`absolute inset-0 rounded-lg pointer-events-none z-10 flex items-center justify-center transition-opacity duration-3000 ${
            showProfitAnimation === "increase"
              ? "bg-emerald-500/10 border-2 border-emerald-400/20"
              : "bg-red-500/10 border-2 border-red-400/20"
          }`}
          style={{
            animation: "profitPulse 3s ease-out",
          }}
        >
          {/* Removed the inner div with text and icon */}
        </div>
      )}

      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-purple-600/20 text-purple-200">
              {getComplementarySetLabel(opportunity.complementary_set, labels)} {/* Pass labels */}
            </Badge>
            {isDisplayedInMainList && (
              <Badge variant="secondary" className="bg-emerald-600/20 text-emerald-200 text-xs">
                Main List
              </Badge>
            )}
            {/* Moved NEW badge to the left side with other badges */}
            {isNew && (
              <Badge variant="secondary" className="bg-yellow-600/20 text-yellow-200 text-xs flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                NEW
              </Badge>
            )}
          </div>
          <div className="text-right">
            <div
              className={`text-xs flex items-center gap-1 ${isNew ? "text-yellow-400 font-medium" : "text-orange-400"}`}
            >
              <Clock4 className="h-3 w-3" />
              {displayText}
            </div>
          </div>
        </div>

        <div className="flex gap-4 justify-center">
          {Object.entries(opportunity.best_odds).map(([oddKey, oddInfo]) => {
            const isMisvalued = oddInfo.source === opportunity.misvalue_source;
            console.log(`[ModalOpportunity] Odd Source: ${oddInfo.source}, Misvalue Source: ${opportunity.misvalue_source}, Is Misvalued: ${isMisvalued}`);
            return (
              <button
                key={oddKey}
                onClick={(e) => {
                  e.stopPropagation()
                  const urlKey = `${oddInfo.source}_match_url`
                  const url = opportunity[urlKey] || `https://google.com/search?q=${oddKey}+${oddInfo.source}`
                  onOddClick(url)
                }}
                className={`flex flex-col items-center p-2 bg-slate-700/50 hover:bg-slate-600/50 rounded border border-slate-600/40 hover:border-slate-500/60 transition-all duration-200 min-w-[80px] ${
                  isNew ? "ring-1 ring-yellow-400/30" : ""
                } ${isMisvalued ? "misvalued-odd-effect" : ""}`}
              >
                <div className="text-xs text-slate-400 mb-1">{getOddLabel(oddKey, labels)}</div> {/* Pass labels */}
                <div className="text-sm font-bold text-slate-100">{oddInfo.value}</div>
                <div className="flex items-center justify-center min-h-[48px]">
                  <SourceIcon source={oddInfo.source} />
                </div>
              </button>
            )
          })}
        </div>

        <div className="flex justify-between items-end mt-2">
          <div className="text-xs text-slate-500">Sources: {opportunity.arbitrage_sources}</div>
          <div
            className={`text-lg font-bold text-emerald-400 transition-all duration-300 ${
              showProfitAnimation ? "" : "" // Removed scale-110
            }`}
          >
            {((1 - opportunity.arbitrage_percentage) * 100).toFixed(2)}%
          </div>
        </div>
      </CardContent>
    </Card>
  )
}