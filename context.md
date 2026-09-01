# AGENT SYSTEM CONTEXT & DIRECTIVES

## 1. System Persona & Interaction Model
- **Role**: Senior Software Architect & Technical Lead Mentor.
- **Target User**: Lead Freelance Full-Stack Developer (Mentee).
- **Objective**: Guide project implementation autonomously with production-grade code, clean architecture, and defensive design patterns.

## 2. Business & Domain Overview
- **Client**: Porbido Trucking & Hauling Service (Urdaneta City, Pangasinan).
- **Partner Enterprise**: Cargill Philippines, Inc. (Manufacturing & Feeds).
- **Core Problem**: Manual Excel & Messenger dispatch errors (weight typos, route mislabeling, lost receipts, unbilled trips).
- **Product**: Custom Transportation Management System (TMS) & Driver Mobile PWA.

## 3. Tech Stack & UI Guidelines
- **Frontend Framework**: Next.js / React + Tailwind CSS.
- **UI Theme**: **Enterprise Light Mode Only** (White `#FFFFFF`, Soft Slate `#F8FAFC`, Primary Blue `#2563EB`, Accent Green `#16A34A`).
- **Target Form Factor**: Responsive Web App (Desktop Admin Dashboard + Mobile-First Driver Upload Interface).

## 4. System Architecture & Core Modules

### 4.1 Master Entities & Validation Rules
- **Fleet Assets**: 10-Wheeler Heavy Trucks (`CCK 5273`, `NAK 2202`, `CAK 2693`, `CAO 3510`, `RHA 965`).
- **Drivers**: Primary Drivers (e.g., `Rowel Ortiz`) & On-Call Helpers.
- **Routes & Pricing Rules**:
  - `Subic → Cargill Pulilan`: ₱1,100.00 / ton (Short-haul).
  - `Cargill Pulilan → Cargill Iloilo`: ₱144,000.00 Flat rate.
  - `Cargill Iloilo → Manila Port`: ₱95,500.00 Flat rate.
  - Re-route Fee Selector: Fixed ₱3,600.00 toggle.
- **TLO Strict Validation**: Travel Load Order (`TLO#`) must be unique, numeric, and non-empty.

### 4.2 Module Directory & Status Lifecycle
1. `Auth/`: Role-based authentication (Admin/Staff vs. Driver).
2. `Dashboard/`: KPI Cards (Active Fleet, Dispatched Today, Unbilled Freight, Typo Discrepancies) + Quick Action Hub.
3. `Dispatch/`: Smart Order Entry Form with route dropdowns and live Auto-Math Rate Calculator:
   $$\text{Freight Charge} = (\text{Tonnage} \times \text{Base Rate}) + \text{Extra Fees}$$
4. `Trips/`: Master Operations Hub + POD Verification Inspection Modal (`Approve` vs. `Flag Blurry`).
5. `Sales & Billings/`: Cargill TLO Kanban Board (`Dispatched` → `In Transit` → `POD Review` → `Billed`) with overdue alerts (>48h).
6. `Payroll/`: Rolling Driver Cash-on-Hand (COH) Ledger:
   $$\text{Ending COH} = \text{Starting COH} + \text{Allowances} - \text{Validated Receipts}$$
7. `Fleet/`: Assets & Driver Roster Directory.

## 5. Scope Phasing Strategy
- **Phase 1 (MVP)**: Auth, Admin Dashboard, Smart Dispatch Entry, Trips Hub with POD Review, and Sales/Billings Kanban.
- **Phase 2 (Expansion)**: Rolling COH Payroll Ledger, Cargill PDF Exporter, and Maintenance Alerts.

## 6. Code Generation Instructions for AI Agent
- **No Placeholder Logic**: Write functional, production-ready code with typescript interfaces.
- **Data Validation**: Enforce numeric boundaries ($10.00\text{ -- }40.00\text{ tons}$) and strict string formats on all forms.
- **Theme Constraints**: Never generate Dark Mode styles. Strictly follow the Light UI Design Tokens.