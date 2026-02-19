"""
Blender headless script: import talis.glb, apply smooth shading + normals, re-export with Draco.
Run with: /Applications/Blender.app/Contents/MacOS/Blender --background --python scripts/smooth_export.py
"""
import bpy
import os

PROJECT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INPUT = os.path.join(PROJECT, "public", "models", "talis.glb")
OUTPUT = os.path.join(PROJECT, "public", "models", "talis_smooth.glb")

# ── Clean default scene ──
bpy.ops.wm.read_factory_settings(use_empty=True)

# ── Import GLB ──
bpy.ops.import_scene.gltf(filepath=INPUT)

print(f"Imported: {INPUT}")
print(f"Objects: {[o.name for o in bpy.data.objects]}")

for obj in bpy.data.objects:
    if obj.type != 'MESH':
        continue

    print(f"\nProcessing: {obj.name}")
    print(f"  Verts: {len(obj.data.vertices)}")
    print(f"  Faces: {len(obj.data.polygons)}")

    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)

    # Shade smooth — this tells Blender to interpolate normals across faces
    bpy.ops.object.shade_smooth()

    # Auto-smooth: sharp edges above threshold stay sharp, rest is smooth
    try:
        obj.data.use_auto_smooth = True
        obj.data.auto_smooth_angle = 1.2217  # 70 degrees
    except AttributeError:
        pass  # Blender 4.1+ auto-handles this

    obj.select_set(False)

# ── Export GLB with smooth normals + Draco compression ──
bpy.ops.export_scene.gltf(
    filepath=OUTPUT,
    export_format='GLB',
    export_normals=True,
    export_tangents=False,
    export_materials='NONE',
    export_cameras=False,
    export_lights=False,
    export_apply=True,
    export_draco_mesh_compression_enable=True,
    export_draco_mesh_compression_level=6,
    export_draco_position_quantization=14,
    export_draco_normal_quantization=10,
)

print(f"\nExported: {OUTPUT}")

# Verify
import struct
with open(OUTPUT, 'rb') as f:
    data = f.read()
size_mb = len(data) / (1024 * 1024)
print(f"File size: {size_mb:.1f} MB")
print("Done.")
