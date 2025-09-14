"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { calculateArbitrage, type ArbitrageCalculation } from "../utils/arbitrage-calculator"
import { getStoredStake, setStoredStake } from "../utils/stake-storage"
import type { Opportunity } from "../types/arbitrage"
import type { OpportunityChange } from "../utils/opportunity-tracker"

const ALL_ROUNDING_OPTIONS = [10, 5, 2, 1]; // All possible rounding values, in descending order
const ROUNDING_OPTION_KEY = "arbitrage_rounding_option" // Key for rounding option in localStorage

function formatNumberForDisplay(num: number): string {
  return Math.round(num).toString();
}

interface UseArbitrageCalculatorProps {
  selectedOpportunity: Opportunity | null;
  changes: OpportunityChange[];
}

export function useArbitrageCalculator({ selectedOpportunity, changes }: UseArbitrageCalculatorProps) {
  const [totalStakeValue, setTotalStakeValue] = useState<number>(100);
  const [totalStakeInput, setTotalStakeInput] = useState<string>("100");
  const [individualStakes, setIndividualStakes] = useState<Record<string, number>>({});
  const [individualStakeInputs, setIndividualStakeInputs] = useState<Record<string, string>>({});
  const [optimalStakesForReset, setOptimalStakesForReset] = useState<Record<string, number>>({});
  const [calculation, setCalculation] = useState<ArbitrageCalculation | null>(null);
  const [roundingOption, setRoundingOption] = useState<number>(1); // User's preferred default rounding
  const [activeRoundingOption, setActiveRoundingOption] = useState<number>(1); // Dynamically adjusted rounding
  const [hasManualOverride, setHasManualOverride] = useState(false);

  const previousSelectedOpportunityId = useRef<string | null>(null);

  // Load initial total stake and rounding option from localStorage
  useEffect(() => {
    const storedStake = getStoredStake();
    setTotalStakeValue(storedStake);
    setTotalStakeInput(formatNumberForDisplay(storedStake));

    const storedRoundingOption = localStorage.getItem(ROUNDING_OPTION_KEY);
    if (storedRoundingOption) {
      const defaultRounding = Number.parseInt(storedRoundingOption, 10);
      setRoundingOption(defaultRounding);
      setActiveRoundingOption(defaultRounding);
    }
  }, []);

  const roundToNearest = useCallback((value: number, roundTo: number): number => {
    if (roundTo === 0) return value;
    return Math.round(value / roundTo) * roundTo;
  }, []);

  const recalculateOutcomes = useCallback((stakes: Record<string, number>) => {
    if (!selectedOpportunity) return null;

    const totalCustomStake = Object.values(stakes).reduce((sum, s) => sum + s, 0);
    const outcomes: any = {};

    Object.entries(selectedOpportunity.best_odds).forEach(([key, oddInfo], index) => {
      const stakeForThisOdd = stakes[key] || 0;
      const winnings = stakeForThisOdd * oddInfo.value;
      const profit = winnings - totalCustomStake;

      outcomes[`outcome${index + 1}`] = {
        description: key.replace("_odd", "").replace(/_/g, " "),
        result: profit,
        stake: stakeForThisOdd,
        winnings: winnings,
        odds: oddInfo.value,
        source: oddInfo.source,
      };
    });

    const minProfit = Math.min(...Object.values(outcomes).map((o: any) => o.result));

    const oddKeys = Object.keys(selectedOpportunity.best_odds);
    return {
      stake1: stakes[oddKeys[0]] || 0,
      stake2: stakes[oddKeys[1]] || 0,
      stake3: stakes[oddKeys[2]] || 0,
      totalStake: totalCustomStake,
      profit: minProfit,
      profitPercentage: totalCustomStake > 0 ? (minProfit / totalCustomStake) * 100 : 0,
      outcomes,
    };
  }, [selectedOpportunity]);

  // Effect 1: Calculate raw, unrounded stakes whenever the total stake value changes or opportunity changes.
  useEffect(() => {
    if (selectedOpportunity) {
      const odds: Record<string, number> = {};
      Object.entries(selectedOpportunity.best_odds).forEach(([key, oddInfo]) => {
        odds[key] = oddInfo.value;
      });

      const calc = calculateArbitrage(odds, totalStakeValue);
      
      const rawOptimalStakes: Record<string, number> = {};
      Object.keys(selectedOpportunity.best_odds).forEach((key, index) => {
        rawOptimalStakes[key] = index === 0 ? calc.stake1 : index === 1 ? calc.stake2 : calc.stake3 || 0;
      });
      setOptimalStakesForReset(rawOptimalStakes);

      if (previousSelectedOpportunityId.current !== selectedOpportunity.unique_id) {
        setHasManualOverride(false);
        previousSelectedOpportunityId.current = selectedOpportunity.unique_id;
      }
    }
  }, [selectedOpportunity, totalStakeValue]);

  // Effect 2: Round the individual stakes when the raw stakes or the active rounding option changes.
  useEffect(() => {
    if (selectedOpportunity && !hasManualOverride && Object.keys(optimalStakesForReset).length > 0) {
      const roundedStakes: Record<string, number> = {};
      Object.entries(optimalStakesForReset).forEach(([key, raw]) => {
        roundedStakes[key] = roundToNearest(raw, activeRoundingOption);
      });
      setIndividualStakes(roundedStakes);

      const newIndividualStakeInputs: Record<string, string> = {};
      Object.entries(roundedStakes).forEach(([key, value]) => {
        newIndividualStakeInputs[key] = formatNumberForDisplay(value);
      });
      setIndividualStakeInputs(newIndividualStakeInputs);
    }
  }, [activeRoundingOption, optimalStakesForReset, selectedOpportunity, hasManualOverride, roundToNearest]);

  // Effect 3: Recalculate final profit/loss when individual stakes change.
  useEffect(() => {
    if (selectedOpportunity && Object.keys(individualStakes).length > 0) {
      const recalculated = recalculateOutcomes(individualStakes);
      if (recalculated) {
        setCalculation(recalculated);
        if (hasManualOverride) {
          const newTotalStake = Object.values(individualStakes).reduce((sum, s) => sum + s, 0);
          setTotalStakeValue(newTotalStake);
          setTotalStakeInput(formatNumberForDisplay(newTotalStake));
          setStoredStake(newTotalStake);
        }
      }
    }
  }, [individualStakes, selectedOpportunity, hasManualOverride, recalculateOutcomes]);

  const handleTotalStakeInputChange = useCallback((value: string) => {
    setTotalStakeInput(value);
    const numValue = Number.parseFloat(value) || 0;

    const possibleOptions = ALL_ROUNDING_OPTIONS.filter(opt => opt <= roundingOption);
    let newActiveRounding = 1;
    if (numValue > 0) {
        for (const opt of possibleOptions) {
            if (numValue % opt === 0) {
                newActiveRounding = opt;
                break;
            }
        }
    } else {
        newActiveRounding = roundingOption;
    }
    setActiveRoundingOption(newActiveRounding);

    setTotalStakeValue(numValue);
    setStoredStake(numValue);
    setHasManualOverride(false);
  }, [roundingOption, setTotalStakeValue, setTotalStakeInput, setStoredStake, setActiveRoundingOption, setHasManualOverride]);

  const handleStakeFocus = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    if (e.target.value === "0") {
      e.target.select();
    }
  }, []);

  const handleStakeKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    // No specific logic needed here for now
  }, []);

  const handleIndividualStakeChange = useCallback((oddKey: string, value: string) => {
    setIndividualStakeInputs((prev) => ({ ...prev, [oddKey]: value }));
    const numValue = Number.parseFloat(value) || 0;
    setIndividualStakes((prev) => ({ ...prev, [oddKey]: numValue }));
    setHasManualOverride(true);
  }, [setIndividualStakeInputs, setIndividualStakes, setHasManualOverride]);

  const handleCustomStakeFocus = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    if (e.target.value === "0") {
      e.target.select();
    }
  }, []);

  const handleCustomStakeKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    // No specific logic needed here for now
  }, []);

  const handleResetStakes = useCallback(() => {
    const roundedStakes: Record<string, number> = {};
    Object.entries(optimalStakesForReset).forEach(([key, raw]) => {
      roundedStakes[key] = roundToNearest(raw, roundingOption);
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
    setHasManualOverride(false);
    setActiveRoundingOption(roundingOption);

    const recalculated = recalculateOutcomes(roundedStakes);
    if (recalculated) {
      setCalculation(recalculated);
    }
  }, [optimalStakesForReset, roundingOption, roundToNearest, setIndividualStakes, setIndividualStakeInputs, setTotalStakeValue, setTotalStakeInput, setStoredStake, setHasManualOverride, setActiveRoundingOption, recalculateOutcomes]);

  const handleFixBet = useCallback((fixedOddKey: string) => {
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
        newIndividualStakes[oddKey] = Math.round(otherStake);
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
    
    setHasManualOverride(true);
    setActiveRoundingOption(1);
  }, [selectedOpportunity, individualStakeInputs, setIndividualStakes, setIndividualStakeInputs, setTotalStakeValue, setTotalStakeInput, setHasManualOverride, setActiveRoundingOption]);

  const handleRoundingOptionChange = useCallback((value: number) => {
    setRoundingOption(value);
    if (typeof window !== "undefined") {
      localStorage.setItem(ROUNDING_OPTION_KEY, value.toString());
    }
    // Re-evaluate the active rounding option for the current stake value
    const currentStake = totalStakeValue;
    const possibleOptions = ALL_ROUNDING_OPTIONS.filter(opt => opt <= value);
    let newActiveRounding = 1;
    if (currentStake > 0) {
        for (const opt of possibleOptions) {
            if (currentStake % opt === 0) {
                newActiveRounding = opt;
                break;
            }
        }
    } else {
        newActiveRounding = value;
    }
    setActiveRoundingOption(newActiveRounding);
    handleResetStakes(); // Automatically trigger the round action
  }, [roundingOption, totalStakeValue, handleResetStakes]);

  return {
    totalStakeValue,
    setTotalStakeValue,
    totalStakeInput,
    setTotalStakeInput,
    individualStakes,
    setIndividualStakes,
    individualStakeInputs,
    setIndividualStakeInputs,
    optimalStakesForReset,
    setOptimalStakesForReset,
    calculation,
    setCalculation,
    roundingOption,
    setRoundingOption: handleRoundingOptionChange, // Expose the wrapped handler
    activeRoundingOption,
    setActiveRoundingOption,
    hasManualOverride,
    setHasManualOverride,
    handleTotalStakeInputChange,
    handleStakeFocus,
    handleStakeKeyDown,
    handleIndividualStakeChange,
    handleCustomStakeFocus,
    handleCustomStakeKeyDown,
    handleResetStakes,
    handleFixBet,
    formatNumberForDisplay,
    ALL_ROUNDING_OPTIONS,
  };
}