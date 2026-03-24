"""Tests for plots.py — create_scatter and create_bar."""
import os
import sys
import unittest
import pandas as pd

path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "SAXR-main", "SAXR-main")
sys.path.append(path)

from saxr.plots import create_scatter, create_bar
from tests.conftest import make_gen


class TestCreateScatter(unittest.TestCase):
    """create_scatter appends exactly one visual per data row (when size > 0)."""

    def _make_gen(self, n: int = 5):
        g = make_gen()
        g.plot = "scatter"
        vals = list(range(n))
        g.df = pd.DataFrame({"px": vals, "py": vals, "pz": vals})
        g.encoding = {
            "x": {"field": "px", "type": "quantitative"},
            "y": {"field": "py", "type": "quantitative"},
            "z": {"field": "pz", "type": "quantitative"},
            "size": {"value": 0.05},
        }
        g.lowerX, g.upperX = 0.0, float(max(n - 1, 1))
        g.lowerY, g.upperY = 0.0, float(max(n - 1, 1))
        g.lowerZ, g.upperZ = 0.0, float(max(n - 1, 1))
        g.factorX = g.factorY = g.factorZ = 1.0
        return g

    def test_visual_count_equals_row_count(self):
        g = self._make_gen(5)
        create_scatter(g)
        self.assertEqual(len(g.visuals), 5)

    def test_visual_count_single_row(self):
        g = self._make_gen(1)
        create_scatter(g)
        self.assertEqual(len(g.visuals), 1)

    def test_visual_count_large(self):
        g = self._make_gen(50)
        create_scatter(g)
        self.assertEqual(len(g.visuals), 50)

    def test_visual_has_required_keys(self):
        g = self._make_gen(3)
        create_scatter(g)
        for v in g.visuals:
            for key in ("type", "x", "y", "z", "w", "h", "d", "color"):
                self.assertIn(key, v)

    def test_default_shape_is_sphere(self):
        g = self._make_gen(2)
        create_scatter(g)
        for v in g.visuals:
            self.assertEqual(v["type"], "sphere")

    def test_colour_channel_value_applied(self):
        g = self._make_gen(3)
        g.encoding["color"] = {"value": "#aabbcc"}
        create_scatter(g)
        for v in g.visuals:
            self.assertEqual(v["color"], "#aabbcc")


class TestCreateBar(unittest.TestCase):
    """create_bar produces the expected number of bar visuals."""

    def _make_gen(self, categories=("A", "B", "C"), yvals=(10, 20, 30)):
        g = make_gen()
        g.plot = "bar"
        g.mark = "box"
        n = len(categories)
        g.df = pd.DataFrame({
            "cat":       list(categories),
            "val":       list(yvals),
            "depth_col": ["d"] * n,
            "color":     ["orange"] * n,   # fallback column used by create_bar
        })
        g.encoding = {
            "x": {
                "field": "cat",
                "type":  "nominal",
                "scale": {"domain": list(categories), "range": list(range(n))},
            },
            "y": {
                "field": "val",
                "type":  "quantitative",
                "scale": {"domain": [0, max(yvals)], "range": [0.0, 1.0]},
            },
            "z": {
                "field": "depth_col",
                "type":  "nominal",
                "scale": {"domain": ["d"], "range": [0.0]},
            },
            "size": {"value": 0.1},
        }
        g.lowerX, g.upperX = 0.0, float(n - 1)
        g.lowerY, g.upperY = 0.0, float(max(yvals))
        g.lowerZ, g.upperZ = 0.0, 0.0
        g.factorX = 1.0
        g.factorY = 1.0 / float(max(yvals))
        g.factorZ = 1.0
        return g

    def test_visual_count_three_bars(self):
        g = self._make_gen()
        create_bar(g)
        self.assertEqual(len(g.visuals), 3)

    def test_visual_count_two_bars(self):
        g = self._make_gen(("X", "Y"), (5, 15))
        create_bar(g)
        self.assertEqual(len(g.visuals), 2)

    def test_visual_has_required_keys(self):
        g = self._make_gen()
        create_bar(g)
        for v in g.visuals:
            for key in ("type", "x", "y", "z", "w", "h", "d", "color"):
                self.assertIn(key, v)

    def test_bar_type_matches_mark(self):
        g = self._make_gen()
        create_bar(g)
        for v in g.visuals:
            self.assertEqual(v["type"], "box")

    def test_bar_height_proportional_to_y(self):
        """Bars with larger y values must produce larger h."""
        g = self._make_gen(("A", "B"), (10, 20))
        create_bar(g)
        self.assertLess(g.visuals[0]["h"], g.visuals[1]["h"])


if __name__ == "__main__":
    unittest.main(verbosity=2)
