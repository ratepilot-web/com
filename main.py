import os
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from backend.app.config import settings
from backend.app.database import engine, Base, SessionLocal
from backend.app.models import User, Balance, Business, Task, TaskPrice, DailyTaskSession
from backend.app.routes import (
    auth_router,
    tasks_router,
    financial_router,
    audit_router,
    notifications_router,
)
from backend.app.auth.jwt import get_password_hash

# Create tables if not existing
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs"
)

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure upload directory exists
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# Include Routers
app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(tasks_router, prefix=settings.API_V1_STR)
app.include_router(financial_router, prefix=settings.API_V1_STR)
app.include_router(audit_router, prefix=settings.API_V1_STR)
app.include_router(notifications_router, prefix=settings.API_V1_STR)

@app.get("/")
def root():
    return {
        "app": "TERRKEET Task Earning Platform",
        "status": "online",
        "version": "1.0.0",
        "api_docs": f"{settings.API_V1_STR}/docs"
    }

@app.on_event("startup")
def seed_initial_data():
    db = SessionLocal()
    try:
        # Check if financial admin exists
        admin = db.query(User).filter(User.email == "finance@terrkeet.com").first()
        if not admin:
            admin = User(
                email="finance@terrkeet.com",
                full_name="Terrkeet Financial Officer",
                hashed_password=get_password_hash("FinanceSecure123!"),
                role="FINANCIAL_DEPARTMENT"
            )
            db.add(admin)
            db.flush()
            admin_bal = Balance(user_id=admin.id, bonus_balance=0.00, earning_balance=0.00)
            db.add(admin_bal)

        # Check demo worker
        worker = db.query(User).filter(User.email == "worker1@terrkeet.com").first()
        if not worker:
            worker = User(
                email="worker1@terrkeet.com",
                full_name="John Doe (Worker)",
                hashed_password=get_password_hash("WorkerPass123!"),
                role="WORKER"
            )
            db.add(worker)
            db.flush()
            worker_bal = Balance(user_id=worker.id, bonus_balance=50.00, earning_balance=120.00)
            db.add(worker_bal)

        # Check daily task session
        session = db.query(DailyTaskSession).first()
        if not session:
            session = DailyTaskSession(
                status="OPEN",
                changed_by_id=admin.id,
                note="System initialization - Tasks Opened"
            )
            db.add(session)

        # Sample businesses & tasks
        if db.query(Business).count() == 0:
            b1 = Business(
                name="Apex Gourmet Bistro",
                category="Hospitality & Dining",
                website="https://apexbistro.example.com",
                address="450 Grand Avenue, Downtown",
                description="Fine dining eatery specializing in farm-to-table culinary experiences.",
                rating_guidelines="Please focus review on ambiance, dish presentation, and waitstaff attentiveness."
            )
            b2 = Business(
                name="Luminary Tech Solutions",
                category="Technology & Software",
                website="https://luminarytech.example.com",
                address="100 Silicon Boulevard, Tech District",
                description="Cloud services and enterprise digital transformation provider.",
                rating_guidelines="Please review customer support responsiveness and cloud platform uptime."
            )
            b3 = Business(
                name="Horizon Fitness Club",
                category="Health & Wellness",
                website="https://horizonfit.example.com",
                address="220 Park Lane, Westside",
                description="24/7 premier athletic center with modern gym gear, Olympic pool, and personal training.",
                rating_guidelines="Review facility cleanliness, equipment diversity, and locker room amenities."
            )
            db.add_all([b1, b2, b3])
            db.flush()

            t1 = Task(
                business_id=b1.id,
                title="Rate & Review: Apex Gourmet Bistro",
                instructions="Review Apex Gourmet Bistro on Terrkeet. Provide a 5-star rating with constructive feedback. Capture a screenshot of your review screen and upload it as proof.",
                required_stars=5
            )
            t2 = Task(
                business_id=b2.id,
                title="Rate & Review: Luminary Tech Solutions",
                instructions="Leave an authentic 5-star rating detailing their enterprise support quality. Take a screenshot showing your rating confirmation and submit proof.",
                required_stars=5
            )
            t3 = Task(
                business_id=b3.id,
                title="Rate & Review: Horizon Fitness Club",
                instructions="Submit a 5-star review highlighting club cleanliness and training personnel. Upload your verified review snapshot.",
                required_stars=5
            )
            db.add_all([t1, t2, t3])
            db.flush()

            # Set user-specific prices for worker
            p1 = TaskPrice(task_id=t1.id, worker_id=worker.id, amount=4.50, created_by_id=admin.id)
            p2 = TaskPrice(task_id=t2.id, worker_id=worker.id, amount=6.00, created_by_id=admin.id)
            p3 = TaskPrice(task_id=t3.id, worker_id=worker.id, amount=8.25, created_by_id=admin.id)
            db.add_all([p1, p2, p3])

        db.commit()
    finally:
        db.close()
