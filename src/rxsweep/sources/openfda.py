"""openFDA clients: recalls (enforcement), drug shortages, NDC directory.

Strategy is bulk-fetch-then-match-locally for recalls and shortages (one
paged download per run) so a 3,000-item formulary doesn't turn into 9,000
API calls. Only NDC-directory status is queried per-item, batched 25 NDCs
per request. openFDA returns 404 for an empty result set — that's data,
not an error.
"""

import time
from datetime import date, timedelta
from typing import Callable

import httpx

from rxsweep.matching import denormalize_ndc

BASE = "https://api.fda.gov"
PAGE = 1000
SKIP_CAP = 25000
NDC_BATCH = 25


class OpenFDAClient:
    def __init__(
        self,
        api_key: str | None = None,
        on_event: Callable[[dict], None] | None = None,
    ):
        self.api_key = api_key
        self.on_event = on_event or (lambda e: None)
        self._http = httpx.Client(timeout=30)

    def get(self, endpoint: str, params: dict) -> dict:
        if self.api_key:
            params = {**params, "api_key": self.api_key}
        url = f"{BASE}/{endpoint}"
        logged = {k: v for k, v in params.items() if k != "api_key"}
        self.on_event({"kind": "fda_request", "url": url, "params": logged})
        for attempt in range(4):
            resp = self._http.get(url, params=params)
            if resp.status_code == 404:  # openFDA: empty result set
                self.on_event({"kind": "fda_response", "url": url, "count": 0})
                return {"meta": {}, "results": []}
            if resp.status_code in (429, 500, 502, 503) and attempt < 3:
                time.sleep(0.5 * 2**attempt)
                continue
            resp.raise_for_status()
            data = resp.json()
            self.on_event(
                {"kind": "fda_response", "url": url, "count": len(data.get("results", []))}
            )
            return data
        raise RuntimeError("retries exhausted")  # pragma: no cover - loop always returns/raises


def _paged(client: OpenFDAClient, endpoint: str, search: str | None) -> list[dict]:
    out: list[dict] = []
    skip = 0
    while skip <= SKIP_CAP:
        params: dict = {"limit": PAGE, "skip": skip}
        if search:
            params["search"] = search
        data = client.get(endpoint, params)
        results = data.get("results", [])
        out.extend(results)
        total = data.get("meta", {}).get("results", {}).get("total", 0)
        skip += PAGE
        if skip >= total or not results:
            break
    return out


def fetch_recalls(client: OpenFDAClient, months_back: int = 24) -> list[dict]:
    start = (date.today() - timedelta(days=months_back * 30)).strftime("%Y%m%d")
    end = date.today().strftime("%Y%m%d")
    return _paged(client, "drug/enforcement.json", f"report_date:[{start} TO {end}]")


def fetch_shortages(client: OpenFDAClient) -> list[dict]:
    return _paged(client, "drug/shortages.json", None)


def fetch_ndc_status(client: OpenFDAClient, ndcs: list[str]) -> dict[str, dict]:
    """Map canonical 11-digit NDC → NDC-directory record. Missing key = not listed."""
    ten_to_canonical: dict[str, str] = {}
    for c in ndcs:
        for ten in denormalize_ndc(c):
            ten_to_canonical[ten] = c
    found: dict[str, dict] = {}
    tens = list(ten_to_canonical)
    for i in range(0, len(tens), NDC_BATCH):
        chunk = tens[i : i + NDC_BATCH]
        quoted = " ".join(f'"{t}"' for t in chunk)
        data = client.get(
            "drug/ndc.json",
            {"search": f"packaging.package_ndc.exact:({quoted})", "limit": 100},
        )
        for rec in data.get("results", []):
            for pkg in rec.get("packaging", []):
                t = pkg.get("package_ndc")
                if t in ten_to_canonical:
                    found[ten_to_canonical[t]] = rec
    return found
