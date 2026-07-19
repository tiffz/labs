#!/usr/bin/env python3
"""Export a Proko region subset from Z-Anatomy Blender file to GLB (no Draco).

Run inside Blender:
  blender Z-Anatomy.blend --background --python export_region_glb.py -- --region fundamentals

Requirements:
  - Blender 3.6+
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import re
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

DEFAULT_DECIMATE_RATIO = 0.25
DEFAULT_MAX_TRIS = 25_000
DEFAULT_MAX_REGION_TRIS = 80_000
DEFAULT_ATLAS_COMPLETE_MAX_TRIS = 10_000
DEFAULT_ATLAS_COMPLETE_REGION_TRIS = 400_000
DECIMATE_THRESHOLD = 8_000

MUSCLE_COLLECTION_KEYWORDS = ('Muscular system', 'Muscles of')
BONE_COLLECTION_KEYWORDS = ('Osteology', "Skeletal system")
INSERTION_COLLECTION_KEYWORDS = ('Insertions of',)
FACIAL_MUSCLE_COLLECTION_KEYWORDS = ('Facial muscles',)

# Meshes whose verts sit at the world origin (broken placement in Z-Anatomy source).
_ATLAS_ORIGIN_CENTROID_MAX = 0.05
_ATLAS_ORIGIN_SPAN_MAX = 0.25
_ATLAS_DEGENERATE_SPAN = 0.008
_FORBIDDEN_MESH_NAMES = frozenset({'cube', 'plane', 'sphere', 'cylinder', 'monkey'})


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


def load_all_curriculum_map() -> dict[str, list[str]]:
    """Return node_id -> Z-Anatomy names across every CSV region (study curriculum)."""
    by_node: dict[str, list[str]] = defaultdict(list)
    if not MAP_CSV.exists():
        return by_node
    with MAP_CSV.open(newline='', encoding='utf-8') as fh:
        for row in csv.DictReader(fh):
            z_name = row.get('z_anatomy_name', '').strip()
            node_id = row.get('node_id', '').strip()
            if z_name and node_id:
                by_node[node_id].append(z_name)
    return by_node


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument('--region', required=False)
    parser.add_argument('--blend', type=Path, help='Path to Z-Anatomy .blend file')
    parser.add_argument('--ratio', type=float, default=DEFAULT_DECIMATE_RATIO, help='Initial decimate ratio')
    parser.add_argument('--max-tris', type=int, default=DEFAULT_MAX_TRIS, help='Cap per exported mesh')
    parser.add_argument(
        '--max-region-tris',
        type=int,
        default=DEFAULT_MAX_REGION_TRIS,
        help='Cap total triangles per region export',
    )
    parser.add_argument(
        '--audit',
        action='store_true',
        help='Scan Z-Anatomy blend vs manifest and write export-audit-report.json (no GLB export)',
    )
    return parser.parse_args(argv)


def _mesh_world_metrics(obj) -> tuple[tuple[float, float, float], float] | None:
    """Return (centroid, max axis span) in world space, or None when empty."""
    if obj.type != 'MESH' or not obj.data.vertices:
        return None
    verts = [obj.matrix_world @ vertex.co for vertex in obj.data.vertices]
    xs = [v.x for v in verts]
    ys = [v.y for v in verts]
    zs = [v.z for v in verts]
    centroid = (sum(xs) / len(xs), sum(ys) / len(ys), sum(zs) / len(zs))
    span = max(max(xs) - min(xs), max(ys) - min(ys), max(zs) - min(zs))
    return centroid, span


def _is_forbidden_mesh_name(name: str) -> bool:
    return name.strip().lower() in _FORBIDDEN_MESH_NAMES


def _is_degenerate_atlas_mesh(obj) -> bool:
    """Skip origin-placed garbage and collapsed duplicates from Z-Anatomy."""
    if _is_forbidden_mesh_name(obj.name):
        return True
    metrics = _mesh_world_metrics(obj)
    if metrics is None:
        return True
    (cx, cy, cz), span = metrics
    if span < _ATLAS_DEGENERATE_SPAN:
        return True
    origin_dist = (cx * cx + cy * cy + cz * cz) ** 0.5
    if origin_dist < _ATLAS_ORIGIN_CENTROID_MAX and span < _ATLAS_ORIGIN_SPAN_MAX:
        return True
    return False


def _region_name_lower(obj) -> str:
    return obj.name.lower()


# Auricular overlay — pinna detail exported as skin_ear (preserves helix/concha).


# Ear base / collar — welded into head_neck so skin_ear overlay has continuous backing.


def export_gltf_curated(export_objects: list, out_glb: Path) -> None:
    """Write a GLB after isolate_export_objects — scene contains only curated meshes."""
    mesh_objects = [obj for obj in export_objects if obj.type == 'MESH']
    if not mesh_objects:
        raise RuntimeError('No mesh objects to export')

    scene = bpy.context.scene
    view_layer = bpy.context.view_layer
    for obj in mesh_objects:
        if obj.name not in scene.objects:
            scene.collection.objects.link(obj)
        obj.hide_set(False)
        obj.hide_viewport = False
        obj.hide_render = False
        if obj.data and obj.data.name != obj.name:
            obj.data.name = obj.name

    for obj in list(bpy.data.objects):
        if obj.type == 'MESH' and _is_forbidden_mesh_name(obj.name):
            bpy.data.objects.remove(obj, do_unlink=True)

    bpy.ops.object.select_all(action='DESELECT')
    for obj in mesh_objects:
        if obj.name in bpy.data.objects:
            obj.select_set(True)
    view_layer.objects.active = mesh_objects[0]

    bpy.ops.export_scene.gltf(
        filepath=str(out_glb),
        export_format='GLB',
        use_selection=False,
        export_apply=False,
        export_extras=True,
        export_cameras=False,
        export_lights=False,
        export_draco_mesh_compression_enable=False,
    )


def bake_mesh_world_transform(obj) -> None:
    """Bake object transform into mesh data so GLB nodes export at identity."""
    if obj.type != 'MESH':
        return
    matrix = obj.matrix_world.copy()
    if matrix.is_identity:
        return
    mesh = obj.data
    for vertex in mesh.vertices:
        vertex.co = matrix @ vertex.co
    obj.matrix_world.identity()


def duplicate_mesh_object(source) -> object:
    """Copy a mesh object so we never mutate the Z-Anatomy library originals."""
    mesh_copy = source.data.copy()
    obj_copy = source.copy()
    obj_copy.data = mesh_copy
    bpy.context.collection.objects.link(obj_copy)
    obj_copy.matrix_world = source.matrix_world.copy()
    return obj_copy


def join_meshes(objects: list) -> object | None:
    if not objects:
        return None
    if len(objects) == 1:
        return objects[0]

    view_layer = bpy.context.view_layer
    bpy.ops.object.select_all(action='DESELECT')
    for obj in objects:
        obj.hide_set(False)
        obj.select_set(True)
    view_layer.objects.active = objects[0]
    bpy.ops.object.join()
    return view_layer.objects.active


def shade_smooth_mesh(obj) -> None:
    if obj.type != 'MESH':
        return
    mesh = obj.data
    for poly in mesh.polygons:
        poly.use_smooth = True
    mesh.update()


# Voxel size (world units, ~metres) for unifying Z-Anatomy's fragmented auricle into one clean
# watertight ear. Smaller keeps finer helix detail but risks leaving fragment gaps open; larger
# bridges bigger gaps but blobs out detail. Tuned against rendered pixels.


def solidify_mesh(obj, thickness: float) -> None:
    """Give a thin open surface volume (a symmetric shell) so volumetric ops (voxel remesh) work.

    Z-Anatomy's auricle fragments are zero-thickness sheets; voxel remesh needs an inside/outside,
    so without thickness it degenerates. A 2-sided solidify turns each sheet into a thin slab the
    remesh can capture, preserving helix/concha relief while making the result watertight.
    """
    if obj.type != 'MESH' or not obj.data.polygons:
        return
    ensure_mesh_single_user(obj)
    bpy.ops.object.select_all(action='DESELECT')
    obj.hide_set(False)
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    mod = obj.modifiers.new('EarSolidify', 'SOLIDIFY')
    mod.thickness = thickness
    mod.offset = 0.0  # grow symmetrically about the original surface (no net shift)
    mod.use_even_offset = True
    bpy.ops.object.modifier_apply(modifier=mod.name)


def smooth_mesh(obj, iterations: int, factor: float) -> None:
    """Relax vertices (Smooth modifier) to remove spiky voxel-remesh artifacts without re-holing."""
    if obj.type != 'MESH' or not obj.data.polygons:
        return
    ensure_mesh_single_user(obj)
    bpy.ops.object.select_all(action='DESELECT')
    obj.hide_set(False)
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    mod = obj.modifiers.new('EarSmooth', 'SMOOTH')
    mod.iterations = iterations
    mod.factor = factor
    bpy.ops.object.modifier_apply(modifier=mod.name)


def voxel_remesh_mesh(obj, voxel_size: float, adaptivity: float = 0.0) -> None:
    """Rebuild `obj` as a single watertight manifold via the Voxel Remesh modifier.

    The auricle arrives as ~14 disconnected thin fragments whose gaps are open chains — weld
    collapses the helix and fill cannot cap open chains. Voxel remesh marches a closed surface
    over the fragment union, bridging the gaps and smoothing the crumple in one principled pass.
    Requires world-baked coordinates so voxel_size is in world units.
    """
    if obj.type != 'MESH' or not obj.data.polygons:
        return
    ensure_mesh_single_user(obj)
    bpy.ops.object.select_all(action='DESELECT')
    obj.hide_set(False)
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    before = len(obj.data.polygons)
    mod = obj.modifiers.new('EarVoxelRemesh', 'REMESH')
    mod.mode = 'VOXEL'
    mod.voxel_size = voxel_size
    mod.adaptivity = adaptivity
    mod.use_smooth_shade = True
    bpy.ops.object.modifier_apply(modifier=mod.name)
    print(f'  voxel remesh {obj.name}: {before} -> {len(obj.data.polygons)} tris (voxel {voxel_size})')


def _staging_band_contains(
    co,
    *,
    y_min: float,
    y_max: float,
    min_abs_x: float = 0.0,
    max_abs_x: float = 0.35,
    z_min: float = -0.45,
    z_max: float = 0.2,
) -> bool:
    """Map staging-space bands (glTF Y-up) onto Blender Z-up mesh coordinates."""
    height = co.z
    depth = co.y
    lateral = abs(co.x)
    if height < y_min or height > y_max:
        return False
    if lateral < min_abs_x or lateral > max_abs_x:
        return False
    if depth < z_min or depth > z_max:
        return False
    return True


def weld_skin_mesh_spatial_band(
    obj,
    *,
    merge_dist: float,
    y_min: float,
    y_max: float,
    min_abs_x: float = 0.0,
    max_abs_x: float = 0.35,
    z_min: float = -0.45,
    z_max: float = 0.2,
) -> None:
    """Merge-by-distance only for vertices in a staging-space band (patch seam hot spots)."""
    if obj.type != 'MESH' or not obj.data.vertices:
        return

    import bmesh

    view_layer = bpy.context.view_layer
    ensure_mesh_single_user(obj)
    bpy.ops.object.select_all(action='DESELECT')
    obj.hide_set(False)
    obj.select_set(True)
    view_layer.objects.active = obj
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='DESELECT')
    bm = bmesh.from_edit_mesh(obj.data)
    bm.verts.ensure_lookup_table()
    selected = 0
    for vert in bm.verts:
        if _staging_band_contains(
            vert.co,
            y_min=y_min,
            y_max=y_max,
            min_abs_x=min_abs_x,
            max_abs_x=max_abs_x,
            z_min=z_min,
            z_max=z_max,
        ):
            vert.select = True
            selected += 1
    bmesh.update_edit_mesh(obj.data)
    if selected == 0:
        bpy.ops.object.mode_set(mode='OBJECT')
        return
    try:
        bpy.ops.mesh.merge_by_distance(threshold=merge_dist)
    except AttributeError:
        bpy.ops.mesh.remove_doubles(threshold=merge_dist)
    bpy.ops.object.mode_set(mode='OBJECT')
    shade_smooth_mesh(obj)


def _collect_boundary_loops(bm, edge_in_band, *, strict: bool = False) -> list[list]:
    """Walk closed boundary loops; strict=True requires a single unambiguous next edge."""
    boundary_edges = [edge for edge in bm.edges if edge.is_boundary and edge_in_band(edge)]
    if not boundary_edges:
        return []

    adjacency: dict[int, list] = {}
    for edge in boundary_edges:
        a, b = edge.verts[0], edge.verts[1]
        adjacency.setdefault(a.index, []).append((b, edge))
        adjacency.setdefault(b.index, []).append((a, edge))

    visited_edges: set[int] = set()
    loops: list[list] = []

    for start_edge in boundary_edges:
        if start_edge.index in visited_edges:
            continue
        loop_edges = [start_edge]
        visited_edges.add(start_edge.index)
        prev_vert = start_edge.verts[0]
        curr_vert = start_edge.verts[1]
        start_vert = prev_vert

        while curr_vert != start_vert and len(loop_edges) <= 256:
            neighbors = adjacency.get(curr_vert.index, [])
            candidates = [
                (nxt, edge)
                for nxt, edge in neighbors
                if nxt != prev_vert and edge.index not in visited_edges
            ]
            if not candidates:
                break
            if strict and len(candidates) != 1:
                break
            nxt_vert, nxt_edge = candidates[0]
            loop_edges.append(nxt_edge)
            visited_edges.add(nxt_edge.index)
            prev_vert = curr_vert
            curr_vert = nxt_vert

        if curr_vert == start_vert and len(loop_edges) >= 3:
            loops.append(loop_edges)

    return loops


def fill_skin_patch_holes_bmesh(
    obj,
    *,
    sides: int = 52,
    y_min: float,
    y_max: float,
    min_abs_x: float = 0.0,
    max_abs_x: float = 0.35,
    z_min: float = -0.45,
    z_max: float = 0.2,
    exclude_sagittal_plane: bool = True,
    max_passes: int = 4,
    label: str = 'skin',
    centroid_only_band: bool = False,
    max_loop_diameter: float = 0.11,
) -> int:
    """Fill closed boundary loops in a staging-space band — smallest loops first, multi-pass."""
    if obj.type != 'MESH' or not obj.data.vertices:
        return 0

    import bmesh
    from mathutils import Vector

    ensure_mesh_single_user(obj)
    total_filled = 0

    def edge_in_band(edge) -> bool:
        v0 = edge.verts[0].co
        v1 = edge.verts[1].co
        if exclude_sagittal_plane and max(abs(v0.x), abs(v1.x)) < 0.016:
            return False
        if centroid_only_band:
            return edge.is_boundary
        center = (v0 + v1) * 0.5
        if _staging_band_contains(
            center,
            y_min=y_min,
            y_max=y_max,
            min_abs_x=min_abs_x,
            max_abs_x=max_abs_x,
            z_min=z_min,
            z_max=z_max,
        ):
            return True
        # Long loops can straddle the band — keep edges that overlap staging height/lateral span.
        if max(v0.z, v1.z) < y_min or min(v0.z, v1.z) > y_max:
            return False
        if max(abs(v0.x), abs(v1.x)) < min_abs_x or min(abs(v0.x), abs(v1.x)) > max_abs_x:
            return False
        if max(v0.y, v1.y) < z_min or min(v0.y, v1.y) > z_max:
            return False
        return True

    def loop_centroid(loop_edges) -> Vector:
        verts = {v for edge in loop_edges for v in edge.verts}
        center = Vector((0.0, 0.0, 0.0))
        for vert in verts:
            center += vert.co
        return center / max(len(verts), 1)

    def loop_diameter(loop_edges) -> float:
        verts = list({v for edge in loop_edges for v in edge.verts})
        max_dist = 0.0
        for i, a in enumerate(verts):
            for b in verts[i + 1 :]:
                dx = a.co.x - b.co.x
                dy = a.co.z - b.co.z
                dz = a.co.y - b.co.y
                max_dist = max(max_dist, (dx * dx + dy * dy + dz * dz) ** 0.5)
        return max_dist

    for _pass_idx in range(max_passes):
        bm = bmesh.new()
        bm.from_mesh(obj.data)
        bm.edges.ensure_lookup_table()
        loops = _collect_boundary_loops(bm, edge_in_band, strict=False)
        if _pass_idx == 0 and loops:
            largest = max((len(loop) for loop in loops), default=0)
            print(f'    fill {label}: pass {_pass_idx} found {len(loops)} loops (largest {largest} edges)')
        if not loops:
            bm.free()
            break

        loops.sort(key=len)
        filled_pass = 0
        for loop_edges in loops:
            edge_count = len(loop_edges)
            if edge_count < 3 or edge_count > 180:
                continue
            center = loop_centroid(loop_edges)
            if not _staging_band_contains(
                center,
                y_min=y_min,
                y_max=y_max,
                min_abs_x=min_abs_x,
                max_abs_x=max_abs_x,
                z_min=z_min,
                z_max=z_max,
            ):
                continue
            if loop_diameter(loop_edges) > max_loop_diameter:
                # Large loops are patch perimeters (palm outline, wrist cuff) — weld, do not cap.
                continue
            loop_sides = min(max(edge_count, 3), sides)
            filled = False
            if edge_count > sides:
                # Palm / digit patch perimeters often exceed `sides` — grid_fill first.
                try:
                    bmesh.ops.grid_fill(bm, edges=loop_edges)
                    filled_pass += 1
                    filled = True
                except (ValueError, TypeError):
                    try:
                        bmesh.ops.holes_fill(bm, edges=loop_edges, sides=min(edge_count, 180))
                        filled_pass += 1
                        filled = True
                    except (ValueError, TypeError):
                        pass
            if filled:
                continue
            try:
                bmesh.ops.triangle_fill(bm, edges=loop_edges, use_beauty=True, use_dissolve=False)
                filled_pass += 1
            except (ValueError, TypeError):
                try:
                    bmesh.ops.holes_fill(bm, edges=loop_edges, sides=loop_sides)
                    filled_pass += 1
                except (ValueError, TypeError):
                    try:
                        bmesh.ops.grid_fill(bm, edges=loop_edges)
                        filled_pass += 1
                    except (ValueError, TypeError):
                        loop_span = loop_diameter(loop_edges)
                        if loop_span <= max_loop_diameter and edge_count >= 8:
                            try:
                                hub = bm.verts.new(loop_centroid(loop_edges))
                                for edge in loop_edges:
                                    va, vb = edge.verts[0], edge.verts[1]
                                    bm.faces.new((hub, va, vb))
                                filled_pass += 1
                            except (ValueError, TypeError):
                                continue
                        else:
                            continue

        if filled_pass:
            bm.to_mesh(obj.data)
            obj.data.update()
            shade_smooth_mesh(obj)
            total_filled += filled_pass
        bm.free()
        if filled_pass == 0:
            break

    if total_filled:
        print(f'    fill {label}: {total_filled} loops (≤{sides} edges, {max_passes} passes max)')
    return total_filled


def force_fill_largest_interior_loop(
    obj,
    *,
    y_min: float,
    y_max: float,
    min_abs_x: float,
    max_abs_x: float,
    z_min: float,
    z_max: float,
    min_edges: int = 8,
    max_edges: int = 120,
    label: str = 'force_fill',
    filter_centroid: bool = True,
) -> int:
    """Fan- or grid-fill the largest boundary loop in a band when multi-pass fill misses it."""
    if obj.type != 'MESH' or not obj.data.vertices:
        return 0

    import bmesh
    from mathutils import Vector

    ensure_mesh_single_user(obj)

    def loop_centroid(loop_edges) -> Vector:
        verts = {v for edge in loop_edges for v in edge.verts}
        center = Vector((0.0, 0.0, 0.0))
        for vert in verts:
            center += vert.co
        return center / max(len(verts), 1)

    bm = bmesh.new()
    bm.from_mesh(obj.data)
    loops = _collect_boundary_loops(bm, lambda edge: edge.is_boundary, strict=False)
    candidates: list[tuple[int, list]] = []
    for loop_edges in loops:
        edge_count = len(loop_edges)
        if edge_count < min_edges or edge_count > max_edges:
            continue
        center = loop_centroid(loop_edges)
        if filter_centroid and not _staging_band_contains(
            center,
            y_min=y_min,
            y_max=y_max,
            min_abs_x=min_abs_x,
            max_abs_x=max_abs_x,
            z_min=z_min,
            z_max=z_max,
        ):
            continue
        candidates.append((edge_count, loop_edges))

    if not candidates:
        print(f'    fill {label}: skipped ({len(loops)} boundary loops, none in band {min_edges}-{max_edges} edges)')
        bm.free()
        return 0

    candidates.sort(key=lambda pair: pair[0], reverse=True)
    edge_count, loop_edges = candidates[0]
    filled = False
    try:
        bmesh.ops.grid_fill(bm, edges=loop_edges)
        filled = True
    except (ValueError, TypeError):
        try:
            bmesh.ops.holes_fill(bm, edges=loop_edges, sides=min(edge_count, 180))
            filled = True
        except (ValueError, TypeError):
            try:
                hub = bm.verts.new(loop_centroid(loop_edges))
                for edge in loop_edges:
                    va, vb = edge.verts[0], edge.verts[1]
                    bm.faces.new((hub, va, vb))
                filled = True
            except (ValueError, TypeError):
                filled = False

    if not filled:
        bm.free()
        return 0

    bm.to_mesh(obj.data)
    obj.data.update()
    shade_smooth_mesh(obj)
    bm.free()
    print(f'    fill {label}: forced loop ({edge_count} edges)')
    return 1


def ensure_mesh_single_user(obj) -> None:
    if obj.type != 'MESH':
        return
    if obj.data.users > 1:
        obj.data = obj.data.copy()
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


def apply_decimate_to_target(obj, max_tris: int) -> None:
    """Single-pass decimate to a triangle budget — avoids over-shoot from iterative ratio decay."""
    if obj.type != 'MESH':
        return

    view_layer = bpy.context.view_layer
    bpy.ops.object.select_all(action='DESELECT')
    obj.hide_set(False)
    obj.select_set(True)
    view_layer.objects.active = obj

    ensure_mesh_single_user(obj)

    before = len(obj.data.polygons)
    if before <= max_tris:
        return
    if before <= DECIMATE_THRESHOLD:
        return

    target_ratio = max(0.05, min(1.0, max_tris / before))
    mod = obj.modifiers.new('DecimateSkinTarget', 'DECIMATE')
    mod.ratio = target_ratio
    bpy.ops.object.modifier_apply(modifier=mod.name)

    after = len(obj.data.polygons)
    # Collapse decimate can overshoot ratio slightly — trim until within budget.
    while len(obj.data.polygons) > max_tris:
        target_ratio = max(0.05, max_tris / max(len(obj.data.polygons), 1))
        mod = obj.modifiers.new('DecimateSkinTrim', 'DECIMATE')
        mod.ratio = target_ratio
        bpy.ops.object.modifier_apply(modifier=mod.name)
        if len(obj.data.polygons) >= after:
            break
        after = len(obj.data.polygons)

    after = len(obj.data.polygons)
    print(f'  decimate {obj.name}: {before} -> {after} tris (target {max_tris})')


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


def refresh_asset_revision(manifest_path: Path) -> None:
    """Hash committed GLBs so the app can cache-bust drei useGLTF after re-exports."""
    if not manifest_path.exists():
        return
    manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
    digest = hashlib.sha256()
    for glb in sorted(OUT_DIR.glob('*.glb')):
        digest.update(glb.name.encode('utf-8'))
        digest.update(glb.read_bytes())
    manifest['assetRevision'] = digest.hexdigest()[:12]
    manifest_path.write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')


def isolate_export_objects(keep_names: list[str]) -> list:
    """Remove every object except the curated export set (prevents whole-scene GLBs)."""
    keep_set = set(keep_names)
    for obj in list(bpy.data.objects):
        if obj.name not in keep_set:
            bpy.data.objects.remove(obj, do_unlink=True)
    return [bpy.data.objects[name] for name in keep_names if name in bpy.data.objects]


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
        parts = []
        for z_name in z_list:
            source = objects_by_z.get(z_name)
            if source is None:
                continue
            parts.append(duplicate_mesh_object(source))
        if not parts:
            print(f'Warning: skipping {node_id} (no source meshes found)')
            continue

        merged = join_meshes(parts)
        if merged is None:
            continue

        merged.name = node_id
        merged['nodeId'] = node_id
        ensure_mesh_single_user(merged)
        apply_decimate_to_cap(merged, ratio, max_tris)
        exported.append((node_id, merged))

    if not exported:
        raise RuntimeError(f'No meshes exported for region {region!r}')

    enforce_region_tri_cap(exported, max_region_tris)

    for _node_id, obj in exported:
        bake_mesh_world_transform(obj)

    export_names = [node_id for node_id, _ in exported]
    export_objects = isolate_export_objects(export_names)
    if len(export_objects) != len(export_names):
        missing_export = sorted(set(export_names) - {obj.name for obj in export_objects})
        raise RuntimeError(f'Export objects missing after isolate: {missing_export}')

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    out_glb = OUT_DIR / f'{region}.glb'

    export_gltf_curated(export_objects, out_glb)

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
    refresh_asset_revision(manifest_path)
    print(f'Exported {out_glb} ({len(meshes)} meshes, {out_glb.stat().st_size // 1024} KB)')


def _collection_matches(obj, keywords: tuple[str, ...]) -> bool:
    return any(any(k in collection.name for k in keywords) for collection in obj.users_collection)


def _atlas_side_ok(name: str, mesh_names: set[str] | None = None) -> bool:
    if name.endswith('.l'):
        return False
    lower = name.lower()
    if 'skin-eraser' in lower or ' region' in lower:
        return False
    # Drop non-sided duplicates when a canonical .r mesh exists (e.g. External Abdominal Oblique).
    if mesh_names and not name.endswith('.r'):
        if f'{name}.r' in mesh_names:
            return False
        if name.lower() + '.r' in {candidate.lower() for candidate in mesh_names}:
            return False
    return True


def _atlas_digit_prefixed_anatomy(name: str) -> bool:
    """Z-Anatomy uses leading ordinals (1st rib.r, 2d metatarsal bone.r) — not Blender junk."""
    return bool(re.match(r'^\d+(?:st|nd|rd|th|d)\b', name, re.I))


def _classify_atlas_mesh(obj, mesh_names: set[str] | None = None) -> str | None:
    """Return 'muscle' | 'bone' for export candidates, else None."""
    name = obj.name
    if not _atlas_side_ok(name, mesh_names):
        return None
    lower = name.lower()
    if name[:1].isdigit() and not _atlas_digit_prefixed_anatomy(name):
        return None
    if any(token in lower for token in ('ligament', 'cartilage', 'capsule', 'tendon', 'aponeurosis', 'cornea')):
        return None
    if _is_degenerate_atlas_mesh(obj):
        return None
    if _collection_matches(obj, MUSCLE_COLLECTION_KEYWORDS):
        return 'muscle'
    if _collection_matches(obj, FACIAL_MUSCLE_COLLECTION_KEYWORDS):
        return 'muscle'
    if _collection_matches(obj, BONE_COLLECTION_KEYWORDS):
        return 'bone'
    if _collection_matches(obj, INSERTION_COLLECTION_KEYWORDS):
        return 'muscle'
    return None


def _prefer_canonical_mesh_names(selected: dict[str, tuple[object, str]]) -> dict[str, tuple[object, str]]:
    """Drop numbered Blender duplicates (.r.001) when a canonical .r mesh exists."""
    import re

    keep: dict[str, tuple[object, str]] = {}
    for name, payload in selected.items():
        canonical = re.sub(r'(\.r)\.\d+$', r'\1', name)
        existing = keep.get(canonical)
        if existing is None or name == canonical:
            keep[canonical if name.endswith('.r') else name] = payload
        elif name == canonical:
            keep[canonical] = payload
    # Re-key by actual object names we kept
    filtered: dict[str, tuple[object, str]] = {}
    seen_sources: set[int] = set()
    for name, payload in selected.items():
        canonical = re.sub(r'(\.r)\.\d+$', r'\1', name)
        preferred = canonical if canonical in selected else name
        if name != preferred:
            continue
        source_id = id(payload[0])
        if source_id in seen_sources:
            continue
        seen_sources.add(source_id)
        filtered[name] = payload
    return filtered


def _atlas_node_id(z_name: str) -> str:
    import hashlib
    import re

    slug = re.sub(r'[^a-z0-9]+', '_', z_name.lower()).strip('_')
    slug = slug[:36] or 'mesh'
    digest = hashlib.sha1(z_name.encode('utf-8')).hexdigest()[:8]
    return f'atlas_{slug}_{digest}'[:63]


def export_atlas_complete(blend: Path | None, ratio: float, max_tris: int, max_region_tris: int) -> None:
    """Export every Z-Anatomy muscle + bone (right side / midline) for Full body view."""
    if bpy is None:
        raise RuntimeError('Run this script with Blender: blender ... --python export_region_glb.py')

    region = 'atlas_complete'
    if blend and (not bpy.data.filepath or Path(bpy.data.filepath).resolve() != blend.resolve()):
        bpy.ops.wm.open_mainfile(filepath=str(blend))

    curriculum_map = load_all_curriculum_map()
    mesh_names = {obj.name for obj in bpy.data.objects if obj.type == 'MESH'}

    selected: dict[str, tuple[object, str]] = {}
    skipped_degenerate = 0
    for obj in bpy.data.objects:
        if obj.type != 'MESH':
            continue
        kind = _classify_atlas_mesh(obj, mesh_names)
        if kind:
            selected[obj.name] = (obj, kind)
        elif obj.type == 'MESH' and _is_degenerate_atlas_mesh(obj):
            skipped_degenerate += 1
    if skipped_degenerate:
        print(f'  skipped {skipped_degenerate} degenerate / origin-placed meshes')

    if not selected:
        raise RuntimeError('No muscle/bone meshes matched atlas export filters')

    selected = _prefer_canonical_mesh_names(selected)
    print(f'  atlas_complete candidates: {len(selected)} meshes')

    assigned_z: set[str] = set()
    exported: list[tuple[str, object, str]] = []

    for node_id, z_list in curriculum_map.items():
        parts = []
        for z_name in z_list:
            entry = selected.get(z_name)
            if entry is None:
                continue
            source, _kind = entry
            parts.append(duplicate_mesh_object(source))
            assigned_z.add(z_name)
        if not parts:
            continue
        merged = join_meshes(parts)
        if merged is None:
            continue
        merged.name = node_id
        merged['nodeId'] = node_id
        ensure_mesh_single_user(merged)
        apply_decimate_to_cap(merged, ratio, max_tris)
        kind = 'bone' if node_id.startswith('bone_') else 'muscle' if node_id.startswith('muscle_') else 'joint'
        exported.append((node_id, merged, kind))

    for z_name, (source, kind) in sorted(selected.items()):
        if z_name in assigned_z:
            continue
        node_id = _atlas_node_id(z_name)
        copy = duplicate_mesh_object(source)
        copy.name = node_id
        copy['nodeId'] = node_id
        copy['atlasKind'] = kind
        copy['zAnatomyName'] = z_name
        ensure_mesh_single_user(copy)
        apply_decimate_to_cap(copy, ratio, max_tris)
        exported.append((node_id, copy, kind))

    if not exported:
        raise RuntimeError('No meshes exported for atlas_complete')

    # Proportional decimate passes until the region fits the web budget.
    for pass_idx in range(4):
        total_tris = sum(len(obj.data.polygons) for _, obj, _ in exported if obj.type == 'MESH')
        if total_tris <= max_region_tris:
            break
        scale = max_region_tris / total_tris
        print(
            f'  atlas_complete pass {pass_idx + 1}: {total_tris} tris — scaling by {scale:.3f}',
        )
        for node_id, obj, _kind in exported:
            if obj.type != 'MESH':
                continue
            ensure_mesh_single_user(obj)
            before = len(obj.data.polygons)
            if before <= 120:
                continue
            mod = obj.modifiers.new(f'DecimateAtlasScale{pass_idx}', 'DECIMATE')
            mod.ratio = max(0.04, min(1.0, scale * 0.98))
            bpy.ops.object.select_all(action='DESELECT')
            obj.hide_set(False)
            obj.select_set(True)
            bpy.context.view_layer.objects.active = obj
            bpy.ops.object.modifier_apply(modifier=mod.name)
        else:
            continue
        break

    for _node_id, obj, _kind in exported:
        bake_mesh_world_transform(obj)

    export_names = [node_id for node_id, _, _ in exported]
    export_objects = isolate_export_objects(export_names)
    if len(export_objects) != len(export_names):
        missing_export = sorted(set(export_names) - {obj.name for obj in export_objects})
        raise RuntimeError(f'Export objects missing after isolate: {missing_export}')

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    out_glb = OUT_DIR / f'{region}.glb'

    export_gltf_curated(export_objects, out_glb)

    manifest_path = OUT_DIR / 'manifest.json'
    manifest = {'version': 1, 'regions': {}}
    if manifest_path.exists():
        manifest = json.loads(manifest_path.read_text(encoding='utf-8'))

    meshes = []
    for node_id, obj, kind in exported:
        if obj.type != 'MESH':
            continue
        tri_count = len(obj.data.polygons)
        if tri_count > max_tris:
            raise RuntimeError(f'{node_id} still has {tri_count} tris (cap {max_tris})')
        entry = {
            'nodeId': node_id,
            'meshName': node_id,
            'triangleCount': tri_count,
            'atlasKind': kind,
        }
        if node_id.startswith('atlas_') and obj.get('zAnatomyName'):
            entry['displayName'] = obj['zAnatomyName']
        meshes.append(entry)

    region_total = sum(m['triangleCount'] for m in meshes)
    if region_total > max_region_tris:
        raise RuntimeError(f'region {region} has {region_total} tris (cap {max_region_tris})')
    print(f'  region {region} total: {region_total} tris ({len(meshes)} meshes)')

    manifest.setdefault('regions', {})[region] = {
        'region': region,
        'glbUrl': f'/muscle/models/{region}.glb',
        'meshes': meshes,
        'procedural': False,
        'source': 'z-anatomy',
    }
    manifest_path.write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
    refresh_asset_revision(manifest_path)
    print(f'Exported {out_glb} ({len(meshes)} meshes, {out_glb.stat().st_size // 1024} KB)')


def _in_protect_region(co) -> bool:
    """World-space bands (Blender Z-up) for Z-Anatomy detail kept dense under decimation:
    head + ear (high z), hands/fingers (lateral, hip height — arms hang at sides), feet/toes
    (near the floor). Forearm/upper-arm/torso/back fall outside and decimate normally."""
    height = co.z
    lateral = abs(co.x)
    if height >= 1.36:  # head + neck + ear shell
        return True
    if 0.74 <= height <= 0.99 and lateral >= 0.15:  # hands + fingers
        return True
    if height <= 0.12:  # feet + toes
        return True
    return False


def apply_protected_decimate_to_target(obj, max_tris: int, group_name: str) -> None:
    """Collapse-decimate to a tri budget while sparing `group_name` verts (inverted group).

    Confirmed semantics: weight 1.0 + invert_vertex_group=True + factor 1.0 fully protects the
    weighted verts and tapers decimation toward them (no hard cut, so seams do not re-open).
    """
    if obj.type != 'MESH':
        return

    view_layer = bpy.context.view_layer
    bpy.ops.object.select_all(action='DESELECT')
    obj.hide_set(False)
    obj.select_set(True)
    view_layer.objects.active = obj
    ensure_mesh_single_user(obj)

    before = len(obj.data.polygons)
    if before <= max_tris or before <= DECIMATE_THRESHOLD:
        return

    has_group = obj.vertex_groups.get(group_name) is not None

    def _new_decimate(name: str, ratio: float):
        mod = obj.modifiers.new(name, 'DECIMATE')
        mod.ratio = ratio
        if has_group:
            mod.vertex_group = group_name
            mod.invert_vertex_group = True
            mod.vertex_group_factor = 1.0
        return mod

    mod = _new_decimate('DecimateSkinProtected', max(0.05, min(1.0, max_tris / before)))
    bpy.ops.object.modifier_apply(modifier=mod.name)

    after = len(obj.data.polygons)
    # Protected verts raise the achievable floor — only keep trimming while it still shrinks.
    while len(obj.data.polygons) > max_tris:
        ratio = max(0.05, max_tris / max(len(obj.data.polygons), 1))
        mod = _new_decimate('DecimateSkinProtectedTrim', ratio)
        bpy.ops.object.modifier_apply(modifier=mod.name)
        if len(obj.data.polygons) >= after:
            break
        after = len(obj.data.polygons)

    print(f'  protected decimate {obj.name}: {before} -> {len(obj.data.polygons)} tris (target {max_tris})')


def audit_z_anatomy_export(blend: Path | None) -> None:
    """List muscle/bone candidates in Z-Anatomy not represented in manifest.json."""
    if bpy is None:
        raise RuntimeError('Run audit with Blender')

    manifest_path = OUT_DIR / 'manifest.json'
    if not manifest_path.exists():
        raise RuntimeError(f'Missing manifest: {manifest_path}')

    if blend and (not bpy.data.filepath or Path(bpy.data.filepath).resolve() != blend.resolve()):
        bpy.ops.wm.open_mainfile(filepath=str(blend))

    manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
    exported_z: set[str] = set()
    exported_node_ids: set[str] = set()
    for region in ('atlas_complete', 'atlas_head_face', 'atlas_supplement'):
        for mesh in manifest.get('regions', {}).get(region, {}).get('meshes', []):
            exported_node_ids.add(mesh.get('nodeId', ''))
            display = mesh.get('displayName')
            if display:
                exported_z.add(display)

    curriculum_map = load_all_curriculum_map()
    assigned_z: set[str] = set()
    for z_list in curriculum_map.values():
        for z_name in z_list:
            if z_name in exported_z or any(z_name in dn for dn in exported_z):
                assigned_z.add(z_name)

    mesh_names = {obj.name for obj in bpy.data.objects if obj.type == 'MESH'}
    candidates: dict[str, str] = {}
    for obj in bpy.data.objects:
        if obj.type != 'MESH':
            continue
        kind = _classify_atlas_mesh(obj, mesh_names)
        if kind:
            candidates[obj.name] = kind

    unexported = sorted(name for name in candidates if name not in assigned_z and name not in exported_z)

    report_path = Path(__file__).resolve().parent / 'data' / 'export-audit-report.json'
    existing: dict = {}
    if report_path.exists():
        existing = json.loads(report_path.read_text(encoding='utf-8'))

    payload = {
        **existing,
        'blenderCandidates': {
            'total': len(candidates),
            'muscles': sum(1 for k in candidates.values() if k == 'muscle'),
            'bones': sum(1 for k in candidates.values() if k == 'bone'),
            'unexported': unexported[:500],
            'unexportedCount': len(unexported),
        },
    }
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(json.dumps(payload, indent=2) + '\n', encoding='utf-8')
    print(f'Audit: {len(candidates)} candidates, {len(unexported)} not in manifest display names')
    print(f'Wrote {report_path}')


def main(argv: list[str] | None = None) -> None:
    args = parse_args(argv or sys.argv[sys.argv.index('--') + 1 :] if '--' in sys.argv else [])
    try:
        if args.audit:
            audit_z_anatomy_export(args.blend)
            return
        if not args.region:
            raise RuntimeError('--region is required unless --audit is set')
        if args.region == 'atlas_complete':
            export_atlas_complete(
                args.blend,
                args.ratio,
                min(args.max_tris, DEFAULT_ATLAS_COMPLETE_MAX_TRIS),
                max(args.max_region_tris, DEFAULT_ATLAS_COMPLETE_REGION_TRIS),
            )
        else:
            export_region(args.region, args.blend, args.ratio, args.max_tris, args.max_region_tris)
    except Exception as exc:  # noqa: BLE001 — Blender batch tooling
        print(f'Export failed for {args.region}: {exc}', file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
