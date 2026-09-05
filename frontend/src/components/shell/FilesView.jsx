import { useMemo } from "react";
import { useParams } from "react-router-dom";
import { useRuntimeClient } from "@rilldata/web-common/runtime-client/react";
import { createRuntimeServiceListFiles } from "@rilldata/web-common/runtime-client";
import FileExplorer from "@rilldata/web-common/features/file-explorer/react/FileExplorer";
import { transformFileList } from "@rilldata/web-common/features/file-explorer/react/transform-file-list";
import { ViewFrame } from "@/components/shell/ViewFrame";

/**
 * Rill-style `/files` artifact view. Queries the runtime for the project's file
 * tree (RuntimeService.ListFiles), shapes it into the `Directory` tree the ported
 * React `FileExplorer` consumes and mounts it. While a live runtime is reachable
 * the tree is real; when the query has no data (mock/local without a runtime) a
 * minimal sample tree is shown so the route still renders.
 *
 * The file/line expansion state and delete confirmations are handled internally by
 * the ported FileExplorer; the write actions (rename/duplicate/delete) are no-ops
 * here because mutating project files belongs to the (deferred) runtime-bound phase
 * and is outside this route-model change.
 */
const SAMPLE_TREE = {
  name: "",
  path: "/",
  directories: [
    {
      name: "models",
      path: "/models",
      directories: [],
      files: ["orders.sql", "users.sql"],
    },
    {
      name: "sources",
      path: "/sources",
      directories: [],
      files: ["adwords.csv", "shopify.csv"],
    },
  ],
  files: ["rill.yaml"],
};

export function FilesView() {
  const { ["*"]: filePath } = useParams();
  const runtimeClient = useRuntimeClient();

  // Runtime file-tree query (React hook). `enabled` is governed by the generated
  // query options (instanceId present), so the request is skipped when no runtime
  // is configured and `listFiles.data` stays undefined -> sample tree renders.
  const listFiles = createRuntimeServiceListFiles(runtimeClient, {});

  const fileTree = useMemo(() => {
    const files = listFiles.data?.files;
    if (files && files.length > 0) {
      return transformFileList(files);
    }
    return undefined;
  }, [listFiles.data]);

  const tree = fileTree || SAMPLE_TREE;

  return (
    <ViewFrame
      title="Files"
      description={
        filePath
          ? `Editing ${filePath}`
          : "Browse and edit the project files backing your artifacts."
      }
      maxWidthClassName="full-width"
    >
      <div className="rounded-xl border bg-card p-3 shadow-sm">
        <FileExplorer
          fileTree={tree}
          projectTitle="Rill Project"
          isLoading={listFiles.isLoading}
          isError={listFiles.isError}
          onRename={() => {}}
          onDuplicate={() => {}}
          onDelete={() => {}}
          onMouseDown={() => {}}
        />
      </div>
    </ViewFrame>
  );
}

export default FilesView;
