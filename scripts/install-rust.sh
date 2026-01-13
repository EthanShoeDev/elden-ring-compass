#!/bin/bash
# Install Rust and wasm-pack for CI environments
curl -sSf https://sh.rustup.rs | sh -s -- -y
curl -sSf https://rustwasm.github.io/wasm-pack/installer/init.sh | sh
