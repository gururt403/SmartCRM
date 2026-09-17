def test_dashboard_kpis_are_computed_from_data(auth_client):
    auth_client.post("/api/v1/leads", json={"name": "Kpi Lead", "email": "k@x.com", "company": "K", "budget": 5000})
    body = auth_client.get("/api/v1/dashboard/summary").get_json()["data"]
    assert body["kpis"]["total_leads"] == 1
    assert body["kpis"]["open_leads"] == 1
    assert body["kpis"]["conversion_rate"] == 0.0
    assert any(source["name"] == "Website" for source in body["lead_sources"])


def test_dashboard_is_empty_not_fake_when_no_data(auth_client):
    kpis = auth_client.get("/api/v1/dashboard/summary").get_json()["data"]["kpis"]
    assert kpis["total_leads"] == 0
    assert kpis["revenue"] == 0
    assert kpis["pipeline_value"] == 0


def test_lead_score_updates_lead(auth_client):
    lead_id = auth_client.post("/api/v1/leads", json={
        "name": "Score Me", "email": "s@x.com", "company": "S", "budget": 90000,
        "response_rate": 0.8, "interaction_count": 15, "previous_purchases": 4,
    }).get_json()["data"]["id"]

    result = auth_client.post("/api/v1/predictions/lead-score", json={"lead_id": lead_id}).get_json()["data"]
    assert 0 <= result["probability"] <= 1
    assert result["source"] in {"model", "heuristic"}

    lead = auth_client.get(f"/api/v1/leads/{lead_id}").get_json()["data"]
    assert lead["conversion_probability"] == result["probability"]


def test_sentiment_requires_text(auth_client):
    assert auth_client.post("/api/v1/predictions/sentiment", json={}).status_code == 422


def test_sentiment_labels_text(auth_client):
    data = auth_client.post("/api/v1/predictions/sentiment", json={"text": "This is great, I love it"}).get_json()["data"]
    assert data["label"] in {"Positive", "Neutral", "Negative"}


def test_email_suggestions_match_keywords(auth_client):
    data = auth_client.post("/api/v1/predictions/email-suggestions", json={"message": "Can you send pricing?"}).get_json()["data"]
    assert len(data["suggestions"]) >= 1


def test_deal_stage_validation(auth_client):
    lead_id = auth_client.post("/api/v1/leads", json={"name": "Deal Lead", "email": "d@x.com", "company": "D"}).get_json()["data"]["id"]
    deal_id = auth_client.post("/api/v1/deals", json={"title": "Big deal", "lead_id": lead_id, "stage_key": "new", "value": 100}).get_json()["data"]["id"]

    assert auth_client.post(f"/api/v1/deals/{deal_id}/stage", json={"stage_key": "nope"}).status_code == 422
    assert auth_client.post(f"/api/v1/deals/{deal_id}/stage", json={"stage_key": "won"}).status_code == 200
    # Won is terminal.
    assert auth_client.post(f"/api/v1/deals/{deal_id}/stage", json={"stage_key": "proposal"}).status_code == 422


def test_deal_requires_a_relation(auth_client):
    assert auth_client.post("/api/v1/deals", json={"title": "Orphan", "stage_key": "new"}).status_code == 422


def test_error_responses_never_leak_internals(auth_client):
    body = auth_client.get("/api/v1/leads/999999").get_json()
    assert body["error"]["code"] == "NOT_FOUND"
    assert "Traceback" not in str(body)
