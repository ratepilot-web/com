from decimal import Decimal
from typing import Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from backend.app.models.user import User, Balance
from backend.app.models.ledger import BalanceTransaction, Withdrawal
from backend.app.utils.audit import log_audit

def adjust_worker_balance(
    db: Session,
    worker_id: int,
    balance_type: str, # BONUS or EARNING
    action: str,       # INCREASE or DECREASE
    amount: float,
    reason: str,
    performed_by_id: Optional[int] = None
) -> BalanceTransaction:
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Adjustment amount must be greater than zero")

    worker = db.query(User).filter(User.id == worker_id, User.role == "WORKER").first()
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found")

    balance = db.query(Balance).filter(Balance.user_id == worker_id).with_for_update().first()
    if not balance:
        balance = Balance(user_id=worker_id, bonus_balance=0.00, earning_balance=0.00)
        db.add(balance)
        db.flush()

    amount_dec = Decimal(str(amount)).quantize(Decimal("0.01"))
    prev_balance = Decimal(str(balance.bonus_balance if balance_type == "BONUS" else balance.earning_balance))

    if action == "INCREASE":
        new_balance = prev_balance + amount_dec
        tx_type = "BONUS_CREDIT" if balance_type == "BONUS" else "EARNING_CREDIT"
    elif action == "DECREASE":
        if prev_balance < amount_dec:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient {balance_type.lower()} balance. Current balance is ${prev_balance:.2f}"
            )
        new_balance = prev_balance - amount_dec
        tx_type = "BONUS_DEBIT" if balance_type == "BONUS" else "EARNING_DEBIT"
    else:
        raise HTTPException(status_code=400, detail="Invalid action: must be INCREASE or DECREASE")

    # Update balance
    if balance_type == "BONUS":
        balance.bonus_balance = new_balance
    else:
        balance.earning_balance = new_balance

    # Create immutable transaction
    tx = BalanceTransaction(
        worker_id=worker_id,
        balance_type=balance_type,
        transaction_type=tx_type,
        amount=amount_dec,
        previous_balance=prev_balance,
        new_balance=new_balance,
        reason=reason,
        performed_by_id=performed_by_id
    )
    db.add(tx)
    db.flush()

    # Log to audit log
    log_audit(
        db=db,
        action="BALANCE_ADJUSTMENT",
        entity_type="BALANCE",
        entity_id=str(balance.id),
        user_id=performed_by_id,
        details={
            "worker_id": worker_id,
            "worker_email": worker.email,
            "balance_type": balance_type,
            "action": action,
            "amount": float(amount_dec),
            "previous_balance": float(prev_balance),
            "new_balance": float(new_balance),
            "reason": reason,
            "transaction_id": tx.transaction_id
        }
    )

    db.commit()
    db.refresh(tx)
    return tx

def credit_task_earning(
    db: Session,
    worker_id: int,
    amount: float,
    task_id: int,
    task_title: str
) -> BalanceTransaction:
    balance = db.query(Balance).filter(Balance.user_id == worker_id).with_for_update().first()
    if not balance:
        balance = Balance(user_id=worker_id, bonus_balance=0.00, earning_balance=0.00)
        db.add(balance)
        db.flush()

    amount_dec = Decimal(str(amount)).quantize(Decimal("0.01"))
    prev_balance = Decimal(str(balance.earning_balance))
    new_balance = prev_balance + amount_dec

    balance.earning_balance = new_balance

    tx = BalanceTransaction(
        worker_id=worker_id,
        balance_type="EARNING",
        transaction_type="TASK_EARNING",
        amount=amount_dec,
        previous_balance=prev_balance,
        new_balance=new_balance,
        reason=f"Task completed: {task_title} (Task #{task_id})",
        performed_by_id=worker_id
    )
    db.add(tx)
    db.flush()

    return tx

def request_withdrawal(
    db: Session,
    worker_id: int,
    amount: float,
    payment_method: str,
    payment_details: str
) -> Withdrawal:
    amount_dec = Decimal(str(amount)).quantize(Decimal("0.01"))
    if amount_dec <= Decimal("0.00"):
        raise HTTPException(status_code=400, detail="Withdrawal amount must be greater than zero")

    balance = db.query(Balance).filter(Balance.user_id == worker_id).with_for_update().first()
    if not balance:
        raise HTTPException(status_code=400, detail="Insufficient earning balance")

    prev_balance = Decimal(str(balance.earning_balance))
    if prev_balance < amount_dec:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient earning balance. Your withdrawable balance is ${prev_balance:.2f}. Bonus Balance cannot be withdrawn."
        )

    # Deduct from earning balance
    new_balance = prev_balance - amount_dec
    balance.earning_balance = new_balance

    withdrawal = Withdrawal(
        worker_id=worker_id,
        amount=amount_dec,
        payment_method=payment_method,
        payment_details=payment_details,
        status="PENDING"
    )
    db.add(withdrawal)
    db.flush()

    tx = BalanceTransaction(
        worker_id=worker_id,
        balance_type="EARNING",
        transaction_type="WITHDRAWAL",
        amount=amount_dec,
        previous_balance=prev_balance,
        new_balance=new_balance,
        reason=f"Withdrawal request {withdrawal.withdrawal_id} via {payment_method}",
        performed_by_id=worker_id
    )
    db.add(tx)

    log_audit(
        db=db,
        action="WITHDRAWAL_REQUEST",
        entity_type="WITHDRAWAL",
        entity_id=withdrawal.withdrawal_id,
        user_id=worker_id,
        details={
            "worker_id": worker_id,
            "amount": float(amount_dec),
            "payment_method": payment_method,
            "payment_details": payment_details
        }
    )

    db.commit()
    db.refresh(withdrawal)
    return withdrawal
