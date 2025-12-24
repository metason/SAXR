# #### 3D File Creation from Data Reps ####
# Create data vizualisation for XR

# TODOS
# - create collection tree
# - test usdz
# - 

import os
import sys
import math
import json
import matplotlib.colors as mcolors
from matplotlib import colormaps
import bpy

folder = os.getcwd()
inputFile = "viz.json" # a list of scenes containing an array of DataRep objects
outputFile = "viz.blend"
format_name = "blend" # default format
data_stage = None
data_scenes = None
data_scene = None

if len(sys.argv) > 1:
    folder_name = sys.argv[1]
    print(folder_name)
    if folder_name.startswith('/'):
        folder = folder_name
    else:
        folder = os.path.join(folder, folder_name)
print(folder)
if len(sys.argv) > 2:
    format_name = sys.argv[2]
    if format_name == "usdz":
        outputFile = "viz.usdz"
    elif format_name == "usdc":
        outputFile = "viz.usdc"
    elif format_name == "gltf":
        outputFile = "viz.gltf"
    elif format_name == "glb":
        outputFile = "viz.glb"
    elif format_name == "fbx":
        outputFile = "viz.fbx"

def kv2dict(str):
    # Convert key-value string to dictionary 
    res = {}
    for sub in str.split(';'):
        if ':' in sub:
            kv = sub.split(':')
            key = kv[0].strip()
            val = kv[1].strip()
            res[key] = val
    return res

def getMaterial(color):
    for mat in bpy.data.materials:
        if mat.name == color:
            return mat
    material = bpy.data.materials.new(name=color)
    material.use_nodes = True
    principled_bsdf_node = material.node_tree.nodes["Principled BSDF"]
    rgba = mcolors.to_rgba(color)
    principled_bsdf_node.inputs["Base Color"].default_value = rgba
    principled_bsdf_node.inputs["Metallic"].default_value = 0.2
    principled_bsdf_node.inputs["Roughness"].default_value = 1.0
    return material

def cleanScene():
    """Remove all objects from the scene."""
    bpy.ops.object.select_all(action='DESELECT')
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete()

def saveFile():
    output_path = os.path.join(folder, outputFile)
    print(output_path)
    if format_name == "blend":
        bpy.ops.wm.save_as_mainfile(filepath=output_path, check_existing=False)
    elif format_name == "usdc" or format_name == "usdz":
        bpy.ops.wm.usd_export(filepath=output_path, check_existing=False)
    elif format_name == "fbx":
        bpy.ops.export_scene.fbx(filepath=output_path, check_existing=False)
    elif format_name == "gltf":
        bpy.ops.export_scene.gltf(filepath=output_path, check_existing=False, export_format='')
    elif format_name == "glb":
        bpy.ops.export_scene.gltf(filepath=output_path, check_existing=False, export_format='GLB')
        
def createDataStage():
    global data_stage
    global data_scenes
    global data_scene
    print(bpy.app.version_string)
    cleanScene()
    for ob in bpy.context.scene.objects:
        print(ob)
    bpy.ops.object.select_all(action="DESELECT") 
    data_stage = bpy.context.scene.collection.children[0]
    data_stage.name = "Data_Stage"
    data_scenes = bpy.data.collections.new("Data_Scenes")
    data_stage.children.link(data_scenes)
    data_scene = bpy.data.collections.new("Scene")
    data_scenes.children.link(data_scene)
    
def createPanel(rep):
    ptype = rep['type'].lower()
    rotx = math.pi / 2.0
    roty = 0.0
    if rep['h'] > rep['d']:
        dim = (rep['w'], rep['h'], 0.0)
    else:
        dim = (rep['w'], rep['d'], 0.0)
        rotx = 0.0
    pos= (rep['x'], -rep['z'], rep['y'] + rep['h']/2.0)
    if ptype.startswith("-xy"):
        roty = math.pi
    if ptype.startswith("-zy"):
        roty = math.pi / 2.0
    if ptype.startswith("zy"):
        roty = -math.pi / 2.0
    if ptype.startswith("xz"):
        rotx = 0.0
    if ptype.startswith("l") and '=' in ptype:
        rotx = 0.0
    bpy.ops.mesh.primitive_plane_add(size=1.0, location=pos, rotation=(rotx,0.0,roty))
    plane = bpy.context.active_object
    plane.data.name = plane.name = ptype
    plane.dimensions = dim
    imgFile = os.path.join(folder, os.path.basename(rep['asset']))
    img = bpy.data.images.load(imgFile)
    mat = bpy.data.materials.new(ptype)
    mat.use_nodes = True
    mat.use_backface_culling = True
    mat.blend_method = 'CLIP'
    node_tex = mat.node_tree.nodes.new("ShaderNodeTexImage")
    node_tex.image = img
    # --- link nodes in shading graph ---
    links = mat.node_tree.links
    link = links.new(node_tex.outputs[0], mat.node_tree.nodes[0].inputs["Base Color"])
    link2 = links.new(node_tex.outputs[1], mat.node_tree.nodes[0].inputs["Alpha"])
    bpy.context.active_object.data.materials.append(mat)
    if ptype == rep['type']: # lowercased
        data_stage.objects.unlink(plane)
        data_scene.objects.link(plane)

def setupDataRepItem(rep):
    obj = bpy.context.active_object
    obj.name = "DataRep." + rep['type']
    obj.data.materials.append(getMaterial(rep['color']))
    data_stage.objects.unlink(obj)
    data_scene.objects.link(obj)
    
def createDataRep(rep):
    # "box", "sphere", "pyramid", "pyramid_down", "octahedron", "plane", "arc", "cylinder", "plus", "cross", "text"
    if rep['type'] == 'sphere':
        bpy.ops.mesh.primitive_ico_sphere_add(radius=0.5, subdivisions=3, location=(rep['x'], -rep['z'], rep['y']), scale=(rep['w'], rep['d'], rep['h']))
        bpy.ops.object.shade_smooth()
        setupDataRepItem(rep)    
    elif rep['type'] == 'box':
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=(rep['x'], -rep['z'], rep['y']), scale=(rep['w'], rep['d'], rep['h']))
        setupDataRepItem(rep)
    elif rep['type'] == 'cylinder':
        bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.5, depth=1.0, location=(rep['x'], -rep['z'], rep['y']), scale=(rep['w'], rep['d'], rep['h']))
        bpy.ops.object.shade_smooth()
        setupDataRepItem(rep)
    elif rep['type'] == 'pyramid':
        bpy.ops.mesh.primitive_cone_add(vertices=4, radius1=0.5, depth=1.0, location=(rep['x'], -rep['z'], rep['y']), scale=(rep['w'], rep['d'], rep['h']))
        setupDataRepItem(rep)
    elif rep['type'] == 'pyramid_down':
        bpy.ops.mesh.primitive_cone_add(vertices=4, radius1=0.5, depth=1.0, location=(rep['x'], -rep['z'], rep['y']), scale=(rep['w'], rep['d'], rep['h']), rotation=(math.pi,0,0))
        setupDataRepItem(rep)
    elif rep['type'] == 'octahedron':
        bpy.ops.mesh.primitive_cone_add(vertices=4, radius1=0.5, depth=0.5, location=(rep['x'], -rep['z'], rep['y']+(rep['h']/4.0)), scale=(rep['w'], rep['d'], rep['h']))
        upper = bpy.context.active_object
        bpy.ops.mesh.primitive_cone_add(vertices=4, radius1=0.5, depth=0.5, location=(rep['x'], -rep['z'], rep['y']-(rep['h']/4.0)), scale=(rep['w'], rep['d'], rep['h']), rotation=(math.pi,0,0))
        lower = bpy.context.active_object
        upper.select_set(True)
        lower.select_set(True)
        bpy.ops.object.join()
        setupDataRepItem(rep)
    elif rep['type'] == 'plus':
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=(rep['x'], -rep['z'], rep['y']), scale=(rep['w'], rep['d']*0.2, rep['h']*0.2))
        obj1 = bpy.context.active_object
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=(rep['x'], -rep['z'], rep['y']), scale=(rep['w']*0.2, rep['d'], rep['h']*0.2))
        obj2 = bpy.context.active_object
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=(rep['x'], -rep['z'], rep['y']), scale=(rep['w']*0.2, rep['d']*0.2, rep['h']))
        obj3 = bpy.context.active_object
        obj1.select_set(True)
        obj2.select_set(True)
        obj3.select_set(True)
        bpy.ops.object.join()
        setupDataRepItem(rep)
    elif rep['type'] == 'cross':
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=(rep['x'], -rep['z'], rep['y']), scale=(rep['w'], rep['d']*0.15, rep['h']*0.15))
        obj1 = bpy.context.active_object
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=(rep['x'], -rep['z'], rep['y']), scale=(rep['w']*0.15, rep['d'], rep['h']*0.15))
        obj2 = bpy.context.active_object
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=(rep['x'], -rep['z'], rep['y']), scale=(rep['w']*0.15, rep['d']*0.15, rep['h']))
        obj3 = bpy.context.active_object
        obj1.select_set(True)
        obj2.select_set(True)
        obj3.select_set(True)
        bpy.ops.object.join()
        bpy.context.active_object.rotation_euler = (math.pi/6.0, math.pi/5.0, math.pi/4.0)
        setupDataRepItem(rep)
    elif rep['type'] == 'arc':
        kvs = kv2dict(rep['asset'])
        rotx = math.pi / 2.0
        w = rep['w'] / 2.0 * float(kvs['ratio'])
        shift = (rep['w'] / 4.0) * (1.0 + float(kvs['ratio']))
        dim = (w, rep['h'], 0.0)
        bpy.ops.mesh.primitive_plane_add(size=1.0, location=(shift, 0.0, rep['h']/2.0), rotation=(rotx,0.0,0.0))
        plane = bpy.context.active_object
        plane.dimensions = dim
        pivot = (0.0, 0.0, 0.0)
        rot_start = -float(kvs['start']) * math.pi / 180.0
        bpy.ops.transform.rotate(value=rot_start, center_override=pivot)
        bpy.ops.object.mode_set(mode = 'EDIT')
        rot_angle = -float(kvs['angle']) * math.pi / 180.0
        bpy.ops.mesh.spin(steps=32, angle=rot_angle, center=(0,0,0), axis=(0,0,1))
        bpy.ops.object.mode_set(mode = 'OBJECT')
        arc = bpy.context.active_object
        arc.data.name = plane.name = rep['type']
        setupDataRepItem(rep)
    elif rep['type'] == 'plane':
        rotx = math.pi / 2.0
        roty = 0.0
        rotz = 0.0
        if rep['h'] > rep['d']:
            dim = (rep['w'], rep['h'], 0.0)
        else:
            dim = (rep['w'], rep['d'], 0.0)
            rotx = 0.0
        pos= (rep['x'], -rep['z'], rep['y'] + rep['h']/2.0)
        bpy.ops.mesh.primitive_plane_add(size=1.0, location=pos, rotation=(rotx,0.0,roty))
        plane = bpy.context.active_object
        plane.data.name = plane.name = rep['type']
        plane.dimensions = dim
        setupDataRepItem(rep)
    elif rep['type'] == 'text':
        bpy.ops.object.text_add()
        obj=bpy.context.object
        obj.data.body = rep['asset']
        obj.select_set(True)
        bpy.ops.object.convert(target='MESH')
        w = obj.dimensions[0]
        h = obj.dimensions[1]
        roty = 0.0
        rotz = 0.0
        if rep['h'] > rep['d']:
            factor = 1.7 * rep['h'] / h
            rotx = math.pi / 2.0
            pos= (rep['x'] - w*factor/2.0, -rep['z'], rep['y'])
        else:
            factor = 1.7 * rep['d'] / h
            rotx = 0.0
            pos= (rep['x'] - w*factor/2.0, -rep['z'] - h*factor/2.0, rep['y'])
        obj.rotation_euler = (rotx, roty, rotz)
        obj.location = pos
        obj.scale = (factor, factor, factor)
        setupDataRepItem(rep)
    elif rep['type'] == 'encoding':
        print("encoding")
        print(rep['asset'])
    else:
        createPanel(rep)
    bpy.ops.object.select_all(action="DESELECT") 

def execute(datareps):
    # process data
    reps = datareps[0] # get first scene
    for rep in reps:
        createDataRep(rep)
        

# ---- main ----
try:
    with open(os.path.join(folder, inputFile), 'r') as data:
        createDataStage()
        execute(json.load(data))
        saveFile()
except FileNotFoundError:
    print("Usage: python export3D.py <folder> <format>")
    print("Folder needs to contain a <viz.json> file created by datarepgen.py.")
    print("Supported output formats: usdz, usdc, gltf, glb, fbx, blend.")
    print(folder)
    sys.exit(1)