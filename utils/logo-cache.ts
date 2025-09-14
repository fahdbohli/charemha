"use client"

import { useEffect } from "react"

import { useState } from "react"

// Shared in-memory cache for logo existence
const logoExistsCache = new Set<string>()

export function useCachedLogo(source: string) {
  const [showLogo, setShowLogo] = useState(logoExistsCache.has(source))

  useEffect(() => {
    if (logoExistsCache.has(source)) return

    const img = new Image()
    img.onload = () => {
      logoExistsCache.add(source)
      setShowLogo(true)
    }
    img.onerror = () => {
      // Don't add to cache for failed loads
      setShowLogo(false)
    }
    img.src = `/icons/${source}.png`
  }, [source])

  return showLogo
}

// Export cache for debugging
export const getLogoCacheStatus = () => Array.from(logoExistsCache)
