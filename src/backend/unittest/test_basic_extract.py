import pytest
from pydantic import ValidationError

from backend.models.basic_extract import (
    NIBExtractionData,
    KBLIDetail,
    ACRABasicInfoData,
    BasicPerson,
    BASIC_INFO_SCHEMA_REGISTRY,
)

# -----------------------------
# Test NIB Validation
# -----------------------------
def test_valid_nib():
    data = NIBExtractionData(
        company_name="Test Co",
        nib_number="1234567890123",
        company_status="PMA",
        address="Test Address"
    )
    assert data.nib_number == "1234567890123"


def test_invalid_nib_raises():
    with pytest.raises(ValidationError):
        NIBExtractionData(
            company_name="Test Co",
            nib_number="12345",  # invalid (not 13 digits)
            company_status="PMA",
            address="Test Address"
        )


def test_nib_cleans_non_digits():
    data = NIBExtractionData(
        company_name="Test Co",
        nib_number="123-456-789-0123",
        company_status="PMA",
        address="Test Address"
    )
    assert data.nib_number == "1234567890123"


# -----------------------------
# Test KBLI Codes
# -----------------------------
def test_valid_kbli_codes():
    data = NIBExtractionData(
        company_name="Test",
        nib_number="1234567890123",
        company_status="PMA",
        address="Addr",
        kbli_codes=["12345", "67890"]
    )

    assert data.kbli_codes == ["12345", "67890"]


def test_kbli_invalid_code_raises():
    with pytest.raises(ValidationError):
        NIBExtractionData(
            company_name="Test",
            nib_number="1234567890123",
            company_status="PMA",
            address="Addr",
            kbli_codes=["1234"]  # invalid (not 5 digits)
        )


def test_kbli_filters_empty_values():
    data = NIBExtractionData(
        company_name="Test",
        nib_number="1234567890123",
        company_status="PMA",
        address="Addr",
        kbli_codes=["12345", "", "67890"]
    )

    assert data.kbli_codes == ["12345", "67890"]


# -----------------------------
# Test KBLI Detail Validator
# -----------------------------
def test_valid_kbli_detail():
    detail = KBLIDetail(
        kbli_code="12345",
        kbli_title="Test",
        business_location="SG"
    )

    assert detail.kbli_code == "12345"


def test_kbli_detail_invalid_code():
    with pytest.raises(ValidationError):
        KBLIDetail(
            kbli_code="1234",  # invalid
            kbli_title="Test",
            business_location="SG"
        )


# -----------------------------
# Test UEN Validation
# -----------------------------
def test_valid_uen():
    data = ACRABasicInfoData(
        entity_type="PRIVATE_LIMITED_COMPANY",
        business_name="Test Co",
        uen="123456789A",
        date_of_registration="01-01-2020",
        business_status="Live",
        registered_address="SG"
    )

    assert len(data.uen) >= 9


def test_invalid_uen():
    with pytest.raises(ValidationError):
        ACRABasicInfoData(
            entity_type="PRIVATE_LIMITED_COMPANY",
            business_name="Test Co",
            uen="123",  # invalid
            date_of_registration="01-01-2020",
            business_status="Live",
            registered_address="SG"
        )


def test_uen_cleans_format():
    data = ACRABasicInfoData(
        entity_type="PRIVATE_LIMITED_COMPANY",
        business_name="Test Co",
        uen="  123-456-789  ",
        date_of_registration="01-01-2020",
        business_status="Live",
        registered_address="SG"
    )

    # should strip symbols and uppercase
    assert data.uen.isalnum()


# -----------------------------
# Test BasicPerson
# -----------------------------
def test_basic_person_defaults():
    person = BasicPerson()

    assert person.full_name == ""
    assert person.id_number == ""
    assert person.nationality == ""


# -----------------------------
# Test Schema Registry
# -----------------------------
def test_schema_registry():
    assert "NIB" in BASIC_INFO_SCHEMA_REGISTRY
    assert "ACRA" in BASIC_INFO_SCHEMA_REGISTRY

    assert BASIC_INFO_SCHEMA_REGISTRY["NIB"] == NIBExtractionData
    assert BASIC_INFO_SCHEMA_REGISTRY["ACRA"] == ACRABasicInfoData