# CourtCommand 🏀

**Real-Time Tournament Administration & Predictive Strategic Analysis System**

The motivation behind **CourtCommand** comes from observing how disconnected local sports tournaments still are. While professional leagues rely on instant analytics, real-time statistics, and live digital coverage, most amateur tournaments still struggle with paper score sheets, manual scheduling, and inefficient management systems.

CourtCommand aims to bridge this gap by creating a unified digital platform that connects **organizers, players, and fans** through a real-time data-driven environment.

Our objective is simple: replace manual chaos with **professional-grade tournament management**, ensuring that every match—regardless of level—benefits from structured data collection, real-time visibility, and intelligent analysis.

Developed by **Charlie Squad**

* Ankush Malik
* Vishal Vijay Singh
* Sidharth Pundir
* Akshat Bansal

---

# ✨ Key Features

## 1. Admin Dashboard

A centralized administrative interface designed for tournament organizers.

Features include:

* Team registration and management
* Automated fixture generation
* Tournament scheduling
* Match tracking and result management

This dashboard serves as the **core control center** for the entire tournament system.

---

## 2. Scorer Interface

A **courtside digital control panel** designed for scorers during live matches.

Capabilities:

* Log points scored in real-time
* Record fouls and violations
* Track timeouts
* Maintain accurate match statistics

This replaces traditional paper score sheets with a **fast, error-resistant digital scoring system**.

---

## 3. Live GameCast (Public Portal)

A **fan-facing live portal** where spectators can follow the match in real time.

Features:

* Live scoreboard updates
* Play-by-play event tracking
* Real-time match progress

Updates are powered using **WebSockets via Socket.io**, ensuring minimal delay between scoring events and public display.

---

## 4. Virtual Assistant Coach (AI Module)

An intelligent analytics module designed to provide **strategic insights from match data**.

The AI system analyzes collected statistics to generate:

* Player performance evaluation
* Tactical insights
* Suggested lineup improvements
* Automated training recommendations

The module leverages **machine learning algorithms** to transform raw match data into actionable insights.

---

# 🛠️ Tech Stack

## Frontend

* EJS (Embedded JavaScript Templates)
* HTML5
* CSS3
* Vanilla JavaScript

## Backend

* Node.js
* Express.js

## Real-Time Communication

* Socket.io

## Database

* MySQL
* Accessed using `mysql2/promise`

## AI & Analytics Service

* Python
* Flask
* Pandas
* Scikit-Learn

---

# 📂 Project Structure

The repository follows a **Separated Monorepo Architecture**, which keeps the web application and AI service independent while allowing them to communicate via APIs.

```
CourtCommand/
│
├── backend/                  # Node.js & Express server
│   ├── public/               # Static assets (CSS, client-side JS, images)
│   ├── src/                  # Backend logic (routes, database connection)
│   └── views/                # EJS templates
│
├── database/                 # SQL schema and seed data
│
└── ml_service/               # Python AI/ML microservice
```

This structure ensures:

* Modular development
* Easier debugging
* Independent deployment of services

---

# 🚀 Local Setup & Installation

## Prerequisites

Ensure the following software is installed:

* Node.js (v16 or later)
* Python (v3.8 or later)
* MySQL server (XAMPP or standalone)

---

# 1️⃣ Database Setup

1. Open your MySQL client
   (e.g., phpMyAdmin, MySQL Workbench).

2. Create a new database:

```
court_command
```

3. Run the SQL script located in:

```
database/schema.sql
```

This will create all required tables for the system.

---

# 2️⃣ Backend Setup (Node.js)

Open a terminal and navigate to the backend directory.

```
cd backend
```

Install required dependencies:

```
npm install
```

Create a `.env` file in the **backend directory** and add your database credentials.

Example:

```
DB_HOST=localhost
DB_USER=root
DB_PASS=
DB_NAME=court_command
```

Start the development server:

```
npm start
```

The main web application will run at:

```
http://localhost:3000
```

---

# 3️⃣ AI Service Setup (Python)

Open a **new terminal window** and navigate to the ML service directory.

```
cd ml_service
```

## Create a Virtual Environment

### Windows

```
python -m venv venv
venv\Scripts\activate
```

### Mac/Linux

```
python3 -m venv venv
source venv/bin/activate
```

---

## Install Dependencies

```
pip install -r requirements.txt
```

---

## Run the AI Service

```
python app.py
```

The AI microservice will run at:

```
http://localhost:5000
```

The Node.js backend communicates with this service via API requests.

---

# 🤝 Team Workflow (Git Guidelines)

To maintain a clean and collaborative workflow, follow these Git rules:

### 1. Do Not Commit Directly to `main`

All development should occur in feature branches.

### 2. Create Feature Branches

```
git checkout -b feature/your-feature-name
```

Example:

```
feature/admin-dashboard
```

---

### 3. Use `.gitignore`

Ensure the following are ignored:

```
node_modules/
venv/
.env
```

This prevents unnecessary files from being uploaded to the repository.

---

### 4. Pull Before Creating a Pull Request

Before submitting a pull request:

```
git pull origin main
```

This ensures your branch is up to date and prevents merge conflicts.

---

# 📈 Future Improvements

Possible enhancements for the system include:

* Mobile app integration
* Advanced player analytics dashboards
* Tournament bracket automation
* AI-based injury risk prediction
* Multi-sport support beyond basketball

---

# 📜 License

This project is developed for **academic and research purposes**.
Usage and distribution should follow the guidelines provided by the development team.

---

# 📬 Contact

For queries, contributions, or collaboration:

**Charlie Squad Development Team**

* Ankush Malik
* Vishal Vijay Singh
* Sidharth Pundir
* Akshat Bansal

---
