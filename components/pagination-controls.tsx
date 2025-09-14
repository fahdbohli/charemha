"use client"

import React from "react"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination"

interface PaginationControlsProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
}

export function PaginationControls({ currentPage, totalPages, onPageChange }: PaginationControlsProps) {
  const getPaginationItems = (currentPage: number, totalPages: number) => {
    const pageNumbers = new Set<number>();

    // Always include the first and last page
    if (totalPages >= 1) pageNumbers.add(1);
    if (totalPages > 1) pageNumbers.add(totalPages);

    // Include pages around the current page: current, current-1, current-2, current+1, current+2
    for (let i = currentPage - 2; i <= currentPage + 2; i++) {
      if (i >= 1 && i <= totalPages) {
        pageNumbers.add(i);
      }
    }

    // Convert set to sorted array
    const sortedPageNumbers = Array.from(pageNumbers).sort((a, b) => a - b);

    // Build the final list with ellipses
    const finalItems: (number | 'ellipsis')[] = [];
    let lastAddedPage: number | null = null;

    for (const pageNum of sortedPageNumbers) {
      if (lastAddedPage !== null && pageNum > lastAddedPage + 1) {
        finalItems.push('ellipsis');
      }
      finalItems.push(pageNum);
      lastAddedPage = pageNum;
    }

    return finalItems;
  };

  const paginationItems = getPaginationItems(currentPage, totalPages);

  return (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
          />
        </PaginationItem>

        {paginationItems.map((item, index) => (
          <PaginationItem key={index}>
            {item === 'ellipsis' ? (
              <PaginationEllipsis />
            ) : (
              <PaginationLink
                onClick={() => onPageChange(item)}
                isActive={item === currentPage}
              >
                {item}
              </PaginationLink>
            )}
          </PaginationItem>
        ))}

        <PaginationItem>
          <PaginationNext
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  )
}