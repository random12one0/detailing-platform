// Where this repo is: tools/studio-audit/ sits two folders below the repo root. Forward slashes, no trailing slash.
const fromUrl = (rel) => decodeURIComponent(new URL(rel, import.meta.url).pathname).replace(/^\/(?=[A-Za-z]:)/, "").replace(/\/+$/, "");
export const TOOL_DIR = fromUrl(".");
export const REPO_ROOT = fromUrl("../..");
