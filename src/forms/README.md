# Form Intersections

A 3D visualization tool for practicing [Drawabox](https://drawabox.com/) form intersections exercise. Generate random arrangements of 3D forms and visualize their intersection lines.

## Features

- **Multiple Form Types**: Boxes, spheres, cylinders, and cones
- **Random Generation**: Configurable number of forms with intelligent placement
- **Intersection Lines**: Real-time CSG computation of form intersections
- **Interactive Camera**: Orbit controls for 360-degree viewing
- **Regeneration**: Quick randomize button for new arrangements

## How It Works

1. Forms are randomly placed within a bounded 3D volume
2. Overlap detection ensures interesting intersections
3. CSG (Constructive Solid Geometry) operations compute intersection curves
4. Intersection lines are rendered as highlighted edges

## Usage

1. Adjust the number of forms using the slider
2. Click "Regenerate" for a new random arrangement
3. Orbit the camera to study intersections from different angles
4. Practice drawing the intersection lines on paper

## Tech Stack

- **React Three Fiber** - Declarative 3D rendering
- **Three.js** - 3D graphics library
- **three-bvh-csg** - CSG boolean operations
- **Tailwind CSS** - UI styling

## Development

```bash
npm run dev          # Start dev server at /forms/
npm test src/forms   # Run form tests
```

## File Structure

```
src/forms/
├── App.tsx                    # Main component with Canvas
├── components/
│   ├── ControlPanel.tsx       # UI controls
│   ├── FormMesh.tsx           # 3D form rendering
│   ├── IntersectionLines.tsx  # Intersection visualization
│   └── ViewControls.tsx       # Camera controls
├── types/
│   └── index.ts               # TypeScript definitions
└── utils/
    ├── formGenerators.ts      # Form geometry creation
    ├── intersectionComputer.ts # CSG calculations
    └── randomPlacer.ts        # Placement algorithms
```
