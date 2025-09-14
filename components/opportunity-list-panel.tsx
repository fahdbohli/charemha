"use client"

import React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { RefreshCw, Trophy, AlertTriangle } from "lucide-react"
import { AnimatedModalOpportunity } from "./animated-modal-opportunity"
import type { MatchGroup, Opportunity } from "../types/arbitrage"
import type { OpportunityChange } from "../utils/opportunity-tracker"

interface OpportunityListPanelProps {
  allOpportunities: Opportunity[]
  displayedOpportunity?: Opportunity
  selectedOpportunity: Opportunity | null
  setSelectedOpportunity: (opportunity: Opportunity) => void
  opportunityDurations: Record<string, string>
  changes: OpportunityChange[]
  showNoOpportunitiesMessage: boolean
  onOddClick: (url: string) => void
  modalAutoRefresh: boolean
  handleModalAutoRefreshChange: (enabled: boolean) => void
  modalRefreshDelay: number
  handleModalRefreshDelayChange: (delay: number) => void
}

export function OpportunityListPanel({
  allOpportunities,
  displayedOpportunity,
  selectedOpportunity,
  setSelectedOpportunity,
  opportunityDurations,
  changes,
  showNoOpportunitiesMessage,
  onOddClick,
  modalAutoRefresh,
  handleModalAutoRefreshChange,
  modalRefreshDelay,
  handleModalRefreshDelayChange,
}: OpportunityListPanelProps) {
  const refreshDelayOptions = [
    { value: 1000, label: "1s" },
    { value: 2000, label: "2s" },
    { value: 5000, label: "5s" },
    { value: 10000, label: "10s" },
  ]

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <h3 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
          <Trophy className="h-4 w-4 text-purple-400" />
          Arbitrage Opportunities
        </h3>

        <Card className="bg-slate-800/30 border-slate-700/50">
          <CardContent className="p-2">
            <div className="flex items-center gap-3">
              <div className="flex items-center space-x-2">
                <RefreshCw className={`h-3 w-3 text-emerald-400 ${modalAutoRefresh ? "animate-spin" : ""}`} />
                <Switch
                  id="modal-auto-refresh"
                  checked={modalAutoRefresh}
                  onCheckedChange={handleModalAutoRefreshChange}
                  className="scale-75"
                />
                <Label htmlFor="modal-auto-refresh" className="text-slate-300 text-xs">
                  Auto-refresh
                </Label>
              </div>

              {modalAutoRefresh && (
                <div className="flex items-center gap-1">
                  <Select
                    value={modalRefreshDelay.toString()}
                    onValueChange={(value) => handleModalRefreshDelayChange(Number(value))}
                  >
                    <SelectTrigger className="w-14 h-6 bg-slate-700/50 border-slate-600 text-slate-200 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-600">
                      {refreshDelayOptions.map((option) => (
                        <SelectItem
                          key={option.value}
                          value={option.value.toString()}
                          className="text-slate-200 focus:bg-slate-700 text-xs"
                        >
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 space-y-3">
        {showNoOpportunitiesMessage ? (
          <Card className="bg-red-900/20 border-red-500/50">
            <CardContent className="p-6 text-center">
              <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
              <h4 className="text-lg font-semibold text-red-200 mb-2">
                No Arbitrage Opportunities Available
              </h4>
              <p className="text-red-300 text-sm">
                All arbitrage opportunities for this match have disappeared due to odds changes. Please check other opportunities or wait for new ones to appear.
              </p>
            </CardContent>
          </Card>
        ) : (
          allOpportunities.map((opportunity) => {
            const isDisplayedInMainList = displayedOpportunity?.unique_id === opportunity.unique_id

            return (
              <AnimatedModalOpportunity
                key={opportunity.unique_id}
                opportunity={opportunity}
                isDisplayedInMainList={isDisplayedInMainList}
                isSelected={selectedOpportunity?.unique_id === opportunity.unique_id}
                onClick={() => setSelectedOpportunity(opportunity)}
                onOddClick={onOddClick}
                changes={changes}
                durationText={opportunityDurations[opportunity.unique_id] || "Active for 0s"}
              />
            )
          })
        )}
      </div>
    </div>
  )
}