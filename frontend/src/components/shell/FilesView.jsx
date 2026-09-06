import { useMemo } from "react";
import { useParams } from "react-router-dom";
import { useRuntimeClient } from "@rilldata/web-common/runtime-client/react";
import { getRuntimeServiceListFilesQueryOptions } from "@rilldata/web-common/runtime-client";
import { useQuery } from "@tanstack/react-query";
import FileExplorer from "@rilldata/web-common/features/file-explorer/react/FileExplorer";
import { transformFileList } from "@rilldata/web-common/features/file-explorer/react/transform-file-list";
import { FileContentView } from "@/components/shell/FileContentView";
import { ViewFrame } from "@/components/shell/ViewFrame";

/**
 * Rill-style `/files` artifact view.
 *
 * When a `filePath` segment is present (i.e. a file was clicked in the sidebar file
 * tree) it renders the file's content in an editor chrome (`FileContentView`),
 * mirroring Rill's `/files/{path}` route. Without a path, it queries the runtime
 * for the project's file tree (`RuntimeService.ListFiles`), shapes it into the
 * `Directory` tree the ported React `FileExplorer` consumes and mounts it. While a
 * live runtime is reachable the tree is real; when the query has no data (mock/
 * local without a runtime) a minimal sample tree is shown so the route still renders.
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
    {
      name: "metrics",
      path: "/metrics",
      directories: [],
      files: ["orders_metrics.yaml"],
    },
  ],
  files: ["rill.yaml"],
};

export function FilesView() {
  const { ["*"]: filePath } = useParams();
  const runtimeClient = useRuntimeClient();

  // Runtime file-tree query (React hook). `enabled` is governed by the generated
  // query options (instanceId present), so the request fails fast (retry:false)
  // when no runtime is reachable and `listFiles.data` stays undefined -> the
  // sample tree renders instead of crashing the view.
  const listFiles = useQuery(
    getRuntimeServiceListFilesQueryOptions(runtimeClient, {}, {
      query: { retry: false },
    }),
  );

  const fileTree = useMemo(() => {
    const files = listFiles.data?.files;
    if (files && files.length > 0) {
      return transformFileList(files);
    }
    return undefined;
  }, [listFiles.data]);

  const tree = fileTree || SAMPLE_TREE;

  // A file path is selected (clicked in the sidebar tree) -> render its content.
  if (filePath) {
    return (
      <ViewFrame
        title="Files"
        description={`Editing ${filePath}`}
        maxWidthClassName="full-width"
      >
        <FileContentView filePath={filePath} />
      </ViewFrame>
    );
  }

  return (
    <ViewFrame
      title="Files"
      description="Browse and edit the project files backing your artifacts. Select a file from the sidebar to open it."
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
