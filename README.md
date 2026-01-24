MediTrack – Doctor & Patient Medical Records System

Group Information

Student 1: Thilina Dilshan Hettiarachchi – ITBIN-2313-0138 – Role: DevOps / Release Manager  
Student 2: Nethmi Priyanjala– ITBIN-2313-0085– Role: Backend Developer  
Student 3:Tharushi Salwathura Arachchi – ITBIN-2313-0138 – Role: Frontend Developer  

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
