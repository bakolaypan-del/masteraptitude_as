const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.SUPABASE_DB_URI,
  ssl: { rejectUnauthorized: false }
});

const testId = 'rrb_ntpc_ug_cbt1_gs_sec31_70';
const testTitle = 'RRB NTPC UnderGraduate CBT I - General Awareness Sectional Mock Test';
const category = 'RAILWAY';
const subCategory = 'Under Graduate';

const rawQuestions = [
  {
    pdfQNo: 31,
    topic: 'Indian Polity',
    en: "By which Amendment Act were the words 'socialist', 'secular', and 'integrity' added to the Preamble of the Indian Constitution?",
    bn: "ভারতীয় সংবিধানের প্রস্তাবনায় 'সমাজতান্ত্রিক', 'ধর্মনিরপেক্ষ' এবং 'সংহতি' শব্দগুলি কোন সংশোধন আইনের মাধ্যমে সংযোজিত হয়েছিল?",
    options: [
      "A. 42nd Amendment Act / ৪২তম সংশোধন আইন",
      "B. 52nd Amendment Act / ৫২তম সংশোধন আইন",
      "C. 32nd Amendment Act / ৩২তম সংশোধন আইন",
      "D. 62nd Amendment Act / ৬২তম সংশোধন আইন"
    ],
    ans: "A. 42nd Amendment Act / ৪২তম সংশোধন আইন",
    solution: "The 42nd Constitutional Amendment Act of 1976 added three new words—'Socialist', 'Secular', and 'Integrity'—to the Preamble of the Indian Constitution."
  },
  {
    pdfQNo: 32,
    topic: 'Current Affairs',
    en: "Who presided over the National Level Conclave of Ministers of States/UTs for Minority Welfare held on 13 September 2025, at Vanijya Bhawan, New Delhi?",
    bn: "২০২৫ সালের ১৩ সেপ্টেম্বর নতুন দিল্লির বাণিজ্য ভবনে অনুষ্ঠিত সংখ্যালঘু কল্যাণের জন্য রাজ্য/কেন্দ্রশাসিত অঞ্চলের মন্ত্রীদের জাতীয় স্তরের কনক্লেভে কে সভাপতিত্ব করেছিলেন?",
    options: [
      "A. George Kurian / জর্জ কুরিয়ান",
      "B. Md. Zama Khan / মোঃ জামা খান",
      "C. Kiren Rijiju / কিরেণ রিজিজু",
      "D. Om Prakash Rajbhar / ওম প্রকাশ রাজভর"
    ],
    ans: "C. Kiren Rijiju / কিরেণ রিজিজু",
    solution: "Union Minister Kiren Rijiju presided over the National Level Conclave of Ministers of States/UTs for Minority Welfare at Vanijya Bhawan, New Delhi."
  },
  {
    pdfQNo: 33,
    topic: 'Indian History & Culture',
    en: "Where does the Indian Prime Minister hoist the national flag on the occasion of Independence Day?",
    bn: "স্বাধীনতা দিবস উপলক্ষে ভারতের প্রধানমন্ত্রী কোথায় জাতীয় পতাকা উত্তোলন করেন?",
    options: [
      "A. Qutb Minar / কুতুব মিনার",
      "B. Red Fort / লাল কেল্লা",
      "C. Jantar Mantar / যন্তর মন্তর",
      "D. India Gate / ইন্ডিয়া গেট"
    ],
    ans: "B. Red Fort / লাল কেল্লা",
    solution: "Every year on 15th August (Independence Day), the Prime Minister of India hoists the National Tricolor flag from the ramparts of the historic Red Fort in New Delhi."
  },
  {
    pdfQNo: 34,
    topic: 'Indian Art & Culture',
    en: "In which state of India did Pattachitra paintings originate?",
    bn: "পট্টচিত্র চিত্রশিল্প ভারতের কোন রাজ্যে উদ্ভূত হয়েছে?",
    options: [
      "A. Odisha / ওড়িশা",
      "B. Bihar / বিহার",
      "C. Punjab / পাঞ্জাব",
      "D. Rajasthan / রাজস্থান"
    ],
    ans: "A. Odisha / ওড়িশা",
    solution: "Pattachitra is a traditional, cloth-based scroll painting art form originating from Odisha and West Bengal, depicting mythological narratives."
  },
  {
    pdfQNo: 35,
    topic: 'Modern History',
    en: "Which factor most directly contributed to the emergence of the Sanyasi–Fakir rebellion in Bengal?",
    bn: "কোন কারণটি বাংলায় সন্ন্যাসী-ফকির বিদ্রোহের উদ্ভবে সবচেয়ে সরাসরি অবদান রেখেছিল?",
    options: [
      "A. Increased protection from British officials improved rural living conditions. / ব্রিটিশ কর্মকর্তাদের বর্ধিত সুরক্ষা গ্রামীণ জীবনযাত্রার মান উন্নত করেছিল।",
      "B. Expansion of irrigated farming reduced dependence on religious leaders. / সেচভিত্তিক কৃষির প্রসার ধর্মীয় নেতাদের ওপর নির্ভরতা কমিয়েছিল।",
      "C. Stable land rights allowed peasants to negotiate with revenue contractors. / স্থায়ী জমি অধিকার কৃষকদের রাজস্ব ঠিকাদারদের সাথে আলোচনা করার সুযোগ দেয়।",
      "D. Forced taxation and famine pushed dispossessed peasants into rebel groups. / বাধ্যতামূলক কর আদায় এবং দুর্ভিক্ষ উচ্ছেদকৃত কৃষকদের বিদ্রোহী গোষ্ঠীতে যোগ দিতে বাধ্য করেছিল।"
    ],
    ans: "D. Forced taxation and famine pushed dispossessed peasants into rebel groups. / বাধ্যতামূলক কর আদায় এবং দুর্ভিক্ষ উচ্ছেদকৃত কৃষকদের বিদ্রোহী গোষ্ঠীতে যোগ দিতে বাধ্য করেছিল।",
    solution: "The Great Bengal Famine of 1770 and harsh British revenue extraction stripped peasants of their land and livelihood, leading to the Sanyasi-Fakir rebellion."
  },
  {
    pdfQNo: 36,
    topic: 'Chemistry',
    en: "During the electrolysis of water, hydrogen and oxygen are released in which ratio?",
    bn: "জলের তড়িৎ বিশ্লেষণের সময় হাইড্রোজেন এবং অক্সিজেন কোন অনুপাতে নির্গত হয়?",
    options: [
      "A. 4:1",
      "B. 1:1",
      "C. 3:1",
      "D. 2:1"
    ],
    ans: "D. 2:1",
    solution: "Water molecule formula is H2O. Electrolysis yields 2 volumes of Hydrogen gas at the cathode and 1 volume of Oxygen gas at the anode (Ratio 2:1 by volume)."
  },
  {
    pdfQNo: 37,
    topic: 'Ancient History',
    en: "Which of the following sites contains prehistoric paintings ranging from the Mesolithic to the historic period?",
    bn: "নিচের কোন স্থানে মধ্যপ্রস্তর যুগ (Mesolithic) থেকে ঐতিহাসিক কাল পর্যন্ত প্রাগৈতিহাসিক চিত্রকর্ম রয়েছে?",
    options: [
      "A. Hampi / হাম্পি",
      "B. Nalanda / নালন্দা",
      "C. Pattadakal / পট্টদকল",
      "D. Bhimbetka / ভীমবেটকা"
    ],
    ans: "D. Bhimbetka / ভীমবেটকা",
    solution: "Bhimbetka rock shelters in Madhya Pradesh contain UNESCO World Heritage rock paintings spanning from the Upper Paleolithic and Mesolithic ages through historical times."
  },
  {
    pdfQNo: 38,
    topic: 'Geography',
    en: "The Vindhyachal Super Thermal Power Station is located in __________.",
    bn: "বিন্ধ্যাচল সুপার থার্মাল পাওয়ার স্টেশনটি __________ রাজ্যে অবস্থিত।",
    options: [
      "A. Madhya Pradesh / মধ্যপ্রদেশ",
      "B. Gujarat / গুজরাট",
      "C. Chhattisgarh / ছত্তিশগড়",
      "D. Rajasthan / রাজস্থান"
    ],
    ans: "A. Madhya Pradesh / মধ্যপ্রদেশ",
    solution: "Vindhyachal Super Thermal Power Station operated by NTPC is located in Singrauli district of Madhya Pradesh."
  },
  {
    pdfQNo: 39,
    topic: 'Indian Polity',
    en: "When did Ladakh become a union territory of India?",
    bn: "লাদাখ কবে ভারতের একটি কেন্দ্রশাসিত অঞ্চলে পরিণত হয়?",
    options: [
      "A. 2020 / ২০২০",
      "B. 2019 / ২০১৯",
      "C. 2021 / ২০২১",
      "D. 2017 / ২০১৭"
    ],
    ans: "B. 2019 / ২০১৯",
    solution: "Ladakh became a separate Union Territory of India on October 31, 2019 following the Jammu and Kashmir Reorganisation Act, 2019."
  },
  {
    pdfQNo: 40,
    topic: 'Indian Polity',
    en: "Which Article of the Indian Constitution provides for the Constitution of municipalities?",
    bn: "ভারতীয় সংবিধানের কোন অনুচ্ছেদে পুরসভার (Municipality) গঠনের বিধান রয়েছে?",
    options: [
      "A. Article 243S / অনুচ্ছেদ ২৪৩S",
      "B. Article 243R / অনুচ্ছেদ ২৪৩R",
      "C. Article 243P / অনুচ্ছেদ ২৪৩P",
      "D. Article 243Q / অনুচ্ছেদ ২৪৩Q"
    ],
    ans: "D. Article 243Q / অনুচ্ছেদ ২৪৩Q",
    solution: "Article 243Q of Part IX-A of the Constitution of India provides for the constitution of Municipalities (Nagar Panchayat, Municipal Council, Municipal Corporation)."
  },
  {
    pdfQNo: 41,
    topic: 'Physics',
    en: "How does increasing the Amplitude of a sound wave affect the sound produced?",
    bn: "শব্দ তরঙ্গের বিস্তার (Amplitude) বৃদ্ধি করলে উৎপন্ন শব্দের ওপর কী প্রভাব পড়ে?",
    options: [
      "A. The loudness increases / প্রাবল্য বা উচ্চতা (Loudness) বৃদ্ধি পায়",
      "B. The pitch increases / তীক্ষ্ণতা (Pitch) বৃদ্ধি পায়",
      "C. The frequency decreases / কম্পাঙ্ক হ্রাস পায়",
      "D. The speed of the sound increases / শব্দের গতিবেগ বৃদ্ধি পায়"
    ],
    ans: "A. The loudness increases / প্রাবল্য বা উচ্চতা (Loudness) বৃদ্ধি পায়",
    solution: "The loudness of sound is directly proportional to the square of the amplitude of vibration. Higher amplitude results in louder sound."
  },
  {
    pdfQNo: 42,
    topic: 'Current Affairs',
    en: "Which Indian actor was honored with the 'Master Humor Award' at the Macau International Comedy Festival 2025 held in China?",
    bn: "চীনে অনুষ্ঠিত ম্যাকাও আন্তর্জাতিক কমেডি ফেস্টিভ্যাল ২০২৫-এ কোন ভারতীয় অভিনেতা 'মাস্টার হিউমার অ্যাওয়ার্ড'-এ ভূষিত হয়েছিলেন?",
    options: [
      "A. Hrithik Roshan / হৃতিক রোশন",
      "B. Aamir Khan / আমির খান",
      "C. Ram Charan / রাম চরণ",
      "D. Akshay Kumar / অক্ষয় কুমার"
    ],
    ans: "B. Aamir Khan / আমির খান",
    solution: "Actor Aamir Khan was conferred the Master Humor Award at the Macau International Comedy Festival 2025 in recognition of his iconic comedic performances."
  },
  {
    pdfQNo: 43,
    topic: 'Computer Knowledge',
    en: "Extended ASCII, an 8-bit evolution of the original 7-bit ASCII standard, supports international text by expanding the character set. How many total codes does it provide?",
    bn: "এক্সটেন্ডেড ASCII (৮-বিট), যা মূল ৭-বিট ASCII-এর একটি রূপ, অক্ষর সেট সম্প্রসারিত করে আন্তর্জাতিক টেক্সট সমর্থন করে। এটি মোট কতগুলি কোড প্রদান করে?",
    options: [
      "A. 512 codes for voice recordings / ভয়েস রেকর্ডিংয়ের জন্য ৫১২টি কোড",
      "B. 1024 codes for video compression / ভিডিও কম্প্রেশনের জন্য ১০২৪টি কোড",
      "C. 128 codes limited to English letters / ইংরেজি অক্ষরের মধ্যে সীমাবদ্ধ ১২৮টি কোড",
      "D. 256 codes including accented characters / বিশেষ চিহ্নযুক্ত অক্ষর সহ ২৫৬টি কোড"
    ],
    ans: "D. 256 codes including accented characters / বিশেষ চিহ্নযুক্ত অক্ষর সহ ২৫৬টি কোড",
    solution: "An 8-bit ASCII character set provides 2^8 = 256 total distinct code combinations (from 0 to 255)."
  },
  {
    pdfQNo: 44,
    topic: 'Computer Knowledge',
    en: "In the Windows 11 File System, a file named mydriver.sys is found in the C:\\Windows\\System32\\drivers folder. Based on its file extension and location, which of the following best describes the purpose and classification of this file?",
    bn: "উইন্ডোজ ১১ ফাইল সিস্টেমে, C:\\Windows\\System32\\drivers ফোল্ডারে mydriver.sys নামের একটি ফাইল পাওয়া গেছে। এর ফাইল এক্সটেনশন এবং অবস্থানের ওপর ভিত্তি করে, নিচের কোনটি এই ফাইলের উদ্দেশ্য এবং শ্রেণীবিভাগকে সবচেয়ে ভালোভাবে বর্ণনা করে?",
    options: [
      "A. It is an Application Data File used for temporary user settings and can be safely deleted to free up disk space. / এটি একটি অ্যাপ্লিকেশন ডেটা ফাইল যা অস্থায়ী ব্যবহারকারী সেটিংসের জন্য ব্যবহৃত হয় এবং ডিস্ক স্পেস খালি করতে নিরাপদে মুছে ফেলা যায়।",
      "B. It is a System Driver File that allows the operating system to communicate with a specific hardware component. / এটি একটি সিস্টেম ড্রাইভার ফাইল যা অপারেটিং সিস্টেমকে একটি নির্দিষ্ট হার্ডওয়্যার উপাদানের সাথে যোগাযোগ করতে দেয়।",
      "C. It is a System Configuration File that holds graphical settings and can be edited with a standard text editor. / এটি একটি সিস্টেম কনফিগারেশন ফাইল যা গ্রাফিক্যাল সেটিংস ধারণ করে এবং স্ট্যান্ডার্ড টেক্সট এডিটর দিয়ে সম্পাদনা করা যায়।",
      "D. It is an Operating System Log File that records system events and is only read by the Task Manager. / এটি একটি অপারেটিং সিস্টেম লগ ফাইল যা সিস্টেমের ঘটনা রেকর্ড করে এবং শুধুমাত্র টাস্ক ম্যানেজার দ্বারা পড়া হয়।"
    ],
    ans: "B. It is a System Driver File that allows the operating system to communicate with a specific hardware component. / এটি একটি সিস্টেম ড্রাইভার ফাইল যা অপারেটিং সিস্টেমকে একটি নির্দিষ্ট হার্ডওয়্যার উপাদানের সাথে যোগাযোগ করতে দেয়।",
    solution: "Files with .sys extension located in system32/drivers are Kernel-mode hardware System Driver files that facilitate OS communication with hardware devices."
  },
  {
    pdfQNo: 45,
    topic: 'General Awareness',
    en: "Which institution was founded by Prasanta Chandra Mahalanobis?",
    bn: "প্রশান্ত চন্দ্র মহালানবিশ কোন প্রতিষ্ঠানটি প্রতিষ্ঠা করেছিলেন?",
    options: [
      "A. Indian Economic Forum / ইন্ডিয়ান ইকোনমিক ফোরাম",
      "B. Indian Statistical Institute / ভারতীয় পরিসংখ্যান সংস্থা (ISI)",
      "C. Planning Commission / পরিকল্পনা কমিশন",
      "D. Reserve Bank of India / রিজার্ভ ব্যাংক অফ ইন্ডিয়া"
    ],
    ans: "B. Indian Statistical Institute / ভারতীয় পরিসংখ্যান সংস্থা (ISI)",
    solution: "Professor Prasanta Chandra Mahalanobis established the Indian Statistical Institute (ISI) in Kolkata in 1931."
  },
  {
    pdfQNo: 46,
    topic: 'Economics',
    en: "Which of the following services is a core component of the tourism industry?",
    bn: "নিচের কোন পরিষেবাটি পর্যটন শিল্পের একটি মূল উপাদান?",
    options: [
      "A. Banking / ব্যাংকিং",
      "B. Hospitality / আতিথেয়তা (Hospitality)",
      "C. Teaching / শিক্ষকতা",
      "D. Insurance / বীমা"
    ],
    ans: "B. Hospitality / আতিথেয়তা (Hospitality)",
    solution: "The hospitality sector (hotels, lodging, food & beverages) is a fundamental pillar of the tourism industry."
  },
  {
    pdfQNo: 47,
    topic: 'Modern History',
    en: "What was the Dual Government system introduced after the Battle of Buxar?",
    bn: "বক্সারের যুদ্ধের পর প্রবর্তিত দ্বৈত শাসন ব্যবস্থা (Dual Government) কী ছিল?",
    options: [
      "A. A system where the Company collected revenue, and Nawab handled administration / এমন একটি ব্যবস্থা যেখানে কোম্পানি রাজস্ব আদায় করত এবং নবাব প্রশাসন পরিচালনা করতেন",
      "B. A system where the French and British shared governance / এমন একটি ব্যবস্থা যেখানে ফরাসি ও ব্রিটিশরা শাসন ভাগাভাগি করেছিল",
      "C. A system where the Nawab collected revenue and the Company maintained the army / এমন একটি ব্যবস্থা যেখানে নবাব রাজস্ব আদায় করতেন এবং কোম্পানি সৈন্যদল পরিচালনা করত",
      "D. A system where the British ruled directly / এমন একটি ব্যবস্থা যেখানে ব্রিটিশরা সরাসরি শাসন করত"
    ],
    ans: "A. A system where the Company collected revenue, and Nawab handled administration / এমন একটি ব্যবস্থা যেখানে কোম্পানি রাজস্ব আদায় করত এবং নবাব প্রশাসন পরিচালনা করতেন",
    solution: "Robert Clive introduced the Dual System of Government in Bengal (1765–1772) where Diwani (revenue collection) was controlled by the British East India Company, while Nizamat (administration) remained with the Nawab."
  },
  {
    pdfQNo: 48,
    topic: 'Medieval History',
    en: "The Mansabdari System, introduced by Akbar in 1571, was mainly a system of __________.",
    bn: "১৫৭১ সালে আকবর কর্তৃক প্রবর্তিত মনসবদারী প্রথা মূলত কিসের একটি ব্যবস্থা ছিল?",
    options: [
      "A. Land Revenue Collection / ভূমি রাজস্ব সংগ্রহ",
      "B. Judicial Reforms / বিচার বিভাগীয় সংস্কার",
      "C. Military Administration / সামরিক প্রশাসন",
      "D. Religious Reformation / ধর্মীয় সংস্কার"
    ],
    ans: "C. Military Administration / সামরিক প্রশাসন",
    solution: "The Mansabdari system was an administrative and military ranking system introduced by Mughal Emperor Akbar to organize officers (Mansabdars) and army troops."
  },
  {
    pdfQNo: 49,
    topic: 'Current Affairs',
    en: "Which academic institution was responsible for designing the IRIS chip based on the SHAKTI microprocessor, India's push for self-reliance in semiconductor technology, in February 2025?",
    bn: "২০২৫ সালের ফেব্রুয়ারিতে সেমিকন্ডাক্টর প্রযুক্তিতে ভারতের আত্মনির্ভরতার অংশ হিসেবে শক্তি (SHAKTI) মাইক্রোপ্রসেসরের ওপর ভিত্তি করে IRIS চিপ ডিজাইন করার জন্য কোন শিক্ষাপ্রতিষ্ঠান দায়ী ছিল?",
    options: [
      "A. IIT Madras / আইআইটি মাদ্রাজ",
      "B. IIT Delhi / আইআইটি দিল্লি",
      "C. NIT Trichy / এনআইটি ত্রিচি",
      "D. IISc Bangalore / আইআইএসসি ব্যাঙ্গালোর"
    ],
    ans: "A. IIT Madras / আইআইটি মাদ্রাজ",
    solution: "IIT Madras developed India's indigenous SHAKTI microprocessor series and designed the IRIS chip for advanced embedded system computing."
  },
  {
    pdfQNo: 50,
    topic: 'Current Affairs',
    en: "Which football player was named the Professional Footballers' Association (PFA) Player of the Year in August 2025, becoming the first player to win the award three times?",
    bn: "২০২৫ সালের আগস্টে কোন ফুটবলার প্রফেশনাল ফুটবলার্স অ্যাসোসিয়েশন (PFA) প্লেয়ার অফ দ্য ইয়ার মনোনীত হয়ে প্রথম খেলোয়াড় হিসেবে তিনবার এই পুরস্কার জয়ের রেকর্ড গড়েন?",
    options: [
      "A. Casemiro / ক্যাসেমিরো",
      "B. Lionel Messi / লিওনেল মেসি",
      "C. Mohamed Salah / মোহামেদ সালাহ",
      "D. Neymar / নেইমার"
    ],
    ans: "C. Mohamed Salah / মোহামেদ সালাহ",
    solution: "Mohamed Salah won the PFA Players' Player of the Year award in August 2025 for an unprecedented third time."
  },
  {
    pdfQNo: 51,
    topic: 'Current Affairs',
    en: "In November 2025, PM Modi chaired the 60th All India Conference of Directors General and Inspectors General of Police in which city of Chhattisgarh?",
    bn: "২০২৫ সালের নভেম্বরে প্রধানমন্ত্রী মোদী ছত্তিশগড়ের কোন শহরে পুলিশ মহাপরিদর্শক (DG) ও ইনস্পেক্টর জেনারেলদের (IG) ৬০তম সর্বভারতীয় সম্মেলনে সভাপতিত্ব করেছিলেন?",
    options: [
      "A. Bilaspur / বিলাসপুর",
      "B. Raipur / রায়পুর",
      "C. Korba / কোরবা",
      "D. Bhilai / ভিলাই"
    ],
    ans: "B. Raipur / রায়পুর",
    solution: "PM Narendra Modi chaired the 60th DGPs/IGPs Conference in Raipur, the capital city of Chhattisgarh."
  },
  {
    pdfQNo: 52,
    topic: 'Economic Geography',
    en: "Which of the following is NOT a characteristic of tertiary services?",
    bn: "নিচের কোনটি তৃতীয় স্তরের বা টারশিয়ারি (tertiary) পরিষেবার বৈশিষ্ট্য নয়?",
    options: [
      "A. Directly processes natural resources / সরাসরি প্রাকৃতিক সম্পদ প্রক্রিয়াজাতকরণ করে",
      "B. Often located in urban areas / প্রায়শই শহরাঞ্চলে অবস্থিত",
      "C. Includes tourism, banking, and trade / পর্যটন, ব্যাংকিং এবং বাণিজ্য অন্তর্ভুক্ত",
      "D. Involves face-to-face or remote interaction / মুখোমুখি বা দূরবর্তী মিথস্ক্রিয়া অন্তর্ভুক্ত"
    ],
    ans: "A. Directly processes natural resources / সরাসরি প্রাকৃতিক সম্পদ প্রক্রিয়াজাতকরণ করে",
    solution: "Directly processing raw natural resources is a characteristic of Secondary/Primary activities (e.g. manufacturing/mining), NOT tertiary services."
  },
  {
    pdfQNo: 53,
    topic: 'Indian Geography',
    en: "Which of the following belts of the Northern Plains consists of porous rocky soil where stream water seeps underground?",
    bn: "উত্তর সমভূমির নিচের কোন অঞ্চলটি ছিদ্রযুক্ত শিলাময় মাটি নিয়ে গঠিত যেখানে নদীর জল ভূগর্ভে অদৃশ্য হয়ে যায়?",
    options: [
      "A. Delta belt / বদ্বীপ অঞ্চল",
      "B. Bhabar belt / ভাবর অঞ্চল",
      "C. Terai belt / তরাই অঞ্চল",
      "D. Khadar belt / খাদর অঞ্চল"
    ],
    ans: "B. Bhabar belt / ভাবর অঞ্চল",
    solution: "The Bhabar belt is a narrow zone parallel to the Shiwalik foothills composed of pebbles and porous rocks where streams disappear underground."
  },
  {
    pdfQNo: 54,
    topic: 'Current Affairs',
    en: "Which wildlife sanctuary is set to host its inaugural female cheetah (Dheera) as part of a breeding/translocation initiative in 2025?",
    bn: "২০২৫ সালে প্রজনন/স্থানান্তর উদ্যোগের অংশ হিসেবে কোন বন্যপ্রাণী অভয়ারণ্য তার প্রথম নারী চিতা (ধিরা)-কে আতিথেয়তা দিতে প্রস্তুত?",
    options: [
      "A. Kuno National Park / কুনো জাতীয় উদ্যান",
      "B. Gandhi Sagar Wildlife Sanctuary / গান্ধী সাগর বন্যপ্রাণী অভয়ারণ্য",
      "C. Gir Wildlife Sanctuary / গির বন্যপ্রাণী অভয়ারণ্য",
      "D. Ranthambore National Park / রণথম্বোর জাতীয় উদ্যান"
    ],
    ans: "B. Gandhi Sagar Wildlife Sanctuary / গান্ধী সাগর বন্যপ্রাণী অভয়ারণ্য",
    solution: "Gandhi Sagar Wildlife Sanctuary in Madhya Pradesh was prepared as the second home for cheetah relocation in India."
  },
  {
    pdfQNo: 55,
    topic: 'Computer Knowledge',
    en: "Which statement is True or False about the Windows 11 Operating System (OS)?\n(i) The OS loads program code directly onto the hard disk for execution, as the CPU can only execute code from permanent storage.\n(ii) For multitasking, the OS allocates small CPU time slices to processes, rapidly switching between them, a technique known as Time-Sharing.",
    bn: "উইন্ডোজ ১১ অপারেটিং সিস্টেম (OS) সম্পর্কে নিচের কোন বক্তব্যটি সত্য বা মিথ্যা?\n(i) OS প্রোগ্রামের কোড সরাসরি হার্ড ডিস্কে লোড করে তা এক্সিকিউট করে, কারণ CPU শুধুমাত্র স্থায়ী স্টোরেজ থেকে কোড রান করতে পারে।\n(ii) মাল্টিটাস্কিংয়ের জন্য, OS প্রসেসগুলিকে সিপিপি-র ছোট ছোট টাইম স্লাইস বরাদ্দ করে এবং দ্রুত তাদের মধ্যে সুইচ করে, যা টাইম-শেয়ারিং নামে পরিচিত।",
    options: [
      "A. (i) True, (ii) False / (i) সত্য, (ii) মিথ্যা",
      "B. (i) False, (ii) False / (i) মিথ্যা, (ii) মিথ্যা",
      "C. (i) True, (ii) True / (i) সত্য, (ii) সত্য",
      "D. (i) False, (ii) True / (i) মিথ্যা, (ii) সত্য"
    ],
    ans: "D. (i) False, (ii) True / (i) মিথ্যা, (ii) সত্য",
    solution: "Statement (i) is False because CPU executes instructions directly from RAM (main memory), not hard disk. Statement (ii) is True describing time-sharing CPU scheduling."
  },
  {
    pdfQNo: 56,
    topic: 'Economics',
    en: "Which of the following indicators is NOT a component of the Human Development Index (HDI)?",
    bn: "নিচের কোন নির্দেশকটি মানব উন্নয়ন সূচকের (HDI) উপাদান নয়?",
    options: [
      "A. Poverty line ratio / দারিদ্র্যসীমার অনুপাত",
      "B. Education index / শিক্ষা সূচক",
      "C. Life expectancy / গড় আয়ু বা প্রত্যাশিত আয়ুষ্কাল",
      "D. Gross National Income per capita / মাথা পিছু মোট জাতীয় আয়"
    ],
    ans: "A. Poverty line ratio / দারিদ্র্যসীমার অনুপাত",
    solution: "Human Development Index (HDI) consists of 3 key dimensions: Life Expectancy, Education Index, and Per Capita Gross National Income (GNI). Poverty line ratio is not an HDI component."
  },
  {
    pdfQNo: 57,
    topic: 'Biology',
    en: "Which of the following is a fat-soluble vitamin that helps in promotion of calcium absorption in the gut for bone health?",
    bn: "নিচের কোনটি একটি চর্বিতে দ্রবণীয় ভিটামিন যা হাড়ের স্বাস্থ্যের জন্য অন্ত্রে ক্যালসিয়াম শোষণে সহায়তা করে?",
    options: [
      "A. Vitamin D / ভিটামিন ডি",
      "B. Vitamin A / ভিটামিন এ",
      "C. Vitamin B / ভিটামিন বি",
      "D. Vitamin C / ভিটামিন সি"
    ],
    ans: "A. Vitamin D / ভিটামিন ডি",
    solution: "Vitamin D is a fat-soluble vitamin essential for intestinal calcium absorption and bone mineralization."
  },
  {
    pdfQNo: 58,
    topic: 'Environment',
    en: "Which of the following was the first international agreement to establish legally binding emission reduction targets specifically for developed countries?",
    bn: "বিশেষ করে উন্নত দেশগুলির জন্য আইনত বাধ্যতামূলক নির্গমন হ্রাসের লক্ষ্য নির্ধারণের প্রথম আন্তর্জাতিক চুক্তি কোনটি ছিল?",
    options: [
      "A. Kyoto Protocol / কিওটো প্রোটোকল",
      "B. Rio Declaration / রিও ঘোষণা",
      "C. Paris Agreement / প্যারিস চুক্তি",
      "D. Basel Convention / বাসেল কনভেনশন"
    ],
    ans: "A. Kyoto Protocol / কিওটো প্রোটোকল",
    solution: "The Kyoto Protocol (adopted in 1997) was the first legally binding international treaty setting greenhouse gas reduction targets for developed nations."
  },
  {
    pdfQNo: 59,
    topic: 'Current Affairs',
    en: "In which country was the International Conference on 'Reimagining Existence: Emerging Perspectives in World Literature and Language' held in March 2025?",
    bn: "২০২৫ সালের মার্চ মাসে 'পুনর্বিবেচিত অস্তিত্ব: বিশ্ব সাহিত্য ও ভাষায় উদীয়মান দৃষ্টিভঙ্গি' শীর্ষক আন্তর্জাতিক সম্মেলনটি কোন দেশে অনুষ্ঠিত হয়েছিল?",
    options: [
      "A. India / ভারত",
      "B. Italy / ইতালি",
      "C. China / চীন",
      "D. Russia / রাশিয়া"
    ],
    ans: "A. India / ভারত",
    solution: "The International Conference on 'Reimagining Existence' in literature was hosted in India in March 2025."
  },
  {
    pdfQNo: 60,
    topic: 'Computer Knowledge',
    en: "Which of the following correctly differentiates system software from application software?",
    bn: "নিচের কোনটি সিস্টেম সফটওয়্যার এবং অ্যাপ্লিকেশন সফটওয়্যারের মধ্যে সঠিক পার্থক্য নির্দেশ করে?",
    options: [
      "A. Application software loads the operating system; system software performs user tasks / অ্যাপ্লিকেশন সফটওয়্যার অপারেটিং সিস্টেম লোড করে; সিস্টেম সফটওয়্যার ব্যবহারকারীর কাজ সম্পাদন করে",
      "B. Both perform the same functions / উভয়ই একই কাজ সম্পাদন করে",
      "C. System software manages hardware; application software performs user tasks / সিস্টেম সফটওয়্যার হার্ডওয়্যার পরিচালনা করে; অ্যাপ্লিকেশন সফটওয়্যার ব্যবহারকারীর নির্দিষ্ট কাজ সম্পাদন করে",
      "D. System software performs user tasks; application software controls hardware / সিস্টেম সফটওয়্যার ব্যবহারকারীর কাজ সম্পাদন করে; অ্যাপ্লিকেশন সফটওয়্যার হার্ডওয়্যার নিয়ন্ত্রণ করে"
    ],
    ans: "C. System software manages hardware; application software performs user tasks / সিস্টেম সফটওয়্যার হার্ডওয়্যার পরিচালনা করে; অ্যাপ্লিকেশন সফটওয়্যার ব্যবহারকারীর নির্দিষ্ট কাজ সম্পাদন করে",
    solution: "System software (like OS) manages system hardware and background resources, whereas application software performs specific tasks requested by users."
  },
  {
    pdfQNo: 61,
    topic: 'Indian Polity',
    en: "Under which Article of the Indian Constitution may the President of India proclaim President's Rule when Constitutional machinery fails in a state?",
    bn: "কোনো রাজ্যে সাংবিধানিক অচলবস্থা দেখা দিলে ভারতীয় সংবিধানের কোন অনুচ্ছেদের অধীনে ভারতের রাষ্ট্রপতি রাষ্ট্রপতি শাসন জারি করতে পারেন?",
    options: [
      "A. Article 350 / অনুচ্ছেদ ৩৫০",
      "B. Article 249 / অনুচ্ছেদ ২৪৯",
      "C. Article 356 / অনুচ্ছেদ ৩৫৬",
      "D. Article 355 / অনুচ্ছেদ ৩৫৫"
    ],
    ans: "C. Article 356 / অনুচ্ছেদ ৩৫৬",
    solution: "Article 356 empowers the President of India to impose President's Rule in a state upon failure of constitutional machinery."
  },
  {
    pdfQNo: 62,
    topic: 'Physics',
    en: "Which of the following optical properties of light enables sunglasses to reduce glare from sunlight reflected off surfaces such as water or roads?",
    bn: "আলোর কোন অপটিক্যাল বা আলোকীয় ধর্মের জন্য সানগ্লাস জল বা রাস্তার মতো পৃষ্ঠ থেকে প্রতিফলিত সূর্যালোকের ঝলকানি (glare) হ্রাস করতে পারে?",
    options: [
      "A. Refraction / প্রতিসরণ",
      "B. Diffraction / অপবর্তন",
      "C. Interference / ব্যতিচার",
      "D. Polarization / সমবর্তন (Polarization)"
    ],
    ans: "D. Polarization / সমবর্তন (Polarization)",
    solution: "Polarizing lenses block horizontally polarized light reflected from flat surfaces (water, wet roads), eliminating blinding glare."
  },
  {
    pdfQNo: 63,
    topic: 'Geography',
    en: "Which type of natural vegetation covers the largest geographical area in India?",
    bn: "কোন ধরণের প্রাকৃতিক উদ্ভিদ ভারতে সবচেয়ে বেশি ভৌগোলিক এলাকা জুড়ে বিস্তৃত?",
    options: [
      "A. Mountain vegetation / পার্বত্য উদ্ভিদ",
      "B. Tidal mangrove vegetation / ম্যানগ্রোভ বা লবণাম্বু উদ্ভিদ",
      "C. Tropical Deciduous vegetation / ক্রান্তীয় পর্ণমোচী উদ্ভিদ",
      "D. Dry Tropical Thorn vegetation / শুষ্ক ক্রান্তীয় কাঁটাযুক্ত উদ্ভিদ"
    ],
    ans: "C. Tropical Deciduous vegetation / ক্রান্তীয় পর্ণমোচী উদ্ভিদ",
    solution: "Tropical Deciduous Forests (Monsoon Forests) cover the largest proportion of India's forest area (over 65%)."
  },
  {
    pdfQNo: 64,
    topic: 'Indian Economy',
    en: "In which year did FEMA replace FERA?",
    bn: "কোন সালে FEMA আইনটি FERA আইনকে প্রতিস্থাপিত করে?",
    options: [
      "A. 1990 / ১৯৯০",
      "B. 1998 / ১৯৯৮",
      "C. 1994 / ১৯৯৪",
      "D. 1999 / ১৯৯৯"
    ],
    ans: "D. 1999 / ১৯৯৯",
    solution: "Foreign Exchange Management Act (FEMA) was passed in December 1999 to replace the stringent Foreign Exchange Regulation Act (FERA) of 1973."
  },
  {
    pdfQNo: 65,
    topic: 'Current Affairs',
    en: "With which country did the United Kingdom (UK) sign the Kensington Treaty, the first treaty between the two countries since the Second World War, in July 2025?",
    bn: "২০২৫ সালের জুলাই মাসে যুক্তরাজ্য (UK) দ্বিতীয় বিশ্বযুদ্ধের পর প্রথম দ্বিপাক্ষিক চুক্তি হিসেবে কোন দেশের সাথে 'কেনসিংটন চুক্তি' স্বাক্ষর করে?",
    options: [
      "A. United States / মার্কিন যুক্তরাষ্ট্র",
      "B. Japan / জাপান",
      "C. Germany / জার্মানি",
      "D. France / ফ্রান্স"
    ],
    ans: "C. Germany / জার্মানি",
    solution: "The UK and Germany signed the landmark Kensington Treaty in July 2025 to strengthen defense, economic, and security ties."
  },
  {
    pdfQNo: 66,
    topic: 'Ancient History',
    en: "Which of the following baskets of the Buddhist Tipitaka contains monastic rules?",
    bn: "বৌদ্ধ ত্রিপিটকের কোন পিটকে সন্ন্যাসীদের নিয়মকানুন বা অনুশাসন অন্তর্ভুক্ত রয়েছে?",
    options: [
      "A. Jataka Pitaka / জাতক পিটক",
      "B. Sutta Pitaka / সুত্ত পিটক",
      "C. Abhidhamma Pitaka / অভিধর্ম পিটক",
      "D. Vinaya Pitaka / বিনয় পিটক"
    ],
    ans: "D. Vinaya Pitaka / বিনয় পিটক",
    solution: "Vinaya Pitaka contains code of rules and discipline for Buddhist monks and nuns in the Sangha."
  },
  {
    pdfQNo: 67,
    topic: 'Medieval History',
    en: "Consider the following statements regarding the provincial administration in the Mughal period and select the correct option.\nStatement I: Each Suba was placed under a Subedar or provincial governor who was directly appointed by the Emperor.\nStatement II: Daroga-i-Dak was responsible for maintaining the communication channel.",
    bn: "মুঘল আমলের প্রাদেশিক প্রশাসন সম্পর্কিত নিচের বিবৃতিগুলি বিবেচনা করুন এবং সঠিক বিকল্পটি নির্বাচন করুন।\nবিবৃতি I: প্রতিটি সুবা একজন সুবেদার বা প্রাদেশিক গভর্নরের অধীনে ছিল যিনি সরাসরি সম্রাট দ্বারা নিযুক্ত হতেন।\nবিবৃতি II: দারোগা-ই-ডাক যোগাযোগ মাধ্যম ও ডাক ব্যবস্থা বজায় রাখার জন্য দায়ী ছিলেন।",
    options: [
      "A. Both statements I and II are incorrect. / বিবৃতি I এবং II উভয়ই ভুল।",
      "B. Statement I is incorrect, while statement II is correct. / বিবৃতি I ভুল, কিন্তু বিবৃতি II সঠিক।",
      "C. Both statements I and II are correct. / বিবৃতি I এবং II উভয়ই সঠিক।",
      "D. Statement I is correct, while statement II is incorrect. / বিবৃতি I সঠিক, কিন্তু বিবৃতি II ভুল।"
    ],
    ans: "C. Both statements I and II are correct. / বিবৃতি I এবং II উভয়ই সঠিক।",
    solution: "In Mughal Administration, Subedar headed each Suba (province) appointed by Emperor, and Daroga-i-Dak managed imperial postal/courier communications."
  },
  {
    pdfQNo: 68,
    topic: 'Indian Polity',
    en: "Which of the following Union Territories has a Legislative Assembly?",
    bn: "নিচের কোন কেন্দ্রশাসিত অঞ্চলের নিজস্ব বিধানসভা রয়েছে?",
    options: [
      "A. Lakshadweep / লাক্ষাদ্বীপ",
      "B. Ladakh / লাদাখ",
      "C. National Capital Territory of Delhi / জাতীয় রাজধানী অঞ্চল দিল্লি",
      "D. Andaman and Nicobar Islands / আন্দামান ও নিকোবর দ্বীপপুঞ্জ"
    ],
    ans: "C. National Capital Territory of Delhi / জাতীয় রাজধানী অঞ্চল দিল্লি",
    solution: "Among the given Union Territories, the National Capital Territory of Delhi (along with Puducherry and Jammu & Kashmir) has its own elected Legislative Assembly."
  },
  {
    pdfQNo: 69,
    topic: 'Indian Polity',
    en: "Which Amendment restored the primacy of Fundamental Rights over Directive Principles?",
    bn: "কোন সংবিধান সংশোধনীর মাধ্যমে নির্দেশমূলক নীতির ওপর মৌলিক অধিকারের অগ্রাধিকার পুনরায় প্রতিষ্ঠিত হয়?",
    options: [
      "A. 44th Amendment / ৪৪তম সংশোধনী",
      "B. 42nd Amendment / ৪২তম সংশোধনী",
      "C. 74th Amendment / ৭৪তম সংশোধনী",
      "D. 84th Amendment / ৮৪তম সংশোধনী"
    ],
    ans: "A. 44th Amendment / ৪৪তম সংশোধনী",
    solution: "The 44th Constitutional Amendment Act of 1978 restored the primacy of Fundamental Rights over Directive Principles of State Policy."
  },
  {
    pdfQNo: 70,
    topic: 'Modern History',
    en: "Who among the following led the large-scale armed attack on the Chittagong armoury in April 1930?",
    bn: "১৯৩০ সালের এপ্রিলে চট্টগ্রাম অস্ত্রাগার লুণ্ঠনের সশস্ত্র আক্রমণে নিচের কে নেতৃত্ব দিয়েছিলেন?",
    options: [
      "A. Surya Sen / সূর্য সেন (মাষ্টারda)",
      "B. Chandrasekhar Azad / চন্দ্রশেখর আজাদ",
      "C. Jatin Das / যতীন দাস",
      "D. Bhagat Singh / ভগত সিং"
    ],
    ans: "A. Surya Sen / সূর্য সেন (মাষ্টারda)",
    solution: "Revolutionary leader Surya Sen ('Masterda') led the Chittagong Armoury Raid on April 18, 1930 under the banner of Indian Republican Army."
  }
];

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Insert/Update Test
    const testMeta = {
      subCategory: subCategory,
      questionCount: rawQuestions.length,
      passMarks: 16,
      totalMarks: 40,
      language: 'Bilingual (English & Bengali)'
    };

    const insertTestQuery = `
      INSERT INTO tests (
        id, title, topic, subject_name, description, category, test_type, duration,
        marks_per_correct, negative_marks, is_active, created_at, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        topic = EXCLUDED.topic,
        subject_name = EXCLUDED.subject_name,
        description = EXCLUDED.description,
        category = EXCLUDED.category,
        test_type = EXCLUDED.test_type,
        duration = EXCLUDED.duration,
        marks_per_correct = EXCLUDED.marks_per_correct,
        negative_marks = EXCLUDED.negative_marks,
        is_active = EXCLUDED.is_active,
        metadata = EXCLUDED.metadata;
    `;

    await client.query(insertTestQuery, [
      testId,
      testTitle,
      'General Awareness',
      'General Awareness',
      'RRB NTPC UnderGraduate CBT I Sectional Mock Test featuring 40 General Awareness Questions (Q31-70) in English and Bengali.',
      category,
      'sectional',
      40, // 40 minutes
      1.0,
      0.33,
      true,
      Date.now(),
      JSON.stringify(testMeta)
    ]);

    console.log(`✓ Test registered: ${testId}`);

    // 2. Delete existing questions for this test to re-insert freshly
    await client.query("DELETE FROM questions WHERE test_id = $1", [testId]);

    // 3. Insert Questions
    for (let i = 0; i < rawQuestions.length; i++) {
      const q = rawQuestions[i];
      const qNo = i + 1;
      const qId = `${testId}_q${qNo}`;

      // Construct bilingual question text HTML
      const questionText = `<div class="en-content">${q.en}</div><div class="bn-content">${q.bn}</div>`;

      const qMeta = {
        pdfQNo: q.pdfQNo,
        questionEn: q.en,
        questionBn: q.bn
      };

      const insertQQuery = `
        INSERT INTO questions (
          id, test_id, topic, q_no, question_text, options, image_url,
          correct_answer, equation_latex, solution, explanation, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12);
      `;

      await client.query(insertQQuery, [
        qId,
        testId,
        q.topic,
        qNo,
        questionText,
        q.options,
        '',
        q.ans,
        '',
        q.solution,
        q.solution,
        JSON.stringify(qMeta)
      ]);
    }

    await client.query('COMMIT');
    console.log(`✓ Successfully seeded 40 Questions into test '${testId}'!`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error("FAILED TO SEED MOCK TEST:", err);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
