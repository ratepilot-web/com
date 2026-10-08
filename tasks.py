from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models.user import User, Balance
from backend.app.models.task import Task, Business, TaskPrice, TaskCompletion
from backend.app.models.ledger import BalanceTransaction, Withdrawal
from backend.app.schemas.task import TaskOut, TaskCompletionOut
from backend.app.schemas.finance import BalanceTransactionOut, WithdrawalRequest, WithdrawalOut
from backend.app.auth.jwt import get_current_user, require_role
from backend.app.services.task_service import complete_task, check_daily_task_status
from backend.app.services.ledger_service import request_withdrawal

router = APIRouter(prefix="/tasks", tags=["tasks"])

@router.get("", response_model=List[TaskOut])
def get_available_tasks(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    tasks = db.query(Task).filter(Task.is_active == True).all()
    user_prices = {
        p.task_id: float(p.amount)
        for p in db.query(TaskPrice).filter(TaskPrice.worker_id == current_user.id).all()
    }
    completed_task_ids = {
        c.task_id
        for c in db.query(TaskCompletion).filter(TaskCompletion.worker_id == current_user.id).all()
    }
    reviewed_business_ids = {
        c.business_id
        for c in db.query(TaskCompletion).filter(TaskCompletion.worker_id == current_user.id).all()
    }

    result = []
    for t in tasks:
        result.append(
            TaskOut(
                id=t.id,
                business_id=t.business_id,
                business=t.business,
                title=t.title,
                instructions=t.instructions,
                required_stars=t.required_stars,
                is_active=t.is_active,
                user_price=user_prices.get(t.id),
                has_completed=t.id in completed_task_ids,
                has_reviewed_business=t.business_id in reviewed_business_ids,
            )
        )
    return result

@router.post("/{task_id}/complete", response_model=TaskCompletionOut)
def submit_task_completion(
    task_id: int,
    stars_given: int = Form(..., ge=1, le=5),
    review_text: str = Form(..., min_length=10),
    screenshot: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "WORKER":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only workers can complete tasks"
        )

    completion = complete_task(
        db=db,
        worker_id=current_user.id,
        task_id=task_id,
        stars_given=stars_given,
        review_text=review_text,
        screenshot_file=screenshot
    )

    task = db.query(Task).filter(Task.id == task_id).first()
    return TaskCompletionOut(
        id=completion.id,
        task_id=completion.task_id,
        worker_id=completion.worker_id,
        business_id=completion.business_id,
        stars_given=completion.stars_given,
        review_text=completion.review_text,
        screenshot_path=completion.screenshot_path,
        earning_credited=float(completion.earning_credited),
        completed_at=completion.completed_at,
        task_title=task.title if task else "",
        business_name=task.business.name if task and task.business else "",
    )

@router.get("/history", response_model=List[TaskCompletionOut])
def get_task_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    completions = (
        db.query(TaskCompletion)
        .filter(TaskCompletion.worker_id == current_user.id)
        .order_by(TaskCompletion.completed_at.desc())
        .all()
    )

    result = []
    for c in completions:
        result.append(
            TaskCompletionOut(
                id=c.id,
                task_id=c.task_id,
                worker_id=c.worker_id,
                business_id=c.business_id,
                stars_given=c.stars_given,
                review_text=c.review_text,
                screenshot_path=c.screenshot_path,
                earning_credited=float(c.earning_credited),
                completed_at=c.completed_at,
                task_title=c.task.title if c.task else "",
                business_name=c.business.name if c.business else "",
            )
        )
    return result

@router.get("/status")
def get_daily_status(db: Session = Depends(get_db)):
    status_str = check_daily_task_status(db)
    return {"daily_task_status": status_str}
