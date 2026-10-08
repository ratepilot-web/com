from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import datetime

class BalanceAdjustmentRequest(BaseModel):
    worker_id: int
    balance_type: Literal["BONUS", "EARNING"]
    action: Literal["INCREASE", "DECREASE"]
    amount: float = Field(..., gt=0)
    reason: str = Field(..., min_length=3)

class BalanceOut(BaseModel):
    worker_id: int
    bonus_balance: float
    earning_balance: float
    updated_at: datetime

    class Config:
        from_attributes = True

class BalanceTransactionOut(BaseModel):
    id: int
    transaction_id: str
    worker_id: int
    worker_name: Optional[str] = None
    balance_type: str
    transaction_type: str
    amount: float
    previous_balance: float
    new_balance: float
    reason: str
    performed_by_id: Optional[int] = None
    performed_by_name: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class WithdrawalRequest(BaseModel):
    amount: float = Field(..., gt=0)
    payment_method: str = "BANK_TRANSFER"
    payment_details: str = Field(..., min_length=5)

class WithdrawalProcess(BaseModel):
    status: Literal["APPROVED", "REJECTED", "COMPLETED"]
    rejection_reason: Optional[str] = None

class WithdrawalOut(BaseModel):
    id: int
    withdrawal_id: str
    worker_id: int
    worker_name: Optional[str] = None
    amount: float
    payment_method: str
    payment_details: str
    status: str
    rejection_reason: Optional[str] = None
    processed_by_id: Optional[int] = None
    requested_at: datetime
    processed_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class DailyTaskStatusChange(BaseModel):
    status: Literal["OPEN", "CLOSED"]
    note: Optional[str] = None

class DailyTaskSessionOut(BaseModel):
    id: int
    status: str
    changed_by_id: int
    changed_by_name: Optional[str] = None
    note: Optional[str] = None
    updated_at: datetime

    class Config:
        from_attributes = True

class AuditLogOut(BaseModel):
    id: int
    user_id: Optional[int] = None
    user_name: Optional[str] = None
    action: str
    entity_type: str
    entity_id: Optional[str] = None
    details: Optional[dict] = None
    created_at: datetime

    class Config:
        from_attributes = True
