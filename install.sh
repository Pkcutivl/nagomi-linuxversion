#!/usr/bin/env bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BIN_DIR="${HOME}/.local/bin"

mkdir -p "${BIN_DIR}"
install -m 755 "${DIR}/bin/nagomi-ctl" "${BIN_DIR}/nagomi-ctl"
install -m 755 "${DIR}/bin/nagomi-daemon" "${BIN_DIR}/nagomi-daemon"

if [ ! -d "${DIR}/dist" ]; then
  npm --prefix "${DIR}" install
  npm --prefix "${DIR}" run build
fi

echo "Nagomi installed to ${BIN_DIR}. Run 'nagomi-ctl start' to begin."
