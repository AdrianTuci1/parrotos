import type { RpcStatus } from "@statsparrot/web-admin/client";
import type { AxiosError } from "axios";

export function parseError(error: AxiosError<RpcStatus>, email: string) {
  return `${email}: ${error.response?.data?.message ?? error.message}`;
}
