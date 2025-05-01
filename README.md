# 💳 Team Errawrs Bank Application  
## 🏦 StackOverCash

A lightweight banking application designed for simple and secure financial transactions. This project features robust authentication, role-based access, and a smooth user experience.
--- 
## 📚 Table of Contents

- [🚀 Features](#-features)
- [🌐 Live Demo](#-live-demo)
- [🛠️ Tech Stack](#️-tech-stack)
- [📁 Project Folder Structure](#-project-folder-structure)
- [🗂️ Git Workflow Guidelines](#️-git-workflow-guidelines)
- [📜 General Coding Guidelines](#-general-coding-guidelines)
- [🧑‍💻 Contributors](#-contributors)
- [📝 Developer Documentation](#-developer-documentation)
---

## 🚀 Features
- 🏗️ **Modular Monolith Structure**
- 🔐 **User Authentication** – Secure login system for all users.  
- 🔁 **Fund Transfers** –  
  - Internal (within the system)  
  - External (to other systems)  
- 🔑 **OTP-Based Multi-Factor Authentication** – Adds an extra layer of security.  
- 👥 **Role-Based Access Control** –  
  - Teller  
  - Account Holder
--- 
 
## 🌐 Live Demo

Visit the application here:  
**🔗 [Errawrs Web Host: StackOverCash](https://www.stackovercash.site/)**

---

## 🛠️ Tech Stack

- **Backend:** PHP  
- **Frontend:** HTML / CSS / JS  
- **Database:** MySQL  
- **Hosting:** AWS EC2 (Ubuntu)
- **Server:** NGINX + PHP-FPM
- **CI/CD:** GitHub Actions (SSH Deploy)
- **SMS Gateway:**

---

# 📂 Project Folder Structure

### 📂/src
- ├── 📂/public <!-- Presentation Layer (UI & Client-Side) -->
- │   ├── 📄index.html <!-- Entry point for web interface -->
- │   ├── 📂assets/ <!--  Static files (CSS, JS, images) -->
- │   └── 📂views/ <!-- HTML view templates (login, dashboard, etc.) -->
- ├── 📂/modules <!-- Application Layer (Routing & Controllers) -->
- │   ├── 📂auth/ 
- │   ├── 📂user/   
- │   ├── 📂teller/   
- │   ├── 📂account/ 
- │   ├── 📂transaction/ 
- │   └── 📂otp/
- ├── 📂/core <!-- Contains reusable components and shared logic. -->
- ├── 📂/config <!-- Environment variables, database credentials, SMS gateway configs, etc. -->
- └── 📂/logs <!-- Stores error logs, request logs, and system events for debugging -->

---

# 🗂️ Git Workflow Guidelines

## 🌿 Branch Types and Naming Conventions
| Branch Type | Description               | Naming Convention           |
|-------------|---------------------------|-----------------------------|
| main        | Production-ready branch   | main                        |
| dev         | Main dev branch           | dev                         |
| feature     | New feature development   | feature/<feature-name>      |
| bugfix      | Fixes identified bugs     | bugfix/<issue-description>  |
| hotfix      | Quick fix for prod issue  | hotfix/<issue>              |
| docs        | Document related branch   | docs/<description>          |

---

## 🔧 Branching Guidelines

- ✅ Create a branch from `dev` for any feature, bugfix, or enhancement.
- ✅ Use **descriptive** branch names (e.g., `feature/user-authentication`).
- ✅ Commit often with meaningful messages.
- ✅ Keep branches focused; one purpose per branch.

---

## 🔀 Merging Guidelines

- 🔁 Use **Pull Requests (PRs)** to merge into `dev` or `main`.
  - **Rebase Before Merging**
  - 🔗 [Rebase Instructions](https://docs.google.com/document/d/1ICTXNdbj2nvUBl-8IEleAM3P-UGcojueomy6kGJ3W5U/edit?usp=sharing)
- ✅ Ensure all PRs are reviewed before merging.
- ✅ Test the feature before merging to `dev`.
- 🚫 Never push directly to `main`.

---

# 📜 General Coding Guidelines

### 💬 Comments & Documentation  
- Use comments only when necessary.  
- Document complex logic or non-obvious implementation.

### 📄 Function & Module Docs  
- Add short descriptions to explain the purpose of each module or method.  

### 💥 Error Handling  
- Use `try/catch` blocks  
- Show **clear** and **meaningful** error messages  

🔗 [Click here to view full guidelines](https://docs.google.com/document/d/1BbBcsGIdrAxlEc2rwTTQiuniiTPAqPuISj7KjDpHQYE/edit?usp=sharing)

---

# 🧑‍💻 Contributors

| Name                 | Role                              |
|----------------------|-----------------------------------|
| Gerald Mamasalanang  | Project Manager/Developer         |
| Daniel Victorioso    | Tech Lead/Developer               |
| Simone Jake Reyes    | UI/UX/Developer                   |
| Ivan Delumen         | Tester/Developer                  |

# 📝 Developer Documentation

- [🔗 Connecting to EC2 Server](https://docs.google.com/document/d/1Rpfxkkk4i7dfuglXVY4cVu4eBFNeLran0i2tSET3Mkk/edit?tab=t.0)
- [🧱 Importing / Exporting the Database](https://docs.google.com/document/d/1Rpfxkkk4i7dfuglXVY4cVu4eBFNeLran0i2tSET3Mkk/edit?tab=t.uw32i3q4gyyi) 
- [📤 Uploading Files to the Server](https://docs.google.com/document/d/1Rpfxkkk4i7dfuglXVY4cVu4eBFNeLran0i2tSET3Mkk/edit?tab=t.eub15elq4m21)
- [🔐 Environment Variables Management](link-to-env-vars-management)
- [🚦 CI/CD Deployment Workflow](link-to-cicd-workflow)
- [🧪 Testing Guide](link-to-testing-guide)
- [📦 Backup & Restore Strategy](link-to-backup-restore)
- [📋 Server Log Files](link-to-server-log-files)
- [🔎 Debugging Tips](link-to-debugging-tips)
