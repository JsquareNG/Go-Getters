
def test_app_imports():
    from backend.main import app
    assert app is not None