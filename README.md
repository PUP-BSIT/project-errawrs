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
  - [🌿 Branch Types and Naming Conventions](#-branch-types-and-naming-conventions)
  - [🔧 Branching Guidelines](#-branching-guidelines)
  - [🔀 Merging Guidelines](#-merging-guidelines)
- [📜 General Coding Guidelines](#-general-coding-guidelines)
- [🧑‍💻 Contributors](#-contributors)
- [📝 Developer Documentation](#-developer-documentation)
  - [🔗 Connecting to EC2 Server](#-connecting-to-ec2-server)
  - [🧱 Importing / Exporting the Database](#-importing--exporting-the-database)
  - [📤 Uploading Files to the Server](#-uploading-files-to-the-server)
  - [⚙️ Environment Configuration](#️-environment-configuration)
  - [🔐 Environment Variables Management](#-environment-variables-management)
  - [🚦 CI/CD Deployment Workflow](#-cicd-deployment-workflow)
  - [🧪 Testing Guide](#-testing-guide)
  - [📦 Backup & Restore Strategy](#-backup--restore-strategy)
  - [📋 Server Log Files](#-server-log-files)
  - [🔎 Debugging Tips](#-debugging-tips)
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

# 📂 Project Folder Structure

### 📂/root
- ├── 📂/public              
- │   ├── 📄index.html       
- │   ├── 📂assets/          
- │   └── 📂views/           
- ├── 📂/modules             
- │   ├── 📂auth/            
- │   ├── 📂user/            
- │   ├── 📂account/         
- │   ├── 📂transaction/     
- │   └── 📂otp/             
- ├── 📂/core                
- ├── 📂/config              
- └── 📂/logs                

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

## 🧑‍💻 Contributors

| Name                   | Role                              |
|------------------------|-----------------------------------|
| [Gerald Mamasalanang]  | Project Manager/Developer         |
| [Daniel Victorioso]    | Tech Lead/Developer               |
| [Simone Jake Reyes]    | UI/UX/Developer                   |
| [Ivan Delumen]         | Tester/Developer                  |
## 📝 Developer Documentation

---

### 🔗 Connecting to EC2 Server


### 🧱 Importing / Exporting the Database


### 📤 Uploading Files to the Server


### ⚙️ Environment Configuration


### 🔐 Environment Variables Management


### 🚦 CI/CD Deployment Workflow


### 🧪 Testing Guide


### 📦 Backup & Restore Strategy


### 📋 Server Log Files

_Where logs are located (e.g., `/var/log/apache2`, Laravel logs), how to read and rotate them._

### 🔎 Debugging Tips

_Common issues and their fixes, debug tools, and enabling/disabling debug mode in production._
