from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import desc
from ..db import get_db
from .. import models, schemas

router = APIRouter(prefix="/ads", tags=["Advertisement Bookings"])

@router.post("", response_model=schemas.AdBookingOut)
def create_booking(payload: schemas.AdBookingCreate, db: Session = Depends(get_db)):
    row = models.AdBooking(**payload.model_dump())
    db.add(row); db.commit(); db.refresh(row)
    return row

@router.get("", response_model=list[schemas.AdBookingOut])
def list_bookings(db: Session = Depends(get_db)):
    return db.query(models.AdBooking).order_by(desc(models.AdBooking.id)).all()
