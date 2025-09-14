import type { MatchInfo, Opportunity } from "../types/arbitrage";
import type { Labels } from "../hooks/use-arbitrage-labels"; // Import the Labels interface

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

// Helper to extract value and get normalized key
function extractValueAndNormalizeKey(inputKey: string): { normalizedKey: string; value: string | null } {
  console.log(`[extractValue] Input: ${inputKey}`);

  // This regex now correctly captures numbers with optional decimal points (e.g., "1.5", "-0.75")
  // preceded by an underscore.
  const valueMatch = inputKey.match(/_(-?\d+(?:\.\d+)?)/);
  let extractedValue: string | null = null;
  if (valueMatch) {
    extractedValue = valueMatch[1]; // No need to replace '_' with '.' as the regex captures '.' directly
  }
  console.log(`[extractValue] Value Match: ${valueMatch ? valueMatch[0] : 'None'}, Extracted Value: ${extractedValue}`);

  // Create the normalized key by replacing the matched numeric part with '_n'.
  const normalizedKey = inputKey.replace(/_(-?\d+(?:\.\d+)?)/g, '_n');
  console.log(`[extractValue] Normalized Key: ${normalizedKey}`);

  return { normalizedKey, value: extractedValue };
}

export const getComplementarySetLabel = (complementarySet: string, loadedLabels: Labels | null): string => {
  console.log(`[getComplementarySetLabel] Processing: ${complementarySet}`);
  const currentLabels = loadedLabels || defaultLabels;
  const { normalizedKey, value } = extractValueAndNormalizeKey(complementarySet);

  const labelTemplate = currentLabels.complementary_sets[normalizedKey];
  console.log(`[getComplementarySetLabel] Normalized Key: ${normalizedKey}, Value: ${value}`);
  console.log(`[getComplementarySetLabel] Template found: ${labelTemplate}`);

  let finalLabel: string;

  if (labelTemplate && value !== null && labelTemplate.includes("{value}")) {
    finalLabel = labelTemplate.replace("{value}", value);
  } else if (currentLabels.complementary_sets[complementarySet]) {
    // Fallback to exact match if no dynamic value or template doesn't have {value}
    finalLabel = currentLabels.complementary_sets[complementarySet];
  } else {
    // Final fallback for unknown keys
    finalLabel = complementarySet.replace(/_/g, " ");
  }
  console.log(`[getComplementarySetLabel] Final Label: ${finalLabel}`);
  return finalLabel;
};

export const getOddLabel = (oddKey: string, loadedLabels: Labels | null): string => {
  console.log(`[getOddLabel] Processing: ${oddKey}`);
  const currentLabels = loadedLabels || defaultLabels;
  const { normalizedKey, value } = extractValueAndNormalizeKey(oddKey);

  const labelTemplate = currentLabels.odd_keys[normalizedKey];
  console.log(`[getOddLabel] Normalized Key: ${normalizedKey}, Value: ${value}`);
  console.log(`[getOddLabel] Template found: ${labelTemplate}`);

  let finalLabel: string;

  if (labelTemplate && value !== null && labelTemplate.includes("{value}")) {
    finalLabel = labelTemplate.replace("{value}", value);
  } else if (currentLabels.odd_keys[oddKey]) {
    // Fallback to exact match if no dynamic value or template doesn't have {value}
    finalLabel = currentLabels.odd_keys[oddKey];
  } else {
    // Final fallback for unknown keys
    finalLabel = oddKey.replace("_odd", "").replace(/_/g, " ");
  }
  console.log(`[getOddLabel] Final Label: ${finalLabel}`);
  return finalLabel;
};

export const getTournamentName = (matchInfo: MatchInfo | Opportunity, loadedLabels: Labels | null): string => {
  const currentLabels = loadedLabels || defaultLabels;
  const tournamentKeys = currentLabels.tournament_keys;

  for (const key of tournamentKeys) {
    if (matchInfo[key]) {
      return matchInfo[key];
    }
  }
  return "Unknown Tournament";
};