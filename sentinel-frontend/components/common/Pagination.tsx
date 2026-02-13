"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./Button";

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    pageSize: number;
    onPageChange: (page: number) => void;
    onPageSizeChange?: (size: number) => void;
}

const PAGE_SIZE_OPTIONS = [10, 25, 50];

export function Pagination({
    currentPage,
    totalPages,
    totalCount,
    pageSize,
    onPageChange,
    onPageSizeChange,
}: PaginationProps) {
    const startItem = (currentPage - 1) * pageSize + 1;
    const endItem = Math.min(currentPage * pageSize, totalCount);

    // Generate page numbers to display
    const getPageNumbers = (): (number | "...")[] => {
        const pages: (number | "...")[] = [];
        const delta = 1; // How many pages to show on each side of current

        for (let i = 1; i <= totalPages; i++) {
            if (
                i === 1 ||
                i === totalPages ||
                (i >= currentPage - delta && i <= currentPage + delta)
            ) {
                pages.push(i);
            } else if (pages[pages.length - 1] !== "...") {
                pages.push("...");
            }
        }

        return pages;
    };

    if (totalCount === 0) return null;

    return (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4">
            {/* Page size selector and info */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                {onPageSizeChange && (
                    <div className="flex items-center gap-2">
                        <span>Show</span>
                        <select
                            value={pageSize}
                            onChange={(e) => onPageSizeChange(Number(e.target.value))}
                            className="bg-white/5 border border-white/10 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
                        >
                            {PAGE_SIZE_OPTIONS.map((size) => (
                                <option key={size} value={size} className="bg-background">
                                    {size}
                                </option>
                            ))}
                        </select>
                        <span>per page</span>
                    </div>
                )}
                <span>
                    Showing {startItem}-{endItem} of {totalCount}
                </span>
            </div>

            {/* Page navigation */}
            <div className="flex items-center gap-1">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="h-8 w-8 p-0"
                    aria-label="Previous page"
                >
                    <ChevronLeft className="h-4 w-4" />
                </Button>

                {getPageNumbers().map((pageNum, idx) =>
                    pageNum === "..." ? (
                        <span key={`ellipsis-${idx}`} className="px-2 text-muted-foreground">
                            ...
                        </span>
                    ) : (
                        <Button
                            key={pageNum}
                            variant={pageNum === currentPage ? "default" : "ghost"}
                            size="sm"
                            onClick={() => onPageChange(pageNum)}
                            className={`h-8 w-8 p-0 ${pageNum === currentPage
                                    ? "bg-primary text-primary-foreground"
                                    : "text-muted-foreground hover:text-white"
                                }`}
                        >
                            {pageNum}
                        </Button>
                    )
                )}

                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="h-8 w-8 p-0"
                    aria-label="Next page"
                >
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}
