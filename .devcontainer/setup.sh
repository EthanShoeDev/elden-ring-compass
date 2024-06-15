#!/bin/bash
# nodejs
npm completion >> ~/.bashrc
. "$HOME/.bashrc"


curl -fsSL https://bun.sh/install | bash # for macOS, Linux, and WSL

. "$HOME/.bashrc"
bun completions >> ~/.bashrc
. "$HOME/.bashrc"



mkdir -p ~/.config/husky
touch ~/.config/husky/init.sh
echo ". $HOME/.bashrc" > ~/.config/husky/init.sh
