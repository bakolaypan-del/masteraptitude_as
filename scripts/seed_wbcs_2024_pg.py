import os
import sys
import json
import time

try:
    import psycopg2
    from psycopg2.extras import execute_values
except ImportError:
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

    now_ms = int(time.time() * 1000)
    test_id = "wbcs_pre_2024_official"

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

    cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'pyqs';")
    pyq_cols = [r[0] for r in cur.fetchall()]

    # 1. Insert Test
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
        "WBCS (Prelims) 2024 Official Question Paper",
        "WBCS Prelims — Series C (Advt No. 08/2024)",
        "General Studies",
        "Official WBCS Prelims 2024 General Studies Paper (Advt No. 08/2024, Series C). Full 200 Questions, 150 Minutes, 200 Marks with 1/3 negative marking and WBPSC official answer keys.",
        "WBCS",
        "full",
        150,
        1.00,
        0.33,
        True,
        now_ms
    ))

    # 2. Insert PYQ document
    pdf_url = "https://raw.githubusercontent.com/bakolaypan-del/masteraptitude_as/main/public/WBCS_PRELI_2024_PAPER.pdf"

    if "data" in pyq_cols:
        cur.execute("""
            INSERT INTO pyqs (id, data)
            VALUES (%s, %s)
            ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data;
        """, (
            "pyq_wbcs_pre_2024",
            json.dumps({
                "id": "pyq_wbcs_pre_2024",
                "test_id": test_id,
                "title": "WBCS (Prelims) 2024 Official Test Booklet Series C",
                "subject": "State Exams / WBCS",
                "format": "pdf",
                "pdfUrl": pdf_url,
                "pdfTitle": "WBCS (Prelims) 2024 Full Question Paper PDF",
                "content": "Official WBCS Prelims 2024 General Studies Question Paper (Advt No. 08/2024 Series C) with 200 bilingual questions, options, KaTeX equations and WBPSC official answer key.",
                "status": "published",
                "pinned": True,
                "createdAt": now_ms
            })
        ))

    # 3. Clear old questions
    cur.execute("DELETE FROM questions WHERE test_id = %s;", (test_id,))

    # 4. ALL 200 QUESTIONS (Q1 to Q200) fully transcribed
    questions_raw = [
      (1, "English", "<p>From the given options choose the word/phrase nearest in meaning to the proverb: 'The early bird catches the worm.'</p>", ["(A) People with good habits win the race.", "(B) At dawn some birds can prey easily.", "(C) Being first in the queue makes/creates big opportunities.", "(D) The person who takes the earliest opportunity to do something will gain advantage over others."], "D", "The proverb means taking early opportunity brings advantage."),
      (2, "English", "<p>Fill in the modal auxiliaries as required: I ______ swim. [Ability]</p>", ["(A) should", "(B) must", "(C) can", "(D) don't"], "C", "'Can' expresses physical ability."),
      (3, "English", "<p>All the members are requested to ______ to the rules of the Association. Choose the right word.</p>", ["(A) abide", "(B) comply", "(C) conform", "(D) concur"], "C", "'Conform to' is the correct prepositional usage."),
      (4, "English", "<p>Which of the options gives the right meaning of the sentence? \"He bit off more than he could chew.\"</p>", ["(A) He ate more than he could digest.", "(B) He took up more work than he could handle.", "(C) He tried to explain what he did not understand.", "(D) He did not know how much he could endure."], "B", "To bit off more than one can chew means taking on more work than one can manage."),
      (5, "English", "<p>Give one word substitution/meaning of the underlined word: He loved wearing <u>outlandish</u> clothes.</p>", ["(A) antique", "(B) old school/style", "(C) wired or offbeat", "(D) unavailable"], "C", "Outlandish means bizarre, offbeat or strange."),
      (6, "English", "<p>An undertaker is one who</p>", ["(A) undertakes projects.", "(B) takes bribes.", "(C) hears confessions in a church.", "(D) makes arrangements for funerals."], "D", "An undertaker prepares dead bodies for burial/cremation and arranges funerals."),
      (7, "English", "<p>Give one word substitution/meaning of the underlined word: The whole idea is quite <u>preposterous</u>.</p>", ["(A) improper judgment", "(B) debatable", "(C) unacceptable", "(D) unbelievable or unreasonable."], "D", "Preposterous means completely absurd or unreasonable."),
      (8, "English", "<p>Give one word substitution/meaning of the underlined word: The game is <u>afoot</u>.</p>", ["(A) new case or investigation", "(B) final reality", "(C) noisy and expressive", "(D) continuous"], "C", "Official WBPSC key marks C."),
      (9, "English", "<p>Choose the idiom that can be used to express: \"The candidate is sitting late into the night to prepare for the examination.\"</p>", ["(A) go haywire", "(B) run amok", "(C) sit tight", "(D) burn the midnight oil"], "D", "To burn the midnight oil means to study or work late into the night."),
      (10, "English", "<p>Choose the correct meaning of the word 'Affliction':</p>", ["(A) A deadly disease", "(B) A state of pain, distress or grief", "(C) A fatal order on a convict", "(D) Inability to recognize something terrible or painful"], "B", "Affliction means a state of pain, distress or grief."),
      (11, "English", "<p>Fill in the blank with suitable Conjunction: I want to go to the park ______ the weather is bad.</p>", ["(A) although", "(B) in spite of", "(C) when", "(D) as"], "A", "Although introduces a contrast clause."),
      (12, "English", "<p>Fill in the blank with suitable Conjunction: They are going on a vacation ______ they haven't decided the destination.</p>", ["(A) while", "(B) though", "(C) when", "(D) which"], "B", "Though introduces a concession."),
      (13, "English", "<p>A collection of poems or other literary works is known as:</p>", ["(A) Epilogue", "(B) Anthology", "(C) Manuscript", "(D) Lexicon"], "B", "Anthology."),
      (14, "English", "<p>Choose the correct word to fill in the gap: Her book is a ______ to her teacher.</p>", ["(A) debt", "(B) complement", "(C) compliment", "(D) supplement"], "C", "Compliment means an expression of praise or respect."),
      (15, "English", "<p>The phrase 'round the corner' is used to indicate something that is</p>", ["(A) near", "(B) departing", "(C) hiding", "(D) about to fall"], "A", "'Round the corner' means very near or upcoming."),
      (16, "English", "<p>Choose the word/phrase nearest in meaning to the proverb: 'Politeness costs little but yields much'</p>", ["(A) Being polite is desirable.", "(B) Politeness is a virtue that pays in long run.", "(C) Politeness is powerful.", "(D) Politeness can make people repent or win."], "B", "Politeness is a virtue that pays in the long run."),
      (17, "English", "<p>Fill in the modal auxiliaries as required: ______ you be more careful in the future? [Request]</p>", ["(A) Could", "(B) Should", "(C) Must", "(D) Have"], "A", "Could is used for polite requests."),
      (18, "English", "<p>Supply the missing word: There is a book shop close ______.</p>", ["(A) now", "(B) up", "(C) in", "(D) by"], "D", "Close by."),
      (19, "English", "<p>Fill in the blank with suitable Conjunction: I will call you later ______ I am done with my chores.</p>", ["(A) once", "(B) because", "(C) as", "(D) so"], "A", "Once means as soon as."),
      (20, "English", "<p>Give one word substitution/meaning: A <u>humongous</u> building was destroyed by the earthquake.</p>", ["(A) unsettled emotions", "(B) unstable", "(C) weak and non-functional", "(D) extremely large and huge"], "D", "Humongous means extremely large or huge."),
      (21, "English", "<p>Choose the right word: Children should not forget their ______ duty towards parents.</p>", ["(A) parental", "(B) filial", "(C) fraternal", "(D) ancestral"], "B", "Filial means relating to or due from a son or daughter."),
      (22, "English", "<p>Choose the correct meaning: 'Memorabilia' refers to</p>", ["(A) Memorable things", "(B) Memories of War", "(C) Memories of the past", "(D) Memories of objects collected because of their links with people or events"], "D", "Objects kept or collected because of their association with memorable people or events."),
      (23, "English", "<p>Choose the word/phrase nearest in meaning: 'Curiosity killed the cat.'</p>", ["(A) Excessive curiosity.", "(B) The cat should stay within limits.", "(C) If people are curious beyond a point, they may invite trouble.", "(D) Curiosity beyond any man's reach can be deadly."], "C", "Warning against unnecessary investigation into dangerous matters."),
      (24, "English", "<p>Choose the appropriate passive form: Napoleon made the impossible possible.</p>", ["(A) Possible was made the impossible by Napoleon.", "(B) The impossible was made possible by Napoleon.", "(C) Napoleon was made the impossible by possible.", "(D) The impossible has been made possible by Napoleon."], "B", "The impossible was made possible by Napoleon."),
      (25, "English", "<p>Choose the correct meaning of the word 'Underplay':</p>", ["(A) Intrigue", "(B) Conspire", "(C) Making more complicated or problematizing things", "(D) Represent something as being less important than it really is"], "D", "To underplay means to represent something as being less important than it actually is."),
      (26, "Reasoning", "<p>Find the odd number out: 24, 36, 72, 168 / বেমানান সংখ্যাটি খুঁজে বের করুন : 24, 36, 72, 168</p>", ["(A) 24", "(B) 36", "(C) 72", "(D) 168"], "B", "36 is a perfect square ($6^2$), others are non-square numbers."),
      (27, "Reasoning", "<p>Select the word which is different from the rest: Car, Bicycle, Bus, Train / যে শব্দটি বাকিগুলির থেকে আলাদা : গাড়ি, বাই-সাইকেল, বাস, ট্রেন</p>", ["(A) Car / গাড়ি", "(B) Bicycle / বাই-সাইকেল", "(C) Bus / বাস", "(D) Train / ট্রেন"], "B", "Bicycle is non-motorized."),
      (28, "Geography", "<p>Dehradun is the capital city of Uttarakhand. What does 'dun' (also spelled 'doon') signify here? / দেরাদুন হলো উত্তরাখণ্ডের রাজধানী শহর। এখানে 'দুন' শব্দটি কী নির্দেশ করে?</p>", ["(A) A valley between Lesser Himalaya and Shivalik / নিম্ন হিমালয় ও শিবালিকের মধ্যবর্তী উপত্যকা", "(B) An apple orchard", "(C) Fertile land", "(D) Silted-up lake in Shivalik"], "A", "A longitudinal valley between Lesser Himalaya and Shivalik."),
      (29, "History", "<p>'The Notes on Infant Marriage and Enforced Widowhood' was written by / 'The Notes on Infant Marriage and Enforced Widowhood' গ্রন্থটি কে রচনা করেছিলেন?</p>", ["(A) Behramji Malabari / বেহরামজি মালাবারি", "(B) Jyotiba Phule", "(C) Mahadeb Ranade", "(D) Dadoba Pandurang"], "A", "Behramji Malabari (1884)."),
      (30, "Polity", "<p>Under what authority the President of United States of America can impose tariffs? / যুক্তরাষ্ট্রের রাষ্ট্রপতি কোন কর্তৃত্ববলে শুল্ক আরোপ করতে পারেন?</p>", ["(A) Congress passed laws allowing the President to impose tariffs unilaterally. / কংগ্রেস এমন আইন পাস করেছে, যা রাষ্ট্রপতিকে একতরফাভাবে শুল্ক আরোপের অনুমতি দেয়।", "(B) Constitution authorizes President subject to restrictions.", "(C) Sweeping powers to correct trade imbalance.", "(D) None of the above"], "A", "Congress delegated tariff authority under Section 232 and Section 301."),
      (31, "Geography", "<p>Indian Topographical Map is published by / ভারতের ভূ-স্থানিক মানচিত্র প্রকাশ করে</p>", ["(A) Survey of India / সার্ভে অফ ইন্ডিয়া", "(B) Geological Survey of India", "(C) Indian Space Research Organization", "(D) UGC"], "A", "Survey of India (Dehradun)."),
      (32, "Science", "<p>Finland has started a permanent deep geological repository for spent nuclear fuel. Where is it situated? / ফিনল্যান্ড ব্যবহৃত পারমাণবিক জ্বালানির জন্য একটি স্থায়ী ও গভীর ভূ-তাত্ত্বিক ভাণ্ডার চালু করেছে। এটি কোথায় অবস্থিত?</p>", ["(A) Near Olkiluoto Nuclear Power Plant on west coast of Finland / ওলকিলুওতো পারমাণবিক বিদ্যুৎ কেন্দ্রের সন্নিকটে", "(B) North Pole near Svalbard", "(C) Near Helsinki", "(D) None"], "A", "Onkalo spent nuclear fuel repository at Olkiluoto."),
      (33, "Economics", "<p>A persistent fall in the general price level of goods and services is known as / পণ্য ও সেবার সাধারণ মূল্যস্তরের ক্রমাগত পতন কী নামে পরিচিত?</p>", ["(A) Deflation / মুদ্রাসংক সংকোচন", "(B) Disinflation", "(C) Stagflation", "(D) Depression"], "A", "Deflation is a general decline in prices."),
      (34, "Reasoning", "<p>All X-brand cars parked here are white. Some of them have radial tyres. All X-brand cars manufactured after 1986 have radial tyres. All cars are not X-brand. Conclusion? / নিচের কোন সিদ্ধান্তে উপনীত হওয়া যায়?</p>", ["(A) Cars other than X-brand cannot have radial tyres.", "(B) Only white cars are parked here.", "(C) Some white X-brand cars with radial tyres are parked here. / এখানে রেডিয়াল টায়ারযুক্ত X-ব্র্যান্ডের কিছু সাদা গাড়ি পার্ক করা আছে।", "(D) Cars other than X-brand cannot have radial tyres."], "C", "Some white X-brand cars have radial tyres."),
      (35, "History", "<p>The Vice-president of the interim government formed in 1946 was / 1946 সালে গঠিত অন্তর্বর্তী সরকারের উপ-রাষ্ট্রপতি কে ছিলেন?</p>", ["(A) Auchinleck", "(B) Liaquat Ali Khan", "(C) Jawaharlal Nehru / জওহরলাল নেহরু", "(D) Vallabhbhai Patel"], "C", "Jawaharlal Nehru was Vice-President of Executive Council."),
      (36, "History", "<p>Who was the first Indian ruler to join the Subsidiary Alliance? / অধীনতামূলক মিত্রতা নীতিতে যোগদানকারী প্রথম ভারতীয় শাসক কে ছিলেন?</p>", ["(A) Peshwa Bajirao II", "(B) King of Travancore", "(C) Nawab of Oudh", "(D) Nizam of Hyderabad / হায়দ্রাবাদের নিজাম"], "A", "Official WBPSC key marks A for Series C Q36."),
      (37, "History", "<p>How many hymns are there in the Rigveda? / ঋগ্বেদে কতগুলি সূক্ত রয়েছে?</p>", ["(A) 1017", "(B) 1028 / 1028", "(C) 1128", "(D) 1228"], "B", "1028 hymns (Suktas)."),
      (38, "History", "<p>Which among the following was circulated as symbols by the rebels during the Revolt of 1857? / 1857 সালের বিদ্রোহের সময় বিদ্রোহীদের দ্বারা নিচের কোনটি প্রতীক হিসেবে প্রচারিত হয়েছিল?</p>", ["(A) Sword", "(B) Chapati / রুটি (চাপাতি)", "(C) Scarf", "(D) Coins"], "B", "Chapati and Red Lotus."),
      (39, "Math", "<p>In an examination, a student gets 4 marks for every correct answer, 1 for unattempted & 0 for wrong answer. If there are 30 questions, which total score is NOT attainable? / ৩০টি প্রশ্ন থাকলে নিচের কোনটি শিক্ষার্থীর পক্ষে অর্জন করা সম্ভব নয়?</p>", ["(A) 113", "(B) 114", "(C) 115 / 115", "(D) 117"], "C", "Maximum 120. Next possible scores: 117 (29 correct, 0 unattempted), 116 (28 correct, 2 unattempted), 114... 115 is mathematically impossible!"),
      (40, "Science", "<p>India has recently launched a nationwide campaign for free HPV vaccination. Goal? / বিনামূল্যে HPV টিকাদানের লক্ষ্য—</p>", ["(A) Cervical cancer in women / নারীদের জরায়ুমুখের ক্যান্সার", "(B) Prostate cancer in men", "(C) Lung cancer", "(D) Breast cancer"], "A", "HPV vaccine prevents cervical cancer."),
      (41, "History", "<p>Who became the Congress President after the resignation of Subhas Chandra Bose? / সুভাষচন্দ্র বসুর পদত্যাগের পর কে কংগ্রেস সভাপতি হয়েছিল?</p>", ["(A) Rajendra Prasad / রাজেন্দ্র প্রসাদ", "(B) Jawaharlal Nehru", "(C) Acharya Kripalani", "(D) C. Rajagopalachari"], "A", "Dr. Rajendra Prasad (Tripuri session 1939)."),
      (42, "Science", "<p>Agar-agar is derived from a/an / আগার-আগার কোনটির থেকে প্রাপ্ত?</p>", ["(A) Bryophytes", "(B) Algae / শৈবাল", "(C) Fungi", "(D) Pteridophytes"], "B", "Red algae (Gelidium and Gracilaria)."),
      (43, "Economics", "<p>Mixed Economy refers to an economy where / মিশ্র অর্থনীতি বলতে এমন একটি অর্থনীতিকে বোঝায় যেখানে</p>", ["(A) both agriculture and industry are promoted.", "(B) co-existence of public and private sector / সরকারি ও বেসরকারি ক্ষেত্রের সহাবস্থান থাকে।", "(C) co-existence of foreign and domestic firms.", "(D) under joint control."], "B", "Co-existence of public & private sectors."),
      (44, "Science", "<p>What is the SHANTI Act, 2025? / SHANTI আইন, 2025 কি?</p>", ["(A) Super Hydrated Anti Natal", "(B) Sustainable Harnessing and Advancement of Nuclear Energy for Transforming India (SHANTI) Act, 2025 / সাস্টেইনেবল হার্নেসিং অ্যান্ড অ্যাডভান্সমেন্ট অব নিউক্লিয়ার এনার্জি ফর ট্রান্সফর্মিং ইন্ডিয়া আইন, 2025", "(C) Sustained Harnessing", "(D) None"], "B", "SHANTI Act 2025."),
      (45, "Geography", "<p>Which of the following Indian states does not share the boundary with West Bengal? / কোন ভারতীয় রাজ্যটির সীমানা পশ্চিমবঙ্গের সাথে যুক্ত নয়?</p>", ["(A) Sikkim", "(B) Jharkhand", "(C) Chhattisgarh / ছত্তিশগড়", "(D) Assam"], "C", "West Bengal shares borders with Odisha, Jharkhand, Bihar, Sikkim, and Assam. Not Chhattisgarh!"),
      (46, "Science", "<p>A real gas behaves like an ideal gas at / একটি বাস্তব গ্যাস কখন আদর্শ গ্যাসের মতো আচরণ করে?</p>", ["(A) high temperature and high pressure", "(B) high pressure and low temperature", "(C) low pressure and high temperature / নিম্ন চাপ ও উচ্চ তাপমাত্রায়", "(D) low pressure and low temperature"], "C", "Low pressure and high temperature."),
      (47, "Geography", "<p>Andaman and Nicobar Islands are separated by / আন্দামান ও নিকোবর দ্বীপপুঞ্জ যে প্রণালী দ্বারা বিচ্ছিন্ন—</p>", ["(A) Ten Degree Channel / দশ ডিগ্রি চ্যানেল", "(B) Five Degree Channel", "(C) Eight Degree Channel", "(D) Zero Degree Channel"], "A", "Ten Degree Channel."),
      (48, "Economics", "<p>Which of the following is not the attribute/main function of NABARD? / নিচের কোনটি NABARD-এর বৈশিষ্ট্য/প্রধান কাজ নয়?</p>", ["(A) Apex institution of rural sector", "(B) Promoting integrated rural development", "(C) Long-term credit to State Government", "(D) Apex financial institution of industrial credit / শিল্প ঋণের শীর্ষ আর্থিক প্রতিষ্ঠান"], "D", "NABARD is for Agriculture and Rural Development. Industrial credit is handled by IDBI/SIDBI."),
      (49, "CurrentAffairs", "<p>The 2026-2027 Census of India represents a significant milestone as it is / ভারতের 2026-2027 সালের আদমশুমারি প্রথম—</p>", ["(A) fully conducted door-to-door", "(B) digital, paperless census using electronic data collection methods / ইলেকট্রনিক পদ্ধতিতে তথ্যসংগ্রহের মাধ্যমে পরিচালিত ডিজিটাল ও কাগজবিহীন আদমশুমারি।", "(C) postal questionnaires", "(D) satellite imagery"], "B", "Digital and paperless census."),
      (50, "Polity", "<p>Which part of the Constitution of India deals with the Union Executive? / ভারতের সংবিধানের কোন অংশটি কেন্দ্রীয় নির্বাহী বিভাগ সংক্রান্ত বিষয় নিয়ে আলোচনা করে?</p>", ["(A) Part V / পঞ্চম ভাগ", "(B) Part III", "(C) Part VI", "(D) Part XI"], "A", "Part V (Articles 52 to 78)."),

      # Q51 to Q100
      (51, "Science", "<p>Pneumatophores are modified root and negatively geotropic. These are — / নিউম্যাটোফোর হলো পরিবর্তিত মূল এবং এগুলো হলো —</p>", ["(A) Respiratory roots / শ্বাসমূল", "(B) Photosynthetic roots", "(C) Food storing roots", "(D) Water storing roots"], "A", "Respiratory roots in mangrove plants."),
      (52, "Culture", "<p>The film 'Ek Ruka Hua Faisla' (1986) directed by Basu Chatterjee was adopted from '12 Angry Men'. Which group adopted it as a play in Bengali? / 'এক রুকা হুয়া ফয়সলা' কোন নাট্যগোষ্ঠী বাংলায় রূপান্তর করে?</p>", ["(A) Nandikar, Ek Theke Baro / নন্দীকার, এক থেকে বারো", "(B) Sayak, Kundubabu", "(C) Rangakarmee, Rudali", "(D) Natasena, Fata Gopal"], "A", "Nandikar (Ek Theke Baro)."),
      (53, "Polity", "<p>Consider statements: (I) Finance Commission is a Constitutional Body. (II) National Commission for Women is a Statutory Body. / বিবৃতি: (I) অর্থ কমিশন সাংবিধানিক সংস্থা, (II) জাতীয় মহিলা কমিশন সংবিধিবদ্ধ সংস্থা।</p>", ["(A) Only (I)", "(B) Only (II)", "(C) Both (I) and (II) / (I) এবং (II) উভয়ই", "(D) None"], "C", "Finance Commission (Art 280) is Constitutional, NCW (Act 1990) is Statutory."),
      (54, "Polity", "<p>Which correctly describes relationship between Union and States under Indian Constitution? / কেন্দ্র ও রাজ্যগুলির সম্পর্ককে সঠিকভাবে বর্ণনা করে?</p>", ["(A) Completely federal system", "(B) Completely unitary system", "(C) Quasi-federal system with strong Centre / শক্তিশালী কেন্দ্র-সহ আধা-যুক্তরাষ্ট্রীয় ব্যবস্থা", "(D) States have more power"], "C", "Quasi-federal structure."),
      (55, "Geography", "<p>East Kolkata Wetland has been declared as / পূর্ব কলকাতা জলাভূমিকে কী হিসেবে ঘোষণা করা হয়েছে?</p>", ["(A) Biodiversity Site", "(B) World Heritage Site", "(C) Ramsar Site / রামসার ক্ষেত্র", "(D) World Trade Site"], "C", "Ramsar Site (2002)."),
      (56, "History", "<p>Which Buddhist text provides an account of the 16 Mahajanpadas of 6th century B.C.? / কোন বৌদ্ধ গ্রন্থে ১৬টি মহাজনপদের বিবরণ পাওয়া যায়?</p>", ["(A) Tripitaka", "(B) Dipavamsa", "(C) Digha Nikaya", "(D) Anguttara Nikaya / অঙ্গুত্তরা নিকায়"], "D", "Anguttara Nikaya."),
      (57, "Science", "<p>What is the efficiency of currently available commercial solar cells? / বাণিজ্যিকভাবে লভ্য সৌরবিদ্যুৎ কোশের কর্মদক্ষতা কত?</p>", ["(A) 0-5%", "(B) 15-20% / 15-20%", "(C) 30-40%", "(D) 80-90%"], "B", "15-20%."),
      (58, "WestBengalGS", "<p>In West Bengal, silk industry is famous in / পশ্চিমবঙ্গের যে জেলায় রেশম শিল্প বিখ্যাত, তা হলো</p>", ["(A) Murshidabad / মুর্শিদাবাদ", "(B) Purulia", "(C) Nadia", "(D) Howrah"], "A", "Murshidabad."),
      (59, "Science", "<p>Which animal is natural reservoir of Nipah viruses? / নিপাহ ভাইরাসের প্রাকৃতিক আধার কোনটি?</p>", ["(A) Bats / বাদুড়", "(B) Turtles", "(C) Migratory birds", "(D) Horses"], "A", "Fruit bats (Pteropodidae)."),
      (60, "Economics", "<p>Which one is NOT an anti-inflationary measure in India? / কোনটি ভারতে মূল্যস্ফীতি রোধকারী ব্যবস্থা নয়?</p>", ["(A) Curbing disposable income", "(B) Checking black markets", "(C) Tax reform", "(D) Increase in money supply / অর্থের সরবরাহ বৃদ্ধি করা"], "D", "Increasing money supply causes inflation."),
      (61, "Economics", "<p>Which currency is known as 'vehicle currency'? / কোন মুদ্রাটি 'ভেহিকেল কারেন্সি' নামে পরিচিত?</p>", ["(A) Euro", "(B) Yen", "(C) Pound", "(D) None of the above / উপরের কোনটিই নয়"], "D", "US Dollar."),
      (62, "History", "<p>Who introduced Ryotwari settlement in Madras? / মাদ্রাজ কে রায়তওয়ারি বন্দোবস্ত প্রবর্তন করেন?</p>", ["(A) Charles Metcalfe", "(B) Thomas Munro / টমাস মুনরো", "(C) John Malcolm", "(D) Mountstuart Elphinstone"], "B", "Thomas Munro (1820)."),
      (63, "Geography", "<p>Sex Ratio in a population is defined as / লিঙ্গ অনুপাত বলতে কী বোঝায়?</p>", ["(A) Number of females per 1000 males / প্রতি 1000 পুরুষের অনুপাতে নারীর সংখ্যা", "(B) Number of boys born", "(C) Infant girls per 1000 females", "(D) Males minus females"], "A", "Females per 1000 males."),
      (64, "WestBengalGS", "<p>The script of Santhal language is / সাঁওতালি ভাষার লিপি কোনটি?</p>", ["(A) Tirhuta", "(B) Devnagari", "(C) Olchiki / অলচিকি", "(D) Chisoi"], "C", "Ol Chiki (Raghunath Murmu)."),
      (65, "Geography", "<p>Which pairs are correctly matched? (I) Rihand-UP, (II) Massanjore-WB, (III) Rana Pratap Sagar-Rajasthan, (IV) Hirakud-Chhattisgarh / জোড়াগুলি সঠিকভাবে মেলানো?</p>", ["(A) (I), (II) and (IV)", "(B) (II) only", "(C) (II) and (IV)", "(D) (I) and (III) / (I) এবং (III)"], "D", "Rihand (UP) and Rana Pratap Sagar (Rajasthan)."),
      (66, "History", "<p>Parallel governments during Quit India Movement 1942 were formed in / 1942 সালের আন্দোলনে সমান্তরাল সরকার কোথায় গঠিত হয়?</p>", ["(A) Ballia", "(B) Satara", "(C) Talcher / তালচের", "(D) All of the above"], "C", "Official WBPSC key marks C."),
      (67, "Geography", "<p>Which one is NOT correctly matched? / কোনটি সঠিকভাবে মেলানো নয়?</p>", ["(A) Kandla — Maharashtra / কান্দলা — মহারাষ্ট্র", "(B) Paradip — Odisha", "(C) Tuticorin — Tamilnadu", "(D) Cochin — Kerala"], "A", "Kandla port is in Gujarat."),
      (68, "History", "<p>Who among the following abolished the pilgrimage tax? / তীর্থকর বিলোপ করেছিলেন কে?</p>", ["(A) Humayun", "(B) Sher Shah", "(C) Akbar / আকবর", "(D) Jahangir"], "C", "Akbar (1563)."),
      (69, "Polity", "<p>Which of the following is matched incorrectly? / কোনটি ভুলভাবে মেলানো হয়েছে?</p>", ["(A) Finance Commission — Article 324 / অর্থ কমিশন — অনুচ্ছেদ 324", "(B) C.A.G. — Article 148", "(C) U.P.S.C. — Article 315", "(D) Election Commission — Article 324"], "A", "Finance Commission is Article 280; Article 324 is Election Commission."),
      (70, "History", "<p>Who opposed the burning of foreign clothes during Non-Cooperation Movement? / বিদেশী বস্ত্র পোড়ানোর বিরোধিতা কে করেছিলেন?</p>", ["(A) Chittaranjan Das", "(B) Rabindranath Tagore / রবীন্দ্রনাথ ঠাকুর", "(C) Subhas Chandra Bose", "(D) Bal Gangadhar Tilak"], "B", "Rabindranath Tagore."),
      (71, "History", "<p>What is the study and analysis of Coins known as? / মুদ্রার অধ্যয়ন ও বিশ্লেষণ কী নামে পরিচিত?</p>", ["(A) Coinography", "(B) Epigraphy", "(C) Numismatics / নিউমিসম্যাটিক্স", "(D) Calligraphy"], "C", "Numismatics."),
      (72, "Reasoning", "<p>How many members should at least be in a Club so guaranteed 2 members have same birth month? / জন্মমাস একই হওয়া নিশ্চিত করতে অন্তত কতজন সদস্য প্রয়োজন?</p>", ["(A) 3", "(B) 12", "(C) 13 / 13", "(D) 24"], "C", "13 members."),
      (73, "History", "<p>Which tribal leader was regarded as an incarnation of God ('Dharti Aba')? / 'ধরতি আবা' নামে পরিচিত ছিলেন?</p>", ["(A) Kanu Santhal", "(B) Rupa Naik", "(C) Birsa Munda / বিরসা মুন্ডা", "(D) Joria Bhagat"], "C", "Birsa Munda."),
      (74, "History", "<p>Congress Democratic Party was founded by / কংগ্রেস ডেমোক্রেটিক পার্টি প্রতিষ্ঠা করেছিলেন</p>", ["(A) Anne Besant", "(B) B.G. Tilak / বি.জি. তিলক", "(C) Muhammad Ali Jinnah", "(D) Motilal Nehru"], "B", "Bal Gangadhar Tilak (1920)."),
      (75, "Polity", "<p>Which Fundamental Rights cannot be suspended during National Emergency under Article 359? / জরুরি অবস্থার সময় স্থগিত করা যায় না?</p>", ["(A) Articles 19 and 32", "(B) Articles 14 and 15", "(C) Articles 20 and 21 / অনুচ্ছেদ 20 এবং 21", "(D) All of the above"], "C", "Articles 20 and 21."),
      (76, "History", "<p>During whose reign Malik Muhammad Jaisi completed poem Padmavat? / মালিক মুহাম্মদ জায়সি কার রাজত্বকালে 'পদুমাবত' কাব্য রচনা সমাপ্ত করেন?</p>", ["(A) Alauddin Khaliji", "(B) Ruknuddin Firoz", "(C) Sher Shah / শের শাহ", "(D) Muhammad Bin Tughlaq"], "C", "Sher Shah Suri (1540)."),
      (77, "Science", "<p>Water available for plants within the soil is / মাটির মধ্যে উদ্ভিদের জন্য উপলব্ধ জল—</p>", ["(A) Hygroscopic water", "(B) Capillary water / কৈশিক জল", "(C) Mineral water", "(D) Chemically bound water"], "B", "Capillary water."),
      (78, "Science", "<p>Which element outside radioactive series has radioactive isotope? / তেজস্ক্রিয় সিরিজের বাইরে অবস্থিত হলেও তেজস্ক্রিয় আইসোটোপ আছে?</p>", ["(A) Fluorine", "(B) Iodine", "(C) Chlorine", "(D) All of the above / উপরের সবকটিই"], "D", "All of the above."),
      (79, "History", "<p>The editor of the journal 'Karmayogin' was / 'কর্মযোগী' পত্রিকার সম্পাদক ছিলেন</p>", ["(A) Aurobindo Ghosh / অরবیند ঘোষ", "(B) Sisir Kumar Ghosh", "(C) Bal Gangadhar Tilak", "(D) Mahatma Gandhi"], "A", "Sri Aurobindo Ghosh."),
      (80, "Polity", "<p>Public Interest Litigation (PIL) is primarily associated with / জনস্বার্থ মামলা ধারণাটির সাথে যুক্ত?</p>", ["(A) Judicial Review", "(B) Judicial Activism / বিচার বিভাগীয় সক্রিয়তা", "(C) Federalism", "(D) NITI Aayog"], "B", "Judicial Activism."),
      (81, "Reasoning", "<p>\"Having 4 equal sides is necessary for quadrilateral to be square, but not sufficient.\" Means: / চারটি সমান বাহু চতুর্ভুজ বর্গক্ষেত্র হওয়ার জন্য প্রয়োজনীয় শর্ত কিন্তু যথেষ্ট নয়—</p>", ["(A) A quadrilateral cannot be square unless it has 4 equal sides, but having 4 equal sides doesn't guarantee it to be a square. / চতুর্ভুজটি বর্গক্ষেত্র হতে পারে না যদি না চারটি বাহু সমান থাকে।", "(B) No quadrilateral with 4 equal sides is square.", "(C) Sides cannot be equal.", "(D) Equality of sides is unrelated."], "A", "Necessary condition definition."),
      (82, "CurrentAffairs", "<p>Full Form of BRICS? / BRICS-এর পূর্ণরূপ কী?</p>", ["(A) Brazil, Russia, Indonesia, Chile, Spain", "(B) Britain, Romania, India, China", "(C) Brazil, Russia, India, China & South Africa / ব্রাজিল, রাশিয়া, ভারত, চীন ও দক্ষিণ আফ্রিকা", "(D) None"], "C", "Brazil, Russia, India, China, South Africa."),
      (83, "CurrentAffairs", "<p>India has officially set its Net-Zero Carbon Emission target for the year / ভারতের 'নেট-জিরো' কার্বন নির্গমনের লক্ষ্যমাত্রা</p>", ["(A) 2050", "(B) 2060", "(C) 2100", "(D) 2070 / 2070"], "D", "2070."),
      (84, "Geography", "<p>Jarwas live in / জারোয়া উপজাতিরা বসবাস করে</p>", ["(A) Andaman / আন্দামানে", "(B) Mazuli", "(C) Sagar", "(D) Lakshadweep"], "A", "Andaman Islands."),
      (85, "Math", "<p>Selling 2 goats at same price, 10% profit on one and 10% loss on other— / দুটি ছাগল বিক্রি করার সময় একটিতে 10% লাভ ও অন্যটিতে 10% ক্ষতি হয়—</p>", ["(A) No profit no loss", "(B) Profit 1%", "(C) Suffers a loss of 1% / 1% ক্ষতি হয়", "(D) Loss 2%"], "C", "1% Loss ($10^2/100 = 1\\%$)."),
      (86, "History", "<p>The leader of Tana Bhagat movement was / টানা ভগত আন্দোলনের নেতা ছিলেন</p>", ["(A) Sidho Majhi", "(B) Birsa Munda", "(C) Jatra Oraon / যাত্রা ওরাওঁ", "(D) Bhai Mukund"], "C", "Jatra Oraon (1914)."),
      (87, "Geography", "<p>Which of the following is NOT a UNESCO World Heritage site? / কোনটি ইউনেস্কো বিশ্ব ঐতিহ্যবাহী স্থান নয়?</p>", ["(A) Ellora caves", "(B) Kaziranga National Park", "(C) Churches and convents of Goa", "(D) Gateway of India / গেটওয়ে অব ইন্ডিয়া"], "D", "Gateway of India."),
      (88, "History", "<p>Who drafted Congress Enquiry Committee Report on Jallianwala Bagh Massacre? / জলিয়ানওয়ালাবাগ হত্যা তদন্ত প্রতিবেদন কে রচনা করেছিলেন?</p>", ["(A) Chittaranjan Das", "(B) Motilal Nehru", "(C) Mahatma Gandhi / মহাত্মা গান্ধী", "(D) Saifuddin Kitchlew"], "C", "Mahatma Gandhi."),
      (89, "Math", "<p>630 children seated in rows, each row contains 3 less children than row in front. Which number of rows NOT possible? / ৬৩০ জন শিশুর বিন্যাস সম্ভব নয় কোনটি?</p>", ["(A) 3", "(B) 4 / 4", "(C) 5", "(D) 6"], "B", "4 rows."),
      (90, "History", "<p>The Chamber of Princes (Narendra Mandal) was established in which year? / চেম্বার অফ প্রিন্সেস (নরেন্দ্র মন্ডল) কত সালে প্রতিষ্ঠিত হয়েছিল?</p>", ["(A) 1858", "(B) 1915", "(C) 1920 / 1920", "(D) 1947"], "C", "1920 (Proclamation 1920, Inauguration 1921)."),
      (91, "Science", "<p>Synapsis occurs during / সাইন্যাপসিস কখন ঘটে?</p>", ["(A) Leptotene", "(B) Diplotene", "(C) Zygotene / জাইগোটিন", "(D) Pachytene"], "C", "Zygotene of Meiosis I."),
      (92, "Geography", "<p>The retreating South-West Monsoon brings rain in which part of India? / প্রত্যাবর্তনকারী দক্ষিণ-পশ্চিম মৌসুমী বায়ু ভারতের কোন অংশে বৃষ্টিপাত ঘটায়?</p>", ["(A) North-Western part", "(B) North-Eastern part", "(C) Eastern part of Peninsular India / উপদ্বীপীয় ভারতের পূর্বাংশে", "(D) Western part"], "C", "Coromandel Coast (Tamil Nadu)."),
      (93, "Reasoning", "<p>Select shape which is different from rest: Square, Circle, Triangle, Rectangle / কোন আকৃতিটি আলাদা?</p>", ["(A) Square", "(B) Circle / বৃত্ত", "(C) Triangle", "(D) Rectangle"], "B", "Circle."),
      (94, "Reasoning", "<p>If APPLES is written as BORJHP, how shall BANANA be written? / BANANA-কে কীভাবে লেখা হবে?</p>", ["(A) CZPYQX / CZPYQX", "(B) CZPZQZ", "(C) CZOZOZ", "(D) ABLCKD"], "A", "CZPYQX."),
      (95, "Reasoning", "<p>Next letter in series: A, D, G, J, M, ? / পরবর্তী অক্ষর: A, D, G, J, M, ?</p>", ["(A) O", "(B) P / P", "(C) Q", "(D) R"], "B", "P (+3 step increments)."),
      (96, "Science", "<p>Which of the following elements is a semiconductor? / কোনটি অর্ধপরিবাহী?</p>", ["(A) Iron", "(B) Zinc", "(C) Mercury", "(D) Silicon / সিলিকন"], "D", "Silicon."),
      (97, "Math", "<p>Two cars start towards each other from A & B 160 km apart at 8:10 am at 50 km/hr & 30 km/hr. Meet time? / কতটায় মিলিত হবে?</p>", ["(A) 10:10 am", "(B) 10:30 am / 10:30 am", "(C) 11:10 am", "(D) 11:20 am"], "B", "10:30 am."),
      (98, "CurrentAffairs", "<p>Reason driving rapid growth of data centers in India? / ডাটা সেন্টারগুলির দ্রুত বৃদ্ধির কারণ?</p>", ["(A) Lax environmental enforcement", "(B) Strict data localization regulations (DPDP Act 2023) / কঠোর ডাটা স্থানীয়করণ বিধিমালা", "(C) Cheap electricity", "(D) Deterioration in US relation"], "B", "Strict data localization regulations."),
      (99, "WestBengalGS", "<p>Wind Energy Project was set up in West Bengal at / পশ্চিমবঙ্গে বায়ু শক্তি প্রকল্প তৈরি হয়েছিল কোথায়?</p>", ["(A) Bakkhali", "(B) Frezerganj / ফ্রেশারগঞ্জ", "(C) Digha", "(D) Haldia"], "B", "Fraserganj."),
      (100, "Geography", "<p>Golden Quadrilateral is a / সোনালী চতুর্ভুজ হলো একটি</p>", ["(A) National Highway Development Project / জাতীয় মহাসড়ক উন্নয়ন প্রকল্প", "(B) Waterway", "(C) Railway", "(D) Airway"], "A", "National Highway Development Project."),

      # Q101 to Q200
      (101, "Science", "<p>Which particular bonding exists in $\\text{H}_2\\text{O}$ and $\\text{HF}$ but does NOT exist in $\\text{H}_2\\text{S}$? / $\\text{H}_2\\text{O}$ এবং $\\text{HF}$-এ বিদ্যমান কিন্তু $\\text{H}_2\\text{S}$-এ বিদ্যমান নয়?</p>", ["(A) Covalent bonding", "(B) Ionic bonding", "(C) Hydrogen bonding / হাইড্রোজেন বন্ধন", "(D) Metallic bonding"], "C", "Hydrogen bonding."),
      (102, "Economics", "<p>The difference between Gross Domestic Product (GDP) and Net Domestic Product (NDP) is / মোট অভ্যন্তরীণ উৎপাদন এবং নিট অভ্যন্তরীণ উৎপাদনের পার্থক্য হলো</p>", ["(A) Government Revenue", "(B) Net Indirect Tax", "(C) Depreciation / অবচয়", "(D) Foreign Aid"], "C", "Depreciation."),
      (103, "History", "<p>Babur's famous autobiography 'Baburnama' was translated into Persian by / বাবরের আত্মজীবনী 'বাবরনামা' ফারসি ভাষায় কে অনুবাদ করেন?</p>", ["(A) Abdur Rahim Khan-I-Khanan / আবদুর রহিম খান-ই-খানান", "(B) Badauni", "(C) Faizi", "(D) Gulbadan Begaum"], "A", "Abdur Rahim Khan-I-Khanan."),
      (104, "History", "<p>Who among the following persons wrote a biography of Mahatma Gandhi? / কে মহাত্মা গান্ধীর জীবনী রচনা করেছিলেন?</p>", ["(A) Richard Gregg", "(B) Louis Fischer / লুই ফিশার", "(C) Web Miller", "(D) Pat Hendricks"], "B", "Louis Fischer ('The Life of Mahatma Gandhi')."),
      (105, "CurrentAffairs", "<p>Banu Mushtaq & Deepa Bhasti won International Booker Prize 2025 for 'Heart Lamp' while David Szalay won Booker Prize for 'Flesh'. Difference? / দুটি পুরস্কারের মধ্যে পার্থক্য কী?</p>", ["(A) They are the same.", "(B) Nomenclature changed since 2011.", "(C) Booker Prize is for books written in English while International Booker is for translated books into English. / বুকার পুরস্কার ইংরেজিতে লেখা বইয়ের জন্য এবং আন্তর্জাতিক বুকার অনূদিত বইয়ের জন্য দেওয়া হয়।", "(D) Given to Asian writers."], "C", "Booker Prize is for English originals; International Booker Prize is for translated fiction."),
      (106, "Polity", "<p>Which statement correctly describes the status of 'Right to Privacy' in India? / ভারতে 'গোপনীয়তার অধিকার'-এর মর্যাদাকে সঠিকভাবে বর্ণনা করে?</p>", ["(A) Statutory right granted by Parliament.", "(B) Not recognized under Constitution.", "(C) Fundamental right confirmed by the Supreme Court of India. / এটি সুপ্রিম কোর্ট কর্তৃক নিশ্চিতকৃত একটি মৌলিক অধিকার।", "(D) None of the above"], "C", "Fundamental Right under Article 21 (Puttaswamy case 2017)."),
      (107, "History", "<p>The leader of the Kherwar or Safa Hor movement was / খেরওয়ার বা সাফা হোড় আন্দোলনের নেতা ছিলেন</p>", ["(A) Birsa Munda", "(B) Bhagirath Manjhi / ভগীরথ মাঞ্জি", "(C) Baba Ramchandra", "(D) Madari Pasi"], "B", "Bhagirath Manjhi (1868)."),
      (108, "Culture", "<p>Homage was paid to Thiruvalluvar. Who was he and why is he famous? / থিরুভাল্লুভারের প্রতি শ্রদ্ধা জানানো হলো। ইনি কে এবং কেন বিখ্যাত?</p>", ["(A) Tamil poet & philosopher who wrote Tirukkural (1,330 kurals). / তামিল কবি ও দার্শনিক যিনি তিরুক্কুরাল রচনা করেছিলেন।", "(B) Assamese poet.", "(C) King of Chola.", "(D) Court poet."], "A", "Tamil poet who wrote Tirukkural."),
      (109, "History", "<p>The leader of the Reang uprising in Tripura (1942-43) was / ত্রিপুরায় রিয়াং বিদ্রোহের নেতা কে ছিলেন?</p>", ["(A) Parikshit Jamatiya", "(B) Ratan Mani / রতন মণি", "(C) Birsa Munda", "(D) Bir Bikram Manikya"], "B", "Ratan Mani Reang."),
      (110, "History", "<p>Which of the following cities was NOT founded by Firoz Tughlaq? / নিচের কোন শহরটি ফিরোজ তুঘলক প্রতিষ্ঠা করেননি?</p>", ["(A) Hissar", "(B) Jaunpur", "(C) Fatehpur / ফতেহপুর", "(D) Fatehabad"], "C", "Fatehpur Sikri was founded by Akbar; Firoz Tughlaq founded Hissar, Jaunpur, Firozabad, Fatehabad."),
      (111, "Math", "<p>A body covers half the distance with speed of 10 m/s and remaining half with 40 m/s. Average speed of body? / সমগ্র যাত্রাপথে বস্তুটির গড় বেগ কত হবে?</p>", ["(A) 16 m/s / 16 m/s", "(B) 20 m/s", "(C) 25 m/s", "(D) Depends on total distance"], "A", "$2 \\times 10 \\times 40 / (10 + 40) = 16$ m/s."),
      (112, "Reasoning", "<p>Find the next number in series: 2, 6, 12, 20, ? / সিরিজের পরবর্তী সংখ্যাটি নির্ণয় করুন : 2, 6, 12, 20, ?</p>", ["(A) 28", "(B) 30 / 30", "(C) 32", "(D) 36"], "B", "30 ($1\\times2=2, 2\\times3=6, 3\\times4=12, 4\\times5=20, 5\\times6=30$)."),
      (113, "Economics", "<p>Which period in India is known as 'Plan Holiday'? / ভারতের কোন সময়কালটি পরিকল্পনা বিরতি (Plan Holiday) নামে পরিচিত?</p>", ["(A) 1961-1966", "(B) 1965-1966", "(C) 1966-1969 / 1966-1969", "(D) 1969-1974"], "C", "1966-1969."),
      (114, "WestBengalGS", "<p>On a per hectare basis, which forest holds maximum amount of carbon in West Bengal? / প্রতি হেক্টরের ভিত্তিতে সর্বাধিক কার্বন সঞ্চিত আছে?</p>", ["(A) Sal forest in West Medinipur", "(B) Tropical moist deciduous in Buxa", "(C) Mangrove forest in Sunderbans / সুন্দরবনে ম্যানগ্রোভ বন", "(D) Evergreen temperate in Kalimpong"], "C", "Mangrove forests have highest soil & biomass carbon density."),
      (115, "History", "<p>Who among the following paid his soldiers in cash? / নিচের মধ্যে কে তাঁর সেনাদের নগদ অর্থে বেতন দিতেন?</p>", ["(A) Balban", "(B) Alauddin Khilji / আলাউদ্দিন খিলজি", "(C) Muhammad Bin Tughlaq", "(D) Iltutmish"], "B", "Alauddin Khilji."),
      (116, "Culture", "<p>In which ancient Scripture was the phrase \"Tamaso Ma Jyotirgamaya\" originally mentioned? / \"তমসো মা জ্যোতির্গময়\" বাক্যটি প্রথম উল্লেখ করা হয়েছিল?</p>", ["(A) Rig Veda", "(B) Bhagavad Gita", "(C) Mundak Upanishad", "(D) Brihadaranyaka Upanishad / বৃহদারণ্যক উপনিষদ"], "D", "Brihadaranyaka Upanishad."),
      (117, "Reasoning", "<p>A person walks 500m NE, then 1km S, right 1km, 500m SW, 1km N. Where will he be at the end with respect to starting position? / শুরুর অবস্থানের সাপেক্ষে তিনি কোথায় অবস্থান করবেন?</p>", ["(A) 1 km South-West", "(B) 500 m North", "(C) 500 m East", "(D) 1 km West / 1 কিমি পশ্চিম"], "D", "1 km West."),
      (118, "WestBengalGS", "<p>Which one of the following is NOT located in West Bengal? / কোনটি পশ্চিমবঙ্গে অবস্থিত নয়?</p>", ["(A) Singalila National Park", "(B) Chapramari Wildlife Sanctuary", "(C) Namthing Pokhari Biodiversity Heritage Site", "(D) Manas Biosphere Reserve / মানস জীবমণ্ডল সংরক্ষণ ক্ষেত্র"], "D", "Manas Biosphere Reserve is in Assam."),
      (119, "Economics", "<p>Which one among the following is NOT Sunrise Sectors in India? / কোনটি ভারতের 'সূর্যোদয় ক্ষেত্র' (Sunrise Sectors) নয়?</p>", ["(A) Food Processing", "(B) Textile / বস্ত্রশিল্প", "(C) Artificial Intelligence (AI) and IT", "(D) Space Technology"], "B", "Textile is a traditional sector."),
      (120, "Math", "<p>A body covers half distance with speed 20 m/s and other half with 30 m/s. Average speed of body during whole journey is / সমগ্র যাত্রায় বস্তুটির গড় দ্রুতি হবে</p>", ["(A) 0 m/s", "(B) 24 m/s / 24 m/s", "(C) 25 m/s", "(D) 28 m/s"], "B", "$2 \\times 20 \\times 30 / 50 = 24$ m/s."),
      (121, "Science", "<p>Formula of Chloride of an element M is $\\text{MCl}_4$ and its Molecular weight is 154 (Cl = 35.5). Molecular weight of its oxide is / যৌগটির অক্সাইডের আণবিক ভর হবে</p>", ["(A) 64", "(B) 72", "(C) 44 / 44", "(D) 40"], "C", "44 (Element M is Carbon, $M = 12$; Oxide is $\\text{CO}_2 = 12 + 32 = 44$)."),
      (122, "Math", "<p>Average marks obtained by boys and girls in a class are 52 and 42 respectively. If average marks of all students is 50, percentage of boys? / ছাত্রদের শতকরা হার কত?</p>", ["(A) 40%", "(B) 50%", "(C) 80% / 80%", "(D) Cannot be determined"], "C", "80% ($52B + 42G = 50(B+G) \\Rightarrow 2B = 8G \\Rightarrow B/G = 4/1 = 80\\%$)."),
      (123, "History", "<p>Who was sent by Indian National Congress to represent its views at Versailles Conference in 1919? / ১৯১৯ সালে ভার্সাই সম্মেলনে জাতীয় কংগ্রেসের মতামত তুলে ধরার জন্য কাকে পাঠানো হয়েছিল?</p>", ["(A) B. G. Tilak / বি. জি. তিলক", "(B) Annie Besant", "(C) C. R. Das", "(D) S. N. Banerjee"], "A", "Lokmanya Bal Gangadhar Tilak."),
      (124, "Science", "<p>Mass of atom is determined by / পরমাণুর ভর নিয়ন্ত্রণ করে</p>", ["(A) Proton + Neutron / প্রোটন + নিউট্রন", "(B) Proton + Electron", "(C) Neutron + Electron", "(D) Proton + Neutron + Electron"], "A", "Proton + Neutron."),
      (125, "WestBengalGS", "<p>Consider pairs: (I) Bankura-Sal, (II) South 24 Parganas-Sundari, (III) Coochbehar-Pine, (IV) Purba Medinipur-Baobab. How many pairs correctly matched? / কতগুলি সঠিকভাবে মেলানো হয়েছে?</p>", ["(A) Only one", "(B) Only two", "(C) Only Three / শুধুমাত্র তিনটি", "(D) All four"], "C", "Three pairs correctly matched."),
      (126, "Science", "<p>Which of the following carries oxygenated blood? / কোনটি অক্সিজেনযুক্ত রক্ত বহন করে?</p>", ["(A) Hepatic portal veins", "(B) Pulmonary veins / ফুসফুসীয় সিরাসঙ্গুলী", "(C) Renal veins", "(D) Pulmonary artery"], "B", "Pulmonary veins carry oxygenated blood from lungs to heart."),
      (127, "History", "<p>Who was first selected by Gandhiji for his 'Individual Satyagraha' movement in 1940? / 'ব্যক্তিগত সত্যাগ্রহ' আন্দোলনের জন্য সর্বপ্রথম কাকে নির্বাচন করেছিলেন?</p>", ["(A) Jawaharlal Nehru", "(B) Achyut Patwardhan", "(C) Vinoba Bhave / বিনোবা ভাবে", "(D) Aruna Asaf Ali"], "C", "Acharya Vinoba Bhave (2nd was Jawaharlal Nehru)."),
      (128, "Science", "<p>The most abundant enzyme in the living world is / জীবজগতে সবচেয়ে বেশি পাওয়া যায় এমন এনজাইম হলো</p>", ["(A) Lipase", "(B) DNase", "(C) Rubisco / রুবিস্কো", "(D) Zymase"], "C", "RuBisCO (Ribulose-1,5-bisphosphate carboxylase-oxygenase)."),
      (129, "Economics", "<p>Which one of the following is included in secondary sector from standpoint of sources of national income? / দ্বিতীয়ক ক্ষেত্র (secondary sector)-এর অন্তর্ভুক্ত?</p>", ["(A) Trade", "(B) Transport", "(C) Construction / নির্মাণ", "(D) Communication"], "C", "Manufacturing and Construction."),
      (130, "Reasoning", "<p>While a car in moving on a straight road, a GPS map is showing North in the bottom right corner. In which direction will it be travelling after it turns 90° to left? / গাড়িটি বাম দিকে 90° বাঁক নেওয়ার পর কোন দিকে অগ্রসর হবে?</p>", ["(A) West", "(B) South-East", "(C) South", "(D) North-West / উত্তর-পশ্চিম"], "D", "North-West."),
      (131, "Science", "<p>Ginger is a stem because / আদা হলো একটি কাণ্ড, কারণ</p>", ["(A) Grows horizontally", "(B) Stores food", "(C) Absence of chlorophyll", "(D) It has nodes and inter-nodes / এতে পর্ব (nodes) ও পর্বমধ্য (inter-nodes) রয়েছে।"], "B", "Official WBPSC key marks B for Series C Q131."),
      (132, "Reasoning", "<p>\"If a person is highly educated, then he earns well.\" Which option is necessarily correct? / তাহলে নিচের বিকল্পগুলির মধ্যে কোনটি নিশ্চিতভাবে সঠিক?</p>", ["(A) Suman earns well, so he is highly educated.", "(B) Illiterate people cannot earn well.", "(C) All persons with good income must be highly educated.", "(D) All persons with high education has good earnings. / উচ্চশিক্ষিত সকল ব্যক্তিরই ভালো উপার্জন থাকে।"], "D", "Direct logical statement equivalent."),
      (133, "Science", "<p>With reference to Cyclone which statements are correct? (I) Formation caused by difference in air pressure. (II) Most develop over warm ocean waters. (III) Eye of Cyclone has dense cloud cover. / ঘূর্ণিবাত সম্পর্কিত কোন বিবৃতিটি সঠিক?</p>", ["(A) (II) only", "(B) (I), (II) and (III)", "(C) (I) and (II) / (I) এবং (II)", "(D) (III) only"], "A", "Official WBPSC key marks A for Series C Q133."),
      (134, "CurrentAffairs", "<p>Identify the incorrect statement about ongoing Ukraine-Russia War: / যুদ্ধ সম্পর্কিত ভুল বিবৃতিটি চিহ্নিত করুন :</p>", ["(A) Russia has occupied Ukrainian territories... / ক্রাইমিয়া দখল করে নিয়েছিল (2014, not current war)", "(B) War started Feb 2022", "(C) Russian invasion to stop NATO integration", "(D) Crimea taken"], "A", "Crimea was annexed in 2014, not 2022."),
      (135, "Culture", "<p>\"My two fingers on a typewriter... A fountain pen of course\" — Graham Greene. Which is a manufacturer of Fountain Pens? / কোনটি ফাউন্টেন পেনের অন্যতম প্রস্তুতকারক?</p>", ["(A) Voltas", "(B) Sailor / সেইলর", "(C) Hundai", "(D) Kirloskar"], "A", "Official WBPSC key marks A for Series C Q135."),
      (136, "Geography", "<p>Which city is located closest to the Tropic of Cancer? / কোন শহরটি কর্কটক্রান্তি রেখার সবচেয়ে কাছাকাছি অবস্থিত?</p>", ["(A) Durgapur", "(B) Baharampur", "(C) Krishnanagar / কৃষ্ণনগর", "(D) Chandannagore"], "B", "Official WBPSC key marks B for Series C Q136."),
      (137, "Polity", "<p>Which amendment made written advice of Cabinet mandatory for Emergency declaration? / মন্ত্রিসভার লিখিত পরামর্শ গ্রহণ বাধ্যতামূলক করা হয়েছিল?</p>", ["(A) 42nd Amendment", "(B) 52nd Amendment", "(C) 86th Amendment", "(D) 44th Amendment / 44তম সংশোধনী"], "D", "44th Constitutional Amendment Act 1978."),
      (138, "Economics", "<p>Dependency Ratio of a country is / কোনো দেশের নির্ভরশীলতার অনুপাত হলো</p>", ["(A) Imports to GDP", "(B) FDI to Investment", "(C) Ratio of Non-working Age Population to Working Age Population / কর্মক্ষম নয় এমন জনসংখ্যার সাথে কর্মক্ষম জনসংখ্যার অনুপাত", "(D) Govt Exp to Income"], "D", "Official WBPSC key marks D for Series C Q138."),
      (139, "Science", "<p>Which element available adequately in India can be used to produce nuclear power? / কোন মৌল থেকে পারমাণবিক শক্তি তৈরি করা সম্ভব?</p>", ["(A) Actinium", "(B) Neptunium", "(C) Copper / তামিল", "(D) Thorium"], "C", "Official WBPSC key marks C for Series C Q139."),
      (140, "History", "<p>Who among the following presided over the first Buddhist Council? / প্রথম বৌদ্ধ সংগীতিতে সভাপতিত্ব করেছিলেন?</p>", ["(A) Upali", "(B) Ananda", "(C) Mahakasyapa / মহাকাশপ", "(D) Moggaliputta Tissa"], "C", "Mahakasyapa (Rajgir, 483 BC)."),
      (141, "History", "<p>Which incident prompted appointment of Hunter Committee? / হান্টার কমিটি নিয়োগের প্রেক্ষাপট তৈরি করেছিল?</p>", ["(A) Uprising of 1857", "(B) Partition of Bengal", "(C) Jallianwala Bagh Massacre / জালিয়ানওয়ালাবাগ হত্যাকাণ্ড", "(D) Komagata Maru incident"], "B", "Official WBPSC key marks B for Series C Q141."),
      (142, "History", "<p>Who among the following Urdu poets was invited to Second and Third Round Table Conferences? / দ্বিতীয় এবং তৃতীয় গোলটেবিল সম্মেলনে আমন্ত্রণ জানানো হয়েছিল?</p>", ["(A) Firaq Gorakhpuri", "(B) Muhammad Iqbal / মুহাম্মদ ইকবাল", "(C) Josh Malihabadi", "(D) Faiz Ahmad Faiz"], "B", "Sir Muhammad Iqbal."),
      (143, "Science", "<p>A planet of mass m revolves around sun in circle of radius r. Work done by gravitational force F in moving planet over half circumference? / কৃতকার্যের পরিমাণ কত?</p>", ["(A) zero / শূন্য", "(B) $F \\times 2\\pi r$", "(C) $F \\times \\pi r$", "(D) $F \\times 2r$"], "C", "Official WBPSC key marks C for Series C Q143."),
      (144, "Science", "<p>Why antibiotics are not prescribed to kill viral infections? / অ্যান্টিবায়োটিক দেওয়া হয় না কেন?</p>", ["(A) Viruses take refuge in organelle", "(B) Viruses neither have cell walls nor metabolic machinery targeted by antibiotics / ভাইরাসের কোষপ্রাচীর নেই... বিপাকীয় ব্যবস্থা নেই", "(C) Mutate rapidly", "(D) None"], "A", "Official WBPSC key marks A for Series C Q144."),
      (145, "History", "<p>'Operation Polo' referred to military operation to integrate which princely state? / 'অপারেশন পোলো' কোন দেশীয় রাজ্যকে ভারতীয় ইউনিয়নের অন্তর্ভুক্ত করার অভিযান?</p>", ["(A) Kashmir", "(B) Junagadh", "(C) Hyderabad / হায়দ্রাবাদ", "(D) Jodhpur"], "C", "Hyderabad (September 1948)."),
      (146, "CurrentAffairs", "<p>The year 2026 has been declared by United Nation as: / জাতিসংঘ 2026 কে কিসের বছর হিসেবে গণ্য করেছে?</p>", ["(A) International year of Food Security / খাদ্য সুরক্ষার আন্তর্জাতিক বছর", "(B) Rural Development", "(C) Women Farmers", "(D) Human Development"], "A", "Official WBPSC key marks A for Series C Q146."),
      (147, "Economics", "<p>The tax imposed on import and export of commodity is known as / পণ্যের আমদানি ও রফতানির ওপর আরোপিত কর কী নামে পরিচিত?</p>", ["(A) Customs Duties / কাস্টমস ডিউটি", "(B) Excise Duties", "(C) VAT", "(D) GST"], "A", "Customs Duties."),
      (148, "Environment", "<p>Joint Forest Management is primarily a partnership between / যৌথ বন ব্যবস্থাপনা মূলত কাদের মধ্যকার অংশীদারিত্ব?</p>", ["(A) Central & State Govt", "(B) Local Communities and Forest Department", "(C) NGOs and Environment Agencies / এনজিও এবং আন্তর্জাতিক পরিবেশ সংস্থাসমূহ", "(D) Private Corp & Tribal"], "C", "Official WBPSC key marks C for Series C Q148."),
      (149, "Math", "<p>Length of rectangle decreased by 20% while breadth increased by 20%. Area of rectangle will / ক্ষেত্রফল—</p>", ["(A) Remain unchanged / অপরিবর্তিত থাকবে", "(B) decrease by 4%", "(C) increase by 2%", "(D) increase by 4%"], "A", "Official WBPSC key marks A for Series C Q149."),
      (150, "Math", "<p>In an enclosure, there are crows as well as cows. If 30 heads and 100 legs, ratio of cows to crows? / গরু ও কাকের অনুপাত কত?</p>", ["(A) 1:2", "(B) 1:3", "(C) 2:1 / 2:1", "(D) 3:1"], "C", "2:1 (Cows = 20, Crows = 10)."),
      (151, "CurrentAffairs", "<p>Kartiki Gonsalves & Guneet Monga won Oscar in 2023 for Best Documentary (Short Subject). Name of film? / প্রামাণ্যচিত্রটির নাম কী?</p>", ["(A) Postman Always Rings Twice", "(B) The Elephant Whisperers / দি এলিমেন্ট হুইস্পারারস", "(C) The Perfect Murder", "(D) None"], "B", "The Elephant Whisperers."),
      (152, "History", "<p>Who among the following called Irwin and Gandhi 'The Two Mahatmas'? / কে আরউইন এবং গান্ধীকে 'দুই মহাত্মা' বলে অভিহিত করেছিলেন?</p>", ["(A) Rabindranath Tagore", "(B) Sarojini Naidu / সরোজিনী নাইডু", "(C) Jawaharlal Nehru", "(D) Mirabehn"], "B", "Sarojini Naidu."),
      (153, "Science", "<p>Resistance of uniform metal wire of length 1m and area $1\\text{cm}^2$ is $10\\Omega$. Resistivity of wire is / তারটির রোধাঙ্ক হলো</p>", ["(A) $\\frac{1}{10} \\ \\Omega\\text{cm}$ / $\\frac{1}{10} \\ \\Omega\\text{cm}$", "(B) $1 \\ \\Omega\\text{cm}$", "(C) $10 \\ \\Omega\\text{cm}$", "(D) $100 \\ \\Omega\\text{cm}$"], "A", "Official WBPSC key marks A for Series C Q153."),
      (154, "WestBengalGS", "<p>Jaldapara National Park is located in / জলদাপাড়া জাতীয় উদ্যানটি কোথায় অবস্থিত?</p>", ["(A) Jalpaiguri & Alipurduar", "(B) Alipurduar district / আলিপুরদুয়ার জেলায়", "(C) Coochbehar & Jalpaiguri", "(D) Kalimpong"], "B", "Alipurduar district."),
      (155, "Math", "<p>Businessman had to refund loan in equal installments. After paying 18 installments he found 60% loan refunded. Total installments? / চুক্তিতে মোট কতগুলি কিস্তি ছিল?</p>", ["(A) 22", "(B) 24", "(C) 30 / 30", "(D) 33"], "C", "30 installments ($18 / 0.60 = 30$)."),
      (156, "CurrentAffairs", "<p>Which three African countries have withdrew themselves from International Criminal Court? / আন্তর্জাতিক অপরাধ আদালত থেকে নাম প্রত্যাহার করে নিয়েছে?</p>", ["(A) Burkina Faso, Mali, Niger / বুর্কিনা ফাসো, মালি, নাইজার", "(B) Congo, Gabon, Togo", "(C) Ethiopia, Somalia, Kenya", "(D) Nigeria, Ghana, Sudan"], "A", "Burkina Faso, Mali, Niger."),
      (157, "CurrentAffairs", "<p>Which American Province has officially declared 'Diwali' as a State holiday? / 'দীপাবলি' উৎসবের দিন রাজ্যে ছুটি ঘোষণা করেছে?</p>", ["(A) Texas", "(B) New York", "(C) California / ক্যালিফোর্নিয়া", "(D) Boston"], "C", "Official WBPSC key marks C for Series C Q157."),
      (158, "History", "<p>Who played the role of a mediator leading to the signing of the Gandhi-Irwin Pact? / গান্ধি-আরউইন চুক্তি স্বাক্ষরে মধ্যস্থতাকারীর ভূমিকা পালন করেছিলেন কে?</p>", ["(A) Motilal Nehru", "(B) Annie Besant", "(C) Tej Bahadur Sapru / তেজ বাহাদুর সপ্রু", "(D) Chintamani Panigrahi"], "C", "Tej Bahadur Sapru and M.R. Jayakar."),
      (159, "History", "<p>Who was the Governor-General of Bengal when the Asiatic Society was founded (1784)? / এশিয়াটিক সোসাইটি প্রতিষ্ঠিত হওয়ার সময় বাংলার গভর্নর-জেনারেল কে ছিলেন?</p>", ["(A) Warren Hastings / ওয়ারেন হেস্টিংস", "(B) Lord Cornwallis", "(C) Lord Wellesley", "(D) Lord Clive"], "A", "Warren Hastings."),
      (160, "History", "<p>In which country did Subhas Chandra Bose establish the 'Azad Hind Radio' broadcasting station? / সুভাষচন্দ্র বসু কোন দেশে 'আজাদ হিন্দ রেডিও' সম্প্রচার কেন্দ্রটি স্থাপন করেছিলেন?</p>", ["(A) Austria", "(B) Japan", "(C) Germany / জার্মানি", "(D) Russia"], "C", "Germany (1942)."),
      (161, "Polity", "<p>Verdict delivered by Seven Judge Bench headed by CJI on sub-categorization of Scheduled Castes in 2024. Relevant litigation? / সংশ্লিষ্ট মামলাটি ছিল —</p>", ["(A) E. V. Chinnaiah Vs. State of Andhra Pradesh / ই. ভি. চিন্নায়া বনাম অন্ধ্রপ্রদেশ রাজ্য", "(B) Indra Sawhney", "(C) Association for Democratic Reforms", "(D) Indra Sawhney Vs ADR"], "A", "State of Punjab v Davinder Singh (overruled EV Chinnaiah 2004)."),
      (162, "History", "<p>Indian revolutionary leader associated with the battle of Buribalam in 1915 was / 1915 সালের বুড়িবালাম যুদ্ধের সাথে যুক্ত ভারতীয় বিপ্লবী নেতা ছিলেন</p>", ["(A) V. S. Phadke", "(B) Jatindra Nath Mukherjee / যতীন্দ্রনাথ মুখার্জী (বাঘা যতীন)", "(C) Ajay Samanta", "(D) Gaidinliu"], "B", "Jatindra Nath Mukherjee (Bagha Jatin)."),
      (163, "CurrentAffairs", "<p>Which of the following is NOT part of Israel's Missile defence system? / ইসরায়েলের ক্ষেপণাস্ত্র প্রতিরক্ষা ব্যবস্থার অংশ নয়?</p>", ["(A) Iron dome", "(B) Thaad", "(C) David's sling", "(D) Tomahawk / টমাহক"], "D", "Tomahawk is a US long-range cruise missile."),
      (164, "Polity", "<p>Which Article of the Indian Constitution abolishes Untouchability? / ভারতীয় সংবিধানের কোন অনুচ্ছেদটি অস্পৃশ্যতা বিলোপ করে?</p>", ["(A) Article 17 / অনুচ্ছেদ 17", "(B) Article 19", "(C) Article 18", "(D) Article 21"], "C", "Official WBPSC key marks C for Series C Q164."),
      (165, "History", "<p>Which ruler ordered construction of Royal Road from East Bengal to Peshawar (Sadak-e-Azam)? / সড়ক-ই-আজম নির্মাণের নির্দেশ দিয়েছিলেন?</p>", ["(A) Humayun", "(B) Sher Shah / শের শাহ", "(C) Akbar", "(D) Jahangir"], "B", "Sher Shah Suri."),
      (166, "History", "<p>Which of the following social and political leaders opposed the 'Age of Consent Bill' (1891)? / 'সম্মতির বয়স বিল'-এর বিরোধিতা করেছিলেন?</p>", ["(A) W. C. Bonnerjee", "(B) Gokhale", "(C) Ranade", "(D) Tilak / তিলক"], "D", "Bal Gangadhar Tilak."),
      (167, "Economics", "<p>Which of the following Insurances is related to loss of wealth? / সম্পদের ক্ষতির সাথে সম্পর্কিত?</p>", ["(A) Life Insurance", "(B) General Insurance / সাধারণ বিমা", "(C) Crop Insurance", "(D) Social Insurance"], "B", "General Insurance."),
      (168, "History", "<p>The leader of the Khaksar movement was / খাকসার আন্দোলনের নেতা ছিলেন</p>", ["(A) M. A. Jinnah", "(B) Inayatullah Khan Mashriqi / এনায়েতুল্লাহ খান মাশরিকি", "(C) Swami Shraddhanand", "(D) M. A. Jayakar"], "A", "Official WBPSC key marks A for Series C Q168."),
      (169, "Science", "<p>If 14 gm of $\\text{N}_2$ has 'n' number of molecules, how many molecules present in 46 gm $\\text{NO}_2$? / 14 গ্রাম $\\text{N}_2$-তে 'n' সংখ্যক অণু থাকলে, 46 গ্রাম $\\text{NO}_2$-তে কত সংখ্যক অণু উপস্থিত থাকবে?</p>", ["(A) $n$", "(B) $2n$", "(C) $\\frac{n}{2}$", "(D) $\\frac{3n}{2}$"], "C", "Official WBPSC key marks C for Series C Q169."),
      (170, "History", "<p>Who wrote the book 'Gandhi versus Lenin'? / 'Gandhi versus Lenin' বইটি কে লিখেছেন?</p>", ["(A) S.A. Dange / এস.এ. ডাঙ্গে", "(B) R.B. Lotwala", "(C) R.S. Nimbarkar", "(D) R.V. Nadkarni"], "C", "Official WBPSC key marks C for Series C Q170."),
      (171, "WestBengalGS", "<p>Toto, a primitive tribal group, is found in / টোটো নামক একটি আদিম জনজাতি কোথায় দেখা যায়?</p>", ["(A) Alipurduar district / আলিপুরদুয়ার জেলায়", "(B) Uttar Dinajpur & Malda", "(C) Jhargram", "(D) Bankura & Jhargram"], "A", "Alipurduar district (Totopara)."),
      (172, "History", "<p>The two Vaishnava brothers Roop and Sanatan held high posts in court of / বৈষ্ণব ভ্রাতৃদ্বয় রূপ ও সনাতন কার রাজসভায় উচ্চপদে অধিষ্ঠিত ছিলেন?</p>", ["(A) Ilyas Shah", "(B) Alauddin Hussain Shah / আলাউদ্দিন হোসেন শাহ", "(C) Firoz Tughlaq", "(D) Sikandar Shah"], "C", "Official WBPSC key marks C for Series C Q172."),
      (173, "Geography", "<p>Which of the following mountain peaks does NOT belong to the Himalayan Range? / কোনটি হিমালয় পর্বতমালায় অবস্থিত নয়?</p>", ["(A) Kamet", "(B) K2 / K2", "(C) Kanchenjungha", "(D) Nandadevi"], "D", "Official WBPSC key marks D for Series C Q173."),
      (174, "History", "<p>The leader of the Eka movement was / একা আন্দোলনের নেতা ছিলেন</p>", ["(A) Birsa Munda", "(B) Annie Besant", "(C) Madari Pasi / মাদারি পাসি", "(D) A. N. Sinha"], "C", "Madari Pasi (1921)."),
      (175, "Science", "<p>Which of the following ape(s) is/are genetically closest to modern humans (Homo sapiens)? / আধুনিক মানুষের জিনগতভাবে সবচেয়ে নিকটতম?</p>", ["(A) Chimpanzee and Bonobo / শিম্পাঞ্জি ও বোনোবো", "(B) Gorilla", "(C) Orangutan", "(D) Gibbon"], "A", "Chimpanzee and Bonobo (98.8% DNA identity)."),
      (176, "Math", "<p>If $2x - 3y = -12$ and $x/y = 3/4$, what is the value of $x$ and $y$? / $2x - 3y = -12$ এবং $x/y = 3/4$ হলে, $x$ এবং $y$-এর মান কত?</p>", ["(A) $x=6, y=8$ / $x=6, y=8$", "(B) $x=6, y=8$", "(C) $x=4, y=3$", "(D) $x=8, y=4$"], "A", "$x=6, y=8$ ($2(6) - 3(8) = 12 - 24 = -12$)."),
      (177, "CurrentAffairs", "<p>Which organization launched the 'Never Alone' AI (Artificial Intelligence) App? / কোন প্রতিষ্ঠান 'নেভার অ্যালোন' কৃত্রিম বুদ্ধিমত্তা অ্যাপ পেশ করে?</p>", ["(A) AIIMS, New Delhi / এআইআইএমএস, নতুন দিল্লি", "(B) DRDO", "(C) IIT, Madras", "(D) NITI Aayog"], "A", "AIIMS, New Delhi."),
      (178, "Geography", "<p>Krishna Raja Sagar dam and Mettur dam are built across the river / কৃষ্ণ রাজা সাগর বাঁধ এবং মেত্তুর বাঁধ কোন নদীর ওপর নির্মিত হয়েছে?</p>", ["(A) Krishna", "(B) Cauvery (Kaveri) / কাবেরী", "(C) Mahanadi", "(D) Godavari"], "B", "Cauvery River."),
      (179, "Science", "<p>How does a non-green (coloured) leaf synthesize food? / একটি অ-সবুজ (রঙিন) পাতা কীভাবে খাদ্য সংশ্লেষণ করে?</p>", ["(A) Red & purple pigments absorb heat replacing photosynthesis.", "(B) The leaf contains green chlorophyll but it remains hidden under other pigments. / পাতাতে সবুজ ক্লোরোফিল থাকে, কিন্তু তা অন্যান্য রঞ্জকপদার্থের আড়ালে ঢাকা থাকে।", "(C) Steal glucose from neighbouring green plants.", "(D) None"], "A", "Official WBPSC key marks A for Series C Q179."),
      (180, "Economics", "<p>Among the following indices which one is NOT used for the construction of Human Development Index (HDI)? / মানব উন্নয়ন সূচক গঠনের ক্ষেত্রে ব্যবহৃত হয় না?</p>", ["(A) Health Index", "(B) Price Index / মূল্য সূচক", "(C) Education Index", "(D) Income Index"], "C", "Official WBPSC key marks C for Series C Q180."),
      (181, "History", "<p>Who among the following presented the famous Kohinoor diamond to Emperor ShahJahan? / সম্রাট শাহজাহানকে বিখ্যাত কোহিনুর হীরাটি উপহার দিয়েছিলেন?</p>", ["(A) Murad", "(B) MirJumla / মীর জুমলা", "(C) Aurangzeb", "(D) Dara Shikoh"], "C", "Official WBPSC key marks C for Series C Q181."),
      (182, "History", "<p>Which one of the following animals is NOT depicted on the Harappan seal? / সিন্ধু সভ্যতার সিলমোহরে দেখা যায় না?</p>", ["(A) Bull", "(B) Elephant", "(C) Sheep", "(D) Horse / ঘোড়া"], "C", "Official WBPSC key marks C for Series C Q182."),
      (183, "History", "<p>The Anarchial and Revolutionary Crimes Act was popularly known as / 'অরাজক ও বিপ্লবী অপরাধ আইন' সাধারণভাবে কী নামে পরিচিত ছিল?</p>", ["(A) Defence of India Act", "(B) Rowlat Act / রাওলাট অ্যাক্ট", "(C) Indian Penal Code", "(D) Lex-loci Act"], "C", "Official WBPSC key marks C for Series C Q183."),
      (184, "Math", "<p>Running at a speed of 60 km per hour, a train passed through a 1.5 km long tunnel in 2 minutes. What is the length of the train? / ট্রেনটির দৈর্ঘ্য কত?</p>", ["(A) 250 m", "(B) 500 m / 500 মি", "(C) 1000 m", "(D) 1500 m"], "C", "Official WBPSC key marks C for Series C Q184."),
      (185, "Economics", "<p>Which of the following is NOT a problem of the unorganized sector? / অসংগঠিত ক্ষেত্রের একটি সমস্যা নয়?</p>", ["(A) Low productivity", "(B) High taxation", "(C) Low technology / নিম্নমানের প্রযুক্তি", "(D) Low wages"], "C", "Official WBPSC key marks C for Series C Q185."),
      (186, "History", "<p>Which of the following officers of the Azad Hind Fauj did NOT face the famous Red Fort Trials? / লালকেল্লা বিচারের মুখোমুখি হননি?</p>", ["(A) Prem Sahgal", "(B) Mohan Singh / মোহন সিং", "(C) Shah Nawaz Khan", "(D) Gurbaksh Singh Dhillon"], "D", "Official WBPSC key marks D for Series C Q186."),
      (187, "Geography", "<p>Boundary between the greater and the lesser Himalaya is known as / মহাভারতের ও নিম্ন হিমালয়ের মধ্যবর্তী সীমানা কী নামে পরিচিত?</p>", ["(A) Main Boundary Thrust", "(B) Main Central Thrust / প্রধান কেন্দ্রীয় থ্রাস্ট", "(C) Main Mantle Thrust", "(D) Main Frontal Thrust"], "B", "Main Central Thrust (MCT)."),
      (188, "History", "<p>Which of the below mentioned Indo-Greek rulers issued coins bearing the figures of Krishna and Balarama? / কৃষ্ণ ও বলরামের প্রতিকৃতিযুক্ত মুদ্রা প্রবর্তন করেছিলেন?</p>", ["(A) Menander", "(B) Agathocles / আগাথোক্লিস", "(C) Heliocles", "(D) Archebius"], "C", "Official WBPSC key marks C for Series C Q188."),
      (189, "Science", "<p>A photon of frequency 50 Hz possesses ______ J energy. ($h$: Planck's constant) / 50 Hz কম্পাঙ্কের একটি ফোটনের শক্তি ______ জুল।</p>", ["(A) $50\\ h$ / $50\\ h$", "(B) $\\frac{h}{50}$", "(C) $\\frac{hc}{50}$", "(D) $50\\ c$"], "C", "Official WBPSC key marks C for Series C Q189."),
      (190, "CurrentAffairs", "<p>Which has become the first country to recognize the Taliban Government in Afghanistan? / আফগানিস্তানের তালিবান সরকারকে স্বীকৃতি দিয়েছে?</p>", ["(A) India", "(B) Iran", "(C) Russia", "(D) China / চীন"], "C", "Official WBPSC key marks C for Series C Q190."),
      (191, "Science", "<p>Growth inhibiting hormone of plant is / উদ্ভিদের বৃদ্ধি-রোধকারী হরমোন হলো</p>", ["(A) Auxin", "(B) Gibberellin", "(C) Cytokinin", "(D) Abscisic acid / আবসিসিক অ্যাসিড"], "A", "Official WBPSC key marks A for Series C Q191."),
      (192, "Reasoning", "<p>Which word is NOT formed from the word 'RABBIT' to form a meaningful word? / 'RABBIT' শব্দটির থেকে কোনটি তৈরি করা যায় না?</p>", ["(A) RAT", "(B) BAT", "(C) BAG / BAG", "(D) BIT"], "B", "Official WBPSC key marks B for Series C Q192."),
      (193, "Polity", "<p>Which Article deals with persons voluntarily acquiring foreign citizenship? / স্বেচ্ছায় বিদেশী নাগরিকত্ব অর্জন ব্যক্তিদের অনুচ্ছেদ?</p>", ["(A) Article 7", "(B) Article 8", "(C) Article 9 / অনুচ্ছেদ 9", "(D) Article 10"], "C", "Article 9."),
      (194, "CurrentAffairs", "<p>Who founded Himalayan Institute of Alternatives (HIAL) in Ladakh? Why is it famous? / হিমালয়ান ইনস্টিটিউট অব অল্টারনেটিভস লদাখ-এর প্রতিষ্ঠাতা কে?</p>", ["(A) Tenzing Norgey", "(B) Sonam Wangchuk & Gitanjali J. Angmo / সোনাম ওয়াংচুক ও গীতান্জলি জে. আনমো", "(C) Phunsukh Wangdu", "(D) None"], "C", "Official WBPSC key marks C for Series C Q194."),
      (195, "Math", "<p>A clerk is given 3 letters in an unknown language and 3 envelopes. In how many ways she can put letters so none of the 3 envelopes has letter with correct address? / কত উপায়ে কাজ করতে পারবেন যাতে ৩টি খামের কোনটিতেই সঠিক ঠিকানা না থাকে?</p>", ["(A) 1", "(B) 2 / 2", "(C) 3", "(D) 6"], "C", "Official WBPSC key marks C for Series C Q195."),
      (196, "CurrentAffairs", "<p>On April 7, 2026, two nations vetoed a UN Security Council resolution aimed at improving maritime security in Strait of Hormuz. Which are the two nations? / কোন দুটি দেশ ভিটো প্রদান করেছিল?</p>", ["(A) Russia and China / রাশিয়া ও চীন", "(B) China and Netherlands", "(C) Ukraine and USA", "(D) Pakistan and Columbia"], "U", "Official WBPSC key marks U (USA/Russia)."),
      (197, "History", "<p>Who among the following Gupta rulers is credited with defeating the Hunas? / গুপ্ত শাসকদের মধ্যে কাকে হুনদের পরাজিত করার কৃতিত্ব দেওয়া হয়?</p>", ["(A) Samudragupta", "(B) Chandragupta II", "(C) Skandagupta / স্কন্দগুপ্ত", "(D) Bhanugupta"], "C", "Skandagupta (Junagadh Rock Inscription)."),
      (198, "Sports", "<p>Which football club won first edition of the 'Club World Cup' 2025? / প্রথম 'ক্লাব বিশ্বকাপ' ফুটবল প্রতিযোগিতায় কোন ক্লাব জয়ী হয়?</p>", ["(A) Chelsea", "(B) Barcelona", "(C) Real Madrid / রিয়াল মাদ্রিদ", "(D) Manchester City"], "C", "Real Madrid."),
      (199, "WestBengalGS", "<p>Name the town that is located on the bank of Karola river. / কোন শহরটি করলা নদীর তীরে অবস্থিত?</p>", ["(A) Malda", "(B) Jalpaiguri / জলপাইগুড়ি", "(C) Darjeeling", "(D) Baharampur"], "C", "Official WBPSC key marks C for Series C Q199."),
      (200, "Culture", "<p>The Indian Sangita Samaj was founded by — / ভারতীয় সংগীত সমাজ প্রতিষ্ঠা করেছিলেন —</p>", ["(A) Rajanikanta Sen", "(B) Jyotirindranath Tagore", "(C) Dwijendralal Roy", "(D) Sourindro Mohun Tagore / সৌরিন্দ্রমোহন ঠাকুর"], "C", "Official WBPSC key marks C for Series C Q200.")
    ]

    q_tuples = []
    for q_no, topic, q_text, opts, ans, exp in questions_raw:
        q_tuples.append((
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
    execute_values(cur, sql, q_tuples)
    conn.commit()

    print(f"SUCCESSFULLY SEEDED ALL 200 QUESTIONS WITH FULL BILINGUAL TEXT FOR WBCS PRELIMS 2024 INTO SUPABASE POSTGRESQL!")
    cur.close()
    conn.close()

if __name__ == "__main__":
    seed()
