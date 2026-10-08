from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc
from ..db import get_db
from .. import models, schemas

router = APIRouter(prefix="/income", tags=["Income"])

@router.post("", response_model=schemas.IncomeOut)
def create_income(payload: schemas.IncomeCreate, db: Session = Depends(get_db)):
    row = models.Income(**payload.model_dump())
    db.add(row); db.commit(); db.refresh(row)
    return row

@router.get("", response_model=list[schemas.IncomeOut])
def list_income(db: Session = Depends(get_db)):
    return db.query(models.Income).order_by(desc(models.Income.id)).all()

@router.delete("/{income_id}")
def delete_income(income_id: int, db: Session = Depends(get_db)):
    row = db.get(models.Income, income_id)
    if not row: raise HTTPException(404, "Income record not found")
    db.delete(row); db.commit(); return {"ok": True}
