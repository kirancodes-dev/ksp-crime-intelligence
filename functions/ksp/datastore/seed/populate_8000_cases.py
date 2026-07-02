import os
import sqlite3
import random
from datetime import datetime, timedelta

random.seed(42)

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "ksp_crime.db")

DISTRICTS = [
    (1, "Bengaluru City", 1),
    (2, "Mysuru", 1),
    (3, "Hubballi-Dharwad", 1),
    (4, "Mangaluru", 1),
    (5, "Belagavi", 1)
]

STATIONS = [
    (1, "Bengaluru Central PS", 1, 1, 1, 1, 1),
    (2, "Bengaluru Town PS", 1, 1, 1, 1, 1),
    (3, "Mysuru Central PS", 1, 1, 1, 2, 1),
    (4, "Mysuru Town PS", 1, 1, 1, 2, 1),
    (5, "Hubballi Central PS", 1, 1, 1, 3, 1),
    (6, "Hubballi Town PS", 1, 1, 1, 3, 1),
    (7, "Mangaluru Central PS", 1, 1, 1, 4, 1),
    (8, "Mangaluru Town PS", 1, 1, 1, 4, 1),
    (9, "Belagavi Central PS", 1, 1, 1, 5, 1),
    (10, "Belagavi Town PS", 1, 1, 1, 5, 1)
]

EMPLOYEES = [
    (1, 1, 1, 3, 3, "KGID-1001", "Meera Nair", "1988-05-14", 2, 1, 0, "2012-08-01"),
    (2, 1, 2, 3, 3, "KGID-1002", "Karan Kumar", "1990-07-22", 1, 2, 0, "2014-06-15"),
    (3, 2, 3, 3, 3, "KGID-2001", "Ramesh Gowda", "1985-03-10", 1, 1, 0, "2010-02-20"),
    (4, 2, 4, 3, 3, "KGID-2002", "Suresh Murthy", "1987-11-05", 1, 3, 0, "2011-12-10"),
    (5, 3, 5, 3, 3, "KGID-3001", "Anitha Rao", "1989-09-18", 2, 2, 0, "2013-05-01"),
    (6, 3, 6, 3, 3, "KGID-3002", "Vijay Prasad", "1991-01-25", 1, 1, 0, "2015-10-10"),
    (7, 4, 7, 3, 3, "KGID-4001", "Sunitha Kumari", "1986-12-30", 2, 3, 0, "2011-04-12"),
    (8, 4, 8, 3, 3, "KGID-4002", "Sandesh Hegde", "1988-02-14", 1, 1, 0, "2013-07-19"),
    (9, 5, 9, 3, 3, "KGID-5001", "Priya Shenoy", "1990-04-05", 2, 2, 0, "2014-09-01"),
    (10, 5, 10, 3, 3, "KGID-5002", "Deepak Patil", "1992-06-30", 1, 1, 0, "2016-11-15")
]

CRIME_CATEGORIES = [
    (1, "Cyber Crime"),
    (2, "Theft"),
    (3, "Organized Crime"),
    (4, "Financial Fraud"),
    (5, "Assault")
]

CRIME_SUBHEADS = [
    (1, 1, "Phishing Scams", 1),
    (2, 1, "SIM Swap Fraud", 2),
    (3, 1, "Part-time Job Scams", 3),
    (4, 2, "Gold Chain Snatching", 1),
    (5, 2, "House Break-in (HBT)", 2),
    (6, 3, "Extortion", 1),
    (7, 3, "Illegal Sand Mining", 2),
    (8, 4, "Ponzi Schemes", 1),
    (9, 4, "Job Placement Racket", 2),
    (10, 5, "Road Rage Assault", 1)
]

COURTS = [
    (1, "Bengaluru City Court", 1, 1, 1),
    (2, "Mysuru District Court", 2, 1, 1),
    (3, "Hubballi Court", 3, 1, 1),
    (4, "Mangaluru Court", 4, 1, 1),
    (5, "Belagavi Court", 5, 1, 1)
]

ACTS = [
    ("IPC", "Indian Penal Code", "IPC", 1),
    ("BNS", "Bharatiya Nyaya Sanhita", "BNS", 1),
    ("IT", "Information Technology Act", "IT Act", 1)
]

SECTIONS = [
    ("IPC", "379", "Theft punishment", 1),
    ("IPC", "420", "Cheating and dishonestly inducing delivery of property", 1),
    ("IPC", "307", "Attempt to murder", 1),
    ("BNS", "303", "Theft punishment under BNS", 1),
    ("BNS", "318", "Cheating under BNS", 1),
    ("BNS", "109", "Attempt to murder under BNS", 1),
    ("IT", "66C", "Identity theft punishment", 1),
    ("IT", "66D", "Cheating by personation using computer resource", 1)
]

CRIME_TEMPLATES = {
    1: [
        {"mo": "KYC suspension SMS phishing scam directing to replica banking portal.", 
         "desc": "Victim received SMS indicating urgent bank account suspension unless KYC verified. Clicked link and entered net-banking credentials. Fraudulent transfer of Rs 1,50,000 executed.", 
         "address": "Koramangala 3rd Block, Near Post Office", 
         "ipc": None, "bns": "318", "it": "66D"},
        {"mo": "SIM swap fraud bypassing bank OTP authentication.", 
         "desc": "Victim's mobile network connection suddenly deactivated. Accused obtained duplicate SIM from outlet with fake ID and transferred Rs 4,80,000 from victim's savings account.", 
         "address": "Indiranagar 100ft Road, Near Metro Station", 
         "ipc": "420", "bns": None, "it": "66C"}
    ],
    2: [
        {"mo": "Snatching gold chains from elderly women during morning walks using motorbikes.", 
         "desc": "Victim, age 62, walking at 6:30 AM was approached by two men on a black Pulsar motorcycle without license plates. Pillion rider snatched gold chain weighing 40g and fled.", 
         "address": "Jayanagar 4th Block, 9th Cross Road", 
         "ipc": "379", "bns": None, "it": None},
        {"mo": "Night house break-in (HBT) through weak terrace security during holidays.", 
         "desc": "Complainant returned from holiday to find back door locks broken. Wardrobes ransacked. Gold jewelry worth Rs 5,00,000 and Rs 80,000 cash missing.", 
         "address": "Malleshwaram 15th Cross, Residential Layout", 
         "ipc": "379", "bns": "303", "it": None}
    ],
    3: [
        {"mo": "Extortion of local builders by organized local rowdy-sheeters.", 
         "desc": "Complainant, a real estate developer, threatened by local gang members demanding hafta of Rs 5,00,000 to allow construction of a commercial complex.", 
         "address": "Rajajinagar Industrial Area, Behind Warehouses", 
         "ipc": "420", "bns": "318", "it": None},
        {"mo": "Illegal sand mining and interstate transport in dry riverbeds.", 
         "desc": "Raid conducted by special squad. Three trucks loaded with illegally mined river sand seized near the river banks. Accused fled site.", 
         "address": "Cauvery River Basin Area, T-Narasipura Road", 
         "ipc": "379", "bns": "303", "it": None}
    ],
    4: [
        {"mo": "Ponzi scheme promising double returns on agricultural investments.", 
         "desc": "Accused set up fake agricultural cooperative company, collected deposits from over 150 local farmers, and closed office suddenly, absconding with Rs 1.2 Crore.", 
         "address": "Mysuru Road, Near Kengeri Satellite Town", 
         "ipc": "420", "bns": None, "it": None},
        {"mo": "Fake government job placement racket charging administrative fees.", 
         "desc": "Accused claimed to be senior secretariat staff, issued forged appointment letters for KPSC postings, and cheated 12 candidates of Rs 5,00,000 each.", 
         "address": "Vidhana Soudha Area, Near Cubbon Park", 
         "ipc": "420", "bns": "318", "it": None}
    ],
    5: [
        {"mo": "Road rage assault following minor traffic collision.", 
         "desc": "After a minor vehicle collision at traffic signal, accused dragged the victim out and assaulted with iron rod, causing fracture to left arm.", 
         "address": "Outer Ring Road, Marathahalli Junction", 
         "ipc": "307", "bns": "109", "it": None}
    ]
}

NAMES = [
    "Karan Kumar", "Ramesh Gowda", "Suresh Murthy", "Anitha Rao",
    "Manjunath Swamy", "Sunitha Kumari", "Vijay Prasad", "Naveen Naik",
    "Sandesh Hegde", "Priya Shenoy", "Rajesh Nayak", "Deepak Patil",
    "Shankar Pujari", "Kavitha Patil", "Mohan Lal", "Abdul Rahiman",
    "Imran Khan", "Jyothi Reddy", "Satish Kumar", "Bharati Bhat",
    "Giridhar Pai", "Chethan Kumar", "Vinayaka Bhat", "Shruthi Naik",
    "Lakshmi Devi", "Ravi Shankar", "Pooja Sharma", "Siddharth Rao"
]

OCCUPATIONS = [
    (1, "Software Engineer"), (2, "Business Owner"), (3, "Farmer"),
    (4, "Unemployed"), (5, "Driver"), (6, "Student"), (7, "Shopkeeper"),
    (8, "Daily Wage Worker")
]

RELIGIONS = [
    (1, "Hindu"), (2, "Muslim"), (3, "Christian"), (4, "Sikh"), (5, "Others")
]

CASTES = [
    (1, "General"), (2, "OBC"), (3, "SC"), (4, "ST")
]

def main():
    print("Connecting to database...")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # 1. Seed Reference Tables if they don't have records
    print("Seeding reference data...")
    cursor.execute("INSERT OR IGNORE INTO State (StateID, StateName) VALUES (1, 'Karnataka')")
    
    for dist in DISTRICTS:
        cursor.execute("INSERT OR IGNORE INTO District (DistrictID, DistrictName, StateID) VALUES (?, ?, ?)", dist)
        
    cursor.execute("INSERT OR IGNORE INTO UnitType (UnitTypeID, UnitTypeName) VALUES (1, 'Police Station')")
    
    for st in STATIONS:
        cursor.execute("INSERT OR IGNORE INTO Unit (UnitID, UnitName, TypeID, ParentUnit, NationalityID, DistrictID, StateID) VALUES (?, ?, ?, ?, ?, ?, ?)", st)
        
    cursor.execute("INSERT OR IGNORE INTO Rank (RankID, RankName, Hierarchy) VALUES (3, 'Sub-Inspector', 3)")
    cursor.execute("INSERT OR IGNORE INTO Designation (DesignationID, DesignationName) VALUES (3, 'SI')")
    
    for emp in EMPLOYEES:
        cursor.execute("INSERT OR IGNORE INTO Employee (EmployeeID, DistrictID, UnitID, RankID, DesignationID, KGID, FirstName, EmployeeDOB, GenderID, BloodGroupID, PhysicallyChallenged, AppointmentDate) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", emp)
        
    for cat in CRIME_CATEGORIES:
        cursor.execute("INSERT OR IGNORE INTO CaseCategory (CaseCategoryID, LookupValue) VALUES (?, ?)", cat)
        
    cursor.execute("INSERT OR IGNORE INTO GravityOffence (GravityOffenceID, LookupValue) VALUES (1, 'Heinous')")
    cursor.execute("INSERT OR IGNORE INTO GravityOffence (GravityOffenceID, LookupValue) VALUES (2, 'Non-Heinous')")
    
    for ch in CRIME_CATEGORIES:
        cursor.execute("INSERT OR IGNORE INTO CrimeHead (CrimeHeadID, CrimeGroupName) VALUES (?, ?)", ch)
        
    for sch in CRIME_SUBHEADS:
        cursor.execute("INSERT OR IGNORE INTO CrimeSubHead (CrimeSubHeadID, CrimeHeadID, CrimeHeadName, SeqID) VALUES (?, ?, ?, ?)", sch)
        
    cursor.execute("INSERT OR IGNORE INTO CaseStatusMaster (CaseStatusID, CaseStatusName) VALUES (1, 'Under Investigation')")
    cursor.execute("INSERT OR IGNORE INTO CaseStatusMaster (CaseStatusID, CaseStatusName) VALUES (2, 'Charge Sheeted')")
    cursor.execute("INSERT OR IGNORE INTO CaseStatusMaster (CaseStatusID, CaseStatusName) VALUES (3, 'Closed')")
    cursor.execute("INSERT OR IGNORE INTO CaseStatusMaster (CaseStatusID, CaseStatusName) VALUES (4, 'Referred')")
    
    for crt in COURTS:
        cursor.execute("INSERT OR IGNORE INTO Court (CourtID, CourtName, DistrictID, StateID, Active) VALUES (?, ?, ?, ?, ?)", crt)
        
    for occ in OCCUPATIONS:
        cursor.execute("INSERT OR IGNORE INTO OccupationMaster (OccupationID, OccupationName) VALUES (?, ?)", occ)
        
    for rel in RELIGIONS:
        cursor.execute("INSERT OR IGNORE INTO ReligionMaster (ReligionID, ReligionName) VALUES (?, ?)", rel)
        
    for cst in CASTES:
        cursor.execute("INSERT OR IGNORE INTO CasteMaster (caste_master_id, caste_master_name) VALUES (?, ?)", cst)
        
    for act in ACTS:
        cursor.execute("INSERT OR IGNORE INTO Act (ActCode, ActDescription, ShortName, Active) VALUES (?, ?, ?, ?)", act)
        
    for sec in SECTIONS:
        cursor.execute("INSERT OR IGNORE INTO Section (ActCode, SectionCode, SectionDescription, Active) VALUES (?, ?, ?, ?)", sec)

    conn.commit()

    # 2. Clean existing transactional tables
    print("Clearing existing transaction tables...")
    cursor.execute("DELETE FROM FIR")
    cursor.execute("DELETE FROM FIR_Accused")
    cursor.execute("DELETE FROM FIR_Victim")
    cursor.execute("DELETE FROM Location")
    cursor.execute("DELETE FROM CaseLinks")
    cursor.execute("DELETE FROM CaseMaster")
    cursor.execute("DELETE FROM Inv_OccuranceTime")
    cursor.execute("DELETE FROM Inv_OccuranceLocation")
    cursor.execute("DELETE FROM ComplainantDetails")
    cursor.execute("DELETE FROM Victim")
    cursor.execute("DELETE FROM Accused")
    cursor.execute("DELETE FROM ArrestSurrender")
    cursor.execute("DELETE FROM inv_arrestsurrenderaccused")
    cursor.execute("DELETE FROM ActSectionAssociation")
    conn.commit()

    # 3. Generate 8000 cases in bulk
    print("Generating 8000 sample cases in bulk...")
    
    fir_data = []
    location_data = []
    fir_accused_data = []
    fir_victim_data = []
    
    case_master_data = []
    occurance_time_data = []
    occurance_location_data = []
    complainant_details_data = []
    cctns_victim_data = []
    cctns_accused_data = []
    act_section_association_data = []
    
    start_date = datetime.now() - timedelta(days=180)
    
    for i in range(1, 8001):
        # Pick random categories, districts, units
        cat_id = random.randint(1, 5)
        cat_name = CRIME_CATEGORIES[cat_id - 1][1]
        
        dist_id = random.randint(1, 5)
        dist_name = DISTRICTS[dist_id - 1][1]
        
        # Select station within district
        station = [s for s in STATIONS if s[5] == dist_id][random.randint(0, 1)]
        station_id = station[0]
        station_name = station[1]
        
        # Select investigator/employee within station
        investigator = [e for e in EMPLOYEES if e[2] == station_id][0]
        io_id = investigator[0]
        
        # Crime template details
        template = random.choice(CRIME_TEMPLATES[cat_id])
        
        # Crime number formatting: 1 digit Case Category + 4 digit District + 4 digit Station + 4 digit Year + 5 digit running serial
        crime_no = f"{cat_id}{dist_id:04d}{station_id:04d}2026{i:05d}"
        case_no = f"Cr-{i:04d}/2026"
        
        days_offset = random.randint(0, 170)
        occ_dt = start_date + timedelta(days=days_offset)
        rep_dt = occ_dt + timedelta(hours=random.randint(2, 48))
        
        # Heinous status definition
        gravity_id = 1 if cat_id in [3, 5] else 2 # Heinous for Organized Crime/Assault
        status_id = random.choices([1, 2, 3, 4], weights=[45, 30, 15, 10], k=1)[0]
        status_name = ["Under Investigation", "Charge Sheeted", "Closed", "Referred"][status_id - 1]
        
        # Geo-coordinates around district
        d_coords = {
            1: (12.9716, 77.5946), # Bengaluru
            2: (12.2958, 76.6394), # Mysuru
            3: (15.3647, 75.1240), # Hubballi-Dharwad
            4: (12.9141, 74.8560), # Mangaluru
            5: (15.8497, 74.4977)  # Belagavi
        }
        center_lat, center_lng = d_coords[dist_id]
        lat = center_lat + random.uniform(-0.04, 0.04)
        lng = center_lng + random.uniform(-0.04, 0.04)
        
        # 1. Simplified FIR
        fir_data.append((
            i, crime_no, dist_name, station_name, cat_name, 
            template["ipc"], template["bns"], status_name, 
            rep_dt.strftime("%Y-%m-%d %H:%M:%S"), 
            occ_dt.strftime("%Y-%m-%d %H:%M:%S"), 
            template["desc"], template["mo"]
        ))
        
        # 2. Simplified Location
        area_type = random.choices(["Urban", "Semi-Urban", "Rural"], weights=[55, 30, 15], k=1)[0]
        location_data.append((
            i, lat, lng, template["address"] + f", {dist_name}", dist_name, area_type
        ))
        
        # 3. CCTNS CaseMaster
        case_master_data.append((
            i, crime_no, case_no, rep_dt.strftime("%Y-%m-%d"), 
            io_id, station_id, cat_id, gravity_id, cat_id, 
            cat_id * 2 - random.randint(0, 1), status_id, dist_id
        ))
        
        # 4. CCTNS Occurrence Time
        occurance_time_data.append((
            i, occ_dt.strftime("%Y-%m-%d %H:%M:%S"), 
            (occ_dt + timedelta(hours=random.randint(1, 3))).strftime("%Y-%m-%d %H:%M:%S"), 
            rep_dt.strftime("%Y-%m-%d %H:%M:%S")
        ))
        
        # 5. CCTNS Occurrence Location
        occurance_location_data.append((
            i, lat, lng, template["desc"]
        ))
        
        # 6. People & Suspect generation (Simplified + CCTNS)
        complainant_name = random.choice(NAMES)
        complainant_details_data.append((
            i, i, complainant_name, random.randint(25, 65), 
            random.randint(1, 8), random.randint(1, 5), random.randint(1, 4), random.randint(1, 2)
        ))
        
        # Simplified and CCTNS victims
        victim_name = f"Victim {random.choice(NAMES).split(' ')[0]}"
        fir_victim_data.append((
            i, victim_name, random.randint(20, 60), 
            random.choice(["M", "F"]), random.choice(["Farmer", "Shopkeeper", "Driver"]), 
            template["address"], "Financial Loss" if cat_id in [1, 4] else "Minor Injury"
        ))
        
        cctns_victim_data.append((
            i, victim_name, random.randint(20, 60), random.randint(1, 2), "0"
        ))
        
        # Accused generation
        accused_name = random.choice(NAMES)
        age = random.randint(18, 55)
        gender = random.choice(["M", "F"])
        prior_conv = random.choices([0, 1, 2, 3], weights=[70, 15, 10, 5], k=1)[0]
        risk_score = round(min(max(prior_conv * 0.25 + random.uniform(0.1, 0.4), 0.1), 0.95), 2)
        gang = random.choice([None, None, "Peenya Tigers", "Outer-ring Gang"])
        edu = random.choice(["Secondary", "Graduate", "Primary", "Illiterate"])
        marital = random.choice(["Single", "Married"])
        migration = random.choice(["Local", "Inter-district Migrant"])
        
        fir_accused_data.append((
            i, accused_name, age, gender, random.choice(["Unemployed", "Driver"]), 
            f"Layout {random.randint(1, 10)}, {dist_name}", prior_conv, risk_score, 
            "v1.0-formula", risk_score - 0.05, risk_score + 0.05, gang, edu, marital, migration
        ))
        
        cctns_accused_data.append((
            i, accused_name, age, random.randint(1, 2), f"PN-{random.randint(100000, 999999)}"
        ))
        
        # 7. Acts & Sections
        if template["ipc"]:
            act_section_association_data.append((i, "IPC", template["ipc"], 1, 1))
        if template["bns"]:
            act_section_association_data.append((i, "BNS", template["bns"], 1, 1))
        if template["it"]:
            act_section_association_data.append((i, "IT", template["it"], 2, 1))

    # Bulk execute inserts
    print("Writing records to database...")
    cursor.executemany("INSERT INTO FIR (id, fir_number, district, police_station, crime_type, ipc_section, bns_section, status, date_reported, date_occurrence, description, modus_operandi) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", fir_data)
    cursor.executemany("INSERT INTO Location (fir_id, latitude, longitude, address, district, area_type) VALUES (?, ?, ?, ?, ?, ?)", location_data)
    cursor.executemany("INSERT INTO FIR_Victim (fir_id, name, age, gender, occupation, address, injury_type) VALUES (?, ?, ?, ?, ?, ?, ?)", fir_victim_data)
    cursor.executemany("INSERT INTO FIR_Accused (fir_id, name, age, gender, occupation, address, prior_convictions, risk_score, risk_model_version, risk_confidence_low, risk_confidence_high, gang_affiliation, education_level, marital_status, migration_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", fir_accused_data)
    
    cursor.executemany("INSERT INTO CaseMaster (CaseMasterID, CrimeNo, CaseNo, CrimeRegisteredDate, PolicePersonID, PoliceStationID, CaseCategoryID, GravityOffenceID, CrimeMajorHeadID, CrimeMinorHeadID, CaseStatusID, CourtID) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", case_master_data)
    cursor.executemany("INSERT INTO Inv_OccuranceTime (CaseMasterID, IncidentFromDate, IncidentToDate, InfoReceivedPSDate) VALUES (?, ?, ?, ?)", occurance_time_data)
    cursor.executemany("INSERT INTO Inv_OccuranceLocation (CaseMasterID, latitude, longitude, BriefFacts) VALUES (?, ?, ?, ?)", occurance_location_data)
    cursor.executemany("INSERT INTO ComplainantDetails (ComplainantID, CaseMasterID, ComplainantName, AgeYear, OccupationID, ReligionID, CasteID, GenderID) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", complainant_details_data)
    cursor.executemany("INSERT INTO Victim (CaseMasterID, VictimName, AgeYear, GenderID, VictimPolice) VALUES (?, ?, ?, ?, ?)", cctns_victim_data)
    cursor.executemany("INSERT INTO Accused (CaseMasterID, AccusedName, AgeYear, GenderID, PersonID) VALUES (?, ?, ?, ?, ?)", cctns_accused_data)
    cursor.executemany("INSERT INTO ActSectionAssociation (CaseMasterID, ActCode, SectionCode, ActOrderID, SectionOrderID) VALUES (?, ?, ?, ?, ?)", act_section_association_data)
    
    conn.commit()
    conn.close()
    
    print("Database population complete!")
    print("Successfully populated:")
    print("  - 8,000 FIR (simplified) & Location records")
    print("  - 8,000 FIR_Accused & FIR_Victim records")
    print("  - 8,000 CaseMaster (CCTNS) records")
    print("  - 8,000 Inv_OccuranceTime & Inv_OccuranceLocation (CCTNS) records")
    print("  - 8,000 ComplainantDetails, Victim & Accused (CCTNS) records")
    print("  - ActSectionAssociation mappings")

if __name__ == "__main__":
    main()
