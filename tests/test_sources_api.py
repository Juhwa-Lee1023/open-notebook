from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def client():
    from api.main import app

    return TestClient(app)


class TestSourceListFilters:
    @patch("api.routers.sources.repo_query", new_callable=AsyncMock)
    def test_get_sources_applies_search_and_type_filters(self, mock_repo_query, client):
        mock_repo_query.return_value = [
            {
                "id": "source:abc123",
                "title": "Locker Wiki Guide",
                "topics": [],
                "asset": {"url": "https://wiki.example.com/page"},
                "created": "2026-01-01T00:00:00Z",
                "updated": "2026-01-02T00:00:00Z",
                "insights_count": 2,
                "embedded": True,
                "command": None,
            }
        ]

        response = client.get(
            "/api/sources",
            params={
                "search": "locker",
                "source_type": "link",
                "sort_by": "updated",
                "sort_order": "desc",
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["title"] == "Locker Wiki Guide"

        query, params = mock_repo_query.await_args.args
        assert "title @1@ $search_query" in query
        assert "asset.url != NONE" in query
        assert "ORDER BY updated DESC" in query
        assert params["search_query"] == "locker"

    def test_get_sources_rejects_invalid_source_type(self, client):
        response = client.get("/api/sources", params={"source_type": "audio"})

        assert response.status_code == 400
        assert response.json()["detail"] == (
            "source_type must be 'all', 'link', 'file', or 'text'"
        )
