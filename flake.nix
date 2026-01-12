{
  description = "Elden Ring Compass development environment";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";
  };

  outputs = { self, nixpkgs }: let
    forAllSystems = nixpkgs.lib.genAttrs ["x86_64-linux" "aarch64-linux" "x86_64-darwin" "aarch64-darwin"];
  in {
    devShells = forAllSystems (system: let
      pkgs = nixpkgs.legacyPackages.${system};
    in {
      default = pkgs.mkShell {
        packages = with pkgs; [
          # Rust toolchain
          rustc
          cargo
          rustfmt
          clippy

          # WASM compilation
          wasm-pack
          lld  # LLVM linker required for WASM target

          # Node.js runtime
          nodejs_22

          # Build tools
          bun

          # Formatters/Linters
          oxlint
          oxfmt

          # Utilities
          just
          tree
        ];

        # Enable Rust features
        RUST_BACKTRACE = "1";
      };
    });
  };
}
