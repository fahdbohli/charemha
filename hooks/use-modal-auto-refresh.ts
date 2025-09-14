"use client"

import { useState, useEffect } from "react"

const MODAL_AUTO_REFRESH_ENABLED_KEY = "arbitrage_modal_auto_refresh_enabled"
const MODAL_AUTO_REFRESH_DELAY_KEY = "arbitrage_modal_auto_refresh_delay"

interface UseModalAutoRefreshProps {
  isOpen: boolean;
  onRefetch: () => void;
}

export function useModalAutoRefresh({ isOpen, onRefetch }: UseModalAutoRefreshProps) {
  const [modalAutoRefresh, setModalAutoRefresh] = useState<boolean>(false);
  const [modalRefreshDelay, setModalRefreshDelay] = useState<number>(2000);

  // Load modal auto-refresh state from localStorage after hydration
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedAutoRefresh = localStorage.getItem(MODAL_AUTO_REFRESH_ENABLED_KEY);
      if (storedAutoRefresh !== null) {
        setModalAutoRefresh(storedAutoRefresh === "true");
      }

      const storedRefreshDelay = localStorage.getItem(MODAL_AUTO_REFRESH_DELAY_KEY);
      if (storedRefreshDelay) {
        setModalRefreshDelay(Number.parseInt(storedRefreshDelay, 10));
      }
    }
  }, []);

  // Persist modal autoRefresh state to localStorage
  const handleModalAutoRefreshChange = (enabled: boolean) => {
    setModalAutoRefresh(enabled);
    if (typeof window !== "undefined") {
      localStorage.setItem(MODAL_AUTO_REFRESH_ENABLED_KEY, enabled.toString());
    }
  };

  // Persist modal refreshDelay to localStorage
  const handleModalRefreshDelayChange = (delay: number) => {
    setModalRefreshDelay(delay);
    if (typeof window !== "undefined") {
      localStorage.setItem(MODAL_AUTO_REFRESH_DELAY_KEY, delay.toString());
    }
  };

  // Auto-refresh effect for modal
  useEffect(() => {
    if (!modalAutoRefresh || !isOpen) return;

    console.log(`Modal auto-refresh enabled: refreshing every ${modalRefreshDelay}ms`);

    const interval = setInterval(() => {
      console.log("Modal auto-refresh triggered");
      onRefetch();
    }, modalRefreshDelay);

    return () => {
      console.log("Modal auto-refresh disabled");
      clearInterval(interval);
    };
  }, [modalAutoRefresh, modalRefreshDelay, isOpen, onRefetch]);

  return {
    modalAutoRefresh,
    modalRefreshDelay,
    handleModalAutoRefreshChange,
    handleModalRefreshDelayChange,
  };
}