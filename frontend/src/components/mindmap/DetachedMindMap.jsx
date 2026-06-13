import React, { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { clsx } from 'clsx';
import {
    Activity,
    Box,
    Code2,
    Database,
    FolderKanban,
    Globe,
    LayoutDashboard,
    Pencil,
    RefreshCw,
    Play,
    Sparkles
} from 'lucide-react';
import { useStore } from './MockStoreProvider';
import { FeatureMindMapStore } from './FeatureMindMapStore';

const NODE_LAYOUT = {
    source: { width: 272, anchor: 'right' },
    action: { width: 220, anchor: 'center' },
    category: { width: 260, anchor: 'left' },
    group: { width: 250, anchor: 'left' },
    card: { width: 268, anchor: 'left' },
    idea: { width: 220, anchor: 'left' }
};

const SOURCE_ICON_BY_TYPE = {
    db: Database,
    database: Database,
    warehouse: Database,
    sql: Database,
    api: Globe,
    http: Globe,
    crm: Globe,
    ga4: Globe,
    facebook_ads: Globe,
    shopify: Globe,
    tiktok_ads: Globe,
    stripe: Globe,
    hubspot: Globe,
    stream: Activity,
    kafka: Activity,
    events: Activity
};

const COLUMN_STATUS_TEXT_TONES = {
    ok: 'text-[#B8C4D1]',
    active: 'text-[#B8C4D1]',
    warning: 'text-amber-200',
    error: 'text-rose-200'
};

const CARD_SURFACE_CLASS = 'border-white/10 bg-[#1A1C20]/96 shadow-[0_12px_28px_rgba(0,0,0,0.24)]';
const CARD_ICON_SURFACE_CLASS = 'border-white/10 bg-[#23262B]';

const getNodeFrame = (node) => {
    const config = NODE_LAYOUT[node?.type] || NODE_LAYOUT.idea;

    if (config.anchor === 'right') {
        return {
            left: node.x - config.width,
            right: node.x,
            centerY: node.y,
            width: config.width
        };
    }

    if (config.anchor === 'left') {
        return {
            left: node.x,
            right: node.x + config.width,
            centerY: node.y,
            width: config.width
        };
    }

    return {
        left: node.x - (config.width / 2),
        right: node.x + (config.width / 2),
        centerY: node.y,
        width: config.width
    };
};

const getPortPosition = (node, side) => {
    const frame = getNodeFrame(node);

    return {
        x: side === 'left' ? frame.left : frame.right,
        y: frame.centerY
    };
};

const buildEdgePath = (store, edge) => {
    const sourceNode = store.ui.positionedNodeMap.get(edge.sourceId) || store.data.nodeMap.get(edge.sourceId);
    const targetNode = store.ui.positionedNodeMap.get(edge.targetId) || store.data.nodeMap.get(edge.targetId);
    const source = sourceNode ? getPortPosition(sourceNode, 'right') : edge.source;
    const target = targetNode ? getPortPosition(targetNode, 'left') : edge.target;
    const controlOffset = Math.max(56, Math.abs(target.x - source.x) * 0.32);

    return `M ${source.x} ${source.y}
        C ${source.x + controlOffset} ${source.y},
          ${target.x - controlOffset} ${target.y},
          ${target.x} ${target.y}`;
};

const buildPreviewEdgePath = (sourceNode, ghostNode) => {
    const source = getPortPosition(sourceNode, 'right');
    const target = getPortPosition(ghostNode, 'left');
    const controlOffset = Math.max(56, Math.abs(target.x - source.x) * 0.32);

    return `M ${source.x} ${source.y}
        C ${source.x + controlOffset} ${source.y},
          ${target.x - controlOffset} ${target.y},
          ${target.x} ${target.y}`;
};

const NodePorts = ({ showInput = true, showOutput = true }) => (
    <>
        {showInput && (
            <div className="pointer-events-none absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2">
                <div className="flex h-3.5 w-3.5 items-center justify-center rounded-full border border-white/18 bg-[#0D1116] shadow-[0_0_0_2px_rgba(10,13,18,0.9)]">
                    <div className="h-1.5 w-1.5 rounded-full bg-[#8B98A6]" />
                </div>
            </div>
        )}
        {showOutput && (
            <div className="pointer-events-none absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2">
                <div className="flex h-3.5 w-3.5 items-center justify-center rounded-full border border-sky-300/24 bg-[#0D1116] shadow-[0_0_0_2px_rgba(10,13,18,0.9)]">
                    <div className="h-1.5 w-1.5 rounded-full bg-sky-300/80" />
                </div>
            </div>
        )}
    </>
);

const renderSourceIcon = (iconType, className) => {
    const sourceType = String(iconType || '').toLowerCase();

    if (SOURCE_ICON_BY_TYPE[sourceType] === Database) {
        return <Database size={19} className={className} />;
    }

    if (SOURCE_ICON_BY_TYPE[sourceType] === Globe) {
        return <Globe size={19} className={className} />;
    }

    if (SOURCE_ICON_BY_TYPE[sourceType] === Activity) {
        return <Activity size={19} className={className} />;
    }

    return <Box size={19} className={className} />;
};

const getNodeStateClasses = (viewModel) => clsx(
    'pointer-events-auto transition-all duration-300 ease-out',
    viewModel.isDimmed ? 'opacity-10 blur-[1px] saturate-50' : 'opacity-100',
    viewModel.isTraceActive && !viewModel.isDimmed && 'scale-[1.015]'
);

const ContextMenu = ({ store }) => {
    const activeMenu = store.ui.activeMenu;

    if (!activeMenu) {
        return null;
    }

    return (
        <div
            data-mindmap-interactive="true"
            className="absolute z-[140] min-w-[180px] rounded-2xl border border-white/10 bg-[#111317]/96 p-1.5 shadow-[0_24px_60px_rgba(0,0,0,0.45)] backdrop-blur-xl"
            style={store.ui.getViewportStyle(activeMenu.x, activeMenu.y, activeMenu.transform)}
            onMouseDown={(event) => event.stopPropagation()}
            onClick={(event) => event.stopPropagation()}
        >
            {activeMenu.actions.map((action) => {
                const Icon = action.icon;

                return (
                    <button
                        key={action.id}
                        type="button"
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-[11px] font-medium text-[#DCE4EB] transition-colors hover:bg-white/[0.06]"
                        onClick={(event) => {
                            event.stopPropagation();
                            store.ui.clearActiveMenu();
                            action.onSelect();
                        }}
                    >
                        {Icon && <Icon size={13} className="text-[#92A2B3]" />}
                        <span>{action.label}</span>
                    </button>
                );
            })}
        </div>
    );
};

const EmptyState = () => (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#0B0D0E]/50 backdrop-blur-[2px]">
        <div className="flex max-w-md flex-col items-center rounded-[28px] border border-white/10 bg-[#15181D] px-10 py-10 text-center shadow-[0_30px_80px_rgba(0,0,0,0.42)]">
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
                <Database size={32} className="text-sky-200/60" />
            </div>
            <h3 className="mb-2 text-xl font-semibold text-white">No Data Discovered Yet</h3>
            <p className="text-sm leading-relaxed text-[#93A0AD]">
                Connect a source and the map will populate as layers become available.
            </p>
        </div>
    </div>
);

const PendingPreview = ({ store }) => {
    const preview = store.ui.pendingPreview;

    if (!preview) {
        return null;
    }

    return (
        <div
            className="absolute -translate-y-1/2"
            style={{ left: preview.ghostNode.x, top: preview.ghostNode.y, width: 260 }}
        >
            <div
                className="relative rounded-[20px] border border-emerald-300/30 bg-emerald-500/[0.06] p-4 shadow-[0_12px_28px_rgba(0,0,0,0.20)] backdrop-blur-xl"
            >
                <NodePorts showInput={true} showOutput={true} />
                <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-emerald-300/30 bg-[#1E2A24]">
                        <Sparkles size={17} className="text-emerald-200" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="truncate text-[14px] font-semibold text-white">{preview.ghostNode.label}</div>
                        <div className="mt-1 text-[11px] leading-relaxed text-emerald-100/80">
                            Preparing virtual flow...
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const INSIGHT_NODE_WIDTH = 236;

const InsightDock = observer(({ store }) => {
    return null;
});

const SourceNode = ({ store, viewModel }) => {
    const { node, sourceLoadState, hasIncoming, hasOutgoing } = viewModel;
    const isPendingPreview = store.ui.pendingPreviewSourceId === node.id;

    return (
        <div
            data-mindmap-interactive="true"
            className={clsx(
                'absolute z-10 overflow-visible -translate-x-full -translate-y-1/2 cursor-pointer',
                getNodeStateClasses(viewModel)
            )}
            style={{ left: node.x, top: node.y, width: 272 }}
            onMouseEnter={() => store.ui.setHoveredNodeId(node.id)}
            onMouseLeave={store.ui.clearHoveredNode}
        >
            <div className="relative">
                <div
                    ref={(element) => store.ui.measureNode(node.id, element)}
                    className={clsx('relative rounded-[20px] border p-4 backdrop-blur-xl', CARD_SURFACE_CLASS)}
                    onClick={() => store.handleNodeClick(node)}
                    onContextMenu={(event) => store.openNodeMenu(event, node)}
                >
                    <NodePorts showInput={hasIncoming} showOutput={hasOutgoing || isPendingPreview} />
                    <div className="flex items-start gap-3">
                        <div className={clsx('flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border', CARD_ICON_SURFACE_CLASS)}>
                            {renderSourceIcon(node.iconType, 'text-sky-200')}
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="min-w-0 flex-1">
                                <div className="truncate text-[14px] font-semibold tracking-[0.01em] text-white">{node.label}</div>
                                <div className="mt-1 text-[11px] text-[#8FA0B1]">{String(node.iconType || '').toUpperCase()}</div>
                            </div>
                        </div>
                    </div>
                </div>

                {!sourceLoadState?.isLoaded && !isPendingPreview && (
                    <button
                        type="button"
                        className="absolute top-1/2 z-20 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-emerald-300/30 bg-emerald-500/[0.14] text-emerald-100 shadow-[0_10px_25px_rgba(0,0,0,0.28)]"
                        style={{ left: 'calc(100% + 16px)' }}
                        onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            store.handlePendingLayerAction(event, node);
                        }}
                        aria-label={sourceLoadState.buttonLabel}
                        title={sourceLoadState.buttonLabel}
                    >
                        <Play size={18} fill="currentColor" />
                    </button>
                )}
            </div>
        </div>
    );
};

const ActionNode = ({ store, viewModel }) => {
    const { node, hasIncoming, hasOutgoing } = viewModel;

    return (
        <div
            data-mindmap-interactive="true"
            className={clsx(
                'absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer',
                getNodeStateClasses(viewModel)
            )}
            style={{ left: node.x, top: node.y, width: 220 }}
            onClick={() => store.handleNodeClick(node)}
            onContextMenu={(event) => store.openNodeMenu(event, node)}
            onMouseEnter={() => store.ui.setHoveredNodeId(node.id)}
            onMouseLeave={store.ui.clearHoveredNode}
        >
            <div
                ref={(element) => store.ui.measureNode(node.id, element)}
                className={clsx('relative rounded-[18px] border p-3.5 backdrop-blur-xl', CARD_SURFACE_CLASS)}
            >
                <NodePorts showInput={hasIncoming} showOutput={hasOutgoing} />
                <div className="flex items-center gap-3">
                    <div className={clsx('flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border', CARD_ICON_SURFACE_CLASS)}>
                        <Code2 size={18} className="text-sky-200" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="truncate text-[13px] font-semibold uppercase tracking-[0.12em] text-[#E5EDF5]">{node.label}</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const GoldNode = ({ store, viewModel }) => {
    const { node, description, childIds, isClickableCategory, hasIncoming, hasOutgoing } = viewModel;
    const columns = node.data?.columns || [];

    return (
        <div
            data-mindmap-interactive="true"
            className={clsx(
                'absolute -translate-y-1/2',
                isClickableCategory && 'cursor-pointer',
                getNodeStateClasses(viewModel)
            )}
            style={{ left: node.x, top: node.y, width: 260 }}
            onClick={() => (isClickableCategory ? store.toggleGroup(childIds) : store.handleNodeClick(node))}
            onContextMenu={(event) => store.openNodeMenu(event, node)}
            onMouseEnter={() => store.ui.setHoveredNodeId(node.id)}
            onMouseLeave={store.ui.clearHoveredNode}
        >
            <div className={clsx(
                'relative rounded-[20px] border p-4 backdrop-blur-xl',
                CARD_SURFACE_CLASS,
                isClickableCategory && 'hover:border-white/15'
            )}
            ref={(element) => store.ui.measureNode(node.id, element)}
            >
                <NodePorts showInput={hasIncoming} showOutput={hasOutgoing} />
                <div className="flex items-start gap-3">
                    <div className={clsx('flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border', CARD_ICON_SURFACE_CLASS)}>
                        <Sparkles size={17} className="text-fuchsia-200" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="truncate text-[14px] font-semibold text-white">{node.label}</div>
                        {description && (
                            <div className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-[#9EA9B5]">
                                {description}
                            </div>
                        )}
                        {columns.length > 0 && (
                            <div className="mt-2 text-[11px] leading-relaxed">
                                {columns.map((column, index) => (
                                    <React.Fragment key={`${node.id}-${column.id || column.name}-${index}`}>
                                        <span className={COLUMN_STATUS_TEXT_TONES[column.status] || COLUMN_STATUS_TEXT_TONES.ok}>
                                            {column.title || column.name}
                                        </span>
                                        {index < columns.length - 1 && <span className="text-[#6F7A86]">, </span>}
                                    </React.Fragment>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const GroupNode = ({ store, viewModel }) => {
    const { node, hasIncoming, hasOutgoing } = viewModel;

    return (
        <div
            data-mindmap-interactive="true"
            className={clsx('absolute -translate-y-1/2 cursor-pointer', getNodeStateClasses(viewModel))}
            style={{ left: node.x, top: node.y, width: 250 }}
            onClick={() => store.handleNodeClick(node)}
            onContextMenu={(event) => store.openNodeMenu(event, node)}
            onMouseEnter={() => store.ui.setHoveredNodeId(node.id)}
            onMouseLeave={store.ui.clearHoveredNode}
        >
            <div
                ref={(element) => store.ui.measureNode(node.id, element)}
                className={clsx('relative rounded-full border px-4 py-3 backdrop-blur-xl', CARD_SURFACE_CLASS)}
            >
                <NodePorts showInput={hasIncoming} showOutput={hasOutgoing} />
                <div className="flex items-center gap-3">
                    <div className={clsx('flex h-10 w-10 shrink-0 items-center justify-center rounded-full border', CARD_ICON_SURFACE_CLASS)}>
                        <FolderKanban size={17} className="text-emerald-200" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="truncate text-[14px] font-semibold text-emerald-50">{node.label}</div>
                        <div className="mt-1 text-[11px] text-emerald-100/70">
                            {node.data?.activationMode || node.data?.activation_mode || ''}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const InsightNode = observer(({ store, viewModel }) => {
    const { node, hasIncoming, hasOutgoing } = viewModel;
    const isVisible = store.ui.isInsightVisible(node.id);
    const RecommendationIcon = viewModel.isRecommended ? Sparkles : null;
    const isPendingCreation = viewModel.isPendingCreation;
    const isCreating = store.ui.isInsightCreating(node.id);

    return (
        <div
            data-mindmap-interactive="true"
            className={clsx(
                'absolute -translate-y-1/2 cursor-pointer',
                getNodeStateClasses(viewModel),
                !isVisible && 'opacity-55 saturate-50'
            )}
            style={{ left: node.x, top: node.y, width: INSIGHT_NODE_WIDTH }}
            onClick={() => store.handleNodeClick(node)}
            onContextMenu={(event) => store.openNodeMenu(event, node)}
            onMouseEnter={() => store.ui.setHoveredNodeId(node.id)}
            onMouseLeave={store.ui.clearHoveredNode}
        >
            <div
                ref={(element) => store.ui.measureNode(node.id, element)}
                className={clsx(
                    'relative rounded-[18px] border px-3.5 py-3 backdrop-blur-xl',
                    CARD_SURFACE_CLASS,
                    !isVisible && 'border-white/6 bg-[#171A1E]/80',
                    isPendingCreation && 'border-dashed border-sky-300/18 bg-[#14181D]/74 shadow-none'
                )}
            >
                <NodePorts showInput={hasIncoming} showOutput={hasOutgoing} />
                <div className="flex items-center gap-3">
                    <div className={clsx(
                        'flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border',
                        isPendingCreation ? 'border-sky-300/16 bg-[#1A2128]' : CARD_ICON_SURFACE_CLASS
                    )}>
                        <LayoutDashboard size={17} className={isPendingCreation ? 'text-[#6F7C88]' : 'text-sky-200'} />
                    </div>
                    <div className="min-w-0 flex-1 self-center">
                        <div className={clsx(
                            'truncate text-[13px] font-semibold leading-tight',
                            isPendingCreation ? 'text-[#94A0AC]' : 'text-white'
                        )}>
                            {node.label}
                        </div>
                        {isPendingCreation && (
                            <div className="mt-1 flex items-center gap-2">
                                <div className="h-1.5 w-14 rounded-full bg-white/10" />
                                <div className="h-1.5 w-9 rounded-full bg-white/6" />
                            </div>
                        )}
                    </div>
                </div>

                {RecommendationIcon && (
                    <div
                        className={clsx(
                            'absolute top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border shadow-[0_10px_25px_rgba(0,0,0,0.28)]',
                            'border-amber-300/30 bg-amber-400/[0.16] text-amber-100'
                        )}
                        style={{ left: 'calc(100% + 16px)' }}
                        title="AI recommendation"
                    >
                        <RecommendationIcon size={17} />
                    </div>
                )}

                {isPendingCreation && (
                    <button
                        type="button"
                        className={clsx(
                            'absolute top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border shadow-[0_10px_25px_rgba(0,0,0,0.28)]',
                            isCreating
                                ? 'border-sky-300/30 bg-sky-500/[0.16] text-sky-100'
                                : 'border-emerald-300/30 bg-emerald-500/[0.14] text-emerald-100'
                        )}
                        style={{ left: RecommendationIcon ? 'calc(100% + 64px)' : 'calc(100% + 16px)' }}
                        onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            store.createRecommendedInsight(node.id);
                        }}
                        aria-label="Create insight"
                        title="Create insight"
                    >
                        {isCreating ? (
                            <RefreshCw size={17} className="animate-spin" />
                        ) : (
                            <Play size={17} fill="currentColor" />
                        )}
                    </button>
                )}

            </div>
        </div>
    );
});

const FieldNode = ({ store, viewModel }) => {
    const { node, isSelected, hasIncoming, hasOutgoing } = viewModel;

    return (
        <div
            data-mindmap-interactive="true"
            className={clsx('absolute -translate-y-1/2 cursor-pointer', getNodeStateClasses(viewModel))}
            style={{ left: node.x, top: node.y, width: 220 }}
            onClick={() => store.toggleSelection(node.id)}
            onContextMenu={(event) => store.openNodeMenu(event, node)}
            onMouseEnter={() => store.ui.setHoveredNodeId(node.id)}
            onMouseLeave={store.ui.clearHoveredNode}
        >
            <div className={clsx(
                'relative rounded-[16px] border px-3.5 py-3 backdrop-blur-xl',
                CARD_SURFACE_CLASS,
                isSelected ? 'border-sky-400/24' : 'border-white/8'
            )}
            ref={(element) => store.ui.measureNode(node.id, element)}
            >
                <NodePorts showInput={hasIncoming} showOutput={hasOutgoing} />
                <div className="flex items-center gap-3">
                    <div className={clsx(
                        'h-3.5 w-3.5 shrink-0 rounded-full border',
                        isSelected ? 'border-sky-300/80 bg-sky-300 shadow-[0_0_18px_rgba(125,211,252,0.7)]' : 'border-white/18 bg-white/8'
                    )} />
                    <div className="min-w-0 flex-1">
                        <div className={clsx(
                            'truncate text-[13px] font-medium',
                            isSelected ? 'text-white' : 'text-[#CDD7E1]'
                        )}>
                            {node.label}
                        </div>
                        {node.data?.type && (
                            <div className="mt-1 text-[11px] text-[#8C98A4]">{node.data.type}</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const MindMapNode = ({ store, viewModel }) => {
    switch (viewModel.node.type) {
        case 'source':
            return <SourceNode store={store} viewModel={viewModel} />;
        case 'action':
            return <ActionNode store={store} viewModel={viewModel} />;
        case 'category':
            return <GoldNode store={store} viewModel={viewModel} />;
        case 'group':
            return <GroupNode store={store} viewModel={viewModel} />;
        case 'card':
            return <InsightNode store={store} viewModel={viewModel} />;
        default:
            return <FieldNode store={store} viewModel={viewModel} />;
    }
};

const FeatureMindMap = observer(({ onNodeClick, showCosts = false, customData }) => {
    const { workspaceStore } = useStore();
    const [mindMapStore] = useState(() => new FeatureMindMapStore(workspaceStore, onNodeClick));
    const isEditorOpen = workspaceStore.editor.isOpen;
    const insightDockSignature = mindMapStore.data.layout.nodes
        .filter((node) => node.type === 'card')
        .map((node) => node.id)
        .join('|');
    void showCosts;

    // Reactively sync customData into the mock store
    useEffect(() => {
        if (customData) {
            if (customData.connector) workspaceStore.data.connector = customData.connector;
            if (customData.actionType) workspaceStore.data.actionType = customData.actionType;
            if (customData.origin) workspaceStore.data.origin = customData.origin;
            if (customData.adjustedData) workspaceStore.data.adjustedData = customData.adjustedData;
            if (customData.group) workspaceStore.data.group = customData.group;
            if (customData.insight) workspaceStore.data.insight = customData.insight;
            if (customData.mindmapManifest) workspaceStore.data.mindmapManifest = customData.mindmapManifest;
            if (customData.mindmapYaml !== undefined) workspaceStore.data.mindmapYaml = customData.mindmapYaml;
            if (customData.sourceMetadata) workspaceStore.data.sourceMetadata = customData.sourceMetadata;
        }
    }, [customData, workspaceStore]);

    useEffect(() => {
        mindMapStore.setOnNodeClick(onNodeClick);
    }, [mindMapStore, onNodeClick]);

    useEffect(() => {
        workspaceStore.ui.setActiveMindMapStore(mindMapStore);

        return () => {
            workspaceStore.ui.clearActiveMindMapStore(mindMapStore);
        };
    }, [mindMapStore, workspaceStore]);

    useEffect(() => {
        const handlePointerDown = (event) => mindMapStore.ui.handleWindowPointerDown(event);
        const handleKeyDown = (event) => mindMapStore.ui.handleWindowKeyDown(event);

        window.addEventListener('mousedown', handlePointerDown);
        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('mousedown', handlePointerDown);
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [mindMapStore]);

    useEffect(() => {
        if (isEditorOpen) {
            mindMapStore.ui.clearActiveMenu();
        }
    }, [isEditorOpen, mindMapStore]);

    useEffect(() => {
        const insightIds = mindMapStore.data.layout.nodes
            .filter((node) => node.type === 'card')
            .map((node) => node.id);

        mindMapStore.ui.syncInsightDock(insightIds);
    }, [mindMapStore, insightDockSignature]);

    // Canvas panning and zooming state
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

    const handleWheel = (event) => {
        event.preventDefault();
        const zoomFactor = 1.05;
        let newScale = workspaceStore.ui.scale;
        if (event.deltaY < 0) {
            newScale = Math.min(newScale * zoomFactor, 2.5);
        } else {
            newScale = Math.max(newScale / zoomFactor, 0.4);
        }
        workspaceStore.ui.setScale(newScale);
    };

    const handleMouseDown = (event) => {
        // Prevent panning when clicking on interactive elements like nodes, menus, buttons, etc.
        if (event.target.closest('[data-mindmap-interactive="true"], button, a, select, input, .insight-dock, .context-menu')) {
            return;
        }
        setIsDragging(true);
        setDragStart({
            x: event.clientX - workspaceStore.ui.pan.x,
            y: event.clientY - workspaceStore.ui.pan.y
        });
    };

    const handleMouseMove = (event) => {
        if (!isDragging) return;
        const dx = event.clientX - dragStart.x;
        const dy = event.clientY - dragStart.y;
        workspaceStore.ui.setPan(dx, dy);
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    return (
        <div 
            className="absolute inset-0 overflow-hidden select-none"
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        >
            <div
                className="relative flex h-full w-full items-center justify-center transition-transform duration-75 ease-out will-change-transform"
                style={{ transform: `translate(${mindMapStore.ui.pan.x}px, ${mindMapStore.ui.pan.y}px) scale(${mindMapStore.ui.scale})` }}
            >
                <div className="relative h-0 w-0">
                    <svg className="absolute left-0 top-0 overflow-visible" style={{ zIndex: -1 }}>
                        {mindMapStore.ui.edgeViewModels.map(({ edge, isTrace, isDimmed }) => (
                            <path
                                key={edge.id}
                                d={buildEdgePath(mindMapStore, edge)}
                                fill="none"
                                stroke={isTrace ? '#7DD3FC' : '#53606F'}
                                strokeWidth={isTrace ? 2.1 : 1.35}
                                className={clsx(
                                    'transition-all duration-300',
                                    isDimmed ? 'opacity-[0.08]' : isTrace ? 'opacity-100' : 'opacity-35'
                                )}
                            />
                        ))}

                        {mindMapStore.ui.pendingPreview && (
                            <path
                                d={buildPreviewEdgePath(mindMapStore.ui.pendingPreview.sourceNode, mindMapStore.ui.pendingPreview.ghostNode)}
                                fill="none"
                                stroke="#6EE7B7"
                                strokeWidth={2}
                                strokeDasharray="8 8"
                                strokeLinecap="round"
                                opacity="0.9"
                            />
                        )}
                    </svg>

                    {mindMapStore.ui.nodeViewModels.map((viewModel) => (
                        <MindMapNode key={viewModel.node.id} store={mindMapStore} viewModel={viewModel} />
                    ))}

                    <PendingPreview store={mindMapStore} />
                    <InsightDock store={mindMapStore} />
                </div>
            </div>

            <ContextMenu store={mindMapStore} />

            {mindMapStore.data.layout.nodes.length === 0 && <EmptyState />}
        </div>
    );
});

export default FeatureMindMap;
