"use client"

import { useState, useEffect } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar, Filter, ChevronDown } from "lucide-react"
import type { MatchGroup } from "../types/arbitrage"
import { SortingControls, type SortOption, type SortOrder } from "./sorting-controls"

interface FiltersProps {
  data: MatchGroup[]
  selectedDate: string
  onDateChange: (date: string) => void
  selectedSources: string[]
  onSourcesChange: (sources: string[]) => void
  sortBy: SortOption
  onSortByChange: (sortBy: SortOption) => void
  sortOrder: SortOrder
  onSortOrderChange: (order: SortOrder) => void
}

export function Filters({
  data,
  selectedDate,
  onDateChange,
  selectedSources,
  onSourcesChange,
  sortBy,
  onSortByChange,
  sortOrder,
  onSortOrderChange,
}: FiltersProps) {
  const [availableDates, setAvailableDates] = useState<string[]>([])
  const [availableSources, setAvailableSources] = useState<string[]>([])

  // Generate next 4 dates from today
  const generateDates = () => {
    const dates = []
    const today = new Date()

    for (let i = 0; i < 4; i++) {
      const date = new Date(today)
      date.setDate(today.getDate() + i)
      const formattedDate = date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
      dates.push(formattedDate)
    }

    return dates
  }

  // Extract unique sources from data, excluding Bet365
  const extractSources = (data: MatchGroup[]) => {
    const sourcesSet = new Set<string>()

    data.forEach((group) => {
      group.all_sources.forEach((source) => {
        // Exclude Bet365 from the available sources
        if (source !== "Bet365") {
          sourcesSet.add(source)
        }
      })
    })

    return Array.from(sourcesSet).sort()
  }

  useEffect(() => {
    const dates = generateDates()
    setAvailableDates(dates)

    if (!selectedDate) {
      onDateChange("all")
    }
  }, [selectedDate, onDateChange])

  useEffect(() => {
    const sources = extractSources(data)
    setAvailableSources(sources)

    // Initialize with all sources selected if none are selected
    if (selectedSources.length === 0 && sources.length > 0) {
      onSourcesChange(sources)
    }
  }, [data, selectedSources, onSourcesChange])

  const handleSourceChange = (source: string, checked: boolean) => {
    let newSources: string[]

    if (checked) {
      newSources = [...selectedSources, source]
    } else {
      newSources = selectedSources.filter((s) => s !== source)
      // Ensure at least 2 sources are selected
      if (newSources.length < 2) {
        return // Don't allow unchecking if it would result in less than 2 sources
      }
    }

    onSourcesChange(newSources)
  }

  return (
    <div className="flex flex-wrap items-center gap-6">
      <div className="space-y-2">
        <Label htmlFor="date-select" className="text-sm flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          Match Date
        </Label>
        <Select value={selectedDate} onValueChange={onDateChange}>
          <SelectTrigger id="date-select" className="w-40">
            <SelectValue placeholder="Select date" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All dates</SelectItem>
            {availableDates.map((date) => (
              <SelectItem key={date} value={date}>
                {date}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-sm flex items-center gap-1">
          <Filter className="h-3 w-3" />
          Sources
        </Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-48 justify-between">
              {selectedSources.length} sources selected
              <ChevronDown className="h-4 w-4 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-3">
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {availableSources.map((source) => (
                <div key={source} className="flex items-center space-x-2">
                  <Checkbox
                    id={source}
                    checked={selectedSources.includes(source)}
                    onCheckedChange={(checked) => handleSourceChange(source, checked as boolean)}
                    disabled={selectedSources.includes(source) && selectedSources.length <= 2}
                  />
                  <Label
                    htmlFor={source}
                    className={`text-sm ${selectedSources.includes(source) && selectedSources.length <= 2 ? "text-muted-foreground" : ""}`}
                  >
                    {source}
                  </Label>
                </div>
              ))}
            </div>
            {selectedSources.length <= 2 && (
              <p className="text-xs text-muted-foreground mt-2 pt-2 border-t">At least 2 sources must be selected</p>
            )}
          </PopoverContent>
        </Popover>
      </div>

      <SortingControls
        sortBy={sortBy}
        onSortByChange={onSortByChange}
        sortOrder={sortOrder}
        onSortOrderChange={onSortOrderChange}
      />
    </div>
  )
}
