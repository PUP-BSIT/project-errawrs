# 💳 Team Errawrs Bank Application  
## 🏦 StackOverCash

A lightweight banking application designed for simple and secure financial transactions. This project features robust authentication, role-based access, and a smooth user experience.
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

---
# Project Folder Structure

# 📂/root
- ├── 📂/public              <!-- Public files (entry point) -->
- │   ├── 📄index.html       <!-- Main router or front controller -->
- │   ├── 📂assets/          <!-- CSS, JS, images -->
- │   └── 📂views/           <!-- HTML templates -->
- │
- ├── 📂/modules             <!-- Modular structure -->
- │   ├── 📂auth/            <!-- Login, register, OTP -->
- │   - │   ├── 📄controller.php
- │   - │   ├── 📄model.php
- │   - │   └── 📄service.php
- │
- │   ├── 📂user/            <!-- User management -->
- │   - │   ├── 📄controller.php
- │   - │   ├── 📄model.php
- │   - │   └── 📄service.php
- │
- │   ├── 📂account/         <!-- Bank accounts -->
- │   - │   ├── 📄controller.php
- │   - │   ├── 📄model.php
- │   - │   └── 📄service.php
- │
- │   ├── 📂transaction/     <!-- Fund transfers, history -->
- │   - │   ├── 📄controller.php
- │   - │   ├── 📄model.php
- │   - │   └── 📄service.php
- │
- │   ├── 📂otp/             <!-- OTP generation & validation -->
- │   - │   ├── 📄service.php
- │   - │   └── 📄sms_gateway.php
- │
- ├── 📂/core                <!-- Core system (reusable code) -->
- │   ├── 📄database.php     <!-- DB connection -->
- │   ├── 📄router.php       <!-- Simple routing logic -->
- │   ├── 📄session.php      <!-- Session/token logic -->
- │   └── 📄helpers.php      <!-- Utility functions -->
- │
- ├── 📂/config              <!-- Configuration files -->
- │   ├── 📄db.php
- │   ├── 📄sms.php
- │   └── 📄app.php
- │
- └── 📂/logs                <!-- Application logs -->

---
# 🗂️ Git Workflow Guidelines

## 🌿 Branch Types and Naming Conventions
--- 
`| Branch Type| Description              | Naming Convention`   
`|------------|--------------------------|--------------------------`           
`| main       | Production-ready branch  | main`                   
`| dev        | Main dev branch          | dev`                          
`| feature    | New feature development  | feature/<feature-name>`       
`| bugfix     | Fixes identified bugs    | bugfix/<issue-description>`   
`| hotfix     | quick fix for prod issue | hotfix/<issue>`                       
`|------------|--------------------------|--------------------------`           
---

## 🔧 Branching Guidelines

- ✅ Create a branch from `dev` for any feature, bugfix, or enhancement.

- ✅ Use **descriptive** branch names (e.g., `feature/user-authentication`).

- ✅ Commit often with meaningful messages.

- ✅ Keep branches focused; one purpose per branch.

---

## 🔀 Merging Guidelines

- 🔁 Use **Pull Requests (PRs)** to merge into `dev` or `main`.

- ✅ Ensure all PRs are reviewed before merging.

- ✅ Test the feature before merging to `dev`.

- 🚫 Never push directly to `main`.
