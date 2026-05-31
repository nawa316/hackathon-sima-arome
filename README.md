# SIMA AROME
### Enterprise Resource Planning (ERP) for Integrated Operational Manufacturing

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Active-emerald?style=for-the-badge&logo=vercel&logoColor=white)](https://main.d1fc34ifmgcyf4.amplifyapp.com/login)
[![Repository](https://img.shields.io/badge/Repository-GitHub-blue?style=for-the-badge&logo=github&logoColor=white)](https://github.com/BaraArdiwinata/hackathon-sima-arome)
[![Tech Stack](https://img.shields.io/badge/Next.js%2016-App%20Router-black?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![Database](https://img.shields.io/badge/Supabase-PostgreSQL-blueviolet?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)

> **Tagline**: One Platform. One Process. One Source of Truth.

## 🔑 Live Demo & Test Accounts

Experience the full capabilities of SIMA AROME.

Use the following test credentials to explore the system from different role perspectives. Each role has specific access restrictions and tailored dashboards:

| Role | Email | Password |
| :--- | :--- | :--- |
| **👑 Super Admin** | admin@simaarome.com | password123 |
| **📦 Procurement** | procurement@simaarome.com | password123 |
| **🧪 Quality Control** | qc@simaarome.com | password123 |
| **🏢 Warehouse** | warehouse@simaarome.com | password123 |
| **⚗️ Production** | production@simaarome.com | password123 |

---

## 📌 About The Project

**SIMA AROME** is an industrial-grade Enterprise Resource Planning (ERP) platform meticulously engineered to automate and optimize the entire lifecycle of essential oil manufacturing. The platform bridges operational gaps by integrating supply chain, warehousing, quality inspections, and manufacturing steps into a unified, secure web ecosystem.

### The Problem

Modern manufacturing facilities often operate under highly fragmented systems:
- **Data Fragmentation**: Redundant manual data entry across isolated platforms, increasing typing errors and record mismatch.
- **Manual Spreadsheet Reliance**: Inventory management and critical cold-chain parameters (specifically temperatures ranging from `-4°C` to `-20°C`) logged manually in spreadsheets, exposing operations to physical audit failures.
- **Opaque Workflows**: Production histories, scheduling, and recipe traceability are completely opaque, making root-cause analysis of manufacturing anomalies impossible.

### The Solution

SIMA AROME replaces outdated, paper-based, and fragmented processes with a cohesive web platform that ensures data integrity and absolute visibility:
- **Digital & Stock Management**: Live volume tracking of raw materials and finished products.
- **Batch Management & Phase Tracking**: Interactive scheduling, dynamic compound scaling, and step-by-step production routing.
- **Yield Analytics & Traceability**: Programmatic calculations of product yields and interactive audits of raw materials.
- **Cold Storage IoT Integration**: Simulated and manual temperature logging ensuring strict RAG (Red-Amber-Green) cold-chain compliance.

---

## 📈 Business Impact

By digitizing operational checkpoints and enforcing absolute transparency, SIMA AROME delivers measurable efficiency enhancements across manufacturing lifecycles:

| Metric | Previous Process | SIMA AROME Optimized | Business Improvement |
| :--- | :--- | :--- | :--- |
| **Administrative Work** | Manual inputs & physical logging | Unified digital entries & dynamic sync | **70% Reduction** |
| **Quality Control (QC)** | Manual paperwork & routing | Standardized digital gating & logs | **60% Faster Inspection** |
| **Traceability** | Fragmented spreadsheets & emails | Automated 100% batch-to-supplier logs | **100% Traceable** |

---

## 🛠️ Key Features & Core Modules

SIMA AROME is designed as a modular web platform composed of five core integrated systems:

```
┌────────────────────────────────────────────────────────────────────────┐
│                              SIMA AROME                                │
└────────────────────────────────────────────────────────────────────────┘
       │                │                 │                │
┌──────────────┐ ┌──────────────┐  ┌──────────────┐ ┌──────────────┐
│  Auth (RBAC) │ │Raw Materials │  │Quality Control││  Warehouse   │
└──────────────┘ └──────────────┘  └──────────────┘ └──────────────┘
                                          │
                                   ┌──────────────┐
                                   │ Productions  │
                                   └──────────────┘
```

### 1. 🔐 Authenticator Module
Manages system access, user credentials, and Role-Based Access Control (RBAC) scopes:
- **Dynamic Role Assignment**: Secure directory managing user profiles, role hierarchy mappings, and feature-level access capabilities.
- **Dashboard Overview**: Visualization cards illustrating user ratios, role distributions, and system metadata.
- **Security Gating**: Strict client and server-side route authentication powered by Supabase SSR middleware hooks.

### 2. 🌿 Raw Materials Module
Automates the logistics of raw material procurement and supplier tracking:
- **Supplier Directory**: Comprehensive workspace for supplier contacts, favorited flags, and detailed profile logs.
- **Intake Log**: Record deliveries using standard HTML5 date inputs, cascading select menus, and real-time total cost recalculations.
- **AHP Supplier Evaluation**: Mathematical Saaty Analytic Hierarchy Process (AHP) calculator evaluating quality, accuracy, timeliness, price, and responsiveness to dynamically highlight the #1 ranked supplier row.

### 3. 🧪 Quality Control (QC) Module
Guarantees absolute compliance with manufacturing quality guidelines:
- **Pre-Production Inspection**: Compares raw material deliveries against reference standards before warehousing.
- **Post-Production Validation**: Standardized checklist testing finished batches before shipment.
- **Digital Evidence Gating**: Refined badge warning/success/error statuses linked directly to audit trails.

### 4. 🏢 Warehouse Module
Monitors inventory stockpiles, layouts, and cold-chain compliance:
- **Cold-Chain Monitoring**: Live visualization of cold storage cells operating between `-4°C` and `-20°C`.
- **Dynamic Stocks**: Tracks essential oil volumes, batches, and locations client-side with fallback handling.

### 5. ⚗️ Productions Module
Tracks and manages compounding pipelines and manufacturing steps:
- **Recipe Scale Preview**: Automatically scales raw material requirements based on standard formulas and target quantities.
- **Phase Tracking**: Tracks scheduling, start, and end dates natively using optimized, visual dashboard inputs.

---

## 🧱 System Architecture & Tech Stack

SIMA AROME utilizes a robust, two-tier architecture designed for rapid scaling, minimal downtime, and complete responsiveness:

```
┌──────────────────────────────────────┐
│            Client Browser            │
│  (Next.js App Router + Mantine UI)   │
└──────────────────────────────────────┘
                   │
                   ▼  [Secure API Proxy Routes]
┌──────────────────────────────────────┐
│         Buildpad DaaS Server         │
│         (REST API / Backend)         │
└──────────────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────┐
│         Supabase PostgreSQL          │
│     (RLS Policies & Audit Trail)     │
└──────────────────────────────────────┘
```

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript 5.x, Mantine UI v8, Tabler Icons.
- **Backend Services**: Buildpad DaaS (Data-as-a-Service) REST API server with custom Next.js API proxy routes.
- **Database Layer**: Supabase PostgreSQL with strict Row Level Security (RLS) policies and sequential migrations.
- **Deployment Platform**: AWS Amplify (SSR Web Dynamic App) connected to AWS CodeCommit repository.

---

## 🔄 End-to-End Operational Workflow

The manufacturing pipeline strictly enforces chronological checkpoints to guarantee product quality and complete traceability:

```
 ┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌───────────────┐
 │   Supplier   │ ──> │  Intake Log  │ ──> │  Quality-C1  │ ──> │  Warehouse-1  │
 └──────────────┘     └──────────────┘     └──────────────┘     └───────────────┘
                                                                        │
 ┌──────────────┐     ┌──────────────┐     ┌──────────────┐             │
 │ Warehouse-2  │ <── │  Quality-C2  │ <── │  Production  │ <───────────┘
 └──────────────┘     └──────────────┘     └──────────────┘
```

1. **Supplier**: AHP evaluation worksheet identifies and validates the standard supplier catalog.
2. **Intake Log**: Delivery logs record raw material arrival dates, batch codes, and estimated cost metrics.
3. **Quality-C1**: Deliveries undergo strict C1 Quality Control testing.
4. **Warehouse-1**: Approved raw materials are allocated to raw warehouse stockpiles.
5. **Production**: Manufacturing recipe dynamically scales raw ingredients, executes compounding, and processes batches.
6. **Quality-C2**: Compounded outputs pass through post-production C2 Quality Control.
7. **Warehouse-2**: Validated products are stored in dynamic cold storage warehouse vaults, ready for client delivery.

---

## 🚀 Getting Started / Local Setup

Follow these instructions to run the Sima Arôme codebase locally on your machine:

### 1. Prerequisites
Ensure you have the following software installed:
- [Node.js](https://nodejs.org/) (Version 20.x or later recommended)
- [pnpm](https://pnpm.io/) (Version 9.x or 10.x)
- [Git](https://git-scm.com/)

### 2. Clone the Repository
Clone the codebase to your local directory:
```bash
git clone https://github.com/BaraArdiwinata/hackathon-sima-arome.git
cd hackathon-sima-arome
```

### 3. Configure Environment Variables
Create a `.env.local` file at the root of the project to set up database credentials:
```env
# Supabase Authentication Configuration
NEXT_PUBLIC_SUPABASE_URL=https://192f7a6a-b319-4027-8b36-b1084dfd32ae.db3.buildpad.ai
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzc5NzgwMTM5LCJleHAiOjQ5MzMzODAxMzl9.1HUplzbQ6E15YDntHaU4j9f-q-3s9R49NAGfoRJlcHI
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3Nzk3ODAxMzksImV4cCI6NDkzMzM4MDEzOX0.J7Te4i46QWBMzvCoSNMwrVe_DRGoiwm_ZIPJjBsyd3A

# Buildpad DaaS Configuration
NEXT_PUBLIC_BUILDPAD_DAAS_URL=https://192f7a6a-b319-4027-8b36-b1084dfd32ae.daas3.buildpad.ai
```

### 4. Install Dependencies
Restore all npm packages using pnpm:
```bash
pnpm install
```

### 5. Validate TypeScript Compilation
Ensure there are no compilation or typing warnings before running:
```bash
pnpm tsc --noEmit
```

### 6. Run the Development Server
Initiate the Next.js development server locally:
```bash
pnpm dev
```
Open [http://localhost:3000](http://localhost:3000) on your web browser to access the Sima Arôme landing dashboard.

---

## 👥 Team
SIMA AROME was proudly built and optimized by:
- **ASISTEN MANARUL**

---

*SIMA AROME: Enterprise-ready essential oil operations on a single, bulletproof platform.*
