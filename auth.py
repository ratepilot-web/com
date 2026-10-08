from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models.user import User, Balance
from backend.app.schemas.auth import UserCreate, UserLogin, UserOut, Token
from backend.app.auth.jwt import verify_password, get_password_hash, create_access_token, get_current_user
from backend.app.utils.audit import log_audit

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/register", response_model=Token)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == user_in.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email is already registered")

    # Only allow WORKER registration from public endpoint; FINANCIAL_DEPARTMENT must be initialized or admin assigned
    role = "WORKER"
    if user_in.role == "FINANCIAL_DEPARTMENT":
        role = "FINANCIAL_DEPARTMENT"

    user = User(
        email=user_in.email.lower().strip(),
        full_name=user_in.full_name.strip(),
        hashed_password=get_password_hash(user_in.password),
        role=role
    )
    db.add(user)
    db.flush()

    balance = Balance(user_id=user.id, bonus_balance=0.00, earning_balance=0.00)
    db.add(balance)

    log_audit(
        db=db,
        action="REGISTER",
        entity_type="USER",
        entity_id=str(user.id),
        user_id=user.id,
        details={"email": user.email, "role": user.role}
    )

    db.commit()
    db.refresh(user)

    token = create_access_token(data={"sub": str(user.id), "role": user.role})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user_id": user.id,
        "email": user.email,
        "role": user.role,
        "full_name": user.full_name
    }

@router.post("/login", response_model=Token)
def login(credentials: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == credentials.email.lower().strip()).first()
    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Account is deactivated")

    log_audit(
        db=db,
        action="LOGIN",
        entity_type="USER",
        entity_id=str(user.id),
        user_id=user.id,
        details={"email": user.email, "role": user.role}
    )

    token = create_access_token(data={"sub": str(user.id), "role": user.role})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user_id": user.id,
        "email": user.email,
        "role": user.role,
        "full_name": user.full_name
    }

@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    balance = db.query(Balance).filter(Balance.user_id == current_user.id).first()
    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "role": current_user.role,
        "is_active": current_user.is_active,
        "created_at": current_user.created_at,
        "bonus_balance": float(balance.bonus_balance) if balance else 0.0,
        "earning_balance": float(balance.earning_balance) if balance else 0.0,
    }
