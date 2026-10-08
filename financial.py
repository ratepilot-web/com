from typing import List, Optional
from datetime import datetime, date
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from backend.app.database import get_db
from backend.app.models.user import User, Balance
from backend.app.models.task import Task, Business, TaskPrice, TaskCompletion
from backend.app.models.ledger import BalanceTransaction, Withdrawal
from backend.app.models.system import DailyTaskSession, AuditLog, Notification
from backend.app.schemas.finance import (
    BalanceAdjustmentRequest,
    BalanceTransactionOut,
    WithdrawalProcess,
    WithdrawalOut,
    DailyTaskStatusChange,
    DailyTaskSessionOut,
    AuditLogOut,
)
from backend.app.schemas.task import TaskPriceCreate, TaskPriceOut, TaskCompletionOut
from backend.app.auth.jwt import require_role
from backend.app.services.ledger_service import adjust_worker_balance
from backend.app.utils.audit import log_audit

router = APIRouter(prefix="/financial", tags=["financial"])
financial_required = require_role("FINANCIAL_DEPARTMENT")

@router.get("/dashboard-stats")
def get_dashboard_stats(
    current_user: User = Depends(financial_required),
    db: Session = Depends(get_db)
):
    total_workers = db.query(User).filter(User.role == "WORKER").count()
    
    today_start = datetime.combine(date.today(), datetime.min.time())
    tasks_today = db.query(TaskCompletion).filter(TaskCompletion.completed_at >= today_start).count()
    
    earnings_today_row = db.query(func.sum(TaskCompletion.earning_credited)).filter(TaskCompletion.completed_at >= today_start).first()
    total_earnings_today = float(earnings_today_row[0] or 0.0)

    pending_withdrawals = db.query(Withdrawal).filter(Withdrawal.status == "PENDING").count()

    latest_session = db.query(DailyTaskSession).order_by(DailyTaskSession.id.desc()).first()
    daily_status = latest_session.status if latest_session else "OPEN"

    return {
        "total_workers": total_workers,
        "tasks_completed_today": tasks_today,
        "total_earnings_today": total_earnings_today,
        "pending_withdrawals": pending_withdrawals,
        "daily_task_status": daily_status,
        "latest_session": {
            "status": daily_status,
            "changed_by": latest_session.changed_by.full_name if (latest_session and latest_session.changed_by) else "System",
            "updated_at": latest_session.updated_at if latest_session else None,
            "note": latest_session.note if latest_session else None
        } if latest_session else None
    }

@router.get("/workers")
def list_workers(
    query: Optional[str] = None,
    current_user: User = Depends(financial_required),
    db: Session = Depends(get_db)
):
    q = db.query(User).filter(User.role == "WORKER")
    if query:
        pattern = f"%{query}%"
        q = q.filter((User.full_name.ilike(pattern)) | (User.email.ilike(pattern)))
    workers = q.all()

    result = []
    for w in workers:
        bal = w.balance
        tasks_count = db.query(TaskCompletion).filter(TaskCompletion.worker_id == w.id).count()
        result.append({
            "id": w.id,
            "email": w.email,
            "full_name": w.full_name,
            "is_active": w.is_active,
            "created_at": w.created_at,
            "bonus_balance": float(bal.bonus_balance) if bal else 0.0,
            "earning_balance": float(bal.earning_balance) if bal else 0.0,
            "completed_tasks_count": tasks_count,
        })
    return result

@router.post("/balances/adjust", response_model=BalanceTransactionOut)
def adjust_balance(
    req: BalanceAdjustmentRequest,
    current_user: User = Depends(financial_required),
    db: Session = Depends(get_db)
):
    tx = adjust_worker_balance(
        db=db,
        worker_id=req.worker_id,
        balance_type=req.balance_type,
        action=req.action,
        amount=req.amount,
        reason=req.reason,
        performed_by_id=current_user.id
    )

    # Notify worker
    direction = "increased" if req.action == "INCREASE" else "decreased"
    notif = Notification(
        user_id=req.worker_id,
        title=f"{req.balance_type.capitalize()} Balance {direction.capitalize()}",
        message=f"Financial Dept {direction} your {req.balance_type.lower()} balance by ${req.amount:.2f}. Reason: {req.reason}",
        type="INFO"
    )
    db.add(notif)
    db.commit()

    return BalanceTransactionOut(
        id=tx.id,
        transaction_id=tx.transaction_id,
        worker_id=tx.worker_id,
        worker_name=tx.worker.full_name if tx.worker else None,
        balance_type=tx.balance_type,
        transaction_type=tx.transaction_type,
        amount=float(tx.amount),
        previous_balance=float(tx.previous_balance),
        new_balance=float(tx.new_balance),
        reason=tx.reason,
        performed_by_id=tx.performed_by_id,
        performed_by_name=current_user.full_name,
        created_at=tx.created_at
    )

@router.post("/tasks/price", response_model=TaskPriceOut)
def set_task_price(
    price_in: TaskPriceCreate,
    current_user: User = Depends(financial_required),
    db: Session = Depends(get_db)
):
    worker = db.query(User).filter(User.id == price_in.worker_id, User.role == "WORKER").first()
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found")

    task = db.query(Task).filter(Task.id == price_in.task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    price_entry = db.query(TaskPrice).filter(
        TaskPrice.task_id == price_in.task_id,
        TaskPrice.worker_id == price_in.worker_id
    ).first()

    old_price = float(price_entry.amount) if price_entry else None

    if price_entry:
        price_entry.amount = Decimal(str(price_in.amount)).quantize(Decimal("0.01"))
        price_entry.created_by_id = current_user.id
        price_entry.updated_at = datetime.utcnow()
    else:
        price_entry = TaskPrice(
            task_id=price_in.task_id,
            worker_id=price_in.worker_id,
            amount=Decimal(str(price_in.amount)).quantize(Decimal("0.01")),
            created_by_id=current_user.id
        )
        db.add(price_entry)

    log_audit(
        db=db,
        action="TASK_PRICE_CHANGE",
        entity_type="TASK_PRICE",
        entity_id=f"W{price_in.worker_id}_T{price_in.task_id}",
        user_id=current_user.id,
        details={
            "worker_id": price_in.worker_id,
            "task_id": price_in.task_id,
            "old_price": old_price,
            "new_price": price_in.amount
        }
    )

    db.commit()
    db.refresh(price_entry)

    return TaskPriceOut(
        id=price_entry.id,
        task_id=price_entry.task_id,
        worker_id=price_entry.worker_id,
        amount=float(price_entry.amount),
        created_by_id=price_entry.created_by_id,
        created_at=price_entry.created_at,
        updated_at=price_entry.updated_at
    )

@router.get("/tasks/prices")
def get_task_prices(
    worker_id: Optional[int] = None,
    current_user: User = Depends(financial_required),
    db: Session = Depends(get_db)
):
    q = db.query(TaskPrice)
    if worker_id:
        q = q.filter(TaskPrice.worker_id == worker_id)
    prices = q.all()

    return [
        {
            "id": p.id,
            "task_id": p.task_id,
            "task_title": p.task.title,
            "worker_id": p.worker_id,
            "worker_name": p.worker.full_name,
            "amount": float(p.amount),
            "updated_at": p.updated_at
        }
        for p in prices
    ]

@router.post("/daily-task-control", response_model=DailyTaskSessionOut)
def toggle_daily_tasks(
    status_in: DailyTaskStatusChange,
    current_user: User = Depends(financial_required),
    db: Session = Depends(get_db)
):
    session = DailyTaskSession(
        status=status_in.status,
        changed_by_id=current_user.id,
        note=status_in.note or f"Tasks marked {status_in.status} by {current_user.full_name}"
    )
    db.add(session)

    action_type = "DAILY_TASKS_OPENED" if status_in.status == "OPEN" else "DAILY_TASKS_CLOSED"
    log_audit(
        db=db,
        action=action_type,
        entity_type="DAILY_TASK_CONTROL",
        entity_id=status_in.status,
        user_id=current_user.id,
        details={
            "status": status_in.status,
            "changed_by": current_user.full_name,
            "note": status_in.note
        }
    )

    db.commit()
    db.refresh(session)

    return DailyTaskSessionOut(
        id=session.id,
        status=session.status,
        changed_by_id=session.changed_by_id,
        changed_by_name=current_user.full_name,
        note=session.note,
        updated_at=session.updated_at
    )

@router.get("/withdrawals", response_model=List[WithdrawalOut])
def get_all_withdrawals(
    current_user: User = Depends(financial_required),
    db: Session = Depends(get_db)
):
    withdrawals = db.query(Withdrawal).order_by(Withdrawal.requested_at.desc()).all()
    return [
        WithdrawalOut(
            id=w.id,
            withdrawal_id=w.withdrawal_id,
            worker_id=w.worker_id,
            worker_name=w.worker.full_name if w.worker else None,
            amount=float(w.amount),
            payment_method=w.payment_method,
            payment_details=w.payment_details,
            status=w.status,
            rejection_reason=w.rejection_reason,
            processed_by_id=w.processed_by_id,
            requested_at=w.requested_at,
            processed_at=w.processed_at
        )
        for w in withdrawals
    ]

@router.post("/withdrawals/{withdrawal_id}/process", response_model=WithdrawalOut)
def process_withdrawal(
    withdrawal_id: str,
    process_in: WithdrawalProcess,
    current_user: User = Depends(financial_required),
    db: Session = Depends(get_db)
):
    wd = db.query(Withdrawal).filter(Withdrawal.withdrawal_id == withdrawal_id).first()
    if not wd:
        raise HTTPException(status_code=404, detail="Withdrawal request not found")

    if wd.status != "PENDING":
        raise HTTPException(
            status_code=400,
            detail=f"Withdrawal request has already been processed with status {wd.status}"
        )

    wd.status = process_in.status
    wd.processed_by_id = current_user.id
    wd.processed_at = datetime.utcnow()

    if process_in.status == "REJECTED":
        wd.rejection_reason = process_in.rejection_reason or "Rejected by Financial Department"
        # Reverse funds back to earning balance
        balance = db.query(Balance).filter(Balance.user_id == wd.worker_id).with_for_update().first()
        if balance:
            prev_balance = Decimal(str(balance.earning_balance))
            amount_dec = Decimal(str(wd.amount))
            new_balance = prev_balance + amount_dec
            balance.earning_balance = new_balance

            reversal_tx = BalanceTransaction(
                worker_id=wd.worker_id,
                balance_type="EARNING",
                transaction_type="WITHDRAWAL_REVERSAL",
                amount=amount_dec,
                previous_balance=prev_balance,
                new_balance=new_balance,
                reason=f"Reversal of rejected withdrawal {wd.withdrawal_id}: {wd.rejection_reason}",
                performed_by_id=current_user.id
            )
            db.add(reversal_tx)

    log_audit(
        db=db,
        action="WITHDRAWAL_PROCESSED",
        entity_type="WITHDRAWAL",
        entity_id=wd.withdrawal_id,
        user_id=current_user.id,
        details={
            "worker_id": wd.worker_id,
            "status": wd.status,
            "rejection_reason": wd.rejection_reason,
            "processed_by": current_user.full_name
        }
    )

    db.commit()
    db.refresh(wd)

    return WithdrawalOut(
        id=wd.id,
        withdrawal_id=wd.withdrawal_id,
        worker_id=wd.worker_id,
        worker_name=wd.worker.full_name if wd.worker else None,
        amount=float(wd.amount),
        payment_method=wd.payment_method,
        payment_details=wd.payment_details,
        status=wd.status,
        rejection_reason=wd.rejection_reason,
        processed_by_id=wd.processed_by_id,
        requested_at=wd.requested_at,
        processed_at=wd.processed_at
    )

@router.get("/transactions", response_model=List[BalanceTransactionOut])
def get_all_transactions(
    worker_id: Optional[int] = None,
    current_user: User = Depends(financial_required),
    db: Session = Depends(get_db)
):
    q = db.query(BalanceTransaction).order_by(BalanceTransaction.created_at.desc())
    if worker_id:
        q = q.filter(BalanceTransaction.worker_id == worker_id)
    txs = q.limit(100).all()

    return [
        BalanceTransactionOut(
            id=tx.id,
            transaction_id=tx.transaction_id,
            worker_id=tx.worker_id,
            worker_name=tx.worker.full_name if tx.worker else None,
            balance_type=tx.balance_type,
            transaction_type=tx.transaction_type,
            amount=float(tx.amount),
            previous_balance=float(tx.previous_balance),
            new_balance=float(tx.new_balance),
            reason=tx.reason,
            performed_by_id=tx.performed_by_id,
            performed_by_name=tx.performed_by.full_name if tx.performed_by else None,
            created_at=tx.created_at
        )
        for tx in txs
    ]
