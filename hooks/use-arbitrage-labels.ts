"use client";

import { useState, useEffect } from "react";

export interface Labels {
  complementary_sets: Record<string, string>;
  odd_keys: Record<string, string>;
  tournament_keys: string[];
}

// Default labels in case loading fails or is not yet complete
const defaultLabels: Labels = {
  complementary_sets: {
    "three_way": "1 X 2",
    "one_vs_x2": "1 vs X2",
    "x_vs_12": "Draw vs 1 2",
    "two_vs_1x": "2 vs 1X",
    "both_score": "Both Teams score",
    "under_n_vs_over_n": "Total Under/Over {value}",
    "ah_n_home_vs_away": "Handicap {value}",
    "home_under_n_vs_home_over_n": "Home Total Under/Over {value}",
    "away_under_n_vs_away_over_n": "Away Total Under/Over {value}"
  },
  odd_keys: {
    "1_odd": "Home Wins",
    "draw_odd": "Draw",
    "2_odd": "Away Wins",
    "both_score_odd": "Both Teams Score",
    "both_noscore_odd": "Both Teams Don't Score",
    "12_odd": "Home or Away Wins",
    "X2_odd": "Draw or Away Wins",
    "under_n_odd": "Total Under {value}",
    "over_n_odd": "Total over {value}",
    "home_handicap_n_odd": "Home Handicap {value}",
    "away_handicap_n_odd": "Away Handicap {value}",
    "home_under_n_odd": "Home Total Under {value}",
    "home_over_n_odd": "Home Total Over {value}",
    "away_under_n_odd": "Away Total Under {value}",
    "away_over_n_odd": "Away Total Over {value}"
  },
  "tournament_keys": ["tournament_1xbet", "tournament_Tounesbet", "tournament_Asbet", "tournament_Clubx2"]
};


let labelsCache: Labels | null = null;
let labelsPromise: Promise<Labels> | null = null;

export function useArbitrageLabels() {
  const [labels, setLabels] = useState<Labels | null>(labelsCache);
  const [loading, setLoading] = useState(!labelsCache);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (labelsCache) {
      setLabels(labelsCache);
      setLoading(false);
      return;
    }

    if (!labelsPromise) {
      labelsPromise = fetch('/data/odds-display-names.json')
        .then(response => {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          return response.json();
        })
        .then((data: Labels) => {
          labelsCache = data;
          labelsPromise = null;
          return data;
        })
        .catch(err => {
          console.error("Failed to load odds display names:", err);
          labelsPromise = null;
          setError(err.message || "Failed to load display names.");
          // IMPORTANT FIX: Return defaultLabels on error
          return defaultLabels;
        });
    }

    labelsPromise.then(data => {
      setLabels(data);
      setLoading(false);
    }).catch(() => {
      // Error already set in the catch block above
      setLoading(false);
    });

  }, []);

  return { labels, loading, error };
}