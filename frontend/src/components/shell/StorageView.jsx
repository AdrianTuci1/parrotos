import { useState, useMemo, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useAppStore } from "@/stores/useAppStore";
import { ViewFrame } from "@/components/shell/ViewFrame";
import {
  Database,
  Layers,
  BookOpen,
  Search,
  ChevronDown,
  Copy,
  Trash2,
  Download,
  FileText,
  Folder,
  ArrowLeft,
  Check,
  FolderPlus,
  Upload,
  X
} from "lucide-react";
import "@/styles/storage.css";

// Helper to convert size text to bytes for sorting
const parseSize = (sizeStr) => {
  if (sizeStr === "--" || !sizeStr) return 0;
  const match = sizeStr.match(/^([\d.]+)\s*([a-zA-Z]+)$/);
  if (!match) return 0;
  const val = parseFloat(match[1]);
  const unit = match[2].toLowerCase();
  const multiplier = {
    b: 1,
    kb: 1024,
    mib: 1024 * 1024,
    gib: 1024 * 1024 * 1024,
    tb: 1024 * 1024 * 1024 * 1024,
  };
  return val * (multiplier[unit] || 1);
};

export function StorageView() {
  const { projectSlug } = useParams();
  const { currentWorkspace } = useAppStore();

  // Active view: list or detail
  const [selectedVolumeId, setSelectedVolumeId] = useState(null);
  
  // Tabs: volumes, queues, dicts
  const [activeTab, setActiveTab] = useState("volumes");
  
  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  
  // Sort state
  const [sortOption, setSortOption] = useState("size"); // 'size' | 'name'
  const [fileSortOption, setFileSortOption] = useState("name"); // 'name' | 'size' | 'modified'
  
  // File view current directory path
  const [currentPath, setCurrentPath] = useState([]); // Array of directory names
  
  // Toast notifications state
  const [toasts, setToasts] = useState([]);

  // Mock workspace storage states
  const [workspaceStorages, setWorkspaceStorages] = useState({});

  const showToast = (message, type = "success") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Generate mock volumes based on project slug & its connectors
  const initialVolumes = useMemo(() => {
    const connectors = currentWorkspace?.connectors || [];
    const projSlug = projectSlug || currentWorkspace?.slug || "default";

    const volumes = [];

    // Map each connector to a volume
    connectors.forEach((conn) => {
      const slugified = conn.toLowerCase().replace(/\s+/g, "-");
      if (conn === "Stripe") {
        volumes.push({
          id: `stripe-cache-${projSlug}`,
          name: `stripe-cache-${projSlug}`,
          type: "Volume v1",
          created: "about 2 months ago",
          lastModified: "about 4 minutes ago",
          size: "12.6 GiB",
          filesCount: 3736,
          files: {
            "": [
              { name: "prefetch_buffer", type: "Folder", lastModified: "about 2 months ago", size: "--" },
              { name: "stripe_config_prod.json", type: "File", lastModified: "about 2 months ago", size: "14.2 KiB" },
              { name: "sync_manifest.txt", type: "File", lastModified: "about 2 months ago", size: "2.1 KiB" },
            ],
            "prefetch_buffer": [
              { name: "shard-000000.jsonl.gz", type: "File", lastModified: "about 2 months ago", size: "3.5 MiB" },
              { name: "shard-000001.jsonl.gz", type: "File", lastModified: "about 2 months ago", size: "3.6 MiB" },
              { name: "shard-000002.jsonl.gz", type: "File", lastModified: "about 2 months ago", size: "3.2 MiB" },
              { name: "shard-000003.jsonl.gz", type: "File", lastModified: "about 2 months ago", size: "3.4 MiB" },
              { name: "shard-000004.jsonl.gz", type: "File", lastModified: "about 2 months ago", size: "3.5 MiB" },
              { name: "shard-000005.jsonl.gz", type: "File", lastModified: "about 2 months ago", size: "3.4 MiB" },
              { name: "shard-000006.jsonl.gz", type: "File", lastModified: "about 2 months ago", size: "3.5 MiB" },
              { name: "shard-000007.jsonl.gz", type: "File", lastModified: "about 2 months ago", size: "3.5 MiB" },
              { name: "shard-000008.jsonl.gz", type: "File", lastModified: "about 2 months ago", size: "3.5 MiB" },
              { name: "shard-000009.jsonl.gz", type: "File", lastModified: "about 2 months ago", size: "3.7 MiB" },
              { name: "shard-000010.jsonl.gz", type: "File", lastModified: "about 2 months ago", size: "3.5 MiB" },
            ],
          },
        });
      } else if (conn === "PostHog") {
        volumes.push({
          id: `posthog-events-${projSlug}`,
          name: `posthog-events-${projSlug}`,
          type: "Volume v1",
          created: "about 1 month ago",
          lastModified: "about 12 minutes ago",
          size: "9.0 GiB",
          filesCount: 1280,
          files: {
            "": [
              { name: "session_recordings", type: "Folder", lastModified: "about 1 month ago", size: "--" },
              { name: "event_export_config.yaml", type: "File", lastModified: "about 1 month ago", size: "8.4 KiB" },
            ],
            "session_recordings": [
              { name: "rec_2026-06-12_21.webm", type: "File", lastModified: "14 hours ago", size: "4.8 MiB" },
              { name: "rec_2026-06-12_22.webm", type: "File", lastModified: "13 hours ago", size: "5.2 MiB" },
              { name: "rec_2026-06-12_23.webm", type: "File", lastModified: "12 hours ago", size: "3.1 MiB" },
            ],
          },
        });
      } else if (conn === "Shopify") {
        volumes.push({
          id: `shopify-orders-store-${projSlug}`,
          name: `shopify-orders-store-${projSlug}`,
          type: "Volume v1",
          created: "about 2 months ago",
          lastModified: "about 18 minutes ago",
          size: "602.3 MiB",
          filesCount: 42,
          files: {
            "": [
              { name: "orders_raw", type: "Folder", lastModified: "about 2 months ago", size: "--" },
              { name: "sync_schema.json", type: "File", lastModified: "about 2 months ago", size: "5.1 KiB" },
            ],
            "orders_raw": [
              { name: "orders_2026_q1.json", type: "File", lastModified: "about 2 months ago", size: "204.5 MiB" },
              { name: "orders_2026_q2.json", type: "File", lastModified: "about 18 minutes ago", size: "392.7 MiB" },
            ],
          },
        });
      } else {
        // Generic connector volume
        const normalized = conn.toLowerCase().replace(/\s+/g, "-");
        volumes.push({
          id: `${normalized}-db-${projSlug}`,
          name: `${normalized}-db-${projSlug}`,
          type: "Volume v1",
          created: "about 3 weeks ago",
          lastModified: "about 1 hour ago",
          size: "41.1 MiB",
          filesCount: 8,
          files: {
            "": [
              { name: "db_cache", type: "Folder", lastModified: "about 3 weeks ago", size: "--" },
              { name: "connection_health.log", type: "File", lastModified: "about 1 hour ago", size: "1.2 MiB" },
            ],
            "db_cache": [
              { name: "cached_payloads.bin", type: "File", lastModified: "about 3 weeks ago", size: "39.9 MiB" },
            ],
          },
        });
      }
    });

    // Always include a system/checkpoints volume
    volumes.push({
      id: `sentinel-checkpoints-${projSlug}`,
      name: `sentinel-checkpoints-${projSlug}`,
      type: "Volume v1",
      created: "about 2 months ago",
      lastModified: "about 1 day ago",
      size: "82.4 MiB",
      filesCount: 15,
      files: {
        "": [
          { name: "models", type: "Folder", lastModified: "about 2 months ago", size: "--" },
          { name: "pipelines", type: "Folder", lastModified: "about 2 months ago", size: "--" },
          { name: "global_config.toml", type: "File", lastModified: "about 2 months ago", size: "4.8 KiB" },
        ],
        "models": [
          { name: "weights_v1.0.pt", type: "File", lastModified: "about 2 months ago", size: "40.5 MiB" },
          { name: "weights_v1.1_latest.pt", type: "File", lastModified: "about 1 day ago", size: "41.1 MiB" },
        ],
        "pipelines": [
          { name: "flow_definition.json", type: "File", lastModified: "about 2 months ago", size: "800 KiB" },
        ],
      },
    });

    return volumes;
  }, [currentWorkspace?.id, projectSlug]);

  // Current project workspace key
  const workspaceKey = currentWorkspace?.id || "default";

  // Get active list of volumes for the workspace
  const volumes = useMemo(() => {
    if (!workspaceStorages[workspaceKey]) {
      // Initialize if not present
      setWorkspaceStorages((prev) => ({
        ...prev,
        [workspaceKey]: initialVolumes,
      }));
      return initialVolumes;
    }
    return workspaceStorages[workspaceKey];
  }, [workspaceStorages, workspaceKey, initialVolumes]);

  const activeVolume = useMemo(() => {
    if (!selectedVolumeId) return null;
    return volumes.find((v) => v.id === selectedVolumeId);
  }, [volumes, selectedVolumeId]);

  // Reset navigation when switching volumes or projects
  useEffect(() => {
    setCurrentPath([]);
    setSearchQuery("");
  }, [selectedVolumeId, workspaceKey]);

  // Handle Delete Volume
  const handleDeleteVolume = (volId, volName) => {
    if (confirm(`Are you sure you want to delete the volume "${volName}"? This action is permanent.`)) {
      setWorkspaceStorages((prev) => ({
        ...prev,
        [workspaceKey]: prev[workspaceKey].filter((v) => v.id !== volId),
      }));
      if (selectedVolumeId === volId) {
        setSelectedVolumeId(null);
      }
      showToast(`Volume "${volName}" deleted successfully`, "destructive");
    }
  };

  // Helper to resolve files in current directory path
  const currentDirectoryFiles = useMemo(() => {
    if (!activeVolume) return [];
    const pathString = currentPath.join("/");
    return activeVolume.files[pathString] || [];
  }, [activeVolume, currentPath]);

  // Filtered & Sorted Volumes list
  const filteredVolumes = useMemo(() => {
    let result = [...volumes];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((v) => v.name.toLowerCase().includes(q));
    }
    // Sort
    result.sort((a, b) => {
      if (sortOption === "size") {
        return parseSize(b.size) - parseSize(a.size);
      } else {
        return a.name.localeCompare(b.name);
      }
    });
    return result;
  }, [volumes, searchQuery, sortOption]);

  // Filtered & Sorted Files list
  const filteredFiles = useMemo(() => {
    let result = [...currentDirectoryFiles];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((f) => f.name.toLowerCase().includes(q));
    }
    // Sort
    result.sort((a, b) => {
      // Folders always first
      if (a.type === "Folder" && b.type !== "Folder") return -1;
      if (a.type !== "Folder" && b.type === "Folder") return 1;

      if (fileSortOption === "size") {
        return parseSize(b.size) - parseSize(a.size);
      } else if (fileSortOption === "modified") {
        return b.lastModified.localeCompare(a.lastModified);
      } else {
        return a.name.localeCompare(b.name);
      }
    });
    return result;
  }, [currentDirectoryFiles, searchQuery, fileSortOption]);

  // Total Volume Size Calculation
  const totalVolumeSizeStr = useMemo(() => {
    let totalBytes = 0;
    volumes.forEach((v) => {
      totalBytes += parseSize(v.size);
    });
    if (totalBytes === 0) return "0 B";
    const sizes = ["B", "KiB", "MiB", "GiB", "TiB"];
    const i = Math.floor(Math.log(totalBytes) / Math.log(1024));
    return `${(totalBytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  }, [volumes]);

  // Copy breadcrumb path
  const handleCopyPath = () => {
    const pathStr = activeVolume
      ? `${activeVolume.name}/${currentPath.join("/")}`.replace(/\/$/, "")
      : "";
    navigator.clipboard.writeText(pathStr);
    showToast("Path copied to clipboard", "success");
  };

  // Navigate deeper into a folder
  const handleFolderClick = (folderName) => {
    setCurrentPath((prev) => [...prev, folderName]);
  };

  // Breadcrumb segment click
  const handleBreadcrumbClick = (index) => {
    if (index === -1) {
      setCurrentPath([]);
    } else {
      setCurrentPath((prev) => prev.slice(0, index + 1));
    }
  };

  // Mock Download File
  const handleDownloadFile = (fileName) => {
    showToast(`Initializing download for "${fileName}"...`, "info");
    setTimeout(() => {
      showToast(`File "${fileName}" downloaded successfully`, "success");
    }, 1200);
  };

  // Mock Delete File
  const handleDeleteFile = (fileName) => {
    if (!activeVolume) return;
    const pathString = currentPath.join("/");
    
    setWorkspaceStorages((prev) => {
      const updatedList = prev[workspaceKey].map((vol) => {
        if (vol.id !== activeVolume.id) return vol;

        const updatedFiles = { ...vol.files };
        const currentDirFiles = updatedFiles[pathString] || [];
        
        // Filter out the deleted file
        updatedFiles[pathString] = currentDirFiles.filter((f) => f.name !== fileName);
        
        // Recalculate filesCount and size
        let newCount = vol.filesCount - 1;
        let totalSize = parseSize(vol.size);
        const deletedFile = currentDirFiles.find((f) => f.name === fileName);
        if (deletedFile) {
          totalSize = Math.max(0, totalSize - parseSize(deletedFile.size));
        }

        // Convert back to string
        const sizes = ["B", "KiB", "MiB", "GiB", "TiB"];
        const idx = totalSize === 0 ? 0 : Math.floor(Math.log(totalSize) / Math.log(1024));
        const newSizeStr = totalSize === 0 ? "0 B" : `${(totalSize / Math.pow(1024, idx)).toFixed(1)} ${sizes[idx]}`;

        return {
          ...vol,
          size: newSizeStr,
          filesCount: newCount,
          files: updatedFiles,
        };
      });

      return {
        ...prev,
        [workspaceKey]: updatedList,
      };
    });

    showToast(`File "${fileName}" deleted`, "destructive");
  };

  // Mock Create Folder
  const handleCreateFolder = () => {
    const folderName = prompt("Enter folder name:");
    if (!folderName || !folderName.trim()) return;
    const cleanName = folderName.trim().replace(/[^a-zA-Z0-9_-]/g, "_");
    const pathString = currentPath.join("/");

    setWorkspaceStorages((prev) => {
      return {
        ...prev,
        [workspaceKey]: prev[workspaceKey].map((vol) => {
          if (vol.id !== activeVolume.id) return vol;

          const updatedFiles = { ...vol.files };
          const currentDirFiles = [...(updatedFiles[pathString] || [])];
          
          if (currentDirFiles.some((f) => f.name === cleanName)) {
            alert("A folder or file with this name already exists.");
            return vol;
          }

          currentDirFiles.push({
            name: cleanName,
            type: "Folder",
            lastModified: "just now",
            size: "--",
          });
          
          updatedFiles[pathString] = currentDirFiles;
          
          const newPathString = pathString ? `${pathString}/${cleanName}` : cleanName;
          updatedFiles[newPathString] = [];

          return {
            ...vol,
            files: updatedFiles,
            filesCount: vol.filesCount + 1,
          };
        }),
      };
    });

    showToast(`Folder "${cleanName}" created`, "success");
  };

  // Mock Upload File
  const handleUploadFile = () => {
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const pathString = currentPath.join("/");
      
      const sizeBytes = file.size;
      const sizes = ["B", "KiB", "MiB", "GiB"];
      const i = sizeBytes === 0 ? 0 : Math.floor(Math.log(sizeBytes) / Math.log(1024));
      const sizeStr = `${(sizeBytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;

      showToast(`Uploading "${file.name}"...`, "info");

      setTimeout(() => {
        setWorkspaceStorages((prev) => {
          return {
            ...prev,
            [workspaceKey]: prev[workspaceKey].map((vol) => {
              if (vol.id !== activeVolume.id) return vol;

              const updatedFiles = { ...vol.files };
              const currentDirFiles = [...(updatedFiles[pathString] || [])];

              if (currentDirFiles.some((f) => f.name === file.name)) {
                return vol;
              }

              currentDirFiles.push({
                name: file.name,
                type: "File",
                lastModified: "just now",
                size: sizeStr,
              });

              updatedFiles[pathString] = currentDirFiles;

              const newTotalBytes = parseSize(vol.size) + sizeBytes;
              const idx = Math.floor(Math.log(newTotalBytes) / Math.log(1024));
              const newSizeStr = `${(newTotalBytes / Math.pow(1024, idx)).toFixed(1)} ${sizes[idx]}`;

              return {
                ...vol,
                size: newSizeStr,
                filesCount: vol.filesCount + 1,
                files: updatedFiles,
              };
            }),
          };
        });

        showToast(`File "${file.name}" uploaded successfully`, "success");
      }, 1500);
    };
    fileInput.click();
  };

  // Escape key listener to go back
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        if (selectedVolumeId) {
          setSelectedVolumeId(null);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedVolumeId]);

  return (
    <ViewFrame
      title={activeVolume ? activeVolume.name : "Storage"}
      description={activeVolume ? null : "Persist and communicate data created or processed by your Modal Apps."}
      maxWidthClassName="max-w-3xl"
      actions={
        activeVolume ? (
          <button
            className="storage-btn-delete-header font-medium"
            onClick={() => handleDeleteVolume(activeVolume.id, activeVolume.name)}
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete</span>
          </button>
        ) : (
          <div className="storage-search-wrapper">
            <Search className="storage-search-icon w-4 h-4" />
            <input
              type="text"
              placeholder="Search volumes"
              className="storage-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <div className="storage-search-shortcut">/</div>
          </div>
        )
      }
    >
      <div className="storage-container">
        {/* Toast notifications container */}
        <div className="storage-toast-container">
          {toasts.map((toast) => (
            <div key={toast.id} className={`storage-toast ${toast.type}`}>
              <div className="storage-toast-content">
                {toast.type === "info" && <span className="animate-spin mr-1.5 font-bold">&#8635;</span>}
                {toast.type === "success" && <Check className="w-4 h-4 text-green-400" />}
                {toast.type === "destructive" && <Trash2 className="w-4 h-4 text-red-500" />}
                <span>{toast.message}</span>
              </div>
              <button className="storage-toast-close" onClick={() => removeToast(toast.id)}>
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        {!activeVolume ? (
          // Volume list view (Screenshot 1)
          <>
            <div className="storage-summary-text">
              Total volumes in the environment: {totalVolumeSizeStr}. Volume size refreshes once per day.
            </div>

            {filteredVolumes.length > 0 ? (
              <div className="storage-table-card">
                <table className="storage-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Created</th>
                      <th>Size</th>
                      <th className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredVolumes.map((vol) => (
                      <tr key={vol.id} className="row-hover">
                        <td>
                          <span
                            className="storage-volume-name font-medium"
                            onClick={() => setSelectedVolumeId(vol.id)}
                          >
                            {vol.name}
                          </span>
                        </td>
                        <td>
                          <span className="text-text-muted">{vol.created}</span>
                        </td>
                        <td>
                          <span className="text-text-muted">{vol.size}</span>
                        </td>
                        <td className="text-right">
                          <button
                            className="storage-btn-delete-volume"
                            onClick={() => handleDeleteVolume(vol.id, vol.name)}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="rounded-2xl border border-border bg-bg-secondary px-8 py-12 text-center text-text-muted">
                No volumes found matching &quot;{searchQuery}&quot;.
              </div>
            )}
          </>
        ) : (
          // Volume detail view (Screenshot 2)
          <>
            <button className="storage-back-btn" onClick={() => setSelectedVolumeId(null)}>
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Storage</span>
            </button>

            <div className="storage-metadata-row">
              <div className="storage-metadata-item">
                <span className="storage-metadata-label">Type</span>
                <span className="storage-metadata-value">{activeVolume.type}</span>
              </div>
              <div className="storage-metadata-item">
                <span className="storage-metadata-label">Created</span>
                <span className="storage-metadata-value">{activeVolume.created}</span>
              </div>
              <div className="storage-metadata-item">
                <span className="storage-metadata-label">Last modified</span>
                <span className="storage-metadata-value">{activeVolume.lastModified}</span>
              </div>
              <div className="storage-metadata-item">
                <span className="storage-metadata-label">Size</span>
                <span className="storage-metadata-value">{activeVolume.size}</span>
              </div>
              <div className="storage-metadata-item">
                <span className="storage-metadata-label">Files & Folders</span>
                <span className="storage-metadata-value">{activeVolume.filesCount}</span>
              </div>
            </div>

            <div className="storage-path-container flex-col md:flex-row gap-3">
              <div className="storage-breadcrumbs">
                <span className="storage-breadcrumb-item font-semibold text-text-primary" onClick={() => handleBreadcrumbClick(-1)}>
                  {activeVolume.name}
                </span>
                {currentPath.map((segment, index) => (
                  <span key={index} className="inline-flex items-center">
                    <span className="storage-breadcrumb-separator">/</span>
                    {index === currentPath.length - 1 ? (
                      <span className="storage-breadcrumb-active font-medium text-text-primary">{segment}</span>
                    ) : (
                      <span
                        className="storage-breadcrumb-item"
                        onClick={() => handleBreadcrumbClick(index)}
                      >
                        {segment}
                      </span>
                    )}
                  </span>
                ))}
                <button
                  className="storage-copy-path-btn"
                  title="Copy full path"
                  onClick={handleCopyPath}
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="storage-controls flex-wrap">
                <div className="storage-search-wrapper">
                  <Search className="storage-search-icon w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search files"
                    className="storage-search-input"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <div className="storage-search-shortcut">/</div>
                </div>

                <button
                  className="storage-sort-dropdown"
                  onClick={() => {
                    setFileSortOption((prev) => {
                      if (prev === "name") return "size";
                      if (prev === "size") return "modified";
                      return "name";
                    });
                  }}
                >
                  <span>
                    Sort:{" "}
                    {fileSortOption === "name"
                      ? "Alphabetical"
                      : fileSortOption === "size"
                      ? "Size"
                      : "Modified"}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>

                <button
                  className="flex items-center gap-1.5 rounded-lg border border-border bg-[#111214] hover:bg-bg-hover text-xs text-text-primary px-3 py-1.5 transition-colors"
                  onClick={handleCreateFolder}
                >
                  <FolderPlus size={13} />
                  <span>Folder</span>
                </button>

                <button
                  className="flex items-center gap-1.5 rounded-lg border border-border bg-[#111214] hover:bg-bg-hover text-xs text-text-primary px-3 py-1.5 transition-colors"
                  onClick={handleUploadFile}
                >
                  <Upload size={13} />
                  <span>Upload</span>
                </button>
              </div>
            </div>

            <div className="storage-table-card">
              {filteredFiles.length > 0 ? (
                <table className="storage-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Type</th>
                      <th>Last modified</th>
                      <th>Size</th>
                      <th className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredFiles.map((file) => (
                      <tr key={file.name} className="row-hover">
                        <td>
                          <div className="storage-file-row-name">
                            <div className={`storage-file-icon-wrapper ${file.type.toLowerCase()}`}>
                              {file.type === "Folder" ? (
                                <Folder className="w-4 h-4 fill-current text-amber-400" />
                              ) : (
                                <FileText className="w-4 h-4 text-blue-400" />
                              )}
                            </div>
                            {file.type === "Folder" ? (
                              <span
                                className="storage-file-link font-medium cursor-pointer"
                                onClick={() => handleFolderClick(file.name)}
                              >
                                {file.name}
                              </span>
                            ) : (
                              <span className="text-text-primary font-medium">{file.name}</span>
                            )}
                          </div>
                        </td>
                        <td>
                          <span className="text-text-muted">{file.type}</span>
                        </td>
                        <td>
                          <span className="text-text-muted">{file.lastModified}</span>
                        </td>
                        <td>
                          <span className="text-text-muted">{file.size}</span>
                        </td>
                        <td className="text-right">
                          <div className="storage-actions-cell">
                            {file.type === "File" && (
                              <button
                                className="storage-row-action-btn"
                                title="Download"
                                onClick={() => handleDownloadFile(file.name)}
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              className="storage-row-action-btn delete"
                              title="Delete"
                              onClick={() => handleDeleteFile(file.name)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="px-8 py-12 text-center text-text-muted">
                  {searchQuery ? "No files matched your search." : "This directory is empty."}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </ViewFrame>
  );
}
