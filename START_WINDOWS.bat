@echo off
echo OROZONE Finance Desk setup instructions
echo.
echo 1. Open one CMD in backend and run:
echo    python -m venv .venv
echo    .venv\Scripts\activate
echo    pip install -r requirements.txt
echo    uvicorn app.main:app --reload
echo.
echo 2. Open another CMD in frontend and run:
echo    npm install
echo    npm run dev
echo.
pause
