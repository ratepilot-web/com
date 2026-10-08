from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Numeric, Text
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from backend.app.database import Base

class BalanceTransaction(Base):
    __tablename__ = "balance_transactions"

    id = Column(Integer, primary_key=True, index=True)
    transaction_id = Column(String(50), unique=True, default=lambda: f"TX-{uuid.uuid4().hex[:12].upper()}", index=True, nullable=False)
    worker_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    balance_type = Column(String(20), nullable=False)  # BONUS or EARNING
    transaction_type = Column(String(50), nullable=False)
    # Types: TASK_EARNING, BONUS_CREDIT, BONUS_DEBIT, EARNING_CREDIT, EARNING_DEBIT, WITHDRAWAL, WITHDRAWAL_REVERSAL, ADMIN_ADJUSTMENT
    amount = Column(Numeric(12, 2), nullable=False)
    previous_balance = Column(Numeric(12, 2), nullable=False)
    new_balance = Column(Numeric(12, 2), nullable=False)
    reason = Column(Text, nullable=False)
    performed_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    worker = relationship("User", foreign_keys=[worker_id], back_populates="transactions")
    performed_by = relationship("User", foreign_keys=[performed_by_id])

class Withdrawal(Base):
    __tablename__ = "withdrawals"

    id = Column(Integer, primary_key=True, index=True)
    withdrawal_id = Column(String(50), unique=True, default=lambda: f"WD-{uuid.uuid4().hex[:10].upper()}", index=True, nullable=False)
    worker_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    amount = Column(Numeric(12, 2), nullable=False)
    payment_method = Column(String(50), default="BANK_TRANSFER")
    payment_details = Column(Text, nullable=False)
    status = Column(String(30), default="PENDING", index=True, nullable=False) # PENDING, APPROVED, REJECTED, COMPLETED
    rejection_reason = Column(Text, nullable=True)
    processed_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    requested_at = Column(DateTime, default=datetime.utcnow)
    processed_at = Column(DateTime, nullable=True)

    worker = relationship("User", foreign_keys=[worker_id], back_populates="withdrawals")
    processed_by = relationship("User", foreign_keys=[processed_by_id])
