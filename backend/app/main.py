import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .db import Base, engine
from .routers import expenses, income, advances, parties, ads, reports, imports

Base.metadata.create_all(bind=engine)
app = FastAPI(title="OROZONE Finance API", version="1.0.0", description="Finance API for OROZONE JEWEL NEWS")
origins = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
app.add_middleware(CORSMiddleware, allow_origins=[x.strip() for x in origins], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
app.include_router(expenses.router); app.include_router(income.router); app.include_router(advances.router); app.include_router(parties.router); app.include_router(ads.router); app.include_router(reports.router); app.include_router(imports.router)

@app.get("/")
def root(): return {"name":"OROZONE Finance API","status":"running","docs":"/docs"}

@app.get("/health")
def health(): return {"ok":True}
