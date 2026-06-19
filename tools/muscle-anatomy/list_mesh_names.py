"""List mesh object names in Z-Anatomy (run via Blender --background --python)."""
from __future__ import annotations

import sys
from pathlib import Path

try:
    import bpy  # type: ignore
except ImportError:
    raise SystemExit('Run inside Blender')

argv = sys.argv
blend = Path(argv[argv.index('--') + 1]) if '--' in argv else None
if blend:
    bpy.ops.wm.open_mainfile(filepath=str(blend))

meshes = sorted(obj.name for obj in bpy.data.objects if obj.type == 'MESH')
for name in meshes:
    print(name)
print(f'--- total meshes: {len(meshes)}', file=sys.stderr)
