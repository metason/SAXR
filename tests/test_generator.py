"""Tests for generator.py — key(), indexOf(), placeX/Y/Z()."""
import os
import sys
import unittest

path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "SAXR-main", "SAXR-main")
sys.path.append(path)

from tests.conftest import make_gen


class TestKey(unittest.TestCase):
    """key() resolves field aliases from the encoding dict."""

    def test_no_encoding_returns_field_name(self):
        g = make_gen()
        self.assertEqual(g.key("x"), "x")

    def test_field_alias_is_returned(self):
        g = make_gen()
        g.encoding = {"x": {"field": "sepal_length"}}
        self.assertEqual(g.key("x"), "sepal_length")

    def test_no_field_key_returns_channel(self):
        g = make_gen()
        g.encoding = {"color": {"value": "red"}}
        self.assertEqual(g.key("color"), "color")

    def test_unknown_channel_returns_itself(self):
        g = make_gen()
        self.assertEqual(g.key("nonexistent"), "nonexistent")


class TestIndexOf(unittest.TestCase):
    """indexOf() returns correct zero-based index or -1."""

    def test_middle_element(self):
        g = make_gen()
        g.encoding = {"x": {"scale": {"domain": ["a", "b", "c"]}}}
        self.assertEqual(g.indexOf("b", "x"), 1)

    def test_first_element(self):
        g = make_gen()
        g.encoding = {"x": {"scale": {"domain": ["a", "b", "c"]}}}
        self.assertEqual(g.indexOf("a", "x"), 0)

    def test_last_element(self):
        g = make_gen()
        g.encoding = {"x": {"scale": {"domain": ["a", "b", "c"]}}}
        self.assertEqual(g.indexOf("c", "x"), 2)

    def test_missing_channel_returns_minus_one(self):
        g = make_gen()
        self.assertEqual(g.indexOf("a", "x"), -1)

    def test_missing_scale_returns_minus_one(self):
        g = make_gen()
        g.encoding = {"x": {}}
        self.assertEqual(g.indexOf("a", "x"), -1)


class TestPlace(unittest.TestCase):
    """placeX/Y/Z() map data values to stage coordinates."""

    def setUp(self):
        self.g = make_gen()
        # domain [0, 10], factor 0.1  →  X/Z range [-0.5, 0.5], Y range [0, 1]
        self.g.lowerX = 0.0;  self.g.upperX = 10.0;  self.g.factorX = 0.1
        self.g.lowerY = 0.0;  self.g.upperY = 10.0;  self.g.factorY = 0.1
        self.g.lowerZ = 0.0;  self.g.upperZ = 10.0;  self.g.factorZ = 0.1

    def test_placeX_centre_maps_to_zero(self):
        self.assertAlmostEqual(self.g.placeX(5.0), 0.0, places=6)

    def test_placeX_lower_bound(self):
        self.assertAlmostEqual(self.g.placeX(0.0), -0.5, places=6)

    def test_placeX_upper_bound(self):
        self.assertAlmostEqual(self.g.placeX(10.0), 0.5, places=6)

    def test_placeX_respects_custom_factor(self):
        g = make_gen()
        g.lowerX = 0.0; g.upperX = 2.0; g.factorX = 2.0
        # midpoint = 1.0; value 2.0 → (2 - 1) * 2 = 2.0
        self.assertAlmostEqual(g.placeX(2.0), 2.0, places=6)

    def test_placeY_lower_bound_is_zero(self):
        self.assertAlmostEqual(self.g.placeY(0.0), 0.0, places=6)

    def test_placeY_midpoint(self):
        self.assertAlmostEqual(self.g.placeY(5.0), 0.5, places=6)

    def test_placeY_upper_bound(self):
        self.assertAlmostEqual(self.g.placeY(10.0), 1.0, places=6)

    def test_placeZ_centre_maps_to_zero(self):
        self.assertAlmostEqual(self.g.placeZ(5.0), 0.0, places=6)

    def test_placeZ_lower_bound(self):
        self.assertAlmostEqual(self.g.placeZ(0.0), -0.5, places=6)

    def test_placeZ_upper_bound(self):
        self.assertAlmostEqual(self.g.placeZ(10.0), 0.5, places=6)


if __name__ == "__main__":
    unittest.main(verbosity=2)
