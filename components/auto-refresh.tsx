"use client"

import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { RefreshCw } from "lucide-react"

interface AutoRefreshProps {
  autoRefresh: boolean
  onAutoRefreshChange: (enabled: boolean) => void
  refreshDelay: number
  onRefreshDelayChange: (delay: number) => void
}

export function AutoRefresh({
  autoRefresh,
  onAutoRefreshChange,
  refreshDelay,
  onRefreshDelayChange,
}: AutoRefreshProps) {
  const refreshDelayOptions = [
    { value: 1000, label: "1s" },
    { value: 2000, label: "2s" },
    { value: 5000, label: "5s" },
    { value: 10000, label: "10s" },
  ]

  return (
    <Card className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700/60 backdrop-blur-sm">
      <CardContent className="p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center space-x-2">
            <RefreshCw className={`h-4 w-4 text-emerald-400 ${autoRefresh ? "animate-spin" : ""}`} />
            <Switch id="auto-refresh" checked={autoRefresh} onCheckedChange={onAutoRefreshChange} />
            <Label htmlFor="auto-refresh" className="text-slate-300">
              Auto-refresh
            </Label>
          </div>

          {autoRefresh && (
            <div className="flex items-center gap-2">
              <Select value={refreshDelay.toString()} onValueChange={(value) => onRefreshDelayChange(Number(value))}>
                <SelectTrigger id="refresh-delay" className="w-20 bg-slate-800/50 border-slate-600 text-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-600">
                  {refreshDelayOptions.map((option) => (
                    <SelectItem
                      key={option.value}
                      value={option.value.toString()}
                      className="text-slate-200 focus:bg-slate-700"
                    >
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Label htmlFor="refresh-delay" className="text-slate-400 text-sm">
                Delay
              </Label>
              <span className="ml-2 text-emerald-400 text-sm">• Auto-refreshing every {refreshDelay / 1000}s</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}