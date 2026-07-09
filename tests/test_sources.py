import json
from pathlib import Path

import httpx
import respx

from rxsweep.sources.openfda import OpenFDAClient, fetch_ndc_status, fetch_recalls, fetch_shortages

FIX = Path(__file__).parent / "fixtures"


@respx.mock
def test_fetch_recalls_pages_and_emits_events():
    payload = json.loads((FIX / "enforcement_page.json").read_text())
    respx.get(url__regex=r".*drug/enforcement\.json.*").mock(
        return_value=httpx.Response(200, json=payload)
    )
    events = []
    recs = fetch_recalls(OpenFDAClient(on_event=events.append), months_back=24)
    assert len(recs) == len(payload["results"])
    kinds = [e["kind"] for e in events]
    assert "fda_request" in kinds and "fda_response" in kinds


@respx.mock
def test_retry_on_429_then_success():
    payload = json.loads((FIX / "shortages_page.json").read_text())
    route = respx.get(url__regex=r".*drug/shortages\.json.*")
    route.side_effect = [httpx.Response(429), httpx.Response(200, json=payload)]
    recs = fetch_shortages(OpenFDAClient())
    assert recs and route.call_count == 2


@respx.mock
def test_404_means_empty_not_error():
    respx.get(url__regex=r".*drug/enforcement\.json.*").mock(return_value=httpx.Response(404))
    assert fetch_recalls(OpenFDAClient()) == []


@respx.mock
def test_ndc_status_maps_package_ndc_to_canonical():
    payload = json.loads((FIX / "ndc_batch.json").read_text())
    real_ten = payload["results"][0]["packaging"][0]["package_ndc"]  # e.g. 37662-0293-1
    segs = real_ten.split("-")
    # build the 11-digit canonical this 10-digit NDC normalizes to
    from rxsweep.matching import normalize_ndc

    canonical = normalize_ndc(real_ten).canonical[0]
    respx.get(url__regex=r".*drug/ndc\.json.*").mock(return_value=httpx.Response(200, json=payload))
    out = fetch_ndc_status(OpenFDAClient(), [canonical])
    assert canonical in out
    assert out[canonical]["product_ndc"] == payload["results"][0]["product_ndc"]
    assert segs  # silence lint on unused


@respx.mock
def test_ndc_status_absent_for_unknown():
    respx.get(url__regex=r".*drug/ndc\.json.*").mock(return_value=httpx.Response(404))
    out = fetch_ndc_status(OpenFDAClient(), ["00409405801"])
    assert out == {}
