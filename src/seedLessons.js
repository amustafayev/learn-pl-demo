/* =========================================================================
   Authored lesson content — seed fixtures, same status as data.jsx (only
   db/mockDb.jsx treats this as a data source, via data.jsx's SEED_LESSONS).

   Without authored content a block falls back to its type's 1–2 starter
   components (parts.jsx `defaultContent`), so every Practice block in every
   lesson would look identical. These lessons are written out fully instead:
   Everyday English end to end (each lesson on its own topic), plus IT
   English L4, the ITler — Morning class's current lesson. Between them they
   exercise every component kind except the H5P one (which needs the H5P
   server), and every variant a kind has (comprehension as multiple choice /
   true-false / matching, match by translation / picture / definition /
   synonym, homework as essay / video / link, group work as info-gap and
   team quiz race).

   Component shapes follow parts.jsx `defaultComponent`. Ids are stable
   (`<lesson>-<n>` for a block — the same pattern db/mockDb.jsx's
   `lessonBlocks` gives an unbuilt block — and `<block>-c<n>` for its
   components) so deep links survive a reload and a comprehension check
   can point at its passage by id.
   ========================================================================= */

// Mirrors parts.jsx's NO_LEVEL_KINDS (the gamified kinds that aren't tagged
// with a CEFR level) — duplicated rather than imported because parts.jsx
// imports data.jsx, which imports this file.
const NO_LEVEL = new Set(["crossword", "memory", "wheel", "wordsearch", "imagetoword", "speedround"]);

// Gives a block its authored components: stable ids, the block's level on
// every level-tagged kind, and `passageRefId: <n>` (the n-th component of
// this same block) resolved to that component's real id.
export function withContent(base, level, components) {
  const ref = (n) => `${base.id}-c${n}`;
  return {
    ...base,
    content: {
      components: components.map((c, i) => ({
        id: ref(i + 1),
        ...(NO_LEVEL.has(c.kind) ? {} : { level }),
        ...c,
        ...(typeof c.passageRefId === "number" ? { passageRefId: ref(c.passageRefId) } : {}),
      })),
    },
  };
}

const block = (lessonId, n, type, title, meta, level, components) =>
  withContent({ id: `${lessonId}-${n}`, type, title, meta }, level, components);

/* ------------------------------- Everyday English ------------------------------- */

const EV1 = [
  block("ev1", 1, "reading", "Passage — Meeting a new neighbour", "62 words · A2 · tap-to-translate on", "A2", [
    { kind: "passage", textId: "t_neighbour" },
    { kind: "comprehension", mode: "multiple", passageRefId: 1, items: [
      { q: "When did the new family move in?", options: ["On Friday", "On Saturday", "On Sunday"], answer: 1, why: "Mətn: “On Saturday a new family moved in next door.”" },
      { q: "What is Tom's job?", options: ["He is a teacher", "He works at a hospital", "He works in a park"], answer: 1, why: "“Tom works at the hospital” — Sara müəllimdir." },
      { q: "What did they talk about?", options: ["Work and money", "The weather and the park", "Their families"], answer: 1, why: "“We talked about the weather and the park nearby.”" },
    ] },
  ]),
  block("ev1", 2, "vocabulary", "Words — Greetings & small talk", "8 target phrases · flip, match, remember", "A2", [
    { kind: "wordlist", items: [
      { term: "hello", az: "salam", def: "a friendly word you say when you meet someone", example: "Hello! I'm Nigar." },
      { term: "introduce", az: "təqdim etmək", def: "to tell someone your name when you meet", example: "Let me introduce my colleague." },
      { term: "neighbour", az: "qonşu", def: "a person who lives next to you", example: "My neighbour has a big dog." },
      { term: "weather", az: "hava", def: "rain, sun, wind and temperature outside", example: "The weather is lovely today." },
      { term: "weekend", az: "həftə sonu", def: "Saturday and Sunday", example: "How was your weekend?" },
      { term: "nice to meet you", az: "tanış olduğuma şadam", def: "a polite phrase for a first meeting", example: "Nice to meet you, Tom." },
      { term: "see you around", az: "görüşərik", def: "an informal way to say goodbye", example: "Thanks for the chat — see you around!" },
      { term: "how's it going", az: "işlər necədir", def: "an informal way to ask how someone is", example: "Hey Sara, how's it going?" },
    ] },
    { kind: "flashcards", items: [
      { term: "neighbour", az: "qonşu", example: "My neighbour has a big dog." },
      { term: "weekend", az: "həftə sonu", example: "How was your weekend?" },
      { term: "introduce", az: "təqdim etmək", example: "Let me introduce my colleague." },
      { term: "weather", az: "hava", example: "The weather is lovely today." },
      { term: "see you around", az: "görüşərik", example: "Thanks for the chat — see you around!" },
    ] },
    { kind: "match", mode: "az", pairType: "az", pairs: [
      { term: "hello", az: "salam", emoji: "👋" }, { term: "neighbour", az: "qonşu", emoji: "🏡" },
      { term: "weather", az: "hava", emoji: "🌤️" }, { term: "weekend", az: "həftə sonu", emoji: "🎉" },
      { term: "goodbye", az: "sağ ol", emoji: "🚪" },
    ] },
    { kind: "memory", pairs: [
      { term: "hello", az: "salam" }, { term: "neighbour", az: "qonşu" },
      { term: "weekend", az: "həftə sonu" }, { term: "weather", az: "hava" },
      { term: "friend", az: "dost" }, { term: "goodbye", az: "sağ ol" },
    ] },
    { kind: "wordweb", center: "weekend", branches: [
      { label: "a relaxing weekend" }, { label: "at the weekend" }, { label: "weekend plans" },
      { label: "a long weekend" }, { label: "spend the weekend" }, { label: "last weekend" },
    ] },
  ]),
  block("ev1", 3, "grammar", "Grammar — “to be” & the present simple", "Colour-coded sentence · be conjugated · quick check", "A2", [
    { kind: "sentence", sentence: [
      { w: "My new neighbour", role: "subject" }, { w: "works", role: "verb" }, { w: "at the hospital", role: "place" },
      { w: "and", role: "connector" }, { w: "walks", role: "verb" }, { w: "the dog", role: "object" },
      { w: "every morning", role: "time" }, { w: "." },
    ] },
    { kind: "conjugation", verb: "be", tenses: {
      "Present simple": { I: "am", You: "are", "He/She/It": "is", We: "are", They: "are" },
      "Past simple": { I: "was", You: "were", "He/She/It": "was", We: "were", They: "were" },
    } },
    { kind: "quiz", items: [
      { q: "Tom ___ a doctor at the hospital.", options: ["am", "is", "are"], answer: 1, why: "He/She/It → “is”." },
      { q: "___ you from Baku?", options: ["Is", "Am", "Are"], answer: 2, why: "Sualda “you” ilə “Are” gəlir." },
      { q: "We ___ at home last weekend.", options: ["was", "were", "are"], answer: 1, why: "Keçmiş zaman, “we” → “were”." },
    ] },
  ]),
  block("ev1", 4, "practice", "Practice — Small talk in action", "Dialogue · gap fill · word order · right or wrong", "A2", [
    { kind: "dialoguecompletion", title: "Meeting in the lift", turns: [
      { speaker: "A", text: "Hi! You're new here, aren't you?" },
      { speaker: "B", text: "___", blank: true, answer: "Yes, I just moved in. I'm Sara, from flat 5." },
      { speaker: "A", text: "Nice to meet you, Sara. I'm Kamran." },
      { speaker: "B", text: "___", blank: true, answer: "Nice to meet you too. How long have you lived here?" },
      { speaker: "A", text: "About three years. It's a quiet building." },
    ] },
    { kind: "gapfill", items: [
      { text: "Nice to ___ you!", answer: "meet", why: "Sabit ifadə: “Nice to meet you”." },
      { text: "How ___ your weekend?", answer: "was", why: "Keçən həftə sonu → keçmiş zaman “was”." },
      { text: "She ___ a teacher at my school.", answer: "is", why: "“She” → “is”." },
      { text: "I ___ from Ganja, but I live in Baku.", answer: "am", why: "“I” → “am”." },
    ] },
    { kind: "scramble", items: [
      { sentence: "Where are you from?", why: "Sual sözü + “are” + mübtəda: Where are you…?" },
      { sentence: "My neighbour works at the hospital.", why: "Mübtəda + feil + yer: subject → verb → place." },
      { sentence: "It was nice to meet you.", why: "Sabit ifadə keçmiş zamanda: “It was nice to…”." },
    ] },
    { kind: "correctincorrect", items: [
      { sentence: "She is my new neighbour.", correct: true, why: "“She” ilə “is” — düzgündür." },
      { sentence: "They is very friendly.", correct: false, why: "“They” ilə “are” olmalıdır." },
      { sentence: "How was your weekend?", correct: true, why: "Keçmiş zaman sualı — düzgündür." },
      { sentence: "I am agree with you.", correct: false, why: "“agree” feildir: “I agree with you.”" },
    ] },
  ]),
  block("ev1", 5, "homework", "Homework — Introduce yourself", "Short writing + a one-minute recording", "A2", [
    { kind: "homework", type: "essay", prompt: "Write 5–6 sentences introducing yourself to a new neighbour: your name, where you are from, your job, and one thing you like doing at the weekend.", minSentences: 5 },
    { kind: "speakingRecord", question: "Imagine you meet your new neighbour in the lift. Say hello, introduce yourself and ask them one question. You have one minute.", tipAz: "Salamlaş, özünü təqdim et, sonra sual ver — tələsmədən danış." },
  ]),
];

const EV2 = [
  block("ev2", 1, "reading", "Passage — At the café", "44 words · A2 · tap-to-translate on", "A2", [
    { kind: "passage", textId: "t_cafe" },
    { kind: "comprehension", mode: "truefalse", passageRefId: 1, items: [
      { statement: "The writer orders a coffee before work.", answer: true, why: "“I usually order a coffee before work.”" },
      { statement: "The café is far from the writer's flat.", answer: false, why: "Mətn: “The café near my flat” — yaxındır." },
      { statement: "The staff are friendly.", answer: true, why: "“the staff are friendly”." },
      { statement: "The writer never buys food there.", answer: false, why: "“Sometimes I grab a sandwich too.”" },
    ] },
  ]),
  block("ev2", 2, "vocabulary", "Words — Café & menu", "8 words · pictures · word search", "A2", [
    { kind: "wordlist", items: [
      { term: "menu", az: "menyu", def: "a list of food and drinks you can order", example: "Could I see the menu, please?" },
      { term: "order", az: "sifariş vermək", def: "to ask for food or drink", example: "Are you ready to order?" },
      { term: "bill", az: "hesab", def: "the paper that shows how much to pay", example: "Can we have the bill, please?" },
      { term: "tip", az: "çaypulu", def: "extra money you give for good service", example: "We left a small tip." },
      { term: "takeaway", az: "özü ilə aparmaq", def: "food you buy to eat somewhere else", example: "Is that for here or takeaway?" },
      { term: "sparkling water", az: "qazlı su", def: "water with bubbles", example: "A bottle of sparkling water, please." },
      { term: "dessert", az: "desert", def: "sweet food eaten after a meal", example: "Would you like a dessert?" },
      { term: "vegetarian", az: "vegetarian", def: "food with no meat or fish", example: "Do you have any vegetarian dishes?" },
    ] },
    { kind: "imagetoword", title: "What's on the table?", items: [
      { emoji: "☕", term: "coffee", az: "qəhvə" }, { emoji: "🥐", term: "croissant", az: "kruasan" },
      { emoji: "🍰", term: "cake", az: "tort" }, { emoji: "🥗", term: "salad", az: "salat" },
      { emoji: "🍵", term: "tea", az: "çay" }, { emoji: "🥤", term: "juice", az: "şirə" },
    ] },
    { kind: "match", mode: "picture", pairType: "az", pairs: [
      { term: "sandwich", az: "sendviç", emoji: "🥪" }, { term: "soup", az: "şorba", emoji: "🍲" },
      { term: "ice cream", az: "dondurma", emoji: "🍨" }, { term: "pizza", az: "pizza", emoji: "🍕" },
      { term: "water", az: "su", emoji: "💧" },
    ] },
    { kind: "wordsearch", title: "Find the café words", words: ["MENU", "BILL", "TIP", "ORDER", "CAKE", "TEA"] },
  ]),
  block("ev2", 3, "listening", "Listening — Ordering at the counter", "Audio 1:40 · video 2:45 · model conversation", "A2", [
    { kind: "listening", title: "Ordering at the counter", duration: "1:40", transcript: "Barista: Hi, what can I get you? — Customer: Could I have a large cappuccino, please? — Barista: Sure. Anything to eat? — Customer: Yes, a croissant, please. — Barista: For here or takeaway? — Customer: For here, thanks. — Barista: That's six manats fifty." },
    { kind: "video", title: "Polite phrases for cafés", duration: "2:45", transcript: "When you order, “Could I have…” and “I'd like…” sound more polite than “Give me…”. To pay, ask “Can I have the bill, please?”" },
    { kind: "youtube", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", title: "Model café conversation", notes: "Watch once for the gist, then again and write down every polite phrase you hear." },
  ]),
  block("ev2", 4, "practice", "Practice — Polite requests", "Quiz · gap fill · correct the mistake · 30-second round", "A2", [
    { kind: "quiz", items: [
      { q: "The most polite way to order is:", options: ["Give me a tea.", "I want tea.", "Could I have a tea, please?"], answer: 2, why: "“Could I have…, please?” ən nəzakətli formadır." },
      { q: "___ you like some dessert?", options: ["Would", "Do", "Are"], answer: 0, why: "Təklif: “Would you like…?”" },
      { q: "Can we have the ___, please? We'd like to pay.", options: ["menu", "bill", "tip"], answer: 1, why: "Ödəmək üçün “the bill” istənilir." },
      { q: "I'd like ___ glass of water.", options: ["a", "an", "some"], answer: 0, why: "“glass” samitlə başlayır → “a”." },
    ] },
    { kind: "gapfill", items: [
      { text: "Could I ___ a cappuccino, please?", answer: "have", why: "“Could I have…” — sabit sifariş ifadəsi." },
      { text: "I'd ___ the soup, please.", answer: "like", why: "“I'd like” = I would like." },
      { text: "Is this for here or ___?", answer: "takeaway", why: "Burada yemək və ya aparmaq: “here or takeaway”." },
    ] },
    { kind: "arrowcorrection", items: [
      { wrong: "I would like a orange juice.", correct: "I would like an orange juice.", why: "Sait səsdən əvvəl “an”: an orange." },
      { wrong: "Can I have the bill, please me?", correct: "Can I have the bill, please?", why: "“please” yetərlidir — “me” artıqdır." },
      { wrong: "She want a coffee.", correct: "She wants a coffee.", why: "He/She/It ilə feilə “-s” əlavə olunur." },
    ] },
    { kind: "speedround", seconds: 30, items: [
      { q: "___ I have a menu, please?", options: ["Could", "Would", "Should"], answer: 0, why: "" },
      { q: "A ___ of water, please.", options: ["glass", "cup", "plate"], answer: 0, why: "" },
      { q: "We'd like to ___ now.", options: ["pay", "paid", "paying"], answer: 0, why: "" },
      { q: "Would you like ___ dessert?", options: ["a", "an", "the"], answer: 0, why: "" },
      { q: "Is it ___ here or takeaway?", options: ["for", "to", "at"], answer: 0, why: "" },
    ] },
  ]),
  block("ev2", 5, "homework", "Homework — Record your order", "Video submission + shadowing practice", "A2", [
    { kind: "homework", type: "video", prompt: "Record a 1-minute video of yourself ordering breakfast at a café. Use “Could I have…”, “I'd like…” and ask for the bill at the end. Paste the link below.", minSentences: 0 },
    { kind: "shadowing", items: [
      { sentence: "Could I have a large cappuccino, please?", note: "Stress: LARGE cappuccino, PLEASE — rising at the end." },
      { sentence: "Can we have the bill, please?", note: "Linking: “can-we”, “have-the”." },
      { sentence: "For here, thanks.", note: "Short and friendly — fall on “thanks”." },
    ] },
  ]),
];

const EV3 = [
  block("ev3", 1, "reading", "Passage — Finding the museum", "70 words · A2 · tap-to-translate on", "A2", [
    { kind: "passage", textId: "t_city" },
    { kind: "comprehension", mode: "matching", passageRefId: 1, items: [
      { left: "Which city did the writer visit?", right: "Tbilisi" },
      { left: "Where did the writer ask for help?", right: "At a bus stop" },
      { left: "Where should you turn left?", right: "At the traffic lights" },
      { left: "Where is the museum?", right: "Opposite the park" },
    ] },
  ]),
  block("ev3", 2, "vocabulary", "Words — Directions & places", "8 words · crossword · wheel warm-up", "A2", [
    { kind: "wordlist", items: [
      { term: "turn left", az: "sola dön", def: "go to the left", example: "Turn left at the bank." },
      { term: "go straight on", az: "düz get", def: "continue in the same direction", example: "Go straight on for two minutes." },
      { term: "opposite", az: "qarşısında", def: "on the other side, facing something", example: "The café is opposite the station." },
      { term: "next to", az: "yanında", def: "very close, at the side of", example: "The pharmacy is next to the bakery." },
      { term: "crossroads", az: "yol ayrıcı", def: "a place where two roads cross", example: "Turn right at the crossroads." },
      { term: "traffic lights", az: "svetofor", def: "lights that control the traffic", example: "Stop at the traffic lights." },
      { term: "get lost", az: "azmaq", def: "not know where you are", example: "I always get lost in big cities." },
      { term: "on foot", az: "piyada", def: "walking, not by car or bus", example: "It's ten minutes on foot." },
    ] },
    { kind: "flashcards", items: [
      { term: "opposite", az: "qarşısında", example: "The café is opposite the station." },
      { term: "crossroads", az: "yol ayrıcı", example: "Turn right at the crossroads." },
      { term: "on foot", az: "piyada", example: "It's ten minutes on foot." },
      { term: "next to", az: "yanında", example: "The pharmacy is next to the bakery." },
    ] },
    { kind: "crossword", items: [
      { word: "map", clue: "A picture of streets that shows you the way" },
      { word: "left", clue: "The opposite of right" },
      { word: "bridge", clue: "You walk over it to cross a river" },
      { word: "station", clue: "Where you catch a train" },
      { word: "corner", clue: "Where two streets meet" },
      { word: "square", clue: "An open place in the city centre" },
    ] },
    { kind: "wheel", title: "City talk wheel", items: [
      { term: "museum", az: "muzey", q: "Which museum in your city would you recommend?" },
      { term: "bus stop", az: "dayanacaq", q: "How do you get from your home to the nearest bus stop?" },
      { term: "get lost", az: "azmaq", q: "Tell us about a time you got lost." },
      { term: "on foot", az: "piyada", q: "What can you reach on foot from your home?" },
      { term: "crowded", az: "sıx", q: "Which place in your city is the most crowded?" },
    ] },
  ]),
  block("ev3", 3, "listening", "Listening — Asking for directions", "Audio 1:55 · model video", "A2", [
    { kind: "listening", title: "Excuse me, where's the station?", duration: "1:55", transcript: "Tourist: Excuse me, how do I get to the train station? — Local: Go straight on down this street, then take the second left. — Tourist: Second left… and then? — Local: Walk past the supermarket. The station is on your right, opposite the bank. — Tourist: Is it far? — Local: No, about five minutes on foot." },
    { kind: "youtube", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", title: "Giving directions — model video", notes: "Pause after each instruction and trace the route on the city map in the Resources block." },
  ]),
  block("ev3", 4, "grammar", "Grammar — Places, comparisons & “if”", "Preposition scene · comparison ladder · first conditional", "A2", [
    { kind: "preposition", object: "🚲", anchor: "🏛️", subject: "the bike", place: "the museum",
      options: ["in front of", "behind", "next to", "opposite", "on"], answer: "in front of" },
    { kind: "comparison",
      forms: { positive: "far", comparative: "further", superlative: "the furthest" },
      examples: { positive: "The park is far.", comparative: "The station is further than the park.", superlative: "The airport is the furthest of all." } },
    { kind: "conditional", type: "first", branches: [
      { condition: "you take the metro", result: "you will get there in ten minutes" },
      { condition: "you walk", result: "it will take half an hour" },
      { condition: "you get lost", result: "you can ask someone at the bus stop" },
    ] },
  ]),
  block("ev3", 5, "practice", "Practice — Find your way", "Dialogue · word order · right or wrong · pair info-gap", "A2", [
    { kind: "dialoguecompletion", title: "Lost near the square", turns: [
      { speaker: "A", text: "Excuse me, is there a pharmacy near here?" },
      { speaker: "B", text: "___", blank: true, answer: "Yes, go straight on and turn right at the crossroads." },
      { speaker: "A", text: "Is it far?" },
      { speaker: "B", text: "___", blank: true, answer: "No, it's about five minutes on foot. It's next to the bakery." },
      { speaker: "A", text: "Great, thank you so much!" },
    ] },
    { kind: "scramble", items: [
      { sentence: "How do I get to the station?", why: "Yol soruşmaq üçün: How do I get to…?" },
      { sentence: "The bank is opposite the park.", why: "Mübtəda + is + yer sözü + yer." },
      { sentence: "Take the second left at the lights.", why: "Əmr cümləsi feillə başlayır: Take…" },
    ] },
    { kind: "correctincorrect", items: [
      { sentence: "The museum is opposite the park.", correct: true, why: "“opposite” sonra birbaşa isim gəlir — düzgündür." },
      { sentence: "Turn on left at the lights.", correct: false, why: "“Turn left” — “on” artıqdır." },
      { sentence: "It's ten minutes on foot.", correct: true, why: "Piyada: “on foot” — düzgündür." },
      { sentence: "The station is more far than the park.", correct: false, why: "“far” → “further/farther”, “more far” yox." },
    ] },
    { kind: "peertask", mode: "infogap",
      situation: "Two friends are meeting in a city neither knows well. Each has half of the map.",
      roles: [
        { studentId: null, prompt: "Your half of the map shows the museum and the park. Ask your partner how to get from the station to the café, and explain where the museum is." },
        { studentId: null, prompt: "Your half of the map shows the station and the café. Explain the route to the café, then ask where the museum is." },
      ],
      teams: [
        { id: "team1", name: "Team Falcon", studentIds: [] },
        { id: "team2", name: "Team Comet", studentIds: [] },
      ],
      items: [] },
  ]),
  block("ev3", 6, "resources", "Resources — City map & travel guide", "Map image · metro guide (PDF) · directions slides", "A2", [
    { kind: "document", docKind: "image", url: "/seed/city-map.svg", title: "Old-town map", notes: "Use it with the info-gap task and the directions video." },
    { kind: "document", docKind: "pdf", url: "/seed/metro-guide.pdf", title: "Metro quick guide", notes: "Two pages — lines, fares and useful phrases." },
    { kind: "slidedeck", provider: "slides", url: "/seed/directions-deck.html", title: "Giving directions — 6 slides", notes: "Walk through it before the listening task." },
  ]),
  block("ev3", 7, "homework", "Homework — Describe your route", "Share a link + upload a sketch", "A2", [
    { kind: "homework", type: "link", prompt: "Open a map of your city and write directions from your home to your favourite café or park (6+ steps). Share the document link here.", minSentences: 0 },
    { kind: "upload", instructions: "Upload a photo or sketch of your route with the key places labelled (PDF or image).", accept: ".pdf,.png,.jpg,.jpeg" },
  ]),
];

const EV4 = [
  block("ev4", 1, "reading", "Passage — A Saturday at the market", "66 words · B1 · tap-to-translate on", "B1", [
    { kind: "passage", textId: "t_market" },
    { kind: "comprehension", mode: "multiple", passageRefId: 1, items: [
      { q: "Why does the writer buy fruit at the market?", options: ["It's fresher", "It's usually cheaper", "It's closer to home"], answer: 1, why: "“Fruit is usually cheaper there than in the supermarket.”" },
      { q: "What was on sale?", options: ["Tomatoes", "Apples", "Strawberries"], answer: 2, why: "“Today strawberries were on sale.”" },
      { q: "How did the writer pay?", options: ["By card", "In cash", "By phone"], answer: 1, why: "“I paid in cash and kept the receipt.”" },
    ] },
  ]),
  block("ev4", 2, "vocabulary", "Words — Shopping & money", "8 words · definitions · word formation", "B1", [
    { kind: "wordlist", items: [
      { term: "price", az: "qiymət", def: "how much money something costs", example: "The price is on the label." },
      { term: "cheap", az: "ucuz", def: "costing little money", example: "This bag was really cheap." },
      { term: "expensive", az: "bahalı", def: "costing a lot of money", example: "That phone is too expensive." },
      { term: "discount", az: "endirim", def: "money taken off the normal price", example: "Students get a 10% discount." },
      { term: "receipt", az: "qəbz", def: "a paper that shows what you paid", example: "Keep the receipt, please." },
      { term: "refund", az: "pulun qaytarılması", def: "money given back when you return something", example: "Can I get a refund for this?" },
      { term: "change", az: "qalıq", def: "money you get back when you pay too much", example: "Here's your change." },
      { term: "try on", az: "geyinib yoxlamaq", def: "put on clothes to see if they fit", example: "Can I try on this jacket?" },
    ] },
    { kind: "match", mode: "az", pairType: "def", pairs: [
      { term: "receipt", az: "qəbz", def: "a paper that shows what you paid" },
      { term: "refund", az: "pulun qaytarılması", def: "money given back when you return something" },
      { term: "discount", az: "endirim", def: "money taken off the normal price" },
      { term: "change", az: "qalıq", def: "money you get back when you pay too much" },
      { term: "bargain", az: "sərfəli alış", def: "something bought for less than its real value" },
    ] },
    { kind: "wordformation", items: [
      { root: "pay", sentence: "You can make the ___ by card or in cash.", answer: "payment", pos: "noun", why: "“the ___” isim tələb edir: pay → payment." },
      { root: "expense", sentence: "This restaurant is too ___ for a student.", answer: "expensive", pos: "adjective", why: "“too ___” sifət tələb edir: expense → expensive." },
      { root: "afford", sentence: "The market has fresh and ___ food.", answer: "affordable", pos: "adjective", why: "“fresh and ___” — sifət: afford → affordable." },
    ] },
    { kind: "imagetoword", title: "Shop by picture", items: [
      { emoji: "👕", term: "T-shirt", az: "köynək" }, { emoji: "👟", term: "trainers", az: "idman ayaqqabısı" },
      { emoji: "🛒", term: "trolley", az: "araba" }, { emoji: "💳", term: "credit card", az: "kredit kartı" },
      { emoji: "🧾", term: "receipt", az: "qəbz" },
    ] },
  ]),
  block("ev4", 3, "practice", "Practice — At the shop", "Quiz · gap fill · corrections · role-play · team race", "B1", [
    { kind: "quiz", items: [
      { q: "How ___ are these shoes?", options: ["many", "much", "more"], answer: 1, why: "Qiymət soruşanda: “How much…?”" },
      { q: "How ___ apples do you need?", options: ["much", "many", "lot"], answer: 1, why: "Sayılan isimlər: “How many…?”" },
      { q: "This jacket is ___ than that one.", options: ["cheap", "cheaper", "the cheapest"], answer: 1, why: "İki şeyi müqayisə: “cheaper than”." },
    ] },
    { kind: "gapfill", items: [
      { text: "Can I ___ on this dress?", answer: "try", why: "Geyinib yoxlamaq: “try on”." },
      { text: "I'd like a ___ — the zip is broken.", answer: "refund", why: "Pul geri: “refund”." },
      { text: "Do you ___ credit cards?", answer: "accept", why: "“accept cards” — kartla ödəmə qəbul edilirmi." },
    ] },
    { kind: "arrowcorrection", items: [
      { wrong: "How much cost this bag?", correct: "How much does this bag cost?", why: "Sualda köməkçi feil lazımdır: How much does… cost?" },
      { wrong: "This shirt is more cheap than that one.", correct: "This shirt is cheaper than that one.", why: "Qısa sifət: cheap → cheaper." },
      { wrong: "Can I have a discount for three?", correct: "Can I get a discount if I buy three?", why: "Şərt “if” ilə daha təbiidir." },
    ] },
    { kind: "scenario", situation: "You bought trainers yesterday, but they're too small. You go back to the shop to return them.", turns: [
      { prompt: "Shop assistant: Hi, how can I help you?", sample: "Hi, I bought these trainers yesterday, but they're too small." },
      { prompt: "Shop assistant: Do you have the receipt?", sample: "Yes, here it is." },
      { prompt: "Shop assistant: Would you like a bigger size or a refund?", sample: "Could I try on a size 42, please? If it doesn't fit, I'd like a refund." },
    ] },
    { kind: "peertask", mode: "quizrace",
      situation: "Team quiz race — shopping English.",
      roles: [
        { studentId: null, prompt: "" },
        { studentId: null, prompt: "" },
      ],
      teams: [
        { id: "team1", name: "Team Falcon", studentIds: [] },
        { id: "team2", name: "Team Comet", studentIds: [] },
        { id: "team3", name: "Team Nova", studentIds: [] },
      ],
      items: [
        { q: "Pick the polite question.", options: ["How much?", "How much is this, please?", "Price?"], answer: 1 },
        { q: "Money you get back when you pay too much is…", options: ["change", "refund", "tip"], answer: 0 },
        { q: "“It's a real ___!” — it was very cheap.", options: ["bargain", "receipt", "trolley"], answer: 0 },
        { q: "Choose the correct comparative.", options: ["more cheap", "cheaper", "cheapest"], answer: 1 },
      ] },
  ]),
  block("ev4", 4, "homework", "Homework — Plan a shopping trip", "Writing · 6+ sentences", "B1", [
    { kind: "homework", type: "essay", prompt: "You have 100 manats for a Saturday shopping trip. Write 6+ sentences: where you will go, what you will buy, and compare prices between two shops (use cheaper / more expensive).", minSentences: 6 },
  ]),
];

/* ------------------------------- IT English · L4 ------------------------------- */
// Component lists for data.jsx's TENSE_PARTS, one per block in the same
// order (those blocks keep their existing p1…p8 ids; data.jsx pairs them up
// with withContent).

export const TENSE_CONTENT = [
  // Passage — How we talk about time at work
  [
    { kind: "passage", textId: "t_standup" },
    { kind: "comprehension", mode: "multiple", passageRefId: 1, items: [
      { q: "What did the speaker ship yesterday?", options: ["The payment fix", "The login screen", "The release notes"], answer: 1, why: "Mətn: “Yesterday I shipped the login screen.”" },
      { q: "What will the speaker do today?", options: ["Deploy the fix", "Write a report", "Fix a new bug"], answer: 0, why: "“Today I will deploy the fix.”" },
      { q: "Is anything blocking the speaker?", options: ["Yes, the payment bug", "No, nothing is blocking them", "Yes, the release"], answer: 1, why: "“…so nothing is blocking me today.”" },
    ] },
  ],
  // Words — 12 target tense & time words
  [
    { kind: "wordlist", items: [
      { term: "ship", az: "təhvil vermək", def: "release finished work to users", example: "We shipped the new search last week." },
      { term: "deploy", az: "yerləşdirmək", def: "put software onto a server", example: "I've just deployed the hotfix." },
      { term: "by then", az: "o vaxta qədər", def: "before a time in the future", example: "By then the release will be stable." },
      { term: "so far", az: "indiyə qədər", def: "until now", example: "So far we have fixed twelve bugs." },
      { term: "already", az: "artıq", def: "before now, earlier than expected", example: "I have already merged the branch." },
      { term: "yet", az: "hələ", def: "until now (in questions and negatives)", example: "Has QA tested it yet?" },
      { term: "deadline", az: "son tarix", def: "the time by which work must be finished", example: "The deadline is Friday at noon." },
      { term: "rollback", az: "geri qaytarma", def: "returning to an earlier version", example: "We did a rollback after the outage." },
    ] },
    { kind: "flashcards", items: [
      { term: "so far", az: "indiyə qədər", example: "So far we have fixed twelve bugs." },
      { term: "already", az: "artıq", example: "I have already merged the branch." },
      { term: "yet", az: "hələ", example: "Has QA tested it yet?" },
      { term: "by then", az: "o vaxta qədər", example: "By then the release will be stable." },
    ] },
    { kind: "match", mode: "az", pairType: "synonym", pairs: [
      { term: "ship", az: "təhvil vermək", synonym: "release" },
      { term: "fix", az: "düzəltmək", synonym: "resolve" },
      { term: "issue", az: "problem", synonym: "bug" },
      { term: "begin", az: "başlamaq", synonym: "kick off" },
      { term: "finish", az: "bitirmək", synonym: "wrap up" },
    ] },
  ],
  // Videos — Video explanation of tense forms
  [
    { kind: "video", title: "Past simple vs present perfect at work", duration: "4:15", transcript: "Use the past simple for a finished time: “I deployed it yesterday.” Use the present perfect when the time isn't finished or doesn't matter: “I've deployed it,” “We've fixed three bugs this week.”" },
    { kind: "youtube", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", title: "Tenses in a real standup", notes: "Note every time marker you hear: yesterday, already, so far, by Friday." },
  ],
  // Listenings — Real standup audio recording
  [
    { kind: "listening", title: "Monday standup — backend team", duration: "1:45", transcript: "Aysel: Last week I finished the payment API. Today I'm writing the tests, and I'll have them ready by Wednesday. — Rashad: I've fixed two of the three login bugs so far. The last one is blocking me — I need access to the logs. — Lead: OK, I'll give you access after this call." },
    { kind: "shadowing", items: [
      { sentence: "I've fixed two of the three bugs so far.", note: "Contraction: “I've” — say it as one sound." },
      { sentence: "I'll have them ready by Wednesday.", note: "Stress: READY, WEDNESDAY." },
      { sentence: "Nothing is blocking me today.", note: "Fall on “today”." },
    ] },
  ],
  // Grammar — Tenses on a timeline
  [
    { kind: "timeline" },
    { kind: "sentence", sentence: [
      { w: "We", role: "subject" }, { w: "have already deployed", role: "verb" }, { w: "the hotfix", role: "object" },
      { w: "to production", role: "place" }, { w: "this morning", role: "time" }, { w: "." },
    ] },
    { kind: "conjugation", verb: "ship", tenses: {
      "Past simple": { I: "shipped", You: "shipped", "He/She/It": "shipped", We: "shipped", They: "shipped" },
      "Present perfect": { I: "have shipped", You: "have shipped", "He/She/It": "has shipped", We: "have shipped", They: "have shipped" },
      "Future (will)": { I: "will ship", You: "will ship", "He/She/It": "will ship", We: "will ship", They: "will ship" },
    } },
    { kind: "conditional", type: "zero", branches: [
      { condition: "a test fails", result: "the pipeline stops" },
      { condition: "all tests pass", result: "the build goes to staging" },
    ] },
  ],
  // Practice Grammar — Fill the gaps & tense rules
  [
    { kind: "gapfill", items: [
      { text: "I ___ the branch yesterday.", answer: "merged", why: "“yesterday” bitmiş vaxtdır → Past simple." },
      { text: "We ___ three bugs so far this week.", answer: "have fixed", why: "“so far / this week” → Present perfect." },
      { text: "Has QA tested the release ___?", answer: "yet", why: "Sual və inkarda “yet”." },
      { text: "By Friday we ___ the new API.", answer: "will ship", why: "Gələcək plan → will." },
    ] },
    { kind: "quiz", items: [
      { q: "I ___ the fix to production an hour ago.", options: ["have deployed", "deployed", "deploy"], answer: 1, why: "“an hour ago” → Past simple." },
      { q: "She ___ on this project since March.", options: ["works", "worked", "has worked"], answer: 2, why: "“since March” → Present perfect." },
      { q: "We ___ the release yet.", options: ["didn't ship", "haven't shipped", "don't ship"], answer: 1, why: "“yet” → Present perfect inkar." },
    ] },
    { kind: "correctincorrect", items: [
      { sentence: "I have deployed it yesterday.", correct: false, why: "“yesterday” ilə Present perfect olmur: “I deployed it yesterday.”" },
      { sentence: "We've already fixed the login bug.", correct: true, why: "“already” + Present perfect — düzgündür." },
      { sentence: "Did you finish the tests yet?", correct: false, why: "“yet” ilə: “Have you finished the tests yet?”" },
    ] },
    { kind: "arrowcorrection", items: [
      { wrong: "I have finished the report last night.", correct: "I finished the report last night.", why: "Bitmiş vaxt (last night) → Past simple." },
      { wrong: "She works here since 2021.", correct: "She has worked here since 2021.", why: "“since” → Present perfect." },
    ] },
    { kind: "speedround", seconds: 30, items: [
      { q: "I ___ it yesterday.", options: ["fixed", "have fixed", "fix"], answer: 0, why: "" },
      { q: "We ___ two bugs so far.", options: ["fixed", "have fixed", "fixing"], answer: 1, why: "" },
      { q: "Has it shipped ___?", options: ["already", "yet", "since"], answer: 1, why: "" },
      { q: "She has worked here ___ 2021.", options: ["for", "since", "ago"], answer: 1, why: "" },
    ] },
  ],
  // Playground — Crossword & Word Tower Challenge
  [
    { kind: "crossword", items: [
      { word: "deploy", clue: "Put software onto a server" },
      { word: "release", clue: "A new version made available to users" },
      { word: "merge", clue: "Combine two branches of code" },
      { word: "deadline", clue: "The time by which work must be done" },
      { word: "rollback", clue: "Going back to an earlier version" },
      { word: "sprint", clue: "A short, fixed period of team work" },
    ] },
    { kind: "wheel", title: "Standup wheel", items: [
      { term: "so far", az: "indiyə qədər", q: "What have you done so far this week?" },
      { term: "blocking", az: "maneə törədən", q: "What is blocking you right now?" },
      { term: "by Friday", az: "cüməyə qədər", q: "What will you finish by Friday?" },
      { term: "yesterday", az: "dünən", q: "What did you ship yesterday?" },
    ] },
    { kind: "wordsearch", title: "Find the time markers", words: ["YET", "ALREADY", "SINCE", "AGO", "SOFAR", "BYTHEN"] },
    { kind: "memory", pairs: [
      { term: "deploy", az: "yerləşdirmək" }, { term: "deadline", az: "son tarix" },
      { term: "already", az: "artıq" }, { term: "yet", az: "hələ" },
    ] },
  ],
  // Homework — Write 5 sentences using target tenses
  [
    { kind: "homework", type: "essay", prompt: "Write your own standup update (5+ sentences): what you did yesterday (past simple), what you have done so far this week (present perfect), and what you will finish by Friday (will).", minSentences: 5 },
    { kind: "upload", instructions: "Optional: upload a screenshot of a real ticket or pull request you described.", accept: ".pdf,.png,.jpg,.jpeg" },
  ],
];

export const EVERYDAY_BUILT = { ev1: EV1, ev2: EV2, ev3: EV3, ev4: EV4 };
