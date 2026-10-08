from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Numeric
from sqlalchemy.orm import relationship
from datetime import datetime
from backend.app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    full_name = Column(String(255), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, default="WORKER")  # WORKER, FINANCIAL_DEPARTMENT
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    balance = relationship("Balance", back_populates="user", uselist=False, cascade="all, delete-orphan")
    task_prices = relationship("TaskPrice", back_populates="worker", foreign_keys="TaskPrice.worker_id")
    completions = relationship("TaskCompletion", back_populates="worker")
    transactions = relationship("BalanceTransaction", back_populates="worker", foreign_keys="BalanceTransaction.worker_id")
    withdrawals = relationship("Withdrawal", back_populates="worker", foreign_keys="Withdrawal.worker_id")

class Balance(Base):
    __tablename__ = "balances"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    bonus_balance = Column(Numeric(12, 2), default=0.00, nullable=False)
    earning_balance = Column(Numeric(12, 2), default=0.00, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="balance")
