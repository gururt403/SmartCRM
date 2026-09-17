"""A salesperson must not see or touch another rep's records."""

import pytest


@pytest.fixture()
def rep_client(app, admin):
    client = app.test_client()
    client.post("/api/v1/auth/register", json={"name": "Rep Two", "email": "rep2@test.local", "password": "Password123"})
    client.post("/api/v1/auth/login", json={"email": "rep2@test.local", "password": "Password123"})
    return client


def test_rep_cannot_see_admin_lead(auth_client, rep_client):
    lead_id = auth_client.post("/api/v1/leads", json={"name": "Private Lead", "email": "p@x.com", "company": "X"}).get_json()["data"]["id"]
    assert rep_client.get(f"/api/v1/leads/{lead_id}").status_code == 404
    assert rep_client.get("/api/v1/leads").get_json()["meta"]["pagination"]["total"] == 0


def test_rep_cannot_update_admin_lead(auth_client, rep_client):
    lead_id = auth_client.post("/api/v1/leads", json={"name": "Private Lead", "email": "p2@x.com", "company": "X"}).get_json()["data"]["id"]
    assert rep_client.patch(f"/api/v1/leads/{lead_id}", json={"name": "Hijacked"}).status_code == 404
    assert rep_client.delete(f"/api/v1/leads/{lead_id}").status_code == 404


def test_rep_cannot_assign_lead_to_someone_else(rep_client):
    body = rep_client.post("/api/v1/leads", json={"name": "Own Lead", "email": "own@x.com", "company": "X", "owner_id": 1}).get_json()
    assert body["data"]["owner_id"] != 1


def test_users_endpoint_is_admin_only(rep_client, auth_client):
    assert rep_client.get("/api/v1/auth/users").status_code == 403
    assert auth_client.get("/api/v1/auth/users").status_code == 200
