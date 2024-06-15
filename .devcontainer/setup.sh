#!/bin/bash
# nodejs
npm completion >> ~/.bashrc
. "$HOME/.bashrc"


curl -fsSL https://bun.sh/install | bash # for macOS, Linux, and WSL

. "$HOME/.bashrc"



mkdir -p ~/.config/husky
touch ~/.config/husky/init.sh
echo "source ~/.bashrc" > ~/.config/husky/init.sh
