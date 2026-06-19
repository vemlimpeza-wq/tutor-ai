export interface CEFRQuestion {
  id: string;
  level: "A1" | "A2" | "B1" | "B2" | "C1";
  question: string;
  options: string[];
  correctOption: number;
  category: "grammar" | "vocabulary" | "reading";
}

export const cefrQuestions: CEFRQuestion[] = [
  // --- A1 ---
  {
    id: "a1_1",
    level: "A1",
    question: "Hello, my name is John. Where ______ you from?",
    options: ["am", "is", "are", "be"],
    correctOption: 2,
    category: "grammar"
  },
  {
    id: "a1_2",
    level: "A1",
    question: "Which of the following is a fruit?",
    options: ["Carrot", "Apple", "Potato", "Bread"],
    correctOption: 1,
    category: "vocabulary"
  },
  {
    id: "a1_3",
    level: "A1",
    question: "I ______ to the gym every Monday.",
    options: ["goes", "go", "going", "gone"],
    correctOption: 1,
    category: "grammar"
  },

  // --- A2 ---
  {
    id: "a2_1",
    level: "A2",
    question: "She doesn't like coffee, and ______ do I.",
    options: ["neither", "either", "too", "so"],
    correctOption: 0,
    category: "grammar"
  },
  {
    id: "a2_2",
    level: "A2",
    question: "Choose the opposite of the word 'heavy':",
    options: ["Large", "Light", "Thin", "Soft"],
    correctOption: 1,
    category: "vocabulary"
  },
  {
    id: "a2_3",
    level: "A2",
    question: "Yesterday, we ______ a movie at the theater.",
    options: ["see", "saw", "seen", "watching"],
    correctOption: 1,
    category: "grammar"
  },

  // --- B1 ---
  {
    id: "b1_1",
    level: "B1",
    question: "If I ______ more time, I would learn another language.",
    options: ["have", "had", "will have", "would have"],
    correctOption: 1,
    category: "grammar"
  },
  {
    id: "b1_2",
    level: "B1",
    question: "The teacher suggested ______ the homework before dinner.",
    options: ["doing", "to do", "do", "done"],
    correctOption: 0,
    category: "grammar"
  },
  {
    id: "b1_3",
    level: "B1",
    question: "I need to ______ an appointment with the doctor today.",
    options: ["do", "make", "take", "have"],
    correctOption: 1,
    category: "vocabulary"
  },

  // --- B2 ---
  {
    id: "b2_1",
    level: "B2",
    question: "Despite ______ very hard, he didn't pass the exam.",
    options: ["he studied", "studying", "study", "of studying"],
    correctOption: 1,
    category: "grammar"
  },
  {
    id: "b2_2",
    level: "B2",
    question: "By this time next year, I ______ university.",
    options: ["will finish", "will have finished", "am finishing", "have finished"],
    correctOption: 1,
    category: "grammar"
  },
  {
    id: "b2_3",
    level: "B2",
    question: "To be 'on the fence' about something means:",
    options: ["To be very angry", "To be undecided", "To be extremely happy", "To be climbing"],
    correctOption: 1,
    category: "vocabulary"
  },

  // --- C1 ---
  {
    id: "c1_1",
    level: "C1",
    question: "Hardly ______ the building when the alarm went off.",
    options: ["had he entered", "he had entered", "entered he", "did he enter"],
    correctOption: 0,
    category: "grammar"
  },
  {
    id: "c1_2",
    level: "C1",
    question: "She is a very ______ leader who can influence people easily.",
    options: ["gullible", "charismatic", "apathetic", "redundant"],
    correctOption: 1,
    category: "vocabulary"
  },
  {
    id: "c1_3",
    level: "C1",
    question: "Read the sentence: 'The candidate's argument was *compelling*.' What does *compelling* mean here?",
    options: ["Completely false", "Very boring", "Forcefully convincing", "Hard to understand"],
    correctOption: 2,
    category: "reading"
  }
];
