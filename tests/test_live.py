"""Live smoke test — hits real openFDA. Excluded by default; run with:
    uv run pytest -m live
"""

import pytest

from rxsweep.sources.openfda import OpenFDAClient, fetch_ndc_status, fetch_shortages

pytestmark = pytest.mark.live


def test_shortages_endpoint_shape():
    records = fetch_shortages(OpenFDAClient())
    assert len(records) > 100
    assert {"generic_name", "status"} <= set(records[0].keys())


def test_ndc_directory_lookup_roundtrip():
    # a stable, long-marketed product: lisinopril (Teva)
    out = fetch_ndc_status(OpenFDAClient(), ["00093005801"])
    assert isinstance(out, dict)
