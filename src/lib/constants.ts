import { Category, CategoryId, PlantStage, Blind75ProblemSeed } from "@/types";

export const DEFAULT_CATEGORIES: Category[] = [
  {
    id: "coding",
    label: "Coding Practice",
    emoji: "🌵",
    plant: "Cactus",
    color: "#22c55e",
    colorClass: "text-green-500",
    bgClass: "bg-green-500",
    defaultMinutes: 25,
    weeklyTarget: 15,
  },
  {
    id: "ai",
    label: "AI Learning",
    emoji: "🌻",
    plant: "Sunflower",
    color: "#f59e0b",
    colorClass: "text-amber-500",
    bgClass: "bg-amber-500",
    defaultMinutes: 25,
    weeklyTarget: 8,
  },
  {
    id: "baby",
    label: "Baby Bonding",
    emoji: "🌷",
    plant: "Tulip",
    color: "#ec4899",
    colorClass: "text-pink-500",
    bgClass: "bg-pink-500",
    defaultMinutes: 30,
    weeklyTarget: 14,
  },
  {
    id: "fitness",
    label: "Fitness",
    emoji: "🌿",
    plant: "Fern",
    color: "#10b981",
    colorClass: "text-emerald-500",
    bgClass: "bg-emerald-500",
    defaultMinutes: 45,
    weeklyTarget: 5,
  },
  {
    id: "reading",
    label: "Reading",
    emoji: "🌹",
    plant: "Rose",
    color: "#ef4444",
    colorClass: "text-red-500",
    bgClass: "bg-red-500",
    defaultMinutes: 25,
    weeklyTarget: 5,
  },
  {
    id: "spiritual",
    label: "Spiritual",
    emoji: "🪻",
    plant: "Lavender",
    color: "#a855f7",
    colorClass: "text-purple-500",
    bgClass: "bg-purple-500",
    defaultMinutes: 25,
    weeklyTarget: 7,
  },
  {
    id: "interview",
    label: "Interview Prep",
    emoji: "🎯",
    plant: "Bamboo",
    color: "#0ea5e9",
    colorClass: "text-sky-500",
    bgClass: "bg-sky-500",
    defaultMinutes: 25,
    weeklyTarget: 10,
  },
];

// Plant/emoji presets for creating new categories
export const PLANT_PRESETS = [
  { emoji: "🌵", plant: "Cactus", color: "#22c55e", colorClass: "text-green-500", bgClass: "bg-green-500" },
  { emoji: "🌻", plant: "Sunflower", color: "#f59e0b", colorClass: "text-amber-500", bgClass: "bg-amber-500" },
  { emoji: "🌷", plant: "Tulip", color: "#ec4899", colorClass: "text-pink-500", bgClass: "bg-pink-500" },
  { emoji: "🌿", plant: "Fern", color: "#10b981", colorClass: "text-emerald-500", bgClass: "bg-emerald-500" },
  { emoji: "🌹", plant: "Rose", color: "#ef4444", colorClass: "text-red-500", bgClass: "bg-red-500" },
  { emoji: "🪻", plant: "Lavender", color: "#a855f7", colorClass: "text-purple-500", bgClass: "bg-purple-500" },
  { emoji: "🌸", plant: "Cherry Blossom", color: "#f472b6", colorClass: "text-pink-400", bgClass: "bg-pink-400" },
  { emoji: "🌴", plant: "Palm", color: "#14b8a6", colorClass: "text-teal-500", bgClass: "bg-teal-500" },
  { emoji: "🍀", plant: "Clover", color: "#16a34a", colorClass: "text-green-600", bgClass: "bg-green-600" },
  { emoji: "🌾", plant: "Wheat", color: "#d97706", colorClass: "text-amber-600", bgClass: "bg-amber-600" },
  { emoji: "🎋", plant: "Bamboo", color: "#65a30d", colorClass: "text-lime-600", bgClass: "bg-lime-600" },
  { emoji: "🍁", plant: "Maple", color: "#dc2626", colorClass: "text-red-600", bgClass: "bg-red-600" },
  { emoji: "🌼", plant: "Daisy", color: "#eab308", colorClass: "text-yellow-500", bgClass: "bg-yellow-500" },
  { emoji: "🌺", plant: "Hibiscus", color: "#e11d48", colorClass: "text-rose-600", bgClass: "bg-rose-600" },
  { emoji: "🪴", plant: "Potted Plant", color: "#059669", colorClass: "text-emerald-600", bgClass: "bg-emerald-600" },
];

export const PLANT_STAGES: PlantStage[] = [
  { name: "Seed", minSessions: 0, emoji: "🟤", size: "text-2xl" },
  { name: "Sprout", minSessions: 1, emoji: "🌱", size: "text-3xl" },
  { name: "Growing", minSessions: 4, emoji: "🌿", size: "text-4xl" },
  { name: "Bloom", minSessions: 9, emoji: "🌸", size: "text-5xl" },
  { name: "Full Flower", minSessions: 16, emoji: "🌺", size: "text-6xl" },
];

export function getPlantStage(sessions: number): PlantStage {
  let stage = PLANT_STAGES[0];
  for (const s of PLANT_STAGES) {
    if (sessions >= s.minSessions) stage = s;
  }
  return stage;
}

export function getPlantEmoji(categoryEmoji: string, sessions: number): string {
  const stage = getPlantStage(sessions);
  if (stage.minSessions === 0) return "🟤";
  if (stage.minSessions === 1) return "🌱";
  return categoryEmoji;
}

export const BLIND75_CATEGORIES = [
  "Arrays & Hashing",
  "Two Pointers",
  "Sliding Window",
  "Stack",
  "Binary Search",
  "Linked List",
  "Trees",
  "Tries",
  "Heap / Priority Queue",
  "Backtracking",
  "Graphs",
  "Advanced Graphs",
  "1-D Dynamic Programming",
  "2-D Dynamic Programming",
  "Greedy",
  "Intervals",
  "Math & Geometry",
  "Bit Manipulation",
] as const;

export const BLIND75_PROBLEMS: Blind75ProblemSeed[] = [
  // Arrays & Hashing
  { name: "Two Sum", category: "Arrays & Hashing", difficulty: "Easy", leetcode_number: 1 },
  { name: "Valid Anagram", category: "Arrays & Hashing", difficulty: "Easy", leetcode_number: 242 },
  { name: "Contains Duplicate", category: "Arrays & Hashing", difficulty: "Easy", leetcode_number: 217 },
  { name: "Group Anagrams", category: "Arrays & Hashing", difficulty: "Medium", leetcode_number: 49 },
  { name: "Top K Frequent Elements", category: "Arrays & Hashing", difficulty: "Medium", leetcode_number: 347 },
  { name: "Product of Array Except Self", category: "Arrays & Hashing", difficulty: "Medium", leetcode_number: 238 },
  { name: "Encode and Decode Strings", category: "Arrays & Hashing", difficulty: "Medium", leetcode_number: 271 },
  { name: "Longest Consecutive Sequence", category: "Arrays & Hashing", difficulty: "Medium", leetcode_number: 128 },
  { name: "Valid Sudoku", category: "Arrays & Hashing", difficulty: "Medium", leetcode_number: 36 },

  // Two Pointers
  { name: "Valid Palindrome", category: "Two Pointers", difficulty: "Easy", leetcode_number: 125 },
  { name: "3Sum", category: "Two Pointers", difficulty: "Medium", leetcode_number: 15 },
  { name: "Container With Most Water", category: "Two Pointers", difficulty: "Medium", leetcode_number: 11 },
  { name: "Two Sum II", category: "Two Pointers", difficulty: "Medium", leetcode_number: 167 },
  { name: "Trapping Rain Water", category: "Two Pointers", difficulty: "Hard", leetcode_number: 42 },

  // Sliding Window
  { name: "Best Time to Buy and Sell Stock", category: "Sliding Window", difficulty: "Easy", leetcode_number: 121 },
  { name: "Longest Substring Without Repeating Characters", category: "Sliding Window", difficulty: "Medium", leetcode_number: 3 },
  { name: "Longest Repeating Character Replacement", category: "Sliding Window", difficulty: "Medium", leetcode_number: 424 },
  { name: "Permutation in String", category: "Sliding Window", difficulty: "Medium", leetcode_number: 567 },
  { name: "Minimum Window Substring", category: "Sliding Window", difficulty: "Hard", leetcode_number: 76 },
  { name: "Sliding Window Maximum", category: "Sliding Window", difficulty: "Hard", leetcode_number: 239 },

  // Stack
  { name: "Valid Parentheses", category: "Stack", difficulty: "Easy", leetcode_number: 20 },
  { name: "Min Stack", category: "Stack", difficulty: "Medium", leetcode_number: 155 },
  { name: "Evaluate Reverse Polish Notation", category: "Stack", difficulty: "Medium", leetcode_number: 150 },
  { name: "Generate Parentheses", category: "Stack", difficulty: "Medium", leetcode_number: 22 },
  { name: "Daily Temperatures", category: "Stack", difficulty: "Medium", leetcode_number: 739 },
  { name: "Car Fleet", category: "Stack", difficulty: "Medium", leetcode_number: 853 },
  { name: "Largest Rectangle in Histogram", category: "Stack", difficulty: "Hard", leetcode_number: 84 },

  // Binary Search
  { name: "Binary Search", category: "Binary Search", difficulty: "Easy", leetcode_number: 704 },
  { name: "Search a 2D Matrix", category: "Binary Search", difficulty: "Medium", leetcode_number: 74 },
  { name: "Koko Eating Bananas", category: "Binary Search", difficulty: "Medium", leetcode_number: 875 },
  { name: "Search in Rotated Sorted Array", category: "Binary Search", difficulty: "Medium", leetcode_number: 33 },
  { name: "Find Minimum in Rotated Sorted Array", category: "Binary Search", difficulty: "Medium", leetcode_number: 153 },
  { name: "Time Based Key-Value Store", category: "Binary Search", difficulty: "Medium", leetcode_number: 981 },
  { name: "Median of Two Sorted Arrays", category: "Binary Search", difficulty: "Hard", leetcode_number: 4 },

  // Linked List
  { name: "Reverse Linked List", category: "Linked List", difficulty: "Easy", leetcode_number: 206 },
  { name: "Merge Two Sorted Lists", category: "Linked List", difficulty: "Easy", leetcode_number: 21 },
  { name: "Linked List Cycle", category: "Linked List", difficulty: "Easy", leetcode_number: 141 },
  { name: "Reorder List", category: "Linked List", difficulty: "Medium", leetcode_number: 143 },
  { name: "Remove Nth Node From End of List", category: "Linked List", difficulty: "Medium", leetcode_number: 19 },
  { name: "Add Two Numbers", category: "Linked List", difficulty: "Medium", leetcode_number: 2 },
  { name: "Merge K Sorted Lists", category: "Linked List", difficulty: "Hard", leetcode_number: 23 },

  // Trees
  { name: "Invert Binary Tree", category: "Trees", difficulty: "Easy", leetcode_number: 226 },
  { name: "Maximum Depth of Binary Tree", category: "Trees", difficulty: "Easy", leetcode_number: 104 },
  { name: "Same Tree", category: "Trees", difficulty: "Easy", leetcode_number: 100 },
  { name: "Subtree of Another Tree", category: "Trees", difficulty: "Easy", leetcode_number: 572 },
  { name: "Lowest Common Ancestor of a BST", category: "Trees", difficulty: "Medium", leetcode_number: 235 },
  { name: "Binary Tree Level Order Traversal", category: "Trees", difficulty: "Medium", leetcode_number: 102 },
  { name: "Validate Binary Search Tree", category: "Trees", difficulty: "Medium", leetcode_number: 98 },
  { name: "Kth Smallest Element in a BST", category: "Trees", difficulty: "Medium", leetcode_number: 230 },
  { name: "Construct Binary Tree from Preorder and Inorder Traversal", category: "Trees", difficulty: "Medium", leetcode_number: 105 },
  { name: "Binary Tree Maximum Path Sum", category: "Trees", difficulty: "Hard", leetcode_number: 124 },
  { name: "Serialize and Deserialize Binary Tree", category: "Trees", difficulty: "Hard", leetcode_number: 297 },

  // Tries
  { name: "Implement Trie (Prefix Tree)", category: "Tries", difficulty: "Medium", leetcode_number: 208 },
  { name: "Design Add and Search Words Data Structure", category: "Tries", difficulty: "Medium", leetcode_number: 211 },
  { name: "Word Search II", category: "Tries", difficulty: "Hard", leetcode_number: 212 },

  // Heap / Priority Queue
  { name: "Kth Largest Element in a Stream", category: "Heap / Priority Queue", difficulty: "Easy", leetcode_number: 703 },
  { name: "Last Stone Weight", category: "Heap / Priority Queue", difficulty: "Easy", leetcode_number: 1046 },
  { name: "K Closest Points to Origin", category: "Heap / Priority Queue", difficulty: "Medium", leetcode_number: 973 },
  { name: "Task Scheduler", category: "Heap / Priority Queue", difficulty: "Medium", leetcode_number: 621 },
  { name: "Design Twitter", category: "Heap / Priority Queue", difficulty: "Medium", leetcode_number: 355 },
  { name: "Find Median from Data Stream", category: "Heap / Priority Queue", difficulty: "Hard", leetcode_number: 295 },

  // Backtracking
  { name: "Subsets", category: "Backtracking", difficulty: "Medium", leetcode_number: 78 },
  { name: "Combination Sum", category: "Backtracking", difficulty: "Medium", leetcode_number: 39 },
  { name: "Word Search", category: "Backtracking", difficulty: "Medium", leetcode_number: 79 },

  // Graphs
  { name: "Number of Islands", category: "Graphs", difficulty: "Medium", leetcode_number: 200 },
  { name: "Clone Graph", category: "Graphs", difficulty: "Medium", leetcode_number: 133 },
  { name: "Pacific Atlantic Water Flow", category: "Graphs", difficulty: "Medium", leetcode_number: 417 },
  { name: "Course Schedule", category: "Graphs", difficulty: "Medium", leetcode_number: 207 },
  { name: "Graph Valid Tree", category: "Graphs", difficulty: "Medium", leetcode_number: 261 },
  { name: "Number of Connected Components in an Undirected Graph", category: "Graphs", difficulty: "Medium", leetcode_number: 323 },

  // Advanced Graphs
  { name: "Alien Dictionary", category: "Advanced Graphs", difficulty: "Hard", leetcode_number: 269 },

  // 1-D Dynamic Programming
  { name: "Climbing Stairs", category: "1-D Dynamic Programming", difficulty: "Easy", leetcode_number: 70 },
  { name: "House Robber", category: "1-D Dynamic Programming", difficulty: "Medium", leetcode_number: 198 },
  { name: "House Robber II", category: "1-D Dynamic Programming", difficulty: "Medium", leetcode_number: 213 },
  { name: "Longest Palindromic Substring", category: "1-D Dynamic Programming", difficulty: "Medium", leetcode_number: 5 },
  { name: "Palindromic Substrings", category: "1-D Dynamic Programming", difficulty: "Medium", leetcode_number: 647 },
  { name: "Decode Ways", category: "1-D Dynamic Programming", difficulty: "Medium", leetcode_number: 91 },
  { name: "Coin Change", category: "1-D Dynamic Programming", difficulty: "Medium", leetcode_number: 322 },
  { name: "Maximum Product Subarray", category: "1-D Dynamic Programming", difficulty: "Medium", leetcode_number: 152 },
  { name: "Word Break", category: "1-D Dynamic Programming", difficulty: "Medium", leetcode_number: 139 },
  { name: "Longest Increasing Subsequence", category: "1-D Dynamic Programming", difficulty: "Medium", leetcode_number: 300 },

  // 2-D Dynamic Programming
  { name: "Unique Paths", category: "2-D Dynamic Programming", difficulty: "Medium", leetcode_number: 62 },
  { name: "Longest Common Subsequence", category: "2-D Dynamic Programming", difficulty: "Medium", leetcode_number: 1143 },

  // Greedy
  { name: "Maximum Subarray", category: "Greedy", difficulty: "Medium", leetcode_number: 53 },
  { name: "Jump Game", category: "Greedy", difficulty: "Medium", leetcode_number: 55 },

  // Intervals
  { name: "Insert Interval", category: "Intervals", difficulty: "Medium", leetcode_number: 57 },
  { name: "Merge Intervals", category: "Intervals", difficulty: "Medium", leetcode_number: 56 },
  { name: "Non-overlapping Intervals", category: "Intervals", difficulty: "Medium", leetcode_number: 435 },
  { name: "Meeting Rooms", category: "Intervals", difficulty: "Easy", leetcode_number: 252 },
  { name: "Meeting Rooms II", category: "Intervals", difficulty: "Medium", leetcode_number: 253 },

  // Math & Geometry
  { name: "Rotate Image", category: "Math & Geometry", difficulty: "Medium", leetcode_number: 48 },
  { name: "Spiral Matrix", category: "Math & Geometry", difficulty: "Medium", leetcode_number: 54 },
  { name: "Set Matrix Zeroes", category: "Math & Geometry", difficulty: "Medium", leetcode_number: 73 },

  // Bit Manipulation
  { name: "Number of 1 Bits", category: "Bit Manipulation", difficulty: "Easy", leetcode_number: 191 },
  { name: "Counting Bits", category: "Bit Manipulation", difficulty: "Easy", leetcode_number: 338 },
  { name: "Reverse Bits", category: "Bit Manipulation", difficulty: "Easy", leetcode_number: 190 },
  { name: "Missing Number", category: "Bit Manipulation", difficulty: "Easy", leetcode_number: 268 },
  { name: "Sum of Two Integers", category: "Bit Manipulation", difficulty: "Medium", leetcode_number: 371 },
];

export const MOTIVATIONAL_QUOTES = [
  { text: "The best time to plant a tree was 20 years ago. The second best time is now.", author: "Chinese Proverb" },
  { text: "Small daily improvements over time lead to stunning results.", author: "Robin Sharma" },
  { text: "Consistency is what transforms average into excellence.", author: "Unknown" },
  { text: "Every expert was once a beginner.", author: "Helen Hayes" },
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { text: "Success is the sum of small efforts, repeated day in and day out.", author: "Robert Collier" },
  { text: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius" },
  { text: "A journey of a thousand miles begins with a single step.", author: "Lao Tzu" },
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "What you do today can improve all your tomorrows.", author: "Ralph Marston" },
  { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
  { text: "Your future is created by what you do today, not tomorrow.", author: "Robert Kiyosaki" },
  { text: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
  { text: "The harder you work, the luckier you get.", author: "Gary Player" },
  { text: "Dreams don't work unless you do.", author: "John C. Maxwell" },
  { text: "Start where you are. Use what you have. Do what you can.", author: "Arthur Ashe" },
  { text: "The way to get started is to quit talking and begin doing.", author: "Walt Disney" },
  { text: "Discipline is the bridge between goals and accomplishment.", author: "Jim Rohn" },
  { text: "Growth is never by mere chance; it is the result of forces working together.", author: "James Cash Penney" },
  { text: "The only impossible journey is the one you never begin.", author: "Tony Robbins" },
  { text: "Fall seven times, stand up eight.", author: "Japanese Proverb" },
  { text: "Great things are not done by impulse, but by a series of small things brought together.", author: "Vincent Van Gogh" },
  { text: "You don't have to be great to start, but you have to start to be great.", author: "Zig Ziglar" },
  { text: "Action is the foundational key to all success.", author: "Pablo Picasso" },
  { text: "A little progress each day adds up to big results.", author: "Satya Nani" },
  { text: "Commit to the Lord whatever you do, and he will establish your plans.", author: "Proverbs 16:3" },
  { text: "For I know the plans I have for you, plans to prosper you and not to harm you.", author: "Jeremiah 29:11" },
  { text: "I can do all things through Christ who strengthens me.", author: "Philippians 4:13" },
  { text: "Train up a child in the way he should go; even when he is old he will not depart from it.", author: "Proverbs 22:6" },
  { text: "Whatever you do, work at it with all your heart.", author: "Colossians 3:23" },
];

export function getDailyQuote(): { text: string; author: string } {
  const today = new Date();
  const dayOfYear = Math.floor(
    (today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000
  );
  return MOTIVATIONAL_QUOTES[dayOfYear % MOTIVATIONAL_QUOTES.length];
}

// Baby Activities
export interface BabyActivity {
  id: string;
  title: string;
  description: string;
  emoji: string;
  duration: string;
  minMonths: number;
  maxMonths: number;
}

export const BABY_ACTIVITIES: BabyActivity[] = [
  // 0-3 months
  { id: "tummy_time_beginner", title: "Tummy Time", description: "Place baby on their tummy on a firm surface. Stay close and encourage them to lift their head. Start with 1-2 minutes.", emoji: "🤱", duration: "1-5 min", minMonths: 0, maxMonths: 3 },
  { id: "eye_tracking", title: "Eye Tracking", description: "Slowly move a colorful toy or your face side to side. Watch baby follow with their eyes.", emoji: "👀", duration: "2-5 min", minMonths: 0, maxMonths: 4 },
  { id: "gentle_massage", title: "Gentle Massage", description: "Use gentle strokes on baby's arms, legs, and back. Great for bonding and relaxation.", emoji: "💆", duration: "5-10 min", minMonths: 0, maxMonths: 12 },
  { id: "singing_talking", title: "Sing & Talk", description: "Sing lullabies or talk to your baby about what you're doing. They learn language from hearing you!", emoji: "🎵", duration: "5-10 min", minMonths: 0, maxMonths: 36 },
  { id: "black_white_cards", title: "High Contrast Cards", description: "Show black and white pattern cards about 8-12 inches from baby's face. Newborns love high contrast!", emoji: "🃏", duration: "3-5 min", minMonths: 0, maxMonths: 3 },
  { id: "skin_to_skin", title: "Skin-to-Skin Time", description: "Hold baby against your bare chest. Regulates their temperature, heart rate, and deepens bonding.", emoji: "💕", duration: "10-20 min", minMonths: 0, maxMonths: 6 },

  // 3-6 months
  { id: "reaching_toys", title: "Reach for Toys", description: "Dangle toys within reach and encourage baby to grab them. Builds hand-eye coordination.", emoji: "🧸", duration: "5-10 min", minMonths: 3, maxMonths: 8 },
  { id: "mirror_play", title: "Mirror Play", description: "Hold baby in front of a mirror. They'll love seeing faces! Point and say \"That's you!\"", emoji: "🪞", duration: "3-5 min", minMonths: 3, maxMonths: 12 },
  { id: "peekaboo_intro", title: "Peek-a-Boo", description: "Cover your face with hands or a cloth and reveal yourself. Teaches object permanence!", emoji: "🙈", duration: "5 min", minMonths: 3, maxMonths: 18 },
  { id: "board_books", title: "Read Board Books", description: "Read simple board books with bold pictures. Point to images and name them.", emoji: "📚", duration: "5-10 min", minMonths: 3, maxMonths: 36 },
  { id: "rattle_play", title: "Rattle Play", description: "Shake a rattle and let baby hold it. They'll learn cause and effect when they shake it themselves!", emoji: "🎯", duration: "5 min", minMonths: 3, maxMonths: 8 },
  { id: "bicycle_legs", title: "Bicycle Legs", description: "Gently move baby's legs in a cycling motion while they lie on their back. Good for digestion and muscles.", emoji: "🚲", duration: "3-5 min", minMonths: 2, maxMonths: 8 },

  // 6-9 months
  { id: "sitting_practice", title: "Sitting Practice", description: "Help baby practice sitting with support. Use pillows around them for safety.", emoji: "🪑", duration: "5-10 min", minMonths: 5, maxMonths: 9 },
  { id: "stacking_cups", title: "Stacking Cups", description: "Show baby how to stack and knock down cups. They'll love the crashing part!", emoji: "🥤", duration: "5-10 min", minMonths: 6, maxMonths: 18 },
  { id: "finger_foods", title: "Finger Food Exploration", description: "Offer soft finger foods and let baby explore textures. Supervise closely.", emoji: "🥦", duration: "10-15 min", minMonths: 6, maxMonths: 18 },
  { id: "music_rhythm", title: "Music & Rhythm", description: "Play music and clap along. Give baby a drum or pot to bang. Develops rhythm sense.", emoji: "🥁", duration: "5-10 min", minMonths: 6, maxMonths: 36 },
  { id: "object_permanence", title: "Hide & Find", description: "Hide a toy under a blanket and help baby find it. Builds object permanence understanding.", emoji: "🔍", duration: "5 min", minMonths: 6, maxMonths: 12 },
  { id: "texture_play", title: "Texture Exploration", description: "Let baby touch different textures: soft fabric, smooth wood, crinkly paper. Name each texture.", emoji: "🧶", duration: "5-10 min", minMonths: 5, maxMonths: 12 },

  // 9-12 months
  { id: "cruising_games", title: "Cruising & Walking Support", description: "Help baby pull up on furniture and cruise along it. Hold their hands for walking practice.", emoji: "🚶", duration: "5-10 min", minMonths: 8, maxMonths: 15 },
  { id: "shape_sorting", title: "Shape Sorting", description: "Use a simple shape sorter toy. Guide baby's hand to match shapes to holes.", emoji: "🔷", duration: "5-10 min", minMonths: 9, maxMonths: 24 },
  { id: "wave_clap", title: "Wave & Clap Games", description: "Practice waving bye-bye and clapping. Sing \"Pat-a-Cake\" together.", emoji: "👋", duration: "3-5 min", minMonths: 8, maxMonths: 15 },
  { id: "pointing_practice", title: "Point & Name", description: "Point to objects and name them. Encourage baby to point too. \"Where's the doggy?\"", emoji: "👆", duration: "5-10 min", minMonths: 9, maxMonths: 24 },
  { id: "simple_words", title: "First Words Practice", description: "Repeat simple words: mama, dada, ball, dog. Celebrate when baby tries to imitate!", emoji: "🗣️", duration: "5-10 min", minMonths: 9, maxMonths: 18 },
  { id: "ball_rolling", title: "Roll a Ball", description: "Sit across from baby and roll a ball back and forth. Great for turn-taking skills.", emoji: "⚽", duration: "5-10 min", minMonths: 8, maxMonths: 24 },

  // 12-18 months
  { id: "walking_practice", title: "Walking Adventures", description: "Let baby practice walking on different surfaces. Hold hands outside on grass, sidewalk.", emoji: "👣", duration: "10-15 min", minMonths: 10, maxMonths: 18 },
  { id: "block_stacking", title: "Block Stacking", description: "Stack blocks and let baby knock them down. Gradually encourage them to stack too.", emoji: "🧱", duration: "5-10 min", minMonths: 10, maxMonths: 36 },
  { id: "naming_objects", title: "Name Everything", description: "Walk around the house naming objects. \"This is a chair. This is a cup.\" Builds vocabulary fast.", emoji: "🏷️", duration: "5-10 min", minMonths: 12, maxMonths: 24 },
  { id: "scribbling", title: "Crayons & Scribbling", description: "Give baby large crayons and paper. Let them scribble freely. First art experience!", emoji: "🖍️", duration: "5-10 min", minMonths: 12, maxMonths: 36 },
  { id: "pretend_phone", title: "Pretend Play", description: "Use toy phones, kitchen sets, or dolls. Model pretend actions: \"Hello? Yes, I'm cooking dinner!\"", emoji: "📱", duration: "5-10 min", minMonths: 12, maxMonths: 36 },

  // 18-24 months
  { id: "running_climbing", title: "Run & Climb", description: "Let toddler run in a safe space. Practice climbing on low playground equipment.", emoji: "🏃", duration: "10-20 min", minMonths: 18, maxMonths: 36 },
  { id: "simple_puzzles", title: "Simple Puzzles", description: "Try 2-4 piece chunky puzzles. Help toddler match shapes to their spots.", emoji: "🧩", duration: "5-10 min", minMonths: 18, maxMonths: 36 },
  { id: "pretend_kitchen", title: "Kitchen Play", description: "Set up a pretend kitchen. \"Cook\" together, serve food to stuffed animals.", emoji: "🍳", duration: "10-15 min", minMonths: 18, maxMonths: 36 },
  { id: "counting_intro", title: "Counting Together", description: "Count steps, toys, snacks. \"One, two, three crackers!\" Touch each item as you count.", emoji: "🔢", duration: "3-5 min", minMonths: 18, maxMonths: 36 },
  { id: "color_naming", title: "Color Hunt", description: "Point out colors everywhere. \"Can you find something red?\" Makes a game of daily life.", emoji: "🎨", duration: "5-10 min", minMonths: 18, maxMonths: 36 },
  { id: "water_play", title: "Water Play", description: "Fill a basin with water and cups, spoons, boats. Pouring and splashing teaches physics!", emoji: "💧", duration: "10-15 min", minMonths: 12, maxMonths: 36 },

  // 24-36 months
  { id: "jumping_practice", title: "Jumping Games", description: "Practice jumping with both feet. Jump over lines, off low steps, or on a trampoline.", emoji: "🦘", duration: "5-10 min", minMonths: 24, maxMonths: 36 },
  { id: "storytelling", title: "Story Time & Retelling", description: "Read a familiar story and let toddler fill in words. Ask \"What happens next?\"", emoji: "📖", duration: "10-15 min", minMonths: 24, maxMonths: 36 },
  { id: "alphabet_play", title: "Letter Fun", description: "Sing the ABC song, play with magnetic letters, or trace letters in sand/flour.", emoji: "🔤", duration: "5-10 min", minMonths: 24, maxMonths: 36 },
  { id: "sharing_turns", title: "Turn-Taking Games", description: "Practice sharing and taking turns with simple board games or toy cars.", emoji: "🤝", duration: "5-10 min", minMonths: 24, maxMonths: 36 },
];

export interface BabyTip {
  text: string;
  minMonths: number;
  maxMonths: number;
}

export const BABY_TIPS: BabyTip[] = [
  { text: "Babies learn language from live interaction, not screens. Your voice is the best teacher.", minMonths: 0, maxMonths: 36 },
  { text: "Respond to your baby's coos and babbles. This \"serve and return\" builds brain connections.", minMonths: 0, maxMonths: 12 },
  { text: "Tummy time is crucial for motor development. Even a few minutes several times a day helps!", minMonths: 0, maxMonths: 6 },
  { text: "Babies don't need expensive toys. Kitchen utensils, fabric scraps, and boxes are fascinating!", minMonths: 3, maxMonths: 36 },
  { text: "Reading to your baby from birth builds vocabulary — even before they understand words.", minMonths: 0, maxMonths: 36 },
  { text: "Narrate your day to baby: \"Now we're making lunch. I'm cutting an apple.\" This builds language.", minMonths: 0, maxMonths: 24 },
  { text: "Let your baby explore safely. Curiosity is the engine of learning.", minMonths: 6, maxMonths: 36 },
  { text: "Messy play is learning play. Let them squish, pour, and explore textures.", minMonths: 6, maxMonths: 36 },
  { text: "Repetition isn't boring for babies — it's how they learn. Read that favorite book again!", minMonths: 3, maxMonths: 36 },
  { text: "Your calm presence is the best gift. When you're regulated, your baby feels safe.", minMonths: 0, maxMonths: 36 },
  { text: "Toddlers need to move. Plan active time before expecting them to sit still.", minMonths: 12, maxMonths: 36 },
  { text: "Name emotions: \"You're frustrated because the block fell down.\" This builds emotional intelligence.", minMonths: 12, maxMonths: 36 },
  { text: "Give toddlers choices: \"Red cup or blue cup?\" This reduces power struggles.", minMonths: 18, maxMonths: 36 },
  { text: "Rough housing and physical play with dad helps kids learn to regulate their bodies.", minMonths: 6, maxMonths: 36 },
  { text: "Put your phone down during play time. Babies can tell when you're distracted.", minMonths: 0, maxMonths: 36 },
  { text: "Sleep is when the brain consolidates learning. Protect nap time!", minMonths: 0, maxMonths: 36 },
  { text: "Every baby develops at their own pace. Milestones are ranges, not deadlines.", minMonths: 0, maxMonths: 36 },
  { text: "Outdoor time — even just sitting in the yard — provides rich sensory experiences.", minMonths: 0, maxMonths: 36 },
  { text: "When baby points at something, follow their gaze and name it. Joint attention builds language fast.", minMonths: 9, maxMonths: 24 },
  { text: "Singing slows down language so babies can hear individual sounds. Sing everything!", minMonths: 0, maxMonths: 24 },
  { text: "Toddler tantrums are normal brain development, not bad behavior. Stay calm and present.", minMonths: 12, maxMonths: 36 },
  { text: "Let toddlers help with \"real\" tasks — stirring, wiping, putting away. It builds confidence.", minMonths: 18, maxMonths: 36 },
  { text: "The best parenting happens in ordinary moments — meals, baths, walks, bedtime routines.", minMonths: 0, maxMonths: 36 },
  { text: "You don't need to fill every moment. Boredom sparks creativity, even in toddlers.", minMonths: 12, maxMonths: 36 },
  { text: "Connection before correction. When your toddler acts out, get on their level and connect first.", minMonths: 12, maxMonths: 36 },
];

export function getDailyBabyTip(babyAgeMonths: number): BabyTip {
  const ageTips = BABY_TIPS.filter(
    (t) => babyAgeMonths >= t.minMonths && babyAgeMonths <= t.maxMonths
  );
  if (ageTips.length === 0) return BABY_TIPS[0];
  const today = new Date();
  const dayOfYear = Math.floor(
    (today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000
  );
  return ageTips[dayOfYear % ageTips.length];
}

export function getDailyBabyActivities(babyAgeMonths: number, count: number = 5): BabyActivity[] {
  const ageActivities = BABY_ACTIVITIES.filter(
    (a) => babyAgeMonths >= a.minMonths && babyAgeMonths <= a.maxMonths
  );
  if (ageActivities.length <= count) return ageActivities;

  // Deterministic shuffle based on date
  const today = new Date();
  const daySeed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
  const shuffled = [...ageActivities];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = ((daySeed * (i + 1) * 2654435761) >>> 0) % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
}
