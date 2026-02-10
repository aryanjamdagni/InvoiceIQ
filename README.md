# InvoiceIQ
![Node.js](https://img.shields.io/badge/Node.js-18+-green?logo=node.js)
![React](https://img.shields.io/badge/React-Vite-blue?logo=react)
![MongoDB](https://img.shields.io/badge/MongoDB-Database-brightgreen?logo=mongodb)
![License](https://img.shields.io/badge/License-MIT-yellow)
![Status](https://img.shields.io/badge/Status-Active-success)
![AI](https://img.shields.io/badge/AI-Enabled-purple)

InvoiceIQ is a full-stack, AI-powered **Invoice Extraction & Reporting System** built using the MERN stack.  
It allows users to upload multiple invoice PDFs, track extraction progress in real time, and automatically download structured Excel reports generated through an AI-powered processing service — all via a modern, animated, production-grade UI.

---

## Features

### Core Invoice Processing
- Upload up to **10 PDF invoices** per session
- Session-based extraction workflow
- Per-file status tracking (**Processing / Completed / Failed**)
- Real-time progress bar and session timer
- Automatic Excel report download on completion

### Dashboard & Runs
- View historical extraction sessions
- Monitor completed and in-progress runs
- Download generated reports anytime
- Pagination and safe data fetching

### Usage & Costing
- Usage overview with KPI cards
- Session-based cost and usage reporting
- Structured tables for analytics and export

### UI & UX
- Fully redesigned **unique, colorful UI**
- Smooth animations and modern layouts
- No dark/light mode (single strong visual identity)
- Fully responsive and desktop-optimized

---

## Tech Stack

### Frontend
- React (Vite)
- Tailwind CSS (latest)
- Axios
- Lucide Icons

### Backend
- Node.js
- Express.js
- MongoDB + Mongoose
- JWT Authentication
- Multer (file uploads)
- Centralized error handling

### AI Service
- Python-based AI processing service
- REST API integration with backend
- Generates structured Excel outputs from PDFs

---

## Project Structure

InvoiceIQ/
├── backend/
│ ├── src/
│ │ ├── config/
│ │ ├── controllers/
│ │ ├── middleware/
│ │ ├── models/
│ │ ├── routes/
│ │ ├── services/
│ │ ├── utils/
│ │ └── server.js
│ └── package.json
│
├── frontend/
│ ├── src/
│ │ ├── pages/
│ │ ├── components/
│ │ ├── services/
│ │ ├── styles/
│ │ └── main.jsx
│ └── package.json
│
├── ai/
│ ├── api.py
│ └── processing modules
│
└── README.md


---

## Authentication
Authentication is handled using **JWT tokens**.

Protected routes include:
- Invoice upload and extraction
- Fetching invoices and run history
- Download endpoints

Tokens are stored on the frontend and automatically attached to API requests using an Axios interceptor.

---

## Environment Variables

> ⚠️ **Note:** The following `.env` values are **dummy examples only**.  
> Replace them with your own values when running locally.

### Backend (`backend/.env`)
```env
PORT=5000
NODE_ENV=development

# Example MongoDB URI
MONGODB_URI=mongodb://localhost:27017/invoiceiq_example_db

# Example JWT secret
JWT_SECRET=example_jwt_secret_key

# Example frontend URL for CORS
CORS_ORIGIN=http://localhost:5173

# Example AI service URL
AI_URL=http://localhost:8000
Frontend (frontend/.env)
VITE_API_BASE_URL=http://localhost:5000/api
Running the Project Locally
Clone the Repository
git clone <your-repository-url>
cd InvoiceIQ
Start Backend
cd backend
npm install
npm run dev
Backend runs on:

http://localhost:5000
Start AI Service
cd ai
pip install -r requirements.txt
python api.py
AI service runs on:

http://localhost:8000
Start Frontend
cd frontend
npm install
npm run dev
Frontend runs on:

http://localhost:5173
Extraction Workflow
User uploads invoice PDFs from the frontend

Backend creates a new extraction session

AI service processes invoices asynchronously

Frontend polls session status in real time

Once complete, the Excel report is auto-downloaded

UI Highlights
Gradient-based modern UI

Animated KPI cards (Queue / Completed / Elapsed)

Live progress bar and timer

Clean tables for queue and runs

Strong spacing and typography consistency

Security
JWT validation on protected routes

Secure file upload handling

Environment-based CORS configuration

Centralized error handling middleware

Future Improvements
WebSocket-based real-time updates

Role-based access (Admin / User)

Advanced filtering & search for runs

Background job queues (BullMQ / Redis)

Cloud storage integration

Enhanced analytics dashboards

License
This project is licensed under the MIT License.

Author
Aryan Jamdagni
Full-Stack MERN Developer

About
InvoiceIQ is a production-grade MERN application that automates invoice extraction using AI.
It focuses on scalability, clean architecture, and a polished user experience, making it suitable for real-world SaaS use cases and professional portfolios.
