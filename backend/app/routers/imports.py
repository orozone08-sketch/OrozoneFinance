from datetime import date, datetime
from io import BytesIO
import re
from typing import Any

import pandas as pd
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from .. import models
from ..db import get_db

router = APIRouter(prefix="/imports", tags=["Excel Imports"])


DATASETS: dict[str, dict[str, Any]] = {
    "expenses": {
        "label": "Expenses",
        "model": models.Expense,
        "required": ["expense_date", "category", "total_amount"],
        "numeric_positive": ["total_amount"],
        "defaults": {"base_amount": 0, "gst_amount": 0, "reimbursable": "No", "bill_available": "No", "status": "Submitted"},
        "aliases": {"date": "expense_date", "expense_date": "expense_date", "total": "total_amount", "total_amount": "total_amount", "gst": "gst_amount", "vendor_person": "vendor"},
        "columns": ["expense_date", "voucher_no", "paid_by", "category", "sub_category", "description", "vendor", "base_amount", "gst_amount", "total_amount", "payment_mode", "paid_from", "reimbursable", "project_issue", "event_name", "bill_available", "bill_ref", "remarks", "status"],
    },
    "income": {
        "label": "Income",
        "model": models.Income,
        "required": ["invoice_date", "customer", "income_type", "invoice_total"],
        "numeric_positive": ["invoice_total"],
        "defaults": {"base_amount": 0, "gst_amount": 0, "amount_received": 0, "status": "Invoice Raised"},
        "aliases": {"date": "invoice_date", "invoice_date": "invoice_date", "total": "invoice_total", "invoice_total": "invoice_total", "gst": "gst_amount", "received": "amount_received"},
        "columns": ["invoice_date", "invoice_no", "customer", "income_type", "ad_type", "magazine_issue", "sales_person", "base_amount", "gst_amount", "invoice_total", "amount_received", "due_date", "payment_mode", "bank_name", "status", "remarks"],
    },
    "advances": {
        "label": "Advances",
        "model": models.Advance,
        "required": ["person_name", "advance_date", "amount"],
        "numeric_positive": ["amount"],
        "defaults": {},
        "aliases": {"person": "person_name", "name": "person_name", "date": "advance_date"},
        "columns": ["person_name", "advance_date", "amount", "remarks"],
    },
    "parties": {
        "label": "Parties",
        "model": models.Party,
        "required": ["party_name"],
        "numeric_positive": [],
        "defaults": {},
        "aliases": {"name": "party_name", "party": "party_name", "type": "party_type"},
        "columns": ["party_name", "party_type", "contact_person", "mobile", "email", "gstin", "address", "remarks"],
    },
    "ads": {
        "label": "Ad Bookings",
        "model": models.AdBooking,
        "required": ["booking_date", "customer", "magazine_issue"],
        "numeric_positive": [],
        "defaults": {"rate": 0, "discount": 0, "final_amount": 0, "gst_amount": 0, "invoice_total": 0, "artwork_received": "No", "artwork_approved": "No", "invoice_raised": "No", "payment_received": "No", "published": "No", "status": "Booked"},
        "aliases": {"date": "booking_date", "booking_date": "booking_date", "issue": "magazine_issue", "total": "invoice_total"},
        "columns": ["booking_date", "customer", "magazine_issue", "position", "package_name", "rate", "discount", "final_amount", "gst_amount", "invoice_total", "artwork_received", "artwork_approved", "invoice_raised", "payment_received", "published", "status", "remarks"],
    },
}


def _dataset_or_404(dataset: str) -> dict[str, Any]:
    config = DATASETS.get(dataset.lower())
    if not config:
        raise HTTPException(404, "Unknown import dataset")
    return config


def _normalize_header(value: Any) -> str:
    value = re.sub(r"[^a-zA-Z0-9]+", " ", str(value).strip().lower())
    return "_".join(value.split())


def _clean(value: Any) -> Any:
    if value is None or pd.isna(value):
        return None
    if isinstance(value, str):
        value = value.strip()
        return value or None
    return value


def _date_value(value: Any) -> date | None:
    value = _clean(value)
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    if isinstance(value, (int, float)) and 1000 < value < 100000:
        return (pd.Timestamp("1899-12-30") + pd.to_timedelta(value, unit="D")).date()
    parsed = pd.to_datetime(value, errors="coerce")
    if pd.isna(parsed):
        return None
    return parsed.date()


def _number_value(value: Any) -> float | None:
    value = _clean(value)
    if value is None:
        return None
    if isinstance(value, str):
        value = value.replace(",", "").replace("₹", "").replace("$", "").strip()
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _parse_rows(dataset: str, frame: pd.DataFrame) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    config = DATASETS[dataset]
    aliases = {**{column: column for column in config["columns"]}, **config["aliases"]}
    column_map: dict[str, str] = {}
    for column in frame.columns:
        normalized = _normalize_header(column)
        if normalized in aliases:
            column_map[column] = aliases[normalized]

    rows: list[dict[str, Any]] = []
    errors: list[dict[str, Any]] = []
    for index, source_row in frame.iterrows():
        if source_row.isna().all():
            continue
        excel_row = int(index) + 2
        payload = dict(config["defaults"])
        for source_column, canonical in column_map.items():
            value = _clean(source_row[source_column])
            if canonical.endswith("date") or canonical in {"expense_date", "invoice_date", "advance_date", "booking_date", "due_date"}:
                payload[canonical] = _date_value(value)
            elif canonical in {"base_amount", "gst_amount", "total_amount", "invoice_total", "amount_received", "amount", "rate", "discount", "final_amount"}:
                payload[canonical] = _number_value(value)
            else:
                payload[canonical] = value

        row_errors: list[str] = []
        for required in config["required"]:
            if payload.get(required) is None or payload.get(required) == "":
                row_errors.append(f"{required} is required")
        for numeric in config["numeric_positive"]:
            value = payload.get(numeric)
            if value is None:
                row_errors.append(f"{numeric} must be a number")
            elif value <= 0:
                row_errors.append(f"{numeric} must be greater than 0")
        for date_column in ["expense_date", "invoice_date", "advance_date", "booking_date", "due_date"]:
            if date_column in payload and payload[date_column] is not None and not isinstance(payload[date_column], date):
                row_errors.append(f"{date_column} is not a valid date")
        if row_errors:
            errors.append({"row": excel_row, "errors": row_errors})
        else:
            rows.append(payload)
    return rows, errors


@router.get("/{dataset}/template")
def download_template(dataset: str):
    config = _dataset_or_404(dataset)
    frame = pd.DataFrame(columns=config["columns"])
    output = BytesIO()
    with pd.ExcelWriter(output, engine="openpyxl") as writer:
        frame.to_excel(writer, index=False, sheet_name=config["label"][:31])
    output.seek(0)
    filename = f"orozone_{dataset}_import_template.xlsx"
    return StreamingResponse(output, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", headers={"Content-Disposition": f'attachment; filename="{filename}"'})


@router.post("/{dataset}")
async def import_excel(dataset: str, file: UploadFile = File(...), db: Session = Depends(get_db)):
    dataset = dataset.lower()
    config = _dataset_or_404(dataset)
    filename = file.filename or ""
    if not filename.lower().endswith((".xlsx", ".xlsm")):
        raise HTTPException(400, "Please upload an .xlsx or .xlsm Excel file")
    try:
        contents = await file.read()
        frame = pd.read_excel(BytesIO(contents), sheet_name=0)
    except Exception as exc:
        raise HTTPException(400, f"Could not read the Excel file: {exc}") from exc
    if frame.empty:
        raise HTTPException(400, "The first worksheet is empty")

    rows, errors = _parse_rows(dataset, frame)
    if errors:
        raise HTTPException(status_code=422, detail={"message": "No rows were imported. Fix the workbook and try again.", "errors": errors[:50], "error_count": len(errors)})
    try:
        db.add_all([config["model"](**row) for row in rows])
        db.commit()
    except Exception as exc:
        db.rollback()
        raise HTTPException(422, f"The rows could not be saved: {exc}") from exc
    return {"dataset": dataset, "file": filename, "imported": len(rows)}
