"use client"

import React, { useState, useEffect, useRef, useCallback } from "react" // Added useCallback
import { Dialog, DialogContent, DialogPortal } from "@/components/ui/dialog"
import { getStoredStake, setStoredStake } from "../utils/stake-storage"
import { calculateArbitrage, type ArbitrageCalculation } from "../utils/arbitrage-calculator"
import { durationTracker } from "../utils/opportunity-duration"
import { findMatchingGroup, debugGroupIdMatching } from "../utils/group-id-matcher"
import type { MatchGroup, Opportunity } from "../types/arbitrage"
import type { OpportunityChange } from "../utils/opportunity-tracker"

// Import the new modular components
import { MatchDetailsHeader } from "./match-details-header"
import { OpportunityListPanel } from "./opportunity-list-panel"
import { ArbitrageCalculatorPanel } from "./arbitrage-calculator-panel"

const MODAL_AUTO_REFRESH_ENABLED_KEY = "arbitrage_modal_auto_refresh_enabled"
const MODAL_AUTO_REFRESH_DELAY_KEY = "arbitrage_modal_auto_refresh_delay"
const ROUNDING_OPTION_KEY = "arbitrage_rounding_option" // New key for rounding option

// Moved outside the component to rule out scope issues, though it should be fine inside.
const ALL_ROUNDING_OPTIONS = [10, 5, 2, 1]; // All possible rounding values, in descending order

function formatNumberForDisplay(num: number): string {
  return Math.round(num).toString();
}

interface EnhancedMatchDetailsModalProps {
  matchGroup: MatchGroup | null
  isOpen: boolean
  onClose: () => void
  selectedSources: string[]
  displayedOpportunity?: Opportunity
  onRefetch: () => void
  allMatchGroups?: MatchGroup[]
}

export function EnhancedMatchDetailsModal({
  matchGroup,
  isOpen,
  onClose,
  selectedSources,
  displayedOpportunity,
  onRefetch,
  allMatchGroups = [],
}: EnhancedMatchDetailsModalProps) {
  const [selectedOpportunity, _setSelectedOpportunity] = useState<Opportunity | null>(null) // Renamed to _setSelectedOpportunity
  
  const [totalStakeValue, setTotalStakeValue] = useState<number>(100)
  const [totalStakeInput, setTotalStakeInput] = useState<string>("100")

  const [individualStakes, setIndividualStakes] = useState<Record<string, number>>({})
  const [individualStakeInputs, setIndividualStakeInputs] = useState<Record<string, string>>({})
  
  const [optimalStakesForReset, setOptimalStakesForReset] = useState<Record<string, number>>({}) // Stores RAW optimal stakes

  const [calculation, setCalculation] = useState<ArbitrageCalculation | null>(null)
  const [roundingOption, setRoundingOption] = useState<number>(1)
  const [opportunityDurations, setOpportunityDurations] = useState<Record<string, string>>({})
  const [changes, setChanges] = useState<OpportunityChange[]>([])
  const [previousOpportunities, setPreviousOpportunities] = useState<Opportunity[]>([])
  const [showNoOpportunitiesMessage, setShowNoOpportunitiesMessage] = useState(false)
  const [originalGroupId, setOriginalGroupId] = useState<string>("")
  const [currentMatchGroup, setCurrentMatchGroup] = useState<MatchGroup | null>(null)
  const [groupIdChanged, setGroupIdChanged] = useState(false)
  const [hasManualOverride, setHasManualOverride] = useState(false)

  const [modalAutoRefresh, setModalAutoRefresh] = useState<boolean>(false);
  const [modalRefreshDelay, setModalRefreshDelay] = useState<number>(2000);

  const previousSelectedOpportunityId = useRef<string | null>(null);
  const lastSelectedOpportunityIdInModalRef = useRef<string | null>(null); // NEW: Ref to track selected opportunity in modal

  const [activeRoundingOption, setActiveRoundingOption] = useState<number>(1); // The dynamically adjusted rounding value

  // NEW: Wrapped setSelectedOpportunity to also update the ref
  const setSelectedOpportunity = useCallback((opportunity: Opportunity | null) => {
    _setSelectedOpportunity(opportunity);
    lastSelectedOpportunityIdInModalRef.current = opportunity?.unique_id || null;
  }, []);

  // Effect to load modal auto-refresh state and rounding option from localStorage after hydration
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedAutoRefresh = localStorage.getItem(MODAL_AUTO_REFRESH_ENABLED_KEY);
      if (storedAutoRefresh !== null) {
        setModalAutoRefresh(storedAutoRefresh === "true");
      }

      const storedRefreshDelay = localStorage.getItem(MODAL_AUTO_REFRESH_DELAY_KEY);
      if (storedRefreshDelay) {
        setModalRefreshDelay(Number.parseInt(storedRefreshDelay, 10));
      }

      const storedRoundingOption = localStorage.getItem(ROUNDING_OPTION_KEY);
      if (storedRoundingOption) {
        const defaultRounding = Number.parseInt(storedRoundingOption, 10);
        setRoundingOption(defaultRounding);
        setActiveRoundingOption(defaultRounding); // Initialize active rounding to the stored default
      }
    }
  }, []);

  // Persist modal autoRefresh state to localStorage
  const handleModalAutoRefreshChange = (enabled: boolean) => {
    setModalAutoRefresh(enabled);
    if (typeof window !== "undefined") {
      localStorage.setItem(MODAL_AUTO_REFRESH_ENABLED_KEY, enabled.toString());
    }
  };

  // Persist modal refreshDelay to localStorage
  const handleModalRefreshDelayChange = (delay: number) => {
    setModalRefreshDelay(delay);
    if (typeof window !== "undefined") {
      localStorage.setItem(MODAL_AUTO_REFRESH_DELAY_KEY, delay.toString());
    }
  };

  const handleRoundingOptionChange = (value: number) => {
    setRoundingOption(value); // Set the new user-selected default preference
    if (typeof window !== "undefined") {
      localStorage.setItem(ROUNDING_OPTION_KEY, value.toString());
    }
    handleResetStakes(value); 
  };

  // Store original group_id when modal opens
  useEffect(() => {
    if (matchGroup && isOpen) {
      if (!originalGroupId) {
        setOriginalGroupId(matchGroup.group_id)
        setCurrentMatchGroup(matchGroup)
        setGroupIdChanged(false)
      } else {
        const matchingGroup = findMatchingGroup(originalGroupId, allMatchGroups)

        if (matchingGroup) {
          setCurrentMatchGroup(matchingGroup)
          if (matchingGroup.group_id !== originalGroupId) {
            setGroupIdChanged(true)
            console.log(`Group ID changed from ${originalGroupId} to ${matchingGroup.group_id}`)
            console.log("Debug matching:", debugGroupIdMatching(originalGroupId, matchingGroup.group_id))
          } else {
            setGroupIdChanged(false)
          }
        } else {
          setCurrentMatchGroup(null)
          setShowNoOpportunitiesMessage(true)
        }
      }
    }
  }, [matchGroup, isOpen, originalGroupId, allMatchGroups])

  // Reset when modal closes
  useEffect(() => {
    if (!isOpen) {
      setOriginalGroupId("")
      setCurrentMatchGroup(null)
      setGroupIdChanged(false)
      setShowNoOpportunitiesMessage(false)
      setHasManualOverride(false);
      lastSelectedOpportunityIdInModalRef.current = null; // NEW: Clear ref on modal close
    }
  }, [isOpen])

  // Auto-refresh effect for modal
  useEffect(() => {
    if (!modalAutoRefresh || !isOpen) return

    console.log(`Modal auto-refresh enabled: refreshing every ${modalRefreshDelay}ms`)

    const interval = setInterval(() => {
      console.log("Modal auto-refresh triggered")
      onRefetch()
    }, modalRefreshDelay)

    return () => {
      console.log("Modal auto-refresh disabled")
      clearInterval(interval)
    }
  }, [modalAutoRefresh, modalRefreshDelay, isOpen, onRefetch])

  // Load initial total stake from localStorage
  useEffect(() => {
    const storedStake = getStoredStake()
    setTotalStakeValue(storedStake)
    setTotalStakeInput(formatNumberForDisplay(storedStake))
  }, [])

  // NEW: Modified useEffect to preserve selected opportunity
  useEffect(() => {
    const workingMatchGroup = currentMatchGroup || matchGroup;

    if (workingMatchGroup && workingMatchGroup.opportunities.length > 0) {
      let newSelectedOpp: Opportunity | null = null;

      // 1. Try to find the previously selected opportunity by ID from the ref
      if (lastSelectedOpportunityIdInModalRef.current) {
        newSelectedOpp = workingMatchGroup.opportunities.find(
          (opp) => opp.unique_id === lastSelectedOpportunityIdInModalRef.current
        ) || null;
      }

      // 2. If not found, fall back to displayedOpportunity or the first one
      if (!newSelectedOpp) {
        newSelectedOpp = displayedOpportunity || workingMatchGroup.opportunities[0];
      }

      setSelectedOpportunity(newSelectedOpp); // Use the wrapped setter
      setShowNoOpportunitiesMessage(false);
    } else if (workingMatchGroup && workingMatchGroup.opportunities.length === 0 && previousOpportunities.length > 0) {
      setShowNoOpportunitiesMessage(true);
      setSelectedOpportunity(null); // Use the wrapped setter
    }

    if (workingMatchGroup) {
      setPreviousOpportunities(workingMatchGroup.opportunities);
    }
  }, [currentMatchGroup, matchGroup, displayedOpportunity, setSelectedOpportunity]); // Added setSelectedOpportunity to dependencies

  // Update durations based on auto-refresh settings
  useEffect(() => {
    const workingMatchGroup = currentMatchGroup || matchGroup;
    if (!workingMatchGroup) return;

    // Update the duration tracker with current opportunities
    durationTracker.updateOpportunities(
      workingMatchGroup.opportunities.map((opp) => ({
        unique_id: opp.unique_id,
        activity_duration: opp.activity_duration,
      })),
    );

    const updateDurations = () => {
      const newDurations: Record<string, string> = {};
      workingMatchGroup.opportunities.forEach((opp) => {
        const duration = durationTracker.getOpportunityDuration(opp.unique_id);
        newDurations[opp.unique_id] = duration.displayText;
      });
      setOpportunityDurations(newDurations);
    };

    updateDurations(); // Initial call
    const interval = setInterval(updateDurations, 1000); // Update every second
    return () => clearInterval(interval);
  }, [currentMatchGroup, matchGroup]);

  // Track changes in modal opportunities
  useEffect(() => {
    const workingMatchGroup = currentMatchGroup || matchGroup

    if (workingMatchGroup && previousOpportunities.length > 0) {
      const modalChanges: OpportunityChange[] = []

      workingMatchGroup.opportunities.forEach((opp) => {
        const prevOpp = previousOpportunities.find((p) => p.unique_id === opp.unique_id)
        if (prevOpp) {
          const oldProfit = (1 - prevOpp.arbitrage_percentage) * 100
          const newProfit = (1 - opp.arbitrage_percentage) * 100

          if (Math.abs(oldProfit - newProfit) > 0.01) {
            modalChanges.push({
              id: opp.unique_id,
              type: newProfit > oldProfit ? "profit_increase" : "profit_decrease",
              oldProfit,
              newProfit,
            })
          }
        }
      })

      setChanges(modalChanges)
      setTimeout(() => setChanges([]), 3000)
    }
  }, [currentMatchGroup, matchGroup, previousOpportunities])

  const roundToNearest = (value: number, roundTo: number): number => {
    if (roundTo === 0) return value; // Avoid division by zero
    return Math.round(value / roundTo) * roundTo
  }

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

  // Effect 1: Calculate raw, unrounded stakes whenever the total stake value changes or opportunity changes.
  useEffect(() => {
    if (selectedOpportunity) {
      const odds: Record<string, number> = {}
      Object.entries(selectedOpportunity.best_odds).forEach(([key, oddInfo]) => {
        odds[key] = oddInfo.value
      })

      const calc = calculateArbitrage(odds, totalStakeValue)
      
      const rawOptimalStakes: Record<string, number> = {}
      Object.keys(selectedOpportunity.best_odds).forEach((key, index) => {
        rawOptimalStakes[key] = index === 0 ? calc.stake1 : index === 1 ? calc.stake2 : calc.stake3 || 0
      })
      setOptimalStakesForReset(rawOptimalStakes)

      if (previousSelectedOpportunityId.current !== selectedOpportunity.unique_id) {
        setHasManualOverride(false)
        previousSelectedOpportunityId.current = selectedOpportunity.unique_id
      }
    }
  }, [selectedOpportunity, totalStakeValue])

  // Effect 2: Round the individual stakes when the raw stakes or the active rounding option changes.
  useEffect(() => {
    if (selectedOpportunity && !hasManualOverride && Object.keys(optimalStakesForReset).length > 0) {
      const roundedStakes: Record<string, number> = {};
      Object.entries(optimalStakesForReset).forEach(([key, raw]) => {
        // Use the dynamic activeRoundingOption for calculations
        roundedStakes[key] = roundToNearest(raw, activeRoundingOption);
      });
      setIndividualStakes(roundedStakes);

      const newIndividualStakeInputs: Record<string, string> = {};
      Object.entries(roundedStakes).forEach(([key, value]) => {
        newIndividualStakeInputs[key] = formatNumberForDisplay(value);
      });
      setIndividualStakeInputs(newIndividualStakeInputs);
    }
  }, [activeRoundingOption, optimalStakesForReset, selectedOpportunity, hasManualOverride]);

  // Effect 3: Recalculate final profit/loss when individual stakes change.
  // This will also update the total stake display, but ONLY if in manual override mode.
  useEffect(() => {
    if (selectedOpportunity && Object.keys(individualStakes).length > 0) {
      const recalculated = recalculateOutcomes(individualStakes)
      if (recalculated) {
        setCalculation(recalculated)
        // This is the key fix: Only update the total stake display if the user is editing individual stakes.
        if (hasManualOverride) {
          const newTotalStake = Object.values(individualStakes).reduce((sum, s) => sum + s, 0)
          setTotalStakeValue(newTotalStake)
          setTotalStakeInput(formatNumberForDisplay(newTotalStake))
          setStoredStake(newTotalStake)
        }
      }
    }
  }, [individualStakes, selectedOpportunity, hasManualOverride]);

  // Handles typing in the Total Stake input field
  const handleTotalStakeInputChange = (value: string) => {
    setTotalStakeInput(value); // Update the display string immediately
    const numValue = Number.parseFloat(value) || 0;

    // Dynamically find the best rounding option based on the current input
    const possibleOptions = ALL_ROUNDING_OPTIONS.filter(opt => opt <= roundingOption);
    let newActiveRounding = 1; // Default to 1
    if (numValue > 0) {
        for (const opt of possibleOptions) {
            if (numValue % opt === 0) {
                newActiveRounding = opt;
                break; // Found the highest valid divisor, so stop
            }
        }
    } else {
        // If input is empty or 0, revert to the user's chosen default
        newActiveRounding = roundingOption;
    }
    setActiveRoundingOption(newActiveRounding);

    setTotalStakeValue(numValue);
    setStoredStake(numValue);
    setHasManualOverride(false); // Typing in total stake field is "auto" mode
  };

  const handleStakeFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    if (e.target.value === "0") {
      e.target.select()
    }
  }

  const handleStakeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Removed the logic that clears the input if the value is "0" and a digit is pressed.
    // This allows typing any digit after 0 without perceived blocking.
  }

  const handleIndividualStakeChange = (oddKey: string, value: string) => {
    setIndividualStakeInputs((prev) => ({ ...prev, [oddKey]: value })) 
    const numValue = Number.parseFloat(value) || 0
    setIndividualStakes((prev) => ({ ...prev, [oddKey]: numValue }))
    setHasManualOverride(true) // Editing an individual stake enables "manual" mode
  }

  const handleCustomStakeFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    if (e.target.value === "0") {
      e.target.select()
    }
  }

  const handleCustomStakeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Removed the logic that clears the input if the value is "0" and a digit is pressed.
    // This allows typing any digit after 0 without perceived blocking.
  }

  // *** THE FIX IS HERE ***
  const handleResetStakes = (newRoundingValue?: number | React.MouseEvent) => {
    // This check is the fix. If the function is called by a button click,
    // newRoundingValue will be a MouseEvent object. We check if it's a number.
    // If it's not a number, we fall back to the state `roundingOption` as intended.
    const roundTo = typeof newRoundingValue === 'number' ? newRoundingValue : roundingOption;
  
    // Round the stored raw stakes according to the determined rounding value.
    const roundedStakes: Record<string, number> = {};
    Object.entries(optimalStakesForReset).forEach(([key, raw]) => {
      roundedStakes[key] = roundToNearest(raw, roundTo);
    });
    setIndividualStakes(roundedStakes);
  
    const resetInputs: Record<string, string> = {};
    Object.entries(roundedStakes).forEach(([key, value]) => {
      resetInputs[key] = formatNumberForDisplay(value);
    });
    setIndividualStakeInputs(resetInputs);
  
    const newTotalStake = Object.values(roundedStakes).reduce((sum, s) => sum + s, 0);
    setTotalStakeValue(newTotalStake);
    setTotalStakeInput(formatNumberForDisplay(newTotalStake));
    setStoredStake(newTotalStake);
    setHasManualOverride(false); // Resetting returns to "auto" mode
  
    // When resetting, the active rounding option should be the one we just used.
    setActiveRoundingOption(roundTo);
  
    const recalculated = recalculateOutcomes(roundedStakes);
    if (recalculated) {
      setCalculation(recalculated);
    }
  };

  // NEW: handleFixBet function defined in the parent component
  const handleFixBet = (fixedOddKey: string) => {
    if (!selectedOpportunity) return;

    const fixedStake = Number.parseFloat(individualStakeInputs[fixedOddKey] || "0");
    if (isNaN(fixedStake) || fixedStake <= 0) {
      console.warn("Invalid fixed stake value.");
      return;
    }

    const fixedOddValue = selectedOpportunity.best_odds[fixedOddKey]?.value;
    if (!fixedOddValue) {
      console.error(`Odd value not found for key: ${fixedOddKey}`);
      return;
    }

    const fixedWinnings = fixedStake * fixedOddValue;
    const newIndividualStakes: Record<string, number> = {};
    let newTotalStake = 0;

    Object.entries(selectedOpportunity.best_odds).forEach(([oddKey, oddInfo]) => {
      if (oddKey === fixedOddKey) {
        newIndividualStakes[oddKey] = fixedStake;
      } else {
        const otherStake = fixedWinnings / oddInfo.value;
        newIndividualStakes[oddKey] = Math.round(otherStake); // Always round to 1 for this "Fix Bet" action
      }
      newTotalStake += newIndividualStakes[oddKey];
    });

    setIndividualStakes(newIndividualStakes);
    const newIndividualStakeInputs: Record<string, string> = {};
    Object.entries(newIndividualStakes).forEach(([key, value]) => {
      newIndividualStakeInputs[key] = formatNumberForDisplay(value);
    });
    setIndividualStakeInputs(newIndividualStakeInputs);

    setTotalStakeValue(newTotalStake);
    setTotalStakeInput(formatNumberForDisplay(newTotalStake));
    
    setHasManualOverride(true); // Indicate that stakes are manually overridden
    setActiveRoundingOption(1); // Temporarily set active rounding to 1
  };

  const getMatchUrl = (opportunity: Opportunity, source: string): string => {
    const urlKey = `${source}_match_url`
    const workingMatchGroup = currentMatchGroup || matchGroup
    return (
      opportunity[urlKey] ||
      `https://google.com/search?q=${workingMatchGroup?.home_team}+vs+${workingMatchGroup?.away_team}+${source}`
    )
  }

  const workingMatchGroup = currentMatchGroup || matchGroup
  if (!workingMatchGroup && !showNoOpportunitiesMessage) return null

  const allOpportunities = workingMatchGroup ? [...workingMatchGroup.opportunities] : []

  if (displayedOpportunity && workingMatchGroup) {
    const displayedIndex = allOpportunities.findIndex((opp) => opp.unique_id === displayedOpportunity.unique_id)
    if (displayedIndex > 0) {
      const [displayedOpp] = allOpportunities.splice(displayedIndex, 1)
      allOpportunities.unshift(displayedOpp)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogPortal forceMount>
        <DialogContent className="max-w-7xl h-[90vh] flex flex-col bg-gradient-to-br from-slate-800/95 to-slate-900/95 border-slate-700 p-0">
          <MatchDetailsHeader
            matchGroup={workingMatchGroup}
            originalGroupId={originalGroupId}
            groupIdChanged={groupIdChanged}
            selectedOpportunity={selectedOpportunity}
          />

          <div className="flex-1 px-6 pb-6 overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6 h-full">
              <OpportunityListPanel
                allOpportunities={allOpportunities}
                displayedOpportunity={displayedOpportunity}
                selectedOpportunity={selectedOpportunity}
                setSelectedOpportunity={setSelectedOpportunity}
                opportunityDurations={opportunityDurations}
                changes={changes}
                showNoOpportunitiesMessage={showNoOpportunitiesMessage}
                onOddClick={(url) => window.open(url, "_blank")}
                modalAutoRefresh={modalAutoRefresh}
                handleModalAutoRefreshChange={handleModalAutoRefreshChange}
                modalRefreshDelay={modalRefreshDelay}
                handleModalRefreshDelayChange={handleModalRefreshDelayChange}
              />

              <ArbitrageCalculatorPanel
                selectedOpportunity={selectedOpportunity}
                changes={changes}
                showNoOpportunitiesMessage={showNoOpportunitiesMessage}
                totalStakeValue={totalStakeValue}
                handleTotalStakeInputChange={handleTotalStakeInputChange}
                totalStakeInput={totalStakeInput}
                handleStakeFocus={handleStakeFocus}
                handleStakeKeyDown={handleStakeKeyDown}
                individualStakes={individualStakes}
                handleIndividualStakeChange={handleIndividualStakeChange}
                individualStakeInputs={individualStakeInputs}
                handleCustomStakeFocus={handleCustomStakeFocus}
                handleCustomStakeKeyDown={handleCustomStakeKeyDown}
                optimalStakesForReset={optimalStakesForReset}
                handleResetStakes={handleResetStakes}
                calculation={calculation}
                roundingOption={roundingOption}
                setRoundingOption={handleRoundingOptionChange}
                formatNumberForDisplay={formatNumberForDisplay}
                getMatchUrl={getMatchUrl}
                setActiveRoundingOption={setActiveRoundingOption}
                setHasManualOverride={setHasManualOverride}
                setTotalStakeValue={setTotalStakeValue}
                setTotalStakeInput={setTotalStakeInput}
                handleFixBet={handleFixBet}
              />
            </div>
          </div>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  )
}