# SAXR Test Suite

Automated tests for the SAXR data-visualization pipeline.  
120 tests covering encoding logic, plot generation, 3D export, helper utilities, and golden-file regression.

## Requirements

```bash
pip install pytest
# or install all dev dependencies:
pip install -e ".[test]"
```

## Running Tests

```bash
# Run all tests
python -m pytest tests/ -v

# Run a specific sample
python -m pytest tests/ -v -k iris

# Run only a specific test file
python -m pytest tests/test_encoding.py -v

# Run a single test class
python -m pytest tests/test_encoding.py::TestDeduceDimensions -v
```

## Test Files

| File                 | What it tests                                                                                                                                         | Tests |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| `test_encoding.py`   | Dimension inference and encoding resolution — nominal/quantitative/temporal classification, scale ranges, colour palettes                             | 18    |
| `test_generator.py`  | Generator core — `key()` field resolution, `indexOf()` lookups, `placeX/Y/Z()` coordinate mapping                                                     | 23    |
| `test_plots.py`      | Plot creation — scatter and bar visual output, shape types, colour channels, row counts                                                               | 11    |
| `test_helpers.py`    | Utility functions — `rgb2hex()` colour conversion, `inch2m()` unit conversion                                                                         | 8     |
| `test_export3d.py`   | Blender 3D exporter — `kv2dict()` parsing, format detection, shape dispatch, pipeline integration                                                     | 20    |
| `test_regression.py` | Golden-file regression — runs `datarepgen.py` on each sample, compares `datareps.json` and `specs.json` against reference files, validates panel PNGs | 40    |

## How the Regression Tests Work

The golden-file tests in `test_regression.py` ensure that the pipeline output stays identical across refactoring:

1. **Discover samples** — scans `tests/golden/` for `*_datareps.json` files, maps each back to `samples/<name>/`.
2. **Run the pipeline** — calls `python datarepgen.py samples/<name>` for each sample.
3. **Compare output** — loads the generated `datareps.json` and `specs.json`, normalises floats to 10 decimal places, and diffs against the golden reference.
4. **Validate PNGs** — checks that expected panel images exist and have a valid PNG header.
5. **Restore originals** — backs up and restores sample output files so that a test run leaves the working tree clean.

### Golden files

```
tests/golden/
├── burnout_datareps.json     burnout_specs.json
├── eco_datareps.json         eco_specs.json
├── energy_datareps.json      energy_specs.json
├── fruits_datareps.json      fruits_specs.json
├── geo_datareps.json         geo_specs.json
├── ingredients_datareps.json ingredients_specs.json
├── iris_datareps.json        iris_specs.json
└── stars_datareps.json       stars_specs.json
```

### Updating golden files after intentional changes

If you intentionally change pipeline output (e.g. a new feature or format change), regenerate the golden files:

```bash
# Regenerate all samples
python datarepgen.py samples/burnout
python datarepgen.py samples/eco
python datarepgen.py samples/energy
python datarepgen.py samples/fruits
python datarepgen.py samples/iris
python datarepgen.py samples/ingredients

# Copy fresh output to golden/
cp samples/burnout/datareps.json  tests/golden/burnout_datareps.json
cp samples/burnout/specs.json     tests/golden/burnout_specs.json
# ... repeat for each sample
```

## Shared Fixtures

`conftest.py` provides:

- **`make_gen()`** — returns a `DataRepGenerator` with sensible defaults (small DataFrame, basic encoding) without reading any files. Use it in unit tests that need a generator instance.
