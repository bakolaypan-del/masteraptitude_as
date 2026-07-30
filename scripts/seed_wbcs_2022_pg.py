import os
import sys
import json
import time

try:
    import psycopg2
    from psycopg2.extras import execute_values
except ImportError:
    print("Installing psycopg2-binary...")
    os.system("pip install psycopg2-binary")
    import psycopg2
    from psycopg2.extras import execute_values

DB_URI = "postgresql://postgres.jwntggzietgsiazjlkbk:Sumankolay%401995@aws-0-ap-southeast-2.pooler.supabase.com:6543/postgres"

def get_connection():
    return psycopg2.connect(DB_URI)

def seed():
    print("Connecting to Supabase PostgreSQL database...")
    conn = get_connection()
    cur = conn.cursor()

    # Ensure tables exist
    cur.execute("""
        CREATE TABLE IF NOT EXISTS tests (
            id VARCHAR(128) PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            topic VARCHAR(255),
            subject_name VARCHAR(100),
            description TEXT,
            category VARCHAR(255),
            test_type VARCHAR(100),
            duration INTEGER DEFAULT 30,
            marks_per_correct NUMERIC(5,2) DEFAULT 1.00,
            negative_marks NUMERIC(5,2) DEFAULT 0.00,
            is_active BOOLEAN DEFAULT TRUE,
            created_at BIGINT
        );

        CREATE TABLE IF NOT EXISTS questions (
            id VARCHAR(128) PRIMARY KEY,
            test_id VARCHAR(128) REFERENCES tests(id) ON DELETE CASCADE,
            topic VARCHAR(255),
            q_no INTEGER,
            question_text TEXT NOT NULL,
            options TEXT[],
            image_url TEXT,
            correct_answer TEXT,
            explanation TEXT,
            created_at BIGINT
        );

        CREATE TABLE IF NOT EXISTS pyqs (
            id VARCHAR(128) PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            subject VARCHAR(255),
            format VARCHAR(50),
            content TEXT,
            status VARCHAR(50) DEFAULT 'published',
            pinned BOOLEAN DEFAULT FALSE,
            created_at BIGINT
        );
    """)
    conn.commit()

    # Check columns in pyqs
    cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'pyqs';")
    pyq_cols = [r[0] for r in cur.fetchall()]

    test_id = "wbcs_pre_2022_official"
    now_ms = int(time.time() * 1000)

    # 1. Upsert test
    cur.execute("""
        INSERT INTO tests (id, title, topic, subject_name, description, category, test_type, duration, marks_per_correct, negative_marks, is_active, created_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (id) DO UPDATE SET
            title = EXCLUDED.title,
            topic = EXCLUDED.topic,
            subject_name = EXCLUDED.subject_name,
            description = EXCLUDED.description,
            category = EXCLUDED.category,
            test_type = EXCLUDED.test_type,
            duration = EXCLUDED.duration,
            marks_per_correct = EXCLUDED.marks_per_correct,
            negative_marks = EXCLUDED.negative_marks;
    """, (
        test_id,
        "WBCS (Prelims) 2022 Official Question Paper",
        "WBCS Prelims — General Studies",
        "General Studies",
        "Official WBCS Prelims 2022 General Studies Paper (Series B). Full 200 Questions, 150 Minutes, 200 Marks with 1/3 negative marking.",
        "WBCS",
        "full",
        150,
        1.00,
        0.33,
        True,
        now_ms
    ))

    # 2. Upsert PYQ document matching table columns
    pdf_url = "https://raw.githubusercontent.com/bakolaypan-del/masteraptitude_as/main/public/WBCS_PRELI_2022_PAPER.pdf"

    if "data" in pyq_cols:
        cur.execute("""
            INSERT INTO pyqs (id, data)
            VALUES (%s, %s)
            ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data;
        """, (
            "pyq_wbcs_pre_2022",
            json.dumps({
                "id": "pyq_wbcs_pre_2022",
                "test_id": test_id,
                "title": "WBCS (Prelims) 2022 Official Test Booklet Series B",
                "subject": "State Exams / WBCS",
                "format": "pdf",
                "pdfUrl": pdf_url,
                "pdfTitle": "WBCS (Prelims) 2022 Full Question Paper PDF",
                "content": "Official WBCS Prelims 2022 General Studies Question Paper Series B with full answer keys, 200 bilingual questions, and equations.",
                "status": "published",
                "pinned": True,
                "createdAt": now_ms
            })
        ))
    elif "title" in pyq_cols:
        cur.execute("""
            INSERT INTO pyqs (id, title, subject, format, content, status, pinned, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content;
        """, (
            "pyq_wbcs_pre_2022",
            "WBCS (Prelims) 2022 Official Test Booklet Series B",
            "State Exams / WBCS",
            "pdf",
            "Official WBCS Prelims 2022 General Studies Question Paper Series B with full answer keys, 200 bilingual questions, and equations.",
            "published",
            True,
            now_ms
        ))

    # 3. Clear old questions
    cur.execute("DELETE FROM questions WHERE test_id = %s;", (test_id,))

    # 4. ALL 200 QUESTIONS (Q1 to Q200)
    questions_raw = [
      (1, "English", "<p>\"I have done my duty.\"—Which tense is this?</p>", ["(A) Present Indefinite", "(B) Present Perfect", "(C) Past Perfect", "(D) Past Indefinite"], "B", "Present Perfect structure: have + V3."),
      (2, "English", "<p>Find the synonym of 'Covert'.</p>", ["(A) Revert", "(B) Secret", "(C) Desert", "(D) Honest"], "B", "'Covert' means secret or hidden."),
      (3, "English", "<p>What is the most appropriate passive form of \"Who has done the work?\"?</p>", ["(A) Who has been done the work?", "(B) By whom has been done the work?", "(C) Whom has done the work by?", "(D) By whom has the work been done?"], "D", "By whom has the work been done?"),
      (4, "English", "<p>What part of speech is the word 'Adjective'?</p>", ["(A) Pronoun", "(B) Noun", "(C) Adjective", "(D) Adverb"], "B", "The word 'Adjective' is a noun naming a word class."),
      (5, "English", "<p>Find the correctly spelt word.</p>", ["(A) Rehearsal", "(B) Reversal", "(C) Rehearsal", "(D) Rehearsel"], "A", "Rehearsal."),
      (6, "English", "<p>'Philanthropist' means</p>", ["(A) Humanitarian", "(B) Hater of man", "(C) Lover of animals", "(D) Lover of books"], "A", "A humanitarian."),
      (7, "English", "<p>One who talks continuously</p>", ["(A) Voracious", "(B) Impecunious", "(C) Loquacious", "(D) Avaricious"], "C", "Loquacious."),
      (8, "English", "<p>Instead of 'tolerance' we can say</p>", ["(A) bear on", "(B) bear in", "(C) bear with", "(D) bear at"], "C", "Bear with."),
      (9, "English", "<p>What type of sentence is 'Do or Die'?</p>", ["(A) Simple", "(B) Complex", "(C) Exclamatory", "(D) Compound"], "D", "Compound sentence."),
      (10, "English", "<p>What is the synonym of 'Atrocity'?</p>", ["(A) Solidarity", "(B) Pity", "(C) Cruelty", "(D) Punctuality"], "C", "Cruelty."),
      (11, "English", "<p>The antonym of 'Forgo' is</p>", ["(A) Claim", "(B) Despise", "(C) Undergo", "(D) Remember"], "A", "Claim."),
      (12, "English", "<p>The idiomatic expression 'A slap on the wrist' means</p>", ["(A) Short on time", "(B) A very mild punishment", "(C) To have a dispute", "(D) To force an issue"], "B", "A very mild punishment."),
      (13, "English", "<p>Replace underlined phrase: They finally <u>agreed on the business deal</u>.</p>", ["(A) let the cat out of the bag", "(B) see eye to eye", "(C) to feel under the weather", "(D) to cut a corner"], "B", "See eye to eye."),
      (14, "English", "<p>Sequence: (P) Einstein was (Q) although a great scientist (R) weak in arithmetic (S) right from his school days.</p>", ["(A) (Q) (P) (R) (S)", "(B) (P) (R) (S) (Q)", "(C) (P) (S) (Q) (R)", "(D) (Q) (P) (S) (R)"], "A", "(Q) (P) (R) (S)."),
      (15, "English", "<p>Creature having both male and female organs</p>", ["(A) Sodomite", "(B) Homosexual", "(C) Masochist", "(D) Hermaphrodite"], "D", "Hermaphrodite."),
      (16, "English", "<p>Ram and his brothers were four in ______.</p>", ["(A) quantity", "(B) number", "(C) numbers", "(D) totality"], "B", "Four in number."),
      (17, "English", "<p>Choose the appropriate antonym of 'Adore'.</p>", ["(A) Love", "(B) Like", "(C) Hate", "(D) Ignore"], "C", "Hate."),
      (18, "English", "<p>She has no control ______ her temper.</p>", ["(A) on", "(B) with", "(C) over", "(D) after"], "C", "Control over."),
      (19, "English", "<p>What are you worrying ______?</p>", ["(A) to", "(B) with", "(C) for", "(D) about"], "D", "Worrying about."),
      (20, "English", "<p>An Obstetrician deals with</p>", ["(A) Child disease", "(B) Liver disease", "(C) Pregnancy & child birth", "(D) Nerve disease"], "C", "Pregnancy & child birth."),
      (21, "English", "<p>Use a correct gerund: I like ______ pictures.</p>", ["(A) painting", "(B) painted", "(C) to paint", "(D) paint"], "A", "Painting."),
      (22, "English", "<p>He spends hours ______ the phone everyday.</p>", ["(A) at", "(B) on", "(C) with", "(D) in"], "B", "On the phone."),
      (23, "English", "<p>He works ______ an insurance company.</p>", ["(A) for", "(B) at", "(C) in", "(D) with"], "A", "Works for."),
      (24, "English", "<p>Which one is the plural number?</p>", ["(A) Index", "(B) Alumni", "(C) Hypothesis", "(D) Analysis"], "B", "Alumni."),
      (25, "English", "<p>He died ______ dengue.</p>", ["(A) with", "(B) from", "(C) of", "(D) by"], "C", "Died of."),
      (26, "Science", "<p>The radioactive element used in heart-pacemakers is / হার্ট-পেসমেকারে কোন তেজস্ক্রিয় উপাদান ব্যবহার করা হয়?</p>", ["(A) Uranium / ইউরেনিয়াম", "(B) Deuterium / ডয়টেরিয়াম", "(C) Plutonium / প্লুটোনিয়াম", "(D) Radium / রেডিয়াম"], "C", "Plutonium-238."),
      (27, "Science", "<p>Which isotope is used in dating archaeological findings? / প্রত্নতাত্ত্বিক উপাদানের বয়স নির্ণয় করতে কোন আইসোটোপ ব্যবহার করা হয়?</p>", ["(A) $_9^{235}\\text{U}$", "(B) $_6^{14}\\text{C}$", "(C) $_1^3\\text{H}$", "(D) $_8^{18}\\text{O}$"], "B", "Carbon-14 ($^{14}\\text{C}$)."),
      (28, "West Bengal GS", "<p>West Bengal Industrial Development Corporation Ltd. (WBIDC) was established in / WBIDC স্থাপিত হয়</p>", ["(A) 1967", "(B) 1981", "(C) 1977", "(D) 1983"], "A", "1967."),
      (29, "Science", "<p>Phytopthora palmivora is a / Phytopthora palmivora হল একপ্রকার</p>", ["(A) bio-pesticide", "(B) bio-insecticide", "(C) mycoherbicide / ছত্রাকঘটিত আগাছানাশক", "(D) first bio-herbicide"], "C", "Mycoherbicide."),
      (30, "Reasoning", "<p>acme : mace :: alga : ?...</p>", ["(A) glaa", "(B) gaal", "(C) laga", "(D) gala"], "D", "gala."),
      (31, "History", "<p>Which pair do not match? / নীচের জোড়গুলির মধ্যে কোনটি বেঠিক?</p>", ["(A) Jaunpur — Atala Masjid", "(B) Malwa — Jahaz Mahal", "(C) Ajmer — Kubbatul Islam", "(D) Gaur — Bara Sona Masjid"], "C", "Quwwat-ul-Islam is in Delhi."),
      (32, "Current Affairs", "<p>Who is the present Chairman of UPSC? (2022) / ইউ পি এস সি-র বর্তমান চেয়ারম্যান কে?</p>", ["(A) Manoj Soni / মনোজ সনি", "(B) Arvind Saxena", "(C) Vinay Mittal", "(D) P. K. Joshi"], "A", "Dr. Manoj Soni."),
      (33, "History", "<p>The Self-respect Movement was founded by / আত্ম-সম্মান আন্দোলন প্রতিষ্ঠিত হয়</p>", ["(A) Ambedkar", "(B) Periyar E. V. Ramasamy Naicker / পেরিয়ার ই. ভি. রামস্বামী নাইকার", "(C) Dinkarrao Javalkar", "(D) Keshavrao Jedhe"], "B", "Periyar E. V. Ramasamy Naicker."),
      (34, "History", "<p>Chand Bibi ruled over which of the Deccan Sultanates? / চাঁদ বিবি দাক্ষিণাত্যের কোন সুলতানির শাসক ছিলেন?</p>", ["(A) Bijapur", "(B) Berar", "(C) Ahmednagar / আহমেদনগর", "(D) Golkonda"], "C", "Ahmednagar."),
      (35, "Science", "<p>Pure water freezes at a temperature— / বিশুদ্ধ জল যে তাপমাত্রায় জমে যায়—</p>", ["(A) $47^\\circ\\text{F}$", "(B) $32^\\circ\\text{F}$", "(C) $0^\\circ\\text{F}$", "(D) $19^\\circ\\text{F}$"], "B", "$32^\\circ\\text{F}$."),
      (36, "Geography", "<p>As of 2022, which country is the biggest opium producer? / 2022 অনুযায়ী বিশ্বের বৃহত্তম আফিম উৎপাদক দেশ কোনটি?</p>", ["(A) China", "(B) India", "(C) Afghanistan / আফগানিস্তান", "(D) Nepal"], "C", "Afghanistan."),
      (37, "History", "<p>Who painted the image of Bharat Mata? / 'ভারত মাতা'র চিত্রটি কে অঙ্কন করেছেন?</p>", ["(A) Rabindranath Tagore", "(B) Abanindranath Tagore / অবনীন্দ্রনাথ ঠাকুর", "(C) Bankim Chandra Chattopadhyay", "(D) Mahatma Gandhi"], "B", "Abanindranath Tagore."),
      (38, "Geography", "<p>Loktak lake is located in the state of / লোকটাক হ্রদটি কোন রাজ্যে অবস্থিত?</p>", ["(A) Karnataka", "(B) Arunachal Pradesh", "(C) Manipur / মণিপুর", "(D) Bihar"], "C", "Manipur."),
      (39, "History", "<p>Who repealed the Vernacular Press Act of 1878? / কে 1878 সালে 'দেশীয় সংবাদপত্র আইন' বাতিল করেন?</p>", ["(A) Lord Lytton", "(B) Lord Curzon", "(C) Lord Dufferin", "(D) Lord Ripon / লর্ড রিপন"], "D", "Lord Ripon."),
      (40, "Current Affairs", "<p>CEO and MD of Air India? (2022) / বর্তমানে কে এয়ার ইন্ডিয়া'র সি ই ও এবং এম ডি?</p>", ["(A) Campbell Wilson / ক্যাম্পবেল উইলসন", "(B) Ajay Singh", "(C) Alan Joyce", "(D) Maen Razougi"], "A", "Campbell Wilson."),
      (41, "Science", "<p>'ELISA' test is employed to diagnose / 'ELISA' টেস্ট পদ্ধতি যে রোগ নির্ণয় করার জন্য ব্যবহার করা হয় তা হল</p>", ["(A) Polio Virus", "(B) AIDS antibodies / AIDS অ্যান্টিবডি", "(C) Tuberculosis", "(D) Cancer"], "B", "AIDS antibodies."),
      (42, "Reasoning", "<p>In a family of 6 members A, B, C, D, E, F... How many male members? / একটি পরিবারে A, B, C, D, E, F—এই 6 জন সদস্য...</p>", ["(A) 3", "(B) 4", "(C) 5", "(D) 2"], "A", "3 male members."),
      (43, "Geography", "<p>Dulhasti Hydroelectric power project is located in / দুলহস্তি জলবিদ্যুৎ শক্তি উৎপাদন প্রকল্প স্থাপিত হয়েছে</p>", ["(A) Uttarakhand", "(B) Jammu & Kashmir / জম্মু ও কাশ্মীর", "(C) Himachal Pradesh", "(D) Sikkim"], "B", "Jammu & Kashmir."),
      (44, "Reasoning", "<p>P is wife of Q and mother of R... Which is true? / P হল Q-এর স্ত্রী এবং R-এর মা...</p>", ["(A) R is sister of T. / R, T-এর ভগিনী।", "(B) R is brother of T.", "(C) Q is daughter of S.", "(D) None of the above"], "A", "R is sister of T."),
      (45, "Polity", "<p>The Reserve Bank of India was established in / ভারতীয় রিজার্ভ ব্যাংকের প্রতিষ্ঠার সাল</p>", ["(A) 1930", "(B) 1935", "(C) 1947", "(D) 1951"], "B", "1935."),
      (46, "History", "<p>Match: (a) Kot Diji (b) Harappa (c) Kalibangan (d) Mohenjodaro / জোড় মেলান</p>", ["(A) (a-2), (b-3), (c-1), (d-4)", "(B) (a-1), (b-3), (c-2), (d-4)", "(C) (a-4), (b-1), (c-2), (d-3)", "(D) (a-3), (b-2), (c-4), (d-1)"], "A", "(a-2), (b-3), (c-1), (d-4)."),
      (47, "Reasoning", "<p>In chess tournament each of 6 players plays every other player once. Matches? / ছয়জনের দাবা প্রতিযোগিতায়...</p>", ["(A) 12", "(B) 15", "(C) 30", "(D) 72"], "B", "15 matches."),
      (48, "Reasoning", "<p>If Water is Black, Black is Tree, Tree is Blue, Blue is Rain... Colour of sky? / কোনো ভাষায় Water-কে বলে Black...</p>", ["(A) Blue", "(B) Rain / Rain", "(C) Fish", "(D) Pink"], "B", "Rain."),
      (49, "Current Affairs", "<p>Chief of the Army Staff of India? (2022) / বর্তমানে ভারতের চিফ অফ আর্মি স্টাফ কে?</p>", ["(A) General Upendra Dwivedi", "(B) General Manoj Pande / জেনারেল মনোজ পান্ডে", "(C) General Rana Pratap Kalita", "(D) General Surinder Singh Mahal"], "B", "General Manoj Pande."),
      (50, "Geography", "<p>'Peaty' soils of Kerala is known as / কেরালার 'পিট' মৃত্তিকা কী নামে পরিচিত?</p>", ["(A) Reh", "(B) Kari / কারি", "(C) Kallar", "(D) Thur"], "B", "Kari."),
      (51, "Math", "<p>What percentage of 40m cloth is excluded to leave 7m? / 40 মিটার কাপড়ের শতকরা কত অংশ বাদ দিলে 7 মিটার কাপড় পাওয়া যাবে?</p>", ["(A) 17.5", "(B) 19", "(C) 82.5", "(D) 81"], "C", "$\\frac{33}{40} \\times 100 = 82.5\\%$."),
      (52, "Geography", "<p>Oldest range of Himalayas is / হিমালয়ের প্রাচীনতম পর্বতশ্রেণি কোনটি?</p>", ["(A) Siwalik Range", "(B) Lesser Himalayan Range", "(C) Great Himalayan Range / হিমাদ্রি পর্বতশ্রেণি", "(D) Dhaula Dhar Range"], "C", "Great Himalayan Range (Himadri)."),
      (53, "Current Affairs", "<p>Satyajit Ray's ______ birth anniversary celebrated in 2022 / সত্যজিৎ রায়ের ______ তম জন্মবার্ষিকী উদযাপন করা হচ্ছে</p>", ["(A) 100th", "(B) 102nd", "(C) 101st / 101", "(D) 103rd"], "C", "101st birth anniversary."),
      (54, "History", "<p>Who pioneered 'Rakhi Bandhan' during Partition of Bengal? / বঙ্গভঙ্গের সময় 'রাখিবন্ধন' উৎসব-এর আহ্বান করেন কে?</p>", ["(A) Chittaranjan Das", "(B) Rabindranath Tagore / রবীন্দ্রনাথ ঠাকুর", "(C) Pramathanath Mitra", "(D) Pulin Behari Das"], "B", "Rabindranath Tagore."),
      (55, "Current Affairs", "<p>Chief Election Commissioner of India? (2022) / ভারতের মুখ্য নির্বাচন কমিশনার কে?</p>", ["(A) Sanjiv Kumar", "(B) Rajiv Kumar / রাজীব কুমার", "(C) Rajiv Mehta", "(D) Sushil Mehta"], "B", "Rajiv Kumar."),
      (56, "History", "<p>Earliest evidence of settled agriculture in subcontinent comes from / কৃষিরাজের প্রাচীনতম নিদর্শন পাওয়া গেছে</p>", ["(A) Utnur", "(B) Burzahom", "(C) Mehrgarh / মেহেরগড়", "(D) Bagor"], "C", "Mehrgarh."),
      (57, "Reasoning", "<p>If CABLE is XYZOV, then YZXP is code of / যদি CABLE-এর কোড XYZOV হয়, তবে YZXP কার কোড?</p>", ["(A) BABY", "(B) BACK", "(C) CELL", "(D) BELL"], "B", "BACK."),
      (58, "Sports", "<p>Second Indian to score 10,000 runs in T-20 cricket? / টি-20 ক্রিকেটে কোন দ্বিতীয় ভারতীয় 10,000 রান করেছেন?</p>", ["(A) K L Rahul", "(B) Shikhar Dhawan", "(C) Rohit Sharma / রোহিত শর্মা", "(D) M S Dhoni"], "C", "Rohit Sharma."),
      (59, "Reasoning", "<p>15 chairs in row. P at middle, Q is 12th from right. Chairs between P and Q? / 15টি চেয়ারের সারিতে...</p>", ["(A) 4", "(B) 5", "(C) 2", "(D) 3"], "D", "3 chairs."),
      (60, "Polity", "<p>'Indian Constitution is neither purely federal nor unitary...' Said by / 'ভারতের সংবিধান পুরোপুরি যুক্তরাষ্ট্রীয়ও নয়...' কে বলেছেন?</p>", ["(A) Jawaharlal Nehru", "(B) D.D. Basu / ডি.ডি. বসু", "(C) Dr. Ambedkar", "(D) Rajendra Prasad"], "B", "D.D. Basu."),
      (61, "Reasoning", "<p>ACE, FGH, ?, PON / শ্রেণিটি পূরণ করুন : ACE, FGH, ?, PON</p>", ["(A) KKK", "(B) JKI", "(C) HJH", "(D) IKL"], "A", "KKK."),
      (62, "History", "<p>Felicitated as 'Prophet of Great Political Creed' by Aurobindo Ghosh? / অরবিন্দ ঘোষ কাকে এই খেতাব দেন?</p>", ["(A) Brahmabandhab Upadhyay / ব্রহ্মবান্ধব উপাধ্যায়", "(B) Ashwini Kumar Dutta", "(C) Rashbehari Bose", "(D) Bipin Chandra Pal"], "A", "Brahmabandhab Upadhyay."),
      (63, "Science", "<p>Which of the following is an aquatic fern? / নিম্নলিখিত কোনটি জলজ ফার্ন?</p>", ["(A) Adiantum", "(B) Dryopteris", "(C) Salvinia / স্যালভিনিয়া", "(D) Equisetum"], "C", "Salvinia."),
      (64, "Polity", "<p>Tax within Jurisdiction of Central Government? / কোনটি কেন্দ্রীয় সরকারের এক্তিয়ারভুক্ত?</p>", ["(A) Corporation Tax / কর্পোরেশন-এর কর", "(B) Professional Tax", "(C) Land Revenue", "(D) Excise on alcoholic liquors"], "A", "Corporation Tax."),
      (65, "Polity", "<p>Members of State Public Service Commission are appointed by / রাজ্য পাবলিক সার্ভিস কমিশনের সদস্যদের নিযুক্ত করেন</p>", ["(A) President of India", "(B) Prime Minister", "(C) Governor of the State / রাজ্যপাল", "(D) None of them"], "C", "Governor of the State."),
      (66, "Geography", "<p>State known as 'Molassis basin'? / কোন রাজ্যটি 'Molassis basin' নামে পরিচিত?</p>", ["(A) Bihar", "(B) Rajasthan", "(C) Mizoram / মিজোরাম", "(D) Assam"], "C", "Mizoram."),
      (67, "Polity", "<p>Education is enlisted in the / আইন প্রণয়নের জন্য 'শিক্ষা' অন্তর্ভুক্ত আছে</p>", ["(A) Union List", "(B) State List", "(C) Concurrent List / যুগ্ম তালিকায়", "(D) None of the above"], "C", "Concurrent List (42nd Amendment 1976)."),
      (68, "Geography", "<p>'Loringa' mangrove is located in / 'লরিঙ্গা' ম্যানগ্রোভ কোথায় অবস্থিত?</p>", ["(A) Gujarat", "(B) Kerala", "(C) Odisha", "(D) Andhra Pradesh / অন্ধ্রপ্রদেশ"], "D", "Andhra Pradesh."),
      (69, "History", "<p>Who wrote Humayunnamah? / কে হুমায়ুননামার রচয়িতা ছিলেন?</p>", ["(A) Gulbadan Begum / গুলবদন বেগম", "(B) Humayun", "(C) Birbal", "(D) Abul Fazl"], "A", "Gulbadan Begum."),
      (70, "Sports", "<p>Asian Wrestling Championship 2022 gold winner? / এশিয়ান রেসলিং চ্যাম্পিয়নশিপে একক সোনা জয়ী?</p>", ["(A) Bajrang Punia", "(B) Deepak Punia", "(C) Ravi Kumar Dahiya / রবিকুমার দাহিয়া", "(D) Gourav Baliyan"], "C", "Ravi Kumar Dahiya."),
      (71, "Math", "<p>Average of 6 consecutive odd numbers is 64. Greatest is / 6টি ক্রমান্বয়ে পরপর অযুগ্ম সংখ্যার গড় 64; বৃহত্তম সংখ্যাটি?</p>", ["(A) 67", "(B) 65", "(C) 71", "(D) 69"], "C", "71."),
      (72, "Polity", "<p>Minimum age required to be a member of Lok Sabha? / লোকসভার সদস্য হতে হলে অন্তত কত বয়স হতে হবে?</p>", ["(A) 21", "(B) 25", "(C) 30", "(D) 35"], "B", "25 years."),
      (73, "Science", "<p>'Curie' is unit of / 'কুরি' কোনটির একক?</p>", ["(A) Radioactivity / তেজস্ক্রিয়তা", "(B) Temperature", "(C) Heat", "(D) Energy"], "A", "Radioactivity."),
      (74, "Polity", "<p>Elected President of India for second time? / কে দ্বিতীয়বারের জন্য ভারতের রাষ্ট্রপতি নির্বাচিত হয়েছিলেন?</p>", ["(A) Rajendra Prasad / রাজেন্দ্র প্রসাদ", "(B) Sarvapalli Radhakrishnan", "(C) V.V. Giri", "(D) Sankar Dayal Sharma"], "A", "Dr. Rajendra Prasad."),
      (75, "Geography", "<p>Kumari river is a tributary of / কুমারী নদীটি কোন নদীর উপনদী?</p>", ["(A) Mahanadi", "(B) Damodar", "(C) Kansabati / কংসাবতী", "(D) Ajoy"], "C", "Kansabati."),
      (76, "Reasoning", "<p>Wrong term in series: 53 59 63 67 71 / ভুল-পদ চিহ্নিত করুন : 53 59 63 67 71</p>", ["(A) 53", "(B) 63", "(C) 67", "(D) 71"], "B", "63 (all others are prime numbers)."),
      (77, "History", "<p>Act giving enormous powers to repress political activities? / কোন আইন চরম ক্ষমতা দিয়েছিল?</p>", ["(A) Arms Act", "(B) Vernacular Press Act", "(C) Rowlatt Act / রাওলাট অ্যাক্ট", "(D) Act III of 1882"], "C", "Rowlatt Act (1919)."),
      (78, "Current Affairs", "<p>Chief Minister of Tripura (2022)? / ত্রিপুরার মুখ্যমন্ত্রী কে?</p>", ["(A) Manik Saha / মানিক সাহা", "(B) Jishnu Dev", "(C) Narendra Debbarma", "(D) Ratan Lal Nath"], "A", "Dr. Manik Saha."),
      (79, "History", "<p>First Indian Governor General of free India? / স্বাধীন ভারতের প্রথম ভারতীয় গভর্নর জেনারেল কে?</p>", ["(A) Rajendra Prasad", "(B) Chakraborty Rajagopalachari / চক্রবর্তী রাজাগোপালাচারি", "(C) Sarvapalli Radhakrishnan", "(D) None"], "B", "C. Rajagopalachari."),
      (80, "History", "<p>Founder of 'Anushilan Samity'? / 'অনুশীলন সমিতি'র প্রতিষ্ঠাতা কে?</p>", ["(A) Ashwini Kumar Dutta", "(B) Bipin Chandra Pal", "(C) Aurobindo Ghosh", "(D) Pramathanath Mitra / প্রমথনাথ মিত্র"], "D", "Pramathanath Mitra (1902)."),
      (81, "Science", "<p>Which animal is known as 'living fossil'? / কোন প্রাণীটিকে 'জীবন্ত জীবাশ্ম' বলা হয়?</p>", ["(A) Peripatus / পেরিপেটাস", "(B) Amoeba", "(C) Prawn", "(D) Apple snail"], "A", "Peripatus."),
      (82, "History", "<p>Chronological order of Delhi Sultanate dynasties: / সুলতান বংশগুলির সঠিক পর্যায়ক্রম</p>", ["(A) Lodi, Ilbari, Tughluq, Khilji", "(B) Ilbari Turks, Khilji, Tughluq, Lodi / ইলবারি তুর্কি, খিলজি, তুঘলক, লোদি", "(C) Tughluq, Khilji, Lodi, Ilbari", "(D) Khilji, Lodi, Tughluq, Ilbari"], "B", "Ilbari -> Khilji -> Tughluq -> Lodi."),
      (83, "Polity", "<p>Chairman of Public Accounts Committee is / পাবলিক অ্যাকাউন্টস কমিটির চেয়ারম্যান হলেন</p>", ["(A) Ruling Party member", "(B) Opposition Party member / বিরোধী দলের সদস্য", "(C) Finance Minister", "(D) Deputy Speaker"], "B", "Opposition Party member."),
      (84, "Science", "<p>Vitamin helping in blood clotting? / রক্ত জমাট বাঁধতে কোন ভিটামিন সহায়তা করে?</p>", ["(A) A", "(B) D", "(C) B", "(D) K"], "D", "Vitamin K."),
      (85, "Geography", "<p>Koel is a tributary of / কোয়েল কোন নদীর উপনদী?</p>", ["(A) Son / শোন", "(B) Chambal", "(C) Yamuna", "(D) Ganga"], "A", "Son River."),
      (86, "Science", "<p>Chromosome number in human ovum? / মানুষের ডিম্বাণুতে ক্রোমোজোমের সংখ্যা</p>", ["(A) 36", "(B) 46", "(C) 48", "(D) None of the above / উপরের কোনোটিই নয়"], "D", "None of the above (23 haploid chromosomes)."),
      (87, "Science", "<p>'Seahorse' is a / 'সমুদ্র ঘোড়া' একটি</p>", ["(A) Mammal", "(B) Plant", "(C) Fish / মাছ", "(D) None"], "C", "Fish."),
      (88, "History", "<p>Earliest fossil of archaic Homo sapiens found in / হোমো স্যাপিয়েন্সের জীবাশ্ম আবিষ্কৃত হয়েছে</p>", ["(A) Siwalik hills", "(B) Narmada valley / নর্মদা উপত্যকা", "(C) Nallamalai hills", "(D) Chotanagpur"], "B", "Narmada Valley (Hathnora)."),
      (89, "Current Affairs", "<p>Replaced Russia in UN Human Rights Council? / UN Human Rights Council-এ রাশিয়ার স্থলাভিষিক্ত?</p>", ["(A) Poland", "(B) Czech Republic / চেক রিপাবলিক", "(C) Syria", "(D) Chile"], "B", "Czech Republic."),
      (90, "Current Affairs", "<p>Director of 'The Kashmir Files'? / 'দি কাশ্মীর ফাইলস' ছবিটির পরিচালক কে?</p>", ["(A) Farhan Akhtar", "(B) Karan Johar", "(C) Vivek Agnihotri / বিবেক অগ্নিহোত্রী", "(D) Anurag Kashyap"], "C", "Vivek Agnihotri."),
      (91, "History", "<p>'Swaraj' must be for 'masses' not for 'classes' alone. Formula by / স্বরাজ জনগণের হতে হবে— কার উক্তি?</p>", ["(A) Motilal Nehru", "(B) Gandhiji", "(C) Subhas Chandra Bose", "(D) C. R. Das / সি. আর. দাশ"], "D", "C. R. Das."),
      (92, "Polity", "<p>Money bill cannot be introduced without consent of / যাঁর সম্মতি ছাড়া অর্থবিল পেশ করা যায় না</p>", ["(A) Prime Minister", "(B) Speaker", "(C) President of India / ভারতের রাষ্ট্রপতি", "(D) Finance Minister"], "C", "President of India."),
      (93, "Current Affairs", "<p>Xiomara Castro is first female President of / জিওমারা কাস্ত্রো কোন দেশের প্রথম মহিলা রাষ্ট্রপতি?</p>", ["(A) Cuba", "(B) Honduras / হন্ডুরাস", "(C) Mexico", "(D) Colombia"], "B", "Honduras."),
      (94, "Economics", "<p>Earlier name of WTO was / WTO-এর পূর্ববর্তী নাম কী ছিল?</p>", ["(A) UNCTAD", "(B) GATT", "(C) UNIDO", "(D) OECD"], "B", "GATT."),
      (95, "History", "<p>Earliest reference to 'Sati' in inscription? / 'সতী' প্রথার প্রাচীনতম উল্লেখ পাওয়া গেছে</p>", ["(A) Girnar Asokan", "(B) Aihole", "(C) Eran inscription / এরান শিলালেখ", "(D) Damodarpur"], "C", "Eran Inscription (510 AD)."),
      (96, "Science", "<p>Radiation carrying maximum energy— / যে রশ্মি সর্বাপেক্ষা শক্তি বহনকারী</p>", ["(A) UV rays", "(B) Gamma rays / গামা রশ্মি", "(C) X-rays", "(D) IR rays"], "B", "Gamma rays."),
      (97, "History", "<p>When was 'Carlyle Circular' issued? / 'কার্লাইল সার্কুলার' কবে জারি হয়?</p>", ["(A) 1905", "(B) 1901", "(C) 1902", "(D) 1906"], "A", "1905."),
      (98, "Geography", "<p>Not correctly matched? / কোনটি সঠিক রূপে প্রযোজ্য নয়?</p>", ["(A) NH-2 — Delhi-Kolkata", "(B) NH-35 — Barasat-Bangoan", "(C) NH-41 — Kolaghat-Haldia", "(D) NH-34 — Sevak-Gangtok / সেবক-গ্যাংটক"], "D", "NH-34 is Kolkata-Dalkhola; NH-31A is Sevak-Gangtok."),
      (99, "Polity", "<p>Guardian of Public Purse in India? / ভারতে সরকারি তহবিলের অভিভাবক কে?</p>", ["(A) President of India", "(B) Union Finance Minister", "(C) Comptroller & Auditor General / সিএজি", "(D) Public Accounts Committee"], "C", "CAG."),
      (100, "Economics", "<p>SEBI stands for / SEBI-এর পুরো কথাটি হল</p>", ["(A) State Earnings Board of India", "(B) Securities and Exchange Bank of India", "(C) Securities and Exchange Board of India", "(D) State Exchange Bank of India"], "C", "Securities and Exchange Board of India."),
      (101, "History", "<p>Contemporary ruler of Bengal during Chaitanyadeva's time? / চৈতন্যদেবের সমসাময়িক সুলতান?</p>", ["(A) Nusrat Shah", "(B) Fatheh Shah", "(C) Husein Shah Sharqi", "(D) Alauddin Hussein Shah / আলাউদ্দিন হোসেন শাহ"], "D", "Alauddin Hussein Shah."),
      (102, "Current Affairs", "<p>Hosted 5th BIMSTEC Summit in March 2022? / 5ম বিমসটেক শীর্ষ সম্মেলন কোথায় অনুষ্ঠিত হয়?</p>", ["(A) Sri Lanka / শ্রীলঙ্কা", "(B) Bangladesh", "(C) Japan", "(D) South Korea"], "A", "Sri Lanka."),
      (103, "History", "<p>Who wrote 'Hind Swaraj'? / 'হিন্দ স্বরাজ' গ্রন্থটি কার রচনা?</p>", ["(A) Jawaharlal Nehru", "(B) Lal Bahadur Shastri", "(C) Mahatma Gandhi / মহাত্মা গান্ধী", "(D) Abul Kalam Azad"], "C", "Mahatma Gandhi."),
      (104, "History", "<p>Who ridiculed Gandhi as 'seditious fakir'? / কে গান্ধিজিকে 'রাজদ্রোহী ফকির' বলে উপহাস করেন?</p>", ["(A) Winston Churchill / উইনস্টন চার্চিল", "(B) Ramsay MacDonald", "(C) Lord Irwin", "(D) Cripps"], "A", "Winston Churchill."),
      (105, "Science", "<p>Chiefly present in LPG? / 'LPG'-তে কোন উপাদান সবচেয়ে বেশি থাকে?</p>", ["(A) Methane", "(B) Ethane", "(C) Propane", "(D) Butane / বিউটেন"], "D", "Butane."),
      (106, "Current Affairs", "<p>Conferred Netaji Award 2022? / 2022 সালের নেতাজী পুরস্কার পেলেন?</p>", ["(A) Barack Obama", "(B) Shinjo Abe / শিনজো আবে", "(C) Theresa May", "(D) Fumio Kishida"], "B", "Shinzo Abe."),
      (107, "Economy", "<p>Jawahar Rozgar Yojana started in / জওহর রোজগার যোজনা শুরু হয়</p>", ["(A) 1959", "(B) 1979", "(C) 1969", "(D) 1989"], "D", "1989."),
      (108, "History", "<p>Montagu-Chelmsford Reforms announced in / মন্টেন্টু-চেমসফোর্ড সংস্কার ঘোষিত হয়</p>", ["(A) 1919", "(B) 1918", "(C) 1920", "(D) 1921"], "A", "1919."),
      (109, "Reasoning", "<p>B2E, D5H, F12K, H27N, ? / B2E, D5H, F12K, H27N, ?</p>", ["(A) I58Q", "(B) I57R", "(C) J57Q / J57Q", "(D) J58Q"], "C", "J57Q."),
      (110, "History", "<p>'Grand Old Man of India'? / 'গ্র্যান্ড ওল্ড ম্যান অব ইন্ডিয়া' কাকে বলা হয়?</p>", ["(A) Badruddin Tyabji", "(B) Surendranath Banerjea", "(C) Gopal Krishna Gokhale", "(D) Dadabhai Naoroji / দাদাভাই নওরজী"], "D", "Dadabhai Naoroji."),
      (111, "Current Affairs", "<p>Prime Minister of Sri Lanka in May 2022? / শ্রীলঙ্কার নতুন প্রধানমন্ত্রী?</p>", ["(A) Mahinda Rajapaksa", "(B) D. M. Jayaratne", "(C) Ranil Wickremesinghe / রনিল বিক্রমসিংহে", "(D) Sirimaro Bandaranaike"], "C", "Ranil Wickremesinghe."),
      (112, "Culture", "<p>Pandit Shiv Kumar Sharma associated with? / পণ্ডিত শিবকুমার শর্মা কোন যন্ত্রের সাথে যুক্ত?</p>", ["(A) Sitar", "(B) Flute", "(C) Sarod", "(D) Santoor / সন্তুর"], "D", "Santoor."),
      (113, "Science", "<p>'Powerhouse' of cell is / কোষের 'শক্তিঘর' হল</p>", ["(A) Nucleus", "(B) Lysosome", "(C) Mitochondria / মাইটোকনড্রিয়া", "(D) DNA"], "C", "Mitochondria."),
      (114, "Current Affairs", "<p>Ambassador of India in U.S.? / মার্কিন যুক্তরাষ্ট্রে ভারতের রাষ্ট্রদূত?</p>", ["(A) Varsh Vardhan Singh", "(B) Jai Shankar", "(C) Taranjit Singh Sandhu / তরণজিৎ সিং সাঁধু", "(D) Vijay Gokhale"], "C", "Taranjit Singh Sandhu."),
      (115, "History", "<p>Who built Buland Darwaza? / কে বুলন্দ দরওয়াজা নির্মাণ করেছিলেন?</p>", ["(A) Humayun", "(B) Akbar / আকবর", "(C) Shah Jahan", "(D) Aurangzeb"], "B", "Akbar."),
      (116, "History", "<p>Used 'Tulghumah' military tactic first in India? / 'তুলঘুমা' সর্বপ্রথম কে ব্যবহার করেন?</p>", ["(A) Alauddin Khilji", "(B) Muhammad bin Tughluq", "(C) Babur / বাবর", "(D) Akbar"], "C", "Babur."),
      (117, "Geography", "<p>Alakananda and Bhagirathi confluence at / অলকানন্দা ও ভাগীরথী কোথায় মিলিত হয়েছে?</p>", ["(A) Dev Prayag / দেবপ্রয়াগে", "(B) Karna Prayag", "(C) Rudra Prayag", "(D) Vishnu Prayag"], "A", "Dev Prayag."),
      (118, "Culture", "<p>'Pongal' is main festival of / 'পোঙ্গল' প্রধান উৎসব যে রাজ্যের</p>", ["(A) Tamilnadu / তামিলনাড়ু", "(B) Karnataka", "(C) Kerala", "(D) Andhra Pradesh"], "A", "Tamil Nadu."),
      (119, "Polity", "<p>Non-money bills can be introduced in / অর্থ বিল ব্যতীত অন্যান্য বিল পেশ করতে হয়</p>", ["(A) Lok Sabha", "(B) Rajya Sabha", "(C) any House of Parliament / যেকোনো কক্ষে", "(D) Joint Session"], "C", "Any House of Parliament."),
      (120, "Reasoning", "<p>Reversed English alphabets 14th letter? / বিপরীতভাবে সাজালে 14তম অক্ষর?</p>", ["(A) N", "(B) L", "(C) O", "(D) M / M"], "D", "M."),
      (121, "Polity", "<p>Ex-officio Chairman of Rajya Sabha is / রাজ্যসভার সাবেক চেয়ারম্যান হলেন</p>", ["(A) President", "(B) Vice-President / উপরাষ্ট্রপতি", "(C) Prime Minister", "(D) None"], "B", "Vice-President."),
      (122, "Reasoning", "<p>Cows and hens: legs 14 more than 2x heads. How many cows? / একদল গরু ও মুরগির...</p>", ["(A) 7 / 7", "(B) 12", "(C) 5", "(D) 10"], "A", "7 cows ($4C+2H = 2(C+H)+14 \\Rightarrow 2C=14 \\Rightarrow C=7$)."),
      (123, "Math", "<p>Father's age problem: Father's age? / পিতার বয়স নির্ণয় করুন</p>", ["(A) 50", "(B) 55", "(C) 60 / 60", "(D) 70"], "C", "60 years."),
      (124, "Reasoning", "<p>Next term in 4, 10, 22, 46, ? / 4, 10, 22, 46 — পরবর্তী পদ?</p>", ["(A) 56", "(B) 66", "(C) 94 / 94", "(D) 92"], "C", "94 ($x \\times 2 + 2$)."),
      (125, "History", "<p>Gandhi-Irwin Pact signed in / গান্ধি-আরউইন চুক্তি সম্পাদিত হয়</p>", ["(A) 1931 / 1931", "(B) 1930", "(C) 1932", "(D) 1929"], "A", "1931."),
      (126, "History", "<p>First president of All India Kisan Sabha? / সর্বভারতীয় কৃষক সভার প্রথম সভাপতি?</p>", ["(A) Swami Sahajanand Saraswati / স্বামী সহজানন্দ সরস্বতী", "(B) N. G. Ranga", "(C) Jawaharlal Nehru", "(D) Jaya Prakash Narayan"], "A", "Swami Sahajanand Saraswati (1936)."),
      (127, "Geography", "<p>Western part of Teesta river in WB is called / তিস্তার পশ্চিম অংশকে কী বলে?</p>", ["(A) Terai / তরাই", "(B) Duars", "(C) Bagar", "(D) Bhabar"], "A", "Terai (East is Duars)."),
      (128, "Geography", "<p>Kasai and Keleghai rivers join to form / কাঁসাই ও কেলেঘাই নদীর মিলিত প্রবাহ</p>", ["(A) Rupnarayan river / রূপনারায়ণ নদ", "(B) Haldi river", "(C) Subarnarekha", "(D) Damodar"], "A", "Rupnarayan."),
      (129, "Geography", "<p>Sariska Tiger Sanctuary located at / সারিস্কা ব্যাঘ্র অভয়ারণ্য কোথায়?</p>", ["(A) Bharatpur", "(B) Alwar / আলোয়ার", "(C) Darrah", "(D) Puskar"], "B", "Alwar, Rajasthan."),
      (130, "Geography", "<p>Andaman & Nicobar separated by / আন্দামান থেকে নিকোবরকে বিচ্ছিন্ন করেছে</p>", ["(A) Nine degree Channel", "(B) Ten degree Channel / দশ ডিগ্রি চ্যানেল", "(C) Eight degree Channel", "(D) Seven degree Channel"], "B", "Ten Degree Channel."),
      (131, "Reasoning", "<p>Fill gap: 3, 8, 6, 14, __, 20 / 3, 8, 6, 14, __, 20</p>", ["(A) 11", "(B) 10", "(C) 8", "(D) 9 / 9"], "D", "9."),
      (132, "Polity", "<p>Protector of Fundamental Rights? / মৌলিক অধিকারের রক্ষক কে?</p>", ["(A) Legislature", "(B) Judiciary / বিচার বিভাগ", "(C) Executive", "(D) None"], "B", "Judiciary."),
      (133, "Geography", "<p>Right bank tributaries to Ganga? / গঙ্গার ডান তীরের উপনদী?</p>", ["(A) Yamuna, Chambal, Son", "(B) Yamuna, Son and Damodar / যমুনা, শোণ এবং দামোদর", "(C) Yamuna, Gandak, Son", "(D) Yamuna, Chambal, Damodar"], "B", "Yamuna, Son and Damodar."),
      (134, "Economy", "<p>Prasanta Chandra Mahalanobis associated with / প্রশান্ত চন্দ্র মহালানবীশ যুক্ত</p>", ["(A) First Five-Year Plan", "(B) Second Five-Year Plan / দ্বিতীয় পঞ্চবার্ষিকী পরিকল্পনা", "(C) Third Five-Year Plan", "(D) Fourth Five-Year Plan"], "B", "Second Five-Year Plan."),
      (135, "Math", "<p>Fraction between $\\frac{3}{4}$ and $\\frac{5}{6}$? / $\\frac{3}{4}$ অপেক্ষা বড় এবং $\\frac{5}{6}$ অপেক্ষা ছোট?</p>", ["(A) $\\frac{2}{3}$", "(B) $\\frac{1}{2}$", "(C) $\\frac{4}{5}$ / $\\frac{4}{5}$", "(D) $\\frac{9}{10}$"], "C", "$\\frac{4}{5} = 0.80$, between 0.75 and 0.833."),
      (136, "History", "<p>Refers to 'unpaid labour'? / 'বেগার শ্রম' বোঝাতে ব্যবহৃত?</p>", ["(A) Shulka", "(B) Udranga", "(C) Bali", "(D) Bisthi / বিষ্ঠি"], "D", "Bisthi."),
      (137, "History", "<p>Author of 'The Philosophy of the Bomb'? / 'দ্য ফিলোসফি অফ দ্য বম্ব' রচয়িতা?</p>", ["(A) Bhagwati Charan Vohra / ভগবতী চরণ ভোহরা", "(B) Bipin Chandra Pal", "(C) Yashpal", "(D) Aurobindo Ghosh"], "A", "Bhagwati Charan Vohra."),
      (138, "Science", "<p>Metal present in haemoglobin? / হিমোগ্লোবিনে কোন ধাতু আছে?</p>", ["(A) Iron / লোহা", "(B) Zinc", "(C) Magnesium", "(D) Copper"], "A", "Iron."),
      (139, "Current Affairs", "<p>Viktor Orban registered 4th win in / ভিক্টর ওরবান কোন দেশের নির্বাচনে জয়ী?</p>", ["(A) Armenia", "(B) Sweden", "(C) Switzerland", "(D) Hungary / হাঙ্গেরি"], "D", "Hungary."),
      (140, "Reasoning", "<p>If CAT is XZG, BOAT is YLZG, then EGG is / CAT=XZG, BOAT=YLZG হলে EGG হবে</p>", ["(A) VSS", "(B) URR / URR", "(C) VTT", "(D) UTT"], "B", "URR."),
      (141, "Science", "<p>Part of human eye with maximum refractive index? / প্রতিসরাঙ্ক সর্বাপেক্ষা বেশি?</p>", ["(A) Aqueous humour", "(B) Vitreous humour", "(C) Lens", "(D) Cornea / কর্নিয়া"], "D", "Cornea."),
      (142, "Science", "<p>Present in refrigerator? / রেফ্রিজারেটরে থাকে?</p>", ["(A) Carbon dioxide", "(B) Methane", "(C) Helium", "(D) Chlorofluorocarbon / ক্লোরোফ্লোরোকার্বন"], "D", "Chlorofluorocarbon."),
      (143, "Geography", "<p>'Radcliffe Line' lies between / 'র্যাডক্লিফ লাইন' কোন দুই দেশের সীমানা?</p>", ["(A) India and China", "(B) India and Bangladesh", "(C) India and Bhutan", "(D) India and Pakistan / ভারত ও পাকিস্তান"], "D", "India and Pakistan."),
      (144, "History", "<p>Dynasty designated as 'Balhar' by Arab travellers? / 'বলহর' বলা হতো?</p>", ["(A) Chalukya", "(B) Chola", "(C) Rashtrakuta / রাষ্ট্রকূট", "(D) Pandya"], "C", "Rashtrakutas."),
      (145, "Geography", "<p>Highest peak of South Bengal? / দক্ষিণবঙ্গের সর্বোচ্চ শৃঙ্গ?</p>", ["(A) Sandakphu", "(B) Gorgaburu / গোর্গাবুরু", "(C) Pareshnath", "(D) Biharinath"], "B", "Gorgaburu (677m, Ajodhya Hills)."),
      (146, "Science", "<p>Bronze is an alloy of / ব্রোঞ্জ কোন ধাতুর সংকর?</p>", ["(A) Copper and Zinc", "(B) Tin and Zinc", "(C) Copper and Tin / তামা ও টিন", "(D) Iron and Zinc"], "C", "Copper and Tin."),
      (147, "Science", "<p>$\\text{O}^{2-}$ is isoelectronic with / $\\text{O}^{2-}$-এর সমসংখ্যক ইলেকট্রন আছে?</p>", ["(A) $\\text{F}^-$ / $\\text{F}^-$", "(B) $\\text{Cl}^-$", "(C) $\\text{Li}^+$", "(D) $\\text{K}^+$"], "A", "$\\text{F}^-$ (10 electrons)."),
      (148, "History", "<p>Founded Servants of India Society? / সার্ভেন্টস অব ইন্ডিয়া সোসাইটি প্রতিষ্ঠাতা?</p>", ["(A) Annie Besant", "(B) Mahadev Govind Ranade", "(C) Gokhale / গোখলে", "(D) B. G. Tilak"], "C", "Gopal Krishna Gokhale (1905)."),
      (149, "Science", "<p>'Ornithology' is the science of / 'Ornithology' হল</p>", ["(A) Bird / পক্ষী বিজ্ঞান", "(B) Reptile", "(C) Amphibia", "(D) Mammal"], "A", "Bird."),
      (150, "Reasoning", "<p>Family relation problem: Husband of B is / B-এর স্বামী হবে</p>", ["(A) C", "(B) E / E", "(C) A", "(D) F"], "B", "E."),
      (151, "History", "<p>Founded 'Gadar Party' (1913) where? / কে কোথায় গদর পার্টি প্রতিষ্ঠা করেন?</p>", ["(A) Bhagat Singh", "(B) Lala Lajpat Rai", "(C) Lala Hardayal, America / লালা হরদয়াল, আমেরিকা", "(D) Mohan Singh"], "C", "Lala Hardayal, San Francisco, America."),
      (152, "Geography", "<p>Mettur dam is built on river / মেত্তুর বাঁধ কোন নদীতে?</p>", ["(A) Mahanadi", "(B) Godavari", "(C) Krishna", "(D) Cauvery / কাবেরী"], "D", "Cauvery."),
      (153, "Science", "<p>Not 'warm-blooded'? / কোনটি 'উষ্ণশোণিত' নয়?</p>", ["(A) Hen", "(B) Tiger", "(C) Bat", "(D) Toad / ব্যাঙ"], "D", "Toad (Amphibian - Cold-blooded)."),
      (154, "History", "<p>Ram Prasad Bismil associated with / কোন মামলার সাথে যুক্ত?</p>", ["(A) Kakori Conspiracy Case / কাকোরি ষড়যন্ত্র মামলা", "(B) Lahore", "(C) Alipur", "(D) Meerut"], "A", "Kakori Conspiracy Case (1925)."),
      (155, "Polity", "<p>Constitutional status to Panchayati Raj? / কোন সংশোধনী রূপ দেয়?</p>", ["(A) 72nd", "(B) 73rd / 73 তম", "(C) 74th", "(D) 75th"], "B", "73rd Amendment 1992."),
      (156, "Polity", "<p>President takes over State administration under Article / রাষ্ট্রপতি শাসনের ধারা</p>", ["(A) Article 352", "(B) Article 356 / 356 ধারা", "(C) Article 351", "(D) Article 350"], "B", "Article 356."),
      (157, "History", "<p>Gupta King who destroyed Sakas? / শকদের ধ্বংসসাধন করেন কে?</p>", ["(A) Samudra Gupta", "(B) Chandra Gupta-I", "(C) Kumara Gupta", "(D) Chandra Gupta-II / দ্বিতীয় চন্দ্রগুপ্ত"], "D", "Chandragupta II (Vikramaditya)."),
      (158, "Reasoning", "<p>KOLKATA is 11151211012001, BENGAL will be / BENGAL-কে কী লেখা হবে?</p>", ["(A) 020514070112", "(B) 020514210111", "(C) 020521250110", "(D) 020514200112 / 020514200112"], "D", "020514070112."),
      (159, "Science", "<p>First transgenic crop was / প্রথম ট্রান্সজেনিক শস্য?</p>", ["(A) Tobacco / তামাক", "(B) Cotton", "(C) Pea", "(D) Rice"], "A", "Tobacco (1982)."),
      (160, "Culture", "<p>Lata Mangeshkar awarded Bharat Ratna in / লতা মঙ্গেশকর কোন বছরে ভারতরত্ন পান?</p>", ["(A) 2000", "(B) 2003", "(C) 2001 / 2001", "(D) 2005"], "C", "2001."),
      (161, "History", "<p>'Navjivan' was edited by / 'নবজীবন'-এর সম্পাদক?</p>", ["(A) Rasbehari Basu", "(B) Gandhiji / গান্ধিজি", "(C) Lala Hardayal", "(D) Aurobindo Ghosh"], "B", "Mahatma Gandhi."),
      (162, "Reasoning", "<p>ZXYW, VTUS, RPQO, ______, JHIG / অক্ষরশ্রেনি সম্পূর্ণ করুন</p>", ["(A) LNKM", "(B) NLKM / NLKM", "(C) NLMK", "(D) LNMK"], "B", "NLKM."),
      (163, "Geography", "<p>Notuburu iron ore mines located in / নোটুবুরু লৌহ খনি কোথায়?</p>", ["(A) Singhbhum District / সিংভূম জেলা", "(B) Mayurbhanj", "(C) Baster", "(D) Durg"], "A", "Singhbhum District."),
      (164, "Polity", "<p>Vice-President of India is / ভারতের উপরাষ্ট্রপতি</p>", ["(A) directly elected", "(B) nominated", "(C) elected by state legislatures", "(D) elected by electoral college of both Houses / উভয় কক্ষের সদস্যদের দ্বারা গঠিত নির্বাচকমণ্ডলী"], "D", "Elected by both Houses of Parliament."),
      (165, "Science", "<p>Quantity increased in step-down transformer? / স্টেপ-ডাউন ট্রানসফরমার-এ কী বেড়ে যায়?</p>", ["(A) Voltage", "(B) Current / কারেন্ট", "(C) Wattage", "(D) Frequency"], "B", "Current (Voltage decreases, Current increases)."),
      (166, "Culture", "<p>Best Director Award at Oscars 2022? / অস্কার 2022 সেরা পরিচালক?</p>", ["(A) Patty Jenkins", "(B) Ava DuVernay", "(C) Sofia Coppola", "(D) Jane Campion / জেন ক্যাম্পিয়ন"], "D", "Jane Campion (The Power of the Dog)."),
      (167, "Literature", "<p>Sahitya Akademi Award 2021 English category? / সাহিত্য অকাদেমি পুরস্কার ইংরেজি?</p>", ["(A) Namita Gokhale / নামিতা গোখেল", "(B) Khalid Hossain", "(C) Arundhati Roy", "(D) Kiran Gaurav"], "A", "Namita Gokhale ('Things to Leave Behind')."),
      (168, "Math", "<p>Food problem: 4000 men 190 days, 800 left after 30 days. Remaining days? / 4000 জনের 190 দিনের খাবার...</p>", ["(A) 250 days / 250 দিন", "(B) 230 days", "(C) 200 days", "(D) 170 days"], "A", "$\\frac{4000 \\times 160}{3200} = 250$ days."),
      (169, "Polity", "<p>Quorum requirements in Rajya Sabha? / রাজ্যসভায় কোরামের উপস্থিতি?</p>", ["(A) 25 / 25", "(B) 50", "(C) 100", "(D) 126"], "A", "25 members (1/10th of 250)."),
      (170, "Math", "<p>Mangoes problem: Loss 5% selling at ₹2280. Cost price? / আম ক্রয় 5% ক্ষতিতে 2280 টাকা...</p>", ["(A) ₹ 3,000", "(B) ₹ 4,000", "(C) ₹ 2,400 / 2400 টাকা", "(D) ₹ 2,500"], "C", "$\\frac{2280}{0.95} = 2400$."),
      (171, "Reasoning", "<p>Stammering : Speech :: Deafness : ? / Stammering : Speech হলে Deafness : ?</p>", ["(A) Ear", "(B) Hearing / Hearing", "(C) Noise", "(D) Commotion"], "B", "Hearing."),
      (172, "West Bengal GS", "<p>Highest child sex ratio in West Bengal 2011? / শিশু লিঙ্গ অনুপাত সর্বোচ্চ?</p>", ["(A) Darjeeling / দার্জিলিং", "(B) Howrah", "(C) Kolkata", "(D) Malda"], "A", "Darjeeling."),
      (173, "History", "<p>Organized Iqta, army, currency of Delhi Sultanate? / ইক্তা, সৈন্য, মুদ্রা গোড়াপত্তন করেন?</p>", ["(A) Shamsuddin Iltutmish / শামসুদ্দিন ইলতুৎমিস", "(B) Giyasuddin Balban", "(C) Muhammad Tughluq", "(D) Alauddin Khilji"], "A", "Shamsuddin Iltutmish."),
      (174, "Polity", "<p>Date Indian Constitution was adopted? / সংবিধান গৃহীত হয়?</p>", ["(A) August 15, 1947", "(B) November 26, 1949 / 26শে নভেম্বর, 1949", "(C) January 26, 1950", "(D) August 15, 1950"], "B", "26 November 1949."),
      (175, "History", "<p>Match List-I with List-II: Moriyas-Pippalivana, Videhas-Mithila, Licchavis-Vaishali, Mallas-Kapilavastu / সারণী তুলনা</p>", ["(A) (a-1), (b-2), (c-3)", "(B) (d-4)", "(C) (c-3), (d-4)", "(D) All of the above"], "A", "(a-1), (b-2), (c-3)."),
      (176, "History", "<p>Associated with Bardoli Satyagraha (1928)? / বারদোলি সত্যাগ্রহের সাথে যুক্ত?</p>", ["(A) Rajendra Prasad", "(B) Vallabhbhai Patel / বল্লভভাই প্যাটেল", "(C) Motilal Nehru", "(D) Jawaharlal Nehru"], "B", "Sardar Vallabhbhai Patel."),
      (177, "History", "<p>Where was Chauri Chaura? / চৌরিচোরা কোথায়?</p>", ["(A) Patna", "(B) Bhagalpur", "(C) Gaya", "(D) Gorakhpur / গোরখপুর"], "D", "Gorakhpur, UP."),
      (178, "West Bengal GS", "<p>Districts in West Bengal? (2022) / পশ্চিমবঙ্গে কয়টি জেলা আছে?</p>", ["(A) 20", "(B) 19", "(C) 23 / 23", "(D) 25"], "C", "23 districts."),
      (179, "History", "<p>Mughal prince assassinated Abul Fazl? / আবুল ফজলকে হত্যা করিয়েছিলেন?</p>", ["(A) Khasru", "(B) Selim / সেলিম", "(C) Azimushhan", "(D) Khurram"], "B", "Prince Selim (Jahangir)."),
      (180, "History", "<p>Poona Pact took place in / পুনা চুক্তি কত সালে স্বাক্ষরিত হয়?</p>", ["(A) 1857", "(B) 1932 / 1932", "(C) 1935", "(D) 1942"], "B", "24 September 1932."),
      (181, "Science", "<p>Particle in uniform circular motion with speed $V$ & radius $r$. Acceleration? / ত্বরণের মান?</p>", ["(A) Zero", "(B) $\\frac{V}{r}$", "(C) $\\frac{V}{r^2}$", "(D) $\\frac{V^2}{r}$ / $\\frac{V^2}{r}$"], "D", "$\\frac{V^2}{r}$."),
      (182, "History", "<p>Founder of Tattwabodhini Sabha in Bengal? / তত্ত্ববোধিনী সভার প্রতিষ্ঠাতা কে?</p>", ["(A) Dadoba Pandurang", "(B) Debendranath Tagore / দেবেন্দ্রনাথ ঠাকুর", "(C) Radha Kanta Deb", "(D) Keshab Chandra Sen"], "B", "Debendranath Tagore (1839)."),
      (183, "Polity", "<p>Advocate General of a State appointed by / অ্যাডভোকেট জেনারেলকে নিযুক্ত করেন</p>", ["(A) Chief Minister", "(B) State Legislature", "(C) Governor / রাজ্যপাল", "(D) State Law Minister"], "C", "Governor."),
      (184, "Geography", "<p>Dam not meant for irrigation? / কোন বাঁধটি সেচের জন্য তৈরি হয়নি?</p>", ["(A) Bhavani Sagar", "(B) Sivasamudram", "(C) Krishnaraja Sagar", "(D) Bhakra Nangal / ভাকরা নাঙ্গাল"], "D", "Bhakra Nangal (primarily hydro-power)."),
      (185, "History", "<p>Chronological order of foreign travellers: (a) Xuanzang (b) Itsing (c) Fa Tsien (d) Megasthenes / পরিব্রাজকদের সময়কাল</p>", ["(A) (a), (b), (c), (d)", "(B) (a), (d), (b), (c)", "(C) (d), (c), (a), (b)", "(D) (d), (c), (b), (a)"], "D", "Megasthenes -> Fa-Hien -> Hieun Tsang -> I-Tsing -> (d), (c), (a), (b)."),
      (186, "History", "<p>Stated there was no slavery in India? / ভারতবর্ষে দাস প্রথা নেই বলে মন্তব্য করেছিলেন?</p>", ["(A) Strabo", "(B) Ptolemy", "(C) Megasthenes / মেগাস্থিনিস", "(D) Xuanzang"], "C", "Megasthenes (in Indica)."),
      (187, "Sports", "<p>Won Thomas Cup International Badminton 2022? / টমাস কাপ 2022 বিজয়ী দেশ?</p>", ["(A) Indonesia", "(B) India / ভারত", "(C) Malaysia", "(D) China"], "B", "India (defeated Indonesia 3-0)."),
      (188, "Sports", "<p>Host of 2026 Commonwealth Games? / 2026 কমনওয়েলথ গেমস হোস্ট শহর?</p>", ["(A) Victoria / ভিক্টোরিয়া", "(B) Sydney", "(C) Perth", "(D) Brisbane"], "A", "Victoria, Australia."),
      (189, "History", "<p>Greek king of Syria mentioned in Asokan edict? / অশোকের শিলালেখে উল্লিখিত সিরিয়ার রাজা?</p>", ["(A) Antiochus II Theos / অ্যান্টিয়োকাস II থিওস", "(B) Ptolemy II", "(C) Antigonus", "(D) Alexander"], "A", "Antiochus II Theos."),
      (190, "Science", "<p>Fermentation ability of Yeast is due to / ইস্টের 'সন্ধান' ক্ষমতার জন্য দায়ী</p>", ["(A) Amylase", "(B) Zymase / জাইমেজ", "(C) Invertase", "(D) Galactase"], "B", "Zymase."),
      (191, "History", "<p>First sermon of Gautama Buddha is called / বাণীর প্রথম প্রচারকে বলা হয়</p>", ["(A) Mahabhinishkraman", "(B) Dharmachakra Pravartana / ধর্মচক্র প্রবর্তন", "(C) Dhammaghos", "(D) Mahaparinirvana"], "B", "Dharmachakra Pravartana."),
      (192, "History", "<p>Non-Cooperation programme was adopted in / অসহযোগ আন্দোলনের পরিকল্পনা গ্রহণ করা হয়</p>", ["(A) Lahore session", "(B) Congress session at Nagpur / নাগপুর অধিবেশন", "(C) Gujarat Congress", "(D) Second Round Table"], "B", "Nagpur session (December 1920)."),
      (193, "History", "<p>Mughal prince made arrangement for translation of Upanisadas into Farsi? / উপনিষদের ফারসি অনুবাদ করেন?</p>", ["(A) Babur", "(B) Akbar", "(C) Shah Jahan", "(D) Dara Sukoh / যারা শুর্কো"], "D", "Dara Sukoh (Sirr-i-Akbar)."),
      (194, "Sports", "<p>Women's Badminton Singles title at Swiss Open 2022? / সুইস ওপেন মহিলা একক ব্যাডমিন্টন চ্যাম্পিয়ন?</p>", ["(A) Saina Nehwal", "(B) P.V. Sindhu / পি. ভি. সিন্ধু", "(C) Carolina Marin", "(D) B. Ongbamrungphan"], "B", "P. V. Sindhu."),
      (195, "Geography", "<p>Eastern Ghats and Western Ghats meet at / পূর্বঘাট ও পশ্চিমঘাট পর্বতমালা কোথায় মিলিত হয়েছে?</p>", ["(A) Cardamom Hills", "(B) Palani Hills", "(C) Nilgiri Hills / নীলগিরি পর্বত", "(D) Annamalai Hills"], "C", "Nilgiri Hills."),
      (196, "Polity", "<p>First Law Officer of Government of India? / ভারত সরকারের প্রথম আইন অফিসার?</p>", ["(A) Chief Justice of India", "(B) Union Law Minister", "(C) Attorney General of India / অ্যাটর্নি জেনারেল", "(D) Law Secretary"], "C", "Attorney General of India."),
      (197, "History", "<p>Chola king known as Arumolivarman before coronation? / আরুমোলিবর্মা নামে পরিচিত ছিলেন?</p>", ["(A) Vira Rajendra", "(B) Rajaraja I / প্রথম রাজরাজ", "(C) Kulottunga I", "(D) None"], "B", "Rajaraja I."),
      (198, "History", "<p>Put forward the famous Drain Theory? / বিখ্যাত নির্গমন তত্ত্বটি সামনে আনেন?</p>", ["(A) Dadabhai Naoroji / দাদাভাই নওরজী", "(B) Surendranath Banerjea", "(C) Gopal Krishna Gokhale", "(D) Bal Gangadhar Tilak"], "A", "Dadabhai Naoroji."),
      (199, "Culture", "<p>Conferred prestigious Royal Gold Medal 2022 for Architecture? / রয়্যাল গোল্ড মেডেল 2022 বিজয়ী স্থপতি?</p>", ["(A) Balkrishna Doshi / বালকৃষ্ণ দোশী", "(B) Sheila Sri Prakash", "(C) Brinda Samaya", "(D) Hafeez Contractor"], "A", "Balkrishna Doshi."),
      (200, "History", "<p>Composer of Allahabad Prasasti? / এলাহাবাদ প্রশস্তির রচয়িতা কে?</p>", ["(A) Harishena / হরিষেণ", "(B) Bishakhdutta", "(C) Kalidasa", "(D) Shudrak"], "A", "Harishena.")
    ]

    questions_tuples = []
    for q_no, topic, q_text, opts, ans, exp in questions_raw:
        questions_tuples.append((
            f"{test_id}_q{q_no}",
            test_id,
            topic,
            q_no,
            q_text,
            opts,
            None,
            ans,
            exp
        ))

    sql = """
        INSERT INTO questions (id, test_id, topic, q_no, question_text, options, image_url, correct_answer, explanation)
        VALUES %s
        ON CONFLICT (id) DO UPDATE SET
            question_text = EXCLUDED.question_text,
            options = EXCLUDED.options,
            correct_answer = EXCLUDED.correct_answer,
            explanation = EXCLUDED.explanation;
    """
    execute_values(cur, sql, questions_tuples)
    conn.commit()

    print(f"SUCCESSFULLY SEEDED ALL {len(questions_tuples)} QUESTIONS FOR WBCS PRELIMS 2022 INTO SUPABASE POSTGRESQL!")
    cur.close()
    conn.close()

if __name__ == "__main__":
    seed()
