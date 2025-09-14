"use client"

import { useState, useEffect, useCallback } from "react"
import type { MatchGroup, Mode } from "../types/arbitrage"
import { durationTracker } from "../utils/opportunity-duration"
import { parseMatchDateTime } from "../utils/date-parser"
import { getTournamentName } from "../utils/arbitrage-label-helpers" // Updated import
import { useArbitrageLabels } from "./use-arbitrage-labels" // New import

// Define a type for the new structured country data
interface AvailableCountryData {
  live: { [sport: string]: string[] };
  prematch: { [sport: string]: string[] };
}

export const useArbitrageData = (
  mode: Mode,
  selectedSport: string,
  selectedDate: string,
  selectedSources: string[],
  sortBy: "profit" | "time" | "duration" = "profit",
  sortOrder: "asc" | "desc" = "asc",
) => {
  const [data, setData] = useState<MatchGroup[]>([])
  const [filteredData, setFilteredData] = useState<MatchGroup[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [availableSports, setAvailableSports] = useState<string[]>([])
  // Update availableCountries to store the structured data
  const [availableCountriesByMode, setAvailableCountriesByMode] = useState<AvailableCountryData>({ live: {}, prematch: {} });

  const { labels } = useArbitrageLabels(); // Use the new hook

  const discoverStructure = useCallback(async () => {
    try {
      const response = await fetch('/api/countries');
      if (!response.ok) {
        throw new Error(`Failed to fetch countries: ${response.statusText}`);
      }
      // Parse the new structured response
      const structureData: AvailableCountryData = await response.json();
      setAvailableCountriesByMode(structureData);

      // Extract unique sports from both live and prematch modes
      const allSports = new Set<string>();
      Object.keys(structureData.live).forEach(sport => allSports.add(sport));
      Object.keys(structureData.prematch).forEach(sport => allSports.add(sport));
      setAvailableSports(Array.from(allSports).sort());

    } catch (err) {
      console.error("Failed to discover structure:", err);
      setError(err instanceof Error ? err.message : "Failed to discover available sports and countries.");
    }
  }, []);

  const fetchData = useCallback(
    async () => { // Removed forceRefresh parameter as it's not directly used for structure discovery here
      const sportsAndCountriesToFetch = availableCountriesByMode[mode];
      if (!sportsAndCountriesToFetch || Object.keys(sportsAndCountriesToFetch).length === 0) {
        setLoading(false);
        setData([]);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const allData: MatchGroup[] = [];
        const currentModeSports = Object.keys(sportsAndCountriesToFetch);

        for (const sport of currentModeSports) {
          // If a specific sport is selected, only fetch for that sport
          if (selectedSport !== "all" && selectedSport !== sport) {
            continue;
          }

          const countriesForSport = sportsAndCountriesToFetch[sport];
          for (const country of countriesForSport) {
            try {
              const url = `/arb_output/arb_opportunities/${mode}/${sport}/${country}.json`;
              const response = await fetch(url);
              if (response.ok) {
                const countryData: MatchGroup[] = await response.json();
                allData.push(...countryData);
              } else {
                console.warn(`Failed to fetch data for ${sport}/${country} in ${mode} mode: Status ${response.status} - ${response.statusText}`);
              }
            } catch (err) {
              console.warn(`Network error fetching data for ${sport}/${country} in ${mode} mode:`, err);
            }
          }
        }

        // Sort by best arbitrage percentage
        allData.sort((a, b) => {
          const bestA = Math.min(...a.opportunities.map((opp) => opp.arbitrage_percentage))
          const bestB = Math.min(...b.opportunities.map((opp) => opp.arbitrage_percentage))
          return bestA - bestB
        })

        // Update duration tracker with fresh data from JSON
        const allOpportunities = allData.flatMap((group) => group.opportunities)
        durationTracker.updateOpportunities(
          allOpportunities.map((opp) => ({
            unique_id: opp.unique_id,
            activity_duration: opp.activity_duration || "0s",
          })),
        )

        // Clean up stale entries that are no longer in the data
        const currentIds = new Set(allOpportunities.map((opp) => opp.unique_id))
        durationTracker.cleanupStaleEntries(currentIds)

        setData(allData)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch data")
      } finally {
        setLoading(false)
      }
    },
    [mode, selectedSport, availableCountriesByMode, data.length],
  )

  // Filter and select best opportunity per group based on sources
  const filterData = useCallback(() => {
    let filtered = [...data]

    // Filter by date
    if (selectedDate && selectedDate !== "all") {
      filtered = filtered.filter((group) => group.date === selectedDate)
    }

    // For each group, select the best opportunity that matches source filter
    const processedGroups = filtered
      .map((group) => {
        // Filter opportunities based on selected sources
        const validOpportunities = group.opportunities.filter((opp) => {
          const oppSources = opp.arbitrage_sources.split(", ").map((s) => s.trim())
          return oppSources.every((source) => selectedSources.includes(source))
        })

        // If no opportunities match the source filter, skip this group
        if (validOpportunities.length === 0 && selectedSources.length > 0) {
          return null
        }

        // Select the best opportunity (first one, as they're already sorted)
        const bestOpportunity = validOpportunities.length > 0 ? validOpportunities[0] : group.opportunities[0]

        return {
          ...group,
          selectedOpportunity: bestOpportunity,
        }
      })
      .filter(Boolean) as (MatchGroup & { selectedOpportunity: any })[]

    // Apply sorting
    processedGroups.sort((a, b) => {
      let comparison = 0

      switch (sortBy) {
        case "profit":
          const profitA = (1 - a.selectedOpportunity.arbitrage_percentage) * 100
          const profitB = (1 - b.selectedOpportunity.arbitrage_percentage) * 100
          comparison = profitA - profitB
          break

        case "time":
          // Parse date and time properly for comparison
          const timeA = parseMatchDateTime(a.date, a.time)
          const timeB = parseMatchDateTime(b.date, b.time)
          comparison = timeA - timeB
          break

        case "duration":
          // Use the duration tracker to get actual elapsed time in seconds
          const durationA = durationTracker.getOpportunityDuration(a.selectedOpportunity.unique_id)
          const durationB = durationTracker.getOpportunityDuration(b.selectedOpportunity.unique_id)

          // Convert duration display text to seconds for comparison
          const secondsA = parseDurationToSeconds(durationA.displayText)
          const secondsB = parseDurationToSeconds(durationB.displayText)

          comparison = secondsA - secondsB
          break
      }

      return sortOrder === "desc" ? -comparison : comparison
    })

    setFilteredData(processedGroups)
  }, [data, selectedDate, selectedSources, sortBy, sortOrder])

  useEffect(() => {
    discoverStructure()
  }, [discoverStructure])

  // Fetch data when availableCountriesByMode are loaded OR when mode changes
  useEffect(() => {
    // Only fetch if countries for the current mode are available
    if (Object.keys(availableCountriesByMode[mode]).length > 0) {
      fetchData() 
    } else if (Object.keys(availableCountriesByMode.live).length > 0 || Object.keys(availableCountriesByMode.prematch).length > 0) {
      // If countries are loaded but none for the current mode, clear data and stop loading
      setData([]);
      setLoading(false);
    }
  }, [availableCountriesByMode, mode, fetchData])

  useEffect(() => {
    filterData()
  }, [filterData])

  useEffect(() => {
    // Update duration tracker when data changes
    if (data.length > 0) {
      const allOpportunities = data.flatMap((group) => group.opportunities)
      durationTracker.updateOpportunities(
        allOpportunities.map((opp) => ({
          unique_id: opp.unique_id,
          activity_duration: opp.activity_duration || "0s",
        })),
      )
    }
  }, [data])

  useEffect(() => {
    return () => {
      durationTracker.reset()
    }
  }, [])

  const handleRefetch = useCallback((force = false) => {
    if (force) {
      discoverStructure(); // Force re-discovery of structure
    } else {
      fetchData(); // Regular refetch without re-discovering structure
    }
  }, [discoverStructure, fetchData]);

  return {
    data: filteredData,
    allData: data,
    loading,
    error,
    availableSports,
    refetch: handleRefetch, // Expose the new handleRefetch
  }
}

/**
 * Parse duration display text like "Active for 5m" to seconds
 */
function parseDurationToSeconds(displayText: string): number {
  if (!displayText || typeof displayText !== "string") return 0

  // Extract number and unit from "Active for 5m", "Active for 30s", etc.
  const match = displayText.match(/Active for (\d+)([smh])/)
  if (!match) return 0

  const value = Number.parseInt(match[1], 10)
  const unit = match[2]

  switch (unit) {
    case "s":
      return value
    case "m":
      return value * 60
    case "h":
      return value * 3600
    default:
      return 0
  }
}