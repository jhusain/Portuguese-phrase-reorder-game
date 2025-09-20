# ChatGPT: reorder Portuguese phrase

Goal: assist users in learning European Portuguese verb conjugation by requiring them to reorder a series of tokens into grammatically correct order.

## Requirements

* The program displays a series of problems to the user sequentially, each of which the user attempts to solve. The program ends when the user has solved all problems. At any point, a user may skip a problem, at which point it is put at the end of the queue for the user to solve later.  
* Solving a problem  
  * Each problem is a jumbled list of tokens presented in a horizontally- wrapped list which the user must reorder to form a grammatically-correct paragraph in European Portuguese. Each token is given a thin border in a subtle color so that the user can differentiate different tokens. The user can reorder the list by dragging individual tokens around and inserting them to the left or right of any other token. When the user is dragging a token, a visual indicator should always be present indicating where the token would be placed if they were to end the drag operation.    
  * When the user thinks they have reordered the tokens correctly, they can click a solve button. When the user clicks solve, all tokens which are in the correct position are given a background color of green. Furthermore all series of tokens which the user has correctly put in the right sequence are merged into a single token (with a space between them). Once a token background color has been made green, it can no longer be dragged around by the user. If all tokens are green, the user has solved the problem. At this point a note is displayed below the list providing context as to why this is the grammatically correct ordering of the tokens. If there are still problems remaining to be solved, a next button is displayed and when the user clicks that button the user is given the next problem. Conversely, if there are no problems remaining to be solved, a restart button is displayed which will restart the process if the user clicks it.

## Examples

Let's say a given problem requires the user to order tokens in the following way: 

Eu chamo-me Jafar.

The user is presented with the following tokens:

\[chamo-me\] \[Paulo\] \[Eu\]

Before reordering any tokens, the user immediately hit solve. At this point the app merges \[chamo-me\] and  \[Paulo\] into a single token \[chamo-me Paulo\], and the list is in the following state: 

\[chamo-me Paulo\] \[Eu\]

At this point the user drags the \[chamo-me Paulo\] token to the right of \[Eu\], putting the tokens in the following order: 

\[Eu\] \[chamo-me Paulo\]

At this point the user clicks solve again, and the color of all tokens is set to Green indicating they are in the right position. At this point the user is displayed a note like “in this case chamo-me is used because it is singular/first person.” Finally, either a Next or Restart button is displayed depending on whether the user has any remaining questions to be solved or has solved all the questions respectively.

## Design

* The entire app should be in a static fully client-side website. It should support either light or dark mode based on the OS setting and be both attractive and legible in both modes.  
* The state of the app (the current question, and the order of the tokens) should be persistent to local storage so that the app restarts in the same state if it is refreshed. However, this should be associated with a hash of the problem set such that if the problems are changed, this state is thrown away and the app is started with a fresh state.  
* The UI should be responsive and be assumed to be mobile first. It should allow both drag and touch gestures, and therefore it may be necessary to disable things like scrolling to refresh for example.  
* It should source all problem data from a problems.json file located alongside the index.html (already present).  Whenever a problem is displayed, it should use a random number generator to randomize the order of the tokens. The format of the problems.json file is similar to this: \[ { tokens: \[“Eu”, “chamo-me”, “Paulo”\], note: “chamo-me is used here because it is first-person singular” } \]. Note the tokens for each problem start in the right order, but are randomized in order before being displayed to the user.  
* Create any infrastructure necessary to ensure that when PRS are landed, the app is built and hosted using gh-pages. Assume the app will be hosted at [jhusain.github.io/portuguese-phrase-reorder-game](http://jhusain.github.io/portuguese-phrase-reorder-game) rather than the root domain, so make sure you make any changes required to the build process to allow hosting under a folder like ensuring all references are relative rather than absolute for example.  
* The app should be available to be installed as a PWA so it can be used without the browser Chrome visible. A service worker should be used to allow the app to be cached and run entirely off-line. However whenever the app opens it should try and download the problems.json file, and only use the cached one if it fails to retrieve it (presumably due to lack of internet connectivity). Feel free to generate an appropriate icon set.


## Implementation Plan

1. **Bootstrap Vite + React + TypeScript scaffolding**
   - Goal: Initialize project configs and entry files needed for a Vite-powered React + TypeScript SPA.
   - Files: `package.json`, `.gitignore`, `tsconfig.json`, `tsconfig.node.json`, `vite.config.ts`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/index.css`.
   - Verification: Run `npm install` followed by `npm run build`; both commands should complete successfully with no errors in the terminal.

2. **Configure GitHub Pages base path awareness**
   - Goal: Ensure local builds serve correctly from `/portuguese-phrase-reorder-game/` and adjust npm scripts accordingly.
   - Files: `vite.config.ts`, `package.json`.
   - Verification: Execute `npm run build` and inspect `dist/index.html` to confirm asset references use relative URLs or the `/portuguese-phrase-reorder-game/` prefix.

3. **Lay out responsive UI shell with theme support**
   - Goal: Implement mobile-first layout, global styles, and light/dark theming hooks.
   - Files: `src/App.tsx`, `src/index.css` (or dedicated module files if preferred).
   - Verification: Start `npm run dev`, open the local URL, resize the viewport, and toggle OS theme to confirm layout stability and theme switching without console errors.

4. **Implement problem data loading and shuffling utilities**
   - Goal: Load `problems.json`, validate structure with TypeScript types, and expose a deterministic shuffle helper.
   - Files: `public/problems.json`, `src/data/problems.ts`, `src/types.ts`, `src/utils/shuffle.ts`.
   - Verification: With dev server running, check browser network panel for a single successful fetch and observe randomized token order across reloads.

5. **Build drag-and-drop/touch token reordering**
   - Goal: Introduce accessible drag-and-drop interactions with visual insertion indicators for both pointer and touch input.
   - Files: `package.json` (if adding DnD dependency), `src/components/TokenList.tsx`, `src/components/Token.tsx`, associated CSS modules.
   - Verification: In the browser, drag tokens with mouse and touch emulation; tokens should reorder correctly and drop indicators should display.

6. **Add solve evaluation, token merging, and feedback styling**
   - Goal: Compare current order with solution, merge contiguous correct tokens, and present green success styling/notes.
   - Files: `src/App.tsx`, `src/utils/evaluate.ts`, `src/components/TokenList.tsx`, `src/components/Token.module.css`.
   - Verification: Trigger the Solve action with partially correct arrangements to confirm correct tokens lock/merge and full solves reveal notes and navigation controls.

7. **Persist session state keyed by problem set hash**
   - Goal: Store progress (current index and token order) in localStorage using a hash derived from `problems.json`.
   - Files: `src/hooks/usePersistentState.ts`, `src/App.tsx`, `src/data/problems.ts`.
   - Verification: Partially solve a problem, reload the page, and confirm state restoration; modify `problems.json` to ensure state resets on content changes.

8. **Provide PWA capabilities with offline support**
   - Goal: Deliver manifest, icons, service worker caching strategy, and registration logic with network-first fetch for problems.
   - Files: `public/manifest.webmanifest`, `public/icons/*`, `src/service-worker.ts` (or equivalent), `src/main.tsx`, `vite.config.ts` (if plugin required).
   - Verification: Run `npm run build` then `npm run preview`; in DevTools, confirm service worker activation, offline availability, and installability via Lighthouse audit.

9. **Automate GitHub Pages deployment**
   - Goal: Add CI workflow that builds on push to main and publishes `dist/` to the `gh-pages` branch.
   - Files: `.github/workflows/deploy.yml`, `package.json` (deployment scripts if needed).
   - Verification: Lint the workflow file (e.g., `npx yaml-lint .github/workflows/deploy.yml`) and, after merging, confirm GitHub Actions run completes successfully with Pages publishing enabled for `gh-pages`.

