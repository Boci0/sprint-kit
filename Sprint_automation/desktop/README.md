# Sprint Kit desktop app (Tauri)

Wraps `../index.html` as a Windows app. `sync.js` copies that file into `dist/` at build time.

## Build locally
Needs Node, Rust (`winget install Rustlang.Rustup`) and the Microsoft C++ build tools. Open a new terminal, then:

    npm install
    npm run build

The installer is written to `src-tauri/target/release/bundle/nsis/`.

## Publish a release (GitHub Actions)
The workflow `.github/workflows/sprint-kit-release.yml` builds the installer on GitHub, so teammates need nothing installed.

1. Bump the version in `package.json`, `src-tauri/Cargo.toml` and `src-tauri/tauri.conf.json` (the installer file name uses `tauri.conf.json`).
2. Commit, then tag and push the tag:

        git tag sprintkit-v0.1.1
        git push origin sprintkit-v0.1.1

3. When the run finishes, the installer is attached to the release on the repo's Releases page.

Run it manually from the Actions tab (Run workflow) to get the installer as a downloadable artifact without making a release.

The installer is unsigned: Windows shows "Windows protected your PC" - choose More info, then Run anyway.
