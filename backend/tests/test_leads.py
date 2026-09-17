import pytest

LEAD = {"name": "Test Lead", "email": "lead@example.com", "company": "Acme", "budget": 1000}


def create(client, **overrides):
    return client.post("/api/v1/leads", json={**LEAD, **overrides})


def test_create_and_list(auth_client):
    assert create(auth_client).status_code == 201
    body = auth_client.get("/api/v1/leads").get_json()
    assert body["success"] is True
    assert body["meta"]["pagination"]["total"] == 1
    assert body["data"][0]["name"] == "Test Lead"


def test_create_requires_fields(auth_client):
    response = auth_client.post("/api/v1/leads", json={"name": "x"})
    assert response.status_code == 422
    details = response.get_json()["error"]["details"]
    assert set(details) >= {"email", "company"}


def test_rejects_invalid_status(auth_client):
    response = create(auth_client, email="a@b.com", status="Banana")
    assert response.status_code == 422


def test_rejects_negative_budget(auth_client):
    response = create(auth_client, email="neg@b.com", budget=-5)
    assert response.status_code == 422


def test_duplicate_email_conflicts(auth_client):
    create(auth_client)
    assert create(auth_client).status_code == 409


def test_invalid_status_transition_blocked(auth_client):
    lead_id = create(auth_client).get_json()["data"]["id"]
    response = auth_client.patch(f"/api/v1/leads/{lead_id}", json={"status": "Converted"})
    assert response.status_code == 422
    assert "status" in response.get_json()["error"]["details"]


def test_valid_transition_chain_and_conversion(auth_client):
    lead_id = create(auth_client).get_json()["data"]["id"]
    for status in ("Contacted", "Qualified", "Proposal", "Converted"):
        response = auth_client.patch(f"/api/v1/leads/{lead_id}", json={"status": status})
        assert response.status_code == 200, response.get_json()

    customers = auth_client.get("/api/v1/customers").get_json()["data"]
    assert [c["lead_id"] for c in customers] == [lead_id]
    pipeline = auth_client.get("/api/v1/deals/pipeline").get_json()["data"]
    won = next(stage for stage in pipeline if stage["key"] == "won")
    assert len(won["deals"]) == 1


def test_mass_assignment_is_ignored(auth_client):
    response = create(auth_client, id=999, churn_probability=0.99, created_at="1999-01-01")
    body = response.get_json()["data"]
    assert body["id"] != 999
    assert body["created_at"][:4] != "1999"


def test_missing_lead_returns_404(auth_client):
    assert auth_client.get("/api/v1/leads/4242").status_code == 404


def test_soft_delete_hides_lead(auth_client):
    lead_id = create(auth_client).get_json()["data"]["id"]
    assert auth_client.delete(f"/api/v1/leads/{lead_id}").status_code == 200
    assert auth_client.get(f"/api/v1/leads/{lead_id}").status_code == 404
    assert auth_client.get("/api/v1/leads").get_json()["meta"]["pagination"]["total"] == 0


def test_search_and_filter_run_server_side(auth_client):
    create(auth_client, name="Alpha Person", email="alpha@x.com", company="Alpha Co", status="New")
    create(auth_client, name="Beta Person", email="beta@x.com", company="Beta Co", status="New")
    auth_client.patch("/api/v1/leads/2", json={"status": "Contacted"})

    assert auth_client.get("/api/v1/leads?search=alpha").get_json()["meta"]["pagination"]["total"] == 1
    assert auth_client.get("/api/v1/leads?status=Contacted").get_json()["meta"]["pagination"]["total"] == 1


def test_pagination_meta(auth_client):
    for index in range(5):
        create(auth_client, email=f"p{index}@x.com")
    body = auth_client.get("/api/v1/leads?page=2&page_size=2").get_json()
    assert body["meta"]["pagination"] == {
        "page": 2, "page_size": 2, "total": 5, "total_pages": 3, "has_next": True, "has_previous": True,
    }


def test_sort_whitelist_rejects_injection(auth_client):
    response = auth_client.get("/api/v1/leads?sort_by=name;DROP TABLE leads")
    assert response.status_code == 422


def test_search_does_not_allow_sql_injection(auth_client):
    create(auth_client)
    response = auth_client.get("/api/v1/leads?search=' OR 1=1 --")
    assert response.status_code == 200
    assert response.get_json()["meta"]["pagination"]["total"] == 0
    assert auth_client.get("/api/v1/leads").get_json()["meta"]["pagination"]["total"] == 1


def test_activity_updates_lead_counters(auth_client):
    lead_id = create(auth_client).get_json()["data"]["id"]
    response = auth_client.post(f"/api/v1/leads/{lead_id}/activities", json={"type": "Call", "subject": "Intro call"})
    assert response.status_code == 201
    lead = auth_client.get(f"/api/v1/leads/{lead_id}").get_json()["data"]
    assert lead["interaction_count"] == 1
    assert len(lead["activities"]) == 1
