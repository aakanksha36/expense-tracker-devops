# Expense Tracking and Management System

## Problem Statement
Managing expenses manually is inefficient and does not provide proper insights into spending, budget control, and category-wise analysis. This project provides an interactive expense dashboard with budgets, analytics, Docker containerization, and CI/CD pipeline integration.

## Features
- Add, edit, and delete expenses
- Category-wise budget tracking
- Dashboard with KPI cards
- Category, monthly, and payment mode charts
- Search, filter, and sort expenses
- Export data as CSV
- MongoDB database integration
- Docker containerization
- GitHub Actions CI/CD pipeline

## Tech Stack
- HTML, CSS, JavaScript
- Node.js
- Express.js
- MongoDB
- Docker
- GitHub Actions
- Render

## Project Structure
- `app.js` - backend API routes
- `db.js` - database connection
- `server.js` - application entry point
- `public/` - frontend files
- `Dockerfile` - app container configuration
- `docker-compose.yml` - multi-container setup

## How to Run Locally
```bash
npm install
docker-compose up --build
