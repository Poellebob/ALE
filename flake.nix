{
  description = "LaTeX editor — Tauri + CodeMirror 6 + SageTex";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-25.11";
    flake-utils.url = "github:numtide/flake-utils";
    rust-overlay = {
      url = "github:oxalica/rust-overlay";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs = { self, nixpkgs, flake-utils, rust-overlay }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs {
          inherit system;
          overlays = [ rust-overlay.overlays.default ];
        };

        rustToolchain = pkgs.rust-bin.stable.latest.default.override {
          extensions = [
            "rust-src"
            "rust-analyzer"
            "clippy"
            "rustfmt"
          ];
        };

        texliveEnv = pkgs.texliveFull.withPackages (ps: with ps; [
          latexmk
          collection-latexextra
          collection-mathscience
        ]);
      in
      {
        devShells.default = pkgs.mkShell {
          packages = with pkgs; [
            rustToolchain
            nodejs_24
            pnpm
            pkg-config
            openssl.dev
            webkitgtk_4_1
            libsoup_3
            gtk3
            glib
            cairo
            pango
            gdk-pixbuf
            atk
            dbus
            librsvg
            xdotool
            libayatana-appindicator
            sagetex

            texliveEnv
            sage

            cargo-watch
            nodePackages.typescript
          ];

          shellHook = ''
            # pkg-config must be able to find openssl headers
            export PKG_CONFIG_PATH="${pkgs.openssl.dev}/lib/pkgconfig:$PKG_CONFIG_PATH"

            # Make sure GLib schemas are available (required by GTK)
            export XDG_DATA_DIRS="${pkgs.gtk3}/share/gsettings-schemas/${pkgs.gtk3.name}:$XDG_DATA_DIRS"
            export GIO_MODULE_DIR="${pkgs.glib-networking}/lib/gio/modules/"

            # Silence WebKit compositing errors on some Linux setups
            export WEBKIT_DISABLE_COMPOSITING_MODE=1

            echo "LaTeX editor dev shell ready."
            echo "  Rust $(rustc --version)"
          '';
        };
      }
    );
}
