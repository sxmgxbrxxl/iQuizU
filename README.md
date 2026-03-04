# iQuizU : Interactive Quiz Platform

![iQuizU Banner](./frontend/public/Banner.png)

## Table of Contents

- [Introduction](#introduction)
- [Project Overview](#project-overview)
- [Objectives](#objectives)
- [Features](#features)
- [Technologies Used](#technologies-used)
- [Setup and Installation](#setup-and-installation)
- [Usage Instructions](#usage-instructions)
- [Project Structure](#project-structure)
- [Contributors](#contributors)
- [Changelog](#changelog)
- [Acknowledgments](#acknowledgments)
- [License](#license)

---

## Introduction

**iQuizU** is a modern, interactive, and synchronous/asynchronous quiz platform tailored for educational institutions. Designed to streamline the evaluation process, it empowers educators to create customized quizzes, manage classes seamlessly, and combat cheating with built-in monitoring tools while providing students with an engaging and intuitive learning experience.

## Project Overview

Built with a scalable React frontend and a real-time Firebase backend, iQuizU offers distinct portals for **Admins**, **Teachers**, and **Students**. It tackles remote assessment challenges by featuring automated grading, rich analytics, real-time synchronous quiz management, and strict anti-cheating mechanisms to ensure academic integrity.

## Objectives

- **Enhance Assessment Delivery:** Provide teachers with a reliable platform to conduct both asynchronous (self-paced) and synchronous (real-time live) quizzes.
- **Ensure Academic Integrity:** Implement advanced anti-cheating features that monitor tab switching, fullscreen exits, copy-pasting, and right-clicks.
- **Provide Actionable Insights:** Offer automated grading and comprehensive leaderboards/analytics so teachers can track class and student academic performance.

## Features

- **Multi-Role Dashboards:** Dedicated interfaces for Admins, Teachers, and Students with fine-tuned access controls.
- **Synchronous & Asynchronous Quizzes:** Support for timed live quizzes (with Waiting Rooms) and homework-style assignments.
- **Advanced Anti-Cheating System:** 
  - Tracks and flags tab switching, fullscreen exits, and developer tool access.
  - Disables right-click, copy-paste functionalities.
- **Automated Grading & Analytics:** Generate instant raw and base-50 scores, alongside real-time class leaderboards and item analysis.
- **Question Types:** Multiple Choice, True/False, and Identification (with AI-driven dynamic grouping and randomized choices).
- **Class & Student Management:** Easy import tools (CSV/Excel support) to populate classes, students, and quiz items.

## Technologies Used

- **Frontend:** React.js, Tailwind CSS, Lucide React, Recharts (for analytics graphics)
- **Backend & Database:** Firebase Authentication, Firestore (NoSQL database), Firebase Hosting/Storage
- **Data Parsing:** PapaParse (for CSV), XLSX (for Excel)

## Setup and Installation

1. **Clone the repository:**
   ```bash
   git clone <repository_url>
   cd iQuizUNew
   ```

2. **Navigate to the frontend directory:**
   ```bash
   cd frontend
   ```

3. **Install dependencies:**
   ```bash
   npm install
   ```

4. **Environment Configuration:**
   Create a `.env` file in your `frontend` directory and add your Firebase config keys:
   ```env
   REACT_APP_FIREBASE_API_KEY=your_api_key
   REACT_APP_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
   REACT_APP_FIREBASE_PROJECT_ID=your_project_id
   REACT_APP_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
   REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   REACT_APP_FIREBASE_APP_ID=your_app_id
   ```

5. **Run the development server:**
   ```bash
   npm start
   ```
   The application will start on `http://localhost:3000`.

## Usage Instructions

- **Admins:** Log in to provision teacher and student accounts, monitor system health, and extract broad analytics.
- **Teachers:** Log in to create classes, compile quiz questions, configure assignments (synchronous vs asynchronous, anti-cheat toggles), and review student analytics.
- **Students:** Log in to view dashboards, take assigned quizzes, check their standings on the leaderboard, and evaluate personal performance metrics.

## Project Structure

```bash
.
├── 📂 .github/                # GitHub Action workflows (Firebase automated deployments)
├── 📂 frontend/
│   ├── 📂 public/             # Static assets (Logos, Banners, index.html)
│   ├── 📂 src/
│   │   ├── 📂 components/     # Reusable UI components (Modals, Custom Buttons, Sidebars)
│   │   ├── 📂 firebase/       # Firebase config and utility scripts
│   │   ├── 📂 pages/          
│   │   │    ├── 📂 adminSide/      # Admin specific views
│   │   │    ├── 📂 general/        # Landing page, Login page, About page
│   │   │    ├── 📂 studentSide/    # Student dashboard, quiz taking views, leaderboards
│   │   │    └── 📂 teacherSide/    # Teacher dashboard, quiz creation, class management
│   │   ├── App.js             # Client routing and Auth State Provider
│   │   └── index.css          # Global styles & Tailwind configuration
│   ├── package.json
│   ├── postcss.config.js
│   └── tailwind.config.js
└── README.md
```

## Contributors

- **Argie Lalap**: Team Leader, Backend Developer
- **James Ronan Lodovice**: Backend Developer
- **Sam Gabriel Advento**: Frontend Developer, UI/UX Designer
- **Batlacan Diaz**: Documentator

## Changelog

### [Version 1.0.0]
- Initial release of the project.
- Implementation of multi-role login, quiz building, synchronous/asynchronous quiz sessions, and real-time anti-cheat monitoring.

## Acknowledgments

- Built using modern web technologies: React, Tailwind CSS, and Firebase.
- Gratitude to educational insights that forged the stringent anti-cheat algorithms.

## License

This project is proprietary and built for educational assessment purposes. Unauthorized copying of this project, via any medium, is strictly prohibited without explicit permission.
