import pytest
from pydantic import ValidationError

from backend.models.extract import (
    NIBExtractionData,
    KBLIDetail,
    ACRAExtractionData,
    BasicPerson,
    DOCUMENT_SCHEMA_REGISTRY,
)


def test_valid_nib():
    data = NIBExtractionData(
        businessName="Test Co",
        registrationNumber="1234567890123",
        businessStatus="PMA",
        registeredAddress="Test Address",
    )
    assert data.registrationNumber == "1234567890123"


def test_invalid_nib_raises():
    with pytest.raises(ValidationError):
        NIBExtractionData(
            businessName="Test Co",
            registrationNumber="12345",  
            businessStatus="PMA",
            registeredAddress="Test Address",
        )


def test_nib_cleans_non_digits():
    data = NIBExtractionData(
        businessName="Test Co",
        registrationNumber="123-456-789-0123",
        businessStatus="PMA",
        registeredAddress="Test Address",
    )
    assert data.registrationNumber == "1234567890123"


def test_valid_kbli_codes():
    data = NIBExtractionData(
        businessName="Test",
        registrationNumber="1234567890123",
        businessStatus="PMA",
        registeredAddress="Addr",
        kbliCodes=["12345", "67890"],
    )

    assert data.kbliCodes == ["12345", "67890"]


def test_kbli_invalid_code_raises():
    with pytest.raises(ValidationError):
        NIBExtractionData(
            businessName="Test",
            registrationNumber="1234567890123",
            businessStatus="PMA",
            registeredAddress="Addr",
            kbliCodes=["1234"], 
        )


def test_kbli_filters_empty_values():
    data = NIBExtractionData(
        businessName="Test",
        registrationNumber="1234567890123",
        businessStatus="PMA",
        registeredAddress="Addr",
        kbliCodes=["12345", "", "67890"],
    )

    assert data.kbliCodes == ["12345", "67890"]


def test_valid_kbli_detail():
    detail = KBLIDetail(
        kbliCode="12345",
        kbliTitle="Test",
        businessLocation="SG",
    )

    assert detail.kbliCode == "12345"


def test_kbli_detail_invalid_code():
    with pytest.raises(ValidationError):
        KBLIDetail(
            kbliCode="1234",  
            kbliTitle="Test",
            businessLocation="SG",
        )


def test_valid_uen():
    data = ACRAExtractionData(
        entityType="PRIVATE LIMITED",
        businessName="Test Co",
        uen="123456789A",
        registrationDate="01-01-2020",
        registeredAddress="SG",
        businessIndustry="Software",
    )

    assert len(data.uen) >= 9


def test_invalid_uen():
    with pytest.raises(ValidationError):
        ACRAExtractionData(
            entityType="PRIVATE LIMITED",
            businessName="Test Co",
            uen="123", 
            registrationDate="01-01-2020",
            registeredAddress="SG",
            businessIndustry="Software",
        )


def test_uen_cleans_format():
    data = ACRAExtractionData(
        entityType="PRIVATE LIMITED",
        businessName="Test Co",
        uen="  123-456-789a  ",
        registrationDate="01-01-2020",
        registeredAddress="SG",
        businessIndustry="Software",
    )

    assert data.uen == "123456789A"


def test_basic_person_defaults():
    person = BasicPerson()

    assert person.fullName == ""
    assert person.idNumber == ""
    assert person.nationality == ""
    assert person.residentialAddress == ""
    assert person.dateOfBirth == ""



def test_schema_registry():
    assert "NIB" in DOCUMENT_SCHEMA_REGISTRY
    assert "ACRA" in DOCUMENT_SCHEMA_REGISTRY

    assert DOCUMENT_SCHEMA_REGISTRY["NIB"] == NIBExtractionData
    assert DOCUMENT_SCHEMA_REGISTRY["ACRA"] == ACRAExtractionData