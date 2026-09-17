# SmartCRM AI

SmartCRM AI is a local full-stack customer relationship management application for managing leads, customers, deals, engagement activity, and predictions from one workspace.

The project contains a React/Vite frontend, a Flask API, a SQLite database, and optional local machine-learning models. It does not require paid APIs or external services for local development.

## Features

- Authentication with admin and salesperson roles
- Lead, customer, deal, and engagement management
- Search, filtering, pagination, and dashboard analytics
- Lead scoring and churn prediction
- Sentiment analysis and email reply suggestions
- SQLite migrations and demo-data seeding
- OpenAPI-style API documentation at `/api/v1/docs`
- Heuristic prediction fallbacks when ML dependencies or trained models are unavailable

## Stack

- Frontend: React, Vite, Tailwind CSS, React Router, TanStack Query, Recharts
- Backend: Python, Flask, Flask-CORS
- Database: SQLite
- ML/NLP: scikit-learn, pandas, NumPy, TextBlob

## Project Layout

```text
SmartCRM/
├── backend/              Flask app, API, services, repositories, and tests
├── datasets/             Sample datasets for local model training
├── frontend/              React/Vite application
├── screenshots/           UI screenshots
├── requirements.txt       Core backend dependencies
├── requirements-ml.txt   Optional ML and NLP dependencies
└── README.md
```

## Requirements

- Python 3.10 or newer
- Node.js 18 or newer and npm

## Local Setup

Open two terminals from the repository root.

### 1. Create the Python environment

PowerShell:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
pip install -r requirements-ml.txt
```

The ML requirements are optional. Without them, prediction endpoints use their built-in fallback behavior.

### 2. Start the backend

```powershell
cd backend
python app.py
```

The API is available at `http://127.0.0.1:5000`.

On startup, the backend applies database migrations, ensures reference data exists, and seeds demo data in development mode.

Useful backend commands:

```powershell
python manage.py migrate
python manage.py seed
python manage.py train
python manage.py reset
```

Run the backend tests from the `backend` directory:

```powershell
pytest
```

### 3. Start the frontend

In a second terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000`. Vite proxies `/api` requests to the backend at `http://127.0.0.1:5000`.

For a production frontend build:

```powershell
npm run build
npm run preview
```

## Demo Accounts

Development seeding creates these accounts by default:

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@smartcrm.local` | `admin123` |
| Salesperson | `sales@smartcrm.local` | `sales123` |

Change the passwords with `DEMO_ADMIN_PASSWORD` and `DEMO_SALES_PASSWORD` before sharing a development environment.

## Configuration

Configuration is read from environment variables or a local `.env` file in the repository root or `backend/`. Common settings include:

| Variable | Default | Purpose |
| --- | --- | --- |
| `SECRET_KEY` | Development-only key | Flask session signing key |
| `FLASK_ENV` | `development` | Runtime environment |
| `FLASK_DEBUG` | Based on environment | Enables Flask debug mode |
| `DATABASE_PATH` | `backend/database/smartcrm.db` | SQLite database location |
| `CORS_ORIGINS` | Local frontend URLs | Allowed frontend origins |
| `SEED_DEMO_DATA` | Enabled outside production | Controls demo-data seeding |
| `VITE_API_PROXY` | `http://127.0.0.1:5000` | Frontend development API target |

Never use the development secret or demo passwords in production. Production also requires an explicit `SECRET_KEY`.

## API Entry Points

- `GET /api/health` - health check
- `GET /api/v1/docs` - API documentation
- `/api/auth/*` - registration, login, logout, and current-user session
- `/api/leads/*` - lead management
- `/api/customers/*` - customer management
- `/api/deals/*` - deal management
- `/api/engagement/*` - engagement activity
- `/api/dashboard/*` - summaries and analytics
- `/api/predictions/*` - scoring, sentiment, churn, and email suggestions

The root endpoint, `GET /`, returns the API name, version, and links to health and documentation routes.

## Machine Learning

Training scripts use the sample CSV files in `datasets/` and save local model files under `backend/ml_models/`:

- `python manage.py train` trains both models
- `backend/ml_models/train_lead_model.py` trains the lead-scoring model
- `backend/ml_models/train_churn_model.py` trains the churn model

Generated model files and the SQLite database are local runtime artifacts and should not be committed.

## Security Notes

This project is configured for local development. Before deployment, set a strong `SECRET_KEY`, use production cookie and CORS settings, replace demo credentials, and place the API behind a production WSGI server and HTTPS.
