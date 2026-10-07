# Sprint Kit desktop app (Tauri)

Wraps `../index.html` as a desktop app for Windows, macOS and Linux. The release workflow builds all three on GitHub, so you only need a local build for development. `sync.js` copies that file into `dist/` at build time.

## Updates

The app checks GitHub for a newer version when it opens, and the footer has a **Check for updates** link. When one is found, a banner offers **Update now**: the app downloads it, installs it and opens again by itself.

Updates are signed. The app only accepts an update signed with the team's private key, so nobody else can push code to your machines.

- The **public** key is in `src-tauri/tauri.conf.json` (safe to share).
- The **private** key and its password are NOT in the repo. They live in `%USERPROFILE%\.tauri\sprint-kit.key` and `sprint-kit.key.password`, and in two GitHub secrets (below). **Keep a backup somewhere safe.** If both copies are lost, nobody can update through the app and everyone has to reinstall by hand.
- The app reads `https://github.com/Boci0/sprint-kit/releases/latest/download/latest.json`, which the release build uploads. The repo must stay public for this to work.

Versions before 0.2.0 have no updater: install the first updater version by hand, once.

## Build locally

Needs Node, Rust (`winget install Rustlang.Rustup`) and the Microsoft C++ build tools. Open a new terminal, then:

    npm install
    npm run build

Because updates are signed, the build needs the signing key. In PowerShell:

    $env:TAURI_SIGNING_PRIVATE_KEY = Get-Content "$env:USERPROFILE\.tauri\sprint-kit.key" -Raw
    $env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = (Get-Content "$env:USERPROFILE\.tauri\sprint-kit.key.password" -Raw).Trim()
    npm run build

The installer and its `.sig` file are written to `src-tauri/target/release/bundle/nsis/`.

## Publish a release (GitHub Actions)

The workflow `.github/workflows/sprint-kit-release.yml` builds and signs the installer on GitHub, so teammates need nothing installed.

One-time setup: add two repository secrets (Settings, Secrets and variables, Actions):

- `TAURI_SIGNING_PRIVATE_KEY`: the contents of `sprint-kit.key`
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`: the contents of `sprint-kit.key.password`

Each release:

1. Bump the version in `package.json`, `src-tauri/Cargo.toml` and `src-tauri/tauri.conf.json` (the installer file name and the updater use `tauri.conf.json`). The new version must be higher than the old one, or the updater will not offer it.
2. Commit, then tag and push the tag:

        git tag sprintkit-v0.2.1
        git push origin sprintkit-v0.2.1

3. When the run finishes, the release has the installer, its signature and `latest.json`. Installed copies see the update the next time they open.

Run the workflow manually from the Actions tab (Run workflow) to get a signed installer as a downloadable file without making a release.

The installer itself is not Windows code-signed: Windows shows "Windows protected your PC" on a first install. Choose More info, then Run anyway. Updates installed from inside the app do not show it: the app downloads and installs them on its own.
