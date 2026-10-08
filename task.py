from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Numeric, Text, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime
from backend.app.database import Base

class Business(Base):
    __tablename__ = "businesses"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), unique=True, nullable=False)
    category = Column(String(100), nullable=False)
    website = Column(String(255), nullable=True)
    address = Column(String(255), nullable=True)
    description = Column(Text, nullable=True)
    rating_guidelines = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    tasks = relationship("Task", back_populates="business")
    completions = relationship("TaskCompletion", back_populates="business")

class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    business_id = Column(Integer, ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    instructions = Column(Text, nullable=False)
    required_stars = Column(Integer, default=5, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    business = relationship("Business", back_populates="tasks")
    prices = relationship("TaskPrice", back_populates="task")
    completions = relationship("TaskCompletion", back_populates="task")

class TaskPrice(Base):
    __tablename__ = "task_prices"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False, index=True)
    worker_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    amount = Column(Numeric(10, 2), nullable=False)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    task = relationship("Task", back_populates="prices")
    worker = relationship("User", foreign_keys=[worker_id], back_populates="task_prices")
    created_by = relationship("User", foreign_keys=[created_by_id])

    __table_args__ = (
        UniqueConstraint("task_id", "worker_id", name="uq_task_worker_price"),
    )

class TaskCompletion(Base):
    __tablename__ = "task_completions"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False, index=True)
    worker_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    business_id = Column(Integer, ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False, index=True)
    stars_given = Column(Integer, nullable=False)
    review_text = Column(Text, nullable=False)
    screenshot_path = Column(String(500), nullable=False)
    earning_credited = Column(Numeric(10, 2), nullable=False)
    completed_at = Column(DateTime, default=datetime.utcnow, index=True)

    task = relationship("Task", back_populates="completions")
    worker = relationship("User", back_populates="completions")
    business = relationship("Business", back_populates="completions")

    __table_args__ = (
        UniqueConstraint("worker_id", "task_id", name="uq_worker_task_completion"),
        UniqueConstraint("worker_id", "business_id", name="uq_worker_business_review"),
    )
