"use client"

import React from "react"
import { DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Calendar, Clock, MapPin, Trophy, Info } from "lucide-react"
import type { MatchGroup, Opportunity } from "../types/arbitrage"
import { getTournamentName } from "../utils/arbitrage-label-helpers" // Updated import
import { useArbitrageLabels } from "../hooks/use-arbitrage-labels" // New import

interface MatchDetailsHeaderProps {
  matchGroup: MatchGroup | null
  originalGroupId: string
  groupIdChanged: boolean
  selectedOpportunity: Opportunity | null // Add this new prop
}

export function MatchDetailsHeader({ matchGroup, originalGroupId, groupIdChanged, selectedOpportunity }: MatchDetailsHeaderProps) {
  const { labels } = useArbitrageLabels(); // Use the new hook

  if (!matchGroup) {
    return (
      <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-700 bg-gradient-to-br from-slate-800/95 to-slate-900/95 flex-shrink-0">
        <DialogTitle className="text-2xl font-bold text-slate-100 pr-8">Match Not Found</DialogTitle>
      </DialogHeader>
    )
  }

  return (
    <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-700 bg-gradient-to-br from-slate-800/95 to-slate-900/95 flex-shrink-0">
      <DialogTitle className="text-2xl font-bold text-slate-100 pr-8">
        {matchGroup.home_team} vs {matchGroup.away_team}
      </DialogTitle>

      {groupIdChanged && (
        <div className="flex items-center gap-2 text-sm text-blue-300 bg-blue-900/20 px-3 py-2 rounded-lg border border-blue-500/30">
          <Info className="h-4 w-4" />
          <span>
            Match data updated - Group ID changed from{" "}
            <code className="bg-slate-700 px-1 rounded text-xs">{originalGroupId}</code> to{" "}
            <code className="bg-slate-700 px-1 rounded text-xs">{matchGroup.group_id}</code>
          </span>
        </div>
      )}

      <div className="flex items-center gap-4 text-sm text-slate-400 mt-2">
        <div className="flex items-center gap-1">
          <MapPin className="h-3 w-3 text-blue-400" />
          {matchGroup.country}
        </div>
        <div className="flex items-center gap-1">
          <Trophy className="h-3 w-3 text-purple-400" />
          {getTournamentName(selectedOpportunity || matchGroup, labels)} {/* Pass labels */}
        </div>
        <div className="flex items-center gap-1">
          <Calendar className="h-3 w-3 text-emerald-400" />
          {matchGroup.date}
        </div>
        <div className="flex items-center gap-1">
          <Clock className="h-3 w-3 text-blue-400" />
          {matchGroup.time}
        </div>
      </div>
    </DialogHeader>
  )
}