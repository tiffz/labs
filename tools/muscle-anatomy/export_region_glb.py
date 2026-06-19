#!/usr/bin/env python3
"""Export a Proko region subset from Z-Anatomy Blender file to Draco-compressed GLB.

Run inside Blender:
  blender Z-Anatomy.blend --background --python export_region_glb.py -- --region shoulder_neck

Requirements:
  - Blender 3.6+
"""

from __future__ import annotations

import argparse
import csv
import json
import sys
from collections import defaultdict
from pathlib import Path

try:
    import bpy  # type: ignore
except ImportError:  # pragma: no cover - offline tooling
    bpy = None


ROOT = Path(__file__).resolve().parent
MAP_CSV = ROOT / 'z_anatomy_name_map.csv'
OUT_DIR = ROOT.parent.parent / 'public' / 'muscle' / 'models'

DEFAULT_DECIMATE_RATIO = 0.2
DEFAULT_MAX_TRIS = 25_000
DEFAULT_MAX_REGION_TRIS = 80_000
DECIMATE_THRESHOLD = 8_000


def load_region_map(region: str) -> dict[str, list[str]]:
    """Return node_id -> ordered list of Z-Anatomy object names for one region."""
    by_node: dict[str, list[str]] = defaultdict(list)
    if not MAP_CSV.exists():
        return by_node
    with MAP_CSV.open(newline='', encoding='utf-8') as fh:
        for row in csv.DictReader(fh):
            if row.get('region', '').strip() != region:
                continue
            z_name = row.get('z_anatomy_name', '').strip()
            node_id = row.get('node_id', '').strip()
            if z_name and node_id:
                by_node[node_id].append(z_name)
    return by_node


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument('--region', required=True)
    parser.add_argument('--blend', type=Path, help='Path to Z-Anatomy .blend file')
    parser.add_argument('--ratio', type=float, default=DEFAULT_DECIMATE_RATIO, help='Initial decimate ratio')
    parser.add_argument('--max-tris', type=int, default=DEFAULT_MAX_TRIS, help='Cap per exported mesh')
    parser.add_argument(
        '--max-region-tris',
        type=int,
        default=DEFAULT_MAX_REGION_TRIS,
        help='Cap total triangles per region export',
    )
    return parser.parse_args(argv)


def join_meshes(objects: list) -> object | None:
    if not objects:
        return None
    view_layer = bpy.context.view_layer
    in_layer = [obj for obj in objects if obj.name in view_layer.objects]
    if not in_layer:
        return objects[0]
    if len(in_layer) == 1:
        return in_layer[0]

    bpy.ops.object.select_all(action='DESELECT')
    for obj in in_layer:
        obj.hide_set(False)
        obj.select_set(True)
    view_layer.objects.active = in_layer[0]
    bpy.ops.object.join()
    return view_layer.objects.active


def select_only(objects: list) -> None:
    bpy.ops.object.select_all(action='DESELECT')
    view_layer = bpy.context.view_layer
    active = None
    for obj in objects:
        if obj.name not in view_layer.objects:
            continue
        obj.hide_set(False)
        obj.hide_render = False
        obj.hide_viewport = False
        obj.select_set(True)
        active = obj
    if active is not None:
        view_layer.objects.active = active


def ensure_mesh_single_user(obj) -> None:
    """Blender refuses modifier_apply on shared mesh datablocks (common after join)."""
    if obj.type != 'MESH':
        return
    if obj.data.users > 1:
        obj.data = obj.data.copy()
    # Joined meshes can still report users==1 while linked to library originals.
    try:
        bpy.ops.object.select_all(action='DESELECT')
        obj.hide_set(False)
        obj.select_set(True)
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.make_single_user(type='SELECTED_OBJECTS', object=False, obdata=True)
    except RuntimeError:
        obj.data = obj.data.copy()


def apply_decimate_to_cap(obj, initial_ratio: float, max_tris: int) -> None:
    if obj.type != 'MESH':
        return

    view_layer = bpy.context.view_layer
    bpy.ops.object.select_all(action='DESELECT')
    obj.hide_set(False)
    obj.select_set(True)
    view_layer.objects.active = obj

    ensure_mesh_single_user(obj)

    before = len(obj.data.polygons)
    if before <= DECIMATE_THRESHOLD:
        return

    ratio = initial_ratio
    while len(obj.data.polygons) > max_tris and ratio >= 0.05:
        target_ratio = min(ratio, max_tris / max(len(obj.data.polygons), 1))
        mod = obj.modifiers.new('DecimateExport', 'DECIMATE')
        mod.ratio = max(target_ratio, 0.05)
        bpy.ops.object.modifier_apply(modifier=mod.name)
        ratio *= 0.65

    after = len(obj.data.polygons)
    print(f'  decimate {obj.name}: {before} -> {after} tris')


def enforce_region_tri_cap(exported: list[tuple[str, object]], max_region_tris: int) -> None:
    view_layer = bpy.context.view_layer

    def region_total() -> int:
        return sum(len(obj.data.polygons) for _, obj in exported if obj.type == 'MESH')

    while region_total() > max_region_tris:
        node_id, obj = max(
            ((nid, o) for nid, o in exported if o.type == 'MESH'),
            key=lambda pair: len(pair[1].data.polygons),
        )
        if len(obj.data.polygons) <= 3000:
            raise RuntimeError(
                f'region still {region_total()} tris after decimation (cap {max_region_tris})',
            )

        ensure_mesh_single_user(obj)

        before = len(obj.data.polygons)
        target = max(3000, int(before * 0.82))
        ratio = target / before
        mod = obj.modifiers.new('DecimateRegionCap', 'DECIMATE')
        mod.ratio = max(ratio, 0.05)

        bpy.ops.object.select_all(action='DESELECT')
        obj.hide_set(False)
        obj.select_set(True)
        view_layer.objects.active = obj
        bpy.ops.object.modifier_apply(modifier=mod.name)

        after = len(obj.data.polygons)
        print(
            f'  region cap {node_id}: {before} -> {after} tris '
            f'(region total {region_total()})',
        )


def export_region(region: str, blend: Path | None, ratio: float, max_tris: int, max_region_tris: int) -> None:
    if bpy is None:
        raise RuntimeError('Run this script with Blender: blender ... --python export_region_glb.py')

    region_map = load_region_map(region)
    if not region_map:
        raise RuntimeError(f'No CSV mappings for region {region!r}')

    if blend and (not bpy.data.filepath or Path(bpy.data.filepath).resolve() != blend.resolve()):
        bpy.ops.wm.open_mainfile(filepath=str(blend))

    z_names = {z for names in region_map.values() for z in names}
    objects_by_z = {obj.name: obj for obj in bpy.data.objects if obj.type == 'MESH'}

    missing = sorted(z for z in z_names if z not in objects_by_z)
    if missing:
        print(f'Warning: {len(missing)} mapped mesh(es) not found: {", ".join(missing[:8])}')

    exported: list[tuple[str, object]] = []
    for node_id, z_list in region_map.items():
        parts = [objects_by_z[z] for z in z_list if z in objects_by_z]
        if not parts:
            print(f'Warning: skipping {node_id} (no source meshes found)')
            continue

        merged = join_meshes(parts)
        if merged is None:
            continue

        merged.name = node_id
        if 'nodeId' not in merged:
            merged['nodeId'] = node_id
        ensure_mesh_single_user(merged)
        apply_decimate_to_cap(merged, ratio, max_tris)
        exported.append((node_id, merged))

    if not exported:
        raise RuntimeError(f'No meshes exported for region {region!r}')

    enforce_region_tri_cap(exported, max_region_tris)

    select_only([obj for _, obj in exported])

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    out_glb = OUT_DIR / f'{region}.glb'

    export_kwargs = dict(
        filepath=str(out_glb),
        export_format='GLB',
        use_selection=True,
        export_extras=True,
    )
    try:
        bpy.ops.export_scene.gltf(**export_kwargs, export_draco_mesh_compression_enable=True)
    except TypeError:
        bpy.ops.export_scene.gltf(**export_kwargs)

    manifest_path = OUT_DIR / 'manifest.json'
    manifest = {'version': 1, 'regions': {}}
    if manifest_path.exists():
        manifest = json.loads(manifest_path.read_text(encoding='utf-8'))

    meshes = []
    for node_id, obj in exported:
        if obj.type != 'MESH':
            continue
        tri_count = len(obj.data.polygons)
        if tri_count > max_tris:
            raise RuntimeError(f'{node_id} still has {tri_count} tris (cap {max_tris})')
        meshes.append(
            {
                'nodeId': node_id,
                'meshName': node_id,
                'triangleCount': tri_count,
            }
        )

    region_total = sum(m['triangleCount'] for m in meshes)
    if region_total > max_region_tris:
        raise RuntimeError(f'region {region} has {region_total} tris (cap {max_region_tris})')
    print(f'  region {region} total: {region_total} tris')

    manifest.setdefault('regions', {})[region] = {
        'region': region,
        'glbUrl': f'/muscle/models/{region}.glb',
        'meshes': meshes,
        'procedural': False,
        'source': 'z-anatomy',
    }
    manifest_path.write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
    print(f'Exported {out_glb} ({len(meshes)} meshes)')


def main(argv: list[str] | None = None) -> None:
    args = parse_args(argv or sys.argv[sys.argv.index('--') + 1 :] if '--' in sys.argv else [])
    try:
        export_region(args.region, args.blend, args.ratio, args.max_tris, args.max_region_tris)
    except Exception as exc:  # noqa: BLE001 — Blender batch tooling
        print(f'Export failed for {args.region}: {exc}', file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
