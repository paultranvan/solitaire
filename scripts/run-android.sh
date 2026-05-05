#!/usr/bin/env bash
# Build the web bundle, sync to the Android project, and deploy to a connected
# device or emulator. Detects suitable Node and JDK versions instead of pinning
# them to one machine's filesystem layout.
set -euo pipefail

# Capacitor 8 CLI requires Node >=22.
node_major=$(node -v | sed -E 's/^v([0-9]+).*/\1/')
if (( node_major < 22 )); then
  echo "error: need Node >=22 (got v$node_major); activate a newer version (e.g. 'fnm use 22' or 'nvm use 22') and retry" >&2
  exit 1
fi

# Android Gradle Plugin 8.7 (used by Capacitor 8) accepts JDK 17 or 21. If
# JAVA_HOME is unset or points at the wrong major, look for one in standard
# locations across Linux distros and macOS.
java_major_of() {
  "$1/bin/java" -version 2>&1 | head -1 | grep -oE '"[0-9]+' | tr -d '"' || true
}

ensure_jdk() {
  if [[ -n "${JAVA_HOME:-}" && -x "${JAVA_HOME}/bin/java" ]]; then
    local v
    v=$(java_major_of "$JAVA_HOME")
    [[ "$v" == "17" || "$v" == "21" ]] && return 0
  fi
  local candidates=(
    /usr/lib/jvm/java-21-openjdk-amd64
    /usr/lib/jvm/java-17-openjdk-amd64
    /usr/lib/jvm/temurin-21-jdk-amd64
    /usr/lib/jvm/temurin-17-jdk-amd64
    /opt/homebrew/opt/openjdk@21
    /opt/homebrew/opt/openjdk@17
    /Library/Java/JavaVirtualMachines/temurin-21.jdk/Contents/Home
    /Library/Java/JavaVirtualMachines/temurin-17.jdk/Contents/Home
  )
  for c in "${candidates[@]}"; do
    if [[ -x "$c/bin/java" ]]; then
      export JAVA_HOME="$c"
      export PATH="$JAVA_HOME/bin:$PATH"
      return 0
    fi
  done
  # /usr/libexec/java_home is the canonical lookup on macOS.
  if [[ -x /usr/libexec/java_home ]]; then
    for v in 21 17; do
      if home=$(/usr/libexec/java_home -v "$v" 2>/dev/null); then
        export JAVA_HOME="$home"
        export PATH="$JAVA_HOME/bin:$PATH"
        return 0
      fi
    done
  fi
  echo "error: need JDK 17 or 21 in JAVA_HOME (got '${JAVA_HOME:-unset}')" >&2
  exit 1
}
ensure_jdk

npm run build
npx cap sync android
exec npx cap run android "$@"
