from rxsweep.ingest import FormularyItem
from rxsweep.matching import (
    extract_ndcs_from_text,
    match_items,
    normalize_name,
    normalize_ndc,
)


def _item(name, ndc=None, row=2):
    return FormularyItem(
        row=row, name=name, ndc=normalize_ndc(ndc) if ndc else None, raw={}
    )


RECALL = {
    "product_description": "Cefazolin Sodium 1g single-dose vial, 10 count",
    "classification": "Class II",
    "recall_number": "D-0001-2026",
    "openfda": {"package_ndc": ["0409-4058-01"]},
}
RECALL_CODE_INFO_ONLY = {
    "product_description": "Lidocaine HCl injection",
    "classification": "Class III",
    "recall_number": "D-0002-2026",
    "openfda": {},
    "code_info": "NDC 0143-9575-01, all lots",
}
SHORTAGE = {
    "generic_name": "Amoxicillin",
    "status": "Current",
    "package_ndc": "0093-4155-73",
}


def test_exact_ndc_recall_hit():
    res = match_items([_item("Cefazolin Sodium", "0409-4058-01")], [RECALL], [], {})
    assert res.hits[0].label == "exact_ndc" and res.hits[0].source == "recall"


def test_recall_ndc_harvested_from_code_info():
    res = match_items([_item("Lidocaine", "0143-9575-01")], [RECALL_CODE_INFO_ONLY], [], {})
    assert res.hits and res.hits[0].label == "exact_ndc"


def test_shortage_exact_ndc():
    res = match_items([_item("Amoxicillin Caps", "0093-4155-73")], [], [SHORTAGE], {})
    assert res.hits and res.hits[0].label == "exact_ndc" and res.hits[0].source == "shortage"


def test_name_match_shortage():
    res = match_items([_item("Amoxicillin 500mg Cap")], [], [SHORTAGE], {})
    assert res.hits and res.hits[0].label == "name_match"


def test_token_overlap_goes_to_candidates():
    res = match_items([_item("Cefazolin Injection", None)], [RECALL], [], {})
    assert res.candidates and not res.hits


def test_no_relation_goes_unmatched():
    res = match_items([_item("Metformin HCl")], [RECALL], [SHORTAGE], {})
    assert not res.hits and not res.candidates and len(res.unmatched) == 1


def test_normalize_name_strips_salt():
    assert normalize_name("Metformin HCl") == "metformin"
    assert normalize_name("Cefazolin Sodium") == "cefazolin"


def test_ambiguous_ndc_downgraded_to_candidate():
    res = match_items([_item("Something Unrelated", "0409405801")], [RECALL], [], {})
    assert res.candidates and "ambiguous" in res.candidates[0].reason


def test_extract_ndcs_from_text():
    found = extract_ndcs_from_text("NDC 0143-9575-01 and 54868-0123-1; lot X99")
    assert "00143957501" in found and "54868012301" in found


def test_discontinued_ndc_hit():
    item = _item("Old Drug", "0409-4058-01")
    ndc_status = {
        "00409405801": {
            "product_ndc": "0409-4058",
            "listing_expiration_date": "20200101",
            "marketing_category": "ANDA",
        }
    }
    res = match_items([item], [], [], ndc_status)
    assert res.hits and res.hits[0].source == "ndc"


def test_ndc_missing_from_directory_is_candidate():
    item = _item("Ghost Drug", "0409-4058-01")
    res = match_items([item], [], [], {})
    assert any("not found in directory" in c.reason for c in res.candidates)
