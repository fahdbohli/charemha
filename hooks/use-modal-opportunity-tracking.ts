"use client"

import { useState, useEffect, useRef } from "react"
import type { MatchGroup, Opportunity } from "../types/arbitrage"
import type { OpportunityChange } from "../utils/opportunity-tracker"
import { durationTracker } from "../utils/opportunity-duration"

interface UseModalOpportunityTrackingProps {
  matchGroup: MatchGroup | null;
  displayedOpportunity?: Opportunity;
}

export function useModalOpportunityTracking({ matchGroup, displayedOpportunity }: UseModalOpportunityTrackingProps) {
  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null);
  const [opportunityDurations, setOpportunityDurations] = useState<Record<string, string>>({});
  const [changes, setChanges] = useState<OpportunityChange[]>([]);
  const [previousOpportunities, setPreviousOpportunities] = useState<Opportunity[]>([]);
  const [showNoOpportunitiesMessage, setShowNoOpportunitiesMessage] = useState(false);

  // Initialize selected opportunity when matchGroup or displayedOpportunity changes
  useEffect(() => {
    if (matchGroup && matchGroup.opportunities.length > 0) {
      const defaultOpportunity = displayedOpportunity || matchGroup.opportunities[0];
      setSelectedOpportunity(defaultOpportunity);
      setShowNoOpportunitiesMessage(false);
    } else if (matchGroup && matchGroup.opportunities.length === 0 && previousOpportunities.length > 0) {
      setShowNoOpportunitiesMessage(true);
      setSelectedOpportunity(null);
    }

    if (matchGroup) {
      setPreviousOpportunities(matchGroup.opportunities);
    }
  }, [matchGroup, displayedOpportunity, previousOpportunities]);

  // Update durations based on auto-refresh settings
  useEffect(() => {
    if (!matchGroup) return;

    // Update the duration tracker with current opportunities
    durationTracker.updateOpportunities(
      matchGroup.opportunities.map((opp) => ({
        unique_id: opp.unique_id,
        activity_duration: opp.activity_duration,
      })),
    );

    const updateDurations = () => {
      const newDurations: Record<string, string> = {};
      matchGroup.opportunities.forEach((opp) => {
        const duration = durationTracker.getOpportunityDuration(opp.unique_id);
        newDurations[opp.unique_id] = duration.displayText;
      });
      setOpportunityDurations(newDurations);
    };

    updateDurations(); // Initial call
    const interval = setInterval(updateDurations, 1000); // Update every second
    return () => clearInterval(interval);
  }, [matchGroup]);

  // Track changes in modal opportunities
  useEffect(() => {
    if (matchGroup && previousOpportunities.length > 0) {
      const modalChanges: OpportunityChange[] = [];

      matchGroup.opportunities.forEach((opp) => {
        const prevOpp = previousOpportunities.find((p) => p.unique_id === opp.unique_id);
        if (prevOpp) {
          const oldProfit = (1 - prevOpp.arbitrage_percentage) * 100;
          const newProfit = (1 - opp.arbitrage_percentage) * 100;

          if (Math.abs(oldProfit - newProfit) > 0.01) {
            modalChanges.push({
              id: opp.unique_id,
              type: newProfit > oldProfit ? "profit_increase" : "profit_decrease",
              oldProfit,
              newProfit,
            });
          }
        }
      });

      setChanges(modalChanges);
      setTimeout(() => setChanges([]), 3000); // Clear changes after animation duration
    }
  }, [matchGroup, previousOpportunities]);

  return {
    selectedOpportunity,
    setSelectedOpportunity,
    opportunityDurations,
    changes,
    showNoOpportunitiesMessage,
  };
}