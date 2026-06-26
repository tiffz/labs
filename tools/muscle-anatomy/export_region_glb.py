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


def _orphan_skin_centroid_band(obj) -> str:
    """Route Skin_Generated_* / grp* fillers by staging height (Blender Z) and lateral X."""
    metrics = _mesh_world_metrics(obj)
    if metrics is None:
        return 'back'
    (cx, _, height), _ = metrics
    lateral = abs(cx)
    if height >= 1.32:
        return 'face'
    if height >= 1.0:
        return 'neck'
    if height >= 0.72 and height <= 1.08 and lateral >= 0.04:
        return 'hand'
    if height <= 0.22 and lateral >= 0.03:
        return 'foot'
    return 'back'


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
    # Head-face only — avoid broad tokens like 'cervical' stealing neck/platysma patches.
    face_tokens = (
        'frontal region',
        'zygomatic region',
        'nasal region',
        'orbital region',
        'infraorbital region',
        'buccal region',
        'oral region',
        'auricular region',
        'temporal region',
        'parotid region',
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

# Bridge patches welded with neck detail — Deltopectoral joins head_neck with pectoral/deltoid skin.
_NECK_BRIDGE_SKIN_BASES = (
    'Deltopectoral triangle',
    'Carotid triangle',
    'Muscular triangle',
    'Submandibular triangle',
    'Triangle of auscultation',
)

# Suprasternal / sternal skin fillers (omit " region" in Z-Anatomy object names).
_NECK_AUXILIARY_SKIN_BASES = (
    'Lesser supraclavicular fossa',
    'Greater subclavian fossa',
    'Midclavicular line',
    'Sternal line',
    'Parasternal line',
    'Infraclavicular fossa',
    'Submental region',
)

# Named skin surfaces in Z-Anatomy that omit " region" in the object name.
_AUXILIARY_SKIN_BASES = (
    'Palm',
    'Umbilicus',
    'Sole',
    'Plantar arch',
    'Dorsum of hand',
    'Dorsum of foot',
    'Cubital fossa',
    'Popliteal fossa',
    'Lateral border of foot',
    'Medial border of foot',
    'Lateral border of forearm',
    'Medial border of forearm',
    'Dorsal surface of digits of hand',
    'Palmar surface of digits of hand',
    'Dorsal surfaces of digits of foot',
    'Plantar surfaces of digits of foot',
)

# Face fillers that omit " region" (brows, philtrum, smile line, nose tip).
_FACE_AUXILIARY_SKIN_BASES = (
    'Eyebrow',
    'Eyebrow(hair)',
    'Tubercle of upper lip',
    'Dorsum of nose',
    'Nasolabial sulcus',
    'Philtrum',
    'Labial commissure',
)

# Auricular overlay — pinna detail exported as skin_ear (preserves helix/concha).
_EAR_OVERLAY_BASES = (
    'Helix',
    'Antihelix',
    'Crura of antihelix',
    'Tragus',
    'Scapha',
    'Concha of auricle',
    'Auricular tubercle',
    'Lobule of auricle',
    'Apex of auricle',
    'Anterior notch of auricle',
)

# Ear base / collar — welded into head_neck so skin_ear overlay has continuous backing.
_EAR_BACKING_BASES = (
    'Auricular region',
    'Mastoid region',
    'Posterior auricular groove',
)

# Legacy alias for audits listing all auricular Z-Anatomy names.
_EAR_SKIN_BASES = _EAR_OVERLAY_BASES + _EAR_BACKING_BASES

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


def _is_neck_bridge_skin_patch(obj) -> bool:
    if obj.type != 'MESH' or obj.name.endswith('.l'):
        return False
    if _is_forbidden_mesh_name(obj.name) or _is_degenerate_atlas_mesh(obj):
        return False
    return any(obj.name.startswith(f'{base}.r') for base in _NECK_BRIDGE_SKIN_BASES)


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
        or _is_skin_face_auxiliary_patch(obj)
        or _is_fold_skin_patch(obj)
    )


def _is_skin_face_auxiliary_patch(obj) -> bool:
    """Non-region face skin (brows, nose tip, upper-lip tubercle) — not auricular."""
    if obj.type != 'MESH' or obj.name.endswith('.l'):
        return False
    if _is_forbidden_mesh_name(obj.name) or _is_degenerate_atlas_mesh(obj):
        return False
    return any(obj.name.startswith(f'{base}.r') for base in _FACE_AUXILIARY_SKIN_BASES)


def _is_skin_ear_auxiliary_patch(obj) -> bool:
    if obj.type != 'MESH' or obj.name.endswith('.l'):
        return False
    if _is_forbidden_mesh_name(obj.name) or _is_degenerate_atlas_mesh(obj):
        return False
    return any(obj.name.startswith(f'{base}.r') for base in _EAR_OVERLAY_BASES)


def _is_skin_ear_backing_patch(obj) -> bool:
    """Auricular base + mastoid collar — head shell under the skin_ear overlay."""
    if obj.type != 'MESH' or obj.name.endswith('.l'):
        return False
    if _is_forbidden_mesh_name(obj.name) or _is_degenerate_atlas_mesh(obj):
        return False
    if any(obj.name.startswith(f'{base}.r') for base in _EAR_BACKING_BASES):
        return True
    lower = _region_name_lower(obj)
    return _is_region_skin_patch(obj) and 'auricular region' in lower


def _is_skin_ear_patch(obj) -> bool:
    """Pinna detail — skin_ear overlay only (backing stays in skin_head_neck)."""
    if obj.type != 'MESH' or obj.name.endswith('.l'):
        return False
    if _is_forbidden_mesh_name(obj.name) or _is_degenerate_atlas_mesh(obj):
        return False
    return _is_skin_ear_auxiliary_patch(obj)


def _is_skin_neck_auxiliary_patch(obj) -> bool:
    """Supraclavicular / sternal gap fillers for the platysma and suprasternal notch."""
    if obj.type != 'MESH' or obj.name.endswith('.l'):
        return False
    if _is_forbidden_mesh_name(obj.name) or _is_degenerate_atlas_mesh(obj):
        return False
    return any(obj.name.startswith(f'{base}.r') for base in _NECK_AUXILIARY_SKIN_BASES)


def _is_skin_face_detail_patch(obj) -> bool:
    if _is_face_region_skin_patch(obj) or _is_skin_face_auxiliary_patch(obj):
        return True
    return _is_orphan_skin_generated_patch(obj) and _orphan_skin_centroid_band(obj) == 'face'


def _is_skin_neck_shoulder_patch(obj) -> bool:
    if obj.type != 'MESH' or obj.name.endswith('.l'):
        return False
    if _is_forbidden_mesh_name(obj.name) or _is_degenerate_atlas_mesh(obj):
        return False
    # Neck bridge fillers omit " region" — must run before _is_region_skin_patch gate.
    if _is_neck_bridge_skin_patch(obj):
        return True
    lower = obj.name.lower()
    if not _is_region_skin_patch(obj):
        return False
    neck_shoulder_tokens = (
        'lateral cervical',
        'posterior cervical',
        'sternocleidomastoid region',
        'submental region',
        'mental region',
        'deltoid region',
        'scapular region',
        'infrascapular region',
        'vertebral region',
        'presternal region',
        'pectoral region',
        'occipital region',
    )
    if any(token in lower for token in neck_shoulder_tokens):
        return True
    if obj.name.startswith('Interscapular region'):
        return True
    if _is_orphan_skin_generated_patch(obj) and _orphan_skin_centroid_band(obj) == 'neck':
        return True
    return obj.name.startswith('Infraclavicular fossa.r')


def _is_skin_head_neck_patch(obj) -> bool:
    """Face + anterior neck in one welded group — avoids platysma / smile-line inter-group seams."""
    if _is_skin_ear_patch(obj):
        return False
    if _is_skin_ear_backing_patch(obj):
        return True
    return (
        _is_skin_face_detail_patch(obj)
        or _is_skin_neck_shoulder_patch(obj)
        or _is_skin_neck_auxiliary_patch(obj)
    )


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
    if _is_orphan_skin_generated_patch(obj) and _orphan_skin_centroid_band(obj) == 'hand':
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
    if _is_orphan_skin_generated_patch(obj) and _orphan_skin_centroid_band(obj) == 'foot':
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
        return _orphan_skin_centroid_band(obj) == 'back'
    # Interscapular welds with head/neck cape in skin_head_neck — exclude here to avoid duplicate tris.
    if obj.name.startswith('Interscapular region'):
        return False
    if obj.type != 'MESH' or obj.name.endswith('.l'):
        return False
    if _is_forbidden_mesh_name(obj.name) or _is_degenerate_atlas_mesh(obj):
        return False
    lower = obj.name.lower()
    if 'interscapular region' in lower:
        return False
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
    if _is_skin_ear_patch(obj):
        return False
    if _is_neck_bridge_skin_patch(obj):
        return False
    if _is_skin_neck_auxiliary_patch(obj):
        return False
    if obj.name.startswith('Deltopectoral triangle.r'):
        return False
    return not (
        _is_skin_head_neck_patch(obj)
        or _is_skin_back_torso_patch(obj)
        or _is_skin_hand_detail_patch(obj)
        or _is_skin_foot_detail_patch(obj)
        or _is_skin_limb_detail_patch(obj)
    )


SKIN_MESH_TRI_CAPS: dict[str, int] = {
    'skin_envelope': 48_000,
    'skin_ear': 8_000,
    'skin_head_neck': 32_000,
    'skin_back': 14_000,
    'skin_limbs': 14_000,
    'skin_hand_digits': 10_000,
    'skin_foot_digits': 10_000,
    'eye_globes': 2_000,
}

# Meshes exported alongside skin_envelope — skip unified join / decimation / band welds.
SKIN_OVERLAY_MESH_IDS = frozenset({'skin_ear', 'eye_globes'})

SKIN_DETAIL_MESH_IDS = frozenset(
    {
        'skin_head_neck',
        'skin_back',
        'skin_limbs',
        'skin_hand_digits',
        'skin_foot_digits',
    },
)

SKIN_GROUP_SPECS: tuple[tuple[str, object], ...] = (
    ('skin_ear', _is_skin_ear_patch),
    ('skin_head_neck', _is_skin_head_neck_patch),
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


def fill_skin_holes_up_to_sides(obj, sides: int = 48) -> None:
    """Fill open boundary loops between Z-Anatomy skin patches (lateral bands only — not sagittal cut)."""
    fill_skin_patch_holes_bmesh(obj, sides=sides, y_min=0.75, y_max=1.85, min_abs_x=0.045, max_abs_x=0.32)


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


def force_fill_loop_near_staging_point(
    obj,
    *,
    target_x: float,
    target_height: float,
    target_depth: float,
    max_distance: float = 0.08,
    min_edges: int = 8,
    max_edges: int = 180,
    label: str = 'target_fill',
) -> int:
    """Fill the boundary loop whose centroid is closest to a known staging-space hole."""
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

    def staging_distance(center: Vector) -> float:
        # GLB export may flip X sign vs Blender edit coords — match either lateral side.
        dx = min(abs(center.x - target_x), abs(center.x + target_x))
        dy = center.z - target_height
        dz = center.y - target_depth
        return (dx * dx + dy * dy + dz * dz) ** 0.5

    bm = bmesh.new()
    bm.from_mesh(obj.data)
    loops = _collect_boundary_loops(bm, lambda edge: edge.is_boundary, strict=False)
    candidates: list[tuple[float, int, list]] = []
    for loop_edges in loops:
        edge_count = len(loop_edges)
        if edge_count < min_edges or edge_count > max_edges:
            continue
        center = loop_centroid(loop_edges)
        distance = staging_distance(center)
        if distance > max_distance:
            continue
        candidates.append((distance, edge_count, loop_edges))

    if not candidates:
        print(f'    fill {label}: skipped (no loop within {max_distance} of target)')
        bm.free()
        return 0

    candidates.sort(key=lambda pair: pair[0])
    distance, edge_count, loop_edges = candidates[0]
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
    print(f'    fill {label}: targeted loop ({edge_count} edges, d={distance:.3f})')
    return 1


def weld_skin_problem_bands(obj) -> None:
    """Targeted merge-by-distance on known Z-Anatomy patch seam hot spots."""
    weld_skin_mesh_spatial_band(
        obj,
        merge_dist=0.0038,
        y_min=1.05,
        y_max=1.45,
        min_abs_x=0.05,
        max_abs_x=0.28,
        z_min=-0.14,
        z_max=0.14,
    )
    weld_skin_mesh_spatial_band(
        obj,
        merge_dist=0.0035,
        y_min=1.08,
        y_max=1.5,
        min_abs_x=0.0,
        max_abs_x=0.08,
        z_min=-0.16,
        z_max=0.04,
    )
    weld_skin_mesh_spatial_band(
        obj,
        merge_dist=0.0035,
        y_min=1.25,
        y_max=1.65,
        min_abs_x=0.05,
        max_abs_x=0.26,
        z_min=-0.42,
        z_max=-0.02,
    )


def fill_skin_neck_shoulder_holes(obj) -> None:
    """Delt / pec / lateral neck patch gaps."""
    fill_skin_patch_holes_bmesh(
        obj,
        sides=64,
        y_min=1.02,
        y_max=1.48,
        min_abs_x=0.055,
        max_abs_x=0.28,
        z_min=-0.14,
        z_max=0.14,
        label='neck_shoulder',
    )


def fill_skin_throat_holes(obj) -> None:
    """Anterior midline throat / submental gaps (adam's apple band).

    Staging +Z (anterior) maps to negative Blender co.y after glTF export — keep z_min
    low enough to include submental loops (~staging z 0.07 → co.y ≈ −0.07).
    """
    fill_skin_patch_holes_bmesh(
        obj,
        sides=128,
        y_min=1.05,
        y_max=1.52,
        min_abs_x=0.0,
        max_abs_x=0.12,
        z_min=-0.18,
        z_max=0.06,
        exclude_sagittal_plane=False,
        max_passes=12,
        label='throat',
    )
    # Residual 3–6 edge pinholes (adam's apple) that holes_fill skips on larger sides caps.
    fill_skin_patch_holes_bmesh(
        obj,
        sides=6,
        y_min=1.12,
        y_max=1.45,
        min_abs_x=0.0,
        max_abs_x=0.08,
        z_min=-0.16,
        z_max=0.08,
        exclude_sagittal_plane=False,
        max_passes=8,
        label='throat_micro',
    )


def weld_skin_throat_midline_band(obj) -> None:
    """Merge submental / presternal patch seams on the anterior midline after hole fill."""
    weld_skin_mesh_spatial_band(
        obj,
        merge_dist=0.0042,
        y_min=1.08,
        y_max=1.48,
        min_abs_x=0.0,
        max_abs_x=0.09,
        z_min=-0.16,
        z_max=0.04,
    )
    weld_skin_mesh_spatial_band(
        obj,
        merge_dist=0.0038,
        y_min=1.18,
        y_max=1.42,
        min_abs_x=0.0,
        max_abs_x=0.07,
        z_min=-0.14,
        z_max=0.03,
    )


def fill_skin_midline_seam_holes(obj) -> None:
    """Sagittal-adjacent pinholes along face, neck, torso, and pelvis (not lateral shoulder)."""
    fill_skin_patch_holes_bmesh(
        obj,
        sides=64,
        y_min=1.0,
        y_max=1.82,
        min_abs_x=0.0,
        max_abs_x=0.055,
        z_min=-0.45,
        z_max=0.18,
        exclude_sagittal_plane=False,
        max_passes=8,
        label='midline_seam_face',
        centroid_only_band=True,
    )
    fill_skin_patch_holes_bmesh(
        obj,
        sides=48,
        y_min=0.15,
        y_max=1.05,
        min_abs_x=0.0,
        max_abs_x=0.045,
        z_min=-0.22,
        z_max=0.14,
        exclude_sagittal_plane=False,
        max_passes=10,
        label='midline_seam_torso',
        centroid_only_band=True,
        max_loop_diameter=0.06,
    )
    fill_skin_patch_holes_bmesh(
        obj,
        sides=8,
        y_min=0.15,
        y_max=1.82,
        min_abs_x=0.0,
        max_abs_x=0.035,
        z_min=-0.45,
        z_max=0.18,
        exclude_sagittal_plane=False,
        max_passes=12,
        label='midline_seam_micro',
        centroid_only_band=True,
        max_loop_diameter=0.025,
    )


def weld_skin_midline_seam_band(obj) -> None:
    """Merge sagittal-adjacent vertices on torso only — avoid face/ear shrinkage."""
    weld_skin_mesh_spatial_band(
        obj,
        merge_dist=0.003,
        y_min=0.15,
        y_max=1.02,
        min_abs_x=0.0,
        max_abs_x=0.010,
        z_min=-0.22,
        z_max=0.14,
    )


def fill_skin_perioral_holes(obj) -> None:
    """Lip commissures and perioral patch gaps."""
    fill_skin_patch_holes_bmesh(
        obj,
        sides=40,
        y_min=1.3,
        y_max=1.54,
        min_abs_x=0.012,
        max_abs_x=0.14,
        z_min=0.0,
        z_max=0.14,
        exclude_sagittal_plane=False,
        max_passes=4,
        label='perioral',
    )


def fill_skin_abdomen_holes(obj) -> None:
    """Umbilicus / epigastrium midline gaps."""
    fill_skin_patch_holes_bmesh(
        obj,
        sides=36,
        y_min=0.84,
        y_max=1.08,
        min_abs_x=0.0,
        max_abs_x=0.1,
        z_min=-0.02,
        z_max=0.12,
        exclude_sagittal_plane=False,
        max_passes=4,
        label='abdomen',
    )


def fill_skin_palm_wrist_holes(obj) -> None:
    """Palmar / wrist skin patch gaps on the study half."""
    fill_skin_patch_holes_bmesh(
        obj,
        sides=80,
        y_min=0.42,
        y_max=1.02,
        min_abs_x=0.06,
        max_abs_x=0.36,
        z_min=-0.18,
        z_max=0.16,
        max_passes=8,
        label='palm_wrist',
        centroid_only_band=True,
        max_loop_diameter=0.095,
    )


def fill_skin_palm_center_holes(obj) -> None:
    """Central palm / thenar / hypothenar pinholes (visible on study transparent shell)."""
    # Blender boundary loops are much longer than runtime GLB loops after decimate/export.
    for pass_idx in range(3):
        filled = force_fill_largest_interior_loop(
            obj,
            y_min=0.84,
            y_max=0.98,
            min_abs_x=0.18,
            max_abs_x=0.32,
            z_min=-0.06,
            z_max=0.06,
            min_edges=42,
            max_edges=52,
            label=f'palm_void_blender_{pass_idx}',
            filter_centroid=True,
        )
        if not filled:
            break
    for pass_idx in range(8):
        filled = force_fill_largest_interior_loop(
            obj,
            y_min=0.84,
            y_max=0.98,
            min_abs_x=0.18,
            max_abs_x=0.32,
            z_min=-0.06,
            z_max=0.06,
            min_edges=14,
            max_edges=22,
            label=f'palm_center_void_{pass_idx}',
            filter_centroid=True,
        )
        if not filled:
            break
    fill_skin_patch_holes_bmesh(
        obj,
        sides=48,
        y_min=0.84,
        y_max=0.98,
        min_abs_x=0.14,
        max_abs_x=0.30,
        z_min=-0.08,
        z_max=0.10,
        max_passes=12,
        label='palm_center',
        centroid_only_band=False,
        max_loop_diameter=0.22,
    )
    fill_skin_patch_holes_bmesh(
        obj,
        sides=12,
        y_min=0.84,
        y_max=0.98,
        min_abs_x=0.14,
        max_abs_x=0.30,
        z_min=-0.08,
        z_max=0.10,
        max_passes=6,
        label='palm_center_micro',
        centroid_only_band=True,
        max_loop_diameter=0.035,
    )


def fill_skin_upper_arm_holes(obj) -> None:
    """Lateral anterior upper arm — biceps / deltoid junction gaps."""
    force_fill_largest_interior_loop(
        obj,
        y_min=1.05,
        y_max=1.35,
        min_abs_x=0.12,
        max_abs_x=0.28,
        z_min=-0.12,
        z_max=0.06,
        min_edges=58,
        max_edges=64,
        label='upper_arm_shear',
        filter_centroid=False,
    )
    fill_skin_patch_holes_bmesh(
        obj,
        sides=64,
        y_min=1.05,
        y_max=1.35,
        min_abs_x=0.12,
        max_abs_x=0.28,
        z_min=-0.12,
        z_max=0.06,
        max_passes=8,
        label='upper_arm',
        centroid_only_band=True,
        max_loop_diameter=0.14,
    )
    fill_skin_patch_holes_bmesh(
        obj,
        sides=180,
        y_min=1.08,
        y_max=1.32,
        min_abs_x=0.14,
        max_abs_x=0.26,
        z_min=-0.10,
        z_max=0.04,
        max_passes=4,
        label='upper_arm_large',
        centroid_only_band=False,
        max_loop_diameter=0.22,
    )
    force_fill_largest_interior_loop(
        obj,
        y_min=1.05,
        y_max=1.35,
        min_abs_x=0.12,
        max_abs_x=0.28,
        z_min=-0.12,
        z_max=0.06,
        min_edges=8,
        max_edges=120,
        label='upper_arm_force',
    )
    force_fill_largest_interior_loop(
        obj,
        y_min=1.05,
        y_max=1.35,
        min_abs_x=0.12,
        max_abs_x=0.28,
        z_min=-0.12,
        z_max=0.06,
        min_edges=58,
        max_edges=62,
        label='upper_arm_shear_b',
        filter_centroid=False,
    )


def weld_skin_upper_arm_junction(obj) -> None:
    """Merge arm skin with delt / pectoral cape at the long-head biceps band."""
    weld_skin_mesh_spatial_band(
        obj,
        merge_dist=0.0065,
        y_min=1.08,
        y_max=1.32,
        min_abs_x=0.12,
        max_abs_x=0.28,
        z_min=-0.12,
        z_max=0.06,
    )


def weld_skin_palm_shell_band(obj) -> None:
    """Join palm, digits, and forearm skin islands before hole fill."""
    weld_skin_mesh_spatial_band(
        obj,
        merge_dist=0.0055,
        y_min=0.82,
        y_max=1.02,
        min_abs_x=0.08,
        max_abs_x=0.32,
        z_min=-0.14,
        z_max=0.14,
    )


def finalize_skin_ear_shell(obj) -> None:
    """Join Z-Anatomy auricular overlay — sits on ear backing in skin_head_neck."""
    ensure_mesh_single_user(obj)
    weld_skin_mesh(obj, merge_dist=0.0012)
    weld_skin_mesh_spatial_band(
        obj,
        merge_dist=0.0035,
        y_min=1.44,
        y_max=1.68,
        min_abs_x=0.04,
        max_abs_x=0.16,
        z_min=-0.14,
        z_max=0.10,
    )
    # Helix / tragus root — pull overlay toward head backing collar.
    weld_skin_mesh_spatial_band(
        obj,
        merge_dist=0.0045,
        y_min=1.48,
        y_max=1.62,
        min_abs_x=0.05,
        max_abs_x=0.11,
        z_min=-0.06,
        z_max=0.06,
    )
    fill_skin_patch_holes_bmesh(
        obj,
        sides=32,
        y_min=1.44,
        y_max=1.72,
        min_abs_x=0.04,
        max_abs_x=0.14,
        z_min=-0.12,
        z_max=0.08,
        max_passes=6,
        label='skin_ear_pinhole',
        centroid_only_band=True,
        max_loop_diameter=0.045,
    )
    fill_skin_patch_holes_bmesh(
        obj,
        sides=180,
        y_min=1.44,
        y_max=1.72,
        min_abs_x=0.04,
        max_abs_x=0.14,
        z_min=-0.12,
        z_max=0.08,
        max_passes=4,
        label='skin_ear',
        centroid_only_band=False,
        max_loop_diameter=0.18,
    )
    shade_smooth_mesh(obj)


def fill_skin_back_trap_holes(obj) -> None:
    """Posterior trap / scapular dot gaps."""
    fill_skin_patch_holes_bmesh(
        obj,
        sides=20,
        y_min=1.28,
        y_max=1.62,
        min_abs_x=0.055,
        max_abs_x=0.26,
        z_min=-0.42,
        z_max=-0.02,
        label='back_trap',
    )


def weld_skin_palm_visible_hole_bands(obj) -> None:
    """Merge vertices around visible palmar pinholes after fill passes."""
    weld_skin_mesh_spatial_band(
        obj,
        merge_dist=0.006,
        y_min=0.82,
        y_max=0.98,
        min_abs_x=0.18,
        max_abs_x=0.30,
        z_min=-0.05,
        z_max=0.08,
    )


def weld_skin_hand_forearm_junction(obj) -> None:
    """Merge palm / digit patch vertices across wrist seam gaps."""
    weld_skin_mesh_spatial_band(
        obj,
        merge_dist=0.008,
        y_min=0.78,
        y_max=1.05,
        min_abs_x=0.08,
        max_abs_x=0.32,
        z_min=-0.14,
        z_max=0.14,
    )


def weld_skin_ear_junction(obj) -> None:
    """Weld pinna root onto head backing — narrow band only (preserve helix detail)."""
    weld_skin_mesh_spatial_band(
        obj,
        merge_dist=0.0035,
        y_min=1.50,
        y_max=1.62,
        min_abs_x=0.06,
        max_abs_x=0.11,
        z_min=-0.08,
        z_max=0.05,
    )


def join_ear_overlay_to_envelope(unified, ear_obj) -> object:
    """Merge skin_ear into skin_envelope in Blender — one watertight shell at the pinna junction."""
    ensure_mesh_single_user(unified)
    ensure_mesh_single_user(ear_obj)
    joined = join_meshes([unified, ear_obj])
    if joined is None:
        raise RuntimeError('Failed to join skin_ear overlay onto skin_envelope')
    joined.name = 'skin_envelope'
    joined['nodeId'] = 'skin_envelope'
    ensure_mesh_single_user(joined)
    weld_skin_ear_junction(joined)
    fill_skin_patch_holes_bmesh(
        joined,
        sides=24,
        y_min=1.50,
        y_max=1.62,
        min_abs_x=0.06,
        max_abs_x=0.11,
        z_min=-0.06,
        z_max=0.05,
        max_passes=3,
        label='ear_junction',
        centroid_only_band=True,
        max_loop_diameter=0.035,
    )
    fill_skin_patch_holes_bmesh(
        joined,
        sides=64,
        y_min=1.44,
        y_max=1.68,
        min_abs_x=0.05,
        max_abs_x=0.14,
        z_min=-0.10,
        z_max=0.08,
        max_passes=6,
        label='ear_shell',
        centroid_only_band=False,
        max_loop_diameter=0.08,
    )
    shade_smooth_mesh(joined)
    return joined


def stitch_skin_component_gaps(obj) -> None:
    """Merge nearby vertices between disjoint skin islands (GLB multi-primitive seam gaps)."""
    weld_skin_mesh_spatial_band(
        obj,
        merge_dist=0.008,
        y_min=1.12,
        y_max=1.32,
        min_abs_x=0.14,
        max_abs_x=0.26,
        z_min=-0.10,
        z_max=0.04,
    )
    weld_skin_mesh_spatial_band(
        obj,
        merge_dist=0.012,
        y_min=0.86,
        y_max=0.96,
        min_abs_x=0.20,
        max_abs_x=0.32,
        z_min=-0.06,
        z_max=0.08,
    )


def purge_skin_micro_islands(obj, min_face_count: int = 48) -> None:
    """Drop tiny disconnected skin fragments before GLB export (avoids extra glTF primitives)."""
    if obj.type != 'MESH' or not obj.data.polygons:
        return

    import bmesh

    ensure_mesh_single_user(obj)
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    bm.faces.ensure_lookup_table()

    visited: set[int] = set()
    remove_faces = []
    for face in bm.faces:
        if face.index in visited:
            continue
        stack = [face]
        island = []
        while stack:
            current = stack.pop()
            if current.index in visited:
                continue
            visited.add(current.index)
            island.append(current)
            for edge in current.edges:
                for linked in edge.link_faces:
                    if linked.index not in visited:
                        stack.append(linked)
        if len(island) < min_face_count:
            remove_faces.extend(island)

    if remove_faces:
        bmesh.ops.delete(bm, geom=remove_faces, context='FACES')
        bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.0001)
        bm.to_mesh(obj.data)
        obj.data.update()
        print(f'    purge micro islands: removed {len(remove_faces)} faces (<{min_face_count} tris each)')
    bm.free()


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
            seam_weld = 0.0015 if mesh_id == 'skin_head_neck' else 0.00075
            weld_skin_mesh(merged, merge_dist=seam_weld)
        elif mesh_id == 'eye_globes':
            shade_smooth_mesh(merged)
        cap = per_mesh_cap.get(mesh_id, max_tris)
        if mesh_id == 'skin_envelope':
            # Decimate after unified join — pre-decimate misaligns head_neck ↔ body at platysma.
            pass
        elif mesh_id == 'skin_head_neck':
            # Keep head/neck/shoulder cape detail until unified weld with body + back.
            pass
        elif mesh_id == 'skin_ear':
            finalize_skin_ear_shell(merged)
        elif mesh_id == 'skin_back':
            pass
        elif mesh_id == 'skin_hand_digits':
            weld_skin_palm_shell_band(merged)
        elif mesh_id == 'skin_foot_digits':
            pass
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

    skin_parts = [obj for mesh_id, obj, _ in exported if mesh_id not in SKIN_OVERLAY_MESH_IDS]
    overlay_entries = [(mesh_id, obj, tri) for mesh_id, obj, tri in exported if mesh_id in SKIN_OVERLAY_MESH_IDS]

    if not skin_parts:
        raise RuntimeError('No skin body meshes exported for atlas_skin')

    cape_ids = {'skin_head_neck', 'skin_back'}
    cape_parts = [obj for mesh_id, obj, _ in exported if mesh_id in cape_ids]
    other_parts = [
        obj
        for mesh_id, obj, _ in exported
        if mesh_id not in cape_ids and mesh_id not in SKIN_OVERLAY_MESH_IDS
    ]
    if len(cape_parts) > 1:
        cape = join_meshes(cape_parts)
        if cape is None:
            raise RuntimeError('Failed to join atlas_skin head/neck/back cape')
        cape.name = 'skin_cape'
        ensure_mesh_single_user(cape)
        weld_skin_mesh(cape, merge_dist=0.0025)
        skin_parts = [cape, *other_parts]
    elif len(cape_parts) == 1:
        skin_parts = [*cape_parts, *other_parts]

    unified = join_meshes(skin_parts) if len(skin_parts) > 1 else skin_parts[0]
    if unified is None:
        raise RuntimeError('Failed to join atlas_skin body meshes')

    unified.name = 'skin_envelope'
    unified['nodeId'] = 'skin_envelope'
    ensure_mesh_single_user(unified)
    weld_skin_mesh(unified, merge_dist=0.0025)
    weld_skin_problem_bands(unified)
    unified_cap = min(max_region_tris - sum(tri for _, _, tri in overlay_entries), 88_000)
    apply_decimate_to_target(unified, max(unified_cap, 40_000))
    bake_mesh_world_transform(unified)
    fill_skin_neck_shoulder_holes(unified)
    fill_skin_upper_arm_holes(unified)
    weld_skin_upper_arm_junction(unified)
    stitch_skin_component_gaps(unified)
    fill_skin_upper_arm_holes(unified)
    fill_skin_throat_holes(unified)
    weld_skin_throat_midline_band(unified)
    fill_skin_throat_holes(unified)
    fill_skin_midline_seam_holes(unified)
    weld_skin_midline_seam_band(unified)
    fill_skin_perioral_holes(unified)
    fill_skin_abdomen_holes(unified)
    weld_skin_hand_forearm_junction(unified)
    weld_skin_palm_shell_band(unified)
    fill_skin_palm_wrist_holes(unified)
    fill_skin_palm_center_holes(unified)
    weld_skin_palm_visible_hole_bands(unified)
    stitch_skin_component_gaps(unified)
    fill_skin_palm_center_holes(unified)
    fill_skin_back_trap_holes(unified)
    purge_skin_micro_islands(unified)

    ear_entry = next((entry for entry in overlay_entries if entry[0] == 'skin_ear'), None)
    overlay_entries = [entry for entry in overlay_entries if entry[0] != 'skin_ear']
    if ear_entry is not None:
        _, ear_obj, _ = ear_entry
        unified = join_ear_overlay_to_envelope(unified, ear_obj)
        print(f'  atlas_skin joined skin_ear overlay -> skin_envelope ({len(unified.data.polygons)} tris)')
        weld_skin_mesh_spatial_band(
            unified,
            merge_dist=0.003,
            y_min=1.44,
            y_max=1.68,
            min_abs_x=0.04,
            max_abs_x=0.16,
            z_min=-0.12,
            z_max=0.10,
        )

    for pass_idx in range(6):
        filled = force_fill_largest_interior_loop(
            unified,
            y_min=0.84,
            y_max=0.98,
            min_abs_x=0.14,
            max_abs_x=0.32,
            z_min=-0.12,
            z_max=0.14,
            min_edges=14,
            max_edges=28,
            label=f'palm_post_ear_{pass_idx}',
            filter_centroid=True,
        )
        if not filled:
            break
    fill_skin_patch_holes_bmesh(
        unified,
        sides=32,
        y_min=0.84,
        y_max=0.98,
        min_abs_x=0.14,
        max_abs_x=0.32,
        z_min=-0.12,
        z_max=0.14,
        max_passes=10,
        label='palm_post_ear_fill',
        centroid_only_band=False,
        max_loop_diameter=0.28,
    )

    unified_tris = len(unified.data.polygons)
    print(f'  atlas_skin unified skin_envelope: {len(skin_parts)} parts -> {unified_tris} tris')
    exported = [('skin_envelope', unified, unified_tris), *overlay_entries]

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


def _is_skinish_mesh_name(name: str) -> bool:
    lower = name.lower()
    return (
        ' region' in lower
        or 'skin' in lower
        or 'helix' in lower
        or 'antihelix' in lower
        or 'auricular' in lower
        or lower.startswith('skin_')
        or 'triangle' in lower
        or name.startswith('Skin_')
    )


def audit_skin_source_inventory() -> dict:
    """Compare Z-Anatomy skin surfaces against atlas_skin export predicates."""
    included: list[dict] = []
    excluded: list[dict] = []
    for obj in bpy.data.objects:
        if obj.type != 'MESH' or obj.name.endswith('.l'):
            continue
        if not _is_skinish_mesh_name(obj.name):
            continue
        if _is_forbidden_mesh_name(obj.name):
            continue
        tri_count = len(obj.data.polygons)
        degenerate = _is_degenerate_atlas_mesh(obj)
        groups = []
        if _is_skin_ear_patch(obj):
            groups.append('skin_ear')
        if _is_skin_head_neck_patch(obj):
            groups.append('skin_head_neck')
        if _is_skin_back_torso_patch(obj):
            groups.append('skin_back')
        if _is_skin_limb_detail_patch(obj):
            groups.append('skin_limbs')
        if _is_skin_hand_detail_patch(obj):
            groups.append('skin_hand_digits')
        if _is_skin_foot_detail_patch(obj):
            groups.append('skin_foot_digits')
        if _is_skin_body_envelope_patch(obj):
            groups.append('skin_envelope')
        if _is_eye_globe_patch(obj):
            groups.append('eye_globes')
        if not groups and _is_any_skin_patch(obj):
            groups.append('unassigned_any_skin')
        export_groups = [g for g in groups if g != 'unassigned_any_skin']
        entry = {'name': obj.name, 'triangles': tri_count, 'degenerate': degenerate, 'groups': export_groups or groups}
        if export_groups:
            included.append(entry)
        elif not degenerate:
            excluded.append(entry)
    included.sort(key=lambda row: row['name'])
    excluded.sort(key=lambda row: -row['triangles'])
    return {
        'includedCount': len(included),
        'excludedCount': len(excluded),
        'excludedTriangles': sum(row['triangles'] for row in excluded),
        'excluded': excluded[:80],
    }


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
        'skinSourceInventory': audit_skin_source_inventory(),
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
    skin_gap = payload['skinSourceInventory']
    print(
        f'Skin source: {skin_gap["includedCount"]} patches in export predicates, '
        f'{skin_gap["excludedCount"]} non-degenerate excluded ({skin_gap["excludedTriangles"]} tris)',
    )
    if skin_gap['excludedCount']:
        for row in skin_gap['excluded'][:8]:
            print(f'  • {row["name"]} ({row["triangles"]} tris)')
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
