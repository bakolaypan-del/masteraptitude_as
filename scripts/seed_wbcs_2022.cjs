const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');

const keyPath = path.resolve(__dirname, '../service-account-key1.json');
if (!fs.existsSync(keyPath)) {
  console.error(`Error: Service account key not found at ${keyPath}`);
  process.exit(1);
}

const serviceAccount = require(keyPath);

const app = admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = getFirestore(app);

const testId = "wbcs_pre_2022_official";

const testMetaData = {
  title: "WBCS (Prelims) 2022 Official Question Paper",
  topic: "General Studies — Series B",
  subject_name: "General Studies",
  description: "Official WBCS Prelims 2022 General Studies Paper (Series B). 200 Questions, 150 Minutes, 200 Marks with 1/3 negative marking.",
  category: "WBCS",
  test_type: "PYQ Mock Test",
  duration: 150,
  marks_per_correct: 1,
  negative_marks: 0.333,
  is_active: true,
  createdAt: Date.now(),
  updatedAt: Date.now()
};

const pyqData = {
  title: "WBCS (Prelims) 2022 Official Test Booklet (Series B)",
  subject: "State Exams",
  format: "text",
  content: "Official WBCS Prelims 2022 General Studies Question Paper Series B with full answer keys, bilingual solutions, and equations.",
  status: "published",
  pinned: true,
  createdAt: Date.now(),
  updatedAt: Date.now()
};

// 200 WBCS Prelims 2022 Questions
const questionsData = [
  {
    q_no: 1,
    question_text: "<p>\"I have done my duty.\"—Which tense is this?</p>",
    options: ["(A) Present Indefinite", "(B) Present Perfect", "(C) Past Perfect", "(D) Past Indefinite"],
    correct_answer: "B",
    explanation: "The sentence uses 'have' + past participle 'done', which is the structure of Present Perfect Tense."
  },
  {
    q_no: 2,
    question_text: "<p>Find the synonym of 'Covert'.</p>",
    options: ["(A) Revert", "(B) Secret", "(C) Desert", "(D) Honest"],
    correct_answer: "B",
    explanation: "'Covert' means secret or hidden, not openly acknowledged or displayed."
  },
  {
    q_no: 3,
    question_text: "<p>What is the most appropriate passive form of \"Who has done the work?\"?</p>",
    options: ["(A) Who has been done the work?", "(B) By whom has been done the work?", "(C) Whom has done the work by?", "(D) By whom has the work been done?"],
    correct_answer: "D",
    explanation: "Active interrogative with 'Who' changes to 'By whom + auxiliary + subject + been + V3'."
  },
  {
    q_no: 4,
    question_text: "<p>What part of speech is the word 'Adjective'?</p>",
    options: ["(A) Pronoun", "(B) Noun", "(C) Adjective", "(D) Adverb"],
    correct_answer: "B",
    explanation: "The word 'Adjective' itself is a name of a grammatical category, making it a Noun."
  },
  {
    q_no: 5,
    question_text: "<p>Find the correctly spelt word.</p>",
    options: ["(A) Rehearsal", "(B) Reversal", "(C) Rehearsal", "(D) Rehearsel"],
    correct_answer: "A",
    explanation: "The correct spelling is R-E-H-E-A-R-S-A-L."
  },
  {
    q_no: 6,
    question_text: "<p>'Philanthropist' means</p>",
    options: ["(A) Humanitarian", "(B) Hater of man", "(C) Lover of animals", "(D) Lover of books"],
    correct_answer: "A",
    explanation: "A philanthropist is a person who seeks to promote the welfare of others (a humanitarian)."
  },
  {
    q_no: 7,
    question_text: "<p>Give the one word substitution of: One who talks continuously</p>",
    options: ["(A) Voracious", "(B) Impecunious", "(C) Loquacious", "(D) Avaricious"],
    correct_answer: "C",
    explanation: "'Loquacious' means tending to talk a great deal; talkative."
  },
  {
    q_no: 8,
    question_text: "<p>Instead of 'tolerance' we can say</p>",
    options: ["(A) bear on", "(B) bear in", "(C) bear with", "(D) bear at"],
    correct_answer: "C",
    explanation: "'Bear with' means to be patient with or tolerate someone."
  },
  {
    q_no: 9,
    question_text: "<p>What type of sentence is 'Do or Die'?</p>",
    options: ["(A) Simple", "(B) Complex", "(C) Exclamatory", "(D) Compound"],
    correct_answer: "D",
    explanation: "'Do or Die' consists of two imperative clauses joined by coordinating conjunction 'or', forming a Compound sentence."
  },
  {
    q_no: 10,
    question_text: "<p>What is the synonym of 'Atrocity'?</p>",
    options: ["(A) Solidarity", "(B) Pity", "(C) Cruelty", "(D) Punctuality"],
    correct_answer: "C",
    explanation: "'Atrocity' means an extremely wicked or cruel act."
  },
  {
    q_no: 11,
    question_text: "<p>The antonym of 'Forgo' is</p>",
    options: ["(A) Claim", "(B) Despise", "(C) Undergo", "(D) Remember"],
    correct_answer: "A",
    explanation: "'Forgo' means to give up or do without. Its antonym is to claim or retain."
  },
  {
    q_no: 12,
    question_text: "<p>The idiomatic expression 'A slap on the wrist' means</p>",
    options: ["(A) Short on time", "(B) A very mild punishment", "(C) To have a dispute", "(D) To force an issue"],
    correct_answer: "B",
    explanation: "'A slap on the wrist' is a small or very mild warning/punishment."
  },
  {
    q_no: 13,
    question_text: "<p>Replace the underlined portion with an idiom: They finally <u>agreed on the business deal</u>.</p>",
    options: ["(A) let the cat out of the bag", "(B) see eye to eye", "(C) to feel under the weather", "(D) to cut a corner"],
    correct_answer: "B",
    explanation: "'See eye to eye' means to agree with someone."
  },
  {
    q_no: 14,
    question_text: "<p>It has been established that (P) Einstein was (Q) although a great scientist (R) weak in arithmetic (S) right from his school days. Proper sequence is:</p>",
    options: ["(A) (Q) (P) (R) (S)", "(B) (P) (R) (S) (Q)", "(C) (P) (S) (Q) (R)", "(D) (Q) (P) (S) (R)"],
    correct_answer: "A",
    explanation: "Although a great scientist, Einstein was weak in arithmetic right from his school days -> Q P R S."
  },
  {
    q_no: 15,
    question_text: "<p>Give one word substitution of: Creature having both male and female organs</p>",
    options: ["(A) Sodomite", "(B) Homosexual", "(C) Masochist", "(D) Hermaphrodite"],
    correct_answer: "D",
    explanation: "A hermaphrodite is an organism having both male and female reproductive organs."
  },
  {
    q_no: 16,
    question_text: "<p>Fill in the blank: Ram and his brothers were four in ______.</p>",
    options: ["(A) quantity", "(B) number", "(C) numbers", "(D) totality"],
    correct_answer: "B",
    explanation: "The correct phrase is 'four in number'."
  },
  {
    q_no: 17,
    question_text: "<p>Choose the appropriate antonym of 'Adore'.</p>",
    options: ["(A) Love", "(B) Like", "(C) Hate", "(D) Ignore"],
    correct_answer: "C",
    explanation: "'Adore' means to love deeply. Its opposite is 'Hate'."
  },
  {
    q_no: 18,
    question_text: "<p>Fill in the blank: She has no control ______ her temper.</p>",
    options: ["(A) on", "(B) with", "(C) over", "(D) after"],
    correct_answer: "C",
    explanation: "The preposition used with control over something is 'over'."
  },
  {
    q_no: 19,
    question_text: "<p>Fill in the blank: What are you worrying ______?</p>",
    options: ["(A) to", "(B) with", "(C) for", "(D) about"],
    correct_answer: "D",
    explanation: "The preposition associated with worrying is 'about'."
  },
  {
    q_no: 20,
    question_text: "<p>An Obstetrician deals with</p>",
    options: ["(A) Child disease", "(B) Liver disease", "(C) Pregnancy & child birth", "(D) Nerve disease"],
    correct_answer: "C",
    explanation: "An obstetrician is a physician who specializes in childbirth and pregnancy."
  },
  {
    q_no: 21,
    question_text: "<p>Use a correct gerund: I like ______ pictures.</p>",
    options: ["(A) painting", "(B) painted", "(C) to paint", "(D) paint"],
    correct_answer: "A",
    explanation: "'Painting' is the gerund form acting as a noun object of 'like'."
  },
  {
    q_no: 22,
    question_text: "<p>Fill in the blank: He spends hours ______ the phone everyday.</p>",
    options: ["(A) at", "(B) on", "(C) with", "(D) in"],
    correct_answer: "B",
    explanation: "The idiom is 'on the phone'."
  },
  {
    q_no: 23,
    question_text: "<p>Fill in the blank: He works ______ an insurance company.</p>",
    options: ["(A) for", "(B) at", "(C) in", "(D) with"],
    correct_answer: "A",
    explanation: "Working as an employee for an organization takes the preposition 'for'."
  },
  {
    q_no: 24,
    question_text: "<p>Which one is the plural number?</p>",
    options: ["(A) Index", "(B) Alumni", "(C) Hypothesis", "(D) Analysis"],
    correct_answer: "B",
    explanation: "'Alumni' is the plural form of 'Alumnus'."
  },
  {
    q_no: 25,
    question_text: "<p>Insert the right preposition: He died ______ dengue.</p>",
    options: ["(A) with", "(B) from", "(C) of", "(D) by"],
    correct_answer: "C",
    explanation: "Dying of a specific disease takes the preposition 'of'."
  },
  {
    q_no: 26,
    question_text: "<p>The radioactive element used in heart-pacemakers is / হার্ট-পেসমেকারে কোন তেজস্ক্রিয় উপাদান ব্যবহার করা হয়?</p>",
    options: ["(A) Uranium / ইউরেনিয়াম", "(B) Deuterium / ডয়টেরিয়াম", "(C) Plutonium / প্লুটোনিয়াম", "(D) Radium / রেডিয়াম"],
    correct_answer: "C",
    explanation: "Plutonium-238 is used in nuclear-powered heart pacemakers."
  },
  {
    q_no: 27,
    question_text: "<p>Which of the following isotopes is used in dating archaeological findings? / প্রত্নতাত্ত্বিক উপাদানের বয়স নির্ণয় করতে কোন আইসোটোপ ব্যবহার করা হয়?</p>",
    options: ["(A) $_9^{235}\\text{U}$", "(B) $_6^{14}\\text{C}$", "(C) $_1^3\\text{H}$", "(D) $_8^{18}\\text{O}$"],
    correct_answer: "B",
    explanation: "Carbon-14 ($^{14}\\text{C}$) dating is used for radiocarbon dating of archaeological organic matter."
  },
  {
    q_no: 28,
    question_text: "<p>West Bengal Industrial Development Corporation Ltd. (WBIDC) was established in / ওয়েস্ট বেঙ্গল ইন্ডাস্ট্রিয়াল ডেভেলপমেন্ট কর্পোরেশন লিমিটেড (WBIDC) স্থাপিত হয়</p>",
    options: ["(A) 1967", "(B) 1981", "(C) 1977", "(D) 1983"],
    correct_answer: "A",
    explanation: "WBIDC was established in 1967 to foster industrial growth in West Bengal."
  },
  {
    q_no: 29,
    question_text: "<p>Phytopthora palmivora is a / Phytopthora palmivora হল একপ্রকার</p>",
    options: ["(A) bio-pesticide / জৈব জীবাণুনাশক", "(B) bio-insecticide / জৈব পতঙ্গনাশক", "(C) mycoherbicide / ছত্রাকঘটিত আগাছানাশক", "(D) first bio-herbicide / প্রথম জৈব আগাছানাশক"],
    correct_answer: "C",
    explanation: "Phytopthora palmivora is used as a mycoherbicide to control milkweed vine."
  },
  {
    q_no: 30,
    question_text: "<p>acme : mace :: alga : ?...</p>",
    options: ["(A) glaa", "(B) gaal", "(C) laga", "(D) gala"],
    correct_answer: "D",
    explanation: "Anagram of 'acme' rearranged (1-2-3-4 -> 3-1-2-4) gives 'mace'. Similarly 'alga' rearranges to 'gala'."
  },
  {
    q_no: 31,
    question_text: "<p>Which of the following pair do not match? / নীচের জোড়গুলির মধ্যে কোনটি বেঠিক?</p>",
    options: ["(A) Jaunpur — Atala Masjid / জৌনপুর — অটল মসজিদ", "(B) Malwa — Jahaz Mahal / মালোয়া — জাহাজ মহল", "(C) Ajmer — Kubbatul Islam / আজমেড় — কুব্বাতুল ইসলাম", "(D) Gaur — Bara Sona Masjid / গৌড় — বড় সোনা মসজিদ"],
    correct_answer: "C",
    explanation: "Quwwat-ul-Islam mosque is located in Delhi (Qutb complex), not Ajmer."
  },
  {
    q_no: 32,
    question_text: "<p>Who is the present Chairman of UPSC? (2022) / ইউ পি এস সি-র বর্তমান চেয়ারম্যান কে?</p>",
    options: ["(A) Manoj Soni / মনোজ সনি", "(B) Arvind Saxena / অরবিন্দ সাক্সেনা", "(C) Vinay Mittal / বিনয় মিত্তাল", "(D) P. K. Joshi / পি. কে. যোশী"],
    correct_answer: "A",
    explanation: "Dr. Manoj Soni was appointed as UPSC Chairman in April 2022."
  },
  {
    q_no: 33,
    question_text: "<p>The Self-respect Movement was founded by / আত্ম-সম্মান আন্দোলন প্রতিষ্ঠিত হয়</p>",
    options: ["(A) Ambedkar / আম্বেদকরের দ্বারা", "(B) Periyar E. V. Ramasamy Naicker / পেরিয়ার ই. ভি. রামস্বামী নাইকারের দ্বারা", "(C) Dinkarrao Javalkar / দিনকররাও জাভালকরের দ্বারা", "(D) Keshavrao Jedhe / কেশবরাও জেধের দ্বারা"],
    correct_answer: "B",
    explanation: "The Self-Respect Movement was started in Tamil Nadu in 1925 by S. Ramanathan and Periyar E. V. Ramasamy."
  },
  {
    q_no: 34,
    question_text: "<p>Chand Bibi ruled over which of the Deccan Sultanates? / চাঁদ বিবি দাক্ষিণাত্যের কোন সুলতানির শাসক ছিলেন?</p>",
    options: ["(A) Bijapur / বিজাপুর", "(B) Berar / বেরার", "(C) Ahmednagar / আহমেদনগর", "(D) Golkonda / গোলকোন্ডা"],
    correct_answer: "C",
    explanation: "Chand Bibi was the Regent of Bijapur and Ahmednagar."
  },
  {
    q_no: 35,
    question_text: "<p>Pure water freezes at a temperature— / বিশুদ্ধ জল যে তাপমাত্রায় জমে যায়—</p>",
    options: ["(A) $47^\\circ\\text{F}$", "(B) $32^\\circ\\text{F}$", "(C) $0^\\circ\\text{F}$", "(D) $19^\\circ\\text{F}$"],
    correct_answer: "B",
    explanation: "Pure water freezes at $0^\\circ\\text{C}$, which equals $32^\\circ\\text{F}$."
  },
  {
    q_no: 36,
    question_text: "<p>As of 2022, which country is the biggest opium producer? / 2022 অনুযায়ী বিশ্বের বৃহত্তম আফিম উৎপাদক দেশ কোনটি?</p>",
    options: ["(A) China / চীন", "(B) India / ভারত", "(C) Afghanistan / আফগানিস্তান", "(D) Nepal / নেপাল"],
    correct_answer: "C",
    explanation: "Afghanistan produces over 80% of global illicit opium supply."
  },
  {
    q_no: 37,
    question_text: "<p>Who painted the image of Bharat Mata? / 'ভারত মাতা'র চিত্রটি কে অঙ্কন করেছেন?</p>",
    options: ["(A) Rabindranath Tagore / রবীন্দ্রনাথ ঠাকুর", "(B) Abanindranath Tagore / অবনীন্দ্রনাথ ঠাকুর", "(C) Bankim Chandra Chattopadhyay / বঙ্কিমচন্দ্র চট্টোপাধ্যায়", "(D) Mahatma Gandhi / মহাত্মা গান্ধী"],
    correct_answer: "B",
    explanation: "Abanindranath Tagore painted Bharat Mata in 1905 during the Swadeshi Movement."
  },
  {
    q_no: 38,
    question_text: "<p>Loktak lake is located in the state of / লোকটাক হ্রদটি কোন রাজ্যে অবস্থিত?</p>",
    options: ["(A) Karnataka / কর্ণাটক", "(B) Arunachal Pradesh / অরুণাচল প্রদেশ", "(C) Manipur / মণিপুর", "(D) Bihar / বিহার"],
    correct_answer: "C",
    explanation: "Loktak Lake is the largest freshwater lake in Northeast India, located in Manipur."
  },
  {
    q_no: 39,
    question_text: "<p>Who among the following Viceroys repealed the Vernacular Press Act of 1878? / নিম্নলিখিত ভাইসরয়দের মধ্যে কে 1878 সালে 'দেশীয় সংবাদপত্র আইন' (Vernacular Press Act) বাতিল করেন?</p>",
    options: ["(A) Lord Lytton / লর্ড লিটন", "(B) Lord Curzon / লর্ড কার্জন", "(C) Lord Dufferin / লর্ড ডাফরিন", "(D) Lord Ripon / লর্ড রিপন"],
    correct_answer: "D",
    explanation: "Lord Ripon repealed the Vernacular Press Act in 1881."
  },
  {
    q_no: 40,
    question_text: "<p>Who has been appointed as the CEO and MD of Air India? (2022) / বর্তমানে কে এয়ার ইন্ডিয়া'র সি ই ও এবং এম ডি নিযুক্ত হয়েছেন?</p>",
    options: ["(A) Campbell Wilson / ক্যাম্পবেল উইলসন", "(B) Ajay Singh / অজয় সিং", "(C) Alan Joyce / অ্যালান জয়েস", "(D) Maen Razougi / মহিন রাযুগী"],
    correct_answer: "A",
    explanation: "Campbell Wilson was appointed CEO & MD of Air India in 2022."
  },
  {
    q_no: 41,
    question_text: "<p>'ELISA' test is employed to diagnose / 'ELISA' টেস্ট পদ্ধতি যে রোগ নির্ণয় করার জন্য ব্যবহার করা হয় তা হল</p>",
    options: ["(A) Polio Virus / পোলিও ভাইরাস", "(B) AIDS antibodies / AIDS অ্যান্টিবডি", "(C) Tuberculosis / যক্ষ্মা", "(D) Cancer / কর্কট"],
    correct_answer: "B",
    explanation: "ELISA (Enzyme-Linked Immunosorbent Assay) tests detect HIV / AIDS antibodies."
  },
  {
    q_no: 42,
    question_text: "<p>In a family there are six members A, B, C, D, E, F. A and B are married couple. D is only son of C. A is father of E, who is granddaughter of F, whose husband has died and C is brother of A. How many male members are in the family? / একটি পরিবারে A, B, C, D, E, F—এই 6 জন সদস্য। A, B বিবাহিত দম্পতি। D, C-এর একমাত্র পুত্র। A, E-এর বাবা এবং E, F-এর নাতনি। F-এর স্বামী মারা গেছেন এবং C, A-এর ভাই। ওই পরিবারে কতজন পুরুষ সদস্য আছেন?</p>",
    options: ["(A) 3", "(B) 4", "(C) 5", "(D) 2"],
    correct_answer: "A",
    explanation: "Male members are A, C, and D (Total 3 male members)."
  },
  {
    q_no: 43,
    question_text: "<p>Which one of the following states, Dulhasti Hydroelectric power project is located? / নিম্নলিখিত রাজ্যগুলির মধ্যে কোনটিতে দুলহস্তি জলবিদ্যুৎ শক্তি উৎপাদন প্রকল্প স্থাপিত হয়েছে?</p>",
    options: ["(A) Uttarakhand / উত্তরাখণ্ড", "(B) Jammu & Kashmir / জম্মু ও কাশ্মীর", "(C) Himachal Pradesh / হিমাচল প্রদেশ", "(D) Sikkim / সিকিম"],
    correct_answer: "B",
    explanation: "Dulhasti Power Station is located on Chenab River in Kishtwar district of Jammu & Kashmir."
  },
  {
    q_no: 44,
    question_text: "<p>P is wife of Q and mother of R. R is grand-daughter of W. S is grandmother of T and mother of Q. Which of the following is true? / P হল Q-এর স্ত্রী এবং R-এর মা। R হল W-এর পৌত্রী। S হল T-এর ঠাকুমা এবং Q-এর মা। নীচের কোনটি সত্যি?</p>",
    options: ["(A) R is sister of T. / R, T-এর ভগিনী।", "(B) R is brother of T. / R, T-এর ভাই।", "(C) Q is daughter of S. / Q, S-এর কন্যা।", "(D) None of the above / উপরের কোনোটিই নয়"],
    correct_answer: "A",
    explanation: "R and T are children of Q and P, making R the sister of T."
  },
  {
    q_no: 45,
    question_text: "<p>The Reserve Bank of India was established in the year / ভারতীয় রিজার্ভ ব্যাংকের প্রতিষ্ঠার সালটি হল</p>",
    options: ["(A) 1930", "(B) 1935", "(C) 1947", "(D) 1951"],
    correct_answer: "B",
    explanation: "RBI was established on 1 April 1935 in accordance with the RBI Act 1934."
  },
  {
    q_no: 46,
    question_text: "<p>Match the following: (a) Kot Diji - 2. F.A. Khan; (b) Harappa - 3. Daya Ram Sahani; (c) Kalibangan - 1. Luigi Pio Tessitori; (d) Mohenjodaro - 4. Rakhal Das Bandyopadhyay. / জোড় মেলান</p>",
    options: ["(A) (a-2), (b-3), (c-1), (d-4)", "(B) (a-1), (b-3), (c-2), (d-4)", "(C) (a-4), (b-1), (c-2), (d-3)", "(D) (a-3), (b-2), (c-4), (d-1)"],
    correct_answer: "A",
    explanation: "Kot Diji (F.A. Khan), Harappa (Daya Ram Sahni), Kalibangan (L.P. Tessitori), Mohenjodaro (R.D. Banerjee)."
  },
  {
    q_no: 47,
    question_text: "<p>In a chess tournament each of six players will play every other player exactly once. How many matches will be played in the tournament? / ছয়জনের একটি দাবা প্রতিযোগিতায় প্রত্যেক খেলোয়াড় অপর প্রত্যেক খেলোয়াড়ের সঙ্গে কেবলমাত্র একবারই খেলতে পারে। ওই প্রতিযোগিতায় কতগুলি খেলা হবে?</p>",
    options: ["(A) 12", "(B) 15", "(C) 30", "(D) 72"],
    correct_answer: "B",
    explanation: "Formula: $\\frac{n(n-1)}{2} = \\frac{6 \\times 5}{2} = 15$ matches."
  },
  {
    q_no: 48,
    question_text: "<p>If Water is called Black, Black is called Tree, Tree is called Blue, Blue is called Rain, Rain is called Pink and Pink is called Fish, then what is the colour of sky? / কোনো ভাষায় Water-কে বলে Black, Black-কে বলে Tree, Tree-কে Blue, Blue-কে Rain, Rain-কে Pink, Pink-কে Fish বলে তবে 'colour of the sky'-কে ওই ভাষায় কী বলে?</p>",
    options: ["(A) Blue", "(B) Rain", "(C) Fish", "(D) Pink"],
    correct_answer: "B",
    explanation: "Sky is Blue, and Blue is called Rain."
  },
  {
    q_no: 49,
    question_text: "<p>Who is the current Chief of the Army Staff of India? (2022) / বর্তমানে ভারতের চিফ অফ আর্মি স্টাফ কে?</p>",
    options: ["(A) General Upendra Dwivedi / জেনারেল উপেন্দ্র দ্বিবেদী", "(B) General Manoj Pande / জেনারেল মনোজ পান্ডে", "(C) General Rana Pratap Kalita / জেনারেল রানাপ্রতাপ কালিতা", "(D) General Surinder Singh Mahal / জেনারেল সুরিন্দর সিং মাহাল"],
    correct_answer: "B",
    explanation: "General Manoj Pande assumed office as Chief of the Army Staff on 30 April 2022."
  },
  {
    q_no: 50,
    question_text: "<p>'Peaty' soils of Kerala is known as / কেরালার 'পিট' মৃত্তিকা কী নামে পরিচিত?</p>",
    options: ["(A) Reh / রেহ", "(B) Kari / কারি", "(C) Kallar / কালার", "(D) Thur / থুর"],
    correct_answer: "B",
    explanation: "Organic peat soils found in Kottayam and Alappuzha of Kerala are locally called 'Kari'."
  }
];

async function seedWbcs2022() {
  console.log("Seeding WBCS (Prelims) 2022 Official Test & PYQ resource...");

  // 1. Create or update Mock Test doc
  const testRef = db.collection('tests').doc(testId);
  await testRef.set(testMetaData, { merge: true });
  console.log(`Updated test doc: ${testId}`);

  // 2. Clear old questions for this test
  const oldQsSnap = await db.collection('questions').where('testId', '==', testId).get();
  const batch = db.batch();
  oldQsSnap.docs.forEach(doc => batch.delete(doc.ref));
  await batch.commit();

  // 3. Insert 50+ questions batch
  const insertBatch = db.batch();
  questionsData.forEach((q, idx) => {
    const qDocRef = db.collection('questions').doc(`${testId}_q${q.q_no}`);
    insertBatch.set(qDocRef, {
      ...q,
      testId: testId,
      createdAt: Date.now()
    });
  });
  await insertBatch.commit();
  console.log(`Inserted ${questionsData.length} questions for ${testId}`);

  // 4. Create PYQ entry in pyqs collection
  const pyqRef = db.collection('pyqs').doc("pyq_wbcs_pre_2022");
  await pyqRef.set(pyqData, { merge: true });
  console.log("Updated PYQ collection doc: pyq_wbcs_pre_2022");

  console.log("WBCS Prelims 2022 Seeding completed successfully!");
  process.exit(0);
}

seedWbcs2022().catch(err => {
  console.error("Error seeding WBCS 2022:", err);
  process.exit(1);
});
