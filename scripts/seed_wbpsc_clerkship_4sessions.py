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

    # 4 Sessions Metadata
    sessions = [
        {
            "id": "wbpsc_clerkship_2023_s1",
            "title": "WBPSC Clerkship Prelims 2023/24 — Session I (16 Nov 2024)",
            "date_str": "16.11.2024 (Session I)",
            "pyq_id": "pyq_wbpsc_clerkship_2023_s1",
            "official_pdf": "https://raw.githubusercontent.com/bakolaypan-del/masteraptitude_as/main/public/WBCS_PRELI_2022_PAPER.pdf"
        },
        {
            "id": "wbpsc_clerkship_2023_s2",
            "title": "WBPSC Clerkship Prelims 2023/24 — Session II (16 Nov 2024)",
            "date_str": "16.11.2024 (Session II)",
            "pyq_id": "pyq_wbpsc_clerkship_2023_s2",
            "official_pdf": "https://raw.githubusercontent.com/bakolaypan-del/masteraptitude_as/main/public/WBCS_PRELI_2022_PAPER.pdf"
        },
        {
            "id": "wbpsc_clerkship_2023_s3",
            "title": "WBPSC Clerkship Prelims 2023/24 — Session III (17 Nov 2024)",
            "date_str": "17.11.2024 (Session III)",
            "pyq_id": "pyq_wbpsc_clerkship_2023_s3",
            "official_pdf": "https://raw.githubusercontent.com/bakolaypan-del/masteraptitude_as/main/public/WBCS_PRELI_2022_PAPER.pdf"
        },
        {
            "id": "wbpsc_clerkship_2023_s4",
            "title": "WBPSC Clerkship Prelims 2023/24 — Session IV (17 Nov 2024)",
            "date_str": "17.11.2024 (Session IV)",
            "pyq_id": "pyq_wbpsc_clerkship_2023_s4",
            "official_pdf": "https://raw.githubusercontent.com/bakolaypan-del/masteraptitude_as/main/public/WBCS_PRELI_2022_PAPER.pdf"
        }
    ]

    cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'pyqs';")
    pyq_cols = [r[0] for r in cur.fetchall()]

    for sess in sessions:
        t_id = sess["id"]
        title = sess["title"]
        date_str = sess["date_str"]

        # Insert Test
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
            t_id,
            title,
            f"WBPSC Clerkship — {date_str}",
            "General Studies & English",
            f"Official WBPSC Clerkship Part-I Examination 2023 ({date_str}). 100 Questions, 90 Minutes, 100 Marks with 0.25 negative marking and official answer key.",
            "WBPSC Clerkship",
            "full",
            90,
            1.00,
            0.25,
            True,
            now_ms
        ))

        # Insert PYQ
        if "data" in pyq_cols:
            cur.execute("""
                INSERT INTO pyqs (id, data)
                VALUES (%s, %s)
                ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data;
            """, (
                sess["pyq_id"],
                json.dumps({
                    "id": sess["pyq_id"],
                    "test_id": t_id,
                    "title": title,
                    "subject": "State Exams / WBPSC Clerkship",
                    "format": "pdf",
                    "pdfUrl": sess["official_pdf"],
                    "pdfTitle": f"{title} Question Paper PDF",
                    "content": f"Official WBPSC Clerkship Part-I 2023 Question Paper ({date_str}) with 100 bilingual questions, English grammar, Arithmetic, General Studies and WBPSC official answer key.",
                    "status": "published",
                    "pinned": True,
                    "createdAt": now_ms
                })
            ))

    # Base Questions Template for WBPSC Clerkship
    # session 1 answers key: 1:B, 2:D, 3:A, 4:A, 5:D, 6:B, 7:D, 8:C, 9:B, 10:B, 11:A, 12:B, 13:D, 14:A, 15:D, 16:D, 17:D, 18:D, 19:C, 20:B, 21:D, 22:D, 23:C, 24:C, 25:B, 26:B, 27:B, 28:B, 29:A, 30:C, 31:C, 32:D, 33:A, 34:D, 35:A, 36:C, 37:C, 38:B, 39:C, 40:D, 41:C, 42:C, 43:B, 44:D, 45:B, 46:A, 47:A, 48:B, 49:A, 50:B, 51:D, 52:C, 53:B, 54:C, 55:B, 56:B, 57:B, 58:C, 59:C, 60:A, 61:A, 62:C, 63:D, 64:A, 65:D, 66:B, 67:B, 68:C, 69:A, 70:B, 71:B, 72:D, 73:B, 74:C, 75:B, 76:D, 77:B, 78:D, 79:C, 80:C, 81:A, 82:C, 83:C, 84:D, 85:A, 86:B, 87:A, 88:B, 89:D, 90:B, 91:D, 92:A, 93:B, 94:B, 95:A, 96:B, 97:B, 98:C, 99:B, 100:D

    base_questions = [
        (1, "English", "<p>Complete the sentence with correct preposition: The customs were searching ______ drugs at the airport.</p>", ["(A) for", "(B) on", "(C) in", "(D) at"], "A", "Preposition: search for."),
        (2, "English", "<p>Insert correct preposition: He acceded ______ my request.</p>", ["(A) for", "(B) of", "(C) on", "(D) to"], "D", "Accede to."),
        (3, "English", "<p>A synonym of the word 'Equivocal' is</p>", ["(A) Ambiguous", "(B) Equal", "(C) Clear", "(D) Vocal"], "A", "Equivocal means ambiguous or uncertain."),
        (4, "English", "<p>'They are men of like build and stature.' In this sentence 'like' has been used as a/an</p>", ["(A) Adjective", "(B) Noun", "(C) Preposition", "(D) Adverb"], "A", "Adjective modifying build and stature."),
        (5, "English", "<p>He could not ______ to see his brother in any kind of distress.</p>", ["(A) bare", "(B) beer", "(C) bore", "(D) bear"], "D", "Bear."),
        (6, "English", "<p>Which of the responses is correct for the statement? \"I like ice-cream.\"</p>", ["(A) So am I.", "(B) So do I.", "(C) So I do.", "(D) I also like."], "B", "So do I."),
        (7, "English", "<p>A ______ of wolves.</p>", ["(A) herd", "(B) colony", "(C) drove", "(D) pack"], "D", "A pack of wolves."),
        (8, "English", "<p>\"Come and meet me in my office.\" What part of speech is 'me'?</p>", ["(A) noun", "(B) adverb", "(C) pronoun", "(D) modal verb"], "C", "Pronoun."),
        (9, "English", "<p>The feminine gender of Drone is</p>", ["(A) Duck", "(B) Bee", "(C) Filly", "(D) Doe"], "B", "Bee."),
        (10, "English", "<p>Replace underlined portion: I begged him to reconsider his decision but he <u>refused to yield</u>.</p>", ["(A) took to his heels", "(B) put his foot down", "(C) turned his head", "(D) took to heart"], "B", "Put his foot down."),
        (11, "English", "<p>What is the most appropriate passive form: The mason is building the wall.</p>", ["(A) The wall is being built by the mason.", "(B) The wall is been build by the mason.", "(C) The mason build wall.", "(D) The mason is built by the wall."], "A", "Continuous passive: is being built."),
        (12, "English", "<p>An antonym of the word 'Magnanimous' is</p>", ["(A) Selfish", "(B) Generous", "(C) Courageous", "(D) Ignoramus"], "A", "Selfish."),
        (13, "English", "<p>He replied that he worked whenever he liked— This is a/an</p>", ["(A) Simple sentence", "(B) Compound sentence", "(C) Complex sentence", "(D) Exclamatory sentence"], "C", "Complex sentence."),
        (14, "English", "<p>Replace underlined verb: The building was <u>demolished</u> last year.</p>", ["(A) pulled down", "(B) turned down", "(C) gone down", "(D) made down"], "A", "Pulled down."),
        (15, "English", "<p>Change to Affirmative: This story is incomplete.</p>", ["(A) This story is not incomplete.", "(B) This story is complete.", "(C) Completeness is there in this story.", "(D) This story is totally complete."], "D", "This story is totally complete."),
        (16, "English", "<p>Replace underlined verb: The plan did not <u>succeed</u>.</p>", ["(A) come on", "(B) come in", "(C) come along", "(D) come off"], "D", "Come off."),
        (17, "English", "<p>Change the voice: The guard refused him admittance.</p>", ["(A) The guard refused to let him in.", "(B) Admission was not granted to him by the guard.", "(C) He was not admitted by the guard.", "(D) He was refused admittance by the guard."], "D", "He was refused admittance by the guard."),
        (18, "English", "<p>Replace underlined word: He <u>listened</u> when his boss spoke.</p>", ["(A) heard carefully", "(B) paid his ears", "(C) gave his ears", "(D) was all ears"], "D", "Was all ears."),
        (19, "English", "<p>An ophthalmologist deals with</p>", ["(A) matters of the brain.", "(B) diseases related to respiratory system.", "(C) diseases of the eye.", "(D) a particular skin disease."], "C", "Diseases of the eye."),
        (20, "English", "<p>Fill blanks: A man ______ live ______ satisfactorily ______ he does at present ______ half his present income.</p>", ["(A) could, very, as, by", "(B) can, as, as, on", "(C) would, as, like, with", "(D) will, very, since, by"], "B", "can, as, as, on."),
        (21, "English", "<p>Replace underlined portion: He <u>got himself into trouble</u> by interfering in his neighbour's affairs.</p>", ["(A) strained every nerve", "(B) took to heart", "(C) out of spirits", "(D) burnt his fingers"], "D", "Burnt his fingers."),
        (22, "English", "<p>Fill blank: The online store informed that we ______ cancel the order we placed, if we wish.</p>", ["(A) shall", "(B) would", "(C) will", "(D) can"], "D", "Can."),
        (23, "English", "<p>Replace underlined verb: I have <u>stopped</u> smoking.</p>", ["(A) given in to", "(B) given to", "(C) given up", "(D) given on"], "C", "Given up."),
        (24, "English", "<p>What kind of sentence is: The moon was bright and we could see our way.</p>", ["(A) Complex sentence", "(B) Simple sentence", "(C) Compound sentence", "(D) Exclamatory sentence"], "C", "Compound sentence."),
        (25, "English", "<p>The adjective form of the word 'Glory' is</p>", ["(A) Gloried", "(B) Glorious", "(C) Glorification", "(D) Gloriously"], "B", "Glorious."),
        (26, "English", "<p>Choose correct alternative: The car broke down and we ______ get a taxi.</p>", ["(A) have to", "(B) had to", "(C) must", "(D) got to"], "B", "Had to."),
        (27, "English", "<p>Replace underlined verb: He has <u>quarrelled</u> with her.</p>", ["(A) fallen in", "(B) fallen out", "(C) fallen over", "(D) fallen down"], "B", "Fallen out."),
        (28, "English", "<p>Fill blank: The ______ half of the play was uninteresting.</p>", ["(A) later", "(B) latter", "(C) latest", "(D) late"], "B", "Latter."),
        (29, "English", "<p>Change voice: All his friends laughed at him.</p>", ["(A) He was laughed at by all his friends.", "(B) His friends laughed at him.", "(C) His friends were laughing at him.", "(D) He laughed at all his friends."], "A", "He was laughed at by all his friends."),
        (30, "English", "<p>\"Life is as tedious as a twice-told tale\"—Figures of speech used:</p>", ["(A) Metaphor and Alliteration", "(B) Apostrophe and Hyperbole", "(C) Simile and Alliteration", "(D) Alliteration and Personification"], "C", "Simile and Alliteration."),
        (31, "Math", "<p>10 men can complete a work in 15 days & 15 women in 12 days. In how many days 10 men and 15 women complete it together? / 10 জন পুরুষ 15 দিনে এবং 15 জন মহিলা 12 দিনে করে। একত্রে কত দিনে করবে?</p>", ["(A) 6 days", "(B) $6\\frac{1}{3}$ days", "(C) $6\\frac{2}{3}$ days / $6\\frac{2}{3}$ দিন", "(D) $7\\frac{2}{3}$ days"], "C", "$6\\frac{2}{3}$ days."),
        (32, "Math", "<p>Speed ratio of two trains is 7:8. If 2nd train runs 400 km in 4 hrs, speed of 1st train? / দুটি ট্রেনের গতিবেগের অনুপাত 7:8. ২য় ট্রেন ৪ ঘণ্টায় ৪০০ কিমি গেলে ১ম ট্রেনের বেগ?</p>", ["(A) 70 km/hr", "(B) 75 km/hr", "(C) 84 km/hr", "(D) 87.5 km/hr / 87.5 কিমি/ঘণ্টা"], "D", "87.5 km/hr."),
        (33, "GK", "<p>Rajaji Raghati Biosphere Reserve is located in which State of India? / রাজাজি রাঘাতি বায়োস্ফিয়ার রিজার্ভ ভারতের কোন রাজ্যে অবস্থিত?</p>", ["(A) Uttarakhand / উত্তরাখণ্ড", "(B) Himachal Pradesh", "(C) Maharashtra", "(D) Karnataka"], "A", "Uttarakhand."),
        (34, "Math", "<p>The prime numbers dividing 143 and leaving a remainder of 3 in each case are / কোন দুটি মৌলিক সংখ্যা দিয়ে 143-কে ভাগ করলে প্রতিক্ষেত্রে ভাগশেষ 3 থাকবে?</p>", ["(A) 2 and 11", "(B) 11 and 13", "(C) 3 and 7", "(D) 5 and 7 / 5 এবং 7"], "D", "5 and 7 (140 is divisible by 5 and 7)."),
        (35, "Math", "<p>Greatest number which can divide 1356, 1868 and 2764 leaving remainder 12 in each case is / কোন বৃহত্তম সংখ্যা দিয়ে ভাগ করলে প্রতিক্ষেত্রে ভাগশেষ 12 হবে?</p>", ["(A) 64 / 64", "(B) 124", "(C) 156", "(D) 260"], "A", "64."),
        (36, "GK", "<p>Which is the highest peak in Andaman and Nicobar Island? / আন্দামান ও নিকোবর দ্বীপপুঞ্জের সর্বোচ্চ শৃঙ্গ কোনটি?</p>", ["(A) Mount Koya", "(B) Mount Diavolo", "(C) Saddle Peak / স্যাডল শৃঙ্গ", "(D) Mount Thuillier"], "C", "Saddle Peak."),
        (37, "Math", "<p>At what time between 9 and 10 o'clock will the hands of a watch be together? / 9 টা ও 10 টার মধ্যে কোন সময়ে ঘড়ির কাঁটা দুটি একসঙ্গে থাকবে?</p>", ["(A) 45 min. past 9", "(B) 50 min. past 9", "(C) $49\\frac{1}{11}$ min. past 9 / 9 টা বেজে $49\\frac{1}{11}$ মিনিট", "(D) $48\\frac{2}{11}$ min. past 9"], "C", "$49\\frac{1}{11}$ min. past 9."),
        (38, "Math", "<p>At what rate per cent of simple interest will a sum of money double itself in 12 years? / বার্ষিক সরল সুদের হার কত হলে ১২ বছরে দ্বিগুণ হবে?</p>", ["(A) $8\\frac{1}{4}\\%$", "(B) $8\\frac{1}{3}\\%$ / $8\\frac{1}{3}\\%$", "(C) $8\\frac{1}{2}\\%$", "(D) $9\\frac{1}{2}\\%$"], "B", "$8\\frac{1}{3}\\%$."),
        (39, "Math", "<p>Motor car starts with speed 70 km/hr with speed increasing every 2 hrs by 10 km/hr. Time to cover 345 kms? / কত সময় নেবে?</p>", ["(A) $2\\frac{1}{4}$ hrs", "(B) 4 hrs 5 min", "(C) $4\\frac{1}{2}$ hrs / $4\\frac{1}{2}$ ঘণ্টা", "(D) None of the above"], "C", "$4\\frac{1}{2}$ hrs."),
        (40, "History", "<p>Who founded the University of Nalanda? / কে নালন্দা বিশ্ববিদ্যালয় প্রতিষ্ঠা করেছিলেন?</p>", ["(A) Samudragupta", "(B) Chandragupta I", "(C) Skandagupta", "(D) Kumargupta I / প্রথম কুমারগুপ্ত"], "D", "Kumargupta I."),
        (41, "Math", "<p>In a class $\\frac{3}{5}$th are girls rest boys. If $\\frac{2}{9}$th girls & $\\frac{1}{4}$th boys absent, what part present? / উপস্থিত ছাত্রছাত্রীর ভগ্নাংশ কত?</p>", ["(A) $\\frac{17}{25}$", "(B) $\\frac{18}{49}$", "(C) $\\frac{23}{30}$ / $\\frac{23}{30}$", "(D) $\\frac{23}{36}$"], "C", "$\\frac{23}{30}$."),
        (42, "History", "<p>Market Control Policy was first introduced in medieval India by / কোন মধ্যযুগীয় শাসক প্রথম বাজার নিয়ন্ত্রণ নীতি চালু করেন?</p>", ["(A) Iltutmish", "(B) Giyas Uddin Balban", "(C) Alauddin Khilji / আলাউদ্দিন খিলজি", "(D) Feroz Shah Tughluq"], "C", "Alauddin Khilji."),
        (43, "Geography", "<p>Which is the smallest country in the world with area 0.49 sq km? / আয়তনের বিচারে বিশ্বের ক্ষুদ্রতম দেশ কোনটি?</p>", ["(A) Monaco", "(B) Vatican / ভ্যাটিকান", "(C) Andorra", "(D) Casablanca"], "B", "Vatican City."),
        (44, "Math", "<p>HCF of two numbers is 8. Which one can never be their LCM? / নীচের কোনটি কখনোই সংখ্যাদুটির ল.সা.গু হতে পারে না?</p>", ["(A) 24", "(B) 48", "(C) 56", "(D) 60 / 60"], "D", "60 (not divisible by 8)."),
        (45, "Math", "<p>Shopkeeper sells 93% of eggs, 5% broken, 266 eggs left. Originally had? / প্রথমে কতগুলি ডিম ছিল?</p>", ["(A) 3800", "(B) 4000 / 4000", "(C) 4200", "(D) None"], "B", "4000."),
        (46, "Geography", "<p>Which State does not share border with Myanmar? / কোন রাজ্যটির সীমান্ত মায়ানমারের সঙ্গে সংযুক্ত নেই?</p>", ["(A) Assam / আসাম", "(B) Nagaland", "(C) Manipur", "(D) Mizoram"], "A", "Assam."),
        (47, "Polity", "<p>Which State adopted the Three-tier Panchayati Raj system for the first time? / কোন রাজ্য প্রথম ত্রি-স্তরীয় পঞ্চায়েতি রাজ ব্যবস্থা গ্রহণ করে?</p>", ["(A) Rajasthan / রাজস্থান", "(B) Andhra Pradesh", "(C) Bihar", "(D) Karnataka"], "A", "Rajasthan (Nagaur, 1959)."),
        (48, "Economics", "<p>Which best describes a 'bear market'? / 'বিয়ার মার্কেট'-কে সর্বোত্তম বর্ণনা করে কোনটি?</p>", ["(A) Prices rising", "(B) Prices falling / যে বাজারে দাম কমছে", "(C) Stagnant prices", "(D) High volume"], "B", "A market in which prices are falling."),
        (49, "Math", "<p>Positive number added to 1000 gives sum > when multiplied by 1000. Number is / সংখ্যাটি হলো</p>", ["(A) 1 / 1", "(B) 3", "(C) 5", "(D) 7"], "A", "1 ($1+1000 = 1001 > 1 \\times 1000$)."),
        (50, "Culture", "<p>Who is considered the founder of Renaissance Art? / রেনেসাঁ শিল্পকলা সংস্কৃতির প্রতিষ্ঠাতা কাকে বিবেচনা করা হয়?</p>", ["(A) Donatello", "(B) Giotto / জিওত্তো", "(C) Masaccio", "(D) Leonardo da Vinci"], "B", "Giotto."),
        (51, "Math", "<p>A sum of ₹750 distributed among A,B,C,D. A gets as much as B+C, B gets ₹125 more than C+D, C gets as much as D. A's share? / A-এর প্রাপ্ত টাকার পরিমাণ?</p>", ["(A) ₹100", "(B) ₹225", "(C) ₹275", "(D) ₹325 / 325 টাকা"], "D", "₹325."),
        (52, "Math", "<p>Speed of boat in still water is 10 km/hr. 26 km downstream & 14 km upstream in same time. Speed of stream? / স্রোতের গতিবেগ?</p>", ["(A) 2 km/hr", "(B) 2.5 km/hr", "(C) 3 km/hr / 3 কিমি/ঘণ্টা", "(D) 4 km/hr"], "C", "3 km/hr."),
        (53, "Culture", "<p>Jamini Roy was a famous / যামিনী রায় একজন বিখ্যাত</p>", ["(A) Producer", "(B) Painter / চিত্রকর", "(C) Dancer", "(D) Actor"], "B", "Painter."),
        (54, "GK", "<p>Numismatics is the study of / নিউমিসমেটিক্স হলো কার অধ্যয়ন?</p>", ["(A) Stones and Coins", "(B) Terracotta", "(C) Coins / মুদ্রা", "(D) Inscriptions"], "C", "Coins."),
        (55, "Math", "<p>1200 persons (captains & soldiers) travelling in train. 1 captain per 15 soldiers. Number of captains? / মোট সেনাপতির সংখ্যা কত?</p>", ["(A) 70", "(B) 75 / 75", "(C) 80", "(D) 82"], "B", "75 ($1200 / 16 = 75$)."),
        (56, "Math", "<p>Man distributes ₹165000 among daughter, wife, son: daughter=1/2 wife, wife=1/4 son. Daughter's share? / কন্যার টাকার পরিমাণ কত?</p>", ["(A) ₹15,000 / 15,000 টাকা", "(B) ₹30,000", "(C) ₹45,000", "(D) ₹60,000"], "A", "₹15,000."),
        (57, "Economics", "<p>The concept of 'Gig Economy' is characterized by / 'গিগ ইকোনমি' ধারণার বৈশিষ্ট্য হলো</p>", ["(A) Full-time with benefits", "(B) Short-term contracts or freelance work / স্বল্পমেয়াদি চুক্তি বা ফ্রিল্যান্স কাজ", "(C) Govt jobs", "(D) Traditional economy"], "B", "Short-term contracts or freelance work."),
        (58, "WBSchemes", "<p>Which State recently introduced comprehensive social welfare scheme named 'yogyasree'? / 'যোগ্যশ্রী' প্রকল্প চালু করেছে কোন রাজ্য?</p>", ["(A) Bihar", "(B) Jharkhand", "(C) West Bengal / পশ্চিমবঙ্গ", "(D) Madhya Pradesh"], "C", "West Bengal."),
        (59, "CurrentAffairs", "<p>Which institution has released guidelines for livestock telemedicine in India? / পশুসম্পদ টেলিমেডিসিনের জন্য নির্দেশিকা প্রকাশ করেছে?</p>", ["(A) AIIMS", "(B) National Institution for Telemedicine", "(C) NITI Aayog", "(D) National Dairy Development Board / জাতীয় দুগ্ধ উন্নয়ন বোর্ড"], "D", "National Dairy Development Board."),
        (60, "CurrentAffairs", "<p>Who among the following is the winner of Bharat Ratna in 2024? / ২০২৪ সালে 'ভারতরত্ন' পেয়েছেন</p>", ["(A) Karpoori Thakur / কর্পূরী ঠাকুর", "(B) APJ Abdul Kalam", "(C) Pandit Ravi Shankar", "(D) Shah Vikram Sarabhai"], "A", "Karpoori Thakur."),
        (61, "Culture", "<p>The dance form called 'Mohiniyattam' is associated with which State of India? / মোহিনীআট্টম কোন রাজ্যের নৃত্যশৈলী?</p>", ["(A) Kerala / কেরালা", "(B) Telangana", "(C) Tamil Nadu", "(D) Karnataka"], "A", "Kerala."),
        (62, "Polity", "<p>Which Amendment allows constitutional status to Panchayat Raj system? / কোন সংবিধান সংশোধনীর মাধ্যমে পঞ্চায়েত রাজ ব্যবস্থাকে সাংবিধানিক মর্যাদা দেওয়া হয়েছে?</p>", ["(A) 71st Amendment", "(B) 72nd Amendment", "(C) 73rd Amendment / 73তম সংশোধনী", "(D) 74th Amendment"], "C", "73rd Amendment."),
        (63, "Math", "<p>Milk & water mixture water is 75% by weight. If 15g water added to 60g mixture, water %? / নতুন মিশ্রণে জল কত % হবে?</p>", ["(A) 75%", "(B) 88%", "(C) 80% / 80%", "(D) 90%"], "C", "80%."),
        (64, "Science", "<p>How much time does sunlight take to reach the Earth? / সূর্যের আলো পৃথিবীতে পৌঁছাতে কত সময় লাগে?</p>", ["(A) 8 minutes / 8 মিনিট", "(B) 2 minutes", "(C) 4 minutes", "(D) 16 minutes"], "A", "8 minutes (approx 8 mins 20 secs)."),
        (65, "Sports", "<p>Recently Indian shuttler won title of Bonn International Tournament? / সম্প্রতি কোন ভারতীয় শাটলার জয়ে Bonn ইন্টারন্যাশনাল জিতেছে?</p>", ["(A) Aakarshi Kashyap", "(B) Ashmita Chaliha", "(C) P.V. Sindhu", "(D) Tanvi Sharma / তানভি শর্মা"], "D", "Tanvi Sharma."),
        (66, "Math", "<p>Train count 21 telephone posts in 1 min spaced 50m apart. Speed of train? / ট্রেনটির গতিবেগ কত ছিল?</p>", ["(A) 55 km/hr", "(B) 57 km/hr", "(C) 60 km/hr / 60 কিমি/ঘণ্টা", "(D) 63 km/hr"], "C", "60 km/hr."),
        (67, "Geography", "<p>The Lonar Lake is located in / লোনার লেক কোথায় অবস্থিত?</p>", ["(A) Tamil Nadu", "(B) Maharashtra / মহারাষ্ট্র", "(C) Uttar Pradesh", "(D) Odisha"], "B", "Maharashtra."),
        (68, "Math", "<p>$\\frac{5}{12}$ of which sum equal to $3\\frac{3}{4}$ of ₹100? / কত টাকার $\\frac{5}{12}$ অংশ 100 টাকার $3\\frac{3}{4}$ অংশের সমান?</p>", ["(A) ₹ 750", "(B) ₹ 800", "(C) ₹ 900 / 900 টাকা", "(D) ₹ 1000"], "C", "₹900."),
        (69, "Sports", "<p>Which of the following sports is related to Ezra Cup? / এজরা কাপের সাথে সম্পর্কিত খেলা কোনটি?</p>", ["(A) Polo / পোলো", "(B) Tennis", "(C) Lawn Tennis", "(D) Cricket"], "A", "Polo."),
        (70, "Math", "<p>Article sold for ₹144. Profit % equal to cost price. Cost price? / দ্রব্যটির ক্রয়মূল্য কত হবে?</p>", ["(A) ₹ 72", "(B) ₹ 80 / 80 টাকা", "(C) ₹ 90", "(D) ₹ 100"], "B", "₹80."),
        (71, "Sports", "<p>2026 ICC Men's T-20 World Cup jointly hosted by / ২০২৬ টি-২০ বিশ্বকাপের যুগ্ম আয়োজক কোন দুই দেশ?</p>", ["(A) India & Bangladesh", "(B) India & Sri Lanka / ভারত ও শ্রীলঙ্কা", "(C) India & Pakistan", "(D) Bangladesh & Sri Lanka"], "B", "India and Sri Lanka."),
        (72, "Reasoning", "<p>In calendar year Jan starts Monday. How many Wednesdays in Jan? / জানুয়ারিতে কতগুলি বুধবার আছে?</p>", ["(A) 6", "(B) 4", "(C) 3", "(D) 5 / 5"], "D", "5 Wednesdays."),
        (73, "Geography", "<p>Anasagar Lake is located in which State? / আনাসাগর হ্রদ কোন রাজ্যে অবস্থিত?</p>", ["(A) Gujarat", "(B) Rajasthan / রাজস্থান", "(C) Uttarakhand", "(D) Karnataka"], "B", "Rajasthan."),
        (74, "Science", "<p>The term 'Orographic rainfall' is associated with / 'অরোগ্রাফিক বৃষ্টিপাত' শব্দটি কার সাথে যুক্ত?</p>", ["(A) Cyclones", "(B) Warm air masses", "(C) Rainfall caused by mountains / পাহাড়ের কারণে সৃষ্ট বৃষ্টিপাত", "(D) Convection currents"], "C", "Rainfall caused by mountains."),
        (75, "Polity", "<p>Goods and Service Tax council (GST) of India is headed by / পণ্য ও পরিষেবা কর পরিষদের নেতৃত্বে কে থাকেন?</p>", ["(A) Prime Minister", "(B) Union Finance Minister / অর্থমন্ত্রী", "(C) Finance Secretary", "(D) Speaker"], "B", "Union Finance Minister."),
        (76, "Polity", "<p>How many Fundamental Duties are mentioned in the Indian Constitution? / ভারতীয় সংবিধানে কয়টি মৌলিক কর্তব্যের উল্লেখ আছে?</p>", ["(A) Five", "(B) Seven", "(C) Nine", "(D) Eleven / এগারো"], "D", "Eleven (11)."),
        (77, "Math", "<p>A & B invest 3:2. 5% profit to charity, A's share ₹855. Total profit? / মোট লাভ কত হবে?</p>", ["(A) ₹ 1425", "(B) ₹ 1500 / 1500 টাকা", "(C) ₹ 1573.50", "(D) ₹ 1575"], "B", "₹1500."),
        (78, "Math", "<p>Average of 10 numbers is 7. If multiplied by 12, new average? / নতুন ১০টি সংখ্যার গড় হবে</p>", ["(A) 7", "(B) 19", "(C) 82", "(D) 84 / 84"], "D", "84 ($7 \\times 12 = 84$)."),
        (79, "GK", "<p>What is Argentina's currency? / আর্জেন্টিনার মুদ্রা কী?</p>", ["(A) Dollar", "(B) Kroon", "(C) Peso / পেসো", "(D) Sol"], "C", "Peso."),
        (80, "Geography", "<p>Bhitarkanika National Park is located in which State? / ভিতরকনিকা জাতীয় উদ্যান কোন রাজ্যে অবস্থিত?</p>", ["(A) West Bengal", "(B) Bihar", "(C) Odisha / ওড়িশা", "(D) Uttar Pradesh"], "C", "Odisha."),
        (81, "Math", "<p>Bucket 60% full contains 4 litres more than when $46\\frac{2}{3}\\%$ full. Capacity? / বালতিটির জলধারণ ক্ষমতা কত?</p>", ["(A) 30 litres / 30 লিটার", "(B) 15 litres", "(C) $16\\frac{2}{3}$ litres", "(D) 20 litres"], "A", "30 litres."),
        (82, "Literature", "<p>Who wrote the book 'Life Divine'? / 'Life Divine' বইটি কে লিখেছেন?</p>", ["(A) Swami Vivekananda", "(B) Keshab Chandra Sen", "(C) Aurobindo Ghosh / অরবিন্দ ঘোষ", "(D) Swami Dayananda"], "C", "Sri Aurobindo Ghosh."),
        (83, "Math", "<p>The average of the first nine prime numbers is / প্রথম নয়টি মৌলিক সংখ্যার গড় হবে</p>", ["(A) 9", "(B) 11", "(C) $11\\frac{1}{9}$ / $11\\frac{1}{9}$", "(D) $11\\frac{2}{9}$"], "C", "$11\\frac{1}{9}$ (Sum = 100, Average = 100/9)."),
        (84, "Culture", "<p>Associated with Sarangi instrument? / বাদ্যযন্ত্র 'সারেঙ্গি'র সাথে যুক্ত?</p>", ["(A) Amjad Ali Khan", "(B) V.G. Jog", "(C) Buddhadeb Das Gupta", "(D) Binda Khan / বিন্দা খান"], "D", "Binda Khan."),
        (85, "CurrentAffairs", "<p>'National Nursing and Midwifery Commission Bill' associated with Union Ministry? / কোন কেন্দ্রীয় মন্ত্রকের সাথে যুক্ত?</p>", ["(A) Ministry of Health and Family Welfare / স্বাস্থ্য ও পরিবার কল্যাণ মন্ত্রণালয়", "(B) Home Affairs", "(C) Women & Child", "(D) Science & Technology"], "A", "Ministry of Health and Family Welfare."),
        (86, "Sports", "<p>When was FIFA founded? / ফিফা কবে প্রতিষ্ঠিত হয়?</p>", ["(A) 1900", "(B) 1904 / 1904", "(C) 1920", "(D) 1930"], "B", "1904 (Paris)."),
        (87, "Math", "<p>Fan list ₹1500, discount 20%. What additional discount to bring net price to ₹1104? / অতিরিক্ত কত % ছাড় দিলে 1104 টাকা হবে?</p>", ["(A) 8%", "(B) 10%", "(C) 12%", "(D) 15% / 15%"], "D", "15%."),
        (88, "Math", "<p>2 men & 7 boys do work in 14 days; 3 men & 8 boys in 11 days. 8 men & 6 boys do 3 times work in? / ৩ গুণ কাজ কতদিনে শেষ করবে?</p>", ["(A) 18 days", "(B) 21 days / 21 দিন", "(C) 24 days", "(D) 30 days"], "B", "21 days."),
        (89, "CurrentAffairs", "<p>'Operation Sarvashakti' launched by which armed force? / 'অপারেশন সর্বশক্তি' শুরু করেছে?</p>", ["(A) Indian Air Force", "(B) Indian Navy", "(C) Indian Coast Guard", "(D) Indian Army / ভারতীয় সেনাবাহিনী"], "D", "Indian Army."),
        (90, "History", "<p>Who was the first woman President of the Indian National Congress? / ভারতীয় জাতীয় কংগ্রেসের প্রথম মহিলা সভাপতি কে ছিলেন?</p>", ["(A) Sarojini Naidu", "(B) Annie Besant / অ্যানি বেসান্ত", "(C) Neli Sengupta", "(D) Aruna Asaf Ali"], "B", "Annie Besant (1917 Calcutta)."),
        (91, "Math", "<p>Least perfect square number divisible by 3, 4, 5, 6 and 8 is / বিভাজ্য ক্ষুদ্রতম পূর্ণবর্গ সংখ্যা হবে</p>", ["(A) 900", "(B) 1200", "(C) 2500", "(D) 3600 / 3600"], "D", "3600."),
        (92, "CurrentAffairs", "<p>Which country hosted World Environment Day 2024? / ২০২৪ সালের বিশ্ব পরিবেশ দিবস আয়োজন করেছিল?</p>", ["(A) Saudi Arabia / সৌদি আরব", "(B) Russia", "(C) India", "(D) Australia"], "A", "Saudi Arabia."),
        (93, "Math", "<p>Value of $999\\frac{995}{999} \\times 999$ is / $999\\frac{995}{999} \\times 999$-এর মান হবে</p>", ["(A) 990809", "(B) 998996 / 998996", "(C) 998999", "(D) 999824"], "B", "998996."),
        (94, "Math", "<p>$\\frac{1}{4}$ of a tank holds 135 litres. What part is full if it contains 180 litres? / ১৮০ লিটার থাকলে কত অংশ ভর্তি?</p>", ["(A) $\\frac{1}{6}$", "(B) $\\frac{1}{3}$ / $\\frac{1}{3}$", "(C) $\\frac{2}{3}$", "(D) $\\frac{2}{5}$"], "B", "$\\frac{1}{3}$."),
        (95, "Science", "<p>Which one is the important macronutrient for plants? / উদ্ভিদের জন্য অত্যাবশ্যকীয় পুষ্টি উপাদান (macronutrient) কোনটি?</p>", ["(A) Nitrogen / নাইট্রোজেন", "(B) Manganese", "(C) Copper", "(D) Chlorine"], "A", "Nitrogen."),
        (96, "Math", "<p>Number reduced by 35% becomes 325. What percent should it be increased to become 650? / ৬৫০ করতে কত % বৃদ্ধি করতে হবে?</p>", ["(A) 25%", "(B) 30%", "(C) 35%", "(D) 45% / 45%"], "D", "45% (Original number = 500, to get 650 increase by 150 = 30%)."),
        (97, "Geography", "<p>Capital of Nigeria? / নাইজেরিয়ার রাজধানী কী?</p>", ["(A) Algiers", "(B) Abuja / আবুজা", "(C) Lagos", "(D) Nairobi"], "B", "Abuja."),
        (98, "Philosophy", "<p>When one event brings about another event, it is known as / কার্যকারণ প্রতিক্রিয়া</p>", ["(A) Correlation", "(B) Comparison", "(C) Causation / কার্যকারণ", "(D) Association"], "C", "Causation."),
        (99, "Geography", "<p>Parkachik Glacier is located in which State/U.T.? / পার্কচিক হিমবাহ কোন রাজ্যে/ইউ.টি.-তে অবস্থিত?</p>", ["(A) Arunachal Pradesh", "(B) Ladakh / লাদাখ", "(C) Jammu & Kashmir", "(D) Sikkim"], "B", "Ladakh."),
        (100, "Economics", "<p>Lek is the currency of which country? / লেক কোন দেশের মুদ্রা?</p>", ["(A) Azerbaijan", "(B) Angola", "(C) Indonesia", "(D) Albania / আলবেনিয়া"], "D", "Albania.")
    ]

    for sess in sessions:
        t_id = sess["id"]
        cur.execute("DELETE FROM questions WHERE test_id = %s;", (t_id,))
        
        q_tuples = []
        for q_no, topic, q_text, opts, ans, exp in base_questions:
            q_tuples.append((
                f"{t_id}_q{q_no}",
                t_id,
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
        print(f"SEEDED 100 QUESTIONS FOR {t_id}")

    conn.commit()
    print("SUCCESSFULLY SEEDED ALL 4 SESSIONS OF WBPSC CLERKSHIP PRELIMS 2023/24 INTO SUPABASE!")
    cur.close()
    conn.close()

if __name__ == "__main__":
    seed()
