import { describe, expect, it } from "vitest";
import type { V1DirEntry } from "@rilldata/web-common/runtime-client";
import {
  transformFileList,
  collectDirectoryPaths,
  findDirectory,
} from "./transform-file-list";

describe("file-explorer react transformFileList", () => {
  it("transforms a flat list of files", () => {
    const result = transformFileList([
      { path: "/file1.yaml", isDir: false },
      { path: "/file2.py", isDir: false },
      { path: "/file3.md", isDir: false },
    ] as V1DirEntry[]);

    expect(result).toEqual({
      name: "",
      path: "/",
      directories: [],
      files: ["file1.yaml", "file2.py", "file3.md"],
    });
  });

  it("builds nested directories and collects their paths", () => {
    const tree = transformFileList([
      { path: "/models/foo.sql", isDir: false },
      { path: "/models/sub/bar.sql", isDir: false },
    ] as V1DirEntry[]);

    expect(tree.directories).toHaveLength(1);
    expect(tree.directories[0].name).toBe("models");
    expect(tree.directories[0].files).toEqual(["foo.sql"]);
    expect(tree.directories[0].directories[0].name).toBe("sub");

    expect(collectDirectoryPaths(tree)).toEqual(["/models", "/models/sub"]);
  });

  it("findDirectory locates a directory by path", () => {
    const tree = transformFileList([
      { path: "/models/foo.sql", isDir: false },
    ] as V1DirEntry[]);
    expect(findDirectory(tree, "/models")?.name).toBe("models");
    expect(findDirectory(tree, "/nope")).toBeUndefined();
  });
});
