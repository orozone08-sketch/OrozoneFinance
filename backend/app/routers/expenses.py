from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc
from ..db import get_db
from .. import models, schemas

router = APIRouter(prefix="/expenses", tags=["Expenses"])

@router.post("", response_model=schemas.ExpenseOut)
def create_expense(payload: schemas.ExpenseCreate, db: Session = Depends(get_db)):
    row = models.Expense(**payload.model_dump())
    db.add(row); db.commit(); db.refresh(row)
    return row

@router.get("", response_model=list[schemas.ExpenseOut])
def list_expenses(db: Session = Depends(get_db)):
    return db.query(models.Expense).order_by(desc(models.Expense.id)).all()

@router.delete("/{expense_id}")
def delete_expense(expense_id: int, db: Session = Depends(get_db)):
    row = db.get(models.Expense, expense_id)
    if not row: raise HTTPException(404, "Expense not found")
    db.delete(row); db.commit(); return {"ok": True}
