import docx
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import parse_xml
from docx.oxml.ns import nsdecls

def set_cell_background(cell, fill_hex):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>')
    tcPr.append(shd)

def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = parse_xml(f'''
        <w:tcMar {nsdecls("w")}>
            <w:top w:w="{top}" w:type="dxa"/>
            <w:bottom w:w="{bottom}" w:type="dxa"/>
            <w:left w:w="{left}" w:type="dxa"/>
            <w:right w:w="{right}" w:type="dxa"/>
        </w:tcMar>
    ''')
    tcPr.append(tcMar)

def create_document():
    doc = Document()
    
    # Page Setup - Margins 1 inch
    for section in doc.sections:
        section.top_margin = Inches(1)
        section.bottom_margin = Inches(1)
        section.left_margin = Inches(1)
        section.right_margin = Inches(1)
        
    # Styles Setup
    style_normal = doc.styles['Normal']
    style_normal.font.name = 'Arial'
    style_normal.font.size = Pt(10.5)
    style_normal.font.color.rgb = RGBColor(0x33, 0x41, 0x55) # Slate 700
    
    # Document Header Title Block
    p_title = doc.add_paragraph()
    p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run_title = p_title.add_run("COMMERCIAL & TECHNICAL SYSTEM PROPOSAL")
    run_title.font.name = 'Arial'
    run_title.font.size = Pt(22)
    run_title.font.bold = True
    run_title.font.color.rgb = RGBColor(0x0F, 0x17, 0x2A) # Slate 900
    
    p_sub = doc.add_paragraph()
    p_sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run_sub = p_sub.add_run("Custom Transportation Management System (TMS) & Financial Operations Engine")
    run_sub.font.name = 'Arial'
    run_sub.font.size = Pt(13)
    run_sub.font.bold = True
    run_sub.font.color.rgb = RGBColor(0x25, 0x63, 0xEB) # Brand Blue
    
    # Metadata Callout Box Table
    meta_table = doc.add_table(rows=2, cols=2)
    meta_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    meta_table.autofit = False
    
    col_widths = [Inches(3.2), Inches(3.2)]
    for row in meta_table.rows:
        for i, cell in enumerate(row.cells):
            cell.width = col_widths[i]
            set_cell_background(cell, "F8FAFC")
            set_cell_margins(cell, top=120, bottom=120, left=180, right=180)
            
    cell_00 = meta_table.cell(0, 0)
    p = cell_00.paragraphs[0]
    p.add_run("TARGET CLIENT COMPANY:\n").font.bold = True
    p.add_run("Porbido Trucking & Hauling Service\n(Zone 1 San Vicente East, Urdaneta City)")
    
    cell_01 = meta_table.cell(0, 1)
    p = cell_01.paragraphs[0]
    p.add_run("PRIMARY CLIENT CUSTOMER:\n").font.bold = True
    p.add_run("Cargill Philippines, Inc.\n(Pulilan Plant & Regional Logistics Hubs)")
    
    cell_10 = meta_table.cell(1, 0)
    p = cell_10.paragraphs[0]
    p.add_run("TARGET SYSTEM USERS:\n").font.bold = True
    p.add_run("Porbido Trucking Management & Admin Staff Only")
    
    cell_11 = meta_table.cell(1, 1)
    p = cell_11.paragraphs[0]
    p.add_run("DOCUMENT VERSION & DATE:\n").font.bold = True
    p.add_run("Version 2.0 (Executive Capstone Edition)\nAugust 2026")

    doc.add_paragraph().paragraph_format.space_after = Pt(12)

    # Helper function for Heading 1
    def add_heading_1(text):
        h = doc.add_paragraph()
        h.paragraph_format.space_before = Pt(18)
        h.paragraph_format.space_after = Pt(6)
        h.paragraph_format.keep_with_next = True
        run = h.add_run(text)
        run.font.name = 'Arial'
        run.font.size = Pt(15)
        run.font.bold = True
        run.font.color.rgb = RGBColor(0x0F, 0x17, 0x2A)
        return h

    # Helper function for Heading 2
    def add_heading_2(text):
        h = doc.add_paragraph()
        h.paragraph_format.space_before = Pt(12)
        h.paragraph_format.space_after = Pt(4)
        h.paragraph_format.keep_with_next = True
        run = h.add_run(text)
        run.font.name = 'Arial'
        run.font.size = Pt(12)
        run.font.bold = True
        run.font.color.rgb = RGBColor(0x25, 0x63, 0xEB)
        return h

    # SECTION 1
    add_heading_1("1. Brief Background of the Client Company")
    
    p = doc.add_paragraph()
    p.paragraph_format.space_after = Pt(6)
    p.paragraph_format.line_spacing = 1.15
    r1 = p.add_run("Porbido Trucking & Hauling Service ")
    r1.font.bold = True
    p.add_run("is an independent contracted logistics provider operating out of Urdaneta City, Pangasinan. The business serves as a primary bulk transport contractor for ")
    r_cargill = p.add_run("Cargill Philippines, Inc.")
    r_cargill.font.bold = True
    p.add_run(", hauling agricultural raw materials, bulk corn, feed ingredients, and bagged goods between major manufacturing feed mills, international sea ports, and regional storage facilities across Luzon and the Visayas.")

    p2 = doc.add_paragraph()
    p2.paragraph_format.space_after = Pt(6)
    p2.paragraph_format.line_spacing = 1.15
    p2.add_run("Key Operational Profile:\n").font.bold = True
    p2.add_run("• Fleet Composition: Total fleet of 8 heavy trucks, featuring 4 heavy-duty 10-wheelers in active daily rotational haulage (Plate Nos. CCK 5273, NAK 2202, CAK 2693, CAO 3510, RHA 965).\n")
    p2.add_run("• Core Routes & Geographical Scope: Short-haul regional shuttles (Subic Port → Cargill Pulilan Feeds Mill; Subic → Cargill Rafian/Baliuag) and long-distance inter-island vessel runs (Pulilan → Cargill Iloilo Facility; Cargill Iloilo → Manila Container Terminal; Manila Port → Baliuag/Pulilan).\n")
    p2.add_run("• Administrative Structure: All office operations, dispatch scheduling, driver cash advances, freight calculations, and monthly client billing statements are managed by only two personnel (the Business Owner and one Administrative Staff).")

    p3 = doc.add_paragraph()
    p3.paragraph_format.space_after = Pt(12)
    p3.paragraph_format.line_spacing = 1.15
    r_target = p3.add_run("Target User Base Clarification: ")
    r_target.font.bold = True
    r_target.font.color.rgb = RGBColor(0xDC, 0x26, 0x26)
    p3.add_run("This proposed Transportation Management System (TMS) will be owned, operated, and utilized exclusively by Porbido Trucking's owners, administrative staff, and drivers. Cargill Philippines serves solely as the external customer receiving the error-free billing output statements generated by this system.")

    # SECTION 2
    add_heading_1("2. Operational Problem Statement, System Purpose & Goals")
    
    add_heading_2("2.1 Current Manual Vulnerabilities & Failure Points")
    p = doc.add_paragraph()
    p.paragraph_format.space_after = Pt(6)
    p.add_run("Operating a multi-vehicle fleet across inter-island routes using paper notes, Excel files, and noisy Messenger group chats has created 5 severe operational bottlenecks:")

    # Table of Audit Problems
    prob_table = doc.add_table(rows=6, cols=3)
    prob_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    prob_table.autofit = False
    
    p_widths = [Inches(1.8), Inches(2.3), Inches(2.3)]
    headers = ["FAILURE POINT", "CURRENT MANUAL VULNERABILITY", "DIRECT FINANCIAL & OPERATIONAL IMPACT"]
    
    # Header Row
    hdr_cells = prob_table.rows[0].cells
    for i, title in enumerate(headers):
        hdr_cells[i].width = p_widths[i]
        set_cell_background(hdr_cells[i], "0F172A")
        set_cell_margins(hdr_cells[i], top=100, bottom=100, left=120, right=120)
        p = hdr_cells[i].paragraphs[0]
        r = p.add_run(title)
        r.font.bold = True
        r.font.size = Pt(9)
        r.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)

    data_probs = [
        ("1. Manual Scale Weight & Rate Encoding Typos", 
         "Staff manually copy weight tonnage from physical scale tickets into Excel cells.", 
         "DIRECT FINANCIAL LOSS: Typos when re-typing numbers lead to underbilling freight charges on Cargill invoices (e.g. historical audit proved -0.07T and -0.11T typos lost ₱151.90 across just 3 sample trips)."),
        
        ("2. Swapped Route Mismatches & Mislabeling", 
         "Origin and destination locations are typed manually as unvalidated text.", 
         "PAYMENT DELAYS: Cargill rejects monthly billing statements during audit checks when logged route names do not match official contracts (e.g., logging Iloilo → Pulilan instead of Iloilo → Manila)."),
        
        ("3. Buried & Forgotten Unbilled Trips", 
         "Dispatch assignments and Delivery Receipt (POD) photos are posted in chat groups.", 
         "UNCOLLECTED REVENUE: Completed trips get buried in Messenger chat history and are left off monthly billing invoices."),
        
        ("4. Cash-on-Hand (COH) & Allowance Tracking Black Hole", 
         "Driver cash advances, trip allowances, and fuel receipts are kept on paper notes or verbal messages.", 
         "PAYROLL DISCREPANCIES: Unclear tracking of cash given before, during, or after trips leads to confusion over remaining balances and driver salary deductions."),
        
        ("5. Lack of Real-Time Trip Status Visibility", 
         "Management must call or message drivers repeatedly to verify truck location and cargo delivery status.", 
         "OPERATIONAL BOTTLENECKS: Lack of live trip tracking (Dispatched ➔ In Transit ➔ POD Uploaded ➔ Billed) makes it hard to know which trucks are available for new shipments or delayed at ports.")
    ]

    for row_idx, data in enumerate(data_probs, start=1):
        row_cells = prob_table.rows[row_idx].cells
        bg_color = "F8FAFC" if row_idx % 2 == 1 else "FFFFFF"
        for i, text in enumerate(data):
            row_cells[i].width = p_widths[i]
            set_cell_background(row_cells[i], bg_color)
            set_cell_margins(row_cells[i], top=80, bottom=80, left=100, right=100)
            p = row_cells[i].paragraphs[0]
            p.paragraph_format.line_spacing = 1.1
            r = p.add_run(text)
            r.font.size = Pt(9)

    doc.add_paragraph().paragraph_format.space_after = Pt(6)

    add_heading_2("2.2 System Purpose & Strategic Business Goals")
    p = doc.add_paragraph()
    p.paragraph_format.space_after = Pt(12)
    p.paragraph_format.line_spacing = 1.15
    p.add_run("The primary purpose of the Porbido TMS is to deploy a lightweight, error-proof digital pipeline that empowers Porbido's 2-person admin team to manage the entire fleet effortlessly. ")
    p.add_run("Strategic Goals:\n").font.bold = True
    p.add_run("1. 100% Typo Elimination: Restrict inputs to verified dropdowns and auto-calculated freight math engines.\n")
    p.add_run("2. 100% Revenue Recovery: Ensure zero completed trips are lost or left un-billed.\n")
    p.add_run("3. Complete Cash Transparency: Track every cash transfer to drivers (before, during, and after trips).\n")
    p.add_run("4. 1-Click Official Statements: Generate audit-ready Cargill client invoice PDFs and driver liquidation slips instantly.")

    # SECTION 3
    add_heading_1("3. System Objectives (Operational Streamlining Breakdown)")
    
    p = doc.add_paragraph()
    p.paragraph_format.space_after = Pt(6)
    p.paragraph_format.line_spacing = 1.15
    p.add_run("To eliminate manual bottlenecks, the system streamlines Porbido's business operations across 4 core operational pillars:")

    objectives = [
        ("A. Truck & Fleet Asset Management Objective", "Streamline fleet tracking and maintenance governance by logging oil change timestamps, tire replacement history, repair logs, and asset availability per truck plate number."),
        ("B. Dispatch & Billing Reconciliation Objective", "Eliminate encoding typos by automating freight charge calculations (Tonnage × Rate + ₱3,600 Re-route Fee) and bi-directionally cross-matching Porbido internal logs against Cargill statements to catch underbillings."),
        ("C. Payroll & Cash Settlement Objective", "Streamline driver payroll through automated destination-based rates (higher rates for inter-island cross-sea runs), rolling Cash-on-Hand (COH) carry-over balances, flexible Cash Advance deduction rules, and 1-click printable payment slips."),
        ("D. System Governance & Auditability Objective", "Protect company data through role-based access control (Owner vs Admin Staff vs Driver) and comprehensive user activity audit logs recording every creation, update, or deletion.")
    ]

    for title, desc in objectives:
        add_heading_2(title)
        p = doc.add_paragraph()
        p.paragraph_format.space_after = Pt(6)
        p.paragraph_format.line_spacing = 1.15
        p.add_run(desc)

    # SECTION 4
    add_heading_1("4. Comprehensive System Feature Catalog & Modules")
    
    p = doc.add_paragraph()
    p.paragraph_format.space_after = Pt(8)
    p.paragraph_format.line_spacing = 1.15
    p.add_run("Below is the detailed feature catalog detailing the 10 planned system modules, their descriptions, and business operational goals:")

    features_catalog = [
        ("1. Instant Executive Operations Command Dashboard", 
         "A high-impact executive dashboard that displays essential daily operational metrics immediately upon user login ('Boom!' instant metrics). Includes live counters for Active Fleet Count, Dispatched Trips Today, Unbilled Freight Total (₱), and Typo Discrepancy Alerts.", 
         "To provide Porbido management with instant daily operational visibility and immediate awareness of urgent unbilled trips or discrepancies without searching through spreadsheets."),
        
        ("2. Error-Proof Smart Dispatch Entry & Auto-Math Engine", 
         "A structured dispatch encoding form featuring standardized dropdown route selectors, strict numeric Travel Load Order (TLO#) validation with Firestore duplicate detection, and automated freight charge math [Freight = Tonnage × Rate + ₱3,600 Re-route Fee].", 
         "To completely eliminate weight transcription typos, bad TLO numbers, and incorrect destination entries at the exact moment of encoding."),
        
        ("3. Master Operations & Trip Lifecycle Hub", 
         "A non-scrollable 100% viewport width fluid master table formatted specifically for screen visibility. Features status filtering tabs (All Trips, In Transit, POD Review, Billed), Frontload vs Backload route classification tags, date range filtering, and column sorting.", 
         "To give staff a clear visual hub to monitor every trip's lifecycle status, distinguish frontload from backload runs, and locate any historical trip record in seconds."),
        
        ("4. Driver Cash-on-Hand (COH) Sent Log & Allowance Tracker", 
         "A dedicated transaction ledger tracking every single time cash or allowances are sent to a driver—whether before dispatch, during the trip via ATM/GCash, or for emergency truck repairs.", 
         "To eliminate the COH 'black hole', track multiple cash transfers per trip, and ensure 100% transparent cash liquidation between management and drivers."),
        
        ("5. Driver & Helper Payroll Engine & Printable Payment Slips", 
         "A payroll calculator that automatically computes destination-based trip rates (applying higher premium rates for cross-sea inter-island runs), deducts cash advances, and generates official 1-click printable payment slips for drivers and helpers.", 
         "To streamline payroll preparation from days to minutes and provide drivers with clear, professional printed payslips that prevent salary disputes."),
        
        ("6. Flexible Cash Advance Deduction Selector Engine", 
         "An intelligent deduction engine that gives management the option to deduct a driver's cash advance either: (a) From the next trip's cash allowance OR (b) From their upcoming monthly payroll salary payout.", 
         "To provide management with operational flexibility in recovering cash advances based on driver preferences and trip circumstances."),
        
        ("7. Enterprise Report Generator (.xlsx Excel & .pdf Statements)", 
         "An automated statement exporter capable of generating 1-click official Cargill Client Billing Summaries (matching Summary 29_B to 50_B layout) and Porbido 3-Box Driver Settlement sheets in both printable PDF and Excel (.xlsx) formats.", 
         "To save days of manual spreadsheet formatting and provide Cargill and Porbido management with audit-ready billing statements."),
        
        ("8. Fleet Maintenance & Repair Service Tracker", 
         "A dedicated fleet asset maintenance log that records oil change timestamps, tire replacement history, repair notes, and upcoming service due warnings per truck plate (CCK 5273, NAK 2202, CAK 2693, CAO 3510, RHA 965).", 
         "To prevent costly truck breakdowns on inter-island trips, prolong heavy asset lifespan, and ensure fleet reliability."),
        
        ("9. System Security Audit Log (User Activity Tracker)", 
         "An automated background security log that records every action performed in the system—capturing timestamp, user identity, action type (created, edited, deleted), and exact field changes made.", 
         "To enforce strict accountability, protect financial records from unauthorized tampering, and maintain a complete audit trail."),
        
        ("10. Role-Based User Access Management (RBAC)", 
         "A security permission control system that restricts user access on a per-module basis (Owner Access, Admin Staff Access, Accounting View, and Driver Mobile View).", 
         "To ensure staff members only access modules relevant to their job roles while protecting sensitive financial profit data.")
    ]

    for f_name, f_desc, f_goal in features_catalog:
        add_heading_2(f_name)
        p = doc.add_paragraph()
        p.paragraph_format.space_after = Pt(4)
        p.paragraph_format.line_spacing = 1.15
        p.add_run("Description: ").font.bold = True
        p.add_run(f_desc)
        
        p_g = doc.add_paragraph()
        p_g.paragraph_format.space_after = Pt(8)
        p_g.paragraph_format.line_spacing = 1.15
        r_g = p_g.add_run("Operational Purpose & Goal: ")
        r_g.font.bold = True
        r_g.font.color.rgb = RGBColor(0x16, 0xA3, 0x4A) # Accent Green
        p_g.add_run(f_goal)

    # SECTION 5
    add_heading_1("5. Project Timeline & Professional Commercial Pricing")
    
    add_heading_2("5.1 Professional Investment & Phased Rollout Structure")
    p = doc.add_paragraph()
    p.paragraph_format.space_after = Pt(8)
    p.paragraph_format.line_spacing = 1.15
    p.add_run("The commercial investment for developing, testing, and deploying the custom Porbido TMS is structured into three modular phases, allowing Porbido Trucking to launch core operations immediately while expanding enterprise features seamlessly:")

    # Pricing Table
    price_table = doc.add_table(rows=5, cols=3)
    price_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    price_table.autofit = False
    
    pr_widths = [Inches(2.2), Inches(3.0), Inches(1.2)]
    pr_headers = ["PROJECT PHASE", "DELIVERABLES & MODULES INCLUDED", "INVESTMENT"]
    
    hdr_cells = price_table.rows[0].cells
    for i, title in enumerate(pr_headers):
        hdr_cells[i].width = pr_widths[i]
        set_cell_background(hdr_cells[i], "0F172A")
        set_cell_margins(hdr_cells[i], top=100, bottom=100, left=120, right=120)
        p = hdr_cells[i].paragraphs[0]
        r = p.add_run(title)
        r.font.bold = True
        r.font.size = Pt(9)
        r.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)

    pr_data = [
        ("Phase 1: Core Operations & Error-Proof Dispatch (MVP)", "Instant Executive Dashboard, Smart Dispatch Entry with Auto-Math Freight, Master Operations Hub with Frontload/Backload tags & Status Filters.", "₱45,000.00"),
        ("Phase 2: Financial Reconciliation & Driver Payroll Expansion", "Driver COH Sent Log, Rolling Allowance Tracker, Flexible CA Deduction Engine, Driver Payroll & Printable Payslips, 1-Click Cargill & Porbido Report Exporter (.xlsx & .pdf).", "₱30,000.00"),
        ("Phase 3: Fleet Maintenance & Enterprise Governance", "Fleet Maintenance & Service Tracker (Oil/Tires), System Security Audit Log, Role-Based Access Control (RBAC), Mobile Driver PWA Receipt Upload Queue.", "₱20,000.00"),
        ("★ COMPLETE ENTERPRISE BUNDLE SPECIAL (Phases 1, 2 & 3 Combined)", "Full end-to-end deployment including all 10 operational dispatching, financial reconciliation, driver payroll, fleet maintenance, and audit log modules.", "₱68,000.00\n(Save ₱27,000)")
    ]

    for row_idx, data in enumerate(pr_data, start=1):
        row_cells = price_table.rows[row_idx].cells
        bg_color = "ECFDF5" if row_idx == 4 else ("F8FAFC" if row_idx % 2 == 1 else "FFFFFF")
        for i, text in enumerate(data):
            row_cells[i].width = pr_widths[i]
            set_cell_background(row_cells[i], bg_color)
            set_cell_margins(row_cells[i], top=80, bottom=80, left=100, right=100)
            p = row_cells[i].paragraphs[0]
            p.paragraph_format.line_spacing = 1.1
            r = p.add_run(text)
            if row_idx == 4:
                r.font.bold = True
                if i == 2:
                    r.font.color.rgb = RGBColor(0x16, 0xA3, 0x4A)
            r.font.size = Pt(9)

    doc.add_paragraph().paragraph_format.space_after = Pt(8)

    add_heading_2("5.2 Milestone Payment Structure (40 / 40 / 20 Split)")
    p = doc.add_paragraph()
    p.paragraph_format.space_after = Pt(6)
    p.paragraph_format.line_spacing = 1.15
    p.add_run("Payments are structured into three clear performance milestones tied directly to verifiable software deliverables:")

    # Milestone Table
    ms_table = doc.add_table(rows=4, cols=4)
    ms_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    ms_table.autofit = False
    
    m_widths = [Inches(1.8), Inches(2.6), Inches(0.8), Inches(1.2)]
    m_headers = ["MILESTONE", "TRIGGER / CHECKPOINT", "SPLIT %", "BUNDLE AMOUNT"]
    
    hdr_cells = ms_table.rows[0].cells
    for i, title in enumerate(m_headers):
        hdr_cells[i].width = m_widths[i]
        set_cell_background(hdr_cells[i], "0F172A")
        set_cell_margins(hdr_cells[i], top=100, bottom=100, left=100, right=100)
        p = hdr_cells[i].paragraphs[0]
        r = p.add_run(title)
        r.font.bold = True
        r.font.size = Pt(9)
        r.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)

    ms_data = [
        ("1. Kickoff Deposit", "Proposal signing, project initialization, and database architecture setup.", "40%", "₱27,200.00"),
        ("2. Beta Review & UAT", "Functional core system built and demonstrated with sample Cargill billing data.", "40%", "₱27,200.00"),
        ("3. Final Handover", "Production deployment, staff 1-on-1 training, and source code handover.", "20%", "₱13,600.00")
    ]

    for row_idx, data in enumerate(ms_data, start=1):
        row_cells = ms_table.rows[row_idx].cells
        bg_color = "F8FAFC" if row_idx % 2 == 1 else "FFFFFF"
        for i, text in enumerate(data):
            row_cells[i].width = m_widths[i]
            set_cell_background(row_cells[i], bg_color)
            set_cell_margins(row_cells[i], top=80, bottom=80, left=100, right=100)
            p = row_cells[i].paragraphs[0]
            r = p.add_run(text)
            r.font.size = Pt(9)
            if i == 3:
                r.font.bold = True

    doc.add_paragraph().paragraph_format.space_after = Pt(8)

    add_heading_2("5.3 4-Week Development & Deployment Schedule")
    p = doc.add_paragraph()
    p.paragraph_format.space_after = Pt(6)
    p.paragraph_format.line_spacing = 1.15
    p.add_run("• Week 1: Database Setup, Active Fleet & Driver Roster, Smart Dispatch Form with Route Dropdowns.\n")
    p.add_run("• Week 2: Auto-Math Freight Calculation Engine, Master Operations Hub with Frontload/Backload Tags.\n")
    p.add_run("• Week 3: Driver COH Sent Log, Driver & Helper Payroll Engine, 1-Click Statement Generator (.xlsx & .pdf).\n")
    p.add_run("• Week 4: Fleet Maintenance Log, User Access Control, User Acceptance Testing (UAT), Staff Training & Official Production Go-Live!")

    add_heading_2("5.4 Warranty & Technical SLA Support Terms")
    p = doc.add_paragraph()
    p.paragraph_format.space_after = Pt(12)
    p.paragraph_format.line_spacing = 1.15
    p.add_run("• 30-Day Post-Launch Technical Warranty (Free): ").font.bold = True
    p.add_run("Includes 30 calendar days of complimentary technical warranty support following production go-live covering bug fixes, formula adjustments, database tweaks, and administrative staff assistance.\n")
    p.add_run("• Optional Ongoing Technical SLA Maintenance Package (₱3,500.00 / month): ").font.bold = True
    p.add_run("Following the 30-day warranty, Porbido may opt for an ongoing technical agreement covering cloud hosting management, automated daily database backups, data safety guarantees, and priority technical updates.")

    # Sign-off Block
    p_sign = doc.add_paragraph()
    p_sign.paragraph_format.space_before = Pt(24)
    p_sign.paragraph_format.keep_with_next = True
    p_sign.add_run("PROPOSAL ACCEPTANCE & SIGN-OFF\n\n").font.bold = True
    p_sign.add_run("Submitted by: Senior Software Engineering Team\n\n")
    p_sign.add_run("Accepted & Approved by:\n\n\n\n")
    p_sign.add_run("_________________________________________\n").font.bold = True
    p_sign.add_run("PORBIDO TRUCKING & HAULING SERVICE MANAGEMENT\n").font.bold = True
    p_sign.add_run("Date: ________________________")

    # Save document
    output_path = r"c:\kudecode\porbido-trucking\docs\Porbido_Commercial_System_Proposal.docx"
    doc.save(output_path)
    print(f"Word Document successfully saved to {output_path}")

if __name__ == "__main__":
    create_document()
