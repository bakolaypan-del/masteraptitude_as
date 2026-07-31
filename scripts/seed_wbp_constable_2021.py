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

    t_id = "wbp_constable_pre_2021"
    pyq_id = "pyq_wbp_constable_pre_2021"
    title = "WBP Constable Prelims 2021 — Official Question Paper"
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
        "WBP Constable Prelims 2021",
        "General Awareness, Elementary Mathematics & Reasoning",
        "Official West Bengal Police (WBP) Constable Preliminary Examination 2021 Question Paper. 100 bilingual questions, 60 minutes, 100 marks with 0.25 negative marking and official answer key.",
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
        "content": "Official West Bengal Police (WBP) Constable Preliminary Examination 2021 Question Paper with 100 bilingual (Bengali & English) questions, Arithmetic, Reasoning, General Knowledge, and official answer key.",
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
        (1, "GK", "<p>Which of the following was a Denmark colony in West Bengal? / নিম্নলিখিতের মধ্যে কোনটি পশ্চিমবঙ্গে দিনেমারের উপনিবেশ ছিল?</p>", ["(A) Chunchura, Hooghly / চুঁচুড়া, হুগলি", "(B) Chandannagar, Hooghly / চন্দননগর, হুগলি", "(C) Srirampur, Hooghly / শ্রীরামপুর, হুগলি", "(D) Barrackpore, North 24 Parganas / ব্যারাকপুর, উত্তর 24 পরগণা"], "C", "Srirampur (Serampore) in Hooghly district was a Danish colony from 1755 to 1845."),
        (2, "Math", "<p>A certain sum of money becomes three times of itself in 20 years at simple interest. In how many years does it become double of itself at the same rate? / কোনো আসল সরল সুদে 20 বছরে 3 গুণ হলে, ওই আসল একই সুদের হারে কত বছরে দ্বিগুণ হবে?</p>", ["(A) 10 years / 10 বছরে", "(B) 8 years / 8 বছরে", "(C) 14 years / 14 বছরে", "(D) 12 years / 12 বছরে"], "A", "If sum becomes 3x in 20 yrs, interest = 2x. Rate = (2x * 100)/(x * 20) = 10%. To double (interest = x): time = (x * 100)/(x * 10) = 10 years."),
        (3, "Reasoning", "<p>In the following series of numbers, find out how many times, 1, 3 and 7 have appeared together, 7 being in the middle and 1 and 3 on either side of 7? / নীচের সংখ্যার সিরিজে, কতবার 1, 3 এবং 7 একসাথে আছে, যেখানে 7 মাঝখানে এবং 1 ও 3 তার দুপাশে বসেছে?<br/><b>2 9 7 3 1 7 3 7 7 1 3 3 1 7 3 8 5 7 1 3 7 7 1 7 3 9 0 6</b></p>", ["(A) 9", "(B) 3", "(C) 5", "(D) 4"], "B", "The required patterns are 173 or 371. In the sequence, there are 3 such occurrences: (3173), (173), and (173)."),
        (4, "GK", "<p>Which colour represents Asia in Olympic Rings? / অলিম্পিকের প্রতীকে পাঁচটি রিংয়ের কোনটি এশিয়া মহাদেশের প্রতিনিধিত্ব স্বরূপ?</p>", ["(A) Black / কালো", "(B) Blue / নীল", "(C) Green / সবুজ", "(D) Yellow / হলুদ"], "D", "In the Olympic rings symbol, Yellow represents Asia, Blue represents Europe, Black represents Africa, Green represents Oceania/Australia, and Red represents America."),
        (5, "GK", "<p>What is SVEEP Program? / SVEEP Program কী?</p>", ["(A) Senior Voters Education and Electoral Participation Program", "(B) Systematic Voters' Education and Electoral Participation Program", "(C) Senior Voters Encouragement and Electoral Participation Program", "(D) Systematic Voters' Encouragement and Electoral Participation Program"], "B", "SVEEP stands for Systematic Voters' Education and Electoral Participation Program, a flagship program of the Election Commission of India for voter education."),
        (6, "History", "<p>Who led the rebels in Kanpur during the Great Revolt of 1857? / 1857 সালের মহাবিদ্রোহের সময় কানপুরে কে বিদ্রোহীদের নেতৃত্ব দিয়েছিলেন?</p>", ["(A) Nana Saheb / নানা সাহেব", "(B) Bahadur Shah II / দ্বিতীয় বাহাদুর শাহ", "(C) Rani Lakshmibai / রানী লক্ষ্মী বাই", "(D) Begum Hazrat Mahal / বেগম হজরত মহল"], "A", "Nana Saheb (Dhundhupant) led the revolt of 1857 in Kanpur."),
        (7, "Math", "<p>A dog makes 4 jumps in the time it takes a cat to make 5 jumps, but the dog's 3 jumps are equal to the cat's 4 jumps. What is the speed ratio of the cat and the dog? / একটি বিড়ালের 5 লাফ যেতে যে সময় লাগে সেই সময়ে একটি কুকুর 4 লাফ যায়, কিন্তু কুকুরের 3 লাফ বিড়ালের 4 লাফের সমান। বিড়াল ও কুকুরটির দ্রুতির অনুপাত কত?</p>", ["(A) 15 : 11", "(B) 15 : 16", "(C) 16 : 15", "(D) 11 : 15"], "B", "Ratio of Cat to Dog speed = (5 * 3) : (4 * 4) = 15 : 16."),
        (8, "Sports", "<p>2023 Men's Cricket World Cup will be held in which country? / 2023 সালের পুরুষদের ক্রিকেট বিশ্বকাপ কোন দেশে অনুষ্ঠিত হবে?</p>", ["(A) India / ভারতবর্ষ", "(B) Australia / অস্ট্রেলিয়া", "(C) South Africa / দক্ষিণ আফ্রিকা", "(D) England / ইংল্যান্ড"], "A", "The 2023 ICC Men's Cricket World Cup was hosted entirely by India."),
        (9, "Math", "<p>The profit earned after selling an article for Rs. 1,754 is the same as the loss incurred after selling the article for Rs. 1,492. What is the cost price of article? / একটি দ্রব্য 1754 টাকায় বিক্রি করলে যে টাকা লাভ হয়, 1492 টাকায় বিক্রি করলে সেই পরিমাণ টাকাই ক্ষতি হয়। তাহলে দ্রব্যটির ক্রয়মূল্য কত?</p>", ["(A) Rs. 1695 / 1695 টাকা", "(B) Rs. 1523 / 1523 টাকা", "(C) Rs. 1623 / 1623 টাকা", "(D) Rs. 1589 / 1589 টাকা"], "C", "Cost Price = (1754 + 1492) / 2 = 3246 / 2 = Rs. 1623."),
        (10, "Reasoning", "<p>Laxman went 15 km to the west from my house, then turned left and walked 20 km. He then turned East and walked 25 km and finally turning left covered 20 km. How far was he from my house? / লক্ষণ আমার বাড়ি থেকে 15 কিমি পশ্চিমে গেল। তারপর বাঁ দিকে ঘুরে 20 কিমি হাঁটল। সে এরপর পূর্বদিকে 25 কিমি গেল এবং শেষে বাঁ দিকে ঘুরে 20 কিমি গেল। বর্তমানে লক্ষণ আমার বাড়ি থেকে কত দূরে রয়েছে?</p>", ["(A) 80 km / 80 কিমি", "(B) 5 km / 5 কিমি", "(C) 40 km / 40 কিমি", "(D) 10 km / 10 কিমি"], "D", "Net East displacement = 25 - 15 = 10 km. Net North-South displacement = 20 - 20 = 0 km. Distance from home = 10 km."),
        (11, "Math", "<p>In what ratio must a grocer mix two varieties of pulses costing Rs.15 and Rs.12 per kg respectively so as to get a mixture worth Rs. 16.50 kg so that he will make a profit of 20%? / কোনো দোকানদার কী অনুপাতে প্রতি কেজি 15 টাকা ও প্রতি কেজি 12 টাকা দামের ডাল মিশ্রণ করে প্রতি কেজি ডাল 16.50 টাকায় বিক্রি করলে তার 20% লাভ হবে?</p>", ["(A) 7 : 3", "(B) 3 : 7", "(C) 7 : 5", "(D) 5 : 7"], "C", "Mean CP = 16.50 / 1.20 = Rs. 13.75. Using Alligation: (13.75 - 12) : (15 - 13.75) = 1.75 : 1.25 = 7 : 5."),
        (12, "Culture", "<p>Which actor was popularly known as \"Dadamani\" in the world of Hindi cinema? / হিন্দি সিনেমা জগতে কোন অভিনেতা \"দাদামণি\" নামে জনপ্রিয় ছিলেন?</p>", ["(A) Rajesh Khanna / রাজেশ খান্না", "(B) Dev Anand / দেব আনন্দ", "(C) Utpal Dutt / উৎপল দত্ত", "(D) Ashok Kumar / অশোক কুমার"], "D", "Veteran actor Ashok Kumar (Kumudlal Ganguly) was fondly known as 'Dadamani'."),
        (13, "Math", "<p>If O is the circumcenter of triangle ABC and ∠BAC = 50°, then ∠OBC = ? / ABC ত্রিভুজের O পরিবৃত্তের কেন্দ্র এবং ∠BAC = 50° হলে, ∠OBC = ?</p>", ["(A) 50°", "(B) 60°", "(C) 40°", "(D) 30°"], "C", "Central angle ∠BOC = 2 * ∠BAC = 100°. In isosceles △OBC (OB = OC), ∠OBC = (180° - 100°)/2 = 40°."),
        (14, "History", "<p>Which Mughal emperor introduced Din-i Ilahi? / কোন মোঘল সম্রাট দীন-ই-ইলাহি প্রচলন করেন?</p>", ["(A) Shah Jahan / শাহজাহান", "(B) Humayun / হুমায়ুন", "(C) Jahangir / জাহাঙ্গীর", "(D) Akbar / আকবর"], "D", "Mughal Emperor Akbar introduced Din-i Ilahi in 1582."),
        (15, "Reasoning", "<p>What will be written in place of the question mark: A, I, P, V, A, E, ? / প্রশ্নবোধক স্থানে কী বসবে? A, I, P, V, A, E, ?</p>", ["(A) H", "(B) E", "(C) G", "(D) F"], "A", "Letter positions: A(1) + 8 = I(9), I(9) + 7 = P(16), P(16) + 6 = V(22), V(22) + 5 = A(27/1), A(1) + 4 = E(5), E(5) + 3 = H(8)."),
        (16, "Reasoning", "<p>The word PORTER is written as MBNZQN in a certain code language, but how to write REPORT? / PORTER শব্দটিকে সাংকেতিক ভাষায় MBNZQN লেখা হয়, তবে REPORT কিভাবে লেখা হবে?</p>", ["(A) NQBMNZ", "(B) NQMNBZ", "(C) NBQMNZ", "(D) NQMBNZ"], "D", "Direct letter mapping: P->M, O->B, R->N, T->Z, E->Q, R->N. Thus R-E-P-O-R-T becomes N-Q-M-B-N-Z."),
        (17, "Math", "<p>Ajay and Anil are joint venture partners. Ajay employs Rs. 8000 for 8 months in business and Anil employs money for the remaining 4 months. If Anil gets 20% of profit at the end of the year, how much money did Anil invest? / অজয় ও অনিল একটি যৌথ ব্যবসার অংশীদার। অজয় ব্যবসায় 8000 টাকা 8 মাসের জন্য নিয়োগ করে এবং অনিল বাকি 4 মাসের জন্য টাকা নিয়োগ করে। বৎসরান্তে অনিল যদি লাভের 20% পায়, তবে অনিল কত টাকা নিয়োগ করেছিল?</p>", ["(A) Rs. 5400 / 5400 টাকা", "(B) Rs. 2000 / 2000 টাকা", "(C) Rs. 3000 / 3000 টাকা", "(D) Rs. 4000 / 4000 টাকা"], "D", "Profit ratio Ajay:Anil = 80:20 = 4:1. Investment ratio = (8000 * 8) / (x * 4) = 64000 / 4x = 4/1 => 16x = 64000 => x = Rs. 4000."),
        (18, "Math", "<p>How many balls each of radius 1 cm can be made by melting a bigger ball whose radius is 8 cm? / 8 সেমি ব্যাসার্ধ বিশিষ্ট একটি লোহার গোলককে গলিয়ে কতগুলি 1 সেমি ব্যাসার্ধের গোলক পাওয়া যাবে?</p>", ["(A) 321", "(B) 418", "(C) 512", "(D) 614"], "C", "Number of balls = (4/3 * π * 8^3) / (4/3 * π * 1^3) = 8^3 / 1^3 = 512."),
        (19, "Computer", "<p>What is C++? / C++ কী?</p>", ["(A) An input device / একটি ইনপুট ডিভাইস", "(B) An operating system / একটি অপারেটিং সিস্টেম", "(C) An assembly language / একটি অ্যাসেম্বলি ল্যাঙ্গুয়েজ", "(D) A programming language / একটি প্রোগ্রামিং ল্যাঙ্গুয়েজ"], "D", "C++ is a high-level general-purpose programming language created by Bjarne Stroustrup."),
        (20, "Sports", "<p>2020 Tokyo Olympics javelin gold medalist Neeraj Chopra hails from which of the following places? / 2020 টোকিও অলিম্পিকে জ্যাভলিনে স্বর্ণপদকজয়ী নীরজ চোপড়া নিম্নোক্ত কোন স্থানের অধিবাসী?</p>", ["(A) Gurugram / গুরুগ্রাম", "(B) Sonipat / সোনিপথ", "(C) Panipat / পানিপথ", "(D) Ambala / আম্বালা"], "C", "Neeraj Chopra belongs to Khandra village in Panipat district of Haryana."),
        (21, "Geography", "<p>Buxa Tiger Conservation Project is located in which district of West Bengal? / বক্সা ব্যাঘ্র সংরক্ষণ প্রকল্প পশ্চিমবঙ্গের কোন জেলায় অবস্থিত?</p>", ["(A) Jalpaiguri / জলপাইগুড়ি", "(B) Alipurduar / আলিপুরদুয়ার", "(C) Darjeeling / দার্জিলিং", "(D) South 24 Parganas / দক্ষিণ 24 পরগনা"], "B", "Buxa Tiger Reserve is located in Alipurduar district of West Bengal."),
        (22, "Culture", "<p>In which state Kalamkari painting originated? / কলমকারি চিত্রশৈলী কোন রাজ্যে উৎপত্তি হয়েছিল?</p>", ["(A) Rajasthan / রাজস্থান", "(B) Andhra Pradesh / অন্ধ্রপ্রদেশ", "(C) Gujarat / গুজরাট", "(D) Madhya Pradesh / মধ্যপ্রদেশ"], "B", "Kalamkari style of hand-painted or block-printed cotton textile originated in Andhra Pradesh."),
        (23, "Reasoning", "<p>Which of the following is the correct mirror reflection of the given word 'EFFECTIVE'? / নীচের কোনটি প্রদত্ত শব্দ 'EFFECTIVE'-এর সঠিক প্রতিবিম্ব?</p>", ["(A) ƎVI⊥ƆƎℲℲƎ (Vertical Flip)", "(B) ƎVI⊥ƆƎℲℲƎ", "(C) ƎVI⊥ƆƎℲℲƎ (Horizontal Mirror Image)", "(D) EVITCEFFE"], "B", "The mirror reflection of the word EFFECTIVE reverses the letter sequence with horizontally inverted letters."),
        (24, "History", "<p>Which mahajanapada ruler was Ajatashatru? / অজাতশত্রু কোন মহাজনপদের অধিপতি ছিলেন?</p>", ["(A) Anga / অঙ্গ", "(B) Kosala / কোশল", "(C) Magadha / মগধ", "(D) Avanti / অবন্তী"], "C", "Ajatashatru was a prominent ruler of the Haryanka dynasty of Magadha."),
        (25, "Math", "<p>There were 35 students in a hostel. Due to admission of 7 new students, the expenses of the mess were increased by Rs. 42 per day, while the average expenditure per head diminished by Rs. 1. What was the original expenditure of the mess? / একটি হোস্টেলে 35 জন ছাত্র ছিল। যদি ছাত্রের সংখ্যা আরও 7 জন বৃদ্ধি পায় তবে হোস্টেলের মেসের খরচ প্রতিদিন 42 টাকা বৃদ্ধি পায়, কিন্তু মাথাপিছু খরচের গড় 1 টাকা করে কমে যায়। তাহলে প্রথমে প্রতিদিনের গড় খরচ কত ছিল?</p>", ["(A) Rs. 420 / 420 টাকা", "(B) Rs. 400 / 400 টাকা", "(C) Rs. 433 / 433 টাকা", "(D) Rs. 430 / 430 টাকা"], "A", "Let original per head avg = Rs. x. Total original expenditure = 35x. 42(x - 1) - 35x = 42 => 7x = 84 => x = 12. Original expenditure = 35 * 12 = Rs. 420."),
        (26, "Reasoning", "<p>Identify the correct option matching the relation: Carnivorous : Tiger : Wolf / সঠিক বিকল্পটি চিহ্নিত করুন: Carnivorous : Tiger : Wolf</p>", ["(A) Player : Master : Manager", "(B) Mango : Banana : Fruit", "(C) Student : Boy : Girl", "(D) Cat : Cow : Milk"], "C", "Tiger and Wolf both fall under the Carnivorous category. Similarly, Boy and Girl both can fall under Student."),
        (27, "Sports", "<p>Who got Dronacharya Award in archery in 2020? / 2020 সালে তিরন্দাজিতে দ্রোণাচার্য পুরস্কার কে লাভ করেন?</p>", ["(A) Shiva Singha / শিব সিংহ", "(B) Yashpal Rana / যশপাল রানা", "(C) Dharmendra Tiwari / ধর্মেন্দ্র তিওয়ারি", "(D) Naresh Kumar / নরেশ কুমার"], "C", "Dharmendra Tiwari received the Dronacharya Award in Archery in 2020."),
        (28, "Reasoning", "<p>Three positions of a dice are given. Based on them find out which number is found opposite the number 2 in the given dice. / একটি ছক্কার তিনটি অবস্থান দেওয়া আছে। এর উপর ভিত্তি করে 2 নম্বরের বিপরীতে কি আসবে তা নির্ণয় করুন:</p>", ["(A) 5", "(B) 3", "(C) 6", "(D) 4"], "C", "Comparing dice position 1 (6, 1, 4) and position 3 (4, 1, 2): faces 1 and 4 are common. Therefore, 6 must be opposite to 2."),
        (29, "History", "<p>Who is called the father of Bengal Renaissance? / বাংলার রেনেসাঁসের জনক বলে কাকে অভিহিত করা হয়?</p>", ["(A) Raja Rammohan Roy / রাজা রামমোহন রায়", "(B) Pandit Iswarchandra Vidyasagar / পণ্ডিত ঈশ্বরচন্দ্র বিদ্যাসাগর", "(C) Michael Madhusudan Dutta / মাইকেল মধুসূদন দত্ত", "(D) Prince Dwarkanath Tagore / প্রিন্স দ্বারকানাথ ঠাকুর"], "A", "Raja Rammohan Roy is widely regarded as the Father of the Bengal Renaissance."),
        (30, "Math", "<p>If the average of 6 numbers is 17, what is the sum of the numbers? / 6 টি সংখ্যার গড় যদি 17 হয় তবে সংখ্যাগুলির যোগফল কত?</p>", ["(A) 112", "(B) 102", "(C) 132", "(D) 122"], "B", "Sum of 6 numbers = 6 * 17 = 102."),
        (31, "Science", "<p>Which of the following metals is present in chlorophyll? / ক্লোরোফিলে নিম্নোক্ত কোন ধাতুটি বর্তমান?</p>", ["(A) Barium / বেরিয়াম", "(B) Beryllium / বেরিলিয়াম", "(C) Magnesium / ম্যাগনেসিয়াম", "(D) Calcium / ক্যালসিয়াম"], "C", "Magnesium (Mg) is the central metal ion present in chlorophyll molecules."),
        (32, "Reasoning", "<p>Ravi's birthday is Wednesday. If Gopal's birthday is 50 days after Ravi's birthday, then when is Gopal's birthday? / রবির জন্মদিন বুধবার। গোপালের জন্মদিন রবির জন্মদিনের 50 দিন পর হলে, গোপালের জন্মদিন কবে?</p>", ["(A) Saturday / শনিবার", "(B) Tuesday / মঙ্গলবার", "(C) Thursday / বৃহস্পতিবার", "(D) Friday / শুক্রবার"], "C", "50 days = 7 weeks + 1 odd day. Wednesday + 1 day = Thursday."),
        (33, "Math", "<p>If each side of a cube is decreased by 10%, by what percentage will its lateral surface area be reduced? / কোনো ঘনকের প্রতিটি বাহু যদি 10% করে কমানো হয়, তবে তার পার্শ্বতলের ক্ষেত্রফল কত শতাংশ কমবে?</p>", ["(A) 15%", "(B) 19%", "(C) 16%", "(D) 21%"], "B", "New side = 0.9x. New surface area = 4*(0.9x)^2 = 4*0.81x^2 = 81% of original. Area reduced = 100% - 81% = 19%."),
        (34, "History", "<p>In which year was All India Kisan Sabha established? / কত সালে সর্বভারতীয় কিষান সভা প্রতিষ্ঠিত হয়েছিল?</p>", ["(A) 1916", "(B) 1926", "(C) 1936", "(D) 1946"], "C", "All India Kisan Sabha was formed in April 1936 at Lucknow, presided over by Swami Sahajanand Saraswati."),
        (35, "Math", "<p>In the triangle below, if AC = 20 m, AB = x m and BC = (50 - x) m, then AB = ? / নীচের ত্রিভুজে, যদি AC = 20 মিটার, AB = x মিটার এবং BC = (50 - x) মিটার হয়, তবে AB = ?</p>", ["(A) 30 m / 30 মিটার", "(B) 29 m / 29 মিটার", "(C) 25 m / 25 মিটার", "(D) 27 m / 27 মিটার"], "B", "In right triangle ABC: AB^2 = AC^2 + BC^2 => x^2 = 20^2 + (50 - x)^2 => x^2 = 400 + 2500 - 100x + x^2 => 100x = 2900 => x = 29 meters."),
        (36, "GK", "<p>Who won the Nobel Prize in Literature in 2020? / 2020 সালে সাহিত্যে নোবেল পুরস্কার কে জিতেছিলেন?</p>", ["(A) Louise Glück / লুইস গ্লাক", "(B) Bob Dylan / বব ডিলান", "(C) Peter Handke / পিটার হ্যান্ডকে", "(D) Kazuo Ishiguro / কাজুও ইশিগুরো"], "A", "American poet Louise Glück won the 2020 Nobel Prize in Literature."),
        (37, "Reasoning", "<p>Which of the following words cannot be formed using the letters of the word TRANSFERENCE? / TRANSFERENCE শব্দটির বর্ণগুলির সাহায্যে নীচের শব্দগুলির মধ্যে কোন শব্দটি তৈরি করা যাবে না?</p>", ["(A) TENCE", "(B) FRANCE", "(C) FACTOR", "(D) ENTRANCE"], "C", "The word FACTOR cannot be formed because there is no letter 'O' in TRANSFERENCE."),
        (38, "Geography", "<p>10° channel passes between which two of the following? / 10° চ্যানেল নিম্নোক্ত কোন দুটির মাঝখান দিয়ে গেছে?</p>", ["(A) Rameswaram and Jaffna Peninsula / রামেশ্বরম ও জাফনা উপদ্বীপ", "(B) Andaman and Nicobar Islands / আন্দামান ও নিকোবর দ্বীপপুঞ্জ", "(C) Great Nicobar and Sumatra Islands / গ্রেট নিকোবর এবং সুমাত্রা দ্বীপপুঞ্জ", "(D) South Andaman and Little Andaman Islands / দক্ষিণ আন্দামান ও লিটল আন্দামান দ্বীপপুঞ্জ"], "B", "The 10° Channel separates the Andaman Islands from the Nicobar Islands in the Bay of Bengal."),
        (39, "Math", "<p>The difference between compound interest and simple interest on an amount of Rs.15,000 for 2 years is Rs. 96. What is the rate of interest per annum? / 15,000 টাকার 2 বছরের একই সুদের হারে চক্রবৃদ্ধি সুদ এবং সরল সুদের অন্তর হল 96 টাকা। সুদের হার বার্ষিক কত ছিল?</p>", ["(A) 6%", "(B) 10%", "(C) 12%", "(D) 8%"], "D", "Diff = P*(r/100)^2 => 96 = 15000 * r^2 / 10000 => r^2 = 64 => r = 8%."),
        (40, "Sports", "<p>Tokyo Olympic medalist Lovlina Borgohain is a resident of which state? / টোকিও অলিম্পিকে পদকজয়ী লাভলীনা বরগোহাঁই কোন রাজ্যের বাসিন্দা?</p>", ["(A) Mizoram / মিজোরাম", "(B) Tripura / ত্রিপুরা", "(C) Assam / আসাম", "(D) Manipur / মনিপুর"], "C", "Boxer Lovlina Borgohain hails from Golaghat district in Assam."),
        (41, "Math", "<p>If the sum of two numbers is 27 and the product is 182, what is the smaller number? / দুটি সংখ্যার যোগফল 27 এবং গুণফল 182 হলে, ছোট সংখ্যাটি কত?</p>", ["(A) 16", "(B) 12", "(C) 14", "(D) 13"], "D", "x + y = 27, xy = 182 => x(27 - x) = 182 => x^2 - 27x + 182 = 0 => (x - 13)(x - 14) = 0. Smaller number is 13."),
        (42, "WBSchemes", "<p>In which year was the 'Kanyashree' project launched in West Bengal? / কোন বছর পশ্চিমবঙ্গের \"কন্যাশ্রী\" প্রকল্প চালু হয়েছিল?</p>", ["(A) 2014", "(B) 2012", "(C) 2013", "(D) 2011"], "C", "The Kanyashree Prakalpa was launched by the West Bengal government in 2013."),
        (43, "History", "<p>Inhabitants of which civilization introduced the first drainage system? / কোন সভ্যতার অধিবাসীরা প্রথম নিকাশি ব্যবস্থার প্রচলন করেন?</p>", ["(A) Mesopotamia Civilization / মেসোপটেমিয়া সভ্যতা", "(B) Egyptian Civilization / মিশরীয় সভ্যতা", "(C) Indus Civilization / সিন্ধু সভ্যতা", "(D) Chinese Civilization / চীনা সভ্যতা"], "C", "The Harappan / Indus Valley Civilization was famous for its advanced covered underground drainage system."),
        (44, "Math", "<p>The ratio of the number of 50 paisa, 25 paisa and 10 paisa coins in a bag is 5 : 8 : 3 and the total amount is Rs. 144. How many 50 paisa coins are there? / একটি ব্যাগে থাকা 50 পয়সা, 25 পয়সা ও 10 পয়সার মুদ্রার সংখ্যার অনুপাত 5 : 8 : 3 এবং মোট টাকার পরিমাণ 144 টাকা। 50 পয়সার মুদ্রার সংখ্যা কয়টি?</p>", ["(A) 150", "(B) 140", "(C) 200", "(D) 175"], "A", "Value = 0.50(5x) + 0.25(8x) + 0.10(3x) = 2.5x + 2x + 0.3x = 4.8x = 144 => x = 30. Number of 50 paisa coins = 5 * 30 = 150."),
        (45, "Polity", "<p>National Planning Commission was established in which year? / জাতীয় প্ল্যানিং কমিশন কোন সালে স্থাপিত হয়?</p>", ["(A) 1949", "(B) 1951", "(C) 1948", "(D) 1950"], "D", "The Planning Commission of India was established on 15 March 1950."),
        (46, "Reasoning", "<p>How many triangles are there in the picture below? / নিচের ছবিটিতে কতগুলি ত্রিভুজ আছে?</p>", ["(A) 14", "(B) 11", "(C) 13", "(D) 12"], "C", "Counting all individual and composite triangles in the pyramid structure gives 13 triangles."),
        (47, "Reasoning", "<p>Introducing a man, a woman said, \"He is the only son of my mother's mother\". How is the woman related to the man? / ভদ্রলোককে দেখিয়ে মহিলা বললেন, “উনি আমারায়ের মার একমাত্র পুত্র”। ভদ্রমহিলা ভদ্রলোকের কে হন?</p>", ["(A) Niece / ভাগ্নী বা বোনঝি", "(B) Mother / মা", "(C) Sister / বোন", "(D) Aunt / কাকিমা/মাসিমা"], "A", "Mother's mother = Maternal Grandmother. Her only son = Maternal Uncle. The woman is the uncle's sister's daughter, i.e., Niece."),
        (48, "Reasoning", "<p>If the following words are arranged in alphabetical order, which word will come in the middle? Electric, Elector, Electrode, Elect, Electron / নীচের শব্দগুলিকে যদি অভিধানগত ভাবে বর্ণমালা অনুযায়ী সাজানো হয়, তাহলে কোন শব্দটি মাঝখানে থাকবে?</p>", ["(A) Elect", "(B) Electric", "(C) Electron", "(D) Elector"], "B", "Alphabetical sequence: Elect -> Elector -> Electric -> Electrode -> Electron. The middle word (3rd) is Electric."),
        (49, "GK", "<p>Full form of HIDCO - / HIDCO -র সম্পূর্ণ রূপ কোনটি?</p>", ["(A) Housing Infrastructure Development Construction Officer", "(B) Housing Improvement Development Corporation", "(C) Housing Infrastructure Development Corporation", "(D) Housing Interest Deduction Controlling Officer"], "C", "HIDCO stands for West Bengal Housing Infrastructure Development Corporation."),
        (50, "Reasoning", "<p>What is the picture that fills the question mark? / নীচের কোন ছবিটি প্রশ্নবোধক স্থানে বসলে মূল ছবিটি সম্পূর্ণ হবে?</p>", ["(A) Option A", "(B) Option B", "(C) Option C", "(D) Option D"], "D", "Option D correctly completes the symmetric pattern and triangle orientation of the figure."),
        (51, "GK", "<p>What is the name of the Vice President of the United States? (in 2021) / মার্কিন যুক্তরাষ্ট্রের উপরাষ্ট্রপতির নাম কি?</p>", ["(A) Dick Cheney / ডিক চেনি", "(B) Mike Pence / মাইক পেন্স", "(C) Kamala Harris / কমলা হ্যারিস", "(D) Joe Biden / জো বাইডেন"], "C", "Kamala Harris became the first female Vice President of the United States."),
        (52, "Reasoning", "<p>What will be written in place of the question mark: Top = ?, Left = 14, Center = 154, Right = 196, Bottom = 121 / প্রশ্নবোধক স্থানে কি বসবে?</p>", ["(A) 17", "(B) 11", "(C) 15", "(D) 13"], "B", "14^2 = 196 (Right), 11^2 = 121 (Bottom), 14 * 11 = 154 (Center). So top question mark = 11."),
        (53, "GK", "<p>Which is the longest bridge in West Bengal? / পশ্চিমবঙ্গের দীর্ঘতম সেতু কোনটি?</p>", ["(A) Rabindra Bridge / রবীন্দ্র সেতু", "(B) Farakka Bridge / ফারাক্কা সেতু", "(C) Bhutani Bridge / ভূতনি সেতু", "(D) Joyee Bridge / জয়ী সেতু"], "D", "Joyee Setu (Joyee Bridge) across the Teesta River in Cooch Behar is the longest river bridge in West Bengal (2.7 km)."),
        (54, "Polity", "<p>On which of the following dates was the Constitution of India adopted? / নিম্নোক্ত কোন তারিখে ভারতের সংবিধান গৃহীত হয়েছিল?</p>", ["(A) December 31, 1950", "(B) November 26, 1949", "(C) January 26, 1949", "(D) January 26, 1950"], "B", "The Constitution of India was adopted by the Constituent Assembly on 26 November 1949 and came into force on 26 January 1950."),
        (55, "Math", "<p>If x tan 45° sin 30° = cos 30° tan 30°, then what is the value of x? / যদি x tan 45° sin 30° = cos 30° tan 30° হয়, তবে x - এর মান কত?</p>", ["(A) 1", "(B) √3", "(C) √3/2", "(D) 1/√2"], "A", "x * 1 * (1/2) = (√3/2) * (1/√3) => x/2 = 1/2 => x = 1."),
        (56, "History", "<p>Which session of the Indian National Congress was presided over by Mahatma Gandhi? / ভারতীয় জাতীয় কংগ্রেসের একমাত্র কোন অধিবেশনে মহাত্মা গান্ধী সভাপতিত্ব করেছিলেন?</p>", ["(A) Karachi / করাচি", "(B) Amaravati / অমরাবতী", "(C) Nagpur / নাগপুর", "(D) Belgaum / বেলগাঁও"], "D", "Mahatma Gandhi presided over the 39th session of INC held at Belgaum in 1924."),
        (57, "Reasoning", "<p>What will be written in place of the question mark: 48, 24, 96, 48, 192, ? / প্রশ্নবোধক স্থানে কি বসবে? 48, 24, 96, 48, 192, ?</p>", ["(A) 98", "(B) 76", "(C) 96", "(D) 90"], "C", "Sequence alternates: ÷2, ×4, ÷2, ×4, ÷2. So 192 ÷ 2 = 96."),
        (58, "Culture", "<p>Which classical dance is named after the village where it originated? / নিম্নোক্ত কোন শাস্ত্রীয় নৃত্যশৈলীর নাম যে গ্রাম থেকে তার সৃষ্টি তার নামে নামকরণ করা হয়েছে?</p>", ["(A) Mohiniattam / মোহিনীআট্টম", "(B) Kuchipudi / কুচিপুড়ি", "(C) Bharatanatyam / ভারতনাট্যম", "(D) Kathakali / কথাকলি"], "B", "Kuchipudi is named after Kuchipudi village in Krishna district of Andhra Pradesh."),
        (59, "Science", "<p>Which lens is used as a projector in cinema halls? / সিনেমা হলে প্রজেক্টর রূপে কোন লেন্স ব্যবহার ব্যবহৃত হয়?</p>", ["(A) Meniscus lens / মেনিসকাস লেন্স", "(B) Convex lens / উত্তল লেন্স", "(C) Zoom lens / জুম লেন্স", "(D) Concave lens / অবতল লেন্স"], "B", "Convex lens is used in cinema projectors to produce a real and enlarged image on the screen."),
        (60, "Math", "<p>X alone can do a piece of work in 20 days and B alone completes the work in 30 days. If both work together, in how many days will the work be completed? / X একা একটি কাজ 20 দিনে করতে পারে। আবার B একা সেই কাজ 30 দিনে সম্পূর্ণ করে। দুজনে একসাথে কাজ করলে ওই কাজ কত দিনে সম্পন্ন হবে?</p>", ["(A) 10 days / 10 দিন", "(B) 16 days / 16 দিন", "(C) 15 days / 15 দিন", "(D) 12 days / 12 দিন"], "D", "Time together = (20 * 30) / (20 + 30) = 600 / 50 = 12 days."),
        (61, "Reasoning", "<p>Find the odd word: Tiny, Big, Trivial, Small / অসম শব্দটি চিহ্নিত করুন: Tiny, Big, Trivial, Small</p>", ["(A) Tiny", "(B) Big", "(C) Trivial", "(D) Small"], "B", "Tiny, Trivial, and Small all signify minor/small magnitude, whereas Big is opposite in meaning."),
        (62, "Science", "<p>Which of the following gases are contained in the L.P.G. cylinder? / L.P.G. সিলিন্ডারে নিম্নোক্ত কোন গ্যাস থাকে?</p>", ["(A) Isobutane and propane", "(B) Butane and Isobutane", "(C) Butane and propane", "(D) Butane, isobutane and propane"], "C", "LPG consists mainly of propane and butane."),
        (63, "Reasoning", "<p>What will be written in place of the question mark: BMX, DNW, FOV, ? / প্রশ্নবোধক স্থানে কি বসবে? BMX, DNW, FOV, ?</p>", ["(A) HPT", "(B) GHO", "(C) HPU", "(D) GPS"], "C", "1st letters: B->D->F->H (+2). 2nd letters: M->N->O->P (+1). 3rd letters: X->W->V->U (-1). Result = HPU."),
        (64, "Science", "<p>If there was no atmosphere around the earth, the earth would have been / যদি পৃথিবীর চারদিকে বায়ুমণ্ডল না থাকত, তবে পৃথিবী কেমন হত?</p>", ["(A) too warm / অত্যন্ত উষ্ণ", "(B) slightly warm / সামান্য উষ্ণ", "(C) slight cooling / সামান্য শীতল", "(D) excessive cooling / অত্যন্ত শীতল"], "D", "Without atmosphere, heat would escape instantly into space, resulting in extreme cold."),
        (65, "Reasoning", "<p>What will be written in place of the question mark: 3F, 6G, 11I, 18L, ? / প্রশ্নবোধক স্থানে কি বসবে? 3F, 6G, 11I, 18L, ?</p>", ["(A) 27Q", "(B) 27P", "(C) 25P", "(D) 25N"], "B", "Numbers: 3(+3)6(+5)11(+7)18(+9)27. Letters: F(+1)G(+2)I(+3)L(+4)P. Result = 27P."),
        (66, "History", "<p>Buddhist book 'Tripitaka' is written in which script/language? / বৌদ্ধ ধর্ম গ্রন্থ ‘ত্রিপিটক’ কোন ভাষায় লেখা?</p>", ["(A) Hindi / হিন্দি", "(B) Pali / পালি", "(C) Sanskrit / সংস্কৃতি", "(D) Prakrit / প্রাকৃত"], "B", "The sacred scriptures of Theravada Buddhism, Tripitaka, are written in Pali."),
        (67, "Science", "<p>Which of the following organs is not controlled by the autonomic nervous system? / নিম্নোক্ত কোন অঙ্গটি স্বয়ংক্রিয় স্নায়ুতন্ত্র দ্বারা নিয়ন্ত্রিত নয়?</p>", ["(A) Gland / গ্রন্থি", "(B) Cardiac apparatus / হৃদযন্ত্র", "(C) Eyes / চক্ষু", "(D) Uterus / জরায়ু"], "A", "Glandular secretions are controlled by endocrine/hormonal systems as well as local mechanisms."),
        (68, "Math", "<p>LCM and HCF of two numbers are 315 and 7 respectively. If one number is 35, what is the other number? / দুটি সংখ্যার ল.সা.গু এবং গ.সা.গু হল যথাক্রমে 315 এবং 7। যদি একটি সংখ্যা 35 হয়, তবে অপর সংখ্যাটি কত?</p>", ["(A) 35", "(B) 55", "(C) 63", "(D) 105"], "C", "Other number = (LCM * HCF) / Given number = (315 * 7) / 35 = 63."),
        (69, "Math", "<p>If a sum of money is increased by 1/7 becomes Rs. 40, what was the original sum of money? / কোনো টাকা তার 1/7 অংশ বৃদ্ধি পেয়ে 40 টাকা হলে, মূল টাকার পরিমাণ কত ছিল?</p>", ["(A) Rs. 37 / 37 টাকা", "(B) Rs. 35 / 35 টাকা", "(C) Rs. 25 / 25 টাকা", "(D) Rs. 30 / 30 টাকা"], "B", "New sum = 1 + 1/7 = 8/7 of original. 8/7 * x = 40 => x = 40 * 7/8 = Rs. 35."),
        (70, "GK", "<p>What is the state animal of West Bengal? / পশ্চিমবঙ্গের রাজ্য পশু কি?</p>", ["(A) Asian palm civet / গন্ধগোকুল", "(B) Royal Bengal Tiger / রয়্যাল বেঙ্গল টাইগার", "(C) Fishing cat / মেছো বিড়াল", "(D) Gharial / মেছো কুমির"], "C", "Fishing Cat (Prionailurus viverrinus) is the official state animal of West Bengal."),
        (71, "Reasoning", "<p>A is brother of B. B is daughter of C and D is father of A. Then how is C related to D? / A, B- এর ভাই। B, C- এর কন্যা এবং D হলো A- র পিতা। তাহলে C, D - এর কে হন?</p>", ["(A) Grand Daughter / নাতনি", "(B) Husband / স্বামী", "(C) Grandmother / ঠাকুরমা", "(D) Wife / স্ত্রী"], "D", "Since A and B are siblings, D is father of both. B is daughter of C. Therefore, C is mother of B and wife of D."),
        (72, "History", "<p>Which was the important port of Indus civilization? / সিন্ধু সভ্যতার উল্লেখযোগ্য বন্দর কোনটি ছিল?</p>", ["(A) Lothal / লোথাল", "(B) Kalibangan / কালিবঙ্গান", "(C) Surkotada / সুরকোটারা", "(D) Dholavira / ঢোলাভিরা"], "A", "Lothal in Gujarat was a prominent port city of the Indus Valley Civilization."),
        (73, "Reasoning", "<p>If, K stands for '-', L stands for '÷', M stands for '+' and D stands for '×', then 117 L 3 K 5 M 12 D 8 = ? / যদি, K মানে ' - ', L মানে ' ÷ ', M মানে '+' এবং D মানে '×' হয়, তবে 117 L 3 K 5 M 12 D 8 = ?</p>", ["(A) 93.6", "(B) 368", "(C) 130", "(D) 256"], "C", "117 ÷ 3 - 5 + 12 * 8 = 39 - 5 + 96 = 130."),
        (74, "Science", "<p>What is the unit of lens power? / লেন্সের ক্ষমতার একক কি?</p>", ["(A) Watts / ওয়াট", "(B) Meters / মিটার", "(C) Diopter / ডায়প্টর", "(D) Centimeter / সেন্টিমিটার"], "C", "Diopter (D) is the unit of optical power of a lens."),
        (75, "GK", "<p>Which country gave the name \"Amphan\"? / \"Amphan\" নামটি কোন দেশ দিয়েছিল?</p>", ["(A) Pakistan / পাকিস্তান", "(B) Bangladesh / বাংলাদেশ", "(C) Thailand / থাইল্যান্ড", "(D) Nepal / নেপাল"], "C", "The name 'Amphan' for the super cyclone in Bay of Bengal was given by Thailand."),
        (76, "Reasoning", "<p>Which sequence of letters when placed in the blanks one after the other will complete the given letter series? a_bc_a_bcda_ccd_bcd_ / নীচের সিরিজটির শূন্যস্থানগুলি পরপর কোন বর্ণমালা দিয়ে পূর্ণ করলে তা একটি নির্দিষ্ট নিয়ম মেনে চলবে?</p>", ["(A) adbcad", "(B) abddbd", "(C) adbbad", "(D) acbdbb"], "C", "Pattern: aabcd / abbcd / abccd / abcdd. Filling letters: a(d)bc(b) / a(b)bcda / (b)ccd(a)bcd(d) -> adbbad."),
        (77, "Culture", "<p>Who wrote the famous Bengali novel \"Prothom Protishruti\"? / প্রখ্যাত বাংলা উপন্যাস \"প্রথম প্রতিশ্রুতি\" কার লেখা?</p>", ["(A) Sunil Gangopadhyay / সুনীল গঙ্গোপাধ্যায়", "(B) Leela Majumder / লীলা মজুমদার", "(C) Ashapurna Devi / আশাপূর্ণা দেবী", "(D) Mahasweta Devi / মহাশ্বেতা দেবী"], "C", "Famous writer Ashapurna Devi wrote the acclaimed Bengali novel 'Prothom Protishruti'."),
        (78, "Computer", "<p>Which of the following is not an Operating System (OS)? / নিম্নোক্ত কোনটি একটি Operating System (OS) নয়?</p>", ["(A) DOS / ডজ", "(B) Windows / উইন্ডোজ", "(C) Oracle / ওরাকল", "(D) Linux / লিনাক্স"], "C", "Oracle is a Database Management System (DBMS), not an operating system."),
        (79, "Math", "<p>Compute: (999 1/7 + 999 2/7 + 999 3/7 + 999 4/7 + 999 5/7 + 999 6/7) = ? / (999 1/7 + 999 2/7 + 999 3/7 + 999 4/7 + 999 5/7 + 999 6/7) = ?</p>", ["(A) 5999", "(B) 5997", "(C) 5799", "(D) 5979"], "B", "999 * 6 + (1 + 2 + 3 + 4 + 5 + 6)/7 = 5994 + 21/7 = 5994 + 3 = 5997."),
        (80, "Sports", "<p>In which year did India win the first T-20 World Cup? / কোন সালে ভারত প্রথম T- 20 বিশ্বকাপ জয়ী হয়েছিল?</p>", ["(A) 2003", "(B) 2007", "(C) 2009", "(D) 2005"], "B", "India led by MS Dhoni won the inaugural ICC T20 World Cup in 2007 defeating Pakistan in the final."),
        (81, "GK", "<p>Which day is celebrated as Police Day in West Bengal? / কোন দিনটি পশ্চিমবঙ্গে পুলিশ দিবস রূপে পালিত হয়?</p>", ["(A) 1st September / 1 লা সেপ্টেম্বর", "(B) 30th September / 30 সেপ্টেম্বর", "(C) 15th August / 15 আগস্ট", "(D) 31st August / 31 আগস্ট"], "A", "West Bengal Government observes 1st September every year as Police Day."),
        (82, "Math", "<p>Rs. 710 were divided among A, B and C in such a way that A had Rs. 40 more than B and C had Rs. 30 more than A. How much was C's share? / 710 টাকা এমন ভাবে A, B ও C -এর মধ্যে ভাগ করা হলো, যাতে A, B -এর থেকে 40 টাকা বেশি পায় এবং C, A- এর থেকে 30 টাকা বেশি পায়, তবে C কত টাকা পাবে?</p>", ["(A) Rs. 235 / 235 টাকা", "(B) Rs. 300 / 300 টাকা", "(C) Rs. 135 / 135 টাকা", "(D) Rs. 270 / 270 টাকা"], "D", "Let B = x. A = x + 40, C = x + 70. x + (x + 40) + (x + 70) = 710 => 3x + 110 = 710 => 3x = 600 => x = 200. C's share = 200 + 70 = Rs. 270."),
        (83, "GK", "<p>Whose autobiography is \"Wings of Fire\"? / \"উইংস অফ ফোয়ার\" কার আত্মজীবনী?</p>", ["(A) Pranab Mukherjee / প্রণব মুখার্জী", "(B) Indira Gandhi / ইন্দিরা গান্ধী", "(C) Subhash Chandra Bose / সুভাষ চন্দ্র বোস", "(D) APJ Abdul Kalam / এ পি জে আব্দুল কালাম"], "D", "'Wings of Fire' is the autobiography of former President Dr. A.P.J. Abdul Kalam."),
        (84, "Reasoning", "<p>Which of the following pictures will indicate the relationship between women, mothers and engineers? / নীচের কোন ছবিটি মহিলা, মা ও ইঞ্জিনিয়ারদের সম্পর্ক নির্দেশ করবে?</p>", ["(A) Option A", "(B) Option B", "(C) Option C", "(D) Option D"], "B", "All mothers are women (inner circle inside outer circle). Some mothers and some women can be engineers (overlapping circle)."),
        (85, "Math", "<p>25% of a certain number when added to 30% of 150 produces the sum 75. What is the number? / কোন সংখ্যার 25% এর সাথে 150- এর 30% যোগ করলে 75 হয়। সংখ্যাটি কত?</p>", ["(A) 102", "(B) 120", "(C) 210", "(D) 220"], "B", "0.25x + 30% of 150 = 75 => 0.25x + 45 = 75 => 0.25x = 30 => x = 120."),
        (86, "Geography", "<p>Which of the following is not a rabi crop? / নিম্নোক্ত কোনটি রবি শস্য নয়?</p>", ["(A) Wheat / গম", "(B) Mustard / সর্ষে", "(C) Cotton / তুলা", "(D) Pulse / ডাল"], "C", "Cotton is a Kharif crop (grown in monsoon/summer), whereas Wheat, Mustard, and Pulses are Rabi crops."),
        (87, "GK", "<p>Which country was elected as President of the United Nations Security Council in August 2021? / কোন দেশ রাষ্ট্রসংঘের নিরাপত্তা পরিষদে 2021 সালের আগস্ট মাসে সভাপতি রূপে নির্বাচিত হয়েছে?</p>", ["(A) Norway / নরওয়ে", "(B) United States of America / আমেরিকা যুক্তরাষ্ট্র", "(C) India / ভারতবর্ষ", "(D) China / চীন"], "C", "India assumed the presidency of the UN Security Council in August 2021."),
        (88, "Math", "<p>A tube can empty one third of a reservoir in 3 minutes. How much part of that reservoir can be emptied in 7 1/2 minutes? / কোনো নল দিয়ে একটি জলাধারের এক তৃতীয়াংশ 3 মিনিটে খালি করা যায়। 7 1/2 মিনিটে ওই জলাধারটির কত অংশ খালি করা যাবে?</p>", ["(A) 1/2", "(B) 2/3", "(C) 5/6", "(D) 5/7"], "C", "Part emptied in 1 minute = (1/3) / 3 = 1/9. Part emptied in 7.5 mins (15/2 mins) = (1/9) * (15/2) = 5/6."),
        (89, "Reasoning", "<p>P, Q, R, S, and T are sitting around a circular table. R sits to the right of P and second to the left of S. T does not sit between P and S. So who is sitting second to the left of R? / P, Q, R, S, এবং T একটি বৃত্তাকার টেবিলকে ঘিরে বসে আছে। R, P -এর ডানদিকে এবং S -এর বাঁদিক থেকে দ্বিতীয় স্থানে বসে আছে। T, P ও S- এর মাঝখানে বসেনি। তাহলে কে R -এর বাঁদিক থেকে দ্বিতীয় স্থানে বসে আছে?</p>", ["(A) P", "(B) Q", "(C) T", "(D) S"], "B", "Arrangement in clockwise order: P, R, T, S, Q. The person 2nd to the left of R is Q."),
        (90, "Science", "<p>Which mosquitoes spread dengue? / কোন মশা ডেঙ্গি রোগ ছড়ায়?</p>", ["(A) Mansonia / ম্যানসোনিয়া", "(B) Aedes / এডিস", "(C) Culex / কিউলেক্স", "(D) Anopheles / অ্যানোফিলিস"], "B", "Dengue fever is transmitted by female Aedes mosquitoes (primarily Aedes aegypti)."),
        (91, "Computer", "<p>Which of the following permanently stores data in a computer? / নিম্নোক্ত কোনটি কম্পিউটারের স্থায়ীভাবে তথ্য সংরক্ষণ করে?</p>", ["(A) ROM", "(B) A.L.U.", "(C) RAM", "(D) Cache Memory"], "A", "ROM (Read-Only Memory) is non-volatile memory that permanently stores computer data even when powered off."),
        (92, "Math", "<p>A, B and C enter into a partnership. A contributes one third of the total Capital which they have, while B contributes as much as A and C together. If the profit at the end of year is Rs. 900, what will C get? / A, B ও C একটি যৌথ ব্যবসার অংশীদার। A মূলধনের এক তৃতীয়াংশ দেন, B দেন A এবং C -এর দেওয়া মূলধনের সমান মূলধন। যদি বৎসরান্তে লাভের পরিমাণ 900 টাকা হয়, তবে C কত টাকা লভ্যাংশ পাবেন?</p>", ["(A) Rs. 300 / 300 টাকা", "(B) Rs. 100 / 100 টাকা", "(C) Rs. 200 / 200 টাকা", "(D) Rs. 150 / 150 টাকা"], "D", "A's capital = 1/3. B's capital = A + C = 1/3 + C. Total capital = 1 => 1/3 + (1/3 + C) + C = 1 => 2C = 1/3 => C = 1/6. C's profit = 900 * (1/6) = Rs. 150."),
        (93, "Culture", "<p>What is the name of the harvest festival in Kerala? / কেরালায় নতুন ফসল তোলার উৎসাবের নাম কি?</p>", ["(A) Bihu / বিহু", "(B) Onam / ওনাম", "(C) Baisakhi / বৈশাখী", "(D) Ochre ink / ওচিরা কালি"], "B", "Onam is the major annual harvest festival celebrated in Kerala."),
        (94, "Math", "<p>If the ratio of two numbers is 5 : 8 and their difference is 69, what is the bigger number? / দুটি সংখ্যার অনুপাত 5 : 8 এবং তাদের অন্তর 69 হলে, বড় সংখ্যাটি কত?</p>", ["(A) 115", "(B) 128", "(C) 184", "(D) 112"], "C", "8x - 5x = 69 => 3x = 69 => x = 23. Bigger number = 8 * 23 = 184."),
        (95, "Reasoning", "<p>Reena is twice as old as Sunita. Namita is younger than Shravani and Shravani is older than Sunita. If Kakali's age is twice that of Shravani, who is in the middle according to age? / রীনার বয়স সুনীতার বয়সের দ্বিগুণ। নমিতা শ্রাবণী থেকে বয়সে ছোট, আবার শ্রাবণী সুনীতার থেকে বয়সে বড়। কাকলীর বয়স শ্রাবণীর বয়সের দ্বিগুণ হলে, কে বয়সের হিসেবে মধ্যস্থানে আছে?</p>", ["(A) Kakali / কাকলী", "(B) Reena / রীনা", "(C) Shravani / শ্রাবণী", "(D) Inadequate information / অপোর্যাপ্ত তথ্য"], "D", "Due to relative age comparisons without exact numeric ties between Reena/Shravani and Namita, middle rank cannot be uniquely determined."),
        (96, "History", "<p>In which session Congress demanded 'Purna Swarajya'? / ভারতীয় জাতীয় কংগ্রেসের কোন অধিবেশনে ‘পূর্ণ স্বরাজ’ -এর অঙ্গীকার নেওয়া হয়েছিল?</p>", ["(A) Lahore (1930) / লাহোর (1930)", "(B) Madras (1927) / মাদ্রাজ (1927)", "(C) Haripura (1938) / হরিপুরা (1938)", "(D) Calcutta (1928) / কলকাতা (1928)"], "A", "The historic Purna Swaraj (Complete Independence) resolution was taken at the Lahore session of INC under Jawaharlal Nehru."),
        (97, "Math", "<p>Father's present age is 6 times the son's age. If the father's age after 6 years is 3 times the son's age, then what is the present age of the father? / পিতার বর্তমান বয়স পুত্রের বয়সের 6 গুণ। 6 বছর পরে পিতার বয়স যদি পুত্রের বয়সের 3 গুণ হয়, তবে পিতার বর্তমান বয়স কত?</p>", ["(A) 48 years / 48 বছর", "(B) 24 years / 24 বছর", "(C) 36 years / 36 বছর", "(D) 30 years / 30 বছর"], "B", "6x + 6 = 3(x + 6) => 6x + 6 = 3x + 18 => 3x = 12 => x = 4. Father's present age = 6 * 4 = 24 years."),
        (98, "Science", "<p>Which of the following is not a unit of energy? / নিম্নোক্ত কোনটি শক্তির একক নয়?</p>", ["(A) Erg / আর্গ", "(B) Joule / জুল", "(C) Calories / ক্যালোরি", "(D) Pascal / পাস্কাল"], "D", "Pascal (Pa) is the SI unit of pressure, while Erg, Joule, and Calorie are units of energy."),
        (99, "Reasoning", "<p>What will fit in the '*' place in the given equation? 16 * 4 * 5 * 14 * 6 / প্রদত্ত সমীকরনে '*' স্থানে কি বসবে? 16 * 4 * 5 * 14 * 6</p>", ["(A) ÷ + = -", "(B) ÷ - = ×", "(C) ÷ × = +", "(D) - × + ="], "C", "16 ÷ 4 × 5 = 14 + 6 => 4 × 5 = 20 => 20 = 20."),
        (100, "History", "<p>What was the official language of the Gupta Empire? / গুপ্ত সাম্রাজ্যের সরকারি ভাষা কি ছিল?</p>", ["(A) Hindi / হিন্দি", "(B) Pali / পালি", "(C) Prakrit / প্রাকৃত", "(D) Sanskrit / সংস্কৃত"], "D", "Sanskrit was the official court language of the Gupta Empire.")
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
