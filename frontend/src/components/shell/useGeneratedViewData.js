import { useEffect, useMemo, useState } from 'react';
import { specService } from '@/services/SpecService';
import { resolveWidgetData } from '@/components/widgets/DataResolver';
import { config as appConfig } from '@/config';
import { useAppStore } from '@/stores/useAppStore';

export function useGeneratedViewData(viewId) {
  const { currentOrganization, currentWorkspace, demoMode, timeRange } = useAppStore();
  const [spec, setSpec] = useState(null);
  const [widgetDataMap, setWidgetDataMap] = useState({});
  const [loading, setLoading] = useState(false);
  const isEnabled = !demoMode && Boolean(currentOrganization?.id && currentWorkspace?.id && viewId);

  useEffect(() => {
    if (!isEnabled) {
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const remoteSpec = await specService.getSpec(currentOrganization.id, currentWorkspace.id, viewId);
        if (cancelled) return;
        setSpec(remoteSpec);

        const entries = await Promise.all(
          (remoteSpec?.widgets || []).map(async (widget) => {
            const data = await resolveWidgetData(
              remoteSpec,
              widget.type,
              widget.config || {},
              widget.queryRef,
              {
                timeRange,
                orgId: currentOrganization.id,
                projectId: currentWorkspace.id,
                demoMode: false,
                prometheusUrl: appConfig.prometheusUrl,
              }
            );

            return [widget.id, data];
          })
        );

        if (!cancelled) {
          setWidgetDataMap(Object.fromEntries(entries));
        }
      } catch {
        if (!cancelled) {
          setSpec(null);
          setWidgetDataMap({});
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [currentOrganization?.id, currentWorkspace?.id, isEnabled, timeRange, viewId]);

  const widgetMap = useMemo(
    () => new Map(((isEnabled ? spec : null)?.widgets || []).map((widget) => [widget.id, widget])),
    [isEnabled, spec]
  );

  return {
    spec: isEnabled ? spec : null,
    widgetMap,
    widgetDataMap: isEnabled ? widgetDataMap : {},
    loading: isEnabled ? loading : false,
  };
}
