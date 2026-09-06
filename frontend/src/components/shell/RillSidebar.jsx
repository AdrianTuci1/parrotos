import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useRuntimeClient } from "@rilldata/web-common/runtime-client/react";
import { getRuntimeServiceListFilesQueryOptions } from "@rilldata/web-common/runtime-client";
import FileExplorer from "@rilldata/web-common/features/file-explorer/react/FileExplorer";
import { transformFileList } from "@rilldata/web-common/features/file-explorer/react/transform-file-list";
import { useAppStore } from "@/stores/useAppStore";
import { projectNavItems } from "@/components/app-shared";
import { cn } from "@/lib/utils";
import { SAMPLE_TREE } from "@/data/mockFileTree";
import {
  BarChart3,
  Briefcase,
  ChevronDown,
  Database,
  File,
  Folder,
  GitBranch,
  LayoutDashboard,
  Palette,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Server,
  Settings,
  Sparkles,
  Table2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import "@/styles/rill-sidebar.css";

// Rill's navigation width constants (see rill/web-common/src/layout/config.ts).
const DEFAULT_NAV_WIDTH = 240;
const MIN_NAV_WIDTH = 180;
const MAX_NAV_WIDTH = 360;

const sectionIcons = {
  "bar-chart-3": BarChart3,
  "layout-dashboard": LayoutDashboard,
  briefcase: Briefcase,
  "git-branch": GitBranch,
  files: File,
  sparkles: Sparkles,
  settings: Settings,
};

const addTopOptions = [
  { id: "data", label: "Data", icon: Database },
  { id: "model", label: "Model", icon: Table2 },
  { id: "metrics", label: "Metrics view", icon: BarChart3 },
  { id: "explore", label: "Explore dashboard", icon: LayoutDashboard },
  { id: "canvas", label: "Canvas dashboard", icon: GitBranch },
];

const addMoreOptions = [
  { id: "folder", label: "Folder", icon: Folder },
  { id: "blank", label: "Blank file", icon: File },
  { id: "api", label: "API", icon: Server },
  { id: "theme", label: "Theme", icon: Palette },
];

export function RillSidebar({ isMobileOpen = false, onCloseMobile }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentOrganization, currentWorkspace, activeSection } = useAppStore();

  const [width, setWidth] = useState(DEFAULT_NAV_WIDTH);
  const [collapsed, setCollapsed] = useState(false);
  const [resizing, setResizing] = useState(false);

  // Runtime file-tree query — mirrors FilesView so the sidebar tree and the
  // Files route stay consistent. Falls back to SAMPLE_TREE when no runtime is
  // reachable (mock / local development).
  const runtimeClient = useRuntimeClient();
  const listFiles = useQuery(
    getRuntimeServiceListFilesQueryOptions(runtimeClient, {}, {
      query: { retry: false },
    }),
  );

  const fileTree = useMemo(() => {
    const files = listFiles.data?.files;
    if (files && files.length > 0) return transformFileList(files);
    return undefined;
  }, [listFiles.data]);

  const tree = fileTree || SAMPLE_TREE;

  // Cmd/Ctrl+B collapses/expands the rail, mirroring Rill's global shortcut.
  // Registered unconditionally (all hooks must run before any early return).
  useEffect(() => {
    const handleKeydown = (e) => {
      const isMac = window.navigator.userAgent.includes("Macintosh");
      const key = isMac ? e.metaKey : e.ctrlKey;
      if (key && e.key.toLowerCase() === "b") {
        e.preventDefault();
        setCollapsed((c) => !c);
      }
    };
    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, []);

  // Only render within a resolved project scope (same guard as ProjectSubNavbar).
  const orgSlug = currentOrganization?.slug || currentOrganization?.id;
  const pSlug = currentWorkspace?.slug || currentWorkspace?.id;
  if (!orgSlug || !pSlug) return null;

  const basePath = `/app/${orgSlug}/${pSlug}`;
  const projectName = currentWorkspace?.name || pSlug;

  // Derive the active section from the URL (matching ProjectSubNavbar); the
  // `/files/:path` splat route is matched as the `files` section.
  const urlSection = location.pathname.match(/\/app\/[^/]+\/[^/]+\/(\w+)/)?.[1];
  const activeTab = urlSection || activeSection || "explore";

  // Dragging the right-edge handle resizes the rail between Rill's min/max.
  const startResize = (e) => {
    e.preventDefault();
    setResizing(true);
    const startX = e.clientX;
    const startWidth = width;
    const onMove = (ev) => {
      const delta = ev.clientX - startX;
      setWidth(Math.min(MAX_NAV_WIDTH, Math.max(MIN_NAV_WIDTH, startWidth + delta)));
    };
    const onUp = () => {
      setResizing(false);
      document.body.style.cursor = "";
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.body.style.cursor = "col-resize";
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  // Intercept clicks on the file-tree links. The ported components build bare
  // `/files...` hrefs from a SvelteKit context; we thread `basePath` down so the
  // href is a full product URL, and here we route SPA-style (no full reload).
  const handleTreeNavClick = (e) => {
    const anchor = e.target?.closest?.("a[href]");
    const href = anchor?.getAttribute?.("href");
    if (!href || !href.startsWith("/app/")) return;
    e.preventDefault();
    onCloseMobile?.();
    navigate(href);
  };

  const navToSection = (sectionId) => {
    onCloseMobile?.();
    navigate(`${basePath}/${sectionId}`);
  };

  // Mock/presentational: open the file editor for a new metrics view. The other
  // Add actions are no-ops because mutating project files belongs to the
  // runtime-bound phase (deferred).
  const handleAddMetrics = () => {
    onCloseMobile?.();
    navigate(`${basePath}/files/new_metrics_view.yaml`);
  };

  return (
    <>
      <aside
        className={cn(
          "rill-sidebar",
          collapsed && "collapsed",
          resizing && "resizing",
          isMobileOpen && "mobile-open",
        )}
        style={{ ["--rill-nav-width"]: `${width}px` }}
      >
        <div className="rill-sidebar-inner" style={{ width: `${width}px` }}>
          <div className="rill-sidebar-header">
            <span className="rill-sidebar-project-name" title={projectName}>
              {projectName}
            </span>
            <button
              type="button"
              className="rill-sidebar-collapse-btn"
              onClick={() => setCollapsed((c) => !c)}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
            </button>
          </div>

          <div className="rill-sidebar-add">
            <DropdownMenu>
              <DropdownMenuTrigger className="rill-add-trigger">
                <Plus size={14} />
                <span>Add</span>
                <ChevronDown size={12} className="rill-add-caret" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="rill-add-menu">
                {addTopOptions.map((opt) => {
                  const Icon = opt.icon;
                  return (
                    <DropdownMenuItem
                      key={opt.id}
                      className="rill-add-item"
                      onClick={opt.id === "metrics" ? handleAddMetrics : () => {}}
                    >
                      <Icon size={14} />
                      {opt.label}
                    </DropdownMenuItem>
                  );
                })}
                <DropdownMenuSeparator />
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="rill-add-item">
                    More
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="rill-add-menu">
                    {addMoreOptions.map((opt) => {
                      const Icon = opt.icon;
                      return (
                        <DropdownMenuItem
                          key={opt.id}
                          className="rill-add-item"
                          onClick={() => {}}
                        >
                          <Icon size={14} />
                          {opt.label}
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="rill-sidebar-tree" onClick={handleTreeNavClick}>
            <FileExplorer
              fileTree={tree}
              projectTitle={projectName}
              isLoading={listFiles.isLoading}
              isError={listFiles.isError}
              onRename={() => {}}
              onDuplicate={() => {}}
              onDelete={() => {}}
              onMouseDown={() => {}}
              hrefPrefix={basePath}
            />
          </div>

          {/* Footer: compact section navigation so every existing reachable section stays reachable. */}
          <div className="rill-sidebar-footer">
            <div className="rill-sidebar-footer-label">Nav</div>
            <nav className="rill-sidebar-footer-nav">
              {projectNavItems.map((item) => {
                const Icon = sectionIcons[item.icon];
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={cn("rill-sidebar-nav-item", activeTab === item.id && "active")}
                    onClick={() => navToSection(item.id)}
                  >
                    {Icon && <Icon size={15} />}
                    <span>{item.title}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {!collapsed && (
          <div
            className="rill-sidebar-resizer"
            onMouseDown={startResize}
            onDoubleClick={() => setWidth(DEFAULT_NAV_WIDTH)}
            title="Drag to resize"
          />
        )}
      </aside>

      {collapsed && (
        <button
          type="button"
          className="rill-sidebar-reopen"
          onClick={() => setCollapsed(false)}
          aria-label="Expand sidebar"
          title="Expand sidebar (⌘/Ctrl+B)"
        >
          <PanelLeftOpen size={18} />
        </button>
      )}
    </>
  );
}

export default RillSidebar;
