import pytest

from rxsweep.matching import denormalize_ndc, normalize_ndc


@pytest.mark.parametrize(
    "raw,expected",
    [
        ("0409-4058-01", ["00409405801"]),  # 4-4-2 → pad labeler
        ("54868-0123-1", ["54868012301"]),  # 5-4-1 → pad package
        ("54868-123-01", ["54868012301"]),  # 5-3-2 → pad product
        ("54868012301", ["54868012301"]),  # already 11-digit
        ("54868-1230-01", ["54868123001"]),  # 5-4-2 given with hyphens
    ],
)
def test_unambiguous(raw, expected):
    n = normalize_ndc(raw)
    assert n.valid and not n.ambiguous and n.canonical == expected


def test_ambiguous_ten_digit_no_hyphens():
    n = normalize_ndc("5486801231")
    assert n.valid and n.ambiguous
    assert set(n.canonical) == {"05486801231", "54868001231", "54868012301"}


@pytest.mark.parametrize("raw", ["", "abc", "123", "12345-6789-012-3", "1234-567-89"])
def test_invalid(raw):
    n = normalize_ndc(raw)
    assert not n.valid and n.canonical == []


def test_whitespace_tolerated():
    n = normalize_ndc("  0409-4058-01 ")
    assert n.valid and n.canonical == ["00409405801"]


def test_denormalize_roundtrip():
    # 00409405801 came from 0409-4058-01 (4-4-2)
    assert "0409-4058-01" in denormalize_ndc("00409405801")
    for c in denormalize_ndc("54868012301"):
        assert len(c.replace("-", "")) == 10


def test_denormalize_no_padded_zero():
    # no segment starts with 0 → no valid 10-digit original exists
    assert denormalize_ndc("54868123412") == []
