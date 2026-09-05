// React-port of the pure tree-shaping logic in
// `features/file-explorer/transform-file-list.ts`. Copied verbatim minus the
// Svelte-`derived` error/warning helpers (`getDirectoryHasErrors/Warnings`),
// which depend on the runtime `fileArtifacts`/queryClient and are therefore
// deferred to the runtime-bound phase. The React port keeps the tree pure so the
// graph stays free of SvelteKit `$app` imports.
import type { V1DirEntry } from "@rilldata/web-common/runtime-client";

export interface Directory {
  name: string;
  path: string;
  directories: Directory[];
  files: string[];
}

export function transformFileList(files: V1DirEntry[]): Directory {
  const rootDirectory: Directory = {
    name: "",
    path: "/",
    directories: [],
    files: [],
  };

  for (const file of files) {
    const parts = file.path?.split("/") ?? [];
    if (parts[0] === "") parts.shift(); // remove leading empty entry
    if (parts.length === 0) continue;

    const fileName = parts.pop();
    let currentDirectory = rootDirectory;

    parts.reduce((accPath, directoryName) => {
      const directoryPath = accPath
        ? `${accPath}/${directoryName}`
        : "/" + directoryName;
      let subDirectory = currentDirectory.directories.find(
        (dir) => dir.path === directoryPath,
      );

      if (!subDirectory) {
        subDirectory = {
          name: directoryName,
          path: directoryPath,
          directories: [],
          files: [],
        };
        currentDirectory.directories.push(subDirectory);
      }

      currentDirectory = subDirectory;
      return directoryPath;
    }, "");

    if (fileName) {
      if (file.isDir) {
        currentDirectory.directories.push({
          name: fileName,
          path: file.path ?? "",
          directories: [],
          files: [],
        });
      } else {
        currentDirectory.files.push(fileName);
      }
    }
  }

  return rootDirectory;
}

// Collects the paths of every directory in the tree, excluding the root.
export function collectDirectoryPaths(dir: Directory): string[] {
  const paths: string[] = [];
  for (const subDir of dir.directories) {
    paths.push(subDir.path);
    paths.push(...collectDirectoryPaths(subDir));
  }
  return paths;
}

export function findDirectory(root: Directory, filePath: string) {
  const folderTree = removeLeadingSlash(filePath).split("/");
  let dir: Directory | undefined = root;
  for (let i = 0; i < folderTree.length && dir; i++) {
    dir = dir.directories.find((d) => d.name === folderTree[i]);
  }
  return dir;
}

function removeLeadingSlash(path: string): string {
  return path.replace(/^\//, "");
}
