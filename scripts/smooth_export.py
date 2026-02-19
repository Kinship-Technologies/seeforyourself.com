"""
Blender headless script: import talis.glb, apply smooth shading + normals, re-export with Draco.
"""
import bpy
import os

PROJECT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INPUT = os.path.join(PROJECT, "public", "models", "talis.glb")
OUTPUT = os.path.join(PROJECT, "public", "models", "talis_smooth.glb")

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=INPUT)

for obj in bpy.data.objects:
    if obj.type != 'MESH':
        continue
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.shade_smooth()
    try:
        obj.data.use_auto_smooth = True
        obj.data.auto_smooth_angle = 1.2217
    except AttributeError:
        pass
    obj.select_set(False)

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
print(f"Done. Exported: {OUTPUT}")
