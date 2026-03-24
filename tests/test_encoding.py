"""Tests for encoding.py — deduce_dimensions and deduce_encoding."""
import os
import sys
import unittest
import pandas as pd

path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "SAXR-main", "SAXR-main")
sys.path.append(path)

from saxr.encoding import deduce_dimensions, deduce_encoding
from tests.conftest import make_gen


class TestDeduceDimensions(unittest.TestCase):
    """deduce_dimensions classifies columns and computes domains correctly."""

    def _run(self, df: pd.DataFrame, encoding=None) -> dict:
        g = make_gen()
        g.df = df
        g.encoding = encoding or {}
        deduce_dimensions(g)
        return g.dimension

    def test_nominal_object_column_type(self):
        df = pd.DataFrame({"species": ["setosa", "virginica", "versicolor"]})
        self.assertEqual(self._run(df)["species"]["type"], "nominal")

    def test_nominal_object_column_domain_contains_values(self):
        df = pd.DataFrame({"species": ["setosa", "virginica", "versicolor"]})
        self.assertIn("setosa", self._run(df)["species"]["domain"])

    def test_quantitative_float_column_type(self):
        df = pd.DataFrame({"length": [1.0, 2.5, 3.7]})
        self.assertEqual(self._run(df)["length"]["type"], "quantitative")

    def test_quantitative_float_domain_min_max(self):
        df = pd.DataFrame({"length": [1.0, 2.5, 3.7]})
        dim = self._run(df)["length"]
        self.assertAlmostEqual(dim["domain"][0], 1.0)
        self.assertAlmostEqual(dim["domain"][1], 3.7)

    def test_quantitative_int_column_type(self):
        df = pd.DataFrame({"count": pd.array([1, 2, 10], dtype="int64")})
        self.assertEqual(self._run(df)["count"]["type"], "quantitative")

    def test_quantitative_int_domain_is_min_max(self):
        df = pd.DataFrame({"count": pd.array([1, 2, 10], dtype="int64")})
        self.assertEqual(self._run(df)["count"]["domain"], [1, 10])

    def test_temporal_column_type(self):
        # Explicit datetime64[ns] cast — newer pandas defaults to [us],
        # which would not match the dtype check in encoding.py (known bug).
        df = pd.DataFrame({
            "date": pd.to_datetime(["2021-01-01", "2022-06-15"]).astype("datetime64[ns]")
        })
        self.assertEqual(self._run(df)["date"]["type"], "temporal")

    def test_temporal_domain_has_two_elements(self):
        df = pd.DataFrame({
            "date": pd.to_datetime(["2021-01-01", "2022-06-15"]).astype("datetime64[ns]")
        })
        self.assertEqual(len(self._run(df)["date"]["domain"]), 2)

    def test_user_supplied_domain_is_kept(self):
        df = pd.DataFrame({"val": [0.0, 100.0]})
        encoding = {"val": {"scale": {"domain": [-10.0, 200.0]}}}
        self.assertEqual(self._run(df, encoding)["val"]["domain"], [-10.0, 200.0])

    def test_multiple_columns_all_present(self):
        df = pd.DataFrame({"x": [1.0, 2.0], "label": ["a", "b"]})
        dim = self._run(df)
        self.assertIn("x", dim)
        self.assertIn("label", dim)


class TestDeduceEncoding(unittest.TestCase):
    """deduce_encoding resolves scales, factors, and colour maps."""

    def _scatter_gen(self, extra_encoding=None):
        g = make_gen()
        g.plot = "scatter"
        g.df = pd.DataFrame({
            "px": [1.0, 2.0, 3.0],
            "py": [4.0, 5.0, 6.0],
            "pz": [0.1, 0.2, 0.3],
        })
        g.encoding = {
            "x": {"field": "px"},
            "y": {"field": "py"},
            "z": {"field": "pz"},
        }
        if extra_encoding:
            g.encoding.update(extra_encoding)
        g.dimension = {
            "px": {"type": "quantitative", "domain": [1.0, 3.0]},
            "py": {"type": "quantitative", "domain": [4.0, 6.0]},
            "pz": {"type": "quantitative", "domain": [0.1, 0.3]},
        }
        return g

    def test_x_scale_range_is_set(self):
        g = self._scatter_gen()
        deduce_encoding(g)
        self.assertIn("scale", g.encoding["x"])
        self.assertIn("range", g.encoding["x"]["scale"])

    def test_factorX_is_nonzero(self):
        g = self._scatter_gen()
        deduce_encoding(g)
        self.assertNotEqual(g.factorX, 0.0)

    def test_scatter_adds_5pct_padding_lower(self):
        g = self._scatter_gen()
        deduce_encoding(g)
        self.assertAlmostEqual(g.lowerX, 1.0 - (3.0 - 1.0) * 0.05, places=5)

    def test_scatter_adds_5pct_padding_upper(self):
        g = self._scatter_gen()
        deduce_encoding(g)
        self.assertAlmostEqual(g.upperX, 3.0 + (3.0 - 1.0) * 0.05, places=5)

    def test_nominal_colour_scale_hex_values(self):
        g = self._scatter_gen(extra_encoding={"color": {"field": "cat"}})
        g.df["cat"] = ["a", "b", "a"]
        g.dimension["cat"] = {"type": "nominal", "domain": ["a", "b"]}
        deduce_encoding(g)
        for c in g.encoding["color"]["scale"]["range"]:
            self.assertRegex(c, r"^#[0-9a-f]{6}$")

    def test_quantitative_colour_does_not_raise(self):
        g = self._scatter_gen(extra_encoding={"color": {"field": "px"}})
        g.dimension["px"]["domain"] = [0.0, 1.0]
        try:
            deduce_encoding(g)
        except Exception as exc:
            self.fail(f"deduce_encoding raised unexpectedly: {exc}")

    def test_missing_z_channel_does_not_raise(self):
        g = make_gen()
        g.plot = "scatter"
        g.df = pd.DataFrame({"px": [1.0, 2.0], "py": [3.0, 4.0]})
        g.encoding = {"x": {"field": "px"}, "y": {"field": "py"}}
        g.dimension = {
            "px": {"type": "quantitative", "domain": [1.0, 2.0]},
            "py": {"type": "quantitative", "domain": [3.0, 4.0]},
        }
        try:
            deduce_encoding(g)
        except Exception as exc:
            self.fail(f"deduce_encoding raised unexpectedly: {exc}")

    def test_y_scale_range_starts_at_zero(self):
        g = self._scatter_gen()
        deduce_encoding(g)
        self.assertEqual(g.encoding["y"]["scale"]["range"][0], 0.0)


if __name__ == "__main__":
    unittest.main(verbosity=2)
