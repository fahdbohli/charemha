"use client"

import type { Mode } from "../types/arbitrage"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"

interface ControlsProps {
  mode: Mode
  onModeChange: (mode: Mode) => void
  selectedSport: string
  onSportChange: (sport: string) => void
  availableSports: string[]
}

export function Controls({ mode, onModeChange, selectedSport, onSportChange, availableSports }: ControlsProps) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="space-y-2">
        <Label htmlFor="mode-select">Mode</Label>
        <Select value={mode} onValueChange={(value: Mode) => onModeChange(value)}>
          <SelectTrigger id="mode-select" className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="live">Live</SelectItem>
            <SelectItem value="prematch">Prematch</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="sport-select">Sport</Label>
        <Select value={selectedSport} onValueChange={onSportChange}>
          <SelectTrigger id="sport-select" className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sports</SelectItem>
            {availableSports.map((sport) => (
              <SelectItem key={sport} value={sport}>
                {sport.charAt(0).toUpperCase() + sport.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
