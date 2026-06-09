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
          # Rust toolchain (used by er-extractor's native image codec)
          rustc
          cargo
          rustfmt
          clippy

          # Node.js runtime
          nodejs_22

          # Build tools
          bun

          # oxlint/oxfmt are provided via the Bun catalog (packages/config),
          # not nixpkgs, so the whole team pins the exact same versions.

          # Utilities
          just
          tree
          jq
        ];

        # Enable Rust features
        RUST_BACKTRACE = "1";
      };
    });
  };
}
