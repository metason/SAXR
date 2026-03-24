"""Tests for helpers.py — rgb2hex and inch2m."""
import os
import sys
import unittest

path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "SAXR-main", "SAXR-main")
sys.path.append(path)

from saxr.helpers import rgb2hex, inch2m


class TestRgb2Hex(unittest.TestCase):
    """rgb2hex — boundary and mid-range values."""

    def test_black(self):
        self.assertEqual(rgb2hex(0.0, 0.0, 0.0), "#000000")

    def test_white(self):
        self.assertEqual(rgb2hex(1.0, 1.0, 1.0), "#ffffff")

    def test_red(self):
        self.assertEqual(rgb2hex(1.0, 0.0, 0.0), "#ff0000")

    def test_green(self):
        self.assertEqual(rgb2hex(0.0, 1.0, 0.0), "#00ff00")

    def test_blue(self):
        self.assertEqual(rgb2hex(0.0, 0.0, 1.0), "#0000ff")

    def test_midrange_is_valid_hex(self):
        self.assertRegex(rgb2hex(0.5, 0.5, 0.5), r"^#[0-9a-f]{6}$")

    def test_returns_string(self):
        self.assertIsInstance(rgb2hex(0.2, 0.4, 0.8), str)

    def test_format_starts_with_hash(self):
        self.assertTrue(rgb2hex(0.1, 0.2, 0.3).startswith("#"))


class TestInch2m(unittest.TestCase):
    """inch2m — unit conversion."""

    def test_one_inch(self):
        self.assertAlmostEqual(inch2m(1.0), 0.0254, places=6)

    def test_zero(self):
        self.assertAlmostEqual(inch2m(0.0), 0.0, places=6)

    def test_negative(self):
        self.assertAlmostEqual(inch2m(-1.0), -0.0254, places=6)

    def test_twelve_inches_is_one_foot(self):
        self.assertAlmostEqual(inch2m(12.0), 0.3048, places=6)


if __name__ == "__main__":
    unittest.main(verbosity=2)
