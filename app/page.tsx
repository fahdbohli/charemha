"use client"

import { useState, useEffect } from "react"
import type { Mode, MatchGroup, Opportunity } from "../types/arbitrage"
import { useArbitrageData } from "../hooks/use-arbitrage-data"
import { Controls } from "../components/controls"
import { Filters } from "../components/filters"
import { AutoRefresh } from "../components/auto-refresh"
import { EnhancedMatchDetailsModal } from "../components/enhanced-match-details-modal"
import { AnimatedOpportunityList } from "../components/animated-opportunity-list"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { RefreshCw, TrendingUp } from "lucide-react"
import type { SortOption, SortOrder } from "../components/sorting-controls"
import { PaginationControls } from "../components/pagination-controls" // Import the new component

// Local Storage Keys
const ARBITRAGE_MODE_KEY = "arbitrage_app_mode"
const SELECTED_SPORT_KEY = "arbitrage_selected_sport"
const SELECTED_DATE_KEY = "arbitrage_selected_date"
const SELECTED_SOURCES_KEY = "arbitrage_selected_sources"
const SORT_BY_KEY = "arbitrage_sort_by"
const SORT_ORDER_KEY = "arbitrage_sort_order"
const AUTO_REFRESH_ENABLED_KEY = "arbitrage_auto_refresh_enabled"
const AUTO_REFRESH_DELAY_KEY = "arbitrage_auto_refresh_delay"
const CURRENT_PAGE_KEY = "arbitrage_current_page" // New key for current page

const ITEMS_PER_PAGE = 20 // Define items per page

export default function ArbitrageViewer() {
  // Initialize with default values, then update from localStorage in useEffect
  const [mode, setMode] = useState<Mode>("live");
  const [selectedSport, setSelectedSport] = useState("all")
  const [selectedDate, setSelectedDate] = useState("all")
  const [selectedSources, setSelectedSources] = useState<string[]>([])
  
  const [autoRefresh, setAutoRefresh] = useState<boolean>(false);
  const [refreshDelay, setRefreshDelay] = useState<number>(5000);

  const [selectedMatchGroup, setSelectedMatchGroup] = useState<MatchGroup | null>(null)
  const [displayedOpportunity, setDisplayedOpportunity] = useState<Opportunity | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);

  const [sortBy, setSortBy] = useState<SortOption>("profit")
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc")

  const [currentPage, setCurrentPage] = useState<number>(1); // New state for current page

  const { data, allData, loading, error, availableSports, refetch } = useArbitrageData(
    mode,
    selectedSport,
    selectedDate,
    selectedSources,
    sortBy,
    sortOrder,
  )

  // Effect to load state from localStorage after hydration
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedMode = localStorage.getItem(ARBITRAGE_MODE_KEY);
      if (storedMode === "live" || storedMode === "prematch") {
        setMode(storedMode);
      }

      const storedSport = localStorage.getItem(SELECTED_SPORT_KEY);
      if (storedSport) {
        setSelectedSport(storedSport);
      }

      const storedDate = localStorage.getItem(SELECTED_DATE_KEY);
      if (storedDate) {
        setSelectedDate(storedDate);
      }

      const storedSources = localStorage.getItem(SELECTED_SOURCES_KEY);
      if (storedSources) {
        try {
          const parsedSources = JSON.parse(storedSources);
          if (Array.isArray(parsedSources)) {
            setSelectedSources(parsedSources);
          }
        } catch (e) {
          console.error("Failed to parse stored sources:", e);
        }
      }

      const storedSortBy = localStorage.getItem(SORT_BY_KEY);
      if (storedSortBy === "profit" || storedSortBy === "time" || storedSortBy === "duration") {
        setSortBy(storedSortBy);
      }

      const storedSortOrder = localStorage.getItem(SORT_ORDER_KEY);
      if (storedSortOrder === "asc" || storedSortOrder === "desc") {
        setSortOrder(storedSortOrder);
      }

      const storedAutoRefresh = localStorage.getItem(AUTO_REFRESH_ENABLED_KEY);
      if (storedAutoRefresh !== null) {
        setAutoRefresh(storedAutoRefresh === "true");
      }

      const storedRefreshDelay = localStorage.getItem(AUTO_REFRESH_DELAY_KEY);
      if (storedRefreshDelay) {
        setRefreshDelay(Number.parseInt(storedRefreshDelay, 10));
      }

      const storedPage = localStorage.getItem(CURRENT_PAGE_KEY);
      if (storedPage) {
        setCurrentPage(Number.parseInt(storedPage, 10));
      }
    }
  }, []); // Empty dependency array ensures this runs once after initial render

  // Handlers for state changes, now also persisting to localStorage
  const handleModeChange = (newMode: Mode) => {
    setMode(newMode);
    setCurrentPage(1); // Reset page on mode change
    if (typeof window !== "undefined") {
      localStorage.setItem(ARBITRAGE_MODE_KEY, newMode);
      localStorage.setItem(CURRENT_PAGE_KEY, "1");
    }
  };

  const handleSportChange = (newSport: string) => {
    setSelectedSport(newSport);
    setCurrentPage(1); // Reset page on sport change
    if (typeof window !== "undefined") {
      localStorage.setItem(SELECTED_SPORT_KEY, newSport);
      localStorage.setItem(CURRENT_PAGE_KEY, "1");
    }
  };

  const handleDateChange = (newDate: string) => {
    setSelectedDate(newDate);
    setCurrentPage(1); // Reset page on date change
    if (typeof window !== "undefined") {
      localStorage.setItem(SELECTED_DATE_KEY, newDate);
      localStorage.setItem(CURRENT_PAGE_KEY, "1");
    }
  };

  const handleSourcesChange = (newSources: string[]) => {
    setSelectedSources(newSources);
    setCurrentPage(1); // Reset page on sources change
    if (typeof window !== "undefined") {
      localStorage.setItem(SELECTED_SOURCES_KEY, JSON.stringify(newSources));
      localStorage.setItem(CURRENT_PAGE_KEY, "1");
    }
  };

  const handleSortByChange = (newSortBy: SortOption) => {
    setSortBy(newSortBy);
    setCurrentPage(1); // Reset page on sort change
    if (typeof window !== "undefined") {
      localStorage.setItem(SORT_BY_KEY, newSortBy);
      localStorage.setItem(CURRENT_PAGE_KEY, "1");
    }
  };

  const handleSortOrderChange = (newSortOrder: SortOrder) => {
    setSortOrder(newSortOrder);
    setCurrentPage(1); // Reset page on sort order change
    if (typeof window !== "undefined") {
      localStorage.setItem(SORT_ORDER_KEY, newSortOrder);
      localStorage.setItem(CURRENT_PAGE_KEY, "1");
    }
  };

  const handleAutoRefreshChange = (enabled: boolean) => {
    setAutoRefresh(enabled);
    if (typeof window !== "undefined") {
      localStorage.setItem(AUTO_REFRESH_ENABLED_KEY, enabled.toString());
    }
  };

  const handleRefreshDelayChange = (delay: number) => {
    setRefreshDelay(delay);
    if (typeof window !== "undefined") {
      localStorage.setItem(AUTO_REFRESH_DELAY_KEY, delay.toString());
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    if (typeof window !== "undefined") {
      localStorage.setItem(CURRENT_PAGE_KEY, page.toString());
    }
    // Removed: window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Auto-refresh effect - only runs when auto-refresh is enabled
  useEffect(() => {
    if (!autoRefresh) return

    console.log(`Auto-refresh enabled: refreshing every ${refreshDelay}ms`)

    const interval = setInterval(() => {
      console.log("Auto-refresh triggered")
      refetch(true) // Force refresh
    }, refreshDelay)

    return () => {
      console.log("Auto-refresh disabled")
      clearInterval(interval)
    }
  }, [autoRefresh, refreshDelay, refetch])

  // Manual refresh handler
  const handleManualRefresh = () => {
    setIsManualRefreshing(true); // Set manual refresh flag
    console.log("Manual refresh triggered")
    refetch(true) // Force refresh
  }

  // Effect to reset manual refresh state when loading finishes
  useEffect(() => {
    if (!loading && isManualRefreshing) {
      setIsManualRefreshing(false);
    }
  }, [loading, isManualRefreshing]);

  const handleMatchClick = (matchGroup: MatchGroup & { selectedOpportunity: any }) => {
    setSelectedMatchGroup(matchGroup)
    setDisplayedOpportunity(matchGroup.selectedOpportunity)
    setIsModalOpen(true)
  }

  // Calculate pagination values
  const totalOpportunities = data.length;
  const totalPages = Math.ceil(totalOpportunities / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentOpportunities = data.slice(startIndex, endIndex);

  // Adjust current page if it becomes out of bounds after filtering/loading
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
      if (typeof window !== "undefined") {
        localStorage.setItem(CURRENT_PAGE_KEY, totalPages.toString());
      }
    } else if (totalPages === 0 && currentPage !== 1) {
      setCurrentPage(1);
      if (typeof window !== "undefined") {
        localStorage.setItem(CURRENT_PAGE_KEY, "1");
      }
    }
  }, [currentPage, totalPages]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8">
          <div className="flex items-center gap-3 mb-4 justify-center">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
              <TrendingUp className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-transparent">
              Charemha
            </h1>
          </div>
          <p className="text-slate-400 text-center">
            Real-time arbitrage betting opportunities across multiple sports and bookmakers
          </p>
        </header>

        <div className="space-y-6">
          <Card className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700/60 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex flex-wrap items-end gap-6">
                <Controls
                  mode={mode}
                  onModeChange={handleModeChange}
                  selectedSport={selectedSport}
                  onSportChange={handleSportChange}
                  availableSports={availableSports}
                />

                <Filters
                  data={allData} // Filters operate on allData
                  selectedDate={selectedDate}
                  onDateChange={handleDateChange}
                  selectedSources={selectedSources}
                  onSourcesChange={handleSourcesChange}
                  sortBy={sortBy}
                  onSortByChange={handleSortByChange}
                  sortOrder={sortOrder}
                  onSortOrderChange={handleSortOrderChange}
                />
              </div>
            </CardContent>
          </Card>

          <AutoRefresh
            autoRefresh={autoRefresh}
            onAutoRefreshChange={handleAutoRefreshChange}
            refreshDelay={refreshDelay}
            onRefreshDelayChange={handleRefreshDelayChange}
          />

          <div className="flex flex-wrap items-center gap-4"> {/* Removed justify-between from here */}
            {/* Left side: Opportunities count */}
            <div className="text-sm text-slate-400 flex-shrink-0">
              <span className="text-slate-200 font-medium">{totalOpportunities}</span> opportunities found
              {/* Removed auto-refreshing text from here */}
            </div>

            {/* Center: Pagination Controls (only if totalPages > 1) */}
            {totalPages > 1 && (
              <div className="ml-auto mr-auto"> {/* Use ml-auto and mr-auto to center */}
                <PaginationControls
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                />
              </div>
            )}

            {/* Right side: Refresh Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleManualRefresh}
              disabled={isManualRefreshing && loading}
              className="gap-2 bg-slate-800/50 border-slate-600 hover:bg-slate-700/50 text-slate-200 flex-shrink-0"
            >
              <RefreshCw className={`h-4 w-4 ${isManualRefreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>

          {error && (
            <div className="p-4 border border-red-500/50 bg-red-900/20 rounded-lg text-red-300 backdrop-blur-sm">
              Error: {error}
            </div>
          )}

          {loading && data.length === 0 && (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-6 w-6 animate-spin mr-2 text-blue-400" />
              <span className="text-slate-300">Loading arbitrage opportunities...</span>
            </div>
          )}

          <AnimatedOpportunityList
            data={currentOpportunities} // Pass sliced data to the list
            onMatchClick={handleMatchClick}
            autoRefresh={autoRefresh}
            refreshDelay={refreshDelay}
          />

          {!loading && data.length === 0 && !error && (
            <div className="text-center py-12 text-slate-400">
              No arbitrage opportunities found for the selected criteria.
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex justify-center mt-8"> {/* Added a wrapper div with flex justify-center */}
              <PaginationControls
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            </div>
          )}
        </div>
      </div>

      <EnhancedMatchDetailsModal
        matchGroup={selectedMatchGroup}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        selectedSources={selectedSources}
        displayedOpportunity={displayedOpportunity}
        onRefetch={handleManualRefresh}
        allMatchGroups={allData}
      />
    </div>
  )
}