# 💳 Team Errawrs Bank Application  
## 🏦 StackOverCash

A lightweight banking application designed for simple and secure financial transactions. This project features robust authentication, role-based access, and a smooth user experience.

---

## 🚀 Features

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
**🔗 [Errawrs Web Host](http://54.206.115.2/)**

---

## 🛠️ Tech Stack

- **Backend:** PHP
- **Frontend:** HTML / CSS / JS  
- **Database:** MySQL
- **Hosting:** AWS EC2 (Ubuntu)  

---
# Project Folder Structure

##### 📂/project-root
###### ├── 📂/public              # Public files (entry point)
###### │   ├── 📄index.php        # Main router or front controller
###### │   ├── 📄assets/          # CSS, JS, images
###### │   └── 📄views/           # HTML templates
###### │
###### ├──📂/modules             # Modular structure
###### │   ├── 📂auth/            # Login, register, OTP
###### │   │   ├── 📄controller.php
###### │   │   ├── 📄model.php
###### │   │   └── 📄service.php
###### │
###### │   ├── 📂user/            # User management
###### │   │   ├── 📄controller.php
###### │   │   ├── 📄model.php
###### │   │   └── 📄service.php
###### │
###### │   ├── 📂account/         # Bank accounts
###### │   │   ├── 📄controller.php
###### │   │   ├── 📄model.php
###### │   │   └── 📄service.php
###### │
###### │   ├── 📂transaction/     # Fund transfers, history
###### │   │   ├── 📄controller.php
###### │   │   ├── 📄model.php
###### │   │   └── 📄service.php
###### │
###### │   ├── 📂otp/             # OTP generation & validation
###### │   │   ├── 📄service.php
###### │   │   └── 📄sms_gateway.php
###### │
###### ├── 📂/core                # Core system (reusable code)
###### │   ├── 📄database.php     # DB connection
###### │   ├── 📄router.php       # Simple routing logic
###### │   ├── 📄session.php      # Session/token logic
###### │   └── 📄helpers.php      # Utility functions
###### │
###### ├── 📂/config              # Configuration files
###### │   ├── 📄db.php
###### │   ├── 📄sms.php
###### │   └── 📄app.php
###### │
###### └── 📂/logs                # Application logs
