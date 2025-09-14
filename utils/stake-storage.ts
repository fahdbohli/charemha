"use client"

const STAKE_STORAGE_KEY = "arbitrage_stake_value"

export const getStoredStake = (): number => {
  if (typeof window === "undefined") return 100

  const stored = localStorage.getItem(STAKE_STORAGE_KEY)
  return stored ? Number.parseFloat(stored) : 100
}

export const setStoredStake = (stake: number): void => {
  if (typeof window === "undefined") return

  localStorage.setItem(STAKE_STORAGE_KEY, stake.toString())
}
