"use client";

import { useState, useMemo } from "react";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { ContainerCard } from "@/components/dashboard/ContainerCard";
import { useContainers } from "@/hooks/useContainers";
import { Button } from "@/components/common/Button";
import { SearchBar } from "@/components/common/SearchBar";
import { filterItems } from "@/lib/utils";
import { Plus, Inbox } from "lucide-react";

export default function ServicesPage() {
    const { containers, restartContainer, loading, error } = useContainers();
    const [searchQuery, setSearchQuery] = useState("");

    const filteredContainers = useMemo(() => {
        return filterItems(containers, searchQuery, ['name', 'image', 'status']);
    }, [containers, searchQuery]);

    return (
        <div>
            <DashboardHeader />
            <div className="p-4 lg:p-6">
                <div className="space-y-8">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight mb-2">Services</h1>
                            <p className="text-muted-foreground">Manage and monitor your running containers.</p>
                        </div>
                        <div className="flex flex-col sm:flex-row items-center gap-4">
                            <SearchBar
                                value={searchQuery}
                                onChange={setSearchQuery}
                                placeholder="Search containers..."
                                containerClassName="w-full sm:w-80"
                            />
                            <Button className="gap-2 shrink-0 w-full sm:w-auto">
                                <Plus className="h-4 w-4" /> Add Service
                            </Button>
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center p-12 text-muted-foreground animate-pulse">
                            Loading containers...
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center py-20 px-4 text-center border rounded-xl bg-card border-border">
                            <h3 className="text-lg font-semibold mb-2">Failed to load containers</h3>
                            <p className="text-muted-foreground max-w-sm text-sm">{error}</p>
                        </div>
                    ) : (
                        <>
                            {filteredContainers.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                    {filteredContainers.map((container) => (
                                        <ContainerCard
                                            key={container.id}
                                            container={container}
                                            onRestart={restartContainer}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-20 px-4 text-center border rounded-xl bg-card border-dashed">
                                    <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
                                        <Inbox className="h-6 w-6 text-muted-foreground" />
                                    </div>
                                    {searchQuery ? (
                                        <>
                                            <h3 className="text-lg font-semibold mb-2">No containers match</h3>
                                            <p className="text-muted-foreground max-w-sm text-sm">
                                                We couldn&apos;t find any containers matching &quot;{searchQuery}&quot;. Try a different search term.
                                            </p>
                                            <Button
                                                variant="outline"
                                                className="mt-6"
                                                onClick={() => setSearchQuery("")}
                                            >
                                                Clear Search
                                            </Button>
                                        </>
                                    ) : (
                                        <>
                                            <h3 className="text-lg font-semibold mb-2">No containers found</h3>
                                            <p className="text-muted-foreground max-w-sm text-sm">
                                                You don&apos;t have any running containers. Add a service to get started.
                                            </p>
                                            <Button
                                                variant="outline"
                                                className="mt-6 gap-2"
                                            >
                                                <Plus className="h-4 w-4" /> Add Service
                                            </Button>
                                        </>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <DashboardHeader />

      <div className="p-4 lg:p-6 space-y-6">

        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-2">
              Services
            </h1>
            <p className="text-muted-foreground">
              Manage and monitor your containers.
            </p>
          </div>

          <Button className="gap-2">
            <Plus className="h-4 w-4" /> Add Service
          </Button>
        </div>

        {/* ✅ SEARCH BAR */}
        <SearchBar
          value={query}
          onChange={setQuery}
          placeholder="Search containers..."
        />

        {/* ✅ FILTER CHIPS */}
        <div className="flex gap-2 flex-wrap">
          {['all', 'running', 'stopped', 'unhealthy'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status as any)}
              className={`px-3 py-1 text-xs rounded-full border ${
                statusFilter === status
                  ? 'bg-primary text-white border-primary'
                  : 'border-white/10 text-muted-foreground'
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        {/* ✅ CONTAINER LIST (simple for now) */}
        {filteredContainers.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            {query
              ? `No containers match "${query}"`
              : "No containers available"}
          </div>
        ) : (
          <div className="grid gap-3">
            {filteredContainers.map((c: any) => (
              <div
                key={c.id}
                className="p-4 rounded-lg border border-white/10 bg-white/5"
              >
                <div className="font-semibold">{c.name}</div>
                <div className="text-xs text-muted-foreground">
                  {c.image} • {c.status}
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}