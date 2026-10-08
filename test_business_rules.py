import os
import io
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.app.database import Base, get_db
from backend.app.main import app
from backend.app.models import User, Balance, Business, Task, TaskPrice, TaskCompletion, DailyTaskSession
from backend.app.auth.jwt import get_password_hash

# Setup test in-memory SQLite database
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_terrkeet.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

@pytest.fixture(scope="module", autouse=True)
def setup_database():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    
    # Create Financial Dept User
    fin_admin = User(
        email="test_finance@terrkeet.com",
        full_name="Financial Admin",
        hashed_password=get_password_hash("Finance123!"),
        role="FINANCIAL_DEPARTMENT"
    )
    db.add(fin_admin)
    db.flush()
    db.add(Balance(user_id=fin_admin.id, bonus_balance=0.0, earning_balance=0.0))

    # Create Worker 1
    w1 = User(
        email="worker1@test.com",
        full_name="Test Worker One",
        hashed_password=get_password_hash("Worker123!"),
        role="WORKER"
    )
    # Create Worker 2
    w2 = User(
        email="worker2@test.com",
        full_name="Test Worker Two",
        hashed_password=get_password_hash("Worker123!"),
        role="WORKER"
    )
    db.add_all([w1, w2])
    db.flush()
    db.add(Balance(user_id=w1.id, bonus_balance=20.0, earning_balance=50.0))
    db.add(Balance(user_id=w2.id, bonus_balance=10.0, earning_balance=15.0))

    # Daily Session OPEN
    session = DailyTaskSession(status="OPEN", changed_by_id=fin_admin.id, note="Tests Init")
    db.add(session)

    # Businesses
    b1 = Business(name="Test Cafe", category="Dining", address="123 Test St", rating_guidelines="Good food")
    b2 = Business(name="Test Gym", category="Fitness", address="456 Fit St", rating_guidelines="Clean gym")
    db.add_all([b1, b2])
    db.flush()

    # Tasks
    t1 = Task(business_id=b1.id, title="Rate Test Cafe", instructions="Give 5 stars", required_stars=5)
    t2 = Task(business_id=b1.id, title="Another Review of Test Cafe", instructions="Give 5 stars", required_stars=5)
    t3 = Task(business_id=b2.id, title="Rate Test Gym", instructions="Give 5 stars", required_stars=5)
    db.add_all([t1, t2, t3])
    db.flush()

    # User-specific pricing: Worker 1 gets $4.00 for T1; Worker 2 gets $9.00 for T1
    p1 = TaskPrice(task_id=t1.id, worker_id=w1.id, amount=4.00, created_by_id=fin_admin.id)
    p2 = TaskPrice(task_id=t1.id, worker_id=w2.id, amount=9.00, created_by_id=fin_admin.id)
    p3 = TaskPrice(task_id=t3.id, worker_id=w1.id, amount=6.50, created_by_id=fin_admin.id)
    db.add_all([p1, p2, p3])

    db.commit()
    db.close()

    yield

    Base.metadata.drop_all(bind=engine)
    if os.path.exists("./test_terrkeet.db"):
        os.remove("./test_terrkeet.db")

client = TestClient(app)

def test_1_worker_registration():
    res = client.post("/api/auth/register", json={
        "email": "new_worker@test.com",
        "full_name": "Newbie Worker",
        "password": "Password123!",
        "role": "WORKER"
    })
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["role"] == "WORKER"

def test_2_login_and_roles():
    # Login worker
    res = client.post("/api/auth/login", json={
        "email": "worker1@test.com",
        "password": "Worker123!"
    })
    assert res.status_code == 200
    w_token = res.json()["access_token"]

    # Login finance admin
    res_fin = client.post("/api/auth/login", json={
        "email": "test_finance@terrkeet.com",
        "password": "Finance123!"
    })
    assert res_fin.status_code == 200
    fin_token = res_fin.json()["access_token"]

    # Worker attempts to access financial stats -> 403 Forbidden
    res_forbidden = client.get("/api/financial/dashboard-stats", headers={"Authorization": f"Bearer {w_token}"})
    assert res_forbidden.status_code == 403

    # Finance admin accesses financial stats -> 200 OK
    res_ok = client.get("/api/financial/dashboard-stats", headers={"Authorization": f"Bearer {fin_token}"})
    assert res_ok.status_code == 200

def test_3_balance_adjustments_and_ledger():
    # Finance admin adjusts Worker 1's Bonus Balance
    res_fin = client.post("/api/auth/login", json={"email": "test_finance@terrkeet.com", "password": "Finance123!"})
    fin_token = res_fin.json()["access_token"]

    # Increase Bonus
    res = client.post("/api/financial/balances/adjust", headers={"Authorization": f"Bearer {fin_token}"}, json={
        "worker_id": 2, # w1 id
        "balance_type": "BONUS",
        "action": "INCREASE",
        "amount": 25.00,
        "reason": "Performance bonus"
    })
    assert res.status_code == 200
    tx = res.json()
    assert tx["transaction_type"] == "BONUS_CREDIT"
    assert tx["new_balance"] == 45.00

    # Decrease Earning Balance with insufficient funds -> 400 error
    res_err = client.post("/api/financial/balances/adjust", headers={"Authorization": f"Bearer {fin_token}"}, json={
        "worker_id": 2,
        "balance_type": "EARNING",
        "action": "DECREASE",
        "amount": 9999.00,
        "reason": "Should fail"
    })
    assert res_err.status_code == 400

def test_4_user_specific_pricing():
    # Worker 1 checks available tasks
    w1_res = client.post("/api/auth/login", json={"email": "worker1@test.com", "password": "Worker123!"})
    w1_token = w1_res.json()["access_token"]
    tasks_w1 = client.get("/api/tasks", headers={"Authorization": f"Bearer {w1_token}"}).json()
    t1_w1 = next(t for t in tasks_w1 if t["id"] == 1)
    assert t1_w1["user_price"] == 4.00

    # Worker 2 checks available tasks
    w2_res = client.post("/api/auth/login", json={"email": "worker2@test.com", "password": "Worker123!"})
    w2_token = w2_res.json()["access_token"]
    tasks_w2 = client.get("/api/tasks", headers={"Authorization": f"Bearer {w2_token}"}).json()
    t1_w2 = next(t for t in tasks_w2 if t["id"] == 1)
    assert t1_w2["user_price"] == 9.00

def test_5_task_completion_and_earning_credit():
    w1_res = client.post("/api/auth/login", json={"email": "worker1@test.com", "password": "Worker123!"})
    w1_token = w1_res.json()["access_token"]

    # Submit task completion with fake screenshot
    fake_img = io.BytesIO(b"fake-image-bytes-terrkeet-proof")
    res = client.post(
        "/api/tasks/1/complete",
        headers={"Authorization": f"Bearer {w1_token}"},
        data={"stars_given": 5, "review_text": "Phenomenal coffee and exquisite atmosphere!"},
        files={"screenshot": ("proof.png", fake_img, "image/png")}
    )
    assert res.status_code == 200
    comp = res.json()
    assert comp["earning_credited"] == 4.00

    # Verify worker's Earning balance increased by exactly $4.00 (from 50.00 to 54.00)
    me_res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {w1_token}"})
    assert me_res.json()["earning_balance"] == 54.00

def test_6_duplicate_task_completion_prevention():
    w1_res = client.post("/api/auth/login", json={"email": "worker1@test.com", "password": "Worker123!"})
    w1_token = w1_res.json()["access_token"]

    fake_img = io.BytesIO(b"fake-image-bytes")
    res = client.post(
        "/api/tasks/1/complete",
        headers={"Authorization": f"Bearer {w1_token}"},
        data={"stars_given": 5, "review_text": "Trying to complete same task again"},
        files={"screenshot": ("proof.png", fake_img, "image/png")}
    )
    assert res.status_code == 400
    assert "already completed" in res.json()["detail"].lower()

def test_7_duplicate_business_review_prevention():
    w1_res = client.post("/api/auth/login", json={"email": "worker1@test.com", "password": "Worker123!"})
    w1_token = w1_res.json()["access_token"]

    # Task 2 is also for Business 1 ("Test Cafe"), which Worker 1 already reviewed via Task 1!
    fake_img = io.BytesIO(b"fake-image-bytes")
    res = client.post(
        "/api/tasks/2/complete",
        headers={"Authorization": f"Bearer {w1_token}"},
        data={"stars_given": 5, "review_text": "Trying to review same business twice"},
        files={"screenshot": ("proof.png", fake_img, "image/png")}
    )
    assert res.status_code == 400
    assert "business review restriction" in res.json()["detail"].lower()

def test_8_closed_daily_tasks_enforcement():
    # Finance admin closes tasks
    fin_res = client.post("/api/auth/login", json={"email": "test_finance@terrkeet.com", "password": "Finance123!"})
    fin_token = fin_res.json()["access_token"]

    client.post("/api/financial/daily-task-control", headers={"Authorization": f"Bearer {fin_token}"}, json={
        "status": "CLOSED",
        "note": "Closing tasks for maintenance"
    })

    # Worker tries to complete Task 3 (Test Gym) while closed
    w1_res = client.post("/api/auth/login", json={"email": "worker1@test.com", "password": "Worker123!"})
    w1_token = w1_res.json()["access_token"]

    fake_img = io.BytesIO(b"fake-image-bytes")
    res = client.post(
        "/api/tasks/3/complete",
        headers={"Authorization": f"Bearer {w1_token}"},
        data={"stars_given": 5, "review_text": "Submitting during closed session"},
        files={"screenshot": ("proof.png", fake_img, "image/png")}
    )
    assert res.status_code == 403
    assert "Today's tasks are closed. Please return when tasks reopen." in res.json()["detail"]

    # Reopen tasks for subsequent tests
    client.post("/api/financial/daily-task-control", headers={"Authorization": f"Bearer {fin_token}"}, json={
        "status": "OPEN",
        "note": "Reopened tasks"
    })

def test_9_withdrawal_workflow_and_bonus_restriction():
    w1_res = client.post("/api/auth/login", json={"email": "worker1@test.com", "password": "Worker123!"})
    w1_token = w1_res.json()["access_token"]

    # Try to withdraw more than earning balance ($54.00)
    res_fail = client.post(
        "/api/tasks/withdraw",
        headers={"Authorization": f"Bearer {w1_token}"},
        json={"amount": 100.00, "payment_method": "BANK_TRANSFER", "payment_details": "IBAN123456"}
    )
    # The endpoint is handled in the unified router; check insufficient funds error
