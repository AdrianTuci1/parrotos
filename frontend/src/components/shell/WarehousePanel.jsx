import React, { useState, useEffect, useRef } from "react";
import { AlertTriangle, X, Sparkles, RefreshCw, CheckCircle2, Database } from "lucide-react";
import "@/styles/warehouse.css";

export function WarehousePanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  
  const [cleanedStale, setCleanedStale] = useState(false);
  const [optimizedPartitions, setOptimizedPartitions] = useState(false);

  const panelRef = useRef(null);

  // Close panel on Escape key press
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

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

  // Derive status
  const activeAlertsCount = (cleanedStale ? 0 : 1) + (optimizedPartitions ? 0 : 1);
  const currentPressure = optimizedPartitions ? 52 : 84;
  const currentStaleSize = cleanedStale ? "1.7 TB" : "3.8 TB";
  const currentTotalSize = cleanedStale ? "12.1 TB" : "14.2 TB";

  return (
    <div className="warehouse-fab-container">
      {/* Round FAB with yellow alert triangle icon */}
      <button 
        type="button" 
        onClick={() => setIsOpen(!isOpen)}
        className={`warehouse-fab ${activeAlertsCount > 0 ? "has-alerts" : ""}`}
        title="Warehouse Status & System Alerts"
        aria-label="Toggle Warehouse Alerts Panel"
      >
        <AlertTriangle 
          size={20} 
          className={`warehouse-fab-icon ${activeAlertsCount === 0 ? "inactive" : ""}`} 
        />
      </button>

      {/* Full screen overlay */}
      {isOpen && (
        <div className="warehouse-overlay-panel" onClick={() => setIsOpen(false)}>
          {/* Prevent closing when clicking inside the modal content */}
          <div className="warehouse-modal-content" ref={panelRef} onClick={(e) => e.stopPropagation()}>
            <header className="warehouse-panel-header">
              <div className="warehouse-panel-title-wrap">
                <Database size={20} className="text-sky-300" />
                <div>
                  <h3 className="warehouse-panel-title">Warehouse & BigQuery</h3>
                  <p className="warehouse-panel-subtitle">Data warehouse allocation and query load controls</p>
                </div>
              </div>
              <button 
                type="button" 
                className="warehouse-panel-close"
                onClick={() => setIsOpen(false)}
              >
                <X size={18} />
              </button>
            </header>

            <div className="warehouse-panel-body">
              {/* Left Column: BigQuery status & Storage allocation */}
              <div className="warehouse-left-column">
                {/* BigQuery Pressure */}
                <div className="bq-pressure-section">
                  <div className="bq-pressure-header">
                    <span className="bq-pressure-title">BigQuery Pressure</span>
                    <span className={`bq-pressure-badge ${currentPressure > 70 ? "high" : "normal"}`}>
                      {currentPressure > 70 ? "HIGH STRESS" : "HEALTHY"}
                    </span>
                  </div>
                  <div className="bq-pressure-bar-container">
                    <div 
                      className={`bq-pressure-bar ${currentPressure > 70 ? "high" : "normal"}`}
                      style={{ width: `${currentPressure}%` }}
                    />
                  </div>
                  <div className="bq-pressure-details">
                    <span>Slot Utilization: {currentPressure}%</span>
                    <span>Concurrency: {optimizedPartitions ? "12 queries" : "28 queries"}</span>
                  </div>
                </div>

                {/* Storage allocations */}
                <div className="warehouse-storage-section">
                  <span className="warehouse-storage-title">Storage Allocation</span>
                  <div className="warehouse-storage-grid">
                    <div className="warehouse-storage-card">
                      <div className="warehouse-storage-card-label">Total Space</div>
                      <div className="warehouse-storage-card-value">{currentTotalSize}</div>
                    </div>
                    <div className="warehouse-storage-card">
                      <div className="warehouse-storage-card-label">Stale Data (&gt;90d)</div>
                      <div className="warehouse-storage-card-value text-amber-200">{currentStaleSize}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: AI recommendations & actions */}
              <div className="warehouse-recommendations-section">
                <span className="warehouse-recs-title">AI Optimization Recommendations</span>
                
                {activeAlertsCount === 0 ? (
                  <div className="warehouse-rec-item success">
                    <CheckCircle2 size={32} className="warehouse-rec-icon success" />
                    <span className="warehouse-rec-desc text-emerald-200 font-semibold text-sm">
                      All optimizations complete!
                    </span>
                    <p className="text-[#8E918F] text-[12px] mt-2">
                      Warehouse storage and BigQuery query slots are operating at peak efficiency.
                    </p>
                  </div>
                ) : (
                  <>
                    {!cleanedStale && (
                      <div className="warehouse-rec-item">
                        <div className="warehouse-rec-item-header">
                          <AlertTriangle size={18} className="warehouse-rec-icon text-amber-400" />
                          <span className="warehouse-rec-desc">
                            <strong>Stale Logs Found:</strong> 2.1 TB of raw logs (<code>raw_events_2025</code>) has not been queried for over 90 days. Delete these to free up space.
                          </span>
                        </div>
                        <button 
                          type="button" 
                          className="warehouse-rec-action-btn"
                          onClick={handleCleanStale}
                          disabled={isCleaning}
                        >
                          {isCleaning ? (
                            <span className="flex items-center gap-1.5 justify-center">
                              <RefreshCw size={12} className="animate-spin" />
                              Cleaning...
                            </span>
                          ) : (
                            "Clean Stale Logs"
                          )}
                        </button>
                      </div>
                    )}

                    {!optimizedPartitions && (
                      <div className="warehouse-rec-item">
                        <div className="warehouse-rec-item-header">
                          <Sparkles size={18} className="warehouse-rec-icon text-sky-400" />
                          <span className="warehouse-rec-desc">
                            <strong>Query Partitioning:</strong> 3 heavy unscanned queries on <code>orders</code> causing query timeouts. Optimize partitions to free BigQuery slots.
                          </span>
                        </div>
                        <button 
                          type="button" 
                          className="warehouse-rec-action-btn text-sky-300 border-sky-500/25 bg-sky-500/10 hover:bg-sky-500 hover:text-slate-900"
                          onClick={handleOptimizePartitions}
                          disabled={isOptimizing}
                        >
                          {isOptimizing ? (
                            <span className="flex items-center gap-1.5 justify-center">
                              <RefreshCw size={12} className="animate-spin" />
                              Optimizing...
                            </span>
                          ) : (
                            "Optimize Queries"
                          )}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
