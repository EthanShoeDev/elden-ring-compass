{
  description = "Elden Ring Compass development environment";

  inputs.nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";

  outputs = {nixpkgs, ...}: let
    # nixpkgs still ships bun 1.3.x, so repoint the prebuilt release archives
    # at 1.4.4 to match `packageManager`/`devEngines` in package.json. bun ships
    # binaries only, so this is a src swap and nothing is compiled. Keep the
    # versions in lockstep.
    bunOverlay = _final: prev: {
      bun = prev.bun.overrideAttrs (finalAttrs: oldAttrs: {
        version = "1.4.4";
        __intentionallyOverridingVersion = true;
        passthru =
          oldAttrs.passthru
          // {
            sources = {
              "aarch64-darwin" = prev.fetchurl {
                url = "https://github.com/oven-sh/bun/releases/download/bun-v${finalAttrs.version}/bun-darwin-aarch64.zip";
                hash = "sha256-wkDX8My5DCY6hJ/NsJt+5iYw2SE0jtaq/ahrnVd7xRA=";
              };
              "x86_64-darwin" = prev.fetchurl {
                url = "https://github.com/oven-sh/bun/releases/download/bun-v${finalAttrs.version}/bun-darwin-x64.zip";
                hash = "sha256-UKNJH3Orwv6BZzFxqFdi07wswWgMzsrdmD3pmt93l34=";
              };
              "aarch64-linux" = prev.fetchurl {
                url = "https://github.com/oven-sh/bun/releases/download/bun-v${finalAttrs.version}/bun-linux-aarch64.zip";
                hash = "sha256-uqa7NvUdblhWHgK76oJQOKnfRU9nPW13bou/hvjHhQ4=";
              };
              "x86_64-linux" = prev.fetchurl {
                url = "https://github.com/oven-sh/bun/releases/download/bun-v${finalAttrs.version}/bun-linux-x64.zip";
                hash = "sha256-v4zL+ysLgBWeD5ptFcVTF63YB3U028YTCj7bUvzLOVw=";
              };
            };
          };
      });
    };
    forAllSystems = function:
      nixpkgs.lib.genAttrs ["x86_64-linux" "aarch64-linux" "x86_64-darwin" "aarch64-darwin"] (
        system:
          function (import nixpkgs {
            inherit system;
            overlays = [bunOverlay];
          })
      );
  in {
    formatter = forAllSystems (pkgs: pkgs.alejandra);

    devShells = forAllSystems (pkgs: {
      default = pkgs.mkShell {
        packages = with pkgs; [
          # Rust toolchain (the extractor's native image codec)
          rustc
          cargo
          rustfmt
          clippy

          bun
          nodejs_24

          # oxlint/oxfmt come from the Bun catalog, not nixpkgs, so everyone
          # runs the exact same versions.

          # Utilities
          just
          tree
          jq
          alejandra
        ];

        # Enable Rust features
        RUST_BACKTRACE = "1";
      };
    });
  };
}
