# Contributing to RotaCare

Thank you for your interest in contributing to the RotaCare SaaS platform! We welcome pull requests, bug reports, and feature requests.

## Developer Setup

### 1. Backend (Python/FastAPI)
The backend is built with FastAPI, SQLModel, and Pytest.
```bash
cd backend
pip install -r requirements.txt
pytest -vv  # Run the test suite to ensure compliance engines are passing
uvicorn main:app --reload
```

### 2. Frontend (React/Vite)
The frontend is built with React and Vite.
```bash
cd frontend
npm install
npm run dev
```

## Pull Request Process
1. Ensure any new features are covered by tests.
2. Ensure the code compiles locally (`npm run build` in the frontend).
3. If you introduce new dependencies, please pin their exact versions in `requirements.txt` or `package.json`.
4. Submit your PR against the `main` branch with a clear description of the problem solved.

We adhere to a standard Code of Conduct and ask all contributors to communicate professionally and respectfully in issues and pull requests.
