#!/bin/bash

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR=${SCRIPT_DIR}

if [ "$TICHU_DEV" == "true" ]; then
    echo "Already in a tichu-dev shell!"
    exit 1
fi

# detects non-interactive because no PS1
if [ "x$PS1" = "x" ]; then
    exec bash --rcfile "${SCRIPT_DIR}/dev.sh"
fi

if [ -e ~/.bashrc ]; then
    set +e
    source ~/.bashrc
    set -e
fi

export TICHU_DEV=true
export PATH=${PATH}:${ROOT_DIR}/scripts
export NODE_PATH=${NODE_PATH}:${ROOT_DIR}

PS1="\[\e[5;31;1m\]tichu-dev\[\e[0m\] $PS1"
export PS1

unset SCRIPT_DIR
set +e