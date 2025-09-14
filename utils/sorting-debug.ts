import { parseMatchDateTime } from "./date-parser"

/**
 * Debug function to log sorting information
 */
export function debugSorting(groups: any[], sortBy: "profit" | "time" | "duration", sortOrder: "asc" | "desc") {
  console.group(`🔍 Sorting Debug: ${sortBy} (${sortOrder})`)

  const sampleSize = Math.min(5, groups.length)
  const sample = groups.slice(0, sampleSize)

  sample.forEach((group, index) => {
    let sortValue: any
    let displayValue: string

    switch (sortBy) {
      case "profit":
        sortValue = (1 - group.selectedOpportunity.arbitrage_percentage) * 100
        displayValue = `${sortValue.toFixed(2)}%`
        break

      case "time":
        sortValue = parseMatchDateTime(group.date, group.time)
        displayValue = `${group.date} ${group.time} (${new Date(sortValue).toLocaleString()})`
        break

      case "duration":
        // This would need access to duration tracker
        displayValue = `${group.selectedOpportunity.activity_duration || "Unknown"}`
        sortValue = displayValue
        break
    }

    console.log(`${index + 1}. ${group.home_team} vs ${group.away_team}`)
    console.log(`   Sort Value: ${sortValue}`)
    console.log(`   Display: ${displayValue}`)
  })

  console.groupEnd()
}
