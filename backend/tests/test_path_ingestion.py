from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_ai_generate_path_from_text_source():
    response = client.post(
        '/api/paths/ai-generate',
        json={
            'source_type': 'text',
            'source_input': 'Write a 5-day creator sprint on building a weekly content system.',
            'domain': 'Creator',
        },
    )

    assert response.status_code == 200, response.text
    payload = response.json()

    assert payload['category'] in {'Creator', 'Fitness', 'Trading', 'AI & Tech'}
    assert payload['title']
    assert payload['steps']
    assert payload['steps'][0]['widget_data']
