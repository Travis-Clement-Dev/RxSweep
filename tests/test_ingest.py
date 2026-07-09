from pathlib import Path

import pytest

from rxsweep.ingest import load_formulary

FIX = Path(__file__).parent / "fixtures" / "mini_formulary.csv"


def test_column_detection_and_counts():
    fl = load_formulary(FIX)
    assert fl.columns == {"ndc": "NDC", "name": "Description"}
    assert len(fl.items) == 4  # all rows with a name survive
    assert len(fl.quarantined) == 2  # empty name; invalid ndc


def test_invalid_ndc_kept_for_name_matching():
    fl = load_formulary(FIX)
    lis = next(i for i in fl.items if i.name == "Lisinopril")
    assert lis.ndc is None
    assert any("invalid ndc" in q.reason for q in fl.quarantined)


def test_missing_ndc_ok():
    fl = load_formulary(FIX)
    met = next(i for i in fl.items if "Metformin" in i.name)
    assert met.ndc is None


def test_row_numbers_are_csv_line_numbers():
    fl = load_formulary(FIX)
    cef = next(i for i in fl.items if "Cefazolin" in i.name)
    assert cef.row == 2  # header is line 1


def test_item_number_does_not_shadow_drug_name():
    f = FIX.parent / "priority.csv"
    f.write_text("NDC,Item Number,Drug Name,Qty\n0409-4058-01,10023,Cefazolin Sodium,5\n")
    try:
        fl = load_formulary(f)
        assert fl.columns["name"] == "Drug Name"
        assert fl.items[0].name == "Cefazolin Sodium"
    finally:
        f.unlink()


def test_undetectable_columns_raise():
    bad = FIX.parent / "no_columns.csv"
    bad.write_text("Foo,Bar\n1,2\n")
    try:
        with pytest.raises(ValueError, match="Could not detect"):
            load_formulary(bad)
    finally:
        bad.unlink()
