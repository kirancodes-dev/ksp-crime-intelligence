import os
import sqlite3
import random
import json
from datetime import datetime, timedelta

random.seed(42)

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "ksp_crime.db")
SCHEMA_PATH = os.path.join(os.path.dirname(__file__), "..", "schema.sql")

DISTRICTS = {
    "Bengaluru City": {
        "lat": 12.9716, "lng": 77.5946, "radius": 0.08,
        "literacy": 88.7, "unemployment": 5.2, "poverty": 12.4, "density": 3.8,
        "urbanization": 92.0, "migration": 0.72, "pop_density": 4381.0
    },
    "Mysuru": {
        "lat": 12.2958, "lng": 76.6394, "radius": 0.04,
        "literacy": 82.5, "unemployment": 6.8, "poverty": 18.2, "density": 1.9,
        "urbanization": 58.0, "migration": 0.35, "pop_density": 476.0
    },
    "Hubballi-Dharwad": {
        "lat": 15.3647, "lng": 75.1240, "radius": 0.04,
        "literacy": 80.1, "unemployment": 7.1, "poverty": 21.0, "density": 1.6,
        "urbanization": 52.0, "migration": 0.28, "pop_density": 430.0
    },
    "Mangaluru": {
        "lat": 12.9141, "lng": 74.8560, "radius": 0.03,
        "literacy": 94.0, "unemployment": 4.1, "poverty": 8.5, "density": 2.2,
        "urbanization": 65.0, "migration": 0.40, "pop_density": 583.0
    },
    "Belagavi": {
        "lat": 15.8497, "lng": 74.4977, "radius": 0.05,
        "literacy": 73.5, "unemployment": 8.0, "poverty": 26.5, "density": 1.2,
        "urbanization": 38.0, "migration": 0.18, "pop_density": 338.0
    }
}

CRIME_TEMPLATES = {
    "Cyber Crime": [
        {"mo": "KYC suspension SMS phishing scam directing to replica banking portal.", "desc": "Victim received SMS indicating urgent bank account suspension unless KYC verified. Clicked link and entered net-banking credentials. Fraudulent transfer of Rs 1,50,000 executed.", "address": "Koramangala 3rd Block, Near Post Office"},
        {"mo": "SIM swap fraud bypassing bank OTP authentication.", "desc": "Victim's mobile network connection suddenly deactivated. Accused obtained duplicate SIM from outlet with fake ID and transferred Rs 4,80,000 from victim's savings account.", "address": "Indiranagar 100ft Road, Near Metro Station"},
        {"mo": "Work-from-home Part-time YouTube Likes rating scam.", "desc": "Victim recruited via Telegram for liking videos. Initiated with payouts, then coerced to deposit Rs 8,00,000 in 'crypto investment tasks' which were locked.", "address": "Electronic City Phase 1, Tech Park Avenue"},
        {"mo": "Instant loan app harassment and extortion using manipulated contacts.", "desc": "Victim downloaded mobile loan application. App scraped contacts. Loan of Rs 10,000 paid back double, but accused morphed victim's pictures and sent to contacts demanding Rs 50,000.", "address": "Hebbal Main Road, Near Flyover"}
    ],
    "Theft": [
        {"mo": "Snatching gold chains from elderly women during morning walks using motorbikes.", "desc": "Victim, age 62, walking at 6:30 AM was approached by two men on a black Pulsar motorcycle without license plates. Pillion rider snatched gold chain weighing 40g and fled.", "address": "Jayanagar 4th Block, 9th Cross Road"},
        {"mo": "Night house break-in (HBT) through weak terrace security during holidays.", "desc": "Complainant returned from holiday to find back door locks broken. Wardrobes ransacked. Gold jewelry worth Rs 5,00,000 and Rs 80,000 cash missing.", "address": "Malleshwaram 15th Cross, Residential Layout"},
        {"mo": "Pickpocketing in crowded local buses near major bus terminals.", "desc": "Complainant reports mobile phone (iPhone 14) and leather wallet stolen while boarding BMTC bus route 335E from Majestic Bus Station.", "address": "Majestic Bus Station, Platform 5"},
        {"mo": "Unattended high-end bicycle theft from apartment parking lots.", "desc": "Two expensive gear bicycles stolen overnight from the basement parking of security-guarded apartments. Gate locks uncut; suspected insider help.", "address": "Whitefield Outer Ring Road, Elite Residency"}
    ],
    "Organized Crime": [
        {"mo": "Extortion of local builders by organized local rowdy-sheeters.", "desc": "Complainant, a real estate developer, threatened by local gang members demanding 'hafta' of Rs 5,00,000 to allow construction of a commercial complex.", "address": "Rajajinagar Industrial Area, Behind Warehouses"},
        {"mo": "Illegal sand mining and interstate transport in dry riverbeds.", "desc": "Raid conducted by special squad. Three trucks loaded with illegally mined river sand seized near the river banks. Accused fled site.", "address": "Cauvery River Basin Area, T-Narasipura Road"},
        {"mo": "Armed robbery at local jewelry shop by professional gang.", "desc": "Four masked men entered jewelry store, brandished country-made pistols, tied up staff, and looted gold ornaments worth Rs 45,00,000 within 8 minutes.", "address": "Gandhi Bazaar Main Road, Basavanagudi"}
    ],
    "Financial Fraud": [
        {"mo": "Ponzi scheme promising double returns on agricultural investments.", "desc": "Accused set up fake agricultural cooperative company, collected deposits from over 150 local farmers, and closed office suddenly, absconding with Rs 1.2 Crore.", "address": "Mysuru Road, Near Kengeri Satellite Town"},
        {"mo": "Fake government job placement racket charging administrative fees.", "desc": "Accused claimed to be senior secretariat staff, issued forged appointment letters for KPSC postings, and cheated 12 candidates of Rs 5,00,000 each.", "address": "Vidhana Soudha Area, Near Cubbon Park"},
        {"mo": "Forging property sale deeds to obtain duplicate housing loans.", "desc": "Accused created cloned registry papers of an empty site and took loans from three different cooperative banks using fake identities.", "address": "Hubli City Center, Near Court Complex"}
    ],
    "Assault": [
        {"mo": "Road rage assault following minor traffic collision.", "desc": "After a minor vehicle collision at traffic signal, accused dragged the victim out and assaulted with iron rod, causing fracture to left arm.", "address": "Outer Ring Road, Marathahalli Junction"},
        {"mo": "Domestic violence complaint escalated to grievous bodily harm.", "desc": "Victim reported prolonged domestic abuse resulting in hospital admission with broken ribs and facial trauma.", "address": "HSR Layout Sector 3, Residential Block"}
    ]
}

NAMES = [
    ("Karan Kumar", "M"), ("Ramesh Gowda", "M"), ("Suresh Murthy", "M"), ("Anitha Rao", "F"),
    ("Manjunath Swamy", "M"), ("Sunitha Kumari", "F"), ("Vijay Prasad", "M"), ("Naveen Naik", "M"),
    ("Sandesh Hegde", "M"), ("Priya Shenoy", "F"), ("Rajesh Nayak", "M"), ("Deepak Patil", "M"),
    ("Shankar Pujari", "M"), ("Kavitha Patil", "F"), ("Mohan Lal", "M"), ("Abdul Rahiman", "M"),
    ("Imran Khan", "M"), ("Jyothi Reddy", "F"), ("Satish Kumar", "M"), ("Bharati Bhat", "F"),
    ("Giridhar Pai", "M"), ("Chethan Kumar", "M"), ("Vinayaka Bhat", "M"), ("Shruthi Naik", "F"),
    ("Lakshmi Devi", "F"), ("Ravi Shankar", "M"), ("Pooja Sharma", "F"), ("Siddharth Rao", "M")
]

OCCUPATIONS = ["Software Engineer", "Business Owner", "Farmer", "Unemployed", "Driver",
               "Construction Worker", "Retired Teacher", "Housewife", "Broker", "Student",
               "Daily Wage Worker", "Auto Rickshaw Driver", "Security Guard", "Shopkeeper"]
EDUCATION_LEVELS = ["Illiterate", "Primary", "Secondary", "Higher Secondary", "Graduate", "Post Graduate", "Unknown"]
MARITAL_STATUSES = ["Single", "Married", "Divorced", "Widowed"]
MIGRATION_STATUSES = ["Local", "Local", "Inter-district Migrant", "Inter-state Migrant"]

def generate_account_id(prefix="ACC"):
    return f"{prefix}-{random.randint(1000,9999)}-{random.randint(1000,9999)}"

def main():
    total_cases = 1000
    if os.path.exists(DB_PATH):
        os.remove(DB_PATH)
    print("Initializing SQLite Database...")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    print(f"Reading schema from {SCHEMA_PATH}...")
    with open(SCHEMA_PATH, 'r') as schema_file:
        cursor.executescript(schema_file.read())
    conn.commit()

    # Seed SocioEconomicIndicators (extended)
    print("Seeding SocioEconomicIndicators...")
    for district, data in DISTRICTS.items():
        cursor.execute("""
            INSERT OR REPLACE INTO SocioEconomicIndicators
            (district, literacy_rate, unemployment_rate, poverty_index, police_density_per_k,
             urbanization_rate, migration_index, population_density)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (district, data["literacy"], data["unemployment"], data["poverty"],
              data["density"], data["urbanization"], data["migration"], data["pop_density"]))
    conn.commit()

    # Generate FIRs
    print(f"Generating synthetic crime data ({total_cases} cases)...")
    fir_records = []
    recurring_offenders = [
        {"name": "Jagadish alias 'Jacky'", "age": 29, "gender": "M", "occupation": "Driver",
         "address": "Srirampura, Bengaluru", "prior_convictions": 4, "gang": "Kempapura Boys",
         "education": "Secondary", "marital": "Single", "migration": "Local"},
        {"name": "Mohammad Sharief", "age": 34, "gender": "M", "occupation": "Broker",
         "address": "Bannimantap, Mysuru", "prior_convictions": 5, "gang": "Nasser Syndicate",
         "education": "Higher Secondary", "marital": "Married", "migration": "Inter-district Migrant"},
        {"name": "Subhash Patil", "age": 24, "gender": "M", "occupation": "Unemployed",
         "address": "Vidyanagar, Hubballi", "prior_convictions": 2, "gang": "Kempapura Boys",
         "education": "Primary", "marital": "Single", "migration": "Inter-state Migrant"},
        {"name": "Rupa Naik", "age": 27, "gender": "F", "occupation": "Unemployed",
         "address": "Kengeri, Bengaluru", "prior_convictions": 3, "gang": "Nasser Syndicate",
         "education": "Illiterate", "marital": "Divorced", "migration": "Inter-district Migrant"},
        {"name": "Venkatesh 'Venky' Gowda", "age": 31, "gender": "M", "occupation": "Auto Rickshaw Driver",
         "address": "Peenya 2nd Stage, Bengaluru", "prior_convictions": 6, "gang": "Peenya Tigers",
         "education": "Primary", "marital": "Married", "migration": "Local"},
        {"name": "Faisal Ahmed", "age": 22, "gender": "M", "occupation": "Student",
         "address": "Chamrajpet, Bengaluru", "prior_convictions": 1, "gang": "Peenya Tigers",
         "education": "Graduate", "marital": "Single", "migration": "Inter-state Migrant"}
    ]

    start_date = datetime.now() - timedelta(days=180)

    for i in range(1, total_cases + 1):
        fir_number = f"FIR-{2026:04d}-{i:03d}"
        district = random.choice(list(DISTRICTS.keys()))
        crime_type = random.choices(
            list(CRIME_TEMPLATES.keys()),
            weights=[25, 25, 15, 20, 15],
            k=1
        )[0]
        template = random.choice(CRIME_TEMPLATES[crime_type])
        status = random.choices(
            ["Under Investigation", "Charge Sheeted", "Closed", "Referred"],
            weights=[45, 25, 20, 10], k=1
        )[0]
        days_offset = random.randint(0, 170)
        occ_dt = start_date + timedelta(days=days_offset)
        rep_dt = occ_dt + timedelta(days=random.randint(0, 3))

        cursor.execute("""
            INSERT INTO FIR (fir_number, district, police_station, crime_type, status,
                           date_reported, date_occurrence, description, modus_operandi)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (fir_number, district, f"{district.split(' ')[0]} Town PS", crime_type, status,
              rep_dt.strftime("%Y-%m-%d"), occ_dt.strftime("%Y-%m-%d"), template["desc"], template["mo"]))

        fir_id = cursor.lastrowid
        fir_records.append({"id": fir_id, "fir_number": fir_number, "district": district,
                           "crime_type": crime_type, "mo": template["mo"]})

        # Location
        d = DISTRICTS[district]
        lat = d["lat"] + random.uniform(-d["radius"], d["radius"])
        lng = d["lng"] + random.uniform(-d["radius"], d["radius"])
        area_type = random.choices(["Urban", "Semi-Urban", "Rural"], weights=[50, 30, 20], k=1)[0]
        cursor.execute("""
            INSERT INTO Location (fir_id, latitude, longitude, address, district, area_type)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (fir_id, lat, lng, template["address"] + f", {district}", district, area_type))

        # Accused (with extended demographics)
        num_accused = random.choices([0, 1, 2, 3], weights=[5, 50, 35, 10], k=1)[0]
        for _ in range(num_accused):
            if random.random() < 0.35:
                acc = random.choice(recurring_offenders)
                name, age, gender = acc["name"], acc["age"], acc["gender"]
                occ, addr, priors, gang = acc["occupation"], acc["address"], acc["prior_convictions"], acc["gang"]
                edu, marital, mig = acc["education"], acc["marital"], acc["migration"]
            else:
                pick = random.choice(NAMES)
                name, gender = pick
                age = random.randint(18, 60)
                occ = random.choice(OCCUPATIONS)
                addr = f"Layout {random.randint(1,12)}, {district}"
                priors = random.choices([0, 0, 0, 1, 2, 3], weights=[40, 20, 10, 15, 10, 5], k=1)[0]
                gang = random.choice([None, None, None, None, "Local Boys", "Outer-ring Gang"])
                edu = random.choices(EDUCATION_LEVELS[:-1], weights=[10, 20, 25, 20, 15, 10], k=1)[0]
                marital = random.choice(MARITAL_STATUSES)
                mig = random.choice(MIGRATION_STATUSES)

            base_score = priors * 0.15 + (1 if age < 25 else 0) * 0.1 + (1 if gang else 0) * 0.3
            risk_score = min(max(base_score + random.uniform(0.1, 0.35), 0.1), 0.95)

            cursor.execute("""
                INSERT INTO Accused (fir_id, name, age, gender, occupation, address,
                    prior_convictions, risk_score, gang_affiliation,
                    education_level, marital_status, migration_status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (fir_id, name, age, gender, occ, addr, priors, round(risk_score, 2),
                  gang, edu, marital, mig))

        # Victims
        num_victims = random.choice([1, 1, 2])
        for _ in range(num_victims):
            pick = random.choice(NAMES)
            v_injury = "Financial Loss" if crime_type in ["Cyber Crime", "Financial Fraud"] else \
                       random.choice(["None", "None", "Minor Scratches", "Severe Shock", "Financial Loss", "Grievous Injury"])
            cursor.execute("""
                INSERT INTO Victim (fir_id, name, age, gender, occupation, address, injury_type)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (fir_id, f"Complainant {pick[0].split(' ')[0]}", random.randint(21, 75),
                  pick[1], random.choice(OCCUPATIONS), f"Sector {random.randint(1,6)}, {district}", v_injury))
    conn.commit()

    # CaseLinks
    print("Generating CaseLinks...")
    cursor.execute("SELECT id, fir_id, name FROM Accused")
    accused_list = cursor.fetchall()
    acc_map = {}
    for acc in accused_list:
        acc_id, f_id, name = acc
        acc_map.setdefault(name, []).append(f_id)

    linked_pairs = set()
    for name, f_ids in acc_map.items():
        if len(f_ids) > 1:
            for j in range(len(f_ids)):
                for k in range(j+1, len(f_ids)):
                    pair = tuple(sorted([f_ids[j], f_ids[k]]))
                    if pair not in linked_pairs:
                        linked_pairs.add(pair)
                        cursor.execute("""
                            INSERT INTO CaseLinks (source_fir_id, target_fir_id, link_type, confidence_score, description)
                            VALUES (?, ?, ?, ?, ?)
                        """, (pair[0], pair[1], 'common_accused', round(random.uniform(0.85, 0.98), 2),
                              f"Linked: repeat offender '{name}' in both cases."))

    mo_map = {}
    for f in fir_records:
        mo_map.setdefault(f["mo"], []).append(f["id"])
    for mo_text, f_ids in mo_map.items():
        if len(f_ids) > 1:
            picks = random.sample(f_ids, min(len(f_ids), 4))
            for j in range(len(picks)):
                for k in range(j+1, len(picks)):
                    pair = tuple(sorted([picks[j], picks[k]]))
                    if pair not in linked_pairs:
                        linked_pairs.add(pair)
                        cursor.execute("""
                            INSERT INTO CaseLinks (source_fir_id, target_fir_id, link_type, confidence_score, description)
                            VALUES (?, ?, ?, ?, ?)
                        """, (pair[0], pair[1], 'modus_operandi', round(random.uniform(0.60, 0.82), 2),
                              f"Linked: identical MO pattern: '{mo_text[:80]}'"))

    cursor.execute("SELECT fir_id, latitude, longitude, district FROM Location")
    locs = cursor.fetchall()
    for j in range(len(locs)):
        for k in range(j+1, min(len(locs), j+20)):
            f1, lat1, lng1, d1 = locs[j]
            f2, lat2, lng2, d2 = locs[k]
            if d1 == d2:
                dist = ((lat1 - lat2)**2 + (lng1 - lng2)**2)**0.5
                if dist < 0.012:
                    pair = tuple(sorted([f1, f2]))
                    if pair not in linked_pairs:
                        linked_pairs.add(pair)
                        cursor.execute("""
                            INSERT INTO CaseLinks (source_fir_id, target_fir_id, link_type, confidence_score, description)
                            VALUES (?, ?, ?, ?, ?)
                        """, (pair[0], pair[1], 'location_proximity', round(random.uniform(0.5, 0.75), 2),
                              f"Geographic proximity under 1km in {d1}."))
    conn.commit()

    # Financial Transactions (Section 7)
    print("Generating FinancialTransactions (80 records)...")
    financial_firs = [f for f in fir_records if f["crime_type"] in ["Cyber Crime", "Financial Fraud", "Organized Crime"]]
    account_types = ["Savings Account", "UPI ID", "Hawala Agent", "Shell Company", "Current Account", "Crypto Wallet"]
    txn_types = ["NEFT Transfer", "UPI Payment", "Cash Deposit", "Wire Transfer", "Hawala Transfer", "Crypto Exchange"]

    shell_accounts = [generate_account_id("SHELL") for _ in range(5)]
    hawala_agents = [generate_account_id("HAWALA") for _ in range(3)]

    for fir in financial_firs:
        num_txns = random.randint(1, 4)
        victim_acc = generate_account_id("VIC")
        accused_acc = generate_account_id("ACC")
        for t in range(num_txns):
            txn_date = (start_date + timedelta(days=random.randint(0, 170))).strftime("%Y-%m-%d")
            if t == 0:
                src, src_type = victim_acc, "Savings Account"
                dst = random.choice(shell_accounts + [accused_acc])
                dst_type = random.choice(["Shell Company", "UPI ID", "Current Account"])
            elif t == 1:
                src = random.choice(shell_accounts)
                src_type = "Shell Company"
                dst = random.choice(hawala_agents + [accused_acc])
                dst_type = random.choice(["Hawala Agent", "Current Account"])
            else:
                src = random.choice(hawala_agents + shell_accounts)
                src_type = random.choice(["Hawala Agent", "Shell Company"])
                dst = generate_account_id("DEST")
                dst_type = random.choice(["Crypto Wallet", "Current Account", "Savings Account"])

            amount = random.choice([5000, 10000, 25000, 49999, 75000, 150000, 480000, 800000, 1200000])
            is_suspicious = 1 if amount > 49999 or "Hawala" in src_type or "Shell" in src_type or "Crypto" in dst_type else 0
            suspicion = None
            if is_suspicious:
                reasons = []
                if amount > 100000: reasons.append("Large value transfer exceeding Rs 1,00,000")
                if "Hawala" in src_type or "Hawala" in dst_type: reasons.append("Hawala channel involvement")
                if "Shell" in src_type: reasons.append("Transaction routed through shell entity")
                if "Crypto" in dst_type: reasons.append("Conversion to cryptocurrency detected")
                if amount == 49999: reasons.append("Structuring: amount just below Rs 50,000 reporting threshold")
                suspicion = "; ".join(reasons) if reasons else "Pattern anomaly detected"

            cursor.execute("""
                INSERT INTO FinancialTransaction
                (fir_id, transaction_date, source_account, source_account_type,
                 destination_account, destination_account_type, amount,
                 transaction_type, reference_id, is_suspicious, suspicion_reason)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (fir["id"], txn_date, src, src_type, dst, dst_type, amount,
                  random.choice(txn_types), f"TXN-{fir['id']:04d}-{t+1:03d}", is_suspicious, suspicion))
    conn.commit()

    # Crime Forecasts (Section 8)
    print("Seeding CrimeForecast predictions...")
    forecast_date = datetime.now().strftime("%Y-%m-%d")
    valid_until = (datetime.now() + timedelta(days=14)).strftime("%Y-%m-%d")
    forecasts = [
        ("Bengaluru City", "Cyber Crime", "Critical", 0.89,
         "Sustained 35% month-over-month increase in phishing-based cyber crimes. Digital payment adoption correlated with higher exposure. 4 active MO patterns detected targeting senior citizens.",
         "Deploy cyber awareness campaigns in Koramangala and Indiranagar. Alert CERT-In for coordinated takedown of replica banking portals.",
         "FIR trend analysis (120 days), MO clustering, demographic vulnerability index"),
        ("Belagavi", "Theft", "High", 0.78,
         "Chain snatching incidents show seasonal spike correlating with festival season (October-November). Low police density (1.2 per 1000) leaves coverage gaps in semi-urban zones.",
         "Increase patrol frequency on arterial roads between 5-8 AM. Position plain-clothes units near temple clusters.",
         "Seasonal regression model, patrol density analysis, hotspot recurrence score"),
        ("Mysuru", "Financial Fraud", "High", 0.82,
         "Agricultural investment scams intensifying around harvest seasons. Farmers with limited digital literacy targeted via WhatsApp groups. 3 new shell companies registered in the last 30 days.",
         "Issue public advisories via gram panchayat channels. Coordinate with RBI for shell company flagging.",
         "Company registration data, victim demographics, financial transaction pattern analysis"),
        ("Hubballi-Dharwad", "Organized Crime", "Medium", 0.65,
         "Sand mining activity along Malaprabha river basin shows cyclical pattern peaking during dry season. Two known syndicate operatives released on bail in the last 15 days.",
         "Pre-position surveillance teams at identified mining sites. Monitor bail compliance of known operatives.",
         "Satellite imagery analysis, bail registry cross-reference, informant intelligence"),
        ("Bengaluru City", "Assault", "Medium", 0.61,
         "Road rage incidents concentrate near ORR/Silk Board junction during peak traffic hours. Correlation with construction-related lane closures.",
         "Deploy traffic marshals at high-friction junctions. Install behavioral monitoring CCTV at top 5 locations.",
         "Traffic incident logs, hospital ER admission data, CCTV hotspot analysis"),
        ("Mangaluru", "Cyber Crime", "Medium", 0.58,
         "Emerging pattern of loan app extortion targeting coastal fishing community. 8 similar complaints in the last 45 days with identical app signatures.",
         "Issue coastal community alerts through fisheries cooperatives. Coordinate with Google Play Store for app takedown.",
         "App signature analysis, complaint clustering, digital forensics reports"),
        ("Bengaluru City", "Financial Fraud", "High", 0.84,
         "Job scam racket operating through LinkedIn and Naukri clones. Victims concentrated in recent IT layoff demographic. Estimated Rs 45 lakhs siphoned through 15 mule accounts.",
         "Alert employment exchanges and HR forums. Initiate financial intelligence freeze on identified mule accounts.",
         "Victim interview analysis, account tracing, employment market stress indicators"),
        ("Belagavi", "Organized Crime", "Critical", 0.91,
         "Extortion network expanding from industrial area to agricultural market yards. Intelligence suggests merger of two previously independent rowdy gangs. Weapons procurement activity detected.",
         "Immediate UAPA investigation recommended. Deploy KSRP platoon for area domination. Issue lookout circulars for 6 identified operatives.",
         "HUMINT network reports, weapons seizure trends, gang communication intercepts")
    ]
    for fc in forecasts:
        # fc = (district, crime_type, risk_level, confidence, reasoning, recommended_action, data_sources)
        cursor.execute("""
            INSERT INTO CrimeForecast
            (district, predicted_crime_type, risk_level, confidence, reasoning,
             recommended_action, forecast_date, valid_until, data_sources)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (fc[0], fc[1], fc[2], fc[3], fc[4], fc[5], forecast_date, valid_until, fc[6]))
    conn.commit()

    # Audit Logs (extended with data_classification)
    print("Seeding Audit Logs...")
    audit_samples = [
        ("INV-1002", "Investigator", "Search history for FIR-2026-003", "Case Details View", "2026-06-13T10:14:00Z", "10.12.1.42", "Confidential"),
        ("ANA-2041", "Analyst", "Hotspot query cyber crime in Bengaluru", "Map Rendered", "2026-06-13T11:22:30Z", "10.12.1.88", "Restricted"),
        ("SUP-3001", "Supervisor", "Retrieve risk score for Mohammad Sharief", "Profile scorecard read", "2026-06-13T14:45:10Z", "10.12.1.200", "Secret"),
        ("POL-4001", "Policymaker", "State-wide crime trend comparison", "Trend Chart Rendered", "2026-06-13T15:10:00Z", "10.12.1.250", "Restricted"),
        ("INV-1003", "Investigator", "Financial trail for FIR-2026-012", "Transaction Graph View", "2026-06-13T16:30:00Z", "10.12.1.45", "Secret")
    ]
    for audit in audit_samples:
        cursor.execute("""
            INSERT INTO AuditLog (user_id, role, query_text, action_taken, timestamp, ip_address, data_classification)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, audit)

    conn.commit()
    conn.close()
    print(f"Database seeded successfully at: {DB_PATH}")
    print(f"  {total_cases} FIRs, ~{len(accused_list)} accused, ~{total_cases * 1.35:.0f} victims, financial transactions, {len(forecasts)} forecasts")

if __name__ == "__main__":
    main()
