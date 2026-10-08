import os
import uuid
from typing import Tuple
from sqlalchemy.orm import Session
from fastapi import HTTPException, UploadFile
from backend.app.config import settings
from backend.app.models.task import Business, Task, TaskPrice, TaskCompletion
from backend.app.models.system import DailyTaskSession, Notification
from backend.app.services.ledger_service import credit_task_earning
from backend.app.utils.audit import log_audit

ALLOWED_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp"}

def check_daily_task_status(db: Session) -> str:
    session = db.query(DailyTaskSession).order_by(DailyTaskSession.id.desc()).first()
    if not session:
        return "OPEN"
    return session.status

def save_screenshot_proof(file: UploadFile, worker_id: int, task_id: int) -> str:
    if not file.filename:
        raise HTTPException(status_code=400, detail="Screenshot file is required")

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type '{ext}'. Only PNG, JPG, JPEG, and WEBP screenshots are accepted."
        )

    # Validate file size
    file.file.seek(0, 2)
    file_size = file.file.tell()
    file.file.seek(0)

    max_size_bytes = settings.MAX_FILE_SIZE_MB * 1024 * 1024
    if file_size > max_size_bytes:
        raise HTTPException(
            status_code=400,
            detail=f"File exceeds maximum allowed size of {settings.MAX_FILE_SIZE_MB}MB"
        )

    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    filename = f"proof_w{worker_id}_t{task_id}_{uuid.uuid4().hex[:8]}{ext}"
    dest_path = os.path.join(settings.UPLOAD_DIR, filename)

    with open(dest_path, "wb") as buffer:
        buffer.write(file.file.read())

    return filename

def complete_task(
    db: Session,
    worker_id: int,
    task_id: int,
    stars_given: int,
    review_text: str,
    screenshot_file: UploadFile
) -> TaskCompletion:
    # 1. Check daily task status
    daily_status = check_daily_task_status(db)
    if daily_status == "CLOSED":
        raise HTTPException(
            status_code=403,
            detail="Today's tasks are closed. Please return when tasks reopen."
        )

    # 2. Get task
    task = db.query(Task).filter(Task.id == task_id, Task.is_active == True).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found or is currently inactive")

    # 3. Check user-specific task price
    price_entry = db.query(TaskPrice).filter(
        TaskPrice.task_id == task_id,
        TaskPrice.worker_id == worker_id
    ).first()

    if not price_entry:
        raise HTTPException(
            status_code=400,
            detail="Task earning amount has not been configured for your account by the Financial Department."
        )

    earning_amount = float(price_entry.amount)

    # 4. Check if worker has already completed this task
    existing_completion = db.query(TaskCompletion).filter(
        TaskCompletion.worker_id == worker_id,
        TaskCompletion.task_id == task_id
    ).first()

    if existing_completion:
        raise HTTPException(status_code=400, detail="You have already completed this task.")

    # 5. Check business review restriction: A worker cannot review the same business more than once
    existing_business_review = db.query(TaskCompletion).filter(
        TaskCompletion.worker_id == worker_id,
        TaskCompletion.business_id == task.business_id
    ).first()

    if existing_business_review:
        raise HTTPException(
            status_code=400,
            detail=f"Business Review Restriction: You have already submitted a review for this business."
        )

    # 6. Validate & save screenshot proof
    screenshot_path = save_screenshot_proof(screenshot_file, worker_id=worker_id, task_id=task_id)

    # 7. Create task completion record
    completion = TaskCompletion(
        task_id=task_id,
        worker_id=worker_id,
        business_id=task.business_id,
        stars_given=stars_given,
        review_text=review_text,
        screenshot_path=screenshot_path,
        earning_credited=earning_amount
    )
    db.add(completion)
    db.flush()

    # 8. Credit task earning directly to EARNING BALANCE and record ledger transaction
    credit_task_earning(
        db=db,
        worker_id=worker_id,
        amount=earning_amount,
        task_id=task_id,
        task_title=task.title
    )

    # 9. Create notification for worker
    notification = Notification(
        user_id=worker_id,
        title="Task Completed Successfully!",
        message=f"You earned ${earning_amount:.2f} for reviewing '{task.business.name}'. Funds credited to Earning Balance.",
        type="SUCCESS"
    )
    db.add(notification)

    # 10. Audit log
    log_audit(
        db=db,
        action="TASK_COMPLETED",
        entity_type="TASK_COMPLETION",
        entity_id=str(completion.id),
        user_id=worker_id,
        details={
            "worker_id": worker_id,
            "task_id": task_id,
            "business_id": task.business_id,
            "earning_credited": earning_amount,
            "stars_given": stars_given
        }
    )

    db.commit()
    db.refresh(completion)
    return completion
