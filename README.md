# Pathfinding Visualizer — Angular migration

This is an Angular standalone-component migration of the supplied Next.js/React Pathfinding Visualizer. The original algorithm engine files are retained in `src/app/engine/` (Dijkstra, A*, BFS, DFS, heap, maze generators, grid store and animation controller). The React/Framer Motion UI has been replaced by Angular templates, component state, CSS and pointer event handlers.

## Requirements
- Node.js compatible with Angular 21
- npm

## Run locally
```bash
npm install
npm start
```
Open the local URL printed by Angular CLI.

## Production build
```bash
npm run build
```

## Controls
- Click/drag empty cells to draw walls (or weights when Weight is selected).
- Drag the Start and Target markers to move them.
- Space: visualize/pause/resume; R: clear path; C: clear board; W: toggle wall/weight tool.
- Choose a maze from the Maze dropdown.

## Notes
- The migration is a first working Angular port. Verify the production build with your local Node/npm environment and run interaction/regression checks against the React version.
- Google Fonts are loaded from fonts.googleapis.com; system fonts remain as fallback if the network is unavailable.
