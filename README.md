# Labs Monorepo: Micro-Apps Architecture

This project is a monorepo for experimental and portfolio frontend micro-apps, built with React, TypeScript, and Vite. Each micro-app is isolated in its own folder under `src/`, but all share the same dependencies and build system for easy maintenance and deployment.

## Project Structure

```
labs/
  src/
    index.html         # Landing page with links to all micro-apps
    zines/           # Example micro-app: Minizine Magic Maker
      index.html
      ...
    cats/            # (Add more micro-apps here)
      ...
  package.json       # Shared dependencies and scripts
  vite.config.cjs    # Vite config for multi-app build
```

## How the Micro-Apps Architecture Works

- **Each micro-app lives in its own subfolder under `src/`** (e.g., `src/zines/`, `src/cats/`).
- **Each app has its own entry point** (`main.tsx`) and root component (`App.tsx`).
- **Each app can have its own CSS and assets** (e.g., `zines.css`).
- **All apps share the same React, TypeScript, and other dependencies** (defined in the root `package.json`).
- **Vite is configured for multiple HTML entry points** (e.g., `/zines/` loads `zines/index.html` and `src/zines/main.tsx`).
- **The root `index.html` is a landing page** that links to all available micro-apps.
- **All apps are built together** and output to the `build/` directory for deployment (e.g., to GitHub Pages).

## How to Add or Edit a Micro-App

1. **To add a new app:**
   - Create a new folder under `src/` (e.g., `src/myapp/`).
   - Add your `main.tsx`, `App.tsx`, and any other files/assets you need.
   - Create a new HTML entry (e.g., `myapp/index.html`) based on `zines/index.html`.
   - Update `vite.config.cjs` to add your new app as an entry point in the `rollupOptions.input` section.
   - Add a link to your app in the root `index.html` landing page.

2. **To edit an existing app:**
   - Edit the files in the corresponding `src/<app>/` folder.
   - You can use both Tailwind CSS and custom CSS for styling.
   - If your app needs special fonts or assets, add them to its own HTML or CSS files.

3. **To share code or components:**
   - Place shared utilities/components in a common folder (e.g., `src/shared/`) and import them as needed.
   - Keep app-specific code inside each app’s folder for isolation.

4. **To update dependencies:**
   - Update the root `package.json` and run `npm install`.
   - All apps will use the same versions of React, TypeScript, etc.

## Development & Build

- **Start the dev server:**

  ```sh
  npm start
  ```

  Visit `/zines/` or any other app at `/yourapp/`.

- **Run tests:**

  ```sh
  npm test
  ```

  Runs the comprehensive test suite (48 tests) across all components.

- **Check code quality:**

  ```sh
  npm run lint
  ```

  Runs ESLint to check code style and quality.

- **Build for production:**

  ```sh
  npm run build
  ```

  Output is in the `build/` directory.

- **Deploy to GitHub Pages:**
  ```sh
  npm run deploy
  ```
  Runs tests first - deployment is blocked if tests fail.

## Quality Assurance

This project maintains high standards through automated quality checks:

- **Tests:** 48 comprehensive tests covering all major components and functionality
- **Pre-commit hooks:** Tests and linting must pass before commits are allowed
- **CI/CD integration:** GitHub Actions runs full test suite on every push/PR
- **Deployment protection:** Failed tests block production deployment

## Notes for Contributors

- **Always keep each micro-app isolated in its own folder under `src/`.**
- **Do not move or merge app code into the root or other app folders.**
- **When adding a new app, always update the Vite config and landing page.**
- **Write tests for new components and features - place test files alongside the code they test.**
- **Ensure all tests pass before committing:** `npm test`
- **Run linting before committing:** `npm run lint`
- **When editing an app, use the app’s own CSS and assets unless you are intentionally sharing code.**
- **If you see custom CSS classes (e.g., `.card-bg`, `.font-heading`), do not remove them—they are required for the original look and feel.**
- **If you add new dependencies, make sure they are compatible with all apps.**

---

For any questions or to extend the architecture, follow the above conventions to keep the monorepo organized and maintainable.
