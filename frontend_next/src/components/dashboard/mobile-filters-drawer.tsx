"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { SlidersHorizontal, X } from "lucide-react";

import { Button } from "@/components/ui/button";

type MobileFiltersDrawerProps = {
  children: (closeDrawer: () => void) => ReactNode;
};

// This deliberately owns only the mobile chrome. DashboardFilters continues
// to own every filter value and action, so desktop and mobile use identical
// query/state behaviour.
export function MobileFiltersDrawer({ children }: MobileFiltersDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const openButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const hasOpenedRef = useRef(false);

  useEffect(() => {
    if (!isOpen) {
      if (hasOpenedRef.current) {
        openButtonRef.current?.focus();
      }

      return;
    }

    hasOpenedRef.current = true;
    closeButtonRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  function closeDrawer() {
    setIsOpen(false);
  }

  return (
    <div className="lg:hidden">
      <Button
        ref={openButtonRef}
        type="button"
        size="lg"
        className="fixed top-[40%] left-0 z-40 -translate-y-1/2 rounded-l-none rounded-r-lg shadow-lg"
        aria-label="Analiz filtrelerini aç"
        aria-controls="mobile-analysis-filters"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(true)}
      >
        <SlidersHorizontal aria-hidden="true" />
        <span>Filtreler</span>
      </Button>

      {isOpen ? (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            aria-label="Filtre panelini kapat"
            className="absolute inset-0 bg-foreground/20 backdrop-blur-[1px]"
            onClick={closeDrawer}
          />
          <aside
            id="mobile-analysis-filters"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-analysis-filters-title"
            className="motion-safe:animate-in motion-safe:slide-in-from-left-4 absolute inset-y-0 left-0 flex w-[min(22rem,calc(100vw-2rem))] flex-col overflow-y-auto border-r bg-background shadow-xl duration-200"
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                closeDrawer();
              }
            }}
          >
            <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
              <h2 id="mobile-analysis-filters-title" className="font-semibold">
                Analiz Filtreleri
              </h2>
              <Button
                ref={closeButtonRef}
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Filtre panelini kapat"
                onClick={closeDrawer}
              >
                <X aria-hidden="true" />
              </Button>
            </div>
            <div className="flex-1 p-4">{children(closeDrawer)}</div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
