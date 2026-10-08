import {
  TargetDashboardUrlParam,
  PreCommitShaUrlParam,
} from "@statsparrot/web-common/features/project/deploy/utils.ts";

export const load = ({ url: { searchParams } }) => {
  const targetDashboard = searchParams.get(TargetDashboardUrlParam);
  const preCommitSha = searchParams.get(PreCommitShaUrlParam);

  return {
    targetDashboard,
    preCommitSha,
  };
};
