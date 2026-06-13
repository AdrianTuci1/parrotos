import { DashboardLayout } from '@/components/widgets/DashboardLayout';
import { ViewFrame } from '@/components/shell/ViewFrame';

export function NodesView() {
  return (
    <ViewFrame
      title="Nodes / Findings"
      description="Each view now sits inside its own padded container instead of touching the shell edges."
      contentClassName="min-h-0"
    >
      <DashboardLayout layoutId="server-monitor" specViewId="servers" isNested={false} />
    </ViewFrame>
  );
}
