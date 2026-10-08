import type {
  SortDirection,
  SortType,
} from "@statsparrot/web-common/features/dashboards/proto-state/derived-types";

export interface LeaderboardState {
  sortType: SortType;
  sortDirection: SortDirection;
  leaderboardSortByMeasureName: string | null;
}
