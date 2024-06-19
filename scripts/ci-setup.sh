echo "Installing Rustup..."
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sudo sh -s -- -y

# Source the Rust environment immediately to update PATH for the current session
source "$HOME/.cargo/env"

echo "Installing wasm-pack..."
curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sudo sh -s -- -y


# Proceed with the rest of the script
cd packages/elden-ring-save-parser && /vercel/.cargo/bin/wasm-pack build && cd ../..