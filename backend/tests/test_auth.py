def test_health(client):
    body = client.get("/api/health").get_json()
    assert body["success"] is True
    assert body["data"]["status"] == "ok"


def test_register_validates_password_length(client):
    response = client.post("/api/v1/auth/register", json={"name": "A B", "email": "a@b.com", "password": "short"})
    body = response.get_json()
    assert response.status_code == 422
    assert body["error"]["code"] == "VALIDATION_ERROR"
    assert "password" in body["error"]["details"]


def test_register_rejects_bad_email(client):
    response = client.post("/api/v1/auth/register", json={"name": "A B", "email": "nope", "password": "Password123"})
    assert response.status_code == 422


def test_register_then_login(client):
    client.post("/api/v1/auth/register", json={"name": "Rep One", "email": "rep@test.local", "password": "Password123"})
    response = client.post("/api/v1/auth/login", json={"email": "rep@test.local", "password": "Password123"})
    assert response.status_code == 200
    assert response.get_json()["data"]["user"]["role"] == "salesperson"


def test_self_registration_cannot_escalate_role(client):
    client.post("/api/v1/auth/register", json={"name": "Sneaky", "email": "s@test.local", "password": "Password123", "role": "admin"})
    body = client.post("/api/v1/auth/login", json={"email": "s@test.local", "password": "Password123"}).get_json()
    assert body["data"]["user"]["role"] == "salesperson"


def test_login_never_returns_password_hash(client, admin):
    body = client.post("/api/v1/auth/login", json=admin).get_json()
    assert "password_hash" not in body["data"]["user"]


def test_login_rejects_bad_password(client, admin):
    response = client.post("/api/v1/auth/login", json={"email": admin["email"], "password": "wrong"})
    assert response.status_code == 401
    assert response.get_json()["error"]["code"] == "AUTHENTICATION_ERROR"


def test_duplicate_email_conflicts(client):
    payload = {"name": "Dup User", "email": "dup@test.local", "password": "Password123"}
    client.post("/api/v1/auth/register", json=payload)
    response = client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 409


def test_protected_route_requires_auth(client):
    response = client.get("/api/v1/leads")
    assert response.status_code == 401
    assert response.get_json()["success"] is False


def test_rate_limit_blocks_brute_force(client, app, admin):
    app.config["AUTH_RATE_LIMIT"] = 3
    for _ in range(3):
        client.post("/api/v1/auth/login", json={"email": admin["email"], "password": "wrong"})
    response = client.post("/api/v1/auth/login", json={"email": admin["email"], "password": "wrong"})
    assert response.status_code == 429
