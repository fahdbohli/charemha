/**
 * Extract numbers from a group_id string
 * Example: "316811-321516-5489987" -> ["316811", "321516", "5489987"]
 */
export function extractGroupIdNumbers(groupId: string): string[] {
  if (!groupId || typeof groupId !== "string") return []
  return groupId.split("-").filter((num) => num.trim() !== "")
}

/**
 * Check if two group_ids share at least one number
 * Example: "321516-7168655" and "116811-321516-5489987" -> true (both have "321516")
 */
export function shareGroupIdNumber(groupId1: string, groupId2: string): boolean {
  if (!groupId1 || !groupId2) return false

  const numbers1 = extractGroupIdNumbers(groupId1)
  const numbers2 = extractGroupIdNumbers(groupId2)

  // Check if any number from groupId1 exists in groupId2
  return numbers1.some((num1) => numbers2.includes(num1))
}

/**
 * Find a match group that shares at least one number with the target group_id
 * Returns the exact match first, then any group with shared numbers
 */
export function findMatchingGroup<T extends { group_id: string }>(targetGroupId: string, groups: T[]): T | null {
  if (!targetGroupId || !groups.length) return null

  // First try to find exact match
  const exactMatch = groups.find((group) => group.group_id === targetGroupId)
  if (exactMatch) return exactMatch

  // Then try to find any group with shared numbers
  const sharedMatch = groups.find((group) => shareGroupIdNumber(targetGroupId, group.group_id))
  return sharedMatch || null
}

/**
 * Get all groups that share at least one number with the target group_id
 */
export function findAllMatchingGroups<T extends { group_id: string }>(targetGroupId: string, groups: T[]): T[] {
  if (!targetGroupId || !groups.length) return []

  return groups.filter((group) => group.group_id === targetGroupId || shareGroupIdNumber(targetGroupId, group.group_id))
}

/**
 * Debug function to show group_id matching details
 */
export function debugGroupIdMatching(
  groupId1: string,
  groupId2: string,
): {
  numbers1: string[]
  numbers2: string[]
  sharedNumbers: string[]
  matches: boolean
} {
  const numbers1 = extractGroupIdNumbers(groupId1)
  const numbers2 = extractGroupIdNumbers(groupId2)
  const sharedNumbers = numbers1.filter((num) => numbers2.includes(num))

  return {
    numbers1,
    numbers2,
    sharedNumbers,
    matches: sharedNumbers.length > 0,
  }
}
