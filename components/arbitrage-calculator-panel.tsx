"use client"

import React, { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calculator, RotateCcw, TrendingUp, TrendingDown, Pin } from "lucide-react" // Added Pin icon
import type { Opportunity } from "../types/arbitrage"
import { getComplementarySetLabel, getOddLabel } from "../utils/arbitrage-label-helpers" // Updated import
import { calculateArbitrage, type ArbitrageCalculation } from "../utils/arbitrage-calculator"
import { useCachedLogo } from "../utils/logo-cache"
import type { OpportunityChange } from "../utils/opportunity-tracker"
import { useArbitrageLabels } from "../hooks/use-arbitrage-labels" // New import

interface ArbitrageCalculatorPanelProps {
  selectedOpportunity: Opportunity | null
  changes: OpportunityChange[]
  showNoOpportunitiesMessage: boolean
  totalStakeValue: number
  handleTotalStakeInputChange: (value: string) => void
  totalStakeInput: string
  handleStakeFocus: (e: React.FocusEvent<HTMLInputElement>) => void
  handleStakeKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void
  individualStakes: Record<string, number>
  handleIndividualStakeChange: (oddKey: string, value: string) => void
  individualStakeInputs: Record<string, string>
  handleCustomStakeFocus: (e: React.FocusEvent<HTMLInputElement>) => void
  handleCustomStakeKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void
  optimalStakesForReset: Record<string, number>
  handleResetStakes: () => void
  calculation: ArbitrageCalculation | null
  roundingOption: number
  setRoundingOption: (value: number) => void
  formatNumberForDisplay: (num: number) => string
  getMatchUrl: (opportunity: Opportunity, source: string) => string
  setActiveRoundingOption: (value: number) => void // New prop to control active rounding
  setHasManualOverride: (value: boolean) => void // New prop to control manual override
  setTotalStakeValue: (value: number) => void // New prop to update total stake value
  setTotalStakeInput: (value: string) => void // New prop to update total stake input
  handleFixBet: (fixedOddKey: string) => void; // NEW: Add handleFixBet prop
}

export function ArbitrageCalculatorPanel({
  selectedOpportunity,
  changes,
  showNoOpportunitiesMessage,
  totalStakeValue,
  handleTotalStakeInputChange,
  totalStakeInput,
  handleStakeFocus,
  handleStakeKeyDown,
  individualStakes,
  handleIndividualStakeChange,
  individualStakeInputs,
  handleCustomStakeFocus,
  handleCustomStakeKeyDown,
  optimalStakesForReset,
  handleResetStakes,
  calculation,
  roundingOption,
  setRoundingOption,
  formatNumberForDisplay,
  getMatchUrl,
  setActiveRoundingOption, // Destructure new prop
  setHasManualOverride, // Destructure new prop
  setTotalStakeValue, // Destructure new prop
  setTotalStakeInput, // Destructure new prop
  handleFixBet, // NEW: Destructure handleFixBet
}: ArbitrageCalculatorPanelProps) {
  const { labels } = useArbitrageLabels(); // Use the new hook

  // Cached SourceIcon component - no more flickering!
  // Modified to accept a size prop for flexibility
  const SourceIcon = ({ source, size = "default" }: { source: string; size?: "default" | "small" }) => {
    const showLogo = useCachedLogo(source)

    // Adjusted iconClasses for 'small' size
    const iconClasses = size === "small" ? "w-11 h-11" : "w-12 h-12"; 
    const textClasses = size === "small" ? "text-xs px-1 py-0.5" : "text-xs px-2 py-1";

    return (
      <div className={`flex items-center justify-center ${iconClasses}`}>
        {showLogo ? (
          <img src={`/icons/${source}.png`} alt={source} className={`object-contain ${iconClasses}`} />
        ) : (
          <span className={`text-slate-400 bg-slate-800/60 rounded whitespace-nowrap ${textClasses}`}>{source}</span>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <h3 className="text-lg font-semibold text-slate-200 flex items-center gap-2 mb-4 flex-shrink-0">
        <Calculator className="h-4 w-4 text-emerald-400" />
        Arbitrage Calculator
      </h3>

      <div className="flex-1 overflow-y-auto pr-2">
        {selectedOpportunity && calculation ? (
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-slate-200 text-base text-center">
                {getComplementarySetLabel(selectedOpportunity.complementary_set, labels)} {/* Pass labels */}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Card className="bg-slate-700/30 border-slate-600/50 p-3">
                  <div className="text-xs text-slate-400 mb-1">Total Stake</div>
                  <Input
                    type="text"
                    value={totalStakeInput}
                    onChange={(e) => handleTotalStakeInputChange(e.target.value)}
                    onFocus={handleStakeFocus}
                    onKeyDown={handleStakeKeyDown}
                    className="bg-slate-600/50 border-slate-500 text-slate-200 text-center font-bold text-lg h-8 p-1"
                  />
                  <div className="text-xs text-slate-400 mt-1">TND</div>
                </Card>

                <Card className="bg-slate-700/30 border-slate-600/50 p-3">
                  <div className="text-xs text-slate-400 mb-1">Guaranteed Profit</div>
                  <div
                    className={`text-lg font-bold flex items-center justify-center gap-1 transition-all duration-300 ${
                      calculation.profit >= 0 ? "text-emerald-400" : "text-red-400"
                    } ${
                      changes.some(
                        (c) =>
                          c.id === selectedOpportunity.unique_id &&
                          (c.type === "profit_increase" || c.type === "profit_decrease"),
                      )
                        ? "scale-110"
                        : ""
                    }`}
                  >
                    {calculation.profit >= 0 ? (
                      <TrendingUp className="h-4 w-4" />
                    ) : (
                      <TrendingDown className="h-4 w-4" />
                    )}
                    {formatNumberForDisplay(calculation.profit)} TND
                  </div>
                  <div
                    className={`text-xs text-center ${calculation.profit >= 0 ? "text-emerald-300" : "text-red-300"}`}
                  >
                    ({formatNumberForDisplay(calculation.profitPercentage)}%)
                  </div>
                </Card>
              </div>

              <Separator className="bg-slate-700" />

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-slate-300 text-xs">Round to nearest:</Label>
                  <Select
                    value={roundingOption.toString()}
                    onValueChange={(value) => setRoundingOption(Number(value))}
                  >
                    <SelectTrigger className="bg-slate-700/50 border-slate-600 text-slate-200 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-600">
                      <SelectItem value="1" className="text-slate-200 text-xs">
                        1 TND
                      </SelectItem>
                      <SelectItem value="5" className="text-slate-200 text-xs">
                        5 TND
                      </SelectItem>
                      <SelectItem value="10" className="text-slate-200 text-xs">
                        10 TND
                      </SelectItem>
                      <SelectItem value="20" className="text-slate-200 text-xs">
                        20 TND
                      </SelectItem>
                      <SelectItem value="50" className="text-slate-200 text-xs">
                        50 TND
                      </SelectItem>
                      <SelectItem value="100" className="text-slate-200 text-xs">
                        100 TND
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-slate-300 text-xs">Actions:</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleResetStakes}
                    className="h-8 px-2 text-xs bg-slate-700/50 border-slate-600 hover:bg-slate-600/50 text-slate-200 w-full"
                  >
                    <RotateCcw className="h-3 w-3 mr-1" />
                    Round
                  </Button>
                </div>
              </div>

              <Separator className="bg-slate-700" />

              <div className="space-y-2">
                <h4 className="text-xs font-medium text-slate-300">Betting Amounts</h4>
                <div className="grid gap-6">
                  {Object.entries(selectedOpportunity.best_odds).map(([oddKey, oddInfo]) => (
                    <div key={oddKey} className="grid grid-cols-[minmax(0,1fr)_140px_auto_auto] gap-4 items-center">
                      <Label className="text-slate-400 text-xs">{getOddLabel(oddKey, labels)}</Label> {/* Pass labels */}
                      <Input
                        type="number"
                        step={roundingOption}
                        min={0}
                        value={individualStakeInputs[oddKey] || "0"}
                        onChange={(e) => handleIndividualStakeChange(oddKey, e.target.value)}
                        onFocus={handleCustomStakeFocus}
                        onKeyDown={handleCustomStakeKeyDown}
                        className={`bg-slate-700/50 border-slate-600 text-slate-200 h-7 text-xs transition-all duration-300 mx-auto ${
                          changes.some(
                            (c) =>
                              c.id === selectedOpportunity.unique_id &&
                              (c.type === "profit_increase" || c.type === "profit_decrease"),
                          )
                            ? "ring-2 ring-blue-400/50"
                            : ""
                        }`}
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7 bg-slate-700/50 border-slate-600 hover:bg-slate-600/50 text-slate-200"
                        onClick={() => handleFixBet(oddKey)}
                        title="Fix this bet and calculate others"
                      >
                        <Pin className="h-3 w-3" />
                      </Button>
                      <SourceIcon source={oddInfo.source} size="small" />
                    </div>
                  ))}
                </div>
              </div>

              <Separator className="bg-slate-700" />

              <div className="space-y-3">
                <h5 className="text-xs font-medium text-slate-300">Outcome Scenarios</h5>
                <div className="space-y-2">
                  {Object.entries(calculation.outcomes).map(([key, outcome]: [string, any]) => (
                    <Card key={key} className="bg-slate-700/20 border-slate-600/30 p-2">
                      <div className="flex justify-between items-start mb-2">
                        <div className="text-xs font-medium text-slate-200 capitalize">
                          {outcome.description}
                        </div>
                        <SourceIcon source={outcome.source} />
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <div className="text-slate-400">Stake</div>
                          <div className="text-slate-200 font-medium">{formatNumberForDisplay(outcome.stake)}</div>
                        </div>
                        <div>
                          <div className="text-slate-400">Winnings</div>
                          <div className="text-slate-200 font-medium">{formatNumberForDisplay(outcome.winnings)}</div>
                        </div>
                        <div>
                          <div className="text-slate-400">Net Result</div>
                          <div
                            className={`font-bold ${outcome.result >= 0 ? "text-emerald-400" : "text-red-400"}`}
                          >
                            {outcome.result >= 0 ? "+" : ""}
                            {formatNumberForDisplay(outcome.result)}
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ) : showNoOpportunitiesMessage ? (
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-6 text-center">
              <Calculator className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-400">No arbitrage opportunity available for calculation.</p>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  )
}