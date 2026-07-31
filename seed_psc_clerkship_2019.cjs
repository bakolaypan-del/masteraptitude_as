const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.SUPABASE_DB_URI,
  ssl: { rejectUnauthorized: false }
});

const fullTestId = 'wbpsc_clerkship_2019_shift1_pyq';
const secTestId = 'wbpsc_clerkship_2019_shift1_gs_sec';

const allQuestions = [
  // ─── Q1 to Q40: General Knowledge / General Studies ─────────────────────
  {
    qNo: 1,
    topic: 'Indian Freedom Struggle',
    en: "Mahatma Gandhi had first started his non-violent non-cooperation movement in",
    bn: "মহাত্মা গান্ধী তাঁর অহিংস অসহযোগ আন্দোলন প্রথম শুরু করেন",
    options: [
      "A. UK / যুক্তরাজ্যে",
      "B. South Africa / দক্ষিণ আফ্রিকায়",
      "C. India / ভারতবর্ষে",
      "D. Zimbabwe / জিম্বাবুয়েতে"
    ],
    ans: "B. South Africa / দক্ষিণ আফ্রিকায়",
    solution: "Mahatma Gandhi first organized non-violent non-cooperation (Satyagraha) in South Africa in 1906 to protest against racial discrimination and anti-Asian laws."
  },
  {
    qNo: 2,
    topic: 'National Security & Geography',
    en: "The India-Bangladesh Border is guarded on the Indian side by",
    bn: "ভারত-বাংলাদেশ সীমান্তে ভারতের দিকে প্রহরায় মোতায়েন আছে",
    options: [
      "A. The Indian Army / ভারতীয়-সেনাবাহিনী",
      "B. Border Security Forces (BSF) / সীমান্ত সুরক্ষা বাহিনী (BSF)",
      "C. CRPF / কেন্দ্রীয় রিজার্ভ পুলিশ (CRPF)",
      "D. Indo-Tibetan Border Police / ইন্দো-তিব্বত সীমান্ত পুলিশ (ITBP)"
    ],
    ans: "B. Border Security Forces (BSF) / সীমান্ত সুরক্ষা বাহিনী (BSF)",
    solution: "The Border Security Force (BSF) is the designated border guarding force of India along the India-Bangladesh border."
  },
  {
    qNo: 3,
    topic: 'Indian Polity',
    en: "Which one of the following states of India has lost its special status due to abolition of Article 370?",
    bn: "সংবিধানের 370 ধারার অবলুপ্তির জন্য নিম্নলিখিত কোন রাজ্যের সাংবিধানিক বিশেষ মর্যাদা ক্ষুণ্ণ হয়েছে?",
    options: [
      "A. Manipur / মণিপুর",
      "B. Jammu and Kashmir / জম্মু এবং কাশ্মীর",
      "C. Nagaland / নাগাল্যান্ড",
      "D. Sikkim / সিকিম"
    ],
    ans: "B. Jammu and Kashmir / জম্মু এবং কাশ্মীর",
    solution: "In August 2019, the Parliament of India revoked Article 370, removing the special status of Jammu & Kashmir and reorganizing it into two Union Territories."
  },
  {
    qNo: 4,
    topic: 'Modern History',
    en: "Mahatma Gandhi was assassinated on 30th January",
    bn: "মহাত্মা গান্ধীকে হত্যা করা হয় 30শে জানুয়ারি",
    options: [
      "A. 1947 / 1947 সালে",
      "B. 1948 / 1948 সালে",
      "C. 1949 / 1949 সালে",
      "D. 1950 / 1950 সালে"
    ],
    ans: "B. 1948 / 1948 সালে",
    solution: "Mahatma Gandhi was assassinated on 30 January 1948 by Nathuram Godse in the compound of Birla House in New Delhi."
  },
  {
    qNo: 5,
    topic: 'Defense & Current Affairs',
    en: "The Rafale deal relates to the acquisition of",
    bn: "রাফাল চুক্তির মাধ্যমে ভারত সরকার যা কিনবে তা হলো",
    options: [
      "A. helicopters / হেলিকপ্টার",
      "B. fighter planes / যুদ্ধ বিমান",
      "C. submarines / ডুবো জাহাজ",
      "D. long range missiles / দূরপাল্লার ক্ষেপণাস্ত্র"
    ],
    ans: "B. fighter planes / যুদ্ধ বিমান",
    solution: "The Rafale deal between India and France was for the procurement of 36 Rafale multirole fighter aircraft for the Indian Air Force."
  },
  {
    qNo: 6,
    topic: 'Ancient History',
    en: "Gautam Buddha was born in",
    bn: "গৌতম বুদ্ধের জন্মস্থান হলো",
    options: [
      "A. KapilaVastu / কপিলবস্তু",
      "B. Sarnath / সারনাথ",
      "C. Bodh Gaya / বুদ্ধগয়া",
      "D. Lumbini / লুম্বিনী"
    ],
    ans: "D. Lumbini / লুম্বিনী",
    solution: "Siddhartha Gautama (Buddha) was born in Lumbini (in modern-day Nepal) around 563 BCE."
  },
  {
    qNo: 7,
    topic: 'West Bengal History & Culture',
    en: "Vidyasagar's birth place 'Birsingha' village is in",
    bn: "বিদ্যাসাগরের জন্মভূমি 'বীরসিংহ' গ্রাম",
    options: [
      "A. Hooghly district / হুগলী জেলায়",
      "B. Nadia district / নদীয়া জেলায়",
      "C. West Medinipur district / পশ্চিম মেদিনীপুর জেলায়",
      "D. Howrah district / হাওড়া জেলায়"
    ],
    ans: "C. West Medinipur district / পশ্চিম মেদিনীপুর জেলায়",
    solution: "Ishwar Chandra Vidyasagar was born in Birsingha village, located in West Medinipur (Paschim Medinipur) district of West Bengal."
  },
  {
    qNo: 8,
    topic: 'Sports & Personalities',
    en: "Who among the following persons is a Boxer?",
    bn: "নিম্নোক্ত ব্যক্তিদের মধ্যে কে কুস্তিগীর/মুষ্টিযোদ্ধা?",
    options: [
      "A. Dibyendu Barua / দিব্যেন্দু বড়ুয়া",
      "B. Chand Ram / চাঁদ রাম",
      "C. Manju Rani / মঞ্জু রানি",
      "D. Dipa Karmakar / দীপা কর্মকার"
    ],
    ans: "C. Manju Rani / মঞ্জু রানি",
    solution: "Manju Rani is an Indian amateur boxer who won the silver medal at the 2019 AIBA Women's World Boxing Championships."
  },
  {
    qNo: 9,
    topic: 'Sports & Personalities',
    en: "Jaideep Mukherjee represented India in",
    bn: "জয়দীপ মুখার্জী কোন খেলায় ভারতীয় দলে খেলেছেন?",
    options: [
      "A. Tennis / টেনিস",
      "B. Badminton / ব্যাডমিন্টন",
      "C. Cricket / ক্রিকেট",
      "D. Football / ফুটবল"
    ],
    ans: "A. Tennis / টেনিস",
    solution: "Jaidip Mukerjea is a distinguished former Indian professional tennis player and Davis Cup team player."
  },
  {
    qNo: 10,
    topic: 'Indian & West Bengal Geography',
    en: "Which one of the following rivers does not flow across the India-Bangladesh border?",
    bn: "নিম্নে বর্ণিত নদীগুলোর মধ্যে কোন নদী ভারত-বাংলাদেশ সীমানারেখা অতিক্রম করে না?",
    options: [
      "A. The Ganges / গঙ্গা",
      "B. Teesta / তিস্তা",
      "C. Atrayee / আত্রেয়ী",
      "D. Damodar / দামোদর"
    ],
    ans: "D. Damodar / দামোদর",
    solution: "The Damodar River originates in Chota Nagpur Plateau (Jharkhand) and joins the Hooghly River in West Bengal, without crossing into Bangladesh."
  },
  {
    qNo: 11,
    topic: 'Environmental Science',
    en: "Which one of the following items is sought to be banned for protection of environment?",
    bn: "পরিবেশ সংরক্ষণের জন্য কোন ধরনের ব্যাগের ব্যবহার নিষিদ্ধ করার কথা ভাবা হচ্ছে?",
    options: [
      "A. Jute bags / পাটের তৈরি ব্যাগ",
      "B. Plastic bags / প্লাস্টিক ব্যাগ",
      "C. Paper bags / কাগজের ব্যাগ",
      "D. Cloth bags / কাপড়ের ব্যাগ"
    ],
    ans: "B. Plastic bags / প্লাস্টিক ব্যাগ",
    solution: "Single-use plastic bags cause long-term environmental hazards and drain blockage, leading to worldwide bans."
  },
  {
    qNo: 12,
    topic: 'International Organizations',
    en: "Which one of the following states is not a Member of SAARC?",
    bn: "নিম্নোক্ত রাষ্ট্রগুলির মধ্যে কোনটি সার্কের সদস্য নয়?",
    options: [
      "A. Bangladesh / বাংলাদেশ",
      "B. Myanmar / মায়ানমার",
      "C. Sri Lanka / শ্রীলঙ্কা",
      "D. Nepal / নেপাল"
    ],
    ans: "B. Myanmar / মায়ানমার",
    solution: "SAARC has 8 member countries: Afghanistan, Bangladesh, Bhutan, India, Maldives, Nepal, Pakistan, and Sri Lanka. Myanmar is an observer."
  },
  {
    qNo: 13,
    topic: 'World Geography',
    en: "Which one of the following is not an independent state?",
    bn: "নিম্নলিখিত দেশগুলোর মধ্যে কোনটি স্বাধীন রাষ্ট্র নয়?",
    options: [
      "A. Australia / অস্ট্রেলিয়া",
      "B. Scotland / স্কটল্যান্ড",
      "C. Belgium / বেলজিয়াম",
      "D. Spain / স্পেন"
    ],
    ans: "B. Scotland / স্কটল্যান্ড",
    solution: "Scotland is a constituent country of the United Kingdom, not an independent sovereign state."
  },
  {
    qNo: 14,
    topic: 'Defense & Technology',
    en: "S-400 missiles are being acquired from",
    bn: "যে দেশ থেকে S-400 ক্ষেপণাস্ত্র কেনা হচ্ছে সেটি হলো",
    options: [
      "A. Sweden / সুইডেন",
      "B. UK / ব্রিটেন",
      "C. Russia / রাশিয়া",
      "D. USA / আমেরিকা"
    ],
    ans: "C. Russia / রাশিয়া",
    solution: "The S-400 Triumf air defense missile system was purchased by India from Russia."
  },
  {
    qNo: 15,
    topic: 'World Leaders',
    en: "President Donald Trump succeeded",
    bn: "নিম্নলিখিত ব্যক্তিদের মধ্যে ঠিক কোন ব্যক্তির পরে ডোনাল্ড ট্রাম্প মার্কিন যুক্তরাষ্ট্রের প্রেসিডেন্ট হয়েছিলেন?",
    options: [
      "A. Bill Clinton / বিল ক্লিনটন",
      "B. Barack Obama / বারাক ওবামা",
      "C. Colin Powel / কলিন পাওয়েল",
      "D. George Bush Jr. / জর্জ বুশ (জুনিয়র)"
    ],
    ans: "B. Barack Obama / বারাক ওবামা",
    solution: "Donald Trump became the 45th President of the United States in January 2017, succeeding Barack Obama."
  },
  {
    qNo: 16,
    topic: 'World Leaders',
    en: "Who is the present President of France?",
    bn: "ফরাসি দেশের বর্তমান রাষ্ট্রপতির নাম",
    options: [
      "A. Nicolas Sarkozy / নিকোলাস সারকোজি",
      "B. Jean Monnet / জাঁ মনেট",
      "C. Emmanuel Macron / ইমানুয়েল ম্যাকরো",
      "D. Francois Hollande / ফ্রাঁসোয়া হ্যাল্যান্ড"
    ],
    ans: "C. Emmanuel Macron / ইমানুয়েল ম্যাকরো",
    solution: "Emmanuel Macron has served as the President of France since May 2017."
  },
  {
    qNo: 17,
    topic: 'Sports Personalities',
    en: "Lionel Messi hails from",
    bn: "লাওনেল মেসি কোন দেশের নাগরিক?",
    options: [
      "A. Brazil / ব্রাজিল",
      "B. Argentina / আর্জেন্টিনা",
      "C. Bolivia / বলিভিয়া",
      "D. Portugal / পর্তুগাল"
    ],
    ans: "B. Argentina / আর্জেন্টিনা",
    solution: "Lionel Messi is a world-renowned professional footballer from Argentina."
  },
  {
    qNo: 18,
    topic: 'Awards & Honors',
    en: "The Magsaysay Award (2019) in Journalism was given to",
    bn: "2019 সালে সাংবাদিকতায় ম্যাগসেসে পুরস্কার পেলেন",
    options: [
      "A. Swapan Dasgupta / স্বপন দাশগুপ্ত",
      "B. Raveesh Kumar / রবীশ কুমার",
      "C. Arnab Goswami / অর্ণব গোস্বামী",
      "D. Ravindra Kumar / রবীন্দ্র কুমার"
    ],
    ans: "B. Raveesh Kumar / রবীশ কুমার",
    solution: "Senior Indian journalist Ravish Kumar was awarded the Ramon Magsaysay Award in 2019."
  },
  {
    qNo: 19,
    topic: 'Nobel Prizes',
    en: "Who among the following was awarded the Nobel Prize in Literature in 2019?",
    bn: "নিম্নোক্ত ব্যক্তিদের মধ্যে কাকে 2019 সালে সাহিত্যে নোবেল পুরস্কার দেওয়া হয়?",
    options: [
      "A. Peter Handke / পিটার হ্যান্ডকে",
      "B. Bob Dylan / বব ডিলন",
      "C. Olga Tokarczuk / ওল্গা টোকারজুক",
      "D. Salman Rushdie / সালমান রুশদি"
    ],
    ans: "A. Peter Handke / পিটার হ্যান্ডকে",
    solution: "Austrian author Peter Handke was awarded the 2019 Nobel Prize in Literature."
  },
  {
    qNo: 20,
    topic: 'World Geography & Politics',
    en: "Except Hong Kong, how many other Special Administrative Regions (SARs) are there in China?",
    bn: "বর্তমানে চীনে হংকং ছাড়া আর কতগুলো SARs রয়েছে?",
    options: [
      "A. 2",
      "B. 1",
      "C. 3",
      "D. None of the above / উপরের কোনটিই নয়"
    ],
    ans: "B. 1",
    solution: "China has two Special Administrative Regions (SARs): Hong Kong and Macau. Excluding Hong Kong, there is 1 other SAR (Macau)."
  },
  {
    qNo: 21,
    topic: 'Sports & Championships',
    en: "Which of the following team won the Cricket World Cup in 2019?",
    bn: "নিচে উল্লেখিত দেশগুলোর মধ্যে কোন দেশটি 2019-এ Cricket World Cup জয় করেছে?",
    options: [
      "A. South Africa / দক্ষিণ আফ্রিকা",
      "B. England / ইংল্যান্ড",
      "C. New Zealand / নিউজিল্যান্ড",
      "D. India / ভারত"
    ],
    ans: "B. England / ইংল্যান্ড",
    solution: "England won the 2019 ICC Cricket World Cup at Lord's against New Zealand."
  },
  {
    qNo: 22,
    topic: 'Sports & Olympics',
    en: "The 2016 Olympic games were held in",
    bn: "2016 সালে অলিম্পিক গেমস যে শহরে অনুষ্ঠিত হয় সেটি হলো",
    options: [
      "A. London / লন্ডন",
      "B. Rio-de-Janeiro / রিও-ডি-জেনেইরো",
      "C. Moscow / মস্কো",
      "D. Mexico city / মেক্সিকো সিটি"
    ],
    ans: "B. Rio-de-Janeiro / রিও-ডি-জেনেইরো",
    solution: "The 2016 Summer Olympics (Rio 2016) were hosted in Rio de Janeiro, Brazil."
  },
  {
    qNo: 23,
    topic: 'Indian Polity',
    en: "How many seats are there in Lok Sabha?",
    bn: "লোকসভায় আসন সংখ্যা কত?",
    options: [
      "A. 540",
      "B. 543",
      "C. 545",
      "D. 550"
    ],
    ans: "C. 545",
    solution: "In the 2019 paper key, the Lok Sabha total sanctioned strength was 545 (543 elected + 2 nominated Anglo-Indians)."
  },
  {
    qNo: 24,
    topic: 'International Organizations',
    en: "Who is currently the Chairman of IMF?",
    bn: "আন্তর্জাতিক অর্থভান্ডারের বর্তমান সভাপতির নাম",
    options: [
      "A. Christine Lagarde / ক্রিস্টিন লাগার্দ",
      "B. Kristalina Georgieva / ক্রিস্টালিনা জর্জিভা",
      "C. Jean Claude Juncker / জাঁ ক্রুদ জানকার",
      "D. Donald Tusk / ডোনাল্ড টাস্ক"
    ],
    ans: "B. Kristalina Georgieva / ক্রিস্টালিনা জর্জিভা",
    solution: "Bulgarian economist Kristalina Georgieva became Managing Director of the IMF in October 2019."
  },
  {
    qNo: 25,
    topic: 'International Organizations',
    en: "The UN Human Rights Commission has its headquarters in",
    bn: "সম্মিলিত জাতিপুঞ্জের মানবাধিকার কমিশনের সদর দপ্তর রয়েছে",
    options: [
      "A. Geneva / জেনেভায়",
      "B. Washington / ওয়াশিংটনে",
      "C. Paris / প্যারিসে",
      "D. London / লন্ডনে"
    ],
    ans: "A. Geneva / জেনেভায়",
    solution: "The UN Human Rights Office (OHCHR) and UN Human Rights Council are headquartered in Geneva, Switzerland."
  },
  {
    qNo: 26,
    topic: 'Indian Polity & Personalities',
    en: "Before becoming the president of India Pranab Mukherjee never held the post of",
    bn: "ভারতের রাষ্ট্রপতি হওয়ার আগে প্রণব মুখোপাধ্যায় নিম্নলিখিত মন্ত্রকগুলির মধ্যে কোনটির দায়িত্বে কখনও ছিলেন না?",
    options: [
      "A. Defence Minister / প্রতিরক্ষা",
      "B. Finance Minister / অর্থ",
      "C. Minister for Railways / রেল",
      "D. Minister for External Affairs / বিদেশ"
    ],
    ans: "C. Minister for Railways / রেল",
    solution: "Pranab Mukherjee served as Union Minister for Finance, Defence, and External Affairs, but never served as Railway Minister."
  },
  {
    qNo: 27,
    topic: 'Indian History',
    en: "The battle of Plassey was fought in",
    bn: "পলাশীর যুদ্ধ হয়েছিল",
    options: [
      "A. 1757 / 1757 সালে",
      "B. 1758 / 1758 সালে",
      "C. 1857 / 1857 সালে",
      "D. 1858 / 1858 সালে"
    ],
    ans: "A. 1757 / 1757 সালে",
    solution: "The Battle of Plassey took place on 23 June 1757 between Siraj-ud-Daulah (Nawab of Bengal) and Robert Clive's British forces."
  },
  {
    qNo: 28,
    topic: 'Sports & History',
    en: "The first Asian games were held in",
    bn: "প্রথম Asian games ক্রীড়া প্রতিযোগিতা যে শহরে হয়েছিল সেটি হলো",
    options: [
      "A. Jakarta / জাকার্তা",
      "B. New Delhi / নয়া দিল্লি",
      "C. Colombo / কলম্বো",
      "D. Bangkok / ব্যাংকক"
    ],
    ans: "B. New Delhi / নয়া দিল্লি",
    solution: "The inaugural Asian Games were held in New Delhi, India in 1951."
  },
  {
    qNo: 29,
    topic: 'Current Affairs & World Events',
    en: "The Easter Sunday suicide bombings in 2019 had taken place in",
    bn: "2019 সালে ইস্টারের রবিবারে আত্মঘাতী বোমার বিস্ফোরণ হয়",
    options: [
      "A. Christ Church / ক্রাইস্টচার্চ শহরে",
      "B. Colombo / কলম্বোতে",
      "C. Bradford / ব্র্যাডফোর্ডে",
      "D. Jerusalem / জেরুজালেম শহরে"
    ],
    ans: "B. Colombo / কলম্বোতে",
    solution: "On 21 April 2019 (Easter Sunday), multiple terrorist suicide bombings occurred in Colombo and other cities in Sri Lanka."
  },
  {
    qNo: 30,
    topic: 'Books & Authors',
    en: "Who is the author of the book 'The Third Pillar'?",
    bn: "'The Third Pillar' বইটির লেখকের নাম",
    options: [
      "A. Amartya Sen / অমর্ত্য সেন",
      "B. Padma Desai / পদ্মা দেশাই",
      "C. Raghuram Rajan / রঘুরাম রাজন",
      "D. Jagdish Bhagwati / জগদীশ ভগবতী"
    ],
    ans: "C. Raghuram Rajan / রঘুরাম রাজন",
    solution: "Former RBI Governor Raghuram Rajan wrote the book 'The Third Pillar: How Markets and the State Leave the Community Behind'."
  },
  {
    qNo: 31,
    topic: 'Sports & Championships',
    en: "Who won the World Championship in Badminton (women's single) in 2019?",
    bn: "2019 সালে বিশ্ব ব্যাডমিন্টন প্রতিযোগিতায় (মহিলাদের একক) সেরার সম্মান লাভ করেন",
    options: [
      "A. Sania Mirza / সানিয়া মির্জা",
      "B. Saina Nehwal / সাইনা নেহওয়াল",
      "C. P. V. Sindhu / পি. ভি. সিন্ধু",
      "D. Nozomi Okuhara / নোজুমি ওকুহারা"
    ],
    ans: "C. P. V. Sindhu / পি. ভি. সিন্ধু",
    solution: "PV Sindhu won gold at the 2019 BWF World Championships by defeating Nozomi Okuhara."
  },
  {
    qNo: 32,
    topic: 'Indian Freedom Movement',
    en: "Khudiram Bose was hanged in",
    bn: "নিম্নোক্ত কোন জায়গায় ক্ষুদিরাম বসুকে ফাঁসি দেওয়া হয়?",
    options: [
      "A. Medinipur / মেদিনীপুর",
      "B. Dum Dum Central Jail / দমদম সেন্ট্রাল জেল",
      "C. Muzaffarpur / মুজাফফরপুর",
      "D. Presidency Jail, Kolkata / প্রেসিডেন্সি জেল, কলকাতা"
    ],
    ans: "C. Muzaffarpur / মুজাফফরপুর",
    solution: "Revolutionary martyr Khudiram Bose was executed at Muzaffarpur Jail on August 11, 1908."
  },
  {
    qNo: 33,
    topic: 'General Knowledge & Culture',
    en: "Where does the Dalai Lama live?",
    bn: "দলাই লামার বাসস্থান কোথায়?",
    options: [
      "A. Mussoorie / মুসৌরী",
      "B. Rumtek Monastery / রুমটেক মঠ",
      "C. Tawang / তাওয়াং",
      "D. Mcleodganj, Dharmashala / ম্যাকলিওডগঞ্জ, ধর্মশালা"
    ],
    ans: "D. Mcleodganj, Dharmashala / ম্যাকলিওডগঞ্জ, ধর্মশালা",
    solution: "The 14th Dalai Lama resides in McLeod Ganj, Dharamshala, Himachal Pradesh, India."
  },
  {
    qNo: 34,
    topic: 'West Bengal GK',
    en: "How many districts are there in West Bengal?",
    bn: "পশ্চিমবঙ্গে কতগুলি জেলা আছে?",
    options: [
      "A. 21",
      "B. 19",
      "C. 24",
      "D. 23"
    ],
    ans: "D. 23",
    solution: "In 2019 during the exam, West Bengal had 23 districts."
  },
  {
    qNo: 35,
    topic: 'Places in News',
    en: "Balakot is in",
    bn: "'বালাকোট' জায়গাটির অবস্থান",
    options: [
      "A. India's north-east /ভারতের উত্তর-পূর্বে",
      "B. Pakistan's north-west / পাকিস্তানের উত্তর-পশ্চিমে",
      "C. Afghanistan / আফগানিস্তানে",
      "D. Iran-Afghanistan border / ইরান-আফগানিস্তান সীমান্তে"
    ],
    ans: "B. Pakistan's north-west / পাকিস্তানের উত্তর-পশ্চিমে",
    solution: "Balakot is located in the Khyber Pakhtunkhwa province of northwestern Pakistan."
  },
  {
    qNo: 36,
    topic: 'World Geography',
    en: "Fiji is in",
    bn: "'ফিজি' রাষ্ট্রের অবস্থান",
    options: [
      "A. the Asia-Pacific region / এশিয়া-প্রশান্ত মহাসাগরীয় অঞ্চলে",
      "B. the North Atlantic region / উত্তর আটলান্টিক অঞ্চলে",
      "C. North Africa / উত্তর আফ্রিকায়",
      "D. South America / দক্ষিণ আমেরিকায়"
    ],
    ans: "A. the Asia-Pacific region / এশিয়া-প্রশান্ত মহাসাগরীয় অঞ্চলে",
    solution: "Fiji is an island nation in Melanesia, part of Oceania in the South Pacific (Asia-Pacific) region."
  },
  {
    qNo: 37,
    topic: 'Indian Polity & Geography',
    en: "Which one of the following is not a Union Territory?",
    bn: "নিম্নলিখিতগুলির মধ্যে কোনটি Union Territory নয়?",
    options: [
      "A. Chandigarh / চণ্ডীগড়",
      "B. Andaman and Nicobar Islands / আন্দামান ও নিকোবর দ্বীপপুঞ্জ",
      "C. Puducherry / পুদুচেরী",
      "D. Tripura / ত্রিপুরা"
    ],
    ans: "D. Tripura / ত্রিপুরা",
    solution: "Tripura is a full-fledged State of India, while Chandigarh, Andaman & Nicobar, and Puducherry are Union Territories."
  },
  {
    qNo: 38,
    topic: 'Current Affairs',
    en: "The Howdy Modi programme was held in",
    bn: "Howdy Modi অনুষ্ঠানটি যে শহরে হয়েছিল সেটি হলো",
    options: [
      "A. Los Angeles / লস এঞ্জেলস্",
      "B. New York / নিউ ইয়র্ক",
      "C. Houston / হিউস্টন",
      "D. Washington / ওয়াশিংটন"
    ],
    ans: "C. Houston / হিউস্টন",
    solution: "The 'Howdy, Modi!' grand rally took place in Houston, Texas, USA on September 22, 2019."
  },
  {
    qNo: 39,
    topic: 'Indian Art & Personalities',
    en: "Who among the following persons was not a famous sculptor?",
    bn: "নিম্নোক্ত ব্যক্তিদের মধ্যে কে একজন প্রসিদ্ধ ভাস্কর নন?",
    options: [
      "A. Jogen Chowdhury / যোগেন চৌধুরী",
      "B. Nandalal Bose / নন্দলাল বসু",
      "C. Ramkinkar Baij / রামকিঙ্কর বেইজ",
      "D. Tarasankar Bandhopadhyay / তারাশঙ্কর বন্দ্যোপাধ্যায়"
    ],
    ans: "D. Tarasankar Bandhopadhyay / তারাশঙ্কর বন্দ্যোপাধ্যায়",
    solution: "Tarasankar Bandyopadhyay was a prominent Bengali novelist and writer, not a sculptor."
  },
  {
    qNo: 40,
    topic: 'Current Affairs & Personalities',
    en: "Greta Thunberg is",
    bn: "গ্রেটা থুনবার্গ হলেন",
    options: [
      "A. an Actor / একজন অভিনেত্রী",
      "B. a Tennis player / একজন টেনিস খেলোয়াড়",
      "C. an Environmental activist / আবহাওয়ার ধ্বংস রোধে সক্রিয় একজন কর্মী (পরিবেশ কর্মী)",
      "D. a Human Rights activist / একজন মানবাধিকার কর্মী"
    ],
    ans: "C. an Environmental activist / আবহাওয়ার ধ্বংস রোধে সক্রিয় একজন কর্মী (পরিবেশ কর্মী)",
    solution: "Greta Thunberg is a Swedish environmental activist known for initiating the School Strike for Climate."
  },

  // ─── Q41 to Q70: Arithmetic / Mathematics ────────────────────────────────
  {
    qNo: 41,
    topic: 'Ratio & Proportion',
    en: "If A : B = 2 : 3, B : C = 4 : 5 and C : D = 3 : 7, then the ratio of A : B : C : D is",
    bn: "যদি A : B = 2 : 3, B : C = 4 : 5 এবং C : D = 3 : 7 হয়, তবে A : B : C : D-এর অনুপাতটি হবে",
    options: ["A. 8 : 12 : 15 : 35", "B. 8 : 15 : 12 : 35", "C. 12 : 8 : 15 : 35", "D. 12 : 8 : 35 : 15"],
    ans: "A. 8 : 12 : 15 : 35",
    solution: "Making common terms: A:B = 8:12, B:C = 12:15. Since C=15 and C:D = 3:7 = 15:35, the ratio A:B:C:D = 8:12:15:35."
  },
  {
    qNo: 42,
    topic: 'Boats & Streams',
    en: "A boat can be rowed 9 km. upstream or 18 km. downstream in a period of 3 hrs. What is the speed of the boat in still water in km/hr?",
    bn: "একটি নৌকা 3 ঘণ্টায় স্রোতের প্রতিকূলে 9 km অথবা স্রোতের অনুকূলে 18 km যেতে পারে। স্থির জলে নৌকার বেগ কত?",
    options: ["A. 4 km/hr", "B. 4.5 km/hr", "C. 3 km/hr", "D. 3.5 km/hr"],
    ans: "B. 4.5 km/hr",
    solution: "Upstream speed U = 9/3 = 3 km/hr. Downstream speed D = 18/3 = 6 km/hr. Boat speed in still water = (D + U)/2 = (6 + 3)/2 = 4.5 km/hr."
  },
  {
    qNo: 43,
    topic: 'Pipes & Cisterns',
    en: "Two pipes can separately fill a tank in 9 hours and 12 hours respectively. If both pipes are in operation, the tank will be filled in",
    bn: "একটি চৌবাচ্চার দুটি নল দিয়ে যথাক্রমে 9 ঘণ্টায় এবং 12 ঘণ্টায় চৌবাচ্চাটি পূর্ণ হয়। দুটি নল একসঙ্গে খুলে দিলে চৌবাচ্চাটি পূর্ণ হয়—",
    options: ["A. 5 (1/7) hours", "B. 5 (2/7) hours", "C. 5 (3/7) hours", "D. 5 hours"],
    ans: "A. 5 (1/7) hours",
    solution: "Work done in 1 hour = 1/9 + 1/12 = 7/36. Total time = 36/7 = 5 (1/7) hours."
  },
  {
    qNo: 44,
    topic: 'Number System',
    en: "Sum of three consecutive even integers is 54. Find the least among them.",
    bn: "পর পর 3টি যুগ্ম সংখ্যার যোগফল 54 হলে, এদের মধ্যে ক্ষুদ্রতম সংখ্যাটি কত?",
    options: ["A. 18", "B. 15", "C. 20", "D. 16"],
    ans: "D. 16",
    solution: "Let the numbers be x-2, x, x+2. 3x = 54 => x = 18. Least integer = 18 - 2 = 16."
  },
  {
    qNo: 45,
    topic: 'LCM & HCF',
    en: "Two numbers are in the ratio 5 : 7 and their LCM is 315, their product is",
    bn: "দুটি সংখ্যার অনুপাত 5 : 7 এবং তাদের লসাগু 315 হলে, তাদের গুণফল",
    options: ["A. 2358", "B. 2538", "C. 2835", "D. 2853"],
    ans: "C. 2835",
    solution: "Let numbers be 5x and 7x. LCM = 35x = 315 => x = 9. Product = 5x * 7x = 35x^2 = 35 * 81 = 2835."
  },
  {
    qNo: 46,
    topic: 'Mixture & Alligation',
    en: "150 gm of sugar solution has 20% sugar in it. How much sugar should be added to make it 25% in the solution?",
    bn: "150 গ্রাম চিনির দ্রবণে 20% চিনি আছে। ওই দ্রবণে আরও কত গ্রাম চিনি মিশ্রিত করলে চিনির পরিমাণ মোট মিশ্রণের 25% হবে?",
    options: ["A. 10 gms", "B. 35 gms", "C. 40 gms", "D. 45 gms"],
    ans: "A. 10 gms",
    solution: "Water content = 150 * 0.80 = 120 g. Water is 75% of new solution => New Total = 120 / 0.75 = 160 g. Sugar added = 160 - 150 = 10 g."
  },
  {
    qNo: 47,
    topic: 'Speed, Time & Distance',
    en: "A person travels from P to Q at a speed of 40 kmph and returns by increasing his speed by 50%. What is his average speed for both the trips?",
    bn: "এক ব্যক্তি 40 কিলোমিটার/ঘণ্টা বেগে P থেকে Q পর্যন্ত গিয়ে তার গতিবেগ 50% বৃদ্ধি করে ফিরে আসে। সমগ্র যাত্রাপথে ব্যক্তির গড় গতিবেগ কত?",
    options: ["A. 36 kmph", "B. 45 kmph", "C. 48 kmph", "D. 50 kmph"],
    ans: "C. 48 kmph",
    solution: "Return speed = 40 + 50% of 40 = 60 kmph. Average speed = (2 * 40 * 60) / (40 + 60) = 4800 / 100 = 48 kmph."
  },
  {
    qNo: 48,
    topic: 'Time & Work',
    en: "A can do 1/3 of a work in 5 days and B can do 2/5 of the work in 10 days. In how many days both A and B can do the work?",
    bn: "A একটি কাজের 1/3 অংশ করে 5 দিনে এবং B ঐ কাজটির 2/5 অংশ 10 দিনে করতে পারে। A ও B একত্রে সম্পূর্ণ কাজটি করে—",
    options: ["A. 7 (3/4) days", "B. 9 (3/8) days", "C. 8 (4/5) days", "D. 10 days"],
    ans: "B. 9 (3/8) days",
    solution: "A's total time = 15 days, B's total time = 25 days. Combined work rate = 1/15 + 1/25 = 8/75 => Time = 75/8 = 9 (3/8) days."
  },
  {
    qNo: 49,
    topic: 'LCM & HCF',
    en: "Find the smallest number which when divided by 57, 76 and 190, leaves the remainder 1 in each case.",
    bn: "ক্ষুদ্রতম কোন সংখ্যাকে 57, 76 এবং 190 দ্বারা ভাগ করলে প্রতিক্ষেত্রে 1 অবশিষ্ট থাকে?",
    options: ["A. 1140", "B. 1141", "C. 1150", "D. 1151"],
    ans: "B. 1141",
    solution: "LCM(57, 76, 190) = 1140. Required number = 1140 + 1 = 1141."
  },
  {
    qNo: 50,
    topic: 'Fractions & Percentage',
    en: "2/3 rd of a number is 26. Find out 25% of that number.",
    bn: "কোন সংখ্যার 2/3 অংশের মান 26 হলে, সংখ্যাটির 25%-এর মান কত?",
    options: ["A. 9.25", "B. 9.35", "C. 9.55", "D. 9.75"],
    ans: "D. 9.75",
    solution: "Number = 26 * (3/2) = 39. 25% of 39 = 39 / 4 = 9.75."
  },
  {
    qNo: 51,
    topic: 'Simple Interest',
    en: "The simple interest on Rs. 500 for 6 years at 5% per annum is",
    bn: "বার্ষিক 5% সরল সুদে 500 টাকার 6 বছরের সুদ কত?",
    options: ["A. Rs. 250", "B. Rs. 150", "C. Rs. 140", "D. Rs. 120"],
    ans: "B. Rs. 150",
    solution: "SI = (500 * 5 * 6) / 100 = Rs. 150."
  },
  {
    qNo: 52,
    topic: 'Fractions & Simplification',
    en: "If 5 (5/3) - 3 (8/9) - * = 1, then the * mark place is",
    bn: "যদি 5 (5/3) - 3 (8/9) - * = 1 হয়, তবে * চিহ্নিত স্থানটিতে বসাতে হবে",
    options: ["A. 2/3", "B. 3/2", "C. 16/9", "D. 2 (1/7)"],
    ans: "C. 16/9",
    solution: "5 (5/3) = 20/3 = 60/9. 3 (8/9) = 35/9. 60/9 - 35/9 - * = 1 => 25/9 - * = 9/9 => * = 16/9."
  },
  {
    qNo: 53,
    topic: 'Time & Work',
    en: "A alone can do a piece of work in 12 days. B, who is 60% more efficient than A, will finish the work in",
    bn: "A একটি কাজ 12 দিনে করতে পারে। B, A এর চেয়ে 60% বেশি দক্ষ। তাহলে ঐ একই কাজ করতে B-এর সময় লাগবে",
    options: ["A. 7 (1/2) days", "B. 6 (1/4) days", "C. 8 days", "D. 6 days"],
    ans: "A. 7 (1/2) days",
    solution: "Efficiency ratio A:B = 100:160 = 5:8. B's time = 12 * (5/8) = 60/8 = 7.5 = 7 (1/2) days."
  },
  {
    qNo: 54,
    topic: 'Discount',
    en: "Successive discount of 10% and 30% are equivalent to a single discount of ______.",
    bn: "10% এবং 30% ক্রমিক ছাড়-এর সমতুল্য ছাড় কত শতাংশ হবে?",
    options: ["A. 33%", "B. 37%", "C. 40%", "D. 47%"],
    ans: "B. 37%",
    solution: "Single discount = 10 + 30 - (10 * 30)/100 = 40 - 3 = 37%."
  },
  {
    qNo: 55,
    topic: 'Compound Interest',
    en: "Find the amount on Rs. 10,000 for 3 years at 10% compound interest, interest being payable annually.",
    bn: "বার্ষিক 10% চক্রবৃদ্ধি হার সুদে 10,000 টাকার 3 বছরের সুদ-আসল কত হবে?",
    options: ["A. Rs. 12,340", "B. Rs. 13,210", "C. Rs. 13,320", "D. Rs. 13,310"],
    ans: "D. Rs. 13,310",
    solution: "Amount = 10000 * (1.10)^3 = 10000 * 1.331 = Rs. 13,310."
  },
  {
    qNo: 56,
    topic: 'Algebra & Simplification',
    en: "The simplified value of (2.3 * 2.3 * 2.3 - 0.027) / (2.3 * 2.3 + 0.69 + 0.09)",
    bn: "(2.3 * 2.3 * 2.3 - 0.027) / (2.3 * 2.3 + 0.69 + 0.09)-এর সরলতম মান হবে",
    options: ["A. 1", "B. 2", "C. 3", "D. 4"],
    ans: "B. 2",
    solution: "Identical form (a^3 - b^3)/(a^2 + ab + b^2) = a - b = 2.3 - 0.3 = 2."
  },
  {
    qNo: 57,
    topic: 'Percentages',
    en: "If 50% of P = 25% of Q, then P = x% of Q. Find x = ?",
    bn: "যদি P-এর 50% = Q-এর 25% হয়, তবে P = Q-এর x% হলে, x = কত?",
    options: ["A. 0.5", "B. 2", "C. 50", "D. 0.005"],
    ans: "C. 50",
    solution: "0.5 P = 0.25 Q => P = 0.5 Q = 50% of Q => x = 50."
  },
  {
    qNo: 58,
    topic: 'Ratio & Numbers',
    en: "The ratio of two numbers is 10 : 7 and their difference is 105. The sum of the numbers is",
    bn: "দুটি সংখ্যার অনুপাত 10 : 7 এবং তাদের পার্থক্য 105 হলে, সংখ্যা দুটির সমষ্টি কত?",
    options: ["A. 595", "B. 805", "C. 1190", "D. 1610"],
    ans: "A. 595",
    solution: "Difference = 3x = 105 => x = 35. Sum = 17x = 17 * 35 = 595."
  },
  {
    qNo: 59,
    topic: 'Profit & Loss',
    en: "A fruit seller bought 11 apples for Rs. 10 and sold 10 apples for Rs. 11. How much profit or loss did he make?",
    bn: "এক ফল বিক্রেতা 10 টাকা দিয়ে 11টি আপেল কিনে 11 টাকায় 10টি আপেল বিক্রয় করলেন। তার কত লাভ বা ক্ষতি হলো?",
    options: ["A. 20% loss", "B. 21% loss", "C. 20% profit", "D. 21% profit"],
    ans: "D. 21% profit",
    solution: "CP of 1 apple = 10/11, SP of 1 apple = 11/10. Profit % = [(121 - 100)/100] * 100 = 21% profit."
  },
  {
    qNo: 60,
    topic: 'Ages & Ratio',
    en: "The ratio of the ages of A, B and C is 5 : 8 : 9. If the sum of the ages of A and C be 56 years, then the age of B is",
    bn: "A, B ও C-এর বয়সের অনুপাত 5 : 8 : 9; যদি A ও C-এর বয়সের সমষ্টি 56 বছর হয়, তবে B-এর বয়স কত?",
    options: ["A. 20 years", "B. 32 years", "C. 36 years", "D. 40 years"],
    ans: "B. 32 years",
    solution: "Sum units of A and C = 5 + 9 = 14 units = 56 years => 1 unit = 4 years. Age of B = 8 * 4 = 32 years."
  },
  {
    qNo: 61,
    topic: 'Number System & Remainder',
    en: "A certain number when divided by 175 leaves a remainder 132. When the same number is divided by 25, the remainder is",
    bn: "একটি সংখ্যাকে 175 দ্বারা ভাগ করলে 132 ভাগশেষ থাকে। সংখ্যাটিকে 25 দ্বারা ভাগ করলে ভাগশেষ থাকে",
    options: ["A. 6", "B. 7", "C. 8", "D. 9"],
    ans: "B. 7",
    solution: "Since 175 is divisible by 25, the required remainder = 132 mod 25 = 7."
  },
  {
    qNo: 62,
    topic: 'BODMAS & Simplification',
    en: "0.2 + 0.2 - 0.2 / 0.2 * (0.2 * 0.2), on simplification is",
    bn: "0.2 + 0.2 - 0.2 / 0.2 * (0.2 * 0.2)-এর সরলতম মান",
    options: ["A. 0.04", "B. 0.2", "C. 1", "D. 0.36"],
    ans: "D. 0.36",
    solution: "0.2 / 0.2 = 1. (0.2 * 0.2) = 0.04. Expression = 0.2 + 0.2 - 1 * 0.04 = 0.4 - 0.04 = 0.36."
  },
  {
    qNo: 63,
    topic: 'Compound Interest',
    en: "A sum of money becomes 27 times of itself in 3 years at compound interest. The rate of interest per annum is",
    bn: "যদি কোনো আসল চক্রবৃদ্ধি হার সুদে 3 বছরে সুদে-আসলে 27 গুণ হয়, তবে বার্ষিক সুদের হার কত?",
    options: ["A. 100%", "B. 150%", "C. 75%", "D. 200%"],
    ans: "D. 200%",
    solution: "(1 + r)^3 = 27 => 1 + r = 3 => r = 2 = 200%."
  },
  {
    qNo: 64,
    topic: 'Square Root & Decimals',
    en: "sqrt(0.02 + sqrt(0.0049)) = ?",
    bn: "sqrt(0.02 + sqrt(0.0049)) = ?",
    options: ["A. 0.03", "B. 0.42", "C. 0.003", "D. 0.3"],
    ans: "D. 0.3",
    solution: "sqrt(0.0049) = 0.07. sqrt(0.02 + 0.07) = sqrt(0.09) = 0.3."
  },
  {
    qNo: 65,
    topic: 'Divisibility Rules',
    en: "If 579 * 2 be divisible by 11, the * mark digit is",
    bn: "যদি 579 * 2 সংখ্যাটি 11 দ্বারা বিভাজ্য হয়, তবে * চিহ্নিত স্থানে যে সংখ্যাটি বসবে তা হলো",
    options: ["A. 3", "B. 7", "C. 9", "D. 11"],
    ans: "C. 9",
    solution: "(5 + 9 + 2) - (7 + *) = 16 - (7 + *) = 9 - *. For divisibility by 11, 9 - * = 0 => * = 9."
  },
  {
    qNo: 66,
    topic: 'Races & Games',
    en: "In a 200 m. race, A runs at 5 km/hr. A gives B a start of 8 m and still beats him by 8 seconds. Find the speed of B in metre per second.",
    bn: "200 মিটারের একটি প্রতিযোগিতায় A ঘণ্টায় 5 কিমি বেগে দৌড়ায়। B যখন 8 মিটার এগিয়ে যায় তখন A দৌড় শুরু করে তবুও B-কে 8 সেকেন্ডে পরাজিত করে। B-এর গতিবেগ মিটার/সেকেন্ড-এ নির্ণয় করো।",
    options: ["A. 48/19 m/sec", "B. 24/19 m/sec", "C. 32/19 m/sec", "D. 60/19 m/sec"],
    ans: "B. 24/19 m/sec",
    solution: "A's speed = 25/18 m/s => A's time for 200m = 144s. B covers 192m in 152s => B's speed = 192 / 152 = 24/19 m/s."
  },
  {
    qNo: 67,
    topic: 'Time & Work',
    en: "A, B, C can do a piece of work in 6, 12 and 24 days respectively. They all together will complete the work in",
    bn: "A, B ও C একটি কাজ যথাক্রমে 6, 12 ও 24 দিনে করতে পারে। তারা একত্রে কাজটি শেষ করবে—",
    options: ["A. 7 (3/4) days", "B. 9 (3/8) days", "C. 8 (3/4) days", "D. 3 (3/7) days"],
    ans: "D. 3 (3/7) days",
    solution: "Rate = 1/6 + 1/12 + 1/24 = 7/24 => Total time = 24/7 = 3 (3/7) days."
  },
  {
    qNo: 68,
    topic: 'Simple Interest',
    en: "A certain principal amounts to Rs. 560 in 3 years and Rs. 600 in 5 years. Determine the rate of interest per annum.",
    bn: "কোনো মূলধন 3 বছরে সুদে-মূলে 560 টাকা এবং 5 বছরে সুদে-মূলে 600 টাকা হয়। বার্ষিক সুদের হার কত?",
    options: ["A. 2%", "B. 4%", "C. 6%", "D. 8%"],
    ans: "B. 4%",
    solution: "Interest in 2 yrs = 40 => 1 yr interest = 20. Principal = 560 - 60 = 500. Rate = (20/500) * 100 = 4%."
  },
  {
    qNo: 69,
    topic: 'Square Roots & Decimals',
    en: "The value of sqrt(0.01) + sqrt(0.81) + sqrt(1.21) + sqrt(0.0009) is",
    bn: "sqrt(0.01) + sqrt(0.81) + sqrt(1.21) + sqrt(0.0009)-এর মান হবে",
    options: ["A. 2.03", "B. 2.1", "C. 2.11", "D. 2.13"],
    ans: "D. 2.13",
    solution: "0.1 + 0.9 + 1.1 + 0.03 = 2.13."
  },
  {
    qNo: 70,
    topic: 'Profit & Loss',
    en: "If the ratio of cost price and selling price of an article be 10 : 11, what is the profit per cent?",
    bn: "কোনো বস্তুর ক্রয়মূল্য ও বিক্রয়মূল্যের অনুপাত 10 : 11 হলে, শতকরা লাভ কত?",
    options: ["A. 5%", "B. 10%", "C. 15%", "D. 20%"],
    ans: "B. 10%",
    solution: "Profit = 1 => Profit % = (1/10) * 100 = 10%."
  },

  // ─── Q71 to Q100: English Language ───────────────────────────────────────
  {
    qNo: 71,
    topic: 'English Prepositions',
    en: "Fill in the blank with an appropriate preposition: He was successful ________ completing the job within four days.",
    bn: "সঠিক Preposition বসাও: He was successful ________ completing the job within four days.",
    options: ["A. on", "B. in", "C. with", "D. of"],
    ans: "B. in",
    solution: "'Successful in' is followed by a gerund ('in completing')."
  },
  {
    qNo: 72,
    topic: 'English Vocabulary - Synonyms',
    en: "Find the word which has the same meaning as 'Commence'.",
    bn: "'Commence' শব্দটির সমার্থক শব্দ কোনটি?",
    options: ["A. Announce", "B. Commend", "C. Begin", "D. Comment"],
    ans: "C. Begin",
    solution: "'Commence' means to start or begin."
  },
  {
    qNo: 73,
    topic: 'English Idioms & Phrasal Verbs',
    en: "Complete the idiom: When Deepak could not solve the problem he decided to give ________.",
    bn: "উপযুক্ত শব্দ বসিয়ে ইডিয়ম পূর্ণ করো: When Deepak could not solve the problem he decided to give ________.",
    options: ["A. off", "B. up", "C. out", "D. back"],
    ans: "B. up",
    solution: "'Give up' means to cease attempting or stop trying."
  },
  {
    qNo: 74,
    topic: 'English Vocabulary',
    en: "The man was so ________ that he believed that God Himself had drunk the milk offered.",
    bn: "সঠিক শব্দ বসাও: The man was so ________ that he believed that God Himself had drunk the milk offered.",
    options: ["A. credible", "B. creditable", "C. credulous", "D. incredible"],
    ans: "C. credulous",
    solution: "'Credulous' means showing too great a readiness to believe things; gullible."
  },
  {
    qNo: 75,
    topic: 'English Tenses',
    en: "Choose the correct form of the verb: He rushed to the hospital after he ________ the news.",
    bn: "সঠিক Verb রূপ বেছে নাও: He rushed to the hospital after he ________ the news.",
    options: ["A. has heard", "B. has been heard", "C. has been hearing", "D. had heard"],
    ans: "D. had heard",
    solution: "Use Past Perfect tense ('had heard') for the action completed before another past action ('rushed')."
  },
  {
    qNo: 76,
    topic: 'Direct & Indirect Speech',
    en: "Choose the correct indirect form: He said to me, 'I have never seen such a brilliant boy in my life'.",
    bn: "সঠিক Indirect Speech বেছে নাও: He said to me, 'I have never seen such a brilliant boy in my life'.",
    options: [
      "A. That I have never seen such a brilliant boy in my life, he said to me.",
      "B. Such a brilliant boy was never seen in my life, he told me.",
      "C. The boy was so brilliant that he had never seen the like of him.",
      "D. He told me that he had never seen such a brilliant boy in his life."
    ],
    ans: "D. He told me that he had never seen such a brilliant boy in his life.",
    solution: "'said to me' -> 'told me', 'have never seen' -> 'had never seen', 'my' -> 'his'."
  },
  {
    qNo: 77,
    topic: 'Voice Change',
    en: "Change from Passive to Active Voice: The crazy girl was laughed at.",
    bn: "Passive থেকে Active Voice এ পরিবর্তন করো: The crazy girl was laughed at.",
    options: [
      "A. They laughed at the crazy girl.",
      "B. At the crazy girl they laughed.",
      "C. They were laughed at by the crazy girl.",
      "D. The crazy girl laughed at them."
    ],
    ans: "A. They laughed at the crazy girl.",
    solution: "Active form is 'They laughed at the crazy girl'."
  },
  {
    qNo: 78,
    topic: 'One Word Substitution',
    en: "Find the word that means a plant that grows in hot-dry regions covered in spines but without leaves:",
    bn: "এক কথায় প্রকাশ: a plant that grows in hot-dry regions covered in spines but without leaves",
    options: ["A. Creeper", "B. Cactus", "C. Eucalyptus", "D. Sugarcane"],
    ans: "B. Cactus",
    solution: "A cactus is a spiny, succulent desert plant adapted to arid regions."
  },
  {
    qNo: 79,
    topic: 'English Antonyms',
    en: "Find out from the given words the opposite of 'Attack'.",
    bn: "'Attack' শব্দটির বিপরীত শব্দ কোনটি?",
    options: ["A. fight", "B. return", "C. defend", "D. pounce"],
    ans: "C. defend",
    solution: "The antonym of 'attack' is 'defend'."
  },
  {
    qNo: 80,
    topic: 'English Synonyms',
    en: "Find from below the word that means 'Enormous'.",
    bn: "'Enormous' শব্দটির সমার্থক শব্দ কোনটি?",
    options: ["A. Famous", "B. Normal", "C. Incongruous", "D. Huge"],
    ans: "D. Huge",
    solution: "'Enormous' means extremely large or huge."
  },
  {
    qNo: 81,
    topic: 'One Word Substitution',
    en: "A ________ is a person who gets things secretly and illegally into or out of a country.",
    bn: "এক কথায় প্রকাশ: A person who gets things secretly and illegally into or out of a country.",
    options: ["A. importer", "B. criminal", "C. smuggler", "D. exporter"],
    ans: "C. smuggler",
    solution: "A 'smuggler' is someone who imports or exports goods illegally and secretly."
  },
  {
    qNo: 82,
    topic: 'English Sentence Improvement',
    en: "Find the appropriate word for the underlined part: The handkerchief was turned into a bird by the magician.",
    bn: "রেখাঙ্কিত শব্দের সঠিক বিকল্প: The handkerchief was turned into a bird by the magician.",
    options: ["A. stuffed", "B. put", "C. transformed", "D. puffed"],
    ans: "C. transformed",
    solution: "'Turned into' means transformed."
  },
  {
    qNo: 83,
    topic: 'English Prepositions',
    en: "He was too preoccupied ________ his studies to think of other matters.",
    bn: "সঠিক Preposition বসাও: He was too preoccupied ________ his studies to think of other matters.",
    options: ["A. with", "B. in", "C. at", "D. on"],
    ans: "A. with",
    solution: "'Preoccupied with' is the correct prepositional combination."
  },
  {
    qNo: 84,
    topic: 'Voice Change',
    en: "Change from Active to Passive Voice: The boys are flying kites in the sky.",
    bn: "Active থেকে Passive Voice এ পরিবর্তন করো: The boys are flying kites in the sky.",
    options: [
      "A. Kites are flying in the sky by the boys.",
      "B. In the sky, kites are flown by the boys.",
      "C. Kites are being flown by the boys in the sky.",
      "D. The flying of kites in the sky is done by the boys."
    ],
    ans: "C. Kites are being flown by the boys in the sky.",
    solution: "Active continuous 'are flying' changes to passive 'are being flown'."
  },
  {
    qNo: 85,
    topic: 'English Prepositions',
    en: "Fill in the blank: The tired hawker sat ________ the tree.",
    bn: "সঠিক Preposition বসাও: The tired hawker sat ________ the tree.",
    options: ["A. up", "B. in", "C. from", "D. under"],
    ans: "D. under",
    solution: "Sitting in the shade of a tree is expressed as 'sat under the tree'."
  },
  {
    qNo: 86,
    topic: 'English Prepositions',
    en: "Fill in the blank: Sita and Meera quarrelled ________ themselves.",
    bn: "সঠিক Preposition বসাও: Sita and Meera quarrelled ________ themselves.",
    options: ["A. among", "B. between", "C. with", "D. for"],
    ans: "B. between",
    solution: "Use 'between' when referring to two people (Sita and Meera)."
  },
  {
    qNo: 87,
    topic: 'Phrasal Verbs',
    en: "Replace the underlined verb with phrasal verb: He decided to visit him at his home.",
    bn: "রেখাঙ্কিত Verb-এর বদলে সঠিক Phrasal Verb বসাও: He decided to visit him at his home.",
    options: ["A. Call for", "B. Call on", "C. Call up", "D. Call off"],
    ans: "B. Call on",
    solution: "'Call on' means to pay a visit to someone."
  },
  {
    qNo: 88,
    topic: 'English Prepositions',
    en: "Fill in the blank: Ram was good ________ Chemistry.",
    bn: "সঠিক Preposition বসাও: Ram was good ________ Chemistry.",
    options: ["A. at", "B. with", "C. about", "D. over"],
    ans: "A. at",
    solution: "'Good at' a subject means proficient or skillful in it."
  },
  {
    qNo: 89,
    topic: 'Sentence Transformation',
    en: "Change into an interrogative sentence: You have had your dinner.",
    bn: "Interrogative sentence-এ পরিবর্তন করো: You have had your dinner.",
    options: [
      "A. Had you have your dinner?",
      "B. Have you had your dinner?",
      "C. What about your dinner, did you have it?",
      "D. Did you have your dinner?"
    ],
    ans: "B. Have you had your dinner?",
    solution: "Invert auxiliary 'Have' and subject 'you': 'Have you had your dinner?'"
  },
  {
    qNo: 90,
    topic: 'English Prepositions',
    en: "Rita's mother did not approve ________ her returning home so late at night.",
    bn: "সঠিক Preposition বসাও: Rita's mother did not approve ________ her returning home so late at night.",
    options: ["A. for", "B. on", "C. to", "D. of"],
    ans: "D. of",
    solution: "'Approve of' is the correct prepositional verb."
  },
  {
    qNo: 91,
    topic: 'Subject-Verb Agreement',
    en: "Neither Lata nor Sujata ________ present in class on 14th October.",
    bn: "সঠিক Verb রূপ বসাও: Neither Lata nor Sujata ________ present in class on 14th October.",
    options: ["A. were", "B. are", "C. was", "D. have been"],
    ans: "C. was",
    solution: "Subjects joined by 'neither... nor' take a singular verb when both subjects are singular."
  },
  {
    qNo: 92,
    topic: 'English Vocabulary',
    en: "All ________ Alok were present during the meeting.",
    bn: "সঠিক শব্দ বসাও: All ________ Alok were present during the meeting.",
    options: ["A. except", "B. expect", "C. exceed", "D. accept"],
    ans: "A. except",
    solution: "'Except' means with the exclusion of."
  },
  {
    qNo: 93,
    topic: 'Spelling Test',
    en: "Choose the correct spelling:",
    bn: "সঠিক বানানটি বেছে নাও:",
    options: ["A. Exaggerate", "B. Exagarate", "C. Exaggarate", "D. Exagerate"],
    ans: "A. Exaggerate",
    solution: "Correct spelling is E-X-A-G-G-E-R-A-T-E."
  },
  {
    qNo: 94,
    topic: 'English Synonyms',
    en: "Find from below the word that means 'Essential':",
    bn: "'Essential' শব্দটির সমার্থক শব্দ কোনটি?",
    options: ["A. Unimportant", "B. Irrelevant", "C. Essence", "D. Vital"],
    ans: "D. Vital",
    solution: "'Vital' means absolutely necessary or essential."
  },
  {
    qNo: 95,
    topic: 'English Idioms',
    en: "Complete the idiom: The old lady was murdered in cold ________.",
    bn: "ইডিয়ম পূর্ণ করো: The old lady was murdered in cold ________.",
    options: ["A. ice", "B. water", "C. blood", "D. milk"],
    ans: "C. blood",
    solution: "The idiom 'in cold blood' means ruthlessly and deliberately."
  },
  {
    qNo: 96,
    topic: 'English Prepositions',
    en: "The policeman seized him ________ his arm and led him away.",
    bn: "সঠিক Preposition বসাও: The policeman seized him ________ his arm and led him away.",
    options: ["A. by", "B. with", "C. at", "D. on"],
    ans: "A. by",
    solution: "'Seized him by his arm' is the correct idiom."
  },
  {
    qNo: 97,
    topic: 'Spelling Test',
    en: "Choose the correct spelling from the options below:",
    bn: "সঠিক বানানটি বেছে নাও:",
    options: ["A. Hyphanated", "B. Hyphennated", "C. Hyphannated", "D. Hyphenated"],
    ans: "D. Hyphenated",
    solution: "Correct spelling is H-Y-P-H-E-N-A-T-E-D."
  },
  {
    qNo: 98,
    topic: 'English Idioms',
    en: "Complete the idiom: His old shoes have stood him in good ________ in his travels.",
    bn: "ইডিয়ম পূর্ণ করো: His old shoes have stood him in good ________ in his travels.",
    options: ["A. stead", "B. years", "C. price", "D. manner"],
    ans: "A. stead",
    solution: "The idiom 'stand someone in good stead' means to be useful or advantageous."
  },
  {
    qNo: 99,
    topic: 'English Vocabulary',
    en: "The examiner could not understand the candidate's handwriting because it was ________.",
    bn: "সঠিক শব্দ বসাও: The examiner could not understand the candidate's handwriting because it was ________.",
    options: ["A. distinct", "B. shining", "C. stylish", "D. illegible"],
    ans: "D. illegible",
    solution: "'Illegible' means impossible or difficult to read."
  },
  {
    qNo: 100,
    topic: 'English Vocabulary',
    en: "Replace the underlined word: The time allowed for the work should have been adequate.",
    bn: "রেখাঙ্কিত শব্দের সঠিক বিকল্প: The time allowed for the work should have been adequate.",
    options: ["A. indefinite", "B. subsequent", "C. efficient", "D. sufficient"],
    ans: "D. sufficient",
    solution: "'Adequate' means sufficient or enough."
  }
];

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Insert or update entry in `pyqs` table for Archive & Practice
    const pyqQuery = `
      INSERT INTO pyqs (id, data)
      VALUES ($1, $2)
      ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data;
    `;

    const pyqData = {
      title: 'WB PSC Clerkship 2019 (1st Shift) Official Question Paper',
      subject: 'WBPSC Clerkship',
      pyqSubject: 'WBPSC Clerkship',
      category: 'WPSC',
      content: 'Official WB PSC Clerkship 2019 1st Shift Question Paper Series A with complete 100 questions, answer key, and step-by-step bilingual solutions.',
      description: 'Official WB PSC Clerkship 2019 1st Shift Question Paper (Series A). 100 Questions, 90 Mins, 100 Marks. Includes General Studies (40 Qs), Arithmetic (30 Qs), and English (30 Qs).',
      status: 'published',
      pinned: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      metadata: {
        category: 'WPSC',
        pyqSubject: 'WBPSC Clerkship',
        testId: fullTestId,
        examYear: '2019',
        shift: '1st Shift',
        totalQuestions: 100
      }
    };

    await client.query(pyqQuery, [fullTestId, JSON.stringify(pyqData)]);
    console.log(`✓ Registered PYQ paper entry: ${fullTestId}`);

    // 2. Insert or update Full Mock Test in `tests` table (100 Questions)
    const fullTestMeta = {
      category: 'WPSC',
      subCategory: 'PSC Clerkship',
      examYear: '2019',
      shift: '1st Shift',
      testType: 'pyq',
      isPYQ: true,
      questionCount: 100,
      passMarks: 40,
      totalMarks: 100,
      language: 'Bilingual (English & Bengali)'
    };

    const insertFullTestQuery = `
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

    await client.query(insertFullTestQuery, [
      fullTestId,
      'WB PSC Clerkship 2019 (1st Shift) - Official PYQ Full Mock Test',
      'WBPSC Clerkship',
      'WB PSC Clerkship 2019 (1st Shift)',
      'Official WB PSC Clerkship 2019 1st Shift Full Question Paper. 100 Questions, 90 Minutes, 100 Marks (1/3 negative marking).',
      'WPSC',
      'pyq',
      90,
      1.0,
      0.33,
      true,
      Date.now(),
      JSON.stringify(fullTestMeta)
    ]);
    console.log(`✓ Registered Full Mock Test: ${fullTestId}`);

    // 3. Insert or update Sectional Mock Test in `tests` table (40 Questions Q1-Q40 General Studies)
    const secTestMeta = {
      category: 'WPSC',
      subCategory: 'PSC Clerkship',
      examYear: '2019',
      shift: '1st Shift',
      testType: 'sectional',
      isPYQ: true,
      questionCount: 40,
      passMarks: 16,
      totalMarks: 40,
      language: 'Bilingual (English & Bengali)'
    };

    await client.query(insertFullTestQuery, [
      secTestId,
      'WB PSC Clerkship 2019 (1st Shift) General Studies Sectional Mock',
      'General Studies',
      'WB PSC Clerkship',
      'WB PSC Clerkship 2019 1st Shift General Knowledge / General Studies Sectional Mock. 40 Questions (Q1-Q40), 40 Minutes, 40 Marks.',
      'WPSC',
      'sectional',
      40,
      1.0,
      0.33,
      true,
      Date.now(),
      JSON.stringify(secTestMeta)
    ]);
    console.log(`✓ Registered Sectional Mock Test: ${secTestId}`);

    // 4. Delete existing questions for both test IDs
    await client.query("DELETE FROM questions WHERE test_id IN ($1, $2)", [fullTestId, secTestId]);

    // 5. Insert all 100 questions into Full Mock Test (`wbpsc_clerkship_2019_shift1_pyq`)
    for (let i = 0; i < allQuestions.length; i++) {
      const q = allQuestions[i];
      const qId = `${fullTestId}_q${q.qNo}`;
      const questionText = `<div class="en-content">${q.en}</div><div class="bn-content">${q.bn}</div>`;
      const qMeta = { pdfQNo: q.qNo, questionEn: q.en, questionBn: q.bn };

      const insertQQuery = `
        INSERT INTO questions (
          id, test_id, topic, q_no, question_text, options, image_url,
          correct_answer, equation_latex, solution, explanation, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12);
      `;

      await client.query(insertQQuery, [
        qId,
        fullTestId,
        q.topic,
        q.qNo,
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
    console.log(`✓ Successfully inserted all 100 questions into Full Mock Test '${fullTestId}'!`);

    // 6. Insert 40 GS questions (Q1 to Q40) into Sectional Mock Test (`wbpsc_clerkship_2019_shift1_gs_sec`)
    for (let i = 0; i < 40; i++) {
      const q = allQuestions[i];
      const qId = `${secTestId}_q${q.qNo}`;
      const questionText = `<div class="en-content">${q.en}</div><div class="bn-content">${q.bn}</div>`;
      const qMeta = { pdfQNo: q.qNo, questionEn: q.en, questionBn: q.bn };

      const insertQQuery = `
        INSERT INTO questions (
          id, test_id, topic, q_no, question_text, options, image_url,
          correct_answer, equation_latex, solution, explanation, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12);
      `;

      await client.query(insertQQuery, [
        qId,
        secTestId,
        q.topic,
        q.qNo,
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
    console.log(`✓ Successfully inserted 40 GS questions into Sectional Mock Test '${secTestId}'!`);

    await client.query('COMMIT');
    console.log("✓ ALL SEEDING COMPLETED SUCCESSFULLY FOR WB PSC CLERKSHIP 2019 1ST SHIFT!");

  } catch (err) {
    await client.query('ROLLBACK');
    console.error("FAILED TO SEED WB PSC CLERKSHIP 2019 TEST:", err);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
