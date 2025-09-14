"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar, Clock, MapPin, Trophy, Calculator, RotateCcw, TrendingUp, TrendingDown } from "lucide-react"
import type { MatchGroup, Opportunity } from "../types/arbitrage"
import { getComplementarySetLabel, getOddLabel, getTournamentName } from "../utils/arbitrage-label-helpers" // Updated import
import { calculateArbitrage, type ArbitrageCalculation } from "../utils/arbitrage-calculator"
import { getStoredStake, setStoredStake } from "../utils/stake-storage"
import { Clock4 } from "lucide-react"
import { useDurationTracker } from "../hooks/use-duration-tracker"
import { useArbitrageLabels } from "../hooks/use-arbitrage-labels" // New import

interface MatchDetailsModalProps {
  matchGroup: MatchGroup | null
  isOpen: boolean
  onClose: () => void
  selectedSources: string[]
  displayedOpportunity?: Opportunity // The opportunity shown in the main list
  autoRefresh: boolean
  refreshDelay: number
}

export function MatchDetailsModal({
  matchGroup,
  isOpen,
  onClose,
  selectedSources,
  displayedOpportunity,
  autoRefresh,
  refreshDelay,
}: MatchDetailsModalProps) {
  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null)
  const [stake, setStake] = useState<number>(100)
  const [stakeInput, setStakeInput] = useState<string>("100")
  const [calculation, setCalculation] = useState<ArbitrageCalculation | null>(null)
  const [customStakes, setCustomStakes] = useState<Record<string, number>>({})
  const [customStakeInputs, setCustomStakeInputs] = useState<Record<string, string>>({})
  const [roundingOption, setRoundingOption] = useState<number>(1)
  const [originalCalculatedStakes, setOriginalCalculatedStakes] = useState<Record<string, number>>({})
  const [opportunityDurations, setOpportunityDurations] = useState<Record<string, string>>({})

  const durationTracker = useDurationTracker()
  const { labels } = useArbitrageLabels(); // Use the new hook

  useEffect(() => {
    const storedStake = getStoredStake()
    setStake(storedStake)
    setStakeInput(storedStake.toString())
  }, [])

  useEffect(() => {
    if (matchGroup && matchGroup.opportunities.length > 0) {
      // If we have a displayed opportunity from the main list, use it as default
      // Otherwise, use the first opportunity
      const defaultOpportunity = displayedOpportunity || matchGroup.opportunities[0]
      setSelectedOpportunity(defaultOpportunity)
    }
  }, [matchGroup, displayedOpportunity])

  // Update durations based on auto-refresh settings
  useEffect(() => {
    if (!matchGroup) return

    // Update the duration tracker with current opportunities
    durationTracker.updateOpportunities(
      matchGroup.opportunities.map((opp) => ({
        unique_id: opp.unique_id,
        activity_duration: opp.activity_duration,
      })),
    )

    const updateDurations = () => {
      const newDurations: Record<string, string> = {}
      matchGroup.opportunities.forEach((opp) => {
        const duration = durationTracker.getOpportunityDuration(opp.unique_id)
        newDurations[opp.unique_id] = duration.displayText
      })
      setOpportunityDurations(newDurations)
    }

    updateDurations()

    // Set up interval for real-time updates (every second for smooth timer)
    const interval = setInterval(updateDurations, 1000)
    return () => clearInterval(interval)
  }, [matchGroup])

  const roundToNearest = (value: number, roundTo: number): number => {
    return Math.round(value / roundTo) * roundTo
  }

  // Function to recalculate outcomes based on current stakes
  const recalculateOutcomes = (stakes: Record<string, number>) => {
    if (!selectedOpportunity) return null

    const totalCustomStake = Object.values(stakes).reduce((sum, s) => sum + s, 0)
    const outcomes: any = {}

    Object.entries(selectedOpportunity.best_odds).forEach(([key, oddInfo], index) => {
      const stakeForThisOdd = stakes[key] || 0
      const winnings = stakeForThisOdd * oddInfo.value
      const profit = winnings - totalCustomStake

      outcomes[`outcome${index + 1}`] = {
        description: key.replace("_odd", "").replace(/_/g, " "),
        result: profit,
        stake: stakeForThisOdd,
        winnings: winnings,
        odds: oddInfo.value,
        source: oddInfo.source,
      }
    })

    const minProfit = Math.min(...Object.values(outcomes).map((o: any) => o.result))

    const oddKeys = Object.keys(selectedOpportunity.best_odds)
    return {
      stake1: stakes[oddKeys[0]] || 0,
      stake2: stakes[oddKeys[1]] || 0,
      stake3: stakes[oddKeys[2]] || 0,
      totalStake: totalCustomStake,
      profit: minProfit,
      profitPercentage: totalCustomStake > 0 ? (minProfit / totalCustomStake) * 100 : 0,
      outcomes,
    }
  }

  useEffect(() => {
    if (selectedOpportunity) {
      const odds: Record<string, number> = {}
      Object.entries(selectedOpportunity.best_odds).forEach(([key, oddInfo]) => {
        odds[key] = oddInfo.value
      })

      const calc = calculateArbitrage(odds, stake)
      setCalculation(calc)

      // Initialize custom stakes with rounding
      const newCustomStakes: Record<string, number> = {}
      const newCustomStakeInputs: Record<string, string> = {}
      const originalStakes: Record<string, number> = {}

      Object.keys(selectedOpportunity.best_odds).forEach((key, index) => {
        const rawStake = index === 0 ? calc.stake1 : index === 1 ? calc.stake2 : calc.stake3 || 0
        const roundedStake = roundToNearest(rawStake, roundingOption)
        newCustomStakes[key] = roundedStake
        newCustomStakeInputs[key] = roundedStake.toString()
        originalStakes[key] = roundedStake
      })

      setCustomStakes(newCustomStakes)
      setCustomStakeInputs(newCustomStakeInputs)
      setOriginalCalculatedStakes(originalStakes)

      // Recalculate with rounded stakes
      const recalculated = recalculateOutcomes(newCustomStakes)
      if (recalculated) {
        setCalculation(recalculated)
      }
    }
  }, [selectedOpportunity, stake, roundingOption])

  const handleStakeChange = (value: string) => {
    setStakeInput(value)
    const numValue = Number.parseFloat(value) || 0
    setStake(numValue)
    setStoredStake(numValue)
  }

  const handleStakeFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    if (e.target.value === "0") {
      e.target.select()
    }
  }

  const handleStakeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.target instanceof HTMLInputElement && e.target.value === "0" && /[0-9]/.test(e.key)) {
      e.target.value = ""
    }
  }

  const handleCustomStakeChange = (oddKey: string, value: string) => {
    setCustomStakeInputs((prev) => ({ ...prev, [oddKey]: value }))
    const numValue = Number.parseFloat(value) || 0
    const updatedStakes = { ...customStakes, [oddKey]: numValue }
    setCustomStakes(updatedStakes)

    // Recalculate outcomes with updated stakes
    const recalculated = recalculateOutcomes(updatedStakes)
    if (recalculated) {
      setCalculation(recalculated)
    }
  }

  const handleCustomStakeFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    if (e.target.value === "0") {
      e.target.select()
    }
  }

  const handleCustomStakeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.target instanceof HTMLInputElement && e.target.value === "0" && /[0-9]/.test(e.key)) {
      e.target.value = ""
    }
  }

  const handleResetStakes = () => {
    setCustomStakes(originalCalculatedStakes)
    const resetInputs: Record<string, string> = {}
    Object.entries(originalCalculatedStakes).forEach(([key, value]) => {
      resetInputs[key] = value.toString()
    })
    setCustomStakeInputs(resetInputs)

    // Recalculate with original stakes
    const recalculated = recalculateOutcomes(originalCalculatedStakes)
    if (recalculated) {
      setCalculation(recalculated)
    }
  }

  const getMatchUrl = (opportunity: Opportunity, source: string): string => {
    const urlKey = `${source}_match_url`
    return (
      opportunity[urlKey] ||
      `https://google.com/search?q=${matchGroup?.home_team}+vs+${matchGroup?.away_team}+${source}`
    )
  }

  // Component to render source icon or fallback text
  const SourceIcon = ({ source }: { source: string }) => {
    const [imageError, setImageError] = useState(false)

    return (
      <div className="flex items-center justify-center">
        {!imageError ? (
          <img
            src={`/icons/${source}.png`}
            alt={source}
            className="w-4 h-4 object-contain"
            onError={() => setImageError(true)}
          />
        ) : (
          <span className="text-xs text-slate-400 px-1 py-0.5 bg-slate-800/60 rounded">{source}</span>
        )}
      </div>
    )
  }

  if (!matchGroup) return null

  // Show ALL opportunities in the modal, but sort them so the displayed one is first
  const allOpportunities = [...matchGroup.opportunities]

  // If we have a displayed opportunity, move it to the top
  if (displayedOpportunity) {
    const displayedIndex = allOpportunities.findIndex((opp) => opp.unique_id === displayedOpportunity.unique_id)
    if (displayedIndex > 0) {
      const [displayedOpp] = allOpportunities.splice(displayedIndex, 1)
      allOpportunities.unshift(displayedOpp)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl h-[90vh] flex flex-col bg-gradient-to-br from-slate-800/95 to-slate-900/95 border-slate-700 p-0">
        {/* Fixed Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-700 bg-gradient-to-br from-slate-800/95 to-slate-900/95 flex-shrink-0">
          <DialogTitle className="text-2xl font-bold text-slate-100 pr-8">
            {matchGroup.home_team} vs {matchGroup.away_team}
          </DialogTitle>
          <div className="flex items-center gap-4 text-sm text-slate-400 mt-2">
            <div className="flex items-center gap-1">
              <MapPin className="h-3 w-3 text-blue-400" />
              {matchGroup.country}
            </div>
            <div className="flex items-center gap-1">
              <Trophy className="h-3 w-3 text-purple-400" />
              {getTournamentName(matchGroup, labels)} {/* Pass labels */}
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

        {/* Content with Independent Scrolling */}
        <div className="flex-1 px-6 pb-6 overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6 h-full">
            {/* Opportunities List - Independent Scroll */}
            <div className="flex flex-col h-full min-h-0">
              <h3 className="text-lg font-semibold text-slate-200 flex items-center gap-2 mb-4 flex-shrink-0">
                <Trophy className="h-4 w-4 text-purple-400" />
                Arbitrage Opportunities
              </h3>

              <div className="flex-1 overflow-y-auto pr-2 space-y-3">
                {allOpportunities.map((opportunity, index) => {
                  const isDisplayedInMainList = displayedOpportunity?.unique_id === opportunity.unique_id

                  return (
                    <Card
                      key={opportunity.unique_id}
                      className={`cursor-pointer transition-all duration-200 flex-shrink-0 ${
                        selectedOpportunity?.unique_id === opportunity.unique_id
                          ? "border-blue-500 bg-blue-500/10"
                          : "border-slate-700 hover:border-slate-600 bg-slate-800/50"
                      } ${isDisplayedInMainList ? "ring-2 ring-emerald-500/30" : ""}`}
                      onClick={() => setSelectedOpportunity(opportunity)}
                    >
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
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-emerald-400">
                              {((1 - opportunity.arbitrage_percentage) * 100).toFixed(2)}%
                            </div>
                            <div className="text-xs text-orange-400 flex items-center gap-1 mt-1">
                              <Clock4 className="h-3 w-3" />
                              {opportunityDurations[opportunity.unique_id] || "Active for 0s"}
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-4 justify-center">
                          {Object.entries(opportunity.best_odds).map(([oddKey, oddInfo]) => (
                            <button
                              key={oddKey}
                              onClick={(e) => {
                                e.stopPropagation()
                                const url = getMatchUrl(opportunity, oddInfo.source)
                                window.open(url, "_blank")
                              }}
                              className="flex flex-col items-center p-2 bg-slate-700/50 hover:bg-slate-600/50 rounded border border-slate-600/40 hover:border-slate-500/60 transition-all duration-200 min-w-[80px]"
                            >
                              <div className="text-xs text-slate-400 mb-1">{getOddLabel(oddKey, labels)}</div> {/* Pass labels */}
                              <div className="text-sm font-bold text-slate-100">{oddInfo.value}</div>
                              <SourceIcon source={oddInfo.source} />
                            </button>
                          ))}
                        </div>

                        <div className="text-xs text-slate-500 mt-2">Sources: {opportunity.arbitrage_sources}</div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>

            {/* Arbitrage Calculator - Independent Scroll */}
            <div className="flex flex-col h-full min-h-0">
              <h3 className="text-lg font-semibold text-slate-200 flex items-center gap-2 mb-4 flex-shrink-0">
                <Calculator className="h-4 w-4 text-emerald-400" />
                Arbitrage Calculator
              </h3>

              <div className="flex-1 overflow-y-auto pr-2">
                {selectedOpportunity && calculation && (
                  <Card className="bg-slate-800/50 border-slate-700">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-slate-200 text-base text-center">
                        {getComplementarySetLabel(selectedOpportunity.complementary_set, labels)} {/* Pass labels */}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Summary Cards at Top */}
                      <div className="grid grid-cols-2 gap-3">
                        <Card className="bg-slate-700/30 border-slate-600/50 p-3">
                          <div className="text-xs text-slate-400 mb-1">Total Stake</div>
                          <Input
                            type="text"
                            value={stakeInput}
                            onChange={(e) => handleStakeChange(e.target.value)}
                            onFocus={handleStakeFocus}
                            onKeyDown={handleStakeKeyDown}
                            className="bg-slate-600/50 border-slate-500 text-slate-200 text-center font-bold text-lg h-8 p-1"
                          />
                          <div className="text-xs text-slate-400 mt-1">TND</div>
                        </Card>

                        <Card className="bg-slate-700/30 border-slate-600/50 p-3">
                          <div className="text-xs text-slate-400 mb-1">Guaranteed Profit</div>
                          <div
                            className={`text-lg font-bold flex items-center justify-center gap-1 ${calculation.profit >= 0 ? "text-emerald-400" : "text-red-400"}`}
                          >
                            {calculation.profit >= 0 ? (
                              <TrendingUp className="h-4 w-4" />
                            ) : (
                              <TrendingDown className="h-4 w-4" />
                            )}
                            {calculation.profit.toFixed(2)}
                          </div>
                          <div
                            className={`text-xs text-center ${calculation.profit >= 0 ? "text-emerald-300" : "text-red-300"}`}
                          >
                            ({calculation.profitPercentage.toFixed(2)}%) TND
                          </div>
                        </Card>
                      </div>

                      <Separator className="bg-slate-700" />

                      {/* Compact Controls */}
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
                            Reset
                          </Button>
                        </div>
                      </div>

                      <Separator className="bg-slate-700" />

                      {/* Compact Betting Amounts */}
                      <div className="space-y-2">
                        <h4 className="text-xs font-medium text-slate-300">Betting Amounts</h4>
                        <div className="grid gap-2">
                          {Object.entries(selectedOpportunity.best_odds).map(([oddKey, oddInfo]) => (
                            <div key={oddKey} className="grid grid-cols-3 gap-2 items-center">
                              <Label className="text-slate-400 text-xs">{getOddLabel(oddKey, labels)}</Label> {/* Pass labels */}
                              <Input
                                type="text"
                                value={customStakeInputs[oddKey] || "0"}
                                onChange={(e) => handleCustomStakeChange(oddKey, e.target.value)}
                                onFocus={handleCustomStakeFocus}
                                onKeyDown={handleCustomStakeKeyDown}
                                className="bg-slate-700/50 border-slate-600 text-slate-200 h-7 text-xs"
                              />
                              <div className="flex items-center justify-center">
                                <SourceIcon source={oddInfo.source} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <Separator className="bg-slate-700" />

                      {/* Detailed Outcomes */}
                      <div className="space-y-3">
                        <h5 className="text-xs font-medium text-slate-300">Outcome Scenarios</h5>
                        <div className="space-y-2">
                          {Object.entries(calculation.outcomes).map(([key, outcome]: [string, any]) => (
                            <Card key={key} className="bg-slate-700/20 border-slate-600/30 p-2">
                              <div className="flex justify-between items-start mb-2">
                                <div className="text-xs font-medium text-slate-200 capitalize">
                                  {outcome.description.replace(/_/g, " ")}
                                </div>
                                <SourceIcon source={outcome.source} />
                              </div>

                              <div className="grid grid-cols-3 gap-2 text-xs">
                                <div>
                                  <div className="text-slate-400">Stake</div>
                                  <div className="text-slate-200 font-medium">{outcome.stake.toFixed(2)}</div>
                                </div>
                                <div>
                                  <div className="text-slate-400">Winnings</div>
                                  <div className="text-slate-200 font-medium">{outcome.winnings.toFixed(2)}</div>
                                </div>
                                <div>
                                  <div className="text-slate-400">Net Result</div>
                                  <div
                                    className={`font-bold ${outcome.result >= 0 ? "text-emerald-400" : "text-red-400"}`}
                                  >
                                    {outcome.result >= 0 ? "+" : ""}
                                    {outcome.result.toFixed(2)}
                                  </div>
                                </div>
                              </div>
                            </Card>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  )
}