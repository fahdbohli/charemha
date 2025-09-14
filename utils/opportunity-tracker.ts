"use client"

import type { MatchGroup } from "../types/arbitrage"

export interface OpportunityChange {
  id: string
  type: "profit_increase" | "profit_decrease" | "added"
  oldProfit?: number
  newProfit?: number
}

export class OpportunityTracker {
  private previousData: Map<string, { profit: number }> = new Map()
  private changeCallbacks: ((changes: OpportunityChange[]) => void)[] = []

  public trackChanges(newData: (MatchGroup & { selectedOpportunity: any })[]): OpportunityChange[] {
    const changes: OpportunityChange[] = []
    const currentData = new Map<string, { profit: number }>()

    // Process current data
    newData.forEach((group, index) => {
      const id = group.selectedOpportunity.unique_id
      const profit = (1 - group.selectedOpportunity.arbitrage_percentage) * 100

      currentData.set(id, { profit })

      const previous = this.previousData.get(id)

      if (previous) {
        // Check for profit changes
        if (Math.abs(previous.profit - profit) > 0.01) {
          changes.push({
            id,
            type: profit > previous.profit ? "profit_increase" : "profit_decrease",
            oldProfit: previous.profit,
            newProfit: profit,
          })
        }
      } else {
        // New opportunity
        changes.push({
          id,
          type: "added",
          newProfit: profit,
        })
      }
    })

    this.previousData = currentData

    // Notify callbacks
    this.changeCallbacks.forEach((callback) => callback(changes))

    return changes
  }

  public onChanges(callback: (changes: OpportunityChange[]) => void) {
    this.changeCallbacks.push(callback)
    return () => {
      const index = this.changeCallbacks.indexOf(callback)
      if (index > -1) {
        this.changeCallbacks.splice(index, 1)
      }
    }
  }

  public reset() {
    this.previousData.clear()
  }
}

export const opportunityTracker = new OpportunityTracker()
