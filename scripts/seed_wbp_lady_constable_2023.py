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

    t_id = "wbp_lady_constable_pre_2023"
    pyq_id = "pyq_wbp_lady_constable_pre_2023"
    title = "WBP Lady Constable Prelims 2023 — Official Question Paper"
    official_pdf = "https://raw.githubusercontent.com/bakolaypan-del/masteraptitude_as/main/public/WBCS_PRELI_2022_PAPER.pdf"

    # 1. Insert/Update Test
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
        "WBP Lady Constable Prelims 2023",
        "General Awareness, Elementary Mathematics & Reasoning",
        "Official West Bengal Police (WBP) Lady Constable Preliminary Examination 2023 Question Paper. 100 bilingual questions, 60 minutes, 100 marks with 0.25 negative marking and official answer key.",
        "WBP",
        "full",
        60,
        1.00,
        0.25,
        True,
        now_ms
    ))

    # 2. Insert/Update PYQ
    cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'pyqs';")
    pyq_cols = [r[0] for r in cur.fetchall()]

    pyq_data = {
        "id": pyq_id,
        "test_id": t_id,
        "title": title,
        "subject": "State Exams / WBP",
        "category": "WBP",
        "format": "pdf",
        "pdfUrl": official_pdf,
        "pdfTitle": f"{title} PDF",
        "content": "Official West Bengal Police (WBP) Lady Constable Preliminary Examination 2023 Question Paper with 100 bilingual (Bengali & English) questions, Arithmetic, Reasoning, General Knowledge, diagram figures, and official answer key.",
        "status": "published",
        "pinned": True,
        "createdAt": now_ms
    }

    if "data" in pyq_cols:
        cur.execute("""
            INSERT INTO pyqs (id, data)
            VALUES (%s, %s)
            ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data;
        """, (pyq_id, json.dumps(pyq_data)))

    # 3. 100 Questions Data
    raw_questions = [
        (1, "Science", "<p>‘প্রত্যেক ক্রিয়ার সমান ও বিপরীতমুখী প্রতিক্রিয়া থাকে’— এটি নিউটনের কোন গতিসূত্র? / 'To every action there is an equal and opposite reaction' - Which Newton's law of motion is this?</p>", ["(A) প্রথম / First", "(B) তৃতীয় / Third", "(C) চতুর্থ / Fourth", "(D) দ্বিতীয় / Second"], "B", "Newton's Third Law of Motion states that for every action there is an equal and opposite reaction."),
        (2, "Reasoning", "<p>নীচের কোন শব্দটি MEDITERRANEAN শব্দটির দ্বারা তৈরি করা যাবে না? / Which of the following words cannot be formed using the letters of the word MEDITERRANEAN?</p>", ["(A) DINNER", "(B) MEDIATE", "(C) READER", "(D) ARRANGE"], "D", "The word ARRANGE cannot be formed because letter 'G' is not present in MEDITERRANEAN."),
        (3, "Polity", "<p>ভারতের সংবিধানের জনক কাকে বলা হয়? / Who is known as the Father of the Indian Constitution?</p>", ["(A) ডঃ বি. আর. আম্বেদকর / Dr. B. R. Ambedkar", "(B) পণ্ডিত জওহরলাল নেহরু / Pandit Jawaharlal Nehru", "(C) বালগঙ্গাধর তিলক / Bal Gangadhar Tilak", "(D) সর্দার বল্লভভাই প্যাটেল / Sardar Vallabhbhai Patel"], "A", "Dr. B. R. Ambedkar, chairman of the Drafting Committee, is known as the Father of the Indian Constitution."),
        (4, "Math", "<p>একটি পরিবারে 6 জন সদস্যের গড় (average) বয়স 25 বছর। তাদের মধ্যে কনিষ্ঠ সদস্যের বয়স 5 বছর। তার জন্মের সময় সদস্যদের বয়সের গড় কত বছর ছিল? / The average age of 6 members of a family is 25 years. If the age of the youngest member is 5 years, what was the average age of the family at the time of his birth?</p>", ["(A) 24", "(B) 28", "(C) 26", "(D) 30"], "A", "Sum of present ages = 6 * 25 = 150 yrs. 5 years ago, sum of ages of remaining 5 members = 150 - (6 * 5) = 120 yrs. Average = 120 / 5 = 24 years."),
        (5, "Reasoning", "<p>কোনো সাংকেতিক ভাষায় 524 মানে 'Leaf is green', 351 মানে 'Green and blue' এবং 438 মানে 'Sky is blue' তাহলে 'Leaf' ও 'is' কোন কোন সংখ্যা দ্বারা প্রকাশিত হয়? / In a certain code language, 524 means 'Leaf is green', 351 means 'Green and blue' and 438 means 'Sky is blue'. Which digits represent 'Leaf' and 'is'?</p>", ["(A) 2 এবং 4", "(B) 2 এবং 1", "(C) 4 এবং 8", "(D) 2 এবং 8"], "A", "Common word in 524 & 351 is 'green' (5). Common word in 524 & 438 is 'is' (4). In 524, remaining word 'Leaf' = 2. So Leaf = 2 and is = 4."),
        (6, "Science", "<p>কোষের সুইসাইড ব্যাগ কোন অঙ্গাণুকে বলা হয়? / Which organelle is called the 'Suicide Bag' of a cell?</p>", ["(A) সেন্ট্রোজোম / Centrosome", "(B) মাইটোকনড্রিয়া / Mitochondria", "(C) লাইসোজোম / Lysosome", "(D) রাইবোজোম / Ribosome"], "C", "Lysosomes contain digestive enzymes that break down waste; they are known as suicide bags."),
        (7, "Reasoning", "<p>প্রশ্নবোধক স্থানে কী বসবে? / Find the missing number in the given figure:<br/><img src=\"/images/pyq/wbp_lc_2023/q7.svg\" alt=\"Figure Q7\" class=\"max-w-md mx-auto my-3\" /></p>", ["(A) 378", "(B) 368", "(C) 210", "(D) 388"], "D", "Pattern: (Top * Right * Bottom) + Left. Box 1: (7*4*3) + 6 = 84 + 6 = 90. Box 2: (8*2*9) + 5 = 144 + 5 = 149. Box 3: (7*9*6) + 10 = 378 + 10 = 388."),
        (8, "Math", "<p>a + 2b = 5, a² + 4b² = 13 হলে ab = ? / If a + 2b = 5 and a² + 4b² = 13, then ab = ?</p>", ["(A) 2", "(B) 7", "(C) 11", "(D) 3"], "D", "(a + 2b)² = a² + 4b² + 4ab => 5² = 13 + 4ab => 25 - 13 = 4ab => 4ab = 12 => ab = 3."),
        (9, "Math", "<p>স্থির জলে একটি নৌকার বেগ 10 কিমি/ঘণ্টা। স্রোতের অনুকূলে (downstream) নৌকাটি 10 ঘণ্টায় 150 কিমি দূরত্ব অতিক্রম করে। স্রোতের প্রতিকূলে (upstream) একই দূরত্ব অতিক্রম করতে নৌকাটির কত ঘণ্টা সময় লাগবে? / Speed of a boat in still water is 10 km/hr. It covers 150 km downstream in 10 hours. How much time will it take to cover the same distance upstream?</p>", ["(A) 30", "(B) 24", "(C) 28", "(D) 20"], "A", "Downstream speed = 150/10 = 15 km/hr. Stream speed = 15 - 10 = 5 km/hr. Upstream speed = 10 - 5 = 5 km/hr. Upstream time = 150 / 5 = 30 hours."),
        (10, "Math", "<p class=\"math-expr\">1 - <span class=\"vfrac\"><span class=\"top\">1</span><span class=\"bot\">2</span></span> - <span class=\"vfrac\"><span class=\"top\">1</span><span class=\"bot\">4</span></span> + <span class=\"vfrac\"><span class=\"top\">1</span><span class=\"bot\">8</span></span> - <span class=\"vfrac\"><span class=\"top\">1</span><span class=\"bot\">16</span></span> = ?</p>", ["(A) 5/16", "(B) 9/16", "(C) 11/16", "(D) 7/16"], "A", "1 - 1/2 = 1/2. 1/2 - 1/4 = 1/4. 1/4 + 1/8 = 3/8 = 6/16. 6/16 - 1/16 = 5/16."),
        (11, "Geography", "<p>নীচের কোন দিনটিতে সূর্য বিষুবরেখার উপর লম্বভাবে (90° কোণে) কিরণ দেয়? / On which of the following dates does the Sun shine vertically over the Equator?</p>", ["(A) 21 শে মার্চ / 21st March", "(B) 21 শে নভেম্বর / 21st November", "(C) 21 শে ডিসেম্বর / 21st December", "(D) 21 শে জুন / 21st June"], "A", "On 21st March and 23rd September (Equinoxes), the Sun rays fall vertically on the Equator."),
        (12, "Math", "<p>এক ব্যক্তির বেতন পরপর দুবার যথাক্রমে 10% ও 20% কমলো এবং শেষ বার 10% বেড়ে 9,900 টাকা হলো। সেই ব্যক্তির বেতন কত টাকা ছিল? / A person's salary was decreased by 10% and 20% successively and then increased by 10% to become Rs. 9,900. What was his original salary?</p>", ["(A) 10,500", "(B) 12,500", "(C) 15,200", "(D) 11,500"], "B", "x * 0.90 * 0.80 * 1.10 = 9900 => x * 0.792 = 9900 => x = 9900 / 0.792 = Rs. 12,500."),
        (13, "History", "<p>কংগ্রেসের সুরাট অধিবেশনে যে নরমপন্থী ও চরমপন্থীদের মধ্যে বিভাজন হয়, সেটি কোন সালে অনুষ্ঠিত হয়েছিল? / In which year did the Surat session of Congress take place where the split between Moderates and Extremists occurred?</p>", ["(A) 1905", "(B) 1907", "(C) 1908", "(D) 1906"], "B", "The Surat Split of the Indian National Congress occurred in 1907."),
        (14, "Reasoning", "<p>পরবর্তী বর্ণটি নির্ণয় করুন: C, G, L, R, Y, ? / Find the next letter in the series: C, G, L, R, Y, ?</p>", ["(A) K", "(B) G", "(C) X", "(D) H"], "D", "Letter position shifts: C(3) +4 = G(7), G(7) +5 = L(12), L(12) +6 = R(18), R(18) +7 = Y(25), Y(25) +9 = H(34 mod 26 = 8)."),
        (15, "Math", "<p class=\"math-expr\">সরলতম (Simplification) মান নির্ণয় করুন: <span class=\"vfrac\"><span class=\"top\">b + c</span><span class=\"bot\">(a - b)(c - a)</span></span> + <span class=\"vfrac\"><span class=\"top\">c + a</span><span class=\"bot\">(a - b)(b - c)</span></span> + <span class=\"vfrac\"><span class=\"top\">a + b</span><span class=\"bot\">(c - a)(b - c)</span></span> = ?</p>", ["(A) 1", "(B) 2", "(C) -1", "(D) 0"], "D", "Standard cyclic algebraic fraction identity evaluates to 0."),
        (16, "Math", "<p>A, B এবং C ব্যবসায়াতে 1/4 : 1/3 : 1/2 অনুপাতে মূলধন বিনিয়োগ করে। ব্যবসার শেষে 11,700 টাকা লাভ হলে, B কত টাকা পাবে? / A, B and C invest capital in ratio 1/4 : 1/3 : 1/2. If total profit is Rs. 11,700, what will B get?</p>", ["(A) 2700", "(B) 5400", "(C) 3000", "(D) 3600"], "D", "Ratio 1/4 : 1/3 : 1/2 = 3 : 4 : 6. B's share = (4 / 13) * 11700 = Rs. 3600."),
        (17, "Math", "<p class=\"math-expr\"><span class=\"vfrac\"><span class=\"top\">8.73 &times; 8.73 &times; 8.73 + 4.27 &times; 4.27 &times; 4.27</span><span class=\"bot\">8.73 &times; 8.73 - 8.73 &times; 4.27 + 4.27 &times; 4.27</span></span> = ?</p>", ["(A) 13", "(B) 11", "(C) 13.27", "(D) 12"], "A", "(a³ + b³) / (a² - ab + b²) = a + b = 8.73 + 4.27 = 13."),
        (18, "Reasoning", "<p>ইংরেজি বর্ণমালার P-এর বাঁদিকের দশম বর্ণের ডানদিকের 13তম বর্ণ কোনটি? / Which letter is 13th to the right of the 10th letter to the left of P in English alphabet?</p>", ["(A) Q", "(B) S", "(C) T", "(D) R"], "B", "P is 16th. 10th left = 6th (F). 13th right of F = 6 + 13 = 19th letter (S)."),
        (19, "History", "<p>পানিপথের দ্বিতীয় যুদ্ধ কত সালে হয়েছিল? / In which year was the Second Battle of Panipat fought?</p>", ["(A) 1526", "(B) 1564", "(C) 1761", "(D) 1556"], "D", "The Second Battle of Panipat was fought on 5 November 1556 between Akbar and Hemu."),
        (20, "Math", "<p>10টি গরু অথবা 7টি মহিষ প্রত্যহ 8 ঘণ্টা কাজ করে 60 দিনে একটি জমি চাষ করতে পারে। 25টি গরু ও 14টি মহিষ প্রত্যহ 12 ঘণ্টা কাজ করে তার 9 গুণ কাজ কত দিনে করতে পারবে? / 10 cows or 7 buffaloes working 8 hrs a day can plough a land in 60 days. In how many days can 25 cows and 14 buffaloes working 12 hrs a day plough 9 times that land?</p>", ["(A) 100", "(B) 85", "(C) 80", "(D) 90"], "C", "10 Cows = 7 Buffaloes => 1 Cow = 0.7 Buffalo. 25 Cows + 14 Buffaloes = 31.5 Buffaloes. 9 * (7 * 8 * 60) = 31.5 * 12 * D => D = 80 days."),
        (21, "Geography", "<p>কোটা শহরটি ভারতের কোন রাজ্যে অবস্থিত? / In which state of India is Kota city located?</p>", ["(A) রাজস্থান / Rajasthan", "(B) মধ্যপ্রদেশ / Madhya Pradesh", "(C) মহারাষ্ট্র / Maharashtra", "(D) গুজরাত / Gujarat"], "A", "Kota is located on the banks of Chambal river in Rajasthan."),
        (22, "Reasoning", "<p>324 * 150 = 54, 251 * 402 = 48 এবং 523 * 246 = 120 হলে 735 * 866 = ? / If 324 * 150 = 54, 251 * 402 = 48 and 523 * 246 = 120, then 735 * 866 = ?</p>", ["(A) 200", "(B) 180", "(C) 320", "(D) 300"], "D", "Multiply digit sums: (3+2+4)*(1+5+0) = 9*6 = 54; (2+5+1)*(4+0+2) = 8*6 = 48; (5+2+3)*(2+4+6) = 10*12 = 120. (7+3+5)*(8+6+6) = 15*20 = 300."),
        (23, "History", "<p>কত সালে পূর্ব পাকিস্তান থেকে স্বাধীন বাংলাদেশ গঠিত হয়? / In which year was independent Bangladesh formed from East Pakistan?</p>", ["(A) 1947", "(B) 1971", "(C) 1990", "(D) 1962"], "B", "Bangladesh liberated and became an independent nation in December 1971."),
        (24, "Sports", "<p>সাম্প্রতিক বিশ্বকাপজয়ী আর্জেন্টিনা দলের গোলরক্ষকের নাম কী? / What is the name of the goalkeeper of the World Cup winning Argentina team?</p>", ["(A) ইমানুয়েল নোয়ার / Manuel Neuer", "(B) এমিলিয়ানো মার্টিনেজ / Emiliano Martínez", "(C) হুগো লরিস / Hugo Lloris", "(D) পের চেক / Petr Čech"], "B", "Emiliano Martínez won Golden Glove at the 2022 FIFA World Cup for Argentina."),
        (25, "Reasoning", "<p>উপরের কোন চিত্রটি স্ত্রী, মা ও ডাক্তার এদের মধ্যে সম্পর্ককে নির্দেশ করে? / Which Venn diagram best represents the relationship between Woman, Mother and Doctor?<br/><img src=\"/images/pyq/wbp_lc_2023/q25.svg\" alt=\"Figure Q25\" class=\"max-w-md mx-auto my-3\" /></p>", ["(A) Figure A", "(B) Figure C", "(C) Figure D", "(D) Figure B"], "B", "All mothers are women (inner circle inside outer circle). Some mothers and women can be doctors (overlapping circle). Diagram C."),
        (26, "Science", "<p>শ্বাসমূল (Breathing Root) নীচের কোন উদ্ভিদে দেখা যায় না? / Breathing roots (Pneumatophores) are NOT found in which plant?</p>", ["(A) সুন্দরী / Sundari", "(B) গেওয়া / Gewa", "(C) কচুরিপানা / Water Hyacinth", "(D) গরান / Goran"], "C", "Water hyacinth is a free-floating aquatic plant and does not possess pneumatophores (breathing roots)."),
        (27, "Reasoning", "<p>রামের দিকে তাকিয়ে রমা বলল, “সে হল আমার কাকার মেয়ের ভাই”। রাম রমার কে হয়? / Looking at Ram, Soma said, 'He is the brother of my uncle's daughter'. How is Ram related to Soma?</p>", ["(A) কাকা / Uncle", "(B) খুড়তুতো ভাই / Cousin brother", "(C) মামা / Maternal Uncle", "(D) মামাতো ভাই / Cousin"], "B", "Uncle's daughter = Cousin sister. Her brother = Cousin brother."),
        (28, "Reasoning", "<p>পরবর্তী বর্ণজোড়টি নির্ণয় করুন: AL, CO, ER, GU, ? / Find the next letter pair in series: AL, CO, ER, GU, ?</p>", ["(A) JY", "(B) IY", "(C) JX", "(D) IX"], "C", "1st letters: A(+2)C(+2)E(+2)G(+3)J. 2nd letters: L(+3)O(+3)R(+3)U(+3)X. Result = JX."),
        (29, "History", "<p>বেমানান শব্দটি নির্ণয় করুন: / Find the odd one out: Amir Khusrau, Tansen, Todarmal, Birbal</p>", ["(A) আমির খসরু / Amir Khusrau", "(B) তানসেন / Tansen", "(C) টোডরমল / Todarmal", "(D) বীরবল / Birbal"], "A", "Tansen, Todarmal, and Birbal were Navratnas of Akbar. Amir Khusrau belonged to Delhi Sultanate period."),
        (30, "Geography", "<p>আন্দিজ পর্বতমালা কোন মহাদেশে অবস্থিত? / In which continent is the Andes mountain range located?</p>", ["(A) এশিয়া / Asia", "(B) উত্তর আমেরিকা / North America", "(C) দক্ষিণ আমেরিকা / South America", "(D) আফ্রিকা / Africa"], "C", "The Andes is the longest continental mountain range in the world, located in South America."),
        (31, "Reasoning", "<p>1 3 4 3 5 2 2 3 3 4 1 5 6 7 4 6 2 3 2 5 7 2 5 6 7 9<br/>উপরের শ্রেণিতে কতগুলি সংখ্যা আছে যারা তাদের ঠিক পূর্ববর্তী ও ঠিক পরবর্তী সংখ্যা দুটির সমষ্টির সমান? / How many numbers in the series are equal to the sum of their immediate predecessor and successor?</p>", ["(A) 3", "(B) 5", "(C) 6", "(D) 4"], "A", "The 3 instances where middle number equals sum of left and right numbers are: (3, 5, 2), (4, 6, 2), and (2, 5, 3). Total = 3."),
        (32, "Science", "<p>চাপ প্রয়োগের ফলে বরফের গলে যাওয়া এবং চাপ উঠিয়ে নিলে পরে আবার কঠিন অবস্থায় ফিরে আসার ঘটনাকে কী বলা হয়? / What is the phenomenon called where ice melts on applying pressure and refreezes when pressure is released?</p>", ["(A) কঠিনীভবন / Solidification", "(B) বাষ্পীভবন / Vaporization", "(C) ঘনীভবন / Condensation", "(D) পুনঃশিলীভবন / Regelation"], "D", "Regelation is the phenomenon of melting under pressure and freezing again when pressure is reduced."),
        (33, "Reasoning", "<p>বেমানান সংখ্যাটি নির্ণয় করুন: 2, 7, 13, 23, 34, 47 / Find the wrong/odd number in series: 2, 7, 13, 23, 34, 47</p>", ["(A) 13", "(B) 34", "(C) 47", "(D) 23"], "B", "34 is a composite number breaking the prime/series pattern."),
        (34, "Geography", "<p>লোয়েস কী দ্বারা গঠিত ভূমিরূপের উদাহরণ? / Loess is an example of landform created by which agency?</p>", ["(A) নদী / River", "(B) হিমবাহ / Glacier", "(C) সমুদ্র / Sea", "(D) বায়ু / Wind"], "D", "Loess is an aeolian sediment formed by the accumulation of wind-blown dust."),
        (35, "Math", "<p>A একটি কাজ 20 দিনে করতে পারে। 5 দিন কাজ হওয়ার পর A চলে যায়। বাকি কাজ B, 22 1/2 দিনে শেষ করে। A ও B একত্রে করলে কাজটি কত দিনে শেষ হতো? / A can do a work in 20 days. After 5 days A leaves. B completes remaining work in 22 1/2 days. In how many days could A and B together finish the work?</p>", ["(A) 10", "(B) 15", "(C) 18", "(D) 12"], "D", "A leaves 3/4 work. B takes 45/2 days for 3/4 => 30 days full. Together = (20*30)/50 = 12 days."),
        (36, "Science", "<p>নীচের কোনটি সবথেকে উৎকৃষ্ট কয়লার উদাহরণ? / Which of the following is the highest quality coal?</p>", ["(A) অ্যানথ্রাসাইট / Anthracite", "(B) লিগনাইট / Lignite", "(C) পিট / Peat", "(D) বিটুমিনাস / Bituminous"], "A", "Anthracite has the highest carbon content (over 85-90%) and highest heat value."),
        (37, "GK", "<p>সম্প্রতি কুনো ন্যাশনাল পার্কে যে চিতাবাঘগুলি ছাড়া হয়েছে সেগুলি কোন দেশ থেকে আনা হয়েছে? / From which country were cheetahs brought to Kuno National Park recently?</p>", ["(A) জাম্বিয়া / Zambia", "(B) নামিবিয়া / Namibia", "(C) নাইজেরিয়া / Nigeria", "(D) কেনিয়া / Kenya"], "B", "Cheetahs were translocated from Namibia to Kuno National Park in Madhya Pradesh."),
        (38, "Reasoning", "<p>উপযুক্ত বর্ণ বসিয়ে শূন্যস্থান পূরণ করুন: aa_aaa_aa_a_aa_a_b / Fill in blanks: aa_aaa_aa_a_aa_a_b</p>", ["(A) bbabaa", "(B) bbaabb", "(C) aabbab", "(D) bbabba"], "B", "Pattern repeats: aab / aaa / aab / aaa / aab / aab. Filling blanks yields bbaabb."),
        (39, "Math", "<p class=\"math-expr\">বৃহত্তম ভগ্নাংশ (fraction) কোনটি? <span class=\"vfrac\"><span class=\"top\">7</span><span class=\"bot\">8</span></span>, <span class=\"vfrac\"><span class=\"top\">13</span><span class=\"bot\">16</span></span>, <span class=\"vfrac\"><span class=\"top\">31</span><span class=\"bot\">40</span></span>, <span class=\"vfrac\"><span class=\"top\">63</span><span class=\"bot\">80</span></span></p>", ["(A) 7/8", "(B) 31/40", "(C) 63/80", "(D) 13/16"], "A", "Equating denominators to 80: 7/8 = 70/80, 13/16 = 65/80, 31/40 = 62/80, 63/80 = 63/80. Largest is 7/8."),
        (40, "History", "<p>পেশোয়া শব্দের অর্থ কী? / What is the meaning of the word 'Peshwa'?</p>", ["(A) সেনাপতি / Commander", "(B) প্রধানমন্ত্রী / Prime Minister", "(C) পুরোহিত / Priest", "(D) রাজা / King"], "B", "Peshwa was the designation of the Prime Minister of the Maratha Empire."),
        (41, "Reasoning", "<p>'<' মানে 'যোগ', '>' মানে 'বিয়োগ', '≠' মানে 'গুণ' এবং '=' মানে 'ভাগ' হলে 2 < 4 > 3 ≠ 32 = 8 = 2 ≠ 3 > 4 < 2 এর মান কত? / Evaluate the expression according to mathematical symbol rules.</p>", ["(A) -22", "(B) -14", "(C) 14", "(D) 22"], "B", "2 + 4 - 3 * 32 / 8 / 2 * 3 - 4 + 2 = 6 - 3*2*3 - 4 + 2 = 6 - 18 - 4 + 2 = -14."),
        (42, "Math", "<p>5 বছর পূর্বে A ও B-এর বয়সের অনুপাত (ratio) ছিল 6 : 7 এবং 5 বছর পরে তাদের বয়সের অনুপাত হবে 8 : 9। A-এর বর্তমান বয়স কত বছর? / 5 years ago ratio of A and B ages was 6:7. 5 years hence ratio will be 8:9. What is A's present age?</p>", ["(A) 30", "(B) 40", "(C) 25", "(D) 35"], "D", "Ages 5 yrs ago = 6x, 7x. (6x+10)/(7x+10) = 8/9 => 54x+90 = 56x+80 => 2x=10 => x=5. A's present age = 6*5 + 5 = 35 yrs."),
        (43, "Math", "<p>8a³ - (pb)³ = (2a - 3b)(4a² + 6ab + 9b²) হলে p = ? / If 8a³ - (pb)³ = (2a - 3b)(4a² + 6ab + 9b²), then p = ?</p>", ["(A) 2", "(B) 4", "(C) 5", "(D) 3"], "D", "Using identity x³ - y³ = (x - y)(x² + xy + y²): x = 2a, y = 3b = pb => p = 3."),
        (44, "Reasoning", "<p>2 * 4 * 9 = 41681, 3 * 5 * 7 = 92549 এবং 8 * 5 * 6 = 642536 হলে 9 * 7 * 3 = ? / If 2*4*9 = 41681, 3*5*7 = 92549, 8*5*6 = 642536 then 9*7*3 = ?</p>", ["(A) 71499", "(B) 81449", "(C) 71449", "(D) 81499"], "B", "Square each digit: 9²=81, 7²=49, 3²=9 => 81499."),
        (45, "History", "<p>চিতোরের কোন রাজপুত রাজ্যের রাজধানী ছিল? / Chittor was the capital of which Rajput kingdom?</p>", ["(A) উদয়পুর / Udaipur", "(B) বুন্দেলখণ্ড / Bundelkhand", "(C) জয়পুর / Jaipur", "(D) মেবার / Mewar"], "D", "Chittorgarh was the historic capital of the Sisodia Rajput kingdom of Mewar."),
        (46, "Science", "<p>বিমানের কাঠামো নির্মাণে নীচের কোন ধাতুটির ব্যবহার সর্বাধিক? / Which metal is most widely used in constructing airplane frames?</p>", ["(A) লোহা / Iron", "(B) নিকেল / Nickel", "(C) অ্যালুমিনিয়াম / Aluminium", "(D) তামা / Copper"], "C", "Aluminium alloys are widely used in aircraft construction due to low density and high strength."),
        (47, "Math", "<p>A ও B-এর গড় (average) আয় 3300 টাকা। B ও C-এর গড় (average) আয় 3000 টাকা এবং A ও C-এর গড় (average) আয় 2700 টাকা। তিনজনের গড় আয় কত টাকা? / Average income of A and B is 3300, B and C is 3000, A and C is 2700. What is average income of all three?</p>", ["(A) 2800", "(B) 2900", "(C) 2700", "(D) 3000"], "D", "A+B=6600, B+C=6000, A+C=5400. 2(A+B+C)=18000 => A+B+C=9000. Average = 9000/3 = Rs. 3000."),
        (48, "Polity", "<p>নীচের কোনটি একটি 'রিট' (writ) নয়? / Which of the following is NOT a Writ?</p>", ["(A) হেবিয়াস কর্পাস / Habeas Corpus", "(B) স্পেশাল লিভ পিটিশন / Special Leave Petition", "(C) সার্টিওরাবি / Certiorari", "(D) ম্যান্ডামাস / Mandamus"], "B", "Special Leave Petition (SLP) is an appeal mechanism under Art 136, not a prerogative writ."),
        (49, "Math", "<p>দুই বন্ধু সাইকেলে চেপে 50 কিমি দূরবর্তী দুটি স্থান থেকে পরস্পরের অভিমুখে একই সময়ে যাত্রা শুরু করে। তাদের গতিবেগ যথাক্রমে 5 কিমি/ঘণ্টা ও 6 কিমি/ঘণ্টা হলে 3 ঘণ্টা পরে, তাদের মধ্যে দূরত্ব কত কিমি হবে? / Two friends start towards each other from places 50 km apart at speeds 5 km/hr and 6 km/hr. What is distance between them after 3 hrs?</p>", ["(A) 15", "(B) 20", "(C) 21", "(D) 17"], "D", "Relative speed = 11 km/hr. Distance covered in 3 hrs = 33 km. Remaining distance = 50 - 33 = 17 km."),
        (50, "Science", "<p>নীচের কোনটি পটাশিয়াম নাইট্রেটের রাসায়নিক সংকেত? / Which of the following is the chemical formula of Potassium Nitrate?</p>", ["(A) PNO3", "(B) PSNO3", "(C) SNO3", "(D) KNO3"], "D", "KNO3 is the chemical formula of Potassium Nitrate (Saltpeter)."),
        (51, "Math", "<p>একটি দুই অঙ্ক বিশিষ্ট সংখ্যার অঙ্ক দুটির গুণফল 12। সংখ্যাটির সাথে 36 যোগ করলে সংখ্যাটির অঙ্ক দুটি স্থান পরিবর্তন করে। সংখ্যাটি কত? / Product of digits of a two-digit number is 12. If 36 is added to the number, digits get reversed. What is the number?</p>", ["(A) 62", "(B) 26", "(C) 43", "(D) 34"], "B", "Product 2 * 6 = 12. 26 + 36 = 62 (digits reversed). Number is 26."),
        (52, "Geography", "<p>ক্ষেত্রী খনিটি কোন ধাতু উত্তোলনের জন্য বিখ্যাত? / For which metal extraction is Khetri mine famous?</p>", ["(A) লোহা / Iron", "(B) সোনা / Gold", "(C) খনিজ তেল / Petroleum", "(D) তামা / Copper"], "D", "Khetri Copper Complex at Jhunjhunu in Rajasthan is famous for copper mining."),
        (53, "Math", "<p>P, Q এবং R একটি ব্যবসা শুরু করে। P এবং Q যথাক্রমে 2560 টাকা ও 2000 টাকা ওই ব্যবসায় বিনিয়োগ করে। বছরের শেষে 1105 টাকা লাভ হলে, P, 320 টাকা লভ্যাংশ পায়। ওই ব্যবসায় R কত টাকা বিনিয়োগ করেছিল? / P, Q and R start business. P & Q invest Rs. 2560 and 2000. Out of total profit Rs. 1105, P gets Rs. 320. How much did R invest?</p>", ["(A) 4280", "(B) 4820", "(C) 4028", "(D) 2840"], "A", "2560 / (4560 + R) = 320 / 1105 => 8 * 1105 = 4560 + R => 8840 = 4560 + R => R = Rs. 4280."),
        (54, "Science", "<p>থাইরক্সিন হরমোন কোন গ্রন্থি থেকে ক্ষরিত হয়? / From which gland is Thyroxine hormone secreted?</p>", ["(A) পিটুইটারি / Pituitary", "(B) থ্যালামাস / Thalamus", "(C) হাইপোথ্যালামাস / Hypothalamus", "(D) থাইরয়েড / Thyroid"], "D", "Thyroxine (T4) is secreted by the Thyroid gland."),
        (55, "History", "<p>‘মারাঠা’ ও ‘কেশরী’ নামক পত্রিকা দুটি কে সম্পাদনা করতেন? / Who edited the newspapers 'Mahratta' and 'Kesari'?</p>", ["(A) বিপিনচন্দ্র পাল / Bipin Chandra Pal", "(B) বালগঙ্গাধর তিলক / Bal Gangadhar Tilak", "(C) গোপালকৃষ্ণ গোখলে / Gopal Krishna Gokhale", "(D) লালা লাজপত রাই / Lala Lajpat Rai"], "B", "Bal Gangadhar Tilak published Kesari in Marathi and Mahratta in English."),
        (56, "Reasoning", "<p>মিসিসিপি : আমেরিকা :: কঙ্গো : ? / Mississippi : America :: Congo : ?</p>", ["(A) এশিয়া / Asia", "(B) ইউরোপ / Europe", "(C) রাশিয়া / Russia", "(D) আফ্রিকা / Africa"], "D", "Mississippi is a major river in America; Congo is a major river in Africa."),
        (57, "History", "<p>নেতাজী সুভাষচন্দ্র বসু নিম্নলিখিত কোন স্থানে জন্মগ্রহণ করেন? / In which place was Netaji Subhash Chandra Bose born?</p>", ["(A) শিমলা / Shimla", "(B) কটক / Cuttack", "(C) ভুবনেশ্বর / Bhubaneswar", "(D) কলকাতা / Kolkata"], "B", "Netaji Subhash Chandra Bose was born on 23 January 1897 in Cuttack, Odisha."),
        (58, "Reasoning", "<p>O = 12, MOM = 40 এবং FAN = 60 হলে HAND = ? / If O = 12, MOM = 40 and FAN = 60, then HAND = ?</p>", ["(A) 61", "(B) 81", "(C) 91", "(D) 71"], "B", "Reverse alphabetical positions: H(19) + A(26) + N(13) + D(23) = 81."),
        (59, "Science", "<p>নীচের কোনটি ভূ-নিম্নস্থ কাণ্ডের উদাহরণ নয়? / Which of the following is NOT an example of an underground stem?</p>", ["(A) আলু / Potato", "(B) ওল / Yam", "(C) ফুলকপি / Cauliflower", "(D) আদা / Ginger"], "C", "Cauliflower is an edible inflorescence/flower, not a modified underground stem."),
        (60, "Reasoning", "<p>লুপ্ত সংখ্যাটি নির্ণয় করুন: / Find the missing number in the center of the third circle:<br/><img src=\"/images/pyq/wbp_lc_2023/q60.svg\" alt=\"Figure Q60\" class=\"max-w-md mx-auto my-3\" /></p>", ["(A) 43", "(B) 53", "(C) 34", "(D) 35"], "D", "Sum of square roots of 4 numbers in quadrants: Circle 1: 8+5+12+6 = 31. Circle 2: 9+3+5+19 = 36. Circle 3: 7+13+6+9 = 35."),
        (61, "Science", "<p>কোন ভিটামিনের বিজ্ঞানসম্মত নাম ক্যালসিফেরল? / Calciferol is the scientific chemical name of which vitamin?</p>", ["(A) ভিটামিন-A / Vitamin A", "(B) ভিটামিন-D / Vitamin D", "(C) ভিটামিন-K / Vitamin K", "(D) ভিটামিন-C / Vitamin C"], "B", "Vitamin D is scientifically named Calciferol (Cholecalciferol / Ergocalciferol)."),
        (62, "Reasoning", "<p>কোণো সাংকেতিক ভাষায় HORSE কে 37185, CHAIR কে 03941 এবং REPORT কে 152716 দ্বারা প্রকাশ করা হলে, ওই ভাষায় RESEARCH কে কী দ্বারা প্রকাশ করা হবে? / If HORSE=37185, CHAIR=03941, REPORT=152716, how is RESEARCH written?</p>", ["(A) 15869103", "(B) 15869104", "(C) 15859104", "(D) 15859103"], "A", "Substituting letter code values: R=1, E=5, S=8, E=6, A=9, R=1, C=0, H=3 => 15869103."),
        (63, "Math", "<p>ক্ষুদ্রতম মান কোনটি? (0.5)², √0.49, ∛0.008, 0.23 / Which is the smallest value among (0.5)², √0.49, ∛0.008, 0.23?</p>", ["(A) (0.5)²", "(B) ∛0.008", "(C) 0.23", "(D) √0.49"], "B", "(0.5)² = 0.25, √0.49 = 0.70, ∛0.008 = 0.20, 0.23 = 0.23. Smallest is ∛0.008 (0.20)."),
        (64, "Reasoning", "<p>শ্যাম তার বাড়ি থেকে বেরিয়ে পশ্চিম দিকে 40 মিটার যাওয়ার পর, ডানদিকে ঘুরে আরও 60 মিটার গেল, সেখান থেকে বামদিকে ঘুরে আরও 50 মিটার যাওয়ার পর আবার পরপর দুবার বামদিকে ঘুরে যথাক্রমে 80 মিটার ও 30 মিটার গেল। তারপর আবার বামদিকে ঘুরে চলতে শুরু করল। এখন শ্যামের অভিমুখ কোন দিকে? / Trace directions: Shyam starts West 40m, turns Right 60m, Left 50m, Left 80m, Left 30m, and turns Left. Which direction is he walking now?</p>", ["(A) উত্তর / North", "(B) পূর্ব / East", "(C) পশ্চিম / West", "(D) দক্ষিণ / South"], "B", "Final turn after walking 30m East is Left -> facing East."),
        (65, "Math", "<p>পিতা ও পুত্রের বর্তমান বয়সের সমষ্টি 50 বছর। যখন পুত্রের বয়স পিতার বর্তমান বয়সের সমান হবে তখন তাদের বয়সের সমষ্টি হবে 110 বছর। তাদের বর্তমান বয়স কত বছর? / Sum of present ages of father and son is 50 yrs. When son reaches father's present age, sum of ages will be 110 yrs. What are their present ages?</p>", ["(A) 36, 14", "(B) 45, 5", "(C) 40, 10", "(D) 35, 15"], "C", "F + S = 50. In (F-S) years: (2F-S) + F = 3F - S = 110. Adding both equations gives 4F = 160 => F = 40, S = 10."),
        (66, "GK", "<p>বিক্রম সারাভাই স্পেস রিসার্চ সেন্টার ভারতের কোন রাজ্যে অবস্থিত? / Vikram Sarabhai Space Centre is located in which state of India?</p>", ["(A) কেরালা / Kerala", "(B) কর্ণাটক / Karnataka", "(C) তামিলনাড়ু / Tamil Nadu", "(D) ওড়িশা / Odisha"], "A", "VSSC is located at Thiruvananthapuram in Kerala."),
        (67, "Reasoning", "<p>ছবিতে এক ভদ্রমহিলার দিকে লক্ষ্য করে সোমা বাসবকে বলল, “আমি হলাম এই ভদ্রমহিলার একমাত্র কন্যা এবং এর পুত্র হল তোমার মামা।” সোমা বাসবের বাবার কে হন? / Looking at a lady in picture, Soma told Basab: 'I am the only daughter of this lady and her son is your maternal uncle'. What is Soma to Basab's father?</p>", ["(A) স্ত্রী / Wife", "(B) বৌমা / Daughter-in-law", "(C) ভাইঝি / Niece", "(D) কন্যা / Daughter"], "A", "Lady's son = Basab's maternal uncle => Soma is Basab's mother. Therefore Soma is wife of Basab's father."),
        (68, "Polity", "<p>ইমপিচমেন্টের মাধ্যমে নীচের কোন ব্যক্তিকে তার পদ থেকে সরানো যেতে পারে? / Who among the following can be removed from office through impeachment?</p>", ["(A) প্রধানমন্ত্রী / Prime Minister", "(B) সেনাপ্রধান / Army Chief", "(C) রাষ্ট্রপতি / President", "(D) স্পিকার / Speaker"], "C", "The President of India can be impeached for violation of the Constitution under Article 61."),
        (69, "Math", "<p>একটি বাক্সে 1 টাকা ও 50 পয়সা মিলিয়ে মোট 52 টি মুদ্রা আছে। তাদের মূল্যের অনুপাত (ratio) 3 : 5 হলে, কোন প্রকার মুদ্রা কটি করে আছে? / A box contains 52 coins of Re 1 and 50 paise. If ratio of their values is 3:5, how many coins of each type are there?</p>", ["(A) 12, 40", "(B) 24, 28", "(C) 16, 26", "(D) 20, 32"], "A", "Value ratio 3:5 => Coin number ratio (3/1) : (5/0.5) = 3 : 10. Total 13 parts = 52 => 1 part = 4. Coins: 12 and 40."),
        (70, "Math", "<p>6351 এর সঙ্গে কোন ক্ষুদ্রতম সংখ্যা যোগ করলে যোগফল একটি পূর্ণবর্গ (perfect square) সংখ্যা হবে? / What smallest number should be added to 6351 so that sum becomes a perfect square?</p>", ["(A) 39", "(B) 9", "(C) 29", "(D) 49"], "D", "80² = 6400. 6400 - 6351 = 49."),
        (71, "Reasoning", "<p>নীচের শব্দগুলিকে সঠিক অর্থবহ অনুক্রমে সাজান: A. নিয়োগপত্র B. উপার্জন C. পরীক্ষা D. আবেদন E. পড়াশোনা / Arrange words in logical meaningful order: A. Appointment letter B. Income C. Examination D. Application E. Education</p>", ["(A) ECDAB", "(B) ECDBA", "(C) EABCD", "(D) EDCAB"], "A", "Logical order: Education (E) -> Examination (C) -> Application (D) -> Appointment letter (A) -> Income (B)."),
        (72, "Polity", "<p>প্রতিবছর লোকসভায় কে বাজেট পেশ করেন? / Who presents the budget in the Lok Sabha every year?</p>", ["(A) প্রধানমন্ত্রী / Prime Minister", "(B) অর্থমন্ত্রী / Union Finance Minister", "(C) স্পিকার / Speaker", "(D) স্বরাষ্ট্রমন্ত্রী / Home Minister"], "B", "The Union Finance Minister presents the Annual Financial Statement (Budget) in Parliament."),
        (73, "Reasoning", "<p>কোনো সাংকেতিক ভাষায় ‘লাল’ যদি ‘সাদা’ হয়, ‘সাদা’ যদি ‘কালো’ হয়, ‘কালো’ যদি ‘বাদামি’ হয়, ‘বাদামি’ যদি ‘সবুজ’ হয়, ‘সবুজ’ যদি ‘নীল’ হয় এবং ‘নীল’ যদি ‘বেগুনি’ হয়, তবে দুধের রং কী হবে? / In a code language, if red is white, white is black, black is brown, brown is green, green is blue, blue is violet, what is the color of milk?</p>", ["(A) সাদা / White", "(B) বাদামি / Brown", "(C) সবুজ / Green", "(D) কালো / Black"], "D", "Real color of milk is white. In code language, 'white' is called 'black'."),
        (74, "Math", "<p>6466849 এর বর্গমূল (square root) নির্ণয় করুন: / Find the square root of 6466849:</p>", ["(A) 2643", "(B) 2623", "(C) 2743", "(D) 2543"], "D", "√6466849 = 2543."),
        (75, "Math", "<p>কোন বৃহত্তম সংখ্যা দ্বারা 303 ও 207 কে ভাগ করলে উভয় ক্ষেত্রেই 3 ভাগশেষ (Remainder) থাকবে? / What largest number divides 303 and 207 leaving remainder 3 in each case?</p>", ["(A) 12", "(B) 17", "(C) 15", "(D) 20"], "A", "HCF(303-3, 207-3) = HCF(300, 204) = 12."),
        (76, "Math", "<p>1550 টাকাকে দুটি ভাগে বিভক্ত করে 5% এবং 8% হারে জমা রাখলে 3 বছর পরে 300 টাকা সুদ (interest) পাওয়া গেল। অংশ দুটি কত টাকা? / Rs. 1550 is divided into two parts at 5% and 8% simple interest. After 3 yrs total interest is Rs. 300. What are the two parts?</p>", ["(A) 800, 750", "(B) 850, 700", "(C) 1000, 550", "(D) 900, 650"], "A", "Interest per year = 300/3 = 100. Using Alligation ratio 48:45 = 16:15 => Parts are Rs. 800 and Rs. 750."),
        (77, "Reasoning", "<p>বেমানান শব্দটি নির্ণয় করুন: / Find the odd word out: Red, Green, Pink, Blue</p>", ["(A) লাল / Red", "(B) সবুজ / Green", "(C) গোলাপি / Pink", "(D) নীল / Blue"], "C", "Red, Green, Blue are additive primary colors; Pink is a secondary composite color."),
        (78, "Science", "<p>হাইড্রোজেন গ্যাসের সাপেক্ষে নীচের কোনটি সত্য নয়? / Which of the following is NOT true regarding Hydrogen gas?</p>", ["(A) হলুদবর্ণের / Yellow in color", "(B) স্বাদহীন / Tasteless", "(C) দাহ্য / Combustible", "(D) গন্ধহীন / Odorless"], "A", "Hydrogen is a colorless gas, not yellow."),
        (79, "Math", "<p>A, B ও C তিনটি নল দ্বারা একটি চৌবাচ্চা 18 মিনিটে পূর্ণ হয়। তিনটি নল একত্রে 6 মিনিট চলার পর, C নল বন্ধ করা হলে A ও B নল দ্বারা চৌবাচ্চাটি 24 মিনিটে পূর্ণ হল। C নল দ্বারা চৌবাচ্চাটি পূর্ণ হতে কত মিনিট সময় লাগবে? / A, B, C fill a tank in 18 mins. After running together for 6 mins, C is closed. A & B fill remaining in 24 mins. How long does C alone take?</p>", ["(A) 30", "(B) 24", "(C) 32", "(D) 36"], "D", "(A+B) fill 2/3 in 24 mins => 36 mins full. C's 1 min work = 1/18 - 1/36 = 1/36 => C alone takes 36 minutes."),
        (80, "Reasoning", "<p>পাঁচজন ছেলে A, B, C, D এবং E গোল হয়ে কেন্দ্রের দিকে মুখ করে বসে আছে। E, A ও D এর মাঝখানে বসেছে, A, B এর ডানদিকে বসেছে। C এর দুপাশে কারা বসেছে? / 5 boys sitting in circle facing center. E is between A and D. A is right of B. Who are sitting next to C?</p>", ["(A) A ও B", "(B) E ও D", "(C) A ও E", "(D) B ও D"], "D", "Clockwise order: B, A, E, D, C. So C is sitting between B and D."),
        (81, "Math", "<p>3টি চেয়ার ও 2টি টেবিলের মোট মূল্য 2900 টাকা। 4টি চেয়ার ও 3টি টেবিলের মোট মূল্য 4200 টাকা। 1টি চেয়ার ও 1টি টেবিলের মোট মূল্য কত টাকা? / Cost of 3 chairs & 2 tables = Rs. 2900. Cost of 4 chairs & 3 tables = Rs. 4200. What is cost of 1 chair & 1 table?</p>", ["(A) 300", "(B) 1500", "(C) 1300", "(D) 1000"], "C", "(4C + 3T) - (3C + 2T) = 4200 - 2900 = Rs. 1300."),
        (82, "Geography", "<p>কেদারনাথ তীর্থস্থানটি কোন রাজ্যে অবস্থিত? / In which state is the Kedarnath pilgrimage site located?</p>", ["(A) হিমাচল প্রদেশ / Himachal Pradesh", "(B) উত্তরপ্রদেশ / Uttar Pradesh", "(C) জম্মু ও কাশ্মীর / Jammu & Kashmir", "(D) উত্তরাখণ্ড / Uttarakhand"], "D", "Kedarnath is located in Rudraprayag district of Uttarakhand."),
        (83, "Science", "<p>তরল ধাতু কোনটি? / Which of the following is a liquid metal?</p>", ["(A) সোডিয়াম / Sodium", "(B) সোনা / Gold", "(C) রূপা / Silver", "(D) পারদ / Mercury"], "D", "Mercury (Hg) is the only metal that is liquid at standard room temperature."),
        (84, "Reasoning", "<p>A, B, C, D ও E পাঁচ বন্ধুর মধ্যে A, B এর থেকে খাটো কিন্তু E এর থেকে লম্বা। C, B এর থেকে লম্বা। D, B এর থেকে খাটো কিন্তু A এর থেকে লম্বা। কে সবথেকে খাটো? / Among 5 friends, A is shorter than B but taller than E. C is taller than B. D is shorter than B but taller than A. Who is shortest?</p>", ["(A) A", "(B) C", "(C) D", "(D) E"], "D", "Height order: C > B > D > A > E. Shortest is E."),
        (85, "Math", "<p>ত্রিভুজাকৃতি প্রিজমের কটি তল (Face) থাকে? / How many faces does a triangular prism have?</p>", ["(A) 3", "(B) 5", "(C) 6", "(D) 4"], "B", "A triangular prism has 5 faces (2 triangular bases and 3 rectangular sides)."),
        (86, "Math", "<p>1³ + 2³ + 3³ + ... + 10³ = 3025 হলে 4 + 32 + 108 + ... + 4000 = ? / If 1³ + 2³ + 3³ + ... + 10³ = 3025, then 4 + 32 + 108 + ... + 4000 = ?</p>", ["(A) 12000", "(B) 11200", "(C) 12400", "(D) 12100"], "D", "4 * (1³ + 2³ + 3³ + ... + 10³) = 4 * 3025 = 12100."),
        (87, "Reasoning", "<p>আমার বাড়ি বাজারের দক্ষিণ দিকে এবং ডাকঘর আমার বাড়ির পূর্ব দিকে এবং আমার বাড়ি থেকে বাজার ও ডাকঘরের দূরত্ব সমান। আমি প্রথমে বাজারে গেলাম এবং তারপর ডাকঘরের দিকে হাঁটতে শুরু করলাম, মাঝামাঝি রাস্তায় আমার বন্ধুর সাথে দেখা হল এবং আমরা ঠিক করলাম আমরা বাড়ি ফিরে যাব। এখন আমরা কোন অভিমুখে হাঁটছি? / Trace direction: Walking from Market to Post Office (South-East). Turning back to Home -> walking South-West.</p>", ["(A) উত্তর-পশ্চিম / North-West", "(B) উত্তর-পূর্ব / North-East", "(C) দক্ষিণ-পূর্ব / South-East", "(D) দক্ষিণ-পশ্চিম / South-West"], "D", "From midpoint of hypotenuse back to origin (Home) is South-West."),
        (88, "Math", "<p>দুটি সংখ্যার গ.সা.গু (HCF) ও ল.সা.গু (LCM)-র গুণফল 24, সংখ্যা দুটির বিয়োগফল 2 হলে, বড় সংখ্যাটি কত? / Product of HCF and LCM of 2 numbers is 24. Difference of numbers is 2. What is the larger number?</p>", ["(A) 3", "(B) 6", "(C) 8", "(D) 4"], "B", "x * y = 24 and x - y = 2 => x = 6, y = 4. Larger number is 6."),
        (89, "History", "<p>কলকাতায় এশিয়াটিক সোসাইটির প্রতিষ্ঠা কে করেন? / Who founded the Asiatic Society in Kolkata?</p>", ["(A) স্যার অ্যালেক্স হিউম / Sir Allan Octavian Hume", "(B) লর্ড ক্লাইভ / Lord Clive", "(C) লর্ড ওয়েলেসলি / Lord Wellesley", "(D) স্যার উইলিয়াম জোন্স / Sir William Jones"], "D", "Sir William Jones founded the Asiatic Society of Bengal in 1784."),
        (90, "Math", "<p>4000 টাকায় একটি ঘোড়া সমেত গাড়ি কিনে ঘোড়াটিকে 20% লাভে এবং গাড়িটিকে 10% ক্ষতিতে বিক্রয় করলে 3.5% লাভ হয়। ঘোড়ার ক্রয়মূল্য কত টাকা? / A horse and carriage bought for Rs. 4000. Horse sold at 20% profit, carriage at 10% loss. Overall profit is 3.5%. What is cost price of horse?</p>", ["(A) 1200", "(B) 1800", "(C) 2400", "(D) 1500"], "B", "Ratio of CP Horse : Carriage = (3.5 - (-10)) : (20 - 3.5) = 13.5 : 16.5 = 9 : 11. CP Horse = (9/20) * 4000 = Rs. 1800."),
        (91, "Reasoning", "<p>নীচের চিত্রটি দেখে লুপ্ত সংখ্যাটি নির্ণয় করুন: / Find the missing number in the spoke circle:<br/><img src=\"/images/pyq/wbp_lc_2023/q91.svg\" alt=\"Figure Q91\" class=\"max-w-md mx-auto my-3\" /></p>", ["(A) 370", "(B) 276", "(C) 436", "(D) 376"], "D", "Pattern: 4*2+1=9, 9*2+2=20, 20*2+3=43, 43*2+4=90, 90*2+5=185, 185*2+6=376, 376*2+7=759. Result = 376."),
        (92, "History", "<p>মহাবলীপুরমের সপ্তরথ মন্দির কোন রাজবংশের সৃষ্টি? / The Seven Pagodas (Ratha temples) of Mahabalipuram were built by which dynasty?</p>", ["(A) চোল / Chola", "(B) পল্লব / Pallava", "(C) রাষ্ট্রকূট / Rashtrakuta", "(D) চালুক্য / Chalukya"], "B", "The monolithic rock-cut Pancha Rathas at Mahabalipuram were constructed by the Pallava dynasty."),
        (93, "Polity", "<p>সুপ্রিম কোর্টের বিচারপতির অবসরগ্রহণের বয়স কত বছর? / What is the retirement age of a Supreme Court judge in India?</p>", ["(A) 60", "(B) 62", "(C) 65", "(D) 58"], "C", "A Supreme Court judge holds office until attaining the age of 65 years."),
        (94, "Reasoning", "<p>কোনো ভাষায় POLICE শব্দটিকে GAKJON লেখা হলে, ওই ভাষা অনুযায়ী ARREST শব্দটিকে কীভাবে প্রকাশ করা হবে? / If POLICE is coded as GAKJON, how is ARREST coded?</p>", ["(A) VGQPTY", "(B) PTYGVQ", "(C) YPGPTV", "(D) VQGPTY"], "A", "Opposite letters code shifted: ARREST becomes VGQPTY."),
        (95, "Science", "<p>প্রাকৃতিক নির্বাচনবাদের (Natural Selection Theory) প্রবক্তা কে? / Who proposed the Theory of Natural Selection?</p>", ["(A) মেন্ডেল / Mendel", "(B) ল্যামার্ক / Lamarck", "(C) নিউটন / Newton", "(D) চার্লস ডারউইন / Charles Darwin"], "D", "Charles Darwin proposed the Theory of Evolution by Natural Selection in 'On the Origin of Species'."),
        (96, "Science", "<p>কোনো একটি মাছকে জলের ভেতরে দেখলে সেটিকে ওর সঠিক অবস্থান থেকে একটু উপরে ওঠা অবস্থায় দেখা যায়, আলোকের কোন ধর্মের জন্য? / A fish inside water appears raised above its actual depth due to which property of light?</p>", ["(A) প্রতিফলন / Reflection", "(B) অভ্যন্তরীণ পূর্ণপ্রতিফলন / Total Internal Reflection", "(C) বিচ্ছুরণ / Diffraction", "(D) প্রতিসরণ / Refraction"], "D", "Refraction of light passing from denser medium (water) to rarer medium (air) makes underwater objects appear shallower."),
        (97, "Reasoning", "<p>পরবর্তী সংখ্যাটি নির্ণয় করুন: 4, 9, 19, 39, 79, 159, ? / Find the next number in series: 4, 9, 19, 39, 79, 159, ?</p>", ["(A) 109", "(B) 149", "(C) 179", "(D) 199"], "C", "4 (+5) -> 9 (+10) -> 19 (+20) -> 39 (+40) -> 79 (+100) -> 179."),
        (98, "History", "<p>নিম্নোক্ত কোন ব্যক্তি ‘ইন্ডিয়ান ন্যাশনাল কনফারেন্স’ প্রতিষ্ঠা করেছিলেন? / Who among the following founded the 'Indian National Conference'?</p>", ["(A) দাদাভাই নওরোজি / Dadabhai Naoroji", "(B) সুরেন্দ্রনাথ ব্যানার্জী / Surendranath Banerjee", "(C) জওহরলাল নেহেরু / Jawaharlal Nehru", "(D) উমেশচন্দ্র বন্দ্যোপাধ্যায় / W. C. Bonnerjee"], "B", "Surendranath Banerjee founded the Indian National Conference in 1883 with Anandamohan Bose."),
        (99, "History", "<p>কে কানপুরে সিপাহী বিদ্রোহের নেতৃত্ব দিয়েছিলেন? / Who led the Sepoy Mutiny in Kanpur?</p>", ["(A) মঙ্গল পান্ডে / Mangal Pandey", "(B) কুনওয়ার সিং / Kunwar Singh", "(C) নানা সাহেব / Nana Saheb", "(D) লক্ষ্মীবাঈ / Rani Lakshmibai"], "C", "Nana Saheb led the revolt of 1857 in Kanpur."),
        (100, "Math", "<p>কোনো টাকা বার্ষিক 6% হার সরল সুদে (simple interest) 3 বছরে সবৃদ্ধিমূল (Principal + Interest) 3540 টাকা হলে, সুদ (interest) কত টাকা হবে? / If a sum amounts to Rs. 3540 in 3 years at 6% simple interest per annum, what is the interest?</p>", ["(A) 450", "(B) 580", "(C) 640", "(D) 540"], "D", "Principal = 3540 / 1.18 = Rs. 3000. Interest = 3540 - 3000 = Rs. 540.")
    ]

    q_tuples = []
    for item in raw_questions:
        q_no, topic, q_text, opts, ans, exp = item
        q_id = f"{t_id}_q{q_no}"
        q_tuples.append((
            q_id,
            t_id,
            topic,
            q_no,
            q_text,
            opts,
            None,
            ans,
            exp
        ))

    cur.execute(f"DELETE FROM questions WHERE test_id = '{t_id}';")

    insert_query = """
        INSERT INTO questions (id, test_id, topic, q_no, question_text, options, image_url, correct_answer, explanation)
        VALUES %s
        ON CONFLICT (id) DO UPDATE SET
            test_id = EXCLUDED.test_id,
            topic = EXCLUDED.topic,
            q_no = EXCLUDED.q_no,
            question_text = EXCLUDED.question_text,
            options = EXCLUDED.options,
            image_url = EXCLUDED.image_url,
            correct_answer = EXCLUDED.correct_answer,
            explanation = EXCLUDED.explanation;
    """

    execute_values(cur, insert_query, q_tuples)

    conn.commit()
    cur.close()
    conn.close()
    print(f"Successfully seeded {len(q_tuples)} questions for {t_id} into PostgreSQL DB!")

if __name__ == "__main__":
    seed()
