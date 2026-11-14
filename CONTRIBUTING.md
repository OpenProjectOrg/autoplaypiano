# Contributing to AutoPiano

Thank you for your interest in contributing to **AutoPiano**! AutoPiano is a 100% free, offline-first, open-source Windows desktop application built with Tauri v2, Rust, React, and SQLite.

We welcome contributions from the community—whether it's reporting bugs, improving documentation, designing new features, or optimizing keyboard typing simulation.

---

## 📜 Core Principles & Contribution Rules

Before submitting any Pull Request, please ensure your contribution adheres to the core architectural principles of this project:

1. **100% Offline-First & Privacy First**:
   - **No cloud dependencies, telemetry, or analytics**: The application must remain functional completely offline.
   - **No external authentication or paywalls**: User profiles, collections, and preferences must strictly remain in the local SQLite database (`autopiano.db`).
   - Do not introduce SDKs or tracking libraries that transmit user data outside their machine.

2. **Keystroke Safety & Accuracy**:
   - Any modifications to the keystroke simulator (`src-tauri/src/keyboard.rs` or `parser.rs`) must use native Windows hardware scan codes via `SendInput`.
   - Never remove or compromise the emergency stop (`ESC`) hotkey or global pause listener (`F6`).

3. **Internationalization (i18n)**:
   - AutoPiano supports both **English (EN)** and **Indonesian (ID)**.
   - If you introduce or modify user-facing UI text, you **must** update both dictionary files:
     - `src/i18n/en.ts`
     - `src/i18n/id.ts`

4. **Code Quality & Type Safety**:
   - TypeScript must compile without errors (`npm run build`).
   - Rust code must compile cleanly without warnings (`cargo check` inside `src-tauri`).
   - Follow clean code practices: descriptive naming, modular functions, and concise comments.

---

## 🛠️ Development Setup

### Prerequisites
- **Node.js**: v18.0.0 or later (Node 20+ recommended)
- **Rust toolchain**: Latest stable Rust (`rustup default stable`)
- **Visual Studio C++ Build Tools**: Required by Tauri on Windows (MSVC)
- **Git**

### Getting Started

1. **Fork and clone the repository**:
   ```bash
   git clone https://github.com/<your-username>/autoplaypiano.git
   cd autoplaypiano
   ```

2. **Install frontend dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   ```bash
   copy .env.example .env
   ```

4. **Run in development mode**:
   - Run the frontend only (browser dev server):
     ```bash
     npm run dev
     ```
   - Run the full desktop application (Tauri + Rust + Vite):
     ```bash
     npm run desktop
     ```

5. **Build and verify**:
   - Frontend typecheck and bundle:
     ```bash
     npm run build
     ```
   - Rust backend check:
     ```bash
     cd src-tauri
     cargo check
     cd ..
     ```

---

## 🔀 Git Workflow & Pull Request Guidelines

### 1. Branch Naming Convention
Create a descriptive branch for your work:
- `feat/feature-name` (e.g. `feat/custom-transpose-controls`)
- `fix/bug-description` (e.g. `fix/hotkey-conflict-resolution`)
- `docs/documentation-update` (e.g. `docs/improve-setup-guide`)
- `refactor/component-name` (e.g. `refactor/sheet-parser-engine`)

### 2. Commit Message Standards
We follow the [Conventional Commits](https://www.conventionalcommits.org/) format:
```
<type>(<scope>): <short description>
```
**Examples:**
- `feat(player): add octave shift keyboard shortcut`
- `fix(parser): prevent crash on empty chord brackets`
- `docs(readme): update installation instructions for Windows 11`
- `refactor(db): optimize SQLite sheet indexing query`

### 3. Pull Request Submission Checklist
When opening a Pull Request:
- [ ] Ensure all local tests and builds pass (`npm run build` & `cargo check`).
- [ ] If adding new UI text, update both `src/i18n/en.ts` and `src/i18n/id.ts`.
- [ ] Verify that no remote network dependencies or tracking scripts were added.
- [ ] Fill out the provided Pull Request template completely.
- [ ] Link any related issues (e.g. `Closes #12`).

---

## 🐛 Reporting Bugs

If you discover a bug:
1. Check the [Issues](https://github.com/OpenProjectOrg/autoplaypiano/issues) tab to see if it has already been reported.
2. If not, open a new issue using the **Bug Report** template.
3. Provide clear reproduction steps, your Windows version, and screenshots if applicable.

---

## 💡 Suggesting Enhancements

Have an idea to improve AutoPiano?
1. Open an issue using the **Feature Request** template.
2. Explain the use case and how it benefits virtual piano players.
3. Discuss the implementation proposal with maintainers before submitting large code changes.

Thank you for helping make AutoPiano better for the global virtual piano community! 🎹
