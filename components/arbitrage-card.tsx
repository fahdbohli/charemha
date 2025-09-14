"use client"
import { useEffect } from "react"
import type { MatchGroup } from "../types/arbitrage"
import { getComplementarySetLabel, getOddLabel, getTournamentName } from "../utils/arbitrage-label-helpers" // Updated import
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, Clock, MapPin, Trophy } from "lucide-react"
import { Clock4, Sparkles } from "lucide-react" // Removed TrendingUp, TrendingDown
import { durationTracker } from "../utils/opportunity-duration"
import { useOpportunityDuration } from "../hooks/useOpportunityDuration"
import { useCachedLogo } from "../utils/logo-cache"
import { useArbitrageLabels } from "../hooks/use-arbitrage-labels" // New import

interface ArbitrageCardProps {
  matchGroup: MatchGroup & { selectedOpportunity: any }
  onClick: () => void
  autoRefresh: boolean
  refreshDelay: number
  profitAnimationType: "increase" | "decrease" | null; // New prop
}

// Updated SourceIcon component using cached logo system
const SourceIcon = ({ source }: { source: string }) => {
  const showLogo = useCachedLogo(source)

  return (
    <div className="flex items-center justify-center">
      {showLogo ? (
        <img src={`/icons/${source}.png`} alt={source} className="w-8 h-8 object-contain" />
      ) : (
        <span className="text-xs text-slate-400 px-1 py-0.5 bg-slate-800/60 rounded">{source}</span>
      )}
    </div>
  )
}

export function ArbitrageCard({ matchGroup, onClick, autoRefresh, refreshDelay, profitAnimationType }: ArbitrageCardProps) {
  const { selectedOpportunity } = matchGroup

  // Use the new hook for live duration updates
  const { displayText, isNew } = useOpportunityDuration(selectedOpportunity.unique_id)
  const { labels } = useArbitrageLabels(); // Use the new hook

  // Track this opportunity when component mounts or data changes
  useEffect(() => {
    if (selectedOpportunity.activity_duration) {
      durationTracker.trackOpportunity(selectedOpportunity.unique_id, selectedOpportunity.activity_duration)
    }
  }, [selectedOpportunity.unique_id, selectedOpportunity.activity_duration])

  const getMatchUrl = (source: string): string => {
    const urlKey = `${source}_match_url`
    return (
      selectedOpportunity[urlKey] ||
      `https://google.com/search?q=${matchGroup.home_team}+vs+${matchGroup.away_team}+${source}`
    )
  }

  return (
    <Card
      className={`w-full border-slate-700/60 backdrop-blur-sm hover:border-slate-600/80 transition-all duration-300 hover:shadow-xl hover:shadow-slate-900/20 cursor-pointer relative ${
        isNew ? "ring-2 ring-yellow-400/50 shadow-lg shadow-yellow-400/20" : ""
      }`}
      style={{
        background: isNew
          ? "linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.95) 50%, rgba(15, 23, 42, 0.95) 100%)"
          : "linear-gradient(135deg, rgba(30, 41, 59, 0.5) 0%, rgba(15, 23, 42, 0.5) 100%)",
        willChange: "auto",
      }}
      onClick={onClick}
    >
      {/* New Opportunity Glow Effect */}
      {isNew && (
        <div className="absolute inset-0 rounded-lg pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/10 via-orange-400/10 to-yellow-400/10 rounded-lg animate-pulse" />
          <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 bg-yellow-400/20 rounded-full border border-yellow-400/30">
            <Sparkles className="h-3 w-3 text-yellow-400 animate-pulse" />
            <span className="text-xs text-yellow-200 font-medium">NEW</span>
          </div>
        </div>
      )}

      <CardContent className="p-4" style={{ position: "relative", zIndex: 1 }}>
        <div className="grid grid-cols-3 gap-6 items-center">
          {/* Left Block - Match Details */}
          <div className="space-y-2">
            <div className="text-lg font-semibold leading-relaxed text-slate-100">
              <div>{matchGroup.home_team}</div>
              <div>{matchGroup.away_team}</div>
            </div>
            <div className="space-y-1 text-sm text-slate-400">
              <div className="flex items-center gap-1">
                <MapPin className="h-3 w-3 text-blue-400" />
                {matchGroup.country}
              </div>
              <div className="flex items-center gap-1">
                <Trophy className="h-3 w-3 text-purple-400" />
                {getTournamentName(selectedOpportunity, labels)} {/* Pass labels */}
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3 text-emerald-400" />
                {matchGroup.date}
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3 text-blue-400" />
                {matchGroup.time}
              </div>
              <div className={`flex items-center gap-1 ${isNew ? "text-yellow-400 font-medium" : ""}`}>
                <Clock4 className={`h-3 w-3 ${isNew ? "text-yellow-400" : "text-orange-400"}`} />
                {displayText}
              </div>
            </div>
          </div>

          {/* Center Block - Odds */}
          <div className="flex flex-row gap-6 justify-center items-center">
            {Object.entries(selectedOpportunity.best_odds).map(([oddKey, oddInfo]) => {
              const isMisvalued = oddInfo.source === selectedOpportunity.misvalue_source;
              console.log(`[ArbitrageCard] Odd Source: ${oddInfo.source}, Misvalue Source: ${selectedOpportunity.misvalue_source}, Is Misvalued: ${isMisvalued}`);
              return (
                <button
                  key={oddKey}
                  onClick={(e) => {
                    e.stopPropagation()
                    const url = getMatchUrl(oddInfo.source)
                    window.open(url, "_blank")
                  }}
                  className={`flex flex-col items-center justify-center p-2 rounded-lg border border-slate-600/40 hover:border-slate-500/60 transition-all duration-200 hover:shadow-lg hover:shadow-slate-900/30 min-w-[100px] group backdrop-blur-sm ${
                    isNew ? "ring-1 ring-yellow-400/30" : ""
                  } ${isMisvalued ? "misvalued-odd-effect" : ""}`}
                  style={{
                    background: "linear-gradient(135deg, rgba(51, 65, 85, 0.5) 0%, rgba(30, 41, 59, 0.5) 100%)",
                    willChange: "auto",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background =
                      "linear-gradient(135deg, rgba(71, 85, 105, 0.6) 0%, rgba(51, 65, 85, 0.6) 100%)"
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background =
                      "linear-gradient(135deg, rgba(51, 65, 85, 0.5) 0%, rgba(30, 41, 59, 0.5) 100%)"
                  }}
                >
                  <div className="text-xs font-medium text-slate-400 mb-1 text-center group-hover:text-slate-200 transition-colors">
                    {getOddLabel(oddKey, labels)} {/* Pass labels */}
                  </div>
                  <div className="text-base font-bold mb-1 text-slate-100 group-hover:text-blue-300 transition-colors">
                    {oddInfo.value}
                  </div>
                  <div className="flex items-center justify-center px-2 py-1 bg-slate-800/60 rounded border border-slate-700/40 min-h-[32px]">
                    <SourceIcon source={oddInfo.source} />
                  </div>
                </button>
              )
            })}
          </div>

          {/* Right Block - Arbitrage Info */}
          <div className="text-right space-y-2">
            <Badge
              variant="secondary"
              className="mb-2 bg-gradient-to-r from-purple-600/20 to-blue-600/20 text-purple-200 border-purple-500/30"
            >
              {getComplementarySetLabel(selectedOpportunity.complementary_set, labels)} {/* Pass labels */}
            </Badge>
            <div className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-green-300 bg-clip-text text-transparent flex items-center justify-end gap-1">
              {/* Removed conditional rendering of TrendingUp/TrendingDown icons */}
              {((1 - selectedOpportunity.arbitrage_percentage) * 100).toFixed(2)}%
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}