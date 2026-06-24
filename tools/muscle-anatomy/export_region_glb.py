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
            region = row.get('region', '').strip()
            if region in ('atlas_skin',):
                continue
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


def _is_region_skin_patch(obj) -> bool:
    """Z-Anatomy surface region patches that form the skin envelope."""
    if obj.type != 'MESH' or obj.name.endswith('.l'):
        return False
    lower = obj.name.lower()
    if 'skin-eraser' in lower or _is_forbidden_mesh_name(obj.name):
        return False
    if ' region' not in lower:
        return False
    return not _is_degenerate_atlas_mesh(obj)


def _region_name_lower(obj) -> str:
    return obj.name.lower()


def _is_face_region_skin_patch(obj) -> bool:
    if not _is_region_skin_patch(obj):
        return False
    lower = _region_name_lower(obj)
    face_tokens = (
        'frontal', 'zygomatic', 'nasal', 'orbital', 'infraorbital', 'buccal', 'oral',
        'mental', 'submental', 'auricular', 'temporal', 'occipital', 'parietal',
        'mastoid', 'parotid', 'cervical', 'sternocleidomastoid',
    )
    return any(token in lower for token in face_tokens)


def _is_limb_region_skin_patch(obj) -> bool:
    if not _is_region_skin_patch(obj):
        return False
    lower = _region_name_lower(obj)
    limb_tokens = (
        ' thigh', ' leg', ' arm', ' forearm', ' elbow', ' knee', ' ankle', ' wrist',
        ' deltoid', ' heel', ' metatarsal', ' retromalleolar', ' hip region',
    )
    return any(token in lower for token in limb_tokens)


def _is_torso_region_skin_patch(obj) -> bool:
    return (
        _is_region_skin_patch(obj)
        and not _is_face_region_skin_patch(obj)
        and not _is_limb_region_skin_patch(obj)
    )


def _is_hand_digit_skin_patch(obj) -> bool:
    if obj.type != 'MESH' or obj.name.endswith('.l'):
        return False
    lower = obj.name.lower()
    if _is_forbidden_mesh_name(obj.name) or _is_degenerate_atlas_mesh(obj):
        return False
    return 'hand' in lower and 'digit' in lower and 'surface' in lower


def _is_foot_digit_skin_patch(obj) -> bool:
    if obj.type != 'MESH' or obj.name.endswith('.l'):
        return False
    lower = obj.name.lower()
    if _is_forbidden_mesh_name(obj.name) or _is_degenerate_atlas_mesh(obj):
        return False
    return 'foot' in lower and 'digit' in lower and 'surface' in lower


def _is_eminence_skin_patch(obj) -> bool:
    if obj.type != 'MESH' or obj.name.endswith('.l'):
        return False
    lower = obj.name.lower()
    if _is_forbidden_mesh_name(obj.name) or _is_degenerate_atlas_mesh(obj):
        return False
    return lower in {
        'thenar eminence.r',
        'hypothenar eminence.r',
        'hallucial eminence.r',
    }


def _is_fold_skin_patch(obj) -> bool:
    """Named skin folds that omit the ' region' suffix (e.g. gluteal crease)."""
    if obj.type != 'MESH' or obj.name.endswith('.l'):
        return False
    if _is_forbidden_mesh_name(obj.name) or _is_degenerate_atlas_mesh(obj):
        return False
    return obj.name.lower() in {'gluteal fold.r'}


_BRIDGE_SKIN_BASES = (
    'Deltopectoral triangle',
    'Femoral triangle',
    'Carotid triangle',
    'Muscular triangle',
    'Submandibular triangle',
)

# Named skin surfaces in Z-Anatomy that omit " region" in the object name.
_AUXILIARY_SKIN_BASES = (
    'Palm',
    'Sole',
    'Plantar arch',
    'Dorsum of hand',
    'Dorsum of foot',
    'Dorsum of nose',
    'Cubital fossa',
    'Popliteal fossa',
    'Infraclavicular fossa',
    'Lateral border of foot',
    'Medial border of foot',
    'Lateral border of forearm',
    'Medial border of forearm',
    'Dorsal surface of digits of hand',
    'Palmar surface of digits of hand',
    'Dorsal surfaces of digits of foot',
    'Plantar surfaces of digits of foot',
)

_EYE_GLOBE_BASES = (
    'Sclera',
    'Cornea',
)


def _is_bridge_skin_patch(obj) -> bool:
    """Small Z-Anatomy patches that bridge gaps between named skin regions."""
    if obj.type != 'MESH' or obj.name.endswith('.l'):
        return False
    if _is_forbidden_mesh_name(obj.name) or _is_degenerate_atlas_mesh(obj):
        return False
    return any(obj.name.startswith(f'{base}.r') for base in _BRIDGE_SKIN_BASES)


def _is_auxiliary_skin_patch(obj) -> bool:
    """Non-'region' skin surfaces (palm, dorsum, fossae, digit borders)."""
    if obj.type != 'MESH' or obj.name.endswith('.l'):
        return False
    if _is_forbidden_mesh_name(obj.name) or _is_degenerate_atlas_mesh(obj):
        return False
    return any(obj.name.startswith(f'{base}.r') for base in _AUXILIARY_SKIN_BASES)


def _is_eye_globe_patch(obj) -> bool:
    """Sclera + cornea for the reference skin half."""
    if obj.type != 'MESH' or obj.name.endswith('.l'):
        return False
    if _is_forbidden_mesh_name(obj.name) or _is_degenerate_atlas_mesh(obj):
        return False
    return any(obj.name.startswith(f'{base}.r') for base in _EYE_GLOBE_BASES)


def _is_body_skin_patch(obj) -> bool:
    return (
        _is_region_skin_patch(obj)
        or _is_eminence_skin_patch(obj)
        or _is_bridge_skin_patch(obj)
    )


def _is_any_skin_patch(obj) -> bool:
    """All Z-Anatomy skin surfaces — one unified envelope (no inter-mesh seams)."""
    return (
        _is_body_skin_patch(obj)
        or _is_hand_digit_skin_patch(obj)
        or _is_foot_digit_skin_patch(obj)
        or _is_auxiliary_skin_patch(obj)
        or _is_fold_skin_patch(obj)
    )


def _is_skin_face_detail_patch(obj) -> bool:
    return _is_face_region_skin_patch(obj)


def _is_skin_neck_shoulder_patch(obj) -> bool:
    if obj.type != 'MESH' or obj.name.endswith('.l'):
        return False
    if _is_forbidden_mesh_name(obj.name) or _is_degenerate_atlas_mesh(obj):
        return False
    lower = obj.name.lower()
    if not _is_region_skin_patch(obj):
        return False
    neck_shoulder_tokens = (
        'lateral cervical',
        'posterior cervical',
        'sternocleidomastoid region',
        'deltoid region',
        'scapular region',
        'infrascapular region',
        'vertebral region',
        'presternal region',
        'pectoral region',
        'mastoid region',
        'occipital region',
    )
    if any(token in lower for token in neck_shoulder_tokens):
        return True
    return obj.name.startswith('Infraclavicular fossa.r')


def _is_malleolus_skin_patch(obj) -> bool:
    if obj.type != 'MESH' or obj.name.endswith('.l'):
        return False
    if _is_forbidden_mesh_name(obj.name) or _is_degenerate_atlas_mesh(obj):
        return False
    lower = obj.name.lower()
    return lower.startswith('lateral malleola') or lower.startswith('medial malleola')


def _is_skin_hand_detail_patch(obj) -> bool:
    if obj.type != 'MESH' or obj.name.endswith('.l'):
        return False
    if _is_forbidden_mesh_name(obj.name) or _is_degenerate_atlas_mesh(obj):
        return False
    lower = obj.name.lower()
    if _is_hand_digit_skin_patch(obj):
        return True
    if lower in {'thenar eminence.r', 'hypothenar eminence.r'}:
        return True
    if _is_region_skin_patch(obj) and 'wrist' in lower:
        return True
    hand_bases = (
        'Palm',
        'Dorsum of hand',
        'Dorsal surface of digits of hand',
        'Palmar surface of digits of hand',
        'Lateral border of forearm',
        'Medial border of forearm',
        'Anterior region of wrist',
        'Posterior region of wrist',
    )
    return any(obj.name.startswith(f'{base}.r') for base in hand_bases)


def _is_skin_foot_detail_patch(obj) -> bool:
    if obj.type != 'MESH' or obj.name.endswith('.l'):
        return False
    if _is_forbidden_mesh_name(obj.name) or _is_degenerate_atlas_mesh(obj):
        return False
    lower = obj.name.lower()
    if _is_foot_digit_skin_patch(obj):
        return True
    if _is_malleolus_skin_patch(obj):
        return True
    if lower in {'hallucial eminence.r'}:
        return True
    if _is_region_skin_patch(obj) and any(
        token in lower for token in ('ankle', 'retromalleolar', 'heel region', 'metatarsal region')
    ):
        return True
    foot_bases = (
        'Sole',
        'Plantar arch',
        'Dorsum of foot',
        'Dorsal surfaces of digits of foot',
        'Plantar surfaces of digits of foot',
        'Lateral border of foot',
        'Medial border of foot',
    )
    return any(obj.name.startswith(f'{base}.r') for base in foot_bases)


def _is_skin_limb_detail_patch(obj) -> bool:
    """Arm/leg/thigh envelopes — keep out of decimated body shell."""
    if obj.type != 'MESH' or obj.name.endswith('.l'):
        return False
    if _is_forbidden_mesh_name(obj.name) or _is_degenerate_atlas_mesh(obj):
        return False
    if _is_limb_region_skin_patch(obj):
        return True
    lower = obj.name.lower()
    limb_fossae = ('Cubital fossa', 'Popliteal fossa')
    if any(obj.name.startswith(f'{base}.r') for base in limb_fossae):
        return True
    if _is_region_skin_patch(obj) and any(
        token in lower
        for token in (
            ' cubital',
            ' popliteal',
            ' elbow',
            ' knee',
            ' anterior region of arm',
            ' posterior region of arm',
            ' lateral region of arm',
            ' medial region of arm',
        )
    ):
        return True
    return False


def _is_orphan_skin_generated_patch(obj) -> bool:
    """Z-Anatomy filler meshes (Skin_Generated_*, grp*) — trap/neck/wrist gap fill."""
    if obj.type != 'MESH' or obj.name.endswith('.l'):
        return False
    if _is_forbidden_mesh_name(obj.name) or _is_degenerate_atlas_mesh(obj):
        return False
    name = obj.name
    if re.match(r'^Skin_Generated', name, re.I):
        return True
    return bool(re.match(r'^grp\d', name, re.I))


def _is_skin_back_torso_patch(obj) -> bool:
    if _is_orphan_skin_generated_patch(obj):
        return True
    if obj.name.startswith('Interscapular region'):
        return True
    if obj.type != 'MESH' or obj.name.endswith('.l'):
        return False
    if _is_forbidden_mesh_name(obj.name) or _is_degenerate_atlas_mesh(obj):
        return False
    lower = obj.name.lower()
    if 'interscapular region' in lower:
        return True
    if _is_fold_skin_patch(obj):
        return True
    if not _is_region_skin_patch(obj):
        return False
    back_tokens = (
        'gluteal region',
        'lumbar region',
        'sacral region',
        'vertebral region',
        'infrascapular region',
        'interscapular region',
        'occipital region',
        'parietal region',
    )
    return any(token in lower for token in back_tokens)


def _is_skin_body_envelope_patch(obj) -> bool:
    if not _is_any_skin_patch(obj):
        return False
    if _is_orphan_skin_generated_patch(obj):
        return False
    return not (
        _is_skin_face_detail_patch(obj)
        or _is_skin_neck_shoulder_patch(obj)
        or _is_skin_back_torso_patch(obj)
        or _is_skin_hand_detail_patch(obj)
        or _is_skin_foot_detail_patch(obj)
        or _is_skin_limb_detail_patch(obj)
    )


SKIN_MESH_TRI_CAPS: dict[str, int] = {
    'skin_envelope': 48_000,
    'skin_face': 12_000,
    'skin_neck_shoulder': 9_000,
    'skin_back': 14_000,
    'skin_limbs': 14_000,
    'skin_hand_digits': 10_000,
    'skin_foot_digits': 10_000,
    'eye_globes': 2_000,
}

SKIN_DETAIL_MESH_IDS = frozenset(
    {
        'skin_face',
        'skin_neck_shoulder',
        'skin_back',
        'skin_limbs',
        'skin_hand_digits',
        'skin_foot_digits',
    },
)

SKIN_GROUP_SPECS: tuple[tuple[str, object], ...] = (
    ('skin_face', _is_skin_face_detail_patch),
    ('skin_neck_shoulder', _is_skin_neck_shoulder_patch),
    ('skin_back', _is_skin_back_torso_patch),
    ('skin_limbs', _is_skin_limb_detail_patch),
    ('skin_hand_digits', _is_skin_hand_detail_patch),
    ('skin_foot_digits', _is_skin_foot_detail_patch),
    ('skin_envelope', _is_skin_body_envelope_patch),
    ('eye_globes', _is_eye_globe_patch),
)


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


def weld_skin_mesh(obj, merge_dist: float = 0.00075) -> None:
    """Weld nearby patch vertices and smooth normals — avoids SOLIDIFY seam ridges."""
    if obj.type != 'MESH' or not obj.data.vertices:
        return

    view_layer = bpy.context.view_layer
    ensure_mesh_single_user(obj)
    bpy.ops.object.select_all(action='DESELECT')
    obj.hide_set(False)
    obj.select_set(True)
    view_layer.objects.active = obj
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    try:
        bpy.ops.mesh.merge_by_distance(threshold=merge_dist)
    except AttributeError:
        bpy.ops.mesh.remove_doubles(threshold=merge_dist)
    bpy.ops.mesh.delete_loose(use_verts=True, use_edges=True, use_faces=False)
    bpy.ops.object.mode_set(mode='OBJECT')
    shade_smooth_mesh(obj)


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


def export_atlas_skin(blend: Path | None, ratio: float, max_tris: int, max_region_tris: int) -> None:
    """Export Z-Anatomy skin as separate body / hand / foot / eminence meshes (preserve digit detail)."""
    if bpy is None:
        raise RuntimeError('Run this script with Blender: blender ... --python export_region_glb.py')

    region = 'atlas_skin'
    if blend and (not bpy.data.filepath or Path(bpy.data.filepath).resolve() != blend.resolve()):
        bpy.ops.wm.open_mainfile(filepath=str(blend))

    per_mesh_cap = SKIN_MESH_TRI_CAPS.copy()
    detail_ratio = max(ratio, 0.85)

    exported: list[tuple[str, object, int]] = []
    for mesh_id, predicate in SKIN_GROUP_SPECS:
        patches = [
            duplicate_mesh_object(obj)
            for obj in bpy.data.objects
            if predicate(obj)
        ]
        if not patches:
            print(f'  atlas_skin skip {mesh_id}: no patches')
            continue

        merged = join_meshes(patches)
        if merged is None:
            continue

        merged.name = mesh_id
        merged['nodeId'] = mesh_id
        ensure_mesh_single_user(merged)
        if mesh_id in ('skin_envelope', *SKIN_DETAIL_MESH_IDS):
            weld_skin_mesh(merged)
        elif mesh_id == 'eye_globes':
            shade_smooth_mesh(merged)
        cap = per_mesh_cap.get(mesh_id, max_tris)
        if mesh_id == 'skin_envelope':
            apply_decimate_to_target(merged, cap)
        elif mesh_id in SKIN_DETAIL_MESH_IDS:
            apply_decimate_to_cap(merged, detail_ratio, cap)
        else:
            apply_decimate_to_cap(merged, ratio, cap)
        bake_mesh_world_transform(merged)
        tri_count = len(merged.data.polygons)
        print(f'  atlas_skin {mesh_id}: {len(patches)} patches -> {tri_count} tris')
        exported.append((mesh_id, merged, tri_count))

    if not exported:
        raise RuntimeError('No skin meshes exported for atlas_skin')

    skin_parts = [obj for mesh_id, obj, _ in exported if mesh_id != 'eye_globes']
    eye_entries = [(mesh_id, obj, tri) for mesh_id, obj, tri in exported if mesh_id == 'eye_globes']

    if not skin_parts:
        raise RuntimeError('No skin body meshes exported for atlas_skin')

    unified = join_meshes(skin_parts) if len(skin_parts) > 1 else skin_parts[0]
    if unified is None:
        raise RuntimeError('Failed to join atlas_skin body meshes')

    unified.name = 'skin_envelope'
    unified['nodeId'] = 'skin_envelope'
    ensure_mesh_single_user(unified)
    weld_skin_mesh(unified, merge_dist=0.001)
    unified_cap = min(max_region_tris - sum(tri for _, _, tri in eye_entries), 88_000)
    apply_decimate_to_target(unified, max(unified_cap, 40_000))
    bake_mesh_world_transform(unified)
    unified_tris = len(unified.data.polygons)
    print(f'  atlas_skin unified skin_envelope: {len(skin_parts)} parts -> {unified_tris} tris')
    exported = [('skin_envelope', unified, unified_tris), *eye_entries]

    region_total = sum(tri for _, _, tri in exported)
    if region_total > max_region_tris:
        enforce_region_tri_cap([(mid, obj) for mid, obj, _ in exported], max_region_tris)

    export_names = [mesh_id for mesh_id, _, _ in exported]
    export_objects = isolate_export_objects(export_names)
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    out_glb = OUT_DIR / f'{region}.glb'
    export_gltf_curated(export_objects, out_glb)

    manifest_path = OUT_DIR / 'manifest.json'
    manifest = {'version': 1, 'regions': {}}
    if manifest_path.exists():
        manifest = json.loads(manifest_path.read_text(encoding='utf-8'))

    meshes = []
    for mesh_id, obj, _ in exported:
        tri_count = len(obj.data.polygons)
        meshes.append(
            {
                'nodeId': mesh_id,
                'meshName': mesh_id,
                'triangleCount': tri_count,
                'atlasKind': 'skin',
            }
        )

    region_total = sum(m['triangleCount'] for m in meshes)
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
        elif args.region == 'atlas_skin':
            export_atlas_skin(
                args.blend,
                max(args.ratio, 0.85),
                min(max(args.max_tris, 44_000), 44_000),
                min(max(args.max_region_tris, 90_000), 90_000),
            )
        else:
            export_region(args.region, args.blend, args.ratio, args.max_tris, args.max_region_tris)
    except Exception as exc:  # noqa: BLE001 — Blender batch tooling
        print(f'Export failed for {args.region}: {exc}', file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
