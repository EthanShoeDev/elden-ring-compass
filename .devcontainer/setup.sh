#!/bin/bash
# nodejs
npm completion >> ~/.bashrc
. "$HOME/.bashrc"


curl -fsSL https://bun.sh/install | bash # for macOS, Linux, and WSL

. "$HOME/.bashrc"