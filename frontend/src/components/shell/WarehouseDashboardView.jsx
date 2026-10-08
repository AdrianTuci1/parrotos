import React, { useState, useEffect } from "react";
import { ViewFrame } from "@/components/shell/ViewFrame";
import { 
  Database, 
  RefreshCw, 
  Activity, 
  Sparkles, 
  Clock3, 
  ChevronDown, 
  CheckCircle2, 
  AlertTriangle 
} from "lucide-react";

export function WarehouseDashboardView({ onAlertsChange }) {
  const [isCleaning, setIsCleaning] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  
  const [cleanedStale, setCleanedStale] = useState(false);
  const [optimizedPartitions, setOptimizedPartitions] = useState(false);

  const handleCleanStale = () => {
    setIsCleaning(true);
    setTimeout(() => {
      setIsCleaning(false);
      setCleanedStale(true);
    }, 1500);
  };

  const handleOptimizePartitions = () => {
    setIsOptimizing(true);
    setTimeout(() => {
      setIsOptimizing(false);
      setOptimizedPartitions(true);
    }, 1500);
  };

  // Derive metrics
  const activeAlertsCount = (cleanedStale ? 0 : 1) + (optimizedPartitions ? 0 : 1);
  const currentPressure = optimizedPartitions ? 52 : 84;
  const currentStaleSize = cleanedStale ? "1.7 TB" : "3.8 TB";
  const currentTotalSize = cleanedStale ? "12.1 TB" : "14.2 TB";

  // Notify parent component when alerts count changes
  useEffect(() => {
    if (onAlertsChange) {
      onAlertsChange(activeAlertsCount);
    }
  }, [activeAlertsCount, onAlertsChange]);

  return (
    <div className="warehouse-dashboard" style={{ backgroundColor: "#090A0B", overflowY: "auto" }}>
      <ViewFrame
        title="Warehouse & BigQuery Status"
        description="Monitor queries load, stale partitions, and run AI cleanup actions."
        actions={
          <div className="dashboard-header-controls">
            <div className="dashboard-time-select-wrapper">
              <select className="dashboard-time-select" disabled defaultValue="24h">
                <option value="24h">Last 24h</option>
              </select>
              <ChevronDown size={12} className="dashboard-time-select-icon" />
            </div>
            <button className="dashboard-refresh-btn" type="button" disabled>
              <RefreshCw size={14} />
            </button>
          </div>
        }
      >
        {/* Widget Grid conforming to standard Sentry desktop layout sizes */}
        <div className="dashboard-grid" style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gridAutoRows: "auto", gap: "12px", marginTop: "12px" }}>
          
          {/* ==================== ROW 1: 4 KPI CARDS (1 Col each) ==================== */}
          
          {/* KPI 1: BigQuery Load */}
          <div className="widget-card" style={{ gridColumn: "span 1" }}>
            <header className="widget-header">
              <span className="widget-title">BigQuery Load</span>
            </header>
            <div className="widget-content-body" style={{ padding: "14px 16px" }}>
              <div style={{ fontSize: "24px", fontWeight: "700", color: currentPressure > 70 ? "#F87171" : "#10B981" }}>
                {currentPressure}%
              </div>
              <div style={{ fontSize: "11px", color: "#8E918F", marginTop: "4px" }}>
                {currentPressure > 70 ? "High slot contention" : "System operational"}
              </div>
            </div>
          </div>

          {/* KPI 2: Concurrency */}
          <div className="widget-card" style={{ gridColumn: "span 1" }}>
            <header className="widget-header">
              <span className="widget-title">Running Queries</span>
            </header>
            <div className="widget-content-body" style={{ padding: "14px 16px" }}>
              <div style={{ fontSize: "24px", fontWeight: "700", color: "#FFF" }}>
                {optimizedPartitions ? "12" : "28"}
              </div>
              <div style={{ fontSize: "11px", color: "#8E918F", marginTop: "4px" }}>
                Active parallel threads
              </div>
            </div>
          </div>

          {/* KPI 3: Allocated Space */}
          <div className="widget-card" style={{ gridColumn: "span 1" }}>
            <header className="widget-header">
              <span className="widget-title">Allocated Space</span>
            </header>
            <div className="widget-content-body" style={{ padding: "14px 16px" }}>
              <div style={{ fontSize: "24px", fontWeight: "700", color: "#FFF" }}>
                {currentTotalSize}
              </div>
              <div style={{ fontSize: "11px", color: "#8E918F", marginTop: "4px" }}>
                Out of 50 TB limit
              </div>
            </div>
          </div>

          {/* KPI 4: Stale Log Size */}
          <div className="widget-card" style={{ gridColumn: "span 1" }}>
            <header className="widget-header">
              <span className="widget-title">Stale Logs (&gt;90d)</span>
            </header>
            <div className="widget-content-body" style={{ padding: "14px 16px" }}>
              <div style={{ fontSize: "24px", fontWeight: "700", color: cleanedStale ? "#8E918F" : "#FBBF24" }}>
                {currentStaleSize}
              </div>
              <div style={{ fontSize: "11px", color: "#8E918F", marginTop: "4px" }}>
                {cleanedStale ? "Cleanup complete" : "Action recommended"}
              </div>
            </div>
          </div>

          {/* ==================== ROW 2: CAPACITY METERS (2 Cols each) ==================== */}
          
          {/* Card 1: Warehouse Capacity Allocation (Segmented Bar) */}
          <div className="widget-card" style={{ gridColumn: "span 2" }}>
            <header className="widget-header">
              <div className="warehouse-widget-title-wrap">
                <Database size={14} className="warehouse-widget-icon" style={{ marginRight: '6px', verticalAlign: 'middle', display: 'inline-block' }} />
                <span className="widget-title">Warehouse Capacity Allocation</span>
              </div>
            </header>

            <div className="widget-content-body warehouse-widget-body" style={{ padding: "18px" }}>
              <div className="segmented-bar-widget-container" style={{ padding: "0" }}>
                <div className="segmented-bar-widget-toolbar">
                  <div className="segmented-bar-widget-summary">
                    <div className="segmented-bar-widget-value" style={{ fontSize: "20px" }}>
                      {currentTotalSize}
                      <span style={{ fontSize: "12px", marginLeft: "6px", color: "#8E918F", fontWeight: "normal", textTransform: "none" }}>allocated space</span>
                    </div>
                  </div>
                </div>

                <div className="segmented-bar-widget-bar" style={{ height: "10px", margin: "12px 0" }}>
                  {/* Active Records: 10.4 TB = 20.8% */}
                  <div
                    className="segmented-bar-widget-bar-segment"
                    style={{
                      width: "20.8%",
                      backgroundColor: "rgba(228, 228, 231, 0.35)",
                      borderTopLeftRadius: "16px",
                      borderBottomLeftRadius: "16px",
                    }}
                  />
                  {/* Stale Records */}
                  <div
                    className="segmented-bar-widget-bar-segment"
                    style={{
                      width: cleanedStale ? "3.4%" : "7.6%",
                      backgroundColor: "#F59E0B",
                    }}
                  />
                  {/* Available Space */}
                  <div
                    className="segmented-bar-widget-bar-segment"
                    style={{
                      width: cleanedStale ? "75.8%" : "71.6%",
                      backgroundColor: "rgba(255, 255, 255, 0.05)",
                      borderTopRightRadius: "16px",
                      borderBottomRightRadius: "16px",
                    }}
                  />
                </div>

                <div className="segmented-bar-widget-legend" style={{ borderTop: "none", paddingTop: "0" }}>
                  <div className="segmented-bar-widget-legend-item">
                    <div className="segmented-bar-widget-legend-dot" style={{ backgroundColor: "rgba(228, 228, 231, 0.35)" }} />
                    <span>Active (10.4 TB)</span>
                  </div>
                  <div className="segmented-bar-widget-legend-item">
                    <div className="segmented-bar-widget-legend-dot" style={{ backgroundColor: "#F59E0B" }} />
                    <span>Stale ({currentStaleSize})</span>
                  </div>
                  <div className="segmented-bar-widget-legend-item">
                    <div className="segmented-bar-widget-legend-dot" style={{ backgroundColor: "rgba(255, 255, 255, 0.05)" }} />
                    <span>Available ({cleanedStale ? "37.9 TB" : "35.8 TB"})</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: BigQuery Slot Allocation (Budget Gauge) */}
          <div className="widget-card" style={{ gridColumn: "span 2" }}>
            <header className="widget-header">
              <div className="warehouse-widget-title-wrap">
                <Activity size={14} className="warehouse-widget-icon" style={{ marginRight: '6px', verticalAlign: 'middle', display: 'inline-block' }} />
                <span className="widget-title">BigQuery Slot Allocation</span>
              </div>
            </header>

            <div className="widget-content-body warehouse-widget-body" style={{ padding: "18px" }}>
              <div className="budget-gauge-widget" style={{ padding: "0", background: "none" }}>
                <div className="budget-gauge-metrics">
                  <div className="budget-gauge-metric">
                    <span className="budget-gauge-label">Running Queries</span>
                    <span className="budget-gauge-value">{optimizedPartitions ? "12" : "28"} active</span>
                  </div>
                  <div className="budget-gauge-divider" style={{ height: "32px" }} />
                  <div className="budget-gauge-metric align-right">
                    <span className="budget-gauge-label">Active Slots</span>
                    <span className="budget-gauge-value">{optimizedPartitions ? "1,040" : "1,680"} / 2k</span>
                  </div>
                </div>

                <div className="budget-gauge-track" style={{ marginTop: "12px", marginBottom: "12px", height: "10px" }}>
                  <div 
                    className="budget-gauge-fill" 
                    style={{ 
                      width: `${currentPressure}%`,
                      background: currentPressure > 70 
                        ? "linear-gradient(90deg, rgba(245, 158, 11, 0.4), rgba(245, 158, 11, 0.15))"
                        : "linear-gradient(90deg, rgba(228, 228, 231, 0.24), rgba(228, 228, 231, 0.08))"
                    }} 
                  />
                  <div className="budget-gauge-marker" style={{ left: `${currentPressure}%`, top: "-4px", bottom: "-4px", background: currentPressure > 70 ? "#F59E0B" : "rgba(228, 228, 231, 0.72)" }} />
                </div>

                <div className="budget-gauge-progress">
                  <span className="budget-gauge-progress-value" style={{ fontSize: "16px" }}>{currentPressure}%</span>
                  <span className="budget-gauge-progress-label" style={{ fontSize: "11px" }}>utilized</span>
                </div>
              </div>
            </div>
          </div>

          {/* ==================== ROW 3: LISTS & CONTROLS (2 Cols each) ==================== */}

          {/* Card 3: AI Recommendations */}
          <div className="widget-card" style={{ gridColumn: "span 2" }}>
            <header className="widget-header">
              <div className="warehouse-widget-title-wrap">
                <Sparkles size={14} className="text-amber-400" style={{ marginRight: '6px', verticalAlign: 'middle', display: 'inline-block' }} />
                <span className="widget-title">AI Storage Optimization Recommendations</span>
              </div>
            </header>

            <div className="widget-content-body warehouse-widget-body" style={{ padding: "16px" }}>
              <div className="status-list-widget-container scrollbar-thin" style={{ display: "flex", flexDirection: "column", gap: "12px", background: "none", border: "none", padding: "0" }}>
                {activeAlertsCount === 0 ? (
                  <div className="flex items-center gap-3 transition-colors" style={{ padding: "8px 0" }}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 size={16} className="text-emerald-400" />
                        <span className="text-xs font-semibold text-text-primary" style={{ color: "#34D399" }}>
                          All storage optimizations complete.
                        </span>
                      </div>
                      <div className="text-[10px] text-text-muted mt-1" style={{ color: "#8E918F" }}>
                        Capacity limits are healthy, no stale partition errors active.
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    {!cleanedStale && (
                      <div className="flex items-center gap-3 transition-colors justify-between" style={{ paddingBottom: "12px", borderBottom: "1px solid rgba(255, 255, 255, 0.04)" }}>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: "#FBBF24" }} />
                            <span className="text-xs font-medium" style={{ color: "#E3E3E3" }}>
                              Unused logs in raw_events_2025
                            </span>
                          </div>
                          <div className="text-[10px] mt-1" style={{ color: "#8E918F", lineHeight: "1.3" }}>
                            2.1 TB logs haven't been queried for 90 days. Drop to free storage and save $52.50/mo.
                          </div>
                        </div>
                        <button 
                          type="button" 
                          className="rec-action-button"
                          onClick={handleCleanStale}
                          disabled={isCleaning}
                        >
                          {isCleaning ? "Dropping..." : "Drop Table"}
                        </button>
                      </div>
                    )}

                    {!optimizedPartitions && (
                      <div className="flex items-center gap-3 transition-colors justify-between" style={{ paddingBottom: "2px" }}>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: "#38BDF8" }} />
                            <span className="text-xs font-medium" style={{ color: "#E3E3E3" }}>
                              Heavy unscanned query stress on orders
                            </span>
                          </div>
                          <div className="text-[10px] mt-1" style={{ color: "#8E918F", lineHeight: "1.3" }}>
                            Slot exhaustion timeouts. Partition orders to drop query stress by 32%.
                          </div>
                        </div>
                        <button 
                          type="button" 
                          className="rec-action-button"
                          style={{ color: "#38BDF8", borderColor: "rgba(56, 189, 248, 0.25)", background: "rgba(56, 189, 248, 0.12)" }}
                          onClick={handleOptimizePartitions}
                          disabled={isOptimizing}
                        >
                          {isOptimizing ? "Partitioning..." : "Partition"}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Card 4: Concurrency Query Performance Monitor */}
          <div className="widget-card" style={{ gridColumn: "span 2" }}>
            <header className="widget-header">
              <div className="warehouse-widget-title-wrap">
                <Clock3 size={14} className="text-[#8E918F]" style={{ marginRight: '6px', verticalAlign: 'middle', display: 'inline-block' }} />
                <span className="widget-title">Live BigQuery Concurrency Log</span>
              </div>
            </header>

            <div className="widget-content-body warehouse-widget-body" style={{ padding: "16px" }}>
              <div className="query-log-list">
                {/* Query 1 */}
                <div className="flex items-center gap-3 justify-between" style={{ padding: "8px 10px", backgroundColor: "rgba(255,255,255,0.02)", borderRadius: "6px" }}>
                  <span style={{ fontFamily: "monospace", fontSize: "11px", color: "#E3E3E3", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "60%" }}>
                    SELECT id, total_price_usd FROM orders WHERE created_at &gt;= '2026-01-01'
                  </span>
                  <div className="flex items-center gap-3">
                    <span style={{ fontSize: "10px", color: "#8E918F" }}>1.2 TB scanned</span>
                    <span 
                      className="query-status-badge"
                      style={{ 
                        fontSize: "10px", 
                        fontWeight: "600",
                        color: optimizedPartitions ? "#34D399" : "#F87171",
                        backgroundColor: optimizedPartitions ? "rgba(16, 185, 129, 0.12)" : "rgba(239, 68, 68, 0.12)",
                        padding: "2px 6px",
                        borderRadius: "4px"
                      }}
                    >
                      {optimizedPartitions ? "OPTIMIZED" : "HEAVY SCAN"}
                    </span>
                  </div>
                </div>

                {/* Query 2 */}
                <div className="flex items-center gap-3 justify-between" style={{ padding: "8px 10px", backgroundColor: "rgba(255,255,255,0.02)", borderRadius: "6px" }}>
                  <span style={{ fontFamily: "monospace", fontSize: "11px", color: "#E3E3E3", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "60%" }}>
                    INSERT INTO web_events_buffer SELECT * FROM web_session_stream
                  </span>
                  <div className="flex items-center gap-3">
                    <span style={{ fontSize: "10px", color: "#8E918F" }}>Continuous streaming</span>
                    <span 
                      className="query-status-badge streaming"
                      style={{ 
                        fontSize: "10px", 
                        fontWeight: "600",
                        color: "#38BDF8",
                        backgroundColor: "rgba(56, 189, 248, 0.12)",
                        padding: "2px 6px",
                        borderRadius: "4px"
                      }}
                    >
                      STREAMING
                    </span>
                  </div>
                </div>

                {/* Query 3 */}
                <div className="flex items-center gap-3 justify-between" style={{ padding: "8px 10px", backgroundColor: "rgba(255,255,255,0.02)", borderRadius: "6px" }}>
                  <span style={{ fontFamily: "monospace", fontSize: "11px", color: "#E3E3E3", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "60%" }}>
                    DROP TABLE raw_events_2025_stale_backup_03
                  </span>
                  <div className="flex items-center gap-3">
                    <span style={{ fontSize: "10px", color: "#8E918F" }}>Freeing 2.1 TB</span>
                    <span 
                      className="query-status-badge"
                      style={{ 
                        fontSize: "10px", 
                        fontWeight: "600",
                        color: cleanedStale ? "#34D399" : "#8E918F",
                        backgroundColor: cleanedStale ? "rgba(16, 185, 129, 0.12)" : "rgba(255, 255, 255, 0.06)",
                        padding: "2px 6px",
                        borderRadius: "4px"
                      }}
                    >
                      {cleanedStale ? "COMPLETED" : "IDLE"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </ViewFrame>
    </div>
  );
}
