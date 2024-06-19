echo "Installing Rustup..."
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
# Adding binaries to path
source "$HOME/.cargo/env"


echo "Installing wasm-pack..."
curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh -s -- -y


echo "Adding binaries to path..."
echo 'export PATH=$PATH:/vercel/.cargo/bin/' >> "$HOME/.bashrc"

source "$HOME/.bashrc"
source "$HOME/.cargo/env"

