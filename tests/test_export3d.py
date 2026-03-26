"""
Tests for export3D.py

Strategy:
  - Pure-Python helpers (kv2dict, __init__, CLI parsing) are tested directly.
  - bpy-dependent code uses a lightweight MagicMock injected into sys.modules
    *before* importing export3D.  We only smoke-test that each shape type
    dispatches correctly (calls _setup_data_rep_item), NOT every bpy kwarg.
  - Deep Blender integration should be validated with:
        blender --background --python test_export3D_integration.py

Usage:
    pytest tests/test_export3d.py -v
"""

import json
import math
import os
import sys
import types
import tempfile

import pytest
from unittest.mock import MagicMock, patch, call

# ── Inject a fake bpy module BEFORE importing export3D ────────────────────
# bpy is bundled inside Blender and cannot be pip-installed, so we create a
# thin MagicMock stand-in that satisfies all attribute access.

_bpy_mock = MagicMock(name="bpy")
_bpy_mock.app.version_string = "3.6.0-mock"
# Make bpy.data.materials iterable (empty by default)
_bpy_mock.data.materials.__iter__ = lambda self: iter([])
# scene.objects iterable
_bpy_mock.context.scene.objects.__iter__ = lambda self: iter([])

sys.modules.setdefault("bpy", _bpy_mock)

# Add SAXR-main/SAXR-main to path so export3D and saxr are importable
_SAXR_SRC = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                         "SAXR-main", "SAXR-main")
if _SAXR_SRC not in sys.path:
    sys.path.insert(0, _SAXR_SRC)

# Now safe to import ──────────────────────────────────────────────────────
from export3D import kv2dict, Exporter3D, main  # noqa: E402


# ═══════════════════════════════════════════════════════════════════════════
# 1.  Pure-Python: kv2dict
# ═══════════════════════════════════════════════════════════════════════════

class TestKv2Dict:
    """Tests for the kv2dict utility function."""

    def test_basic(self):
        result = kv2dict("angle:90;start:0;ratio:0.5")
        assert result == {"angle": "90", "start": "0", "ratio": "0.5"}

    def test_whitespace(self):
        result = kv2dict("  a : 1 ; b : 2 ")
        assert result == {"a": "1", "b": "2"}

    def test_empty_string(self):
        assert kv2dict("") == {}

    def test_single_pair(self):
        assert kv2dict("key:value") == {"key": "value"}

    def test_no_colon(self):
        """Segments without ':' are silently skipped."""
        assert kv2dict("novalue;a:1") == {"a": "1"}

    def test_extra_semicolons(self):
        result = kv2dict(";;a:1;;;b:2;;")
        assert result == {"a": "1", "b": "2"}


# ═══════════════════════════════════════════════════════════════════════════
# 2.  Pure-Python: Exporter3D.__init__
# ═══════════════════════════════════════════════════════════════════════════

class TestExporter3DInit:
    """Tests for Exporter3D constructor / format-to-filename mapping."""

    def test_default_format(self):
        exp = Exporter3D("/some/folder")
        assert exp.folder == "/some/folder"
        assert exp.format_name == "blend"
        assert exp.output_file == "viz.blend"
        assert exp.input_file == "datareps.json"

    @pytest.mark.parametrize("fmt, expected_file", [
        ("blend", "viz.blend"),
        ("usdz",  "viz.usdz"),
        ("usdc",  "viz.usdc"),
        ("gltf",  "viz.gltf"),
        ("glb",   "viz.glb"),
        ("fbx",   "viz.fbx"),
    ])
    def test_known_formats(self, fmt, expected_file):
        exp = Exporter3D("/tmp", fmt)
        assert exp.output_file == expected_file

    def test_unknown_format_falls_back(self):
        exp = Exporter3D("/tmp", "obj")
        assert exp.output_file == "viz.blend"  # fallback default

    def test_collections_start_none(self):
        exp = Exporter3D("/tmp")
        assert exp.data_stage is None
        assert exp.data_scenes is None
        assert exp.data_scene is None


# ═══════════════════════════════════════════════════════════════════════════
# 3.  Pure-Python: _execute picks first scene
# ═══════════════════════════════════════════════════════════════════════════

class TestExecute:
    """_execute should iterate the first scene's DataReps."""

    def test_calls_create_data_rep_for_each_item(self):
        exp = Exporter3D("/tmp")
        reps = [
            {"type": "encoding", "x": 0, "y": 0, "z": 0, "w": 1, "d": 1, "h": 0.25, "asset": "enc.json"},
            {"type": "sphere", "x": 0.1, "y": 0.2, "z": 0.3, "w": 0.02, "d": 0.02, "h": 0.02, "color": "red"},
        ]
        with patch.object(exp, "_create_data_rep") as mock_cdr:
            exp._execute([reps])
            assert mock_cdr.call_count == 2
            mock_cdr.assert_any_call(reps[0])
            mock_cdr.assert_any_call(reps[1])

    def test_only_first_scene_used(self):
        exp = Exporter3D("/tmp")
        scene1 = [{"type": "encoding", "x": 0, "y": 0, "z": 0, "w": 1, "d": 1, "h": 1, "asset": "a"}]
        scene2 = [{"type": "box", "x": 0, "y": 0, "z": 0, "w": 1, "d": 1, "h": 1, "color": "blue"}]
        with patch.object(exp, "_create_data_rep") as mock_cdr:
            exp._execute([scene1, scene2])
            assert mock_cdr.call_count == 1  # only scene1's single rep


# ═══════════════════════════════════════════════════════════════════════════
# 4.  Pure-Python: run() – file-not-found handling
# ═══════════════════════════════════════════════════════════════════════════

class TestRunFileNotFound:
    """run() should sys.exit(1) when datareps.json is missing."""

    def test_missing_viz_json_exits(self):
        with tempfile.TemporaryDirectory() as td:
            exp = Exporter3D(td)
            with pytest.raises(SystemExit) as exc_info:
                exp.run()
            assert exc_info.value.code == 1


# ═══════════════════════════════════════════════════════════════════════════
# 5.  Pure-Python: run() – happy path wiring
# ═══════════════════════════════════════════════════════════════════════════

class TestRunHappyPath:
    """run() should wire create_data_stage → _execute → _save_file."""

    def test_run_calls_pipeline(self):
        with tempfile.TemporaryDirectory() as td:
            viz = [[{"type": "encoding", "x": 0, "y": 0, "z": 0,
                      "w": 1, "d": 1, "h": 1, "asset": "e.json"}]]
            with open(os.path.join(td, "viz.json"), "w") as f:
                json.dump(viz, f)

            exp = Exporter3D(td)
            with patch.object(exp, "_create_data_stage") as m_stage, \
                 patch.object(exp, "_execute") as m_exec, \
                 patch.object(exp, "_save_file") as m_save:
                exp.run()
                m_stage.assert_called_once()
                m_exec.assert_called_once_with(viz)
                m_save.assert_called_once()


# ═══════════════════════════════════════════════════════════════════════════
# 6.  Smoke: _create_data_rep dispatches each type  (lightweight mock)
# ═══════════════════════════════════════════════════════════════════════════

def _make_rep(shape_type, **overrides):
    """Build a minimal DataRep dict for the given shape type."""
    base = {
        "type": shape_type,
        "x": 0.1, "y": 0.2, "z": 0.3,
        "w": 0.5, "d": 0.5, "h": 0.5,
        "color": "#ff0000",
        "asset": "",
    }
    base.update(overrides)
    return base


class TestCreateDataRepDispatch:
    """Smoke-test that each shape type exercises its branch without error.

    We only verify _setup_data_rep_item is called (or not, for encoding).
    The bpy calls go to MagicMock and are not asserted in detail — that
    is the job of a Blender integration test.
    """

    @pytest.fixture(autouse=True)
    def _setup_exporter(self):
        self.exp = Exporter3D("/tmp")
        # Provide mock collections so unlink/link don't fail
        self.exp.data_stage = MagicMock(name="data_stage")
        self.exp.data_scene = MagicMock(name="data_scene")

    @pytest.mark.parametrize("shape", [
        "sphere", "box", "cylinder", "pyramid", "pyramid_down",
    ])
    def test_simple_shapes(self, shape):
        rep = _make_rep(shape)
        with patch.object(self.exp, "_setup_data_rep_item") as m:
            self.exp._create_data_rep(rep)
            m.assert_called_once_with(rep)

    def test_octahedron(self):
        rep = _make_rep("octahedron")
        with patch.object(self.exp, "_setup_data_rep_item") as m:
            self.exp._create_data_rep(rep)
            m.assert_called_once_with(rep)

    def test_plus(self):
        rep = _make_rep("plus")
        with patch.object(self.exp, "_setup_data_rep_item") as m:
            self.exp._create_data_rep(rep)
            m.assert_called_once_with(rep)

    def test_cross(self):
        rep = _make_rep("cross")
        with patch.object(self.exp, "_setup_data_rep_item") as m:
            self.exp._create_data_rep(rep)
            m.assert_called_once_with(rep)

    def test_arc(self):
        rep = _make_rep("arc", asset="angle:90;start:0;ratio:0.5")
        with patch.object(self.exp, "_setup_data_rep_item") as m:
            self.exp._create_data_rep(rep)
            m.assert_called_once_with(rep)

    def test_plane(self):
        rep = _make_rep("plane")
        with patch.object(self.exp, "_setup_data_rep_item") as m:
            self.exp._create_data_rep(rep)
            m.assert_called_once_with(rep)

    def test_text(self):
        # text branch reads obj.dimensions[0] / [1] — mock must return floats
        _bpy_mock.context.object.dimensions.__getitem__ = lambda self, i: [0.5, 0.3][i]
        rep = _make_rep("text", asset="Hello")
        with patch.object(self.exp, "_setup_data_rep_item") as m:
            self.exp._create_data_rep(rep)
            m.assert_called_once_with(rep)

    def test_encoding_skipped(self):
        rep = _make_rep("encoding", asset="enc.json")
        with patch.object(self.exp, "_setup_data_rep_item") as m:
            self.exp._create_data_rep(rep)
            m.assert_not_called()  # encoding just prints

    def test_unknown_type_falls_to_panel(self):
        rep = _make_rep("xy", asset="img.png")
        with patch.object(self.exp, "_create_panel") as m:
            self.exp._create_data_rep(rep)
            m.assert_called_once_with(rep)


# ═══════════════════════════════════════════════════════════════════════════
# 7.  Smoke: _save_file calls correct bpy export operator
# ═══════════════════════════════════════════════════════════════════════════

class TestSaveFile:

    @pytest.mark.parametrize("fmt, op_path", [
        ("blend", "ops.wm.save_as_mainfile"),
        ("usdc",  "ops.wm.usd_export"),
        ("usdz",  "ops.wm.usd_export"),
        ("fbx",   "ops.export_scene.fbx"),
        ("gltf",  "ops.export_scene.gltf"),
        ("glb",   "ops.export_scene.gltf"),
    ])
    def test_format_dispatches(self, fmt, op_path):
        """Each format should trigger the correct bpy.ops.* call."""
        exp = Exporter3D("/tmp", fmt)
        # Reset the mock so we can check fresh calls
        _bpy_mock.reset_mock()
        exp._save_file()
        # Navigate the mock to the operator
        obj = _bpy_mock
        for attr in op_path.split("."):
            obj = getattr(obj, attr)
        obj.assert_called_once()


# ═══════════════════════════════════════════════════════════════════════════
# 8.  CLI: main() arg parsing
# ═══════════════════════════════════════════════════════════════════════════

class TestMainCLI:

    def test_no_args_uses_cwd(self):
        with patch("saxr.export3d.exporter.Exporter3D") as MockExp:
            mock_inst = MockExp.return_value
            with patch("sys.argv", ["export3D.py"]):
                main()
            MockExp.assert_called_once()
            folder, fmt = MockExp.call_args[0]
            assert folder == os.getcwd()
            assert fmt == "blend"

    def test_folder_arg(self):
        with patch("saxr.export3d.exporter.Exporter3D") as MockExp:
            mock_inst = MockExp.return_value
            with patch("sys.argv", ["export3D.py", "samples/iris"]):
                main()
            folder, fmt = MockExp.call_args[0]
            assert folder.endswith("samples/iris") or folder.endswith("samples\\iris")
            assert fmt == "blend"

    def test_absolute_folder_arg(self):
        with patch("saxr.export3d.exporter.Exporter3D") as MockExp:
            mock_inst = MockExp.return_value
            with patch("sys.argv", ["export3D.py", "/abs/path", "glb"]):
                main()
            folder, fmt = MockExp.call_args[0]
            assert folder == "/abs/path"
            assert fmt == "glb"
