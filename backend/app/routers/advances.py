from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import desc
from ..db import get_db
from .. import models, schemas

router = APIRouter(prefix="/advances", tags=["Advances"])

@router.post("", response_model=schemas.AdvanceOut)
def create_advance(payload: schemas.AdvanceCreate, db: Session = Depends(get_db)):
    row = models.Advance(**payload.model_dump())
    db.add(row); db.commit(); db.refresh(row)
    return row

@router.get("", response_model=list[schemas.AdvanceOut])
def list_advances(db: Session = Depends(get_db)):
    return db.query(models.Advance).order_by(desc(models.Advance.id)).all()
