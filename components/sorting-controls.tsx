"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"

export type SortOption = "profit" | "time" | "duration"
export type SortOrder = "asc" | "desc"

interface SortingControlsProps {
  sortBy: SortOption
  onSortByChange: (sortBy: SortOption) => void
  sortOrder: SortOrder
  onSortOrderChange: (order: SortOrder) => void
}

export function SortingControls({ sortBy, onSortByChange, sortOrder, onSortOrderChange }: SortingControlsProps) {
  const getSortOrderLabel = () => {
    switch (sortBy) {
      case "profit":
        return sortOrder === "asc" ? "Low to High" : "High to Low"
      case "time":
        return sortOrder === "asc" ? "Earliest First" : "Latest First"
      case "duration":
        return sortOrder === "asc" ? "Newest First" : "Oldest First"
      default:
        return sortOrder === "asc" ? "Ascending" : "Descending"
    }
  }

  const getSortOrderIcon = () => {
    return sortOrder === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
  }

  return (
    <div className="flex items-end gap-3">
      <div className="space-y-2">
        <Label htmlFor="sort-select" className="text-sm flex items-center gap-1">
          <ArrowUpDown className="h-3 w-3" />
          Sort by
        </Label>
        <Select value={sortBy} onValueChange={onSortByChange}>
          <SelectTrigger id="sort-select" className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="profit">Profit Percentage</SelectItem>
            <SelectItem value="time">Match Start Time</SelectItem>
            <SelectItem value="duration">Opportunity Age</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-sm text-transparent">Order</Label>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onSortOrderChange(sortOrder === "asc" ? "desc" : "asc")}
          className="w-32 gap-1 h-10 justify-start"
          title={`Currently: ${getSortOrderLabel()}`}
        >
          {getSortOrderIcon()}
          <span className="text-xs">{getSortOrderLabel()}</span>
        </Button>
      </div>
    </div>
  )
}
