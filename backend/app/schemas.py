from datetime import date, datetime
from pydantic import BaseModel, ConfigDict, Field

class ORMBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

class ExpenseCreate(BaseModel):
    expense_date: date
    voucher_no: str | None = None
    paid_by: str | None = None
    category: str
    sub_category: str | None = None
    description: str | None = None
    vendor: str | None = None
    base_amount: float = 0
    gst_amount: float = 0
    total_amount: float = Field(gt=0)
    payment_mode: str | None = None
    paid_from: str | None = None
    reimbursable: str = "No"
    project_issue: str | None = None
    event_name: str | None = None
    bill_available: str = "No"
    bill_ref: str | None = None
    remarks: str | None = None
    status: str = "Submitted"

class ExpenseOut(ExpenseCreate, ORMBase):
    id: int
    created_at: datetime | None = None

class IncomeCreate(BaseModel):
    invoice_date: date
    invoice_no: str | None = None
    customer: str
    income_type: str
    ad_type: str | None = None
    magazine_issue: str | None = None
    sales_person: str | None = None
    base_amount: float = 0
    gst_amount: float = 0
    invoice_total: float = Field(gt=0)
    amount_received: float = 0
    due_date: date | None = None
    payment_mode: str | None = None
    bank_name: str | None = None
    status: str = "Invoice Raised"
    remarks: str | None = None

class IncomeOut(IncomeCreate, ORMBase):
    id: int
    created_at: datetime | None = None

class AdvanceCreate(BaseModel):
    person_name: str
    advance_date: date
    amount: float = Field(gt=0)
    remarks: str | None = None

class AdvanceOut(AdvanceCreate, ORMBase):
    id: int
    created_at: datetime | None = None

class PartyCreate(BaseModel):
    party_name: str
    party_type: str | None = None
    contact_person: str | None = None
    mobile: str | None = None
    email: str | None = None
    gstin: str | None = None
    address: str | None = None
    remarks: str | None = None

class PartyOut(PartyCreate, ORMBase):
    id: int
    created_at: datetime | None = None

class AdBookingCreate(BaseModel):
    booking_date: date
    customer: str
    magazine_issue: str
    position: str | None = None
    package_name: str | None = None
    rate: float = 0
    discount: float = 0
    final_amount: float = 0
    gst_amount: float = 0
    invoice_total: float = 0
    artwork_received: str = "No"
    artwork_approved: str = "No"
    invoice_raised: str = "No"
    payment_received: str = "No"
    published: str = "No"
    status: str = "Booked"
    remarks: str | None = None

class AdBookingOut(AdBookingCreate, ORMBase):
    id: int
    created_at: datetime | None = None
