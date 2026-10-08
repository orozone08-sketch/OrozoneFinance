from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import desc
from ..db import get_db
from .. import models, schemas

router = APIRouter(prefix="/parties", tags=["Parties"])

@router.post("", response_model=schemas.PartyOut)
def create_party(payload: schemas.PartyCreate, db: Session = Depends(get_db)):
    row = models.Party(**payload.model_dump())
    db.add(row); db.commit(); db.refresh(row)
    return row

@router.get("", response_model=list[schemas.PartyOut])
def list_parties(db: Session = Depends(get_db)):
    return db.query(models.Party).order_by(desc(models.Party.id)).all()
