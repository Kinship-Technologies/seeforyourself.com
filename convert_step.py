import cadquery as cq
import trimesh
import numpy as np
from OCP.StlAPI import StlAPI_Writer
from OCP.BRepMesh import BRepMesh_IncrementalMesh
import tempfile, os

# Load the STEP file
result = cq.importers.importStep("/Users/hanaazab/Desktop/CAMERA.STEP")

# Fine tessellation
shape = result.val()
mesh_occ = BRepMesh_IncrementalMesh(shape.wrapped, 0.01, False, 0.1, True)
mesh_occ.Perform()

stl_path = tempfile.mktemp(suffix=".stl")
writer = StlAPI_Writer()
writer.Write(shape.wrapped, stl_path)

# Load
mesh = trimesh.load(stl_path, force='mesh')
mesh.fix_normals()
print(f"Total: {len(mesh.vertices)} verts, {len(mesh.faces)} faces")

# Split into body and lens barrel based on vertex Z position
# Lens barrel: faces where ALL vertices have Z < -20
verts = mesh.vertices
face_verts = verts[mesh.faces]  # (N, 3, 3)
face_z_max = face_verts[:, :, 2].max(axis=1)

lens_mask = face_z_max < -20
body_mask = ~lens_mask

print(f"Body faces: {body_mask.sum()}, Lens barrel faces: {lens_mask.sum()}")

# Create separate meshes
body_mesh = mesh.submesh([np.where(body_mask)[0]], append=True)
lens_mesh = mesh.submesh([np.where(lens_mask)[0]], append=True)

# Build a scene with named meshes
scene = trimesh.Scene()
scene.add_geometry(body_mesh, node_name='body', geom_name='body')
scene.add_geometry(lens_mesh, node_name='lens_barrel', geom_name='lens_barrel')

out_path = "/Users/hanaazab/seeforyourself.com/public/models/talis.glb"
scene.export(out_path, file_type="glb")
print(f"GLB exported to {out_path}")
print(f"File size: {os.path.getsize(out_path) / 1024:.1f} KB")

os.remove(stl_path)
