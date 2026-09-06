"""Unit tests for app configuration parsing (pure, no DB/HTTP)."""

from app.core.config import Settings


class TestCorsOriginsList:
    def test_splits_and_strips_comma_separated_origins(self):
        settings = Settings(cors_origins=" http://a.com , http://b.com ")

        assert settings.cors_origins_list == ["http://a.com", "http://b.com"]

    def test_drops_empty_entries(self):
        settings = Settings(cors_origins="http://a.com,,  ,")

        assert settings.cors_origins_list == ["http://a.com"]

    def test_single_origin(self):
        settings = Settings(cors_origins="http://localhost:5173")

        assert settings.cors_origins_list == ["http://localhost:5173"]


class TestIsProduction:
    def test_true_when_environment_is_production_case_insensitive(self):
        assert Settings(environment="production").is_production is True
        assert Settings(environment="Production").is_production is True

    def test_false_for_development_and_other_values(self):
        assert Settings(environment="development").is_production is False
        assert Settings(environment="staging").is_production is False
