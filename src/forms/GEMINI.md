# Form Intersections

A 3D visualization tool for practicing Drawabox form intersections exercise using React Three Fiber.

## What It Does

- **3D Form Generation**: Creates random arrangements of boxes, spheres, cylinders, and cones
- **Intersection Visualization**: Computes and displays intersection lines between overlapping forms
- **Interactive Controls**: Orbit camera, form count adjustment, regeneration
- **CSG Operations**: Uses three-bvh-csg for accurate boolean intersection calculations

## Tech Stack

- React 18 + TypeScript
- React Three Fiber (@react-three/fiber) for 3D rendering
- Three.js with three-bvh-csg for CSG operations
- Tailwind CSS for UI styling

## Key Files

- `App.tsx` - Main application component with 3D canvas setup
- `components/FormMesh.tsx` - Individual 3D form rendering
- `components/IntersectionLines.tsx` - Intersection line visualization
- `components/ControlPanel.tsx` - UI controls for form generation
- `components/ViewControls.tsx` - Camera orbit controls
- `utils/formGenerators.ts` - Form geometry generation
- `utils/intersectionComputer.ts` - CSG intersection calculations
- `utils/randomPlacer.ts` - Random form placement algorithms
- `types/index.ts` - TypeScript type definitions

## Development

```bash
npm run dev          # Start dev server
npm test src/forms   # Run tests
```

## Architecture Notes

The app uses React Three Fiber's declarative approach to 3D rendering. Form intersections are computed using CSG (Constructive Solid Geometry) operations from three-bvh-csg, which provides accurate boolean operations on 3D meshes.

Forms are placed randomly within a bounded volume, with overlap detection to ensure interesting intersections while avoiding excessive clustering.
