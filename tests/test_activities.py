import pytest
from fastapi.testclient import TestClient

from src.app import app, activities

client = TestClient(app)


def test_get_activities():
    res = client.get("/activities")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, dict)
    # Expect some known activity keys
    assert "Chess Club" in data


def test_signup_and_duplicate():
    activity = "Soccer Team"
    email = "tester@mergington.edu"

    # Ensure clean state: if already present remove
    if email in activities[activity]["participants"]:
        activities[activity]["participants"].remove(email)

    # Signup should succeed
    res = client.post(f"/activities/{activity}/signup?email={email}")
    assert res.status_code == 200
    assert email in activities[activity]["participants"]

    # Duplicate signup should return 400
    res2 = client.post(f"/activities/{activity}/signup?email={email}")
    assert res2.status_code == 400


def test_remove_participant_and_not_found():
    activity = "Soccer Team"
    email = "remove_me@mergington.edu"

    # Ensure participant exists
    if email not in activities[activity]["participants"]:
        activities[activity]["participants"].append(email)

    # Remove should succeed
    res = client.delete(f"/activities/{activity}/participants?email={email}")
    assert res.status_code == 200
    assert email not in activities[activity]["participants"]

    # Removing again should return 404
    res2 = client.delete(f"/activities/{activity}/participants?email={email}")
    assert res2.status_code == 404
