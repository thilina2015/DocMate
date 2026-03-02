MediTrack – Doctor & Patient Medical Records System

Group Information

Student 1: Thilina Dilshan Hettiarachchi – ITBIN-2313-0138 – Role: DevOps / Release Manager  
Student 2:Tharushi Salwathura Arachchi – ITBIN-2313-0138 – Role: Backend Developer  
Student 3:Nethmi Priyanjala– ITBIN-2313-0085 – Role: Frontend Developer  

Project Description

MediTrack is a role-based medical records management web application designed for doctors and patients.  
Patients can manage and view their own medical profiles, while doctors can access and update patient medical records after admin approval.  
The system ensures secure access control and follows professional Git and DevOps practices.


Technologies Used


- HTML5, CSS3 
- Node.js  
- Git & GitHub  
- GitHub Actions (CI/CD)  
- Vercel / Netlify / Render  


Features

Authentication & Registration

- Two user roles: Doctor and Patient

Doctor Registration

- Email  
- Doctor ID  
- Name  
- Hospital  
- Specialization  
- Service Duration  
- Requires admin approval  

Patient Registration

- Name  
- Date of Birth  
- Email  
- Blood Group  
- Height  
- Weight  
- Past Injuries  
- Past Illnesses  
- Medical Reports  

Patient Functionalities

- Login and view own profile
- Edit personal details
- View:
  - Past doctor updates
  - Medical reports
  - Illness history
- Patients can only access their own data


Doctor Functionalities

- Login after admin approval
- Search patients by ID or name
- View patient profiles
- Add and update:
  - Illness details
  - Medicines
  - Medical reports
- Doctors can access all patients


Access Control

- Patients → access only their own profile  
- Doctors → access all patient profiles  
- Admin → approves doctor registrations  


Branch Strategy

- `main` – Production-ready branch  
- `develop` – Integration branch  
- `feature/*` – Feature development branches  


Individual Contributions

Student 1 – DevOps / Release Manager

- Repository setup and configuration  
- GitHub Actions CI/CD pipeline setup  
- Deployment configuration  
- Branch management and merge conflict resolution  

Student 2 – Backend Developer

- Doctor and patient registration logic  
- Role-based access control  
- Patient search functionality  
- Medical record handling  

Student 3 – Frontend Developer

- UI design for login and registration  
- Patient profile UI  
- Doctor dashboard UI  
- README documentation  

Setup Instructions

  Prerequisites

   - Node.js (v18 or higher)
   - Git

Installation

  bash

   git clone https://github.com/thilina2015/DocMate.git

cd repo-name
npm install
npm run dev


Docker Containerization – DocMate
Overview

The DocMate application has been containerized using Docker to ensure consistent, portable, and reproducible deployment across different environments. Containerization eliminates environment-specific dependency issues and enables the application to run reliably on any system with Docker installed.

The Docker configuration follows industry best practices, including the use of a lightweight base image, optimized layer caching, non-root execution for security, health monitoring, and persistent data management.

Prerequisites

Before running the containerized application, ensure the following are installed:

Docker Desktop (Windows/macOS) or Docker Engine (Linux)

Git (for cloning the repository)

Docker must be running before executing any commands.

Build and Run Instructions

Clone the repository:

git clone https://github.com/your-username/DocMate.git
cd DocMate

Build and start the containerized application:

docker compose up --build

This command builds the Docker image and starts the application service as defined in docker-compose.yml.

Access the application in a web browser:

Application URL:
http://localhost:3000

Health Check Endpoint:
http://localhost:3000/health

The health endpoint verifies that the container is running correctly.

Stopping the Application

To stop and remove running containers:

docker compose down
Architecture Summary

The containerized application consists of a Node.js runtime environment packaged within a lightweight Alpine-based image. The Dockerfile is structured to optimize build cache efficiency by installing dependencies before copying the full source code.

The container runs as a non-root user to enhance security and follows the principle of least privilege. A health check is implemented to monitor application availability.

Persistent storage is configured using mounted volumes to ensure that:

SQLite database files

Uploaded files

remain intact across container restarts.

Environment Configuration

Runtime configuration is externalized using environment variables defined in the docker-compose.yml file. This approach allows the same container image to be deployed across development, testing, and production environments without modification.

Key variables include:

PORT – Application listening port

SESSION_SECRET – Session encryption key

Sensitive values should be modified appropriately before production deployment.

Included Docker Files

Dockerfile – Defines the container image build process

docker-compose.yml – Orchestrates the application service

.dockerignore – Excludes unnecessary files from the build context to reduce image size and improve security

This Docker implementation ensures improved portability, deployment consistency, and simplified environment management for the DocMate application.