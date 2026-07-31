const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.SUPABASE_DB_URI,
  ssl: { rejectUnauthorized: false }
});

const testId = 'rrb_ntpc_grad_cbt1_gs_sec31_70';
const testTitle = 'GS/Gk sectional Mock -02 (07/05/2026, 12:45 PM - 2:15 PM)';
const category = 'RAILWAY';
const subCategory = 'Graduate Level';

const rawQuestions = [
  {
    pdfQNo: 31,
    topic: 'Indian History',
    en: "Which extremist leader authored the famous work, 'Gita Rahasya'?",
    bn: "কোন চরমপন্থী নেতা বিখ্যাত গ্রন্থ 'গীতা রহস্য' রচনা করেছিলেন?",
    options: [
      "A. Bipin Chandra Pal / বিপিন চন্দ্র পাল",
      "B. Aurobindo Ghose / অরবিন্দ ঘোষ",
      "C. Bal Gangadhar Tilak / বাল গঙ্গাধর তিলক",
      "D. Lala Lajpat Rai / লালা লাজপত রায়"
    ],
    ans: "C. Bal Gangadhar Tilak / বাল গঙ্গাধর তিলক",
    solution: "Bal Gangadhar Tilak authored the famous book 'Gita Rahasya' while imprisoned at Mandalay in Burma."
  },
  {
    pdfQNo: 32,
    topic: 'Science & Technology',
    en: "Which launch vehicle will be used for Chandrayaan-5?",
    bn: "চন্দ্রযান-৫ এর জন্য কোন উৎক্ষেপণ যান (Launch vehicle) ব্যবহৃত হবে?",
    options: [
      "A. GSLV Mk III / জিএসএলভি মার্ক ৩",
      "B. H3-24L / এইচ৩-২৪এল",
      "C. PSLV-C45 / পিএসএলভি-সি৪৫",
      "D. GSLV Mk II / জিএসএলভি মার্ক ২"
    ],
    ans: "B. H3-24L / এইচ৩-২৪এল",
    solution: "Chandrayaan-5 (LUPEX mission) is a joint lunar mission with JAXA, using the H3-24L rocket."
  },
  {
    pdfQNo: 33,
    topic: 'Computer Awareness',
    en: "What does CD stand for in computer terminology?",
    bn: "কম্পিউটার পরিভাষায় CD-এর পূর্ণরূপ কী?",
    options: [
      "A. Compact Disc / কম্প্যাক্ট ডিস্ক",
      "B. Current Directories / কারেন্ট ডিরেক্টরি",
      "C. Control Datamine / কন্ট্রোল ডেটামাইন",
      "D. Color Display / কালার ডিসপ্লে"
    ],
    ans: "A. Compact Disc / কম্প্যাক্ট ডিস্ক",
    solution: "In computer terminology, CD stands for Compact Disc, a digital optical disc data storage format."
  },
  {
    pdfQNo: 34,
    topic: 'Biology',
    en: "In a cross between true-breeding red-flowered and true-breeding white-flowered plants, the Filial 1 (F1) progeny was pink. This is a case of which type of inheritance?",
    bn: "বিশুদ্ধ লাল-ফুল এবং বিশুদ্ধ সাদা-ফুল যুক্ত উদ্ভিদের সংকরায়ণে, প্রথম অপত্য বংশের (F1) ফুলগুলি গোলাপি বর্ণের হয়েছিল। এটি কোন ধরণের বংশগতির উদাহরণ?",
    options: [
      "A. Complete Dominance / সম্পূর্ণ প্রকটতা",
      "B. Co-dominance / সহ-প্রকটতা",
      "C. Sex-linkage / সেক্স-লিঙ্কেজ",
      "D. Incomplete Dominance / অসম্পূর্ণ প্রকটতা"
    ],
    ans: "D. Incomplete Dominance / অসম্পূর্ণ প্রকটতা",
    solution: "Incomplete dominance is a form of Gene interaction in which both alleles of a gene at a locus are partially expressed, producing an intermediate phenotype like pink flowers."
  },
  {
    pdfQNo: 35,
    topic: 'Indian Polity',
    en: "The members of the Railway Convention Committee are nominated by which of the following authorities of India?",
    bn: "রেলওয়ে কনভেনশন কমিটির সদস্যদের ভারতের কোন কর্তৃপক্ষ মনোনীত করেন?",
    options: [
      "A. The Prime Minister of India / ভারতের প্রধানমন্ত্রী",
      "B. The Chairman of the Rajya Sabha / রাজ্যসভার চেয়ারম্যান",
      "C. The President of India / ভারতের রাষ্ট্রপতি",
      "D. The Speaker of the Lok Sabha / লোকসভার স্পিকার"
    ],
    ans: "D. The Speaker of the Lok Sabha / লোকসভার স্পিকার",
    solution: "The members of the Railway Convention Committee are nominated by the Speaker of the Lok Sabha."
  },
  {
    pdfQNo: 36,
    topic: 'Geography',
    en: "Which soil type, known for retaining moisture, is ideal for cotton cultivation?",
    bn: "আর্দ্রতা ধরে রাখার ক্ষমতার জন্য পরিচিত কোন ধরণের মাটি তুলা চাষের জন্য আদর্শ?",
    options: [
      "A. Red soil / লাল মাটি",
      "B. Sandy soil / বেলে মাটি",
      "C. Laterite soil / ল্যাটেরাইট মাটি",
      "D. Black soil / কৃষ্ণ মৃত্তিকা (কালো মাটি)"
    ],
    ans: "D. Black soil / কৃষ্ণ মৃত্তিকা (কালো মাটি)",
    solution: "Black soil (Regur soil) has high clay content and high moisture retention capacity, making it ideal for cotton cultivation."
  },
  {
    pdfQNo: 37,
    topic: 'Indian Freedom Struggle',
    en: "Which contribution is correctly associated with Lala Lajpat Rai during the freedom struggle?",
    bn: "স্বাধীনতা সংগ্রামের সময় লালা লাজপত রায়ের সাথে নিচের কোন অবদানটি সঠিকভাবে সম্পর্কিত?",
    options: [
      "A. Drafting the Nehru Report outlining complete independence for India / ভারতের সম্পূর্ণ স্বাধীনতার রূপরেখা দিয়ে নেহেরু রিপোর্ট তৈরি করা",
      "B. Leading the anti-Simon Commission protests, where he suffered fatal injuries / সাইমন কমিশন বিরোধী আন্দোলনের নেতৃত্ব দেওয়া, যেখানে তিনি মারাত্মকভাবে আহত হন",
      "C. Leading the Bardoli satyagraha against enhanced revenue-demand policies / বর্ধিত রাজস্ব দাবির বিরুদ্ধে বারদোলি সত্যগ্রহের নেতৃত্ব দেওয়া",
      "D. Commanding the Congress Volunteers during the Salt March in Gujarat / গুজরাটে লবণ সত্যগ্রহের সময় কংগ্রেস স্বেচ্ছাসেবকদের পরিচালনা করা"
    ],
    ans: "B. Leading the anti-Simon Commission protests, where he suffered fatal injuries / সাইমন কমিশন বিরোধী আন্দোলনের নেতৃত্ব দেওয়া, যেখানে তিনি মারাত্মকভাবে আহত হন",
    solution: "Lala Lajpat Rai led the peaceful protest against the Simon Commission in Lahore in 1928, where police lathi-charge fatally injured him."
  },
  {
    pdfQNo: 38,
    topic: 'Modern History',
    en: "Who among the following was associated with the Farazi Movement in Bengal during the 19th century?",
    bn: "১৯ শতকে বাংলায় ফরায়েজী আন্দোলনের সাথে নিচের কে যুক্ত ছিলেন?",
    options: [
      "A. U Kiang Nongbah / উ কিয়াং নংবাহ",
      "B. Birsa Munda / বিরসা মুন্ডা",
      "C. Maznoom Shah / মজনু শাহ",
      "D. Dadu Mian / দুদু মিঞা (দাদু মিঞা)"
    ],
    ans: "D. Dadu Mian / দুদু মিঞা (দাদু মিঞা)",
    solution: "Dadu Mian (Muhsinuddin Ahmad) was a prominent leader of the Faraizi Movement in East Bengal founded by Haji Shariatullah."
  },
  {
    pdfQNo: 39,
    topic: 'Indian Polity & Governance',
    en: "Under the Citizenship Amendment Act (CAA), 2019, Hindu, Sikh, Buddhist, Jain, Parsi, and Christian immigrants who entered India on or before December 31, 2014, from which of the following countries are eligible for Indian citizenship?",
    bn: "নাগরিকত্ব সংশোধনী আইন (CAA), ২০১৯ অনুযায়ী, ৩১ ডিসেম্বর ২০১৪ তারিখ বা তার পূর্বে নিম্নলিখিত কোন কোন দেশ থেকে ভারতে আসা হিন্দু, শিখ, বৌদ্ধ, জৈন, পার্সি ও খ্রিস্টান শরণার্থীরা ভারতীয় নাগরিকত্ব পাওয়ার যোগ্য?",
    options: [
      "A. Afghanistan, Sri Lanka and Bangladesh / আফগানিস্তান, শ্রীলঙ্কা এবং বাংলাদেশ",
      "B. Bhutan, Bangladesh and Maldives / ভুটান, বাংলাদেশ এবং মালদ্বীপ",
      "C. Afghanistan, Bangladesh and Pakistan / আফগানিস্তান, বাংলাদেশ এবং পাকিস্তান",
      "D. Pakistan, Myanmar and Nepal / পাকিস্তান, মায়ানমার এবং নেপাল"
    ],
    ans: "C. Afghanistan, Bangladesh and Pakistan / আফগানিস্তান, বাংলাদেশ এবং পাকিস্তান",
    solution: "CAA 2019 grants eligibility for citizenship to persecuted minorities (Hindus, Sikhs, Buddhists, Jains, Parsis, Christians) from Afghanistan, Bangladesh, and Pakistan who arrived before Dec 31, 2014."
  },
  {
    pdfQNo: 40,
    topic: 'Ancient History',
    en: "The roads and streets of the Harappan Lower Town were laid out in which pattern?",
    bn: "হরপ্পার নিম্নাঞ্চলের শহরগুলির রাস্তাঘাট কোন প্যাটার্নে তৈরি করা হয়েছিল?",
    options: [
      "A. Radial pattern spreading from a centre / কেন্দ্র থেকে ছড়িয়ে থাকা রেডিয়াল প্যাটার্ন",
      "B. Grid pattern intersecting at right angles / সমকোণে ছেদ করা গ্রিড প্যাটার্ন",
      "C. Circular pattern with curved streets / বাঁকানো রাস্তা সহ বৃত্তাকার প্যাটার্ন",
      "D. Irregular pattern without fixed alignment / নির্দিষ্ট সারিবদ্ধতা ছাড়া অনিয়মিত প্যাটার্ন"
    ],
    ans: "B. Grid pattern intersecting at right angles / সমকোণে ছেদ করা গ্রিড প্যাটার্ন",
    solution: "Harappan town planning featured streets laid out in a grid pattern intersecting each other at right angles (90 degrees)."
  },
  {
    pdfQNo: 41,
    topic: 'Environmental Studies',
    en: "Which global event first initiated coordinated international action on environmental protection and development?",
    bn: "কোন বৈশ্বিক ঘটনাটি পরিবেশ সুরক্ষা ও উন্নয়নে সমন্বিত আন্তর্জাতিক পদক্ষেপ প্রথম শুরু করেছিল?",
    options: [
      "A. Rio Conference, 1992 / রিও সম্মেলন, ১৯৯২",
      "B. Johannesburg Summit, 2002 / জোহানেসবার্গ শীর্ষ সম্মেলন, ২০০২",
      "C. Doha Climate Meeting, 2012 / দোহা জলবায়ু বৈঠক, ২০১২",
      "D. Stockholm Conference, 1972 / স্টকহোম সম্মেলন, ১৯৭২"
    ],
    ans: "D. Stockholm Conference, 1972 / স্টকহোম সম্মেলন, ১৯৭২",
    solution: "The United Nations Conference on the Human Environment held in Stockholm in June 1972 was the first major international conference on environmental issues."
  },
  {
    pdfQNo: 42,
    topic: 'Indian Polity',
    en: "According to the Indian Constitution, the Directive Principles of State Policy are ________.",
    bn: "ভারতীয় সংবিধান অনুসারে, রাষ্ট্র পরিচালনার নির্দেশাত্মক নীতিগুলি (DPSP) হলো ________।",
    options: [
      "A. Completely administrative rules / সম্পূর্ণ প্রশাসনিক নিয়ম",
      "B. Subject to court jurisdiction only during emergency / শুধুমাত্র জরুরি অবস্থার সময় আদালতের এক্তিয়ারভুক্ত",
      "C. Non-justiciable in court, but fundamental in governance / আদালতে বিচারযোগ্য নয়, তবে দেশ পরিচালনায় মৌলিক",
      "D. Subject to court jurisdiction and legally enforceable / আদালতের বিচারযোগ্য এবং আইনগতভাবে বলবৎযোগ্য"
    ],
    ans: "C. Non-justiciable in court, but fundamental in governance / আদালতে বিচারযোগ্য নয়, তবে দেশ পরিচালনায় মৌলিক",
    solution: "Article 37 specifies that Directive Principles are non-justiciable in court, yet fundamental in the governance of the country."
  },
  {
    pdfQNo: 43,
    topic: 'Current Affairs & International News',
    en: "Where was the 69th session of the United Nations Commission on the Status of Women held in March 2025?",
    bn: "২০২৫ সালের মার্চ মাসে নারীদের অবস্থা সংক্রান্ত জাতিসংঘ কমিশনের ৬৯তম অধিবেশন কোথায় অনুষ্ঠিত হয়েছিল?",
    options: [
      "A. Oslo, Norway / অসলো, নরওয়ে",
      "B. New York, USA / নিউ ইয়র্ক, মার্কিন যুক্তরাষ্ট্র",
      "C. Rio de Janeiro, Brazil / রিও ডি জেনিরো, ব্রাজিল",
      "D. Berlin, Germany / বার্লিন, জার্মানি"
    ],
    ans: "B. New York, USA / নিউ ইয়র্ক, মার্কিন যুক্তরাষ্ট্র",
    solution: "The UN Commission on the Status of Women (CSW69) was held at United Nations Headquarters in New York, USA."
  },
  {
    pdfQNo: 44,
    topic: 'Indian Art & Culture',
    en: "Which of the following musical genres was considered formal and divine in ancient India?",
    bn: "প্রাচীন ভারতে নিচের কোন সঙ্গীত ধারাটি আনুষ্ঠানিক ও দৈব বলে বিবেচিত হতো?",
    options: [
      "A. Dhrupad / ধ্রুপদ",
      "B. Gana / গান",
      "C. Gandharva / গন্ধর্ব",
      "D. Prabandh / প্রবন্ধ"
    ],
    ans: "C. Gandharva / গন্ধর্ব",
    solution: "Gandharva sangita was the sacred, formal, and structured divine music mentioned in ancient Indian scriptures like Natya Shastra."
  },
  {
    pdfQNo: 45,
    topic: 'Indian Economy',
    en: "The Government of India set up the Price Stabilisation Fund (PSF) to regulate the prices of agri-horticultural commodities in which financial year?",
    bn: "ভারত সরকার কোন অর্থবছরে কৃষি-উদ্যানজাত পণ্যের দাম নিয়ন্ত্রণের জন্য মূল্য স্থিতিশীলকরণ তহবিল (PSF) গঠন করেছিল?",
    options: [
      "A. 2019-20 / ২০১৯-২০",
      "B. 2016-17 / ২০১৬-১৭",
      "C. 2014-15 / ২০১৪-১৫",
      "D. 2012-13 / ২০১২-১৩"
    ],
    ans: "C. 2014-15 / ২০১৪-১৫",
    solution: "The Price Stabilisation Fund (PSF) was set up in 2014-15 under the Department of Agriculture, Cooperation & Farmers Welfare to mitigate volatility in prices of agricultural commodities."
  },
  {
    pdfQNo: 46,
    topic: 'Current Affairs',
    en: "In October 2025, India's Society of Association Executives (SAE) officially launched in which of the following cities?",
    bn: "২০২৫ সালের অক্টোবরে, সোসাইটি অফ অ্যাসোসিয়েশন এক্সিকিউটিভস (SAE) ভারতের কোন শহরে আনুষ্ঠানিকভাবে চালু হয়েছিল?",
    options: [
      "A. Bengaluru / বেঙ্গালুরু",
      "B. Ahmedabad / আহমেদাবাদ",
      "C. New Delhi / নতুন দিল্লি",
      "D. Patna / পাটনা"
    ],
    ans: "A. Bengaluru / বেঙ্গালুরু",
    solution: "India's Society of Association Executives (SAE) officially launched its national chapter in Bengaluru."
  },
  {
    pdfQNo: 47,
    topic: 'Space Science',
    en: "Selected for the International Space Station mission in 2025, John McFall, the first disabled astronaut, is associated with which of the following countries?",
    bn: "২০২৫ সালে আন্তর্জাতিক মহাকাশ স্টেশন মিশনের জন্য নির্বাচিত প্রথম প্রতিবন্ধী মহাকাশচারী জন ম্যাকফল নিচের কোন দেশের সাথে যুক্ত?",
    options: [
      "A. Australia / অস্ট্রেলিয়া",
      "B. United Kingdom / যুক্তরাজ্য (UK)",
      "C. United States of America / মার্কিন যুক্তরাষ্ট্র (USA)",
      "D. Canada / কানাডা"
    ],
    ans: "B. United Kingdom / যুক্তরাজ্য (UK)",
    solution: "John McFall is a British paralympian and ESA astronaut selected for the ISS mission."
  },
  {
    pdfQNo: 48,
    topic: 'Geography & Environment',
    en: "Which of the following is a non-renewable resource?",
    bn: "নিচের কোনটি অ-নবায়নযোগ্য সম্পদ?",
    options: [
      "A. Wind energy / বায়ু শক্তি",
      "B. Biomass / বায়োমাস",
      "C. Solar energy / সৌর শক্তি",
      "D. Petroleum / পেট্রোলিয়াম"
    ],
    ans: "D. Petroleum / পেট্রোলিয়াম",
    solution: "Petroleum is a fossil fuel formed over millions of years and cannot be replenished on a human timescale, making it non-renewable."
  },
  {
    pdfQNo: 49,
    topic: 'Biology',
    en: "In humans, complete digestion of proteins leads to the formation of which of the following?",
    bn: "মানুষের দেহে প্রোটিনের সম্পূর্ণ পরিপাকের ফলে নিচের কোন পদার্থ তৈরি হয়?",
    options: [
      "A. Amino acids / অ্যামিনো অ্যাসিড",
      "B. Glycerol / গ্লিসারল",
      "C. Fatty acids / ফ্যাটি অ্যাসিড",
      "D. Glucose / গ্লুকোজ"
    ],
    ans: "A. Amino acids / অ্যামিনো অ্যাসিড",
    solution: "Proteins are broken down by proteolytic enzymes in the digestive tract into their constituent building blocks, amino acids."
  },
  {
    pdfQNo: 50,
    topic: 'Computer Awareness',
    en: "Which of the following is an example of application software used for creating documents?",
    bn: "ফাইল বা ডকুমেন্ট তৈরির জন্য ব্যবহৃত অ্যাপ্লিকেশন সফটওয়্যারের উদাহরণ নিচের কোনটি?",
    options: [
      "A. Windows / উইন্ডোজ",
      "B. BIOS / বিআইওএস",
      "C. Linux / লিনাক্স",
      "D. MS Word / এমএস ওয়ার্ড"
    ],
    ans: "D. MS Word / এমএস ওয়ার্ড",
    solution: "Microsoft Word is a widely used application software word processor for creating, editing, and formatting documents."
  },
  {
    pdfQNo: 51,
    topic: 'Indian Geography',
    en: "Which of the following states accounts for about three-fourths of India's total jute production?",
    bn: "ভারতের মোট পাট উৎপাদনের প্রায় তিন-চতুর্থাংশ নিচের কোন রাজ্যে উৎপন্ন হয়?",
    options: [
      "A. Bihar / বিহার",
      "B. West Bengal / পশ্চিমবঙ্গ",
      "C. Assam / আসাম",
      "D. Odisha / ওড়িশা"
    ],
    ans: "B. West Bengal / পশ্চিমবঙ্গ",
    solution: "West Bengal is the largest producer of raw jute in India, accounting for nearly 75% of the total national production."
  },
  {
    pdfQNo: 52,
    topic: 'Social Development & Governance',
    en: "Which approach is crucial for empowering rural women, leading to community development?",
    bn: "গ্রামীণ মহিলাদের ক্ষমতায়ন এবং সামাজিক উন্নয়নের জন্য কোন পন্থাটি অত্যন্ত গুরুত্বপূর্ণ?",
    options: [
      "A. Restricting women's roles to traditional household duties / নারীদের ভূমিকা কেবল গৃহস্থালির কাজের মধ্যে সীমাবদ্ধ রাখা",
      "B. Limiting educational opportunities to urban centres / শিক্ষার সুযোগ শুধু শহরকেন্দ্রিক সীমাবদ্ধ রাখা",
      "C. Promoting gender-specific vocational training and education / জেন্ডার-নির্দিষ্ট বৃত্তিমূলক প্রশিক্ষণ এবং শিক্ষাকে উৎসাহিত করা",
      "D. Focussing solely on men's employment programmes / শুধুমাত্র পুরুষদের কর্মসংস্থান কর্মসূচির ওপর জোর দেওয়া"
    ],
    ans: "C. Promoting gender-specific vocational training and education / জেন্ডার-নির্দিষ্ট বৃত্তিমূলক প্রশিক্ষণ এবং শিক্ষাকে উৎসাহিত করা",
    solution: "Providing targeted vocational training, skill development, and education empowers rural women economically and socially."
  },
  {
    pdfQNo: 53,
    topic: 'Indian Architecture & Culture',
    en: "The presence of elaborate gopurams is a defining feature of which temple architectural style?",
    bn: "বিশাল ও বিস্তৃত গোপুরামের উপস্থিতি কোন মন্দির স্থাপত্য শৈলীর একটি অন্যতম বৈশিষ্ট্য?",
    options: [
      "A. Dravidian style / দ্রাবিড় শৈলী",
      "B. Nagara style / নাগর শৈলী",
      "C. Vesara style / বেসর শৈলী",
      "D. Pala style / পাল শৈলী"
    ],
    ans: "C. Vesara style / বেসর শৈলী",
    solution: "The Vesara style combines elements of Nagara and Dravidian architecture, featuring monumental gopuram gateways."
  },
  {
    pdfQNo: 54,
    topic: 'Indian Geography',
    en: "Which of the following water bodies separates the Andaman Islands from the Nicobar Islands?",
    bn: "নিচের কোন জলাশয়টি আন্দামান দ্বীপপুঞ্জকে নিকোবর দ্বীপপুঞ্জ থেকে পৃথক করেছে?",
    options: [
      "A. Ten Degree Channel / ১০ ডিগ্রি চ্যানেল",
      "B. Nine Degree Channel / ৯ ডিগ্রি চ্যানেল",
      "C. Duncan Passage / ডানকান প্যাসেজ",
      "D. Palk Strait / প্রণালী (পাক প্রণালী)"
    ],
    ans: "A. Ten Degree Channel / ১০ ডিগ্রি চ্যানেল",
    solution: "The Ten Degree Channel is a channel that separates the Andaman Islands and Nicobar Islands from each other in the Bay of Bengal."
  },
  {
    pdfQNo: 55,
    topic: 'Indian Polity',
    en: "According to Article 141 of the Indian Constitution, the law declared by the Supreme Court shall be binding on ________.",
    bn: "ভারতীয় সংবিধানের ১৪১ নম্বর অনুচ্ছেদ অনুসারে, সুপ্রিম কোর্ট দ্বারা ঘোষিত আইন কার ওপর বাধ্যবাধকতা তৈরি করে?",
    options: [
      "A. All courts within the territory of India / ভারতের ভূখণ্ডের মধ্যকার সমস্ত আদালত",
      "B. State governments / রাজ্য সরকারসমূহ",
      "C. All tribunals except civil courts / দেওয়ানি আদালত ছাড়া সমস্ত ট্রাইব্যুনাল",
      "D. Only High Courts / শুধুমাত্র হাইকোর্টসমূহ"
    ],
    ans: "A. All courts within the territory of India / ভারতের ভূখণ্ডের মধ্যকার সমস্ত আদালত",
    solution: "Article 141 states that the law declared by the Supreme Court shall be binding on all courts within the territory of India."
  },
  {
    pdfQNo: 56,
    topic: 'Computer Science',
    en: "The CPU mainly performs which of the following functions?",
    bn: "সিপিইউ (CPU) মূলত নিচের কোন কাজটি সম্পাদন করে?",
    options: [
      "A. Input and calculation / ইনপুট এবং গণনা",
      "B. Processing and control / প্রসেসিং এবং নিয়ন্ত্রণ",
      "C. Display and storage / ডিসপ্লে এবং স্টোরেজ",
      "D. Storage and output / স্টোরেজ এবং আউটপুট"
    ],
    ans: "B. Processing and control / প্রসেসিং এবং নিয়ন্ত্রণ",
    solution: "The Central Processing Unit (CPU) performs data processing and controls operations across hardware units."
  },
  {
    pdfQNo: 57,
    topic: 'Current Affairs & Schemes',
    en: "In October 2025, the Ministry of Minority Affairs announced support to universities to set up Centres of Excellence to promote heritage and classical languages under which scheme?",
    bn: "২০২৫ সালের অক্টোবরে, সংখ্যালঘু বিষয়ক মন্ত্রক ঐতিহ্য ও প্রাচীন ভাষা প্রচারের জন্য বিশ্ববিদ্যালয়গুলিতে 'সেন্টার অফ এক্সিলেন্স' স্থাপনে সহায়তার ঘোষণা দেয়। এই উদ্যোগটি কোন প্রকল্পের অধীনে নেওয়া হয়েছিল?",
    options: [
      "A. Maulana Azad National Fellowship (MANF) / মাওলানা আজাদ ন্যাশনাল ফেলোশিপ (MANF)",
      "B. Pradhan Mantri Jan Vikas Karyakram (PMJVK) / প্রধানমন্ত্রী জন বিকাশ কার্যক্রম (PMJVK)",
      "C. Pradhan Mantri Virasat Ka Samvardhan (PM VIKAS) / প্রধানমন্ত্রী বিরাট কা সংবর্ধন (PM VIKAS)",
      "D. National Minorities Development Finance Corporation (NMDFC) / ন্যাশনাল মাইনোরিটিজ ডেভেলপমেন্ট ফাইন্যান্স কর্পোরেশন (NMDFC)"
    ],
    ans: "B. Pradhan Mantri Jan Vikas Karyakram (PMJVK) / প্রধানমন্ত্রী জন বিকাশ কার্যক্রম (PMJVK)",
    solution: "Under PMJVK, support was announced for setting up Centres of Excellence in classical languages."
  },
  {
    pdfQNo: 58,
    topic: 'Physics',
    en: "The S.I. derived unit for Force is the Newton (N). Which combination of S.I. base units is equivalent to the Newton?",
    bn: "বলের (Force) এস.আই. (S.I.) লব্ধ একক হলো নিউটন (N)। এস.আই. মৌলিক এককগুলির কোন সমন্বয়টি নিউটনের সমতুল্য?",
    options: [
      "A. kg⋅m2/s2 / kg⋅m²/s²",
      "B. kg⋅m⋅s / kg⋅m⋅s",
      "C. kg⋅m/s / kg⋅m/s",
      "D. kg⋅m/s2 / kg⋅m/s²"
    ],
    ans: "D. kg⋅m/s2 / kg⋅m/s²",
    solution: "According to Newton's second law of motion (F = ma), 1 Newton = 1 kg × 1 m/s² = kg⋅m/s²."
  },
  {
    pdfQNo: 59,
    topic: 'Physics',
    en: "When a book is pushed along the surface of a table, which type of friction mainly opposes its motion?",
    bn: "যখন একটি বই টেবিলের পৃষ্ঠের ওপর দিয়ে ঠেলা হয়, তখন মূলত কোন ধরনের ঘর্ষণ এর গতিকে বাধা দেয়?",
    options: [
      "A. Rolling friction / আবর্ত ঘর্ষণ",
      "B. Sliding friction / পিচ্ছিল ঘর্ষণ",
      "C. Fluid friction / তরল ঘর্ষণ",
      "D. Magnetic friction / চৌম্বকীয় ঘর্ষণ"
    ],
    ans: "B. Sliding friction / পিচ্ছিল ঘর্ষণ",
    solution: "Sliding friction occurs when two solid surfaces slide over each other."
  },
  {
    pdfQNo: 60,
    topic: 'Environment & Botany',
    en: "Which of the following trees is characteristic of the tropical deciduous forests of India?",
    bn: "নিচের কোন গাছটি ভারতের ক্রান্তীয় পর্ণমোচী অরণ্যের অন্যতম বৈশিষ্ট্য?",
    options: [
      "A. Deodar / দেবদারু",
      "B. Teak / সেগুন",
      "C. Mangrove / ম্যানগ্রোভ",
      "D. Fir / ফার"
    ],
    ans: "B. Teak / সেগুন",
    solution: "Teak (Tectona grandis) is a commercially valuable hardwood tree species native to tropical deciduous forests of India."
  },
  {
    pdfQNo: 61,
    topic: 'General Knowledge & Organizations',
    en: "What is the full form of UNDP?",
    bn: "UNDP-এর পূর্ণরূপ কী?",
    options: [
      "A. United Nations Deployment Programme / ইউনাইটেড নেশনস ডেপ্লয়মেন্ট প্রোগ্রাম",
      "B. United Nations Development Programme / ইউনাইটেড নেশনস ডেভেলপমেন্ট প্রোগ্রাম",
      "C. Union of Nations Deployment Programme / ইউনিয়ন অফ নেশনস ডেপ্লয়মেন্ট প্রোগ্রাম",
      "D. Union of Nations Development Programme / ইউনিয়ন অফ নেশনস ডেভেলপমেন্ট প্রোগ্রাম"
    ],
    ans: "B. United Nations Development Programme / ইউনাইটেড নেশনস ডেভেলপমেন্ট প্রোগ্রাম",
    solution: "UNDP stands for the United Nations Development Programme, founded in 1965 to eradicate poverty and reduce inequalities."
  },
  {
    pdfQNo: 62,
    topic: 'Indian Architecture',
    en: "Which of the following temples is NOT a prime example of the Dravidian style of temple architecture?",
    bn: "নিচের কোন মন্দিরটি দ্রাবিড় শৈলীর মন্দির স্থাপত্যের উদাহরণ নয়?",
    options: [
      "A. Shore Temple / শোর টেম্পল",
      "B. Gangaikondacholapuram Temple / গঙ্গাইকোণ্ডচোলপুরম মন্দির",
      "C. Brihadeeswara Temple / বৃহদেশ্বর মন্দির",
      "D. Siddhesvara Mahadeva Temple / সিদ্ধেশ্বর মহাদেব মন্দির"
    ],
    ans: "D. Siddhesvara Mahadeva Temple / সিদ্ধেশ্বর মহাদেব মন্দির",
    solution: "Siddhesvara Mahadeva Temple is located in West Bengal/Central India representing Nagara/Rekha deul style, whereas the others are classical Chola/Pallava Dravidian temples."
  },
  {
    pdfQNo: 63,
    topic: 'Awards & Honors 2025',
    en: "Who among the following was awarded the Abel Prize 2025?",
    bn: "নিচের কাকে ২০২৫ সালের অ্যাবেল পুরস্কারে (Abel Prize 2025) ভূষিত করা হয়েছিল?",
    options: [
      "A. Masaki Kashiwara / মাসাকি কাশিওয়ারা",
      "B. Avi Wigderson / অ্যাভি উইগডারসন",
      "C. Luis Caffarelli / লুইস ক্যাফ্যারেলি",
      "D. Karen Uhlenbeck / কারেন উহলেনবেক"
    ],
    ans: "A. Masaki Kashiwara / মাসাকি কাশিওয়ারা",
    solution: "Japanese mathematician Masaki Kashiwara was awarded the Abel Prize 2025 for foundational contributions to algebraic analysis and representation theory."
  },
  {
    pdfQNo: 64,
    topic: 'Reports & Indices 2025',
    en: "According to the SDG NIF Progress Report of 2025, social protection coverage rose from 22% in 2016 to what percentage in 2025?",
    bn: "এসডিজি এনআইএফ প্রগ্রেস রিপোর্ট ২০২৫ অনুসারে, সামাজিক সুরক্ষার আওতা ২০১৬ সালের ২২% থেকে বেড়ে ২০২৫ সালে কত শতাংশ হয়েছে?",
    options: [
      "A. 64.3% / ৬৪.৩%",
      "B. 55% / ৫৫%",
      "C. 78% / ৭৮%",
      "D. 40% / ৪০%"
    ],
    ans: "A. 64.3% / ৬৪.৩%",
    solution: "The SDG NIF Progress Report 2025 highlighted a significant increase in social protection coverage to 64.3%."
  },
  {
    pdfQNo: 65,
    topic: 'Indian Polity',
    en: "Which article implicitly prohibits 'dual citizenship' in India?",
    bn: "কোন অনুচ্ছেদটি ভারতে 'দ্বৈত নাগরিকত্ব' নিষিদ্ধ করে?",
    options: [
      "A. Article 5 / অনুচ্ছেদ ৫",
      "B. Article 9 / অনুচ্ছেদ ৯",
      "C. Article 7 / অনুচ্ছেদ ৭",
      "D. Article 3 / অনুচ্ছেদ ৩"
    ],
    ans: "B. Article 9 / অনুচ্ছেদ ৯",
    solution: "Article 9 of the Indian Constitution states that any person who voluntarily acquires citizenship of a foreign state ceases to be a citizen of India."
  },
  {
    pdfQNo: 66,
    topic: 'Science & Environment',
    en: "A 2025 study to detect airborne microbes in the Sundarbans mangrove wetland was conducted by scientists associated with which institution?",
    bn: "সুন্দরবনের ম্যানগ্রোভ জলাভূমিতে বায়ুবাহিত জীবাণু সনাক্ত করার জন্য ২০২৫ সালের গবেষণাটি কোন প্রতিষ্ঠানের বিজ্ঞানীদের দ্বারা পরিচালিত হয়েছিল?",
    options: [
      "A. WII Dehradun / WII দেরাদুন",
      "B. IISER Kolkata / IISER কলকাতা",
      "C. NIO Goa / NIO গোয়া",
      "D. IIT Kharagpur / IIT খড়গপুর"
    ],
    ans: "B. IISER Kolkata / IISER কলকাতা",
    solution: "Scientists from IISER Kolkata conducted the pioneering aerobiological study in the Sundarbans mangrove wetland."
  },
  {
    pdfQNo: 67,
    topic: 'Indian Polity',
    en: "Which of the following is NOT a function of the President of India?",
    bn: "নিচের কোনটি ভারতের রাষ্ট্রপতির কাজ নয়?",
    options: [
      "A. Promulgating ordinances / অধ্যাদেশ জারি করা",
      "B. Presiding over Rajya Sabha sessions / রাজ্যসভার অধিবেশনে সভাপতিত্ব করা",
      "C. Granting pardons and remissions / ক্ষমা প্রদর্শন ও দণ্ড হ্রাস করা",
      "D. Summoning and proroguing Parliament / সংসদ আহ্বান ও স্থগিত করা"
    ],
    ans: "B. Presiding over Rajya Sabha sessions / রাজ্যসভার অধিবেশনে সভাপতিত্ব করা",
    solution: "Presiding over Rajya Sabha sessions is the ex-officio duty of the Vice President of India, not the President."
  },
  {
    pdfQNo: 68,
    topic: 'Computer Awareness',
    en: "In modern Windows versions (Windows 10/11), which Task Manager tab allows users to monitor real-time graphics card utilization for individual applications?",
    bn: "উইন্ডোজ ১০/১১-এ, টাস্ক ম্যানেজারের কোন ট্যাবটি ব্যবহারকারীদের একক অ্যাপ্লিকেশনের জন্য রিয়েল-টাইম গ্রাফিক্স কার্ড (GPU) ব্যবহারের ওপর নজর রাখতে দেয়?",
    options: [
      "A. Processes / প্রসেস",
      "B. App History / অ্যাপ হিস্ট্রি",
      "C. Startup / স্টার্টআপ",
      "D. Performance / পারফরম্যান্স"
    ],
    ans: "A. Processes / প্রসেস",
    solution: "The Processes tab in Windows Task Manager displays per-application GPU usage columns alongside CPU, Memory, and Disk."
  },
  {
    pdfQNo: 69,
    topic: 'Medieval History',
    en: "Which among the following kings from the early medieval period assumed the title 'Gangaikonda'?",
    bn: "আদি মধ্যযুগের নিচের কোন রাজা 'গঙ্গাইকোণ্ড' উপাধি গ্রহণ করেছিলেন?",
    options: [
      "A. Vijayalaya / বিজয়ালয়",
      "B. Rajendra I / প্রথম রাজেন্দ্র",
      "C. Pulakesin II / দ্বিতীয় পুলকেশী",
      "D. Rajaraja I / প্রথম রাজরাজ"
    ],
    ans: "B. Rajendra I / প্রথম রাজেন্দ্র",
    solution: "Chola King Rajendra I assumed the title 'Gangaikonda' (Conqueror of the Ganges) after his successful expedition to Northern India and established Gangaikondacholapuram."
  },
  {
    pdfQNo: 70,
    topic: 'Medieval History',
    en: "Between which of the following years did Razia, daughter of Iltutmish, rule the Delhi Sultanate before being removed by Turkish nobles?",
    bn: "তুর্কি অভিজাতদের দ্বারা অপসারিত হওয়ার পূর্বে ইলতুতমিশের কন্যা রাজিয়া কোন বছরগুলির মধ্যে দিল্লি সালতানাত শাসন করেছিলেন?",
    options: [
      "A. 1236-1240 / ১২৩৬-১২৪০",
      "B. 1230-1236 / ১২৩০-১২৩৬",
      "C. 1246-1250 / ১২৪৬-১২৫০",
      "D. 1240-1246 / ১২৪০-১২৪৬"
    ],
    ans: "A. 1236-1240 / ১২৩৬-১২৪০",
    solution: "Razia Sultana ruled the Delhi Sultanate from 1236 to 1240 CE as the first female Muslim ruler of South Asia."
  }
];

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const testMeta = {
      subCategory: 'Graduate Level',
      examDate: '07/05/2026',
      examTime: '12:45 PM - 2:15 PM',
      testDate: '07/05/2026',
      testTime: '12:45 PM - 2:15 PM',
      examName: 'RRB NTPC Graduate Level CBT I',
      subject: testTitle,
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
      'RRB NTPC Graduate Level CBT I',
      'RRB NTPC Graduate Level CBT I Section GK/GS Mock -02. Conducted Date: 07/05/2026, Test Time: 12:45 PM - 2:15 PM.',
      category,
      'sectional',
      40,
      1.0,
      0.33,
      true,
      Date.now(),
      JSON.stringify(testMeta)
    ]);

    console.log(`✓ Test registered in DB: ${testId}`);

    // 2. Delete existing questions for this test to re-insert freshly
    await client.query("DELETE FROM questions WHERE test_id = $1", [testId]);

    // 3. Insert Questions
    for (let i = 0; i < rawQuestions.length; i++) {
      const q = rawQuestions[i];
      const qNo = i + 1;
      const qId = `${testId}_q${qNo}`;

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
    console.log(`✓ Successfully seeded all 40 Questions into Graduate Level test '${testId}'!`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error("FAILED TO SEED GRADUATE MOCK TEST:", err);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
