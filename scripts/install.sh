#!/usr/bin/env sh

# Install the Statsparrot CLI.
#
#   curl -fsSL https://get.statsparrot.com | sh
#
# Environment:
#   STATSPARROT_VERSION      release tag to install (default: the latest release)
#   STATSPARROT_INSTALL_DIR  directory for the binary (default: the first writable
#                            of /usr/local/bin and ~/.local/bin)
#
# Also called by `statsparrot upgrade`, which passes `--version <tag>`, and by
# `statsparrot uninstall`, which passes `--uninstall`.

set -eu

REPO="AdrianTuci1/parrotos"
BINARY="statsparrot"
VERSION="${STATSPARROT_VERSION:-}"
UNINSTALL=""

while [ "$#" -gt 0 ]; do
  case "$1" in
    --version)
      [ "$#" -ge 2 ] || { printf 'error: --version needs a tag\n' >&2; exit 1; }
      VERSION="$2"
      shift 2
      ;;
    --version=*)
      VERSION="${1#*=}"
      shift
      ;;
    --uninstall)
      UNINSTALL="true"
      shift
      ;;
    *)
      shift
      ;;
  esac
done

fail() {
  printf 'error: %s\n' "$*" >&2
  exit 1
}

install_dir() {
  if [ -n "${STATSPARROT_INSTALL_DIR:-}" ]; then
    printf '%s' "$STATSPARROT_INSTALL_DIR"
    return
  fi
  if [ -d /usr/local/bin ] && [ -w /usr/local/bin ]; then
    printf '%s' /usr/local/bin
    return
  fi
  printf '%s' "$HOME/.local/bin"
}

if [ -n "$UNINSTALL" ]; then
  target="$(command -v "$BINARY" 2>/dev/null || true)"
  [ -n "$target" ] || target="$(install_dir)/$BINARY"
  [ -e "$target" ] || fail "no $BINARY installation found"
  rm -f "$target" || fail "could not remove $target (try with sudo)"
  printf 'Removed %s\n' "$target"
  exit 0
fi

command -v curl >/dev/null 2>&1 || fail "curl is required"
command -v tar >/dev/null 2>&1 || fail "tar is required"

os="$(uname -s | tr '[:upper:]' '[:lower:]')"
arch="$(uname -m)"

case "$os" in
  darwin) ;;
  linux) ;;
  *)
    fail "unsupported OS: $os (on Windows use the archive from https://github.com/$REPO/releases)"
    ;;
esac

case "$arch" in
  arm64|aarch64) arch="arm64" ;;
  x86_64|amd64) arch="amd64" ;;
  *) fail "unsupported architecture: $arch" ;;
esac

if [ -z "$VERSION" ]; then
  # Follow the release redirect instead of the API: no rate limit, one request.
  resolved="$(curl -fsSL -o /dev/null -w '%{url_effective}' "https://github.com/$REPO/releases/latest" || true)"
  case "$resolved" in
    */tag/*) VERSION="${resolved##*/}" ;;
    *) fail "no published release found; see https://github.com/$REPO/releases" ;;
  esac
fi

asset="${BINARY}_${VERSION}_${os}_${arch}.tar.gz"
url="https://github.com/$REPO/releases/download/$VERSION/$asset"

tmp="$(mktemp -d)"
trap 'rm -rf -- "$tmp"' EXIT INT TERM

printf 'Downloading %s\n' "$url"
curl -fL --progress-bar "$url" -o "$tmp/$asset" || fail "download failed: $url"

tar -xzf "$tmp/$asset" -C "$tmp" || fail "could not unpack $asset"

dir="$(install_dir)"
mkdir -p "$dir" || fail "could not create $dir"
install -m 0755 "$tmp/$BINARY" "$dir/$BINARY" || fail "could not install to $dir (set STATSPARROT_INSTALL_DIR)"

"$dir/$BINARY" version >/dev/null 2>&1 || fail "installed binary did not run"

printf '\nInstalled %s to %s/%s\n' "$VERSION" "$dir" "$BINARY"
case ":$PATH:" in
  *":$dir:"*) ;;
  *)
    printf '\nAdd it to your PATH:\n  export PATH="%s:$PATH"\n' "$dir"
    ;;
esac
printf 'Start a project with:\n  %s start my-project\n' "$BINARY"
