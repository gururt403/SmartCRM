# SmartCRM AI

SmartCRM AI is a student-friendly, localhost-only full-stack CRM project that combines lead management with lightweight machine learning features.
## Tech Stack

- Frontend: React, Tailwind CSS, Axios, React Router, Recharts
- Backend: Python Flask
- Database: SQLite
- ML: Scikit-learn, Pandas, NumPy
- NLP: TextBlob
- Tools: VS Code, GitHub, Postman

## Features

- Register, login, logout, and session-based auth
- Admin and salesperson roles
- Lead CRUD with search and status filtering
- AI lead scoring with a RandomForestClassifier
- Sentiment analysis with TextBlob
- Churn prediction with Logistic Regression
- Email reply suggestions from free template rules
- Dashboard charts and analytics
- Local SQLite database with users, leads, customers, predictions, and interactions

## Project Structure

```text
smartcrm-ai/
├── frontend/
├── backend/
├── datasets/
├── screenshots/
├── README.md
└── requirements.txt
```

## Demo Credentials

- Admin: `admin@smartcrm.local` / `admin123`
- Sales: `sales@smartcrm.local` / `sales123`

## Setup on Windows

### 1. Backend

```bash
cd backend
python app.py
```

The backend will:
- create the SQLite database if it does not exist
- seed demo users and leads
- train and save local pickle models on first run if the model files are missing

### 2. Frontend

```bash
cd frontend
npm install
npm start
```

The Vite dev server runs on `http://localhost:3000` and proxies `/api` requests to Flask on `http://127.0.0.1:5000`.

## API Overview

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/leads`
- `POST /api/leads`
- `PUT /api/leads/<id>`
- `DELETE /api/leads/<id>`
- `POST /api/predictions/lead-score`
- `POST /api/predictions/sentiment`
- `POST /api/predictions/churn`
- `POST /api/predictions/email-suggestions`
- `GET /api/dashboard/summary`
- `GET /api/dashboard/analytics`

## Machine Learning

The project includes training scripts and local pickle storage:

- `backend/ml_models/train_lead_model.py`
- `backend/ml_models/train_churn_model.py`

Datasets live in `datasets/` and are used to train the local models without any paid APIs.

## Notes

- The application is intentionally localhost-only.
- Replace the demo credentials after presentation if you want to customize the project.
- Add screenshots to the `screenshots/` folder before publishing on GitHub.
