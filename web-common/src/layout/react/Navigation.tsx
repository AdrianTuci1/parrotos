// React translation of `layout/navigation/Navigation.svelte`. The feature-heavy
// children (AddAssetButton, FileExplorer, ConnectorExplorer, Footer) are exposed
// as props so the shell renders in isolation (and is unit-testable) while the
// features get wired in their own port phases. The `navigationOpen` store
// (`./store`) and the dragged-width / connector-height state mirror the Svelte
// original, including the cmd/ctrl+B toggle and the responsive auto-collapse.
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useReadable } from "@rilldata/web-common/features/components/charts/react/useReadable";
import {
  DEFAULT_NAV_WIDTH,
  MAX_NAV_WIDTH,
  MIN_NAV_WIDTH,
} from "@rilldata/web-common/layout/config";
import { m } from "@rilldata/web-common/lib/i18n/gen/messages";
import { navigationOpen } from "./store";
import { Resizer } from "./Resizer";
import Footer from "./Footer";
import SurfaceControlButton from "./SurfaceControlButton";
import { CaretDownIcon } from "./icons";

const DEFAULT_PERCENTAGE = 0.4;

export interface NavigationProps {
  showFooterLinks?: boolean;
  addAsset?: ReactNode;
  fileExplorer?: ReactNode;
  connectorExplorer?: ReactNode;
  dataExplorerTitle?: string;
  footer?: ReactNode;
}

export default function Navigation({
  showFooterLinks = true,
  addAsset,
  fileExplorer,
  connectorExplorer,
  dataExplorerTitle,
  footer,
}: NavigationProps) {
  const open = useReadable(navigationOpen);
  const [width, setWidth] = useState(DEFAULT_NAV_WIDTH);
  const [resizing, setResizing] = useState(false);
  const [resizingConnector, setResizingConnector] = useState(false);
  const [connectorHeightPercentage, setConnectorHeightPercentage] =
    useState(DEFAULT_PERCENTAGE);
  const [navWrapperHeight, setNavWrapperHeight] = useState(0);
  const [showConnectors, setShowConnectors] = useState(true);

  const navWrapperRef = useRef<HTMLDivElement>(null);
  const connectorWrapperRef = useRef<HTMLDivElement>(null);
  const previousWidthRef = useRef<number>(DEFAULT_NAV_WIDTH);

  // Measure the content column so the connector section can be sized relatively.
  useEffect(() => {
    const el = navWrapperRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setNavWrapperHeight(entry.contentRect.height);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Responsive collapse + cmd/ctrl+B toggle, mirroring the Svelte window handlers.
  useEffect(() => {
    const handleResize = (e: UIEvent) => {
      const currentWidth = (e.currentTarget as Window).innerWidth;
      const current = navigationOpen;
      // `useReadable` holds the snapshot; read via subscribe for the latest.
      let openState: boolean | null = true;
      const unsub = navigationOpen.subscribe((v) => (openState = v));
      unsub();

      if (openState && currentWidth < previousWidthRef.current && currentWidth < 768) {
        navigationOpen.set(null);
      } else if (openState === null && currentWidth > 768) {
        navigationOpen.set(true);
      }
      previousWidthRef.current = currentWidth;
    };

    const handleKeydown = (e: KeyboardEvent) => {
      const isMac = window.navigator.userAgent.includes("Macintosh");
      const key = isMac ? "metaKey" : "ctrlKey";
      if (e[key] && e.key === "b") {
        e.preventDefault();
        navigationOpen.toggle();
      }
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("keydown", handleKeydown);
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("keydown", handleKeydown);
    };
  }, []);

  const connectorSectionHeight = navWrapperHeight * connectorHeightPercentage;
  const isOpen = open !== false;

  function handleConnectorToggle() {
    const wasOpen = showConnectors;
    if (!wasOpen) setShowConnectors(true);
    const from = wasOpen ? connectorSectionHeight : 0;
    const to = wasOpen ? 0 : connectorSectionHeight;
    if (connectorWrapperRef.current) {
      const anim = connectorWrapperRef.current.animate(
        [
          { height: `${from}px` },
          { height: `${to}px` },
        ],
        { duration: 200, easing: "ease-out" },
      );
      anim.onfinish = () => {
        if (wasOpen) setShowConnectors(false);
      };
    }
  }

  return (
    <>
      <nav
        className={`sidebar bg-surface-base flex flex-col flex-none relative overflow-hidden h-full border-r z-0 select-none transition-[width] ${resizing ? "" : "duration-300 ease-in-out"} ${isOpen ? "" : "hide"}`}
        style={{ width: isOpen ? `${width}px` : "0px" }}
      >
        <Resizer
          min={MIN_NAV_WIDTH}
          basis={DEFAULT_NAV_WIDTH}
          max={MAX_NAV_WIDTH}
          dimension={width}
          side="right"
          resizing={resizing}
          onUpdate={(w) => setWidth(w)}
        />
        <div className="inner h-full overflow-hidden flex flex-col" style={{ width: `${width}px` }}>
          {addAsset ? (
            <div className="p-2 w-full pr-10">{addAsset}</div>
          ) : null}
          <div className="scroll-container overflow-y-auto overflow-x-hidden h-full">
            <div className="nav-wrapper flex flex-col size-full" ref={navWrapperRef}>
              <section className="size-full overflow-y-auto pb-4">{fileExplorer}</section>

              {navWrapperHeight > 0 ? (
                <section className="connector-section flex flex-col flex-none h-fit border-t relative">
                  {showConnectors ? (
                    <Resizer
                      dimension={connectorSectionHeight}
                      onUpdate={(height) =>
                        setConnectorHeightPercentage(height / navWrapperHeight)
                      }
                      direction="NS"
                      side="top"
                      min={0}
                      basis={navWrapperHeight * DEFAULT_PERCENTAGE}
                      max={navWrapperHeight * 0.9}
                      resizing={resizingConnector}
                    />
                  ) : null}

                  <button
                    type="button"
                    onClick={handleConnectorToggle}
                    className="flex gap-x-1 items-center w-full pl-2 pr-3.5 py-1.5 cursor-pointer text-fg-secondary"
                  >
                    <CaretDownIcon
                      size="14px"
                      className={`text-fg-secondary transition-transform ${showConnectors ? "" : "-rotate-90"}`}
                    />
                    <h3 className="font-semibold text-[10px] uppercase text-fg-muted">
                      {dataExplorerTitle ?? m.nav_data_explorer()}
                    </h3>
                  </button>

                  <div
                    className="connector-wrapper overflow-y-auto"
                    role="region"
                    aria-label={dataExplorerTitle ?? m.nav_data_explorer()}
                    ref={connectorWrapperRef}
                    style={{ height: `${showConnectors ? connectorSectionHeight : 0}px` }}
                  >
                    {showConnectors ? connectorExplorer : null}
                  </div>
                </section>
              ) : null}
            </div>
          </div>
          {showFooterLinks ? footer ?? <Footer /> : null}
        </div>
      </nav>

      <SurfaceControlButton
        resizing={resizing}
        navWidth={width}
        navOpen={isOpen}
        onClick={() => navigationOpen.toggle()}
      />
    </>
  );
}
