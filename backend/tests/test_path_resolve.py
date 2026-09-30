from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_resolve_path_by_creator_and_slug():
    response = client.get('/api/paths/resolve/miamitrader/7-day-scalp')

    assert response.status_code == 200, response.text
    payload = response.json()

    assert payload['creator']['handle'] == 'miamitrader'
    assert payload['creator']['verified'] is True
    assert payload['path']['slug'] == '7-day-scalp'
    assert payload['path']['title']
    assert payload['steps']
    assert payload['steps'][0]['title']
