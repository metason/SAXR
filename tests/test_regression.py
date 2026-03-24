"""
Regression tests for datarepgen.py

These tests run datarepgen.py on each sample and compare the generated viz.json
and encoding.json against golden reference files captured before refactoring.
Panel PNGs are also validated for existence and basic integrity.

If output stays identical, the refactoring is safe.
If output differs, the diff is printed so you can inspect what changed.

Usage:
    pytest tests/test_regression.py -v
    pytest tests/test_regression.py -v -k iris       # run only iris
"""

import json
import os
import subprocess
import sys
import shutil

import pytest

# ── Paths ──────────────────────────────────────────────────────────────────

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SAXR_MAIN = os.path.join(REPO_ROOT, "SAXR-main", "SAXR-main")
SAMPLES_DIR = os.path.join(SAXR_MAIN, "samples")
GOLDEN_DIR = os.path.join(REPO_ROOT, "tests", "golden")
DATAREP_SCRIPT = os.path.join(SAXR_MAIN, "datarepgen.py")
PYTHON = sys.executable

# ── Discover samples that have golden files ────────────────────────────────

SAMPLES = []
for name in sorted(os.listdir(GOLDEN_DIR)):
    if name.endswith("_viz.json"):
        sample_name = name.replace("_viz.json", "")
        sample_dir = os.path.join(SAMPLES_DIR, sample_name)
        settings = os.path.join(sample_dir, "settings.json")
        if os.path.isfile(settings):
            SAMPLES.append(sample_name)

# ── Helpers ────────────────────────────────────────────────────────────────

def normalize_json(path: str):
    """Load JSON, re-serialize with sorted keys and consistent formatting.
    This handles harmless float precision differences (round to 10 decimals).
    """
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return _round_floats(data)


def _round_floats(obj, precision=10):
    """Recursively round floats in a JSON-compatible structure."""
    if isinstance(obj, float):
        return round(obj, precision)
    if isinstance(obj, list):
        return [_round_floats(item, precision) for item in obj]
    if isinstance(obj, dict):
        return {k: _round_floats(v, precision) for k, v in obj.items()}
    return obj


def run_datarepgen(sample_name: str):
    """Run datarepgen.py on a sample folder. Returns (exit_code, stdout, stderr)."""
    sample_path = os.path.join(SAMPLES_DIR, sample_name)
    result = subprocess.run(
        [PYTHON, DATAREP_SCRIPT, sample_path],
        cwd=SAXR_MAIN,
        capture_output=True,
        text=True,
        timeout=120,
    )
    return result.returncode, result.stdout, result.stderr


# ── Test: Golden file regression ───────────────────────────────────────────

@pytest.mark.parametrize("sample", SAMPLES, ids=SAMPLES)
def test_viz_json_matches_golden(sample, tmp_path):
    """
    Run datarepgen.py on a sample and verify viz.json matches the golden file.

    The test:
    1. Backs up the current viz.json
    2. Runs datarepgen.py to regenerate viz.json
    3. Compares generated output with golden reference
    4. Restores the original viz.json (regardless of pass/fail)
    """
    sample_dir = os.path.join(SAMPLES_DIR, sample)
    viz_json_path = os.path.join(sample_dir, "viz.json")
    golden_path = os.path.join(GOLDEN_DIR, f"{sample}_viz.json")

    # Back up current viz.json
    backup_path = os.path.join(str(tmp_path), f"{sample}_viz_backup.json")
    if os.path.exists(viz_json_path):
        shutil.copy2(viz_json_path, backup_path)

    try:
        # Run datarepgen.py
        exit_code, stdout, stderr = run_datarepgen(sample)
        assert exit_code == 0, (
            f"datarepgen.py failed for {sample}:\n"
            f"STDOUT:\n{stdout}\n"
            f"STDERR:\n{stderr}"
        )

        # Compare
        assert os.path.isfile(viz_json_path), f"viz.json not created for {sample}"
        generated = normalize_json(viz_json_path)
        golden = normalize_json(golden_path)

        if generated != golden:
            # Show a useful diff summary
            gen_str = json.dumps(generated, indent=2, sort_keys=True)
            gol_str = json.dumps(golden, indent=2, sort_keys=True)

            # Find first difference line
            gen_lines = gen_str.splitlines()
            gol_lines = gol_str.splitlines()
            diff_line = -1
            for i, (g, e) in enumerate(zip(gen_lines, gol_lines)):
                if g != e:
                    diff_line = i
                    break

            pytest.fail(
                f"viz.json for '{sample}' differs from golden file!\n"
                f"First difference at line {diff_line}:\n"
                f"  GENERATED: {gen_lines[diff_line] if diff_line < len(gen_lines) else '<EOF>'}\n"
                f"  EXPECTED:  {gol_lines[diff_line] if diff_line < len(gol_lines) else '<EOF>'}\n"
                f"Generated {len(gen_lines)} lines vs golden {len(gol_lines)} lines.\n"
                f"Run with -s flag to see full output."
            )

    finally:
        # Restore original viz.json
        if os.path.exists(backup_path):
            shutil.copy2(backup_path, viz_json_path)


# ── Test: All samples are accounted for ────────────────────────────────────

def test_all_samples_have_golden_files():
    """Ensure every sample with a settings.json has a corresponding golden file."""
    missing = []
    for name in os.listdir(SAMPLES_DIR):
        sample_dir = os.path.join(SAMPLES_DIR, name)
        if os.path.isfile(os.path.join(sample_dir, "settings.json")):
            golden = os.path.join(GOLDEN_DIR, f"{name}_viz.json")
            if not os.path.isfile(golden):
                missing.append(name)
    assert not missing, f"Missing golden files for: {missing}"


# ── Test: encoding.json golden regression ──────────────────────────────────

@pytest.mark.parametrize("sample", SAMPLES, ids=SAMPLES)
def test_encoding_json_matches_golden(sample, tmp_path):
    """
    Run datarepgen.py on a sample and verify encoding.json matches the golden file.
    """
    sample_dir = os.path.join(SAMPLES_DIR, sample)
    encoding_path = os.path.join(sample_dir, "encoding.json")
    golden_path = os.path.join(GOLDEN_DIR, f"{sample}_encoding.json")

    if not os.path.isfile(golden_path):
        pytest.skip(f"No golden encoding.json for {sample}")

    # Back up current encoding.json
    backup_path = os.path.join(str(tmp_path), f"{sample}_encoding_backup.json")
    if os.path.exists(encoding_path):
        shutil.copy2(encoding_path, backup_path)

    try:
        exit_code, stdout, stderr = run_datarepgen(sample)
        assert exit_code == 0, (
            f"datarepgen.py failed for {sample}:\n"
            f"STDOUT:\n{stdout}\nSTDERR:\n{stderr}"
        )

        assert os.path.isfile(encoding_path), f"encoding.json not created for {sample}"
        generated = normalize_json(encoding_path)
        golden = normalize_json(golden_path)

        if generated != golden:
            gen_str = json.dumps(generated, indent=2, sort_keys=True)
            gol_str = json.dumps(golden, indent=2, sort_keys=True)
            gen_lines = gen_str.splitlines()
            gol_lines = gol_str.splitlines()
            diff_line = -1
            for i, (g, e) in enumerate(zip(gen_lines, gol_lines)):
                if g != e:
                    diff_line = i
                    break
            pytest.fail(
                f"encoding.json for '{sample}' differs from golden file!\n"
                f"First difference at line {diff_line}:\n"
                f"  GENERATED: {gen_lines[diff_line] if diff_line < len(gen_lines) else '<EOF>'}\n"
                f"  EXPECTED:  {gol_lines[diff_line] if diff_line < len(gol_lines) else '<EOF>'}\n"
            )
    finally:
        if os.path.exists(backup_path):
            shutil.copy2(backup_path, encoding_path)


# ── Test: Panel PNGs existence and validity ────────────────────────────────

PNG_HEADER = b'\x89PNG\r\n\x1a\n'


def _expected_pngs_from_settings(sample_dir: str) -> list:
    """Derive expected PNG filenames from the panels spec in settings.json."""
    settings_path = os.path.join(sample_dir, "settings.json")
    with open(settings_path, "r", encoding="utf-8") as f:
        settings = json.load(f)
    panels = settings.get("panels", [])
    pngs = []
    for spec in panels:
        lc = spec.lower()
        if lc.startswith("l"):
            # legend panel: lc=_>, lm=_<, lg=_> → first 2 chars + .png
            pngs.append(lc[:2] + ".png")
        else:
            # data panel: xy, -xy, zy, xz+p, xz+s → full lowered spec + .png
            pngs.append(lc + ".png")
    return sorted(set(pngs))


@pytest.mark.parametrize("sample", SAMPLES, ids=SAMPLES)
def test_panel_pngs_generated(sample, tmp_path):
    """
    Run datarepgen.py and verify that expected panel PNGs exist
    and are valid (non-zero size, correct PNG header).
    """
    sample_dir = os.path.join(SAMPLES_DIR, sample)
    expected_pngs = _expected_pngs_from_settings(sample_dir)

    if not expected_pngs:
        pytest.skip(f"No panels configured for {sample}")

    # Back up existing PNGs
    backups = {}
    for png_name in expected_pngs:
        png_path = os.path.join(sample_dir, png_name)
        if os.path.exists(png_path):
            backup = os.path.join(str(tmp_path), f"{sample}_{png_name}")
            shutil.copy2(png_path, backup)
            backups[png_name] = backup

    try:
        exit_code, stdout, stderr = run_datarepgen(sample)
        assert exit_code == 0, (
            f"datarepgen.py failed for {sample}:\n"
            f"STDOUT:\n{stdout}\nSTDERR:\n{stderr}"
        )

        missing = []
        empty = []
        invalid = []
        for png_name in expected_pngs:
            png_path = os.path.join(sample_dir, png_name)
            if not os.path.isfile(png_path):
                missing.append(png_name)
                continue
            size = os.path.getsize(png_path)
            if size == 0:
                empty.append(png_name)
                continue
            with open(png_path, "rb") as f:
                header = f.read(8)
            if header != PNG_HEADER:
                invalid.append(png_name)

        errors = []
        if missing:
            errors.append(f"Missing PNGs: {missing}")
        if empty:
            errors.append(f"Empty PNGs (0 bytes): {empty}")
        if invalid:
            errors.append(f"Invalid PNG header: {invalid}")
        assert not errors, f"Panel PNG issues for '{sample}':\n" + "\n".join(errors)

    finally:
        for png_name, backup in backups.items():
            shutil.copy2(backup, os.path.join(sample_dir, png_name))
