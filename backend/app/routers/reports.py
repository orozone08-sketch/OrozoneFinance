from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from ..db import get_db
from .. import models

router = APIRouter(prefix="/reports", tags=["Reports"])

@router.get("/dashboard")
def dashboard(db: Session = Depends(get_db)):
    total_expense = db.query(func.coalesce(func.sum(models.Expense.total_amount), 0)).scalar() or 0
    total_income = db.query(func.coalesce(func.sum(models.Income.invoice_total), 0)).scalar() or 0
    total_received = db.query(func.coalesce(func.sum(models.Income.amount_received), 0)).scalar() or 0
    total_advances = db.query(func.coalesce(func.sum(models.Advance.amount), 0)).scalar() or 0
    expense_by_category = [{"category": r[0] or "Uncategorised", "amount": float(r[1] or 0)} for r in db.query(models.Expense.category, func.sum(models.Expense.total_amount)).group_by(models.Expense.category).all()]
    income_by_type = [{"type": r[0] or "Other", "amount": float(r[1] or 0)} for r in db.query(models.Income.income_type, func.sum(models.Income.invoice_total)).group_by(models.Income.income_type).all()]
    return {"total_income": float(total_income), "total_expense": float(total_expense), "net_profit": float(total_income-total_expense), "amount_received": float(total_received), "receivable": float(total_income-total_received), "advances_given": float(total_advances), "expense_by_category": expense_by_category, "income_by_type": income_by_type}

@router.get("/receivables")
def receivables(db: Session = Depends(get_db)):
    return [{"id": r.id, "invoice_no": r.invoice_no, "customer": r.customer, "invoice_total": r.invoice_total, "amount_received": r.amount_received, "outstanding": (r.invoice_total or 0)-(r.amount_received or 0), "due_date": r.due_date, "status": r.status} for r in db.query(models.Income).all() if (r.invoice_total or 0)-(r.amount_received or 0) > 0]

@router.get("/issue-profitability")
def issue_profitability(db: Session = Depends(get_db)):
    data = {}
    for issue, amount in db.query(models.Income.magazine_issue, func.sum(models.Income.invoice_total)).group_by(models.Income.magazine_issue).all():
        key = issue or "Unassigned"; data.setdefault(key,{"issue":key,"income":0,"expense":0}); data[key]["income"] = float(amount or 0)
    for issue, amount in db.query(models.Expense.project_issue, func.sum(models.Expense.total_amount)).group_by(models.Expense.project_issue).all():
        key = issue or "Unassigned"; data.setdefault(key,{"issue":key,"income":0,"expense":0}); data[key]["expense"] = float(amount or 0)
    for item in data.values(): item["profit"] = item["income"] - item["expense"]
    return list(data.values())

@router.get("/reimbursements")
def reimbursements(db: Session = Depends(get_db)):
    people = {p for (p,) in db.query(models.Advance.person_name).all() if p}
    people |= {p for (p,) in db.query(models.Expense.paid_by).filter(models.Expense.reimbursable == "Yes").all() if p}
    out=[]
    for p in sorted(people):
        adv = db.query(func.coalesce(func.sum(models.Advance.amount),0)).filter(models.Advance.person_name==p).scalar() or 0
        exp = db.query(func.coalesce(func.sum(models.Expense.total_amount),0)).filter(models.Expense.paid_by==p, models.Expense.reimbursable=="Yes").scalar() or 0
        out.append({"person":p,"advance_given":float(adv),"reimbursable_expense":float(exp),"balance":float(exp-adv)})
    return out
