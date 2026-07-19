import { ViewFrame } from '@/components/shell/ViewFrame';

export function OrganizationAdminView({
  title,
  description,
  primaryStat,
  secondaryStat,
}) {
  return (
    <ViewFrame title={title} description={description} maxWidthClassName="full-width">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-border bg-bg-secondary p-5">
          <span className="text-xs uppercase tracking-[0.16em] text-text-muted">Primary</span>
          <div className="mt-3 text-3xl font-semibold text-text-primary">{primaryStat.value}</div>
          <p className="mt-2 text-sm text-text-muted">{primaryStat.copy}</p>
        </div>
        <div className="rounded-2xl border border-border bg-bg-secondary p-5">
          <span className="text-xs uppercase tracking-[0.16em] text-text-muted">Secondary</span>
          <div className="mt-3 text-3xl font-semibold text-text-primary">{secondaryStat.value}</div>
          <p className="mt-2 text-sm text-text-muted">{secondaryStat.copy}</p>
        </div>
      </div>
    </ViewFrame>
  );
}
