export interface BookTemplate {
 id: string
 name: string
 category: 'fiction' | 'non-fiction' | 'children' | 'educational'
 icon: string
 description: string
 genre: string
 targetAudience: string
 style: string
 bookType: 'text' | 'picture'
 chapters: number
 estimatedWords: number
 chapterOutline: {
 title: string
 description: string
 estimatedWords: number
 }[]
 samplePrompt?: string
 tags: string[]
}

export const bookTemplates: BookTemplate[] = [
  // Fiction Templates
 {
 id: 'fantasy-adventure',
 name: 'Fantasy Adventure',
 category: 'fiction',
 icon: '',
 description: 'An epic fantasy adventure with magic, heroes, and mythical creatures',
 genre: 'Fantasy',
 targetAudience: 'Young Adults and Adults',
 style: 'Epic and adventurous',
 bookType: 'text',
 chapters: 20,
 estimatedWords: 80000,
 tags: ['Magic', 'Adventure', 'Heroes', 'Dragons'],
 chapterOutline: [
 { title: 'The Ordinary Beginning', description: 'Introduction of the protagonist in their everyday world', estimatedWords: 4000 },
 { title: 'The Call to Adventure', description: 'An event disrupts normalcy', estimatedWords: 4000 },
 { title: 'The First Encounter', description: 'Meeting with a mentor or magical being', estimatedWords: 4000 },
 { title: 'The Journey Begins', description: 'Departure into the unknown world', estimatedWords: 4000 },
 { title: 'Trials and Allies', description: 'First challenges and new friends', estimatedWords: 4000 }
 ],
 samplePrompt: 'A young hero discovers magical powers and must save their world from a dark threat'
 },
 {
 id: 'mystery-thriller',
 name: 'Mystery & Thriller',
 category: 'fiction',
 icon: '',
 description: 'Thrilling mystery with surprising twists and complex characters',
 genre: 'Mystery',
 targetAudience: 'Adults',
 style: 'Suspenseful and atmospheric',
 bookType: 'text',
 chapters: 25,
 estimatedWords: 75000,
 tags: ['Suspense', 'Mystery', 'Investigation', 'Twists'],
 chapterOutline: [
 { title: 'The Case', description: 'A mysterious incident occurs', estimatedWords: 3000 },
 { title: 'The Investigation Begins', description: 'First clues and suspects', estimatedWords: 3000 },
 { title: 'False Leads', description: 'Confusing hints lead astray', estimatedWords: 3000 },
 { title: 'The First Twist', description: 'A surprising discovery', estimatedWords: 3000 },
 { title: 'Dark Secrets', description: 'Hidden truths come to light', estimatedWords: 3000 }
 ],
 samplePrompt: 'An experienced detective investigates a puzzling case that leads them into a world full of secrets and dangers'
 },
 {
 id: 'romance-novel',
 name: 'Romance Novel',
 category: 'fiction',
 icon: '',
 description: 'Emotional love story with ups and downs',
 genre: 'Romance',
 targetAudience: 'Adults',
 style: 'Emotional and romantic',
 bookType: 'text',
 chapters: 18,
 estimatedWords: 70000,
 tags: ['Love', 'Emotion', 'Relationships', 'Drama'],
 chapterOutline: [
 { title: 'The First Meeting', description: 'The protagonists meet each other', estimatedWords: 4000 },
 { title: 'Sparks Fly', description: 'Initial attraction and chemistry', estimatedWords: 4000 },
 { title: 'Obstacles', description: 'Problems stand in the way of love', estimatedWords: 4000 },
 { title: 'Growing Closer', description: 'The relationship deepens', estimatedWords: 4000 },
 { title: 'The Crisis', description: 'A major conflict arises', estimatedWords: 4000 }
 ],
 samplePrompt: 'Two people from different worlds fall in love but must overcome many obstacles'
 },

  // Children's Books
 {
 id: 'childrens-adventure',
 name: 'Children\'s Adventure',
 category: 'children',
 icon: '',
 description: 'Fun adventure for children with important lessons',
 genre: 'Children\'s Book',
 targetAudience: 'Children ages 6-10',
 style: 'Fun and educational',
 bookType: 'picture',
 chapters: 10,
 estimatedWords: 5000,
 tags: ['Children', 'Adventure', 'Friendship', 'Learning'],
 chapterOutline: [
 { title: 'The Special Day', description: 'Introduction of the main character', estimatedWords: 500 },
 { title: 'A New Friend', description: 'Meeting with a special companion', estimatedWords: 500 },
 { title: 'The Big Adventure', description: 'The adventure begins', estimatedWords: 500 },
 { title: 'A Difficult Task', description: 'First challenge', estimatedWords: 500 },
 { title: 'Together We Are Strong', description: 'Teamwork solves the problem', estimatedWords: 500 }
 ],
 samplePrompt: 'A brave child experiences an exciting adventure with friends and learns important values'
 },
 {
 id: 'bedtime-story',
 name: 'Bedtime Story',
 category: 'children',
 icon: '',
 description: 'Calming bedtime story for little ones',
 genre: 'Picture Book',
 targetAudience: 'Children ages 2-5',
 style: 'Gentle and soothing',
 bookType: 'picture',
 chapters: 8,
 estimatedWords: 2000,
 tags: ['Sleep', 'Dreams', 'Comfort', 'Animals'],
 chapterOutline: [
 { title: 'Evening Arrives', description: 'The sun goes down', estimatedWords: 250 },
 { title: 'Time for Bed', description: 'Preparing for bedtime', estimatedWords: 250 },
 { title: 'Cozy Dreams', description: 'Bedtime rituals', estimatedWords: 250 },
 { title: 'In Dreamland', description: 'Beautiful dreams begin', estimatedWords: 250 }
 ],
 samplePrompt: 'A gentle story about a little rabbit who goes on a magical nighttime journey'
 },

  // Non-Fiction Templates
 {
 id: 'self-help-guide',
 name: 'Self-Help Guide',
 category: 'non-fiction',
 icon: '',
 description: 'Practical guide with actionable tips and strategies',
 genre: 'Self-Help',
 targetAudience: 'Adults',
 style: 'Practical and motivating',
 bookType: 'text',
 chapters: 15,
 estimatedWords: 50000,
 tags: ['Self-Development', 'Tips', 'Motivation', 'Practice'],
 chapterOutline: [
 { title: 'Introduction: Why This Book?', description: 'Goals and benefits', estimatedWords: 3000 },
 { title: 'Understanding the Basics', description: 'Theoretical foundation', estimatedWords: 3500 },
 { title: 'Step 1: The Beginning', description: 'First practical steps', estimatedWords: 3500 },
 { title: 'Overcoming Obstacles', description: 'Dealing with challenges', estimatedWords: 3500 },
 { title: 'Long-Term Success', description: 'Sustainable strategies', estimatedWords: 3500 }
 ],
 samplePrompt: 'A comprehensive guide that helps people achieve their goals and grow personally'
 },
 {
 id: 'cookbook',
 name: 'Cookbook',
 category: 'non-fiction',
 icon: '',
 description: 'Collection of delicious recipes with tips and tricks',
 genre: 'Cookbook',
 targetAudience: 'All Ages',
 style: 'Practical and appetizing',
 bookType: 'picture',
 chapters: 12,
 estimatedWords: 25000,
 tags: ['Cooking', 'Recipes', 'Nutrition', 'Culinary'],
 chapterOutline: [
 { title: 'Introduction: The Basics', description: 'Essential equipment and techniques', estimatedWords: 2000 },
 { title: 'Breakfast & Brunch', description: 'Recipes to start the day', estimatedWords: 2000 },
 { title: 'Appetizers & Snacks', description: 'Delicious bites', estimatedWords: 2000 },
 { title: 'Main Courses', description: 'Hearty meals', estimatedWords: 2500 },
 { title: 'Desserts', description: 'Sweet temptations', estimatedWords: 2000 }
 ],
 samplePrompt: 'An inspiring cookbook with simple to sophisticated recipes for every occasion'
 },

  // Educational Templates
 {
 id: 'learn-language',
 name: 'Language Learning for Beginners',
 category: 'educational',
 icon: '',
 description: 'Structured language course for self-learning',
 genre: 'Textbook',
 targetAudience: 'Teens and Adults',
 style: 'Educational and structured',
 bookType: 'text',
 chapters: 20,
 estimatedWords: 40000,
 tags: ['Language', 'Learning', 'Exercises', 'Grammar'],
 chapterOutline: [
 { title: 'Lesson 1: Greetings & Introductions', description: 'First words and sentences', estimatedWords: 2000 },
 { title: 'Lesson 2: Numbers & Time', description: 'Basic concepts', estimatedWords: 2000 },
 { title: 'Lesson 3: At the Restaurant', description: 'Everyday situations', estimatedWords: 2000 },
 { title: 'Lesson 4: Family & Friends', description: 'Talking about people', estimatedWords: 2000 },
 { title: 'Lesson 5: Grammar Basics', description: 'Important rules', estimatedWords: 2000 }
 ],
 samplePrompt: 'A beginner-friendly language course with practical exercises and clear explanations'
 },
 {
 id: 'science-kids',
 name: 'Science for Kids',
 category: 'educational',
 icon: '',
 description: 'Exciting scientific topics explained in a child-friendly way',
 genre: 'Children\'s Non-Fiction',
 targetAudience: 'Children ages 8-12',
 style: 'Entertaining and educational',
 bookType: 'picture',
 chapters: 12,
 estimatedWords: 15000,
 tags: ['Science', 'Experiments', 'Learning', 'Discovery'],
 chapterOutline: [
 { title: 'What is Science?', description: 'Introduction for young researchers', estimatedWords: 1200 },
 { title: 'Experiments at Home', description: 'Simple experiments to try', estimatedWords: 1500 },
 { title: 'The Animal World', description: 'Fascinating facts', estimatedWords: 1500 },
 { title: 'Our Body', description: 'How does the human body work?', estimatedWords: 1500 },
 { title: 'The Universe', description: 'Stars, planets and more', estimatedWords: 1500 }
 ],
 samplePrompt: 'A fascinating non-fiction book that teaches children scientific concepts in a playful way'
 },

  // Business & Professional
 {
 id: 'business-strategy',
 name: 'Business Strategy',
 category: 'non-fiction',
 icon: '',
 description: 'Practical guide for business success',
 genre: 'Business',
 targetAudience: 'Entrepreneurs and Executives',
 style: 'Professional and strategic',
 bookType: 'text',
 chapters: 18,
 estimatedWords: 60000,
 tags: ['Business', 'Strategy', 'Management', 'Success'],
 chapterOutline: [
 { title: 'Developing Strategic Vision', description: 'Fundamentals of business strategy', estimatedWords: 3500 },
 { title: 'Market Analysis', description: 'Understanding the competition', estimatedWords: 3500 },
 { title: 'Innovation Management', description: 'Breaking new ground', estimatedWords: 3500 },
 { title: 'Team & Culture', description: 'Creating the right corporate culture', estimatedWords: 3500 },
 { title: 'Implementation & Control', description: 'Putting strategy into practice', estimatedWords: 3500 }
 ],
 samplePrompt: 'A comprehensive guide for entrepreneurs who want to take their business to the next level'
 },

  // More Fiction Templates
 {
 id: 'sci-fi-adventure',
 name: 'Science Fiction',
 category: 'fiction',
 icon: '',
 description: 'Futuristic story with technology, space and innovation',
 genre: 'Science Fiction',
 targetAudience: 'Young Adults and Adults',
 style: 'Innovative and technological',
 bookType: 'text',
 chapters: 22,
 estimatedWords: 85000,
 tags: ['Future', 'Technology', 'Space', 'AI'],
 chapterOutline: [
 { title: 'The Future Begins', description: 'Introduction to the futuristic world', estimatedWords: 4000 },
 { title: 'Technological Discovery', description: 'A groundbreaking invention', estimatedWords: 4000 },
 { title: 'Journey to the Stars', description: 'Departure into the unknown', estimatedWords: 4000 },
 { title: 'Alien Encounter', description: 'First contact with alien species', estimatedWords: 4000 },
 { title: 'The Time Paradox', description: 'Complex scientific dilemmas', estimatedWords: 4000 }
 ],
 samplePrompt: 'In a distant future, a scientist discovers a technology that will change the universe forever'
 },
 {
 id: 'horror-gothic',
 name: 'Horror & Gothic',
 category: 'fiction',
 icon: '',
 description: 'Dark story with suspense, horror and supernatural elements',
 genre: 'Horror',
 targetAudience: 'Adults',
 style: 'Dark and atmospheric',
 bookType: 'text',
 chapters: 20,
 estimatedWords: 70000,
 tags: ['Horror', 'Supernatural', 'Scary', 'Dark'],
 chapterOutline: [
 { title: 'The Old House', description: 'Arrival at an eerie place', estimatedWords: 3500 },
 { title: 'First Signs', description: 'Inexplicable events multiply', estimatedWords: 3500 },
 { title: 'The Dark History', description: 'Horrifying past is revealed', estimatedWords: 3500 },
 { title: 'Nocturnal Terrors', description: 'The horror intensifies', estimatedWords: 3500 },
 { title: 'The True Monster', description: 'The source of evil reveals itself', estimatedWords: 3500 }
 ],
 samplePrompt: 'A family moves into an old mansion and discovers it is haunted by dark secrets'
 },
 {
 id: 'historical-fiction',
 name: 'Historical Fiction',
 category: 'fiction',
 icon: '',
 description: 'Captivating story in historical setting with authentic details',
 genre: 'Historical Fiction',
 targetAudience: 'Adults',
 style: 'Authentic and atmospheric',
 bookType: 'text',
 chapters: 24,
 estimatedWords: 90000,
 tags: ['History', 'Period', 'Authenticity', 'Drama'],
 chapterOutline: [
 { title: 'A Different Time', description: 'Introduction to the historical era', estimatedWords: 3800 },
 { title: 'Society and Class Differences', description: 'Social structures of the time', estimatedWords: 3800 },
 { title: 'Forbidden Encounters', description: 'Meetings across class boundaries', estimatedWords: 3800 },
 { title: 'Political Unrest', description: 'Historical events impact lives', estimatedWords: 3800 },
 { title: 'Fight for Survival', description: 'Challenges of the era', estimatedWords: 3800 }
 ],
 samplePrompt: 'In Victorian London, a young woman fights against social conventions for her happiness'
 },
 {
 id: 'comedy-humor',
 name: 'Comedy & Humor',
 category: 'fiction',
 icon: '',
 description: 'Light, humorous story that brings laughter',
 genre: 'Comedy',
 targetAudience: 'All Ages',
 style: 'Funny and entertaining',
 bookType: 'text',
 chapters: 15,
 estimatedWords: 50000,
 tags: ['Humor', 'Comedy', 'Entertainment', 'Light'],
 chapterOutline: [
 { title: 'A Chaotic Start', description: 'Everything begins with a mishap', estimatedWords: 3300 },
 { title: 'Mix-Ups', description: 'Funny situations arise', estimatedWords: 3300 },
 { title: 'The Perfect Plan (Or Not)', description: 'A plan goes spectacularly wrong', estimatedWords: 3300 },
 { title: 'Absurd Twists', description: 'The situation escalates hilariously', estimatedWords: 3300 },
 { title: 'Happy Chaos', description: 'A joyful, chaotic ending', estimatedWords: 3300 }
 ],
 samplePrompt: 'A series of hilarious mishaps leads to unexpected and funny situations'
 },

  // More Non-Fiction Templates
 {
 id: 'biography-memoir',
 name: 'Biography & Memoir',
 category: 'non-fiction',
 icon: '',
 description: 'Personal life story with inspiring experiences',
 genre: 'Biography',
 targetAudience: 'Adults',
 style: 'Personal and authentic',
 bookType: 'text',
 chapters: 20,
 estimatedWords: 75000,
 tags: ['Life', 'Experience', 'Inspiration', 'Personal'],
 chapterOutline: [
 { title: 'The Early Years', description: 'Childhood and formative experiences', estimatedWords: 3800 },
 { title: 'Turning Points', description: 'Decisive moments in life', estimatedWords: 3800 },
 { title: 'Overcoming Challenges', description: 'Getting through difficult times', estimatedWords: 3800 },
 { title: 'Successes and Setbacks', description: 'Life\'s highs and lows', estimatedWords: 3800 },
 { title: 'Wisdom and Reflection', description: 'Lessons learned', estimatedWords: 3800 }
 ],
 samplePrompt: 'The inspiring life story of a person who has overcome great challenges'
 },
 {
 id: 'travel-guide',
 name: 'Travel Guide',
 category: 'non-fiction',
 icon: '',
 description: 'Comprehensive guide for unforgettable travel experiences',
 genre: 'Travel',
 targetAudience: 'Travel Enthusiasts',
 style: 'Informative and inspiring',
 bookType: 'picture',
 chapters: 15,
 estimatedWords: 40000,
 tags: ['Travel', 'Culture', 'Adventure', 'Tips'],
 chapterOutline: [
 { title: 'Travel Preparation', description: 'Planning and packing list', estimatedWords: 2500 },
 { title: 'Best Attractions', description: 'Must-see places', estimatedWords: 3000 },
 { title: 'Culinary Highlights', description: 'Discovering local cuisine', estimatedWords: 2500 },
 { title: 'Insider Tips', description: 'Hidden gems off the beaten path', estimatedWords: 3000 },
 { title: 'Practical Information', description: 'Transport, accommodation, budget', estimatedWords: 2500 }
 ],
 samplePrompt: 'The ultimate travel guide with insider tips and hidden gems for adventurers'
 },
 {
 id: 'fitness-health',
 name: 'Fitness & Health',
 category: 'non-fiction',
 icon: '',
 description: 'Complete guide for physical fitness and well-being',
 genre: 'Fitness',
 targetAudience: 'Health-Conscious',
 style: 'Motivating and practical',
 bookType: 'picture',
 chapters: 16,
 estimatedWords: 45000,
 tags: ['Fitness', 'Health', 'Training', 'Nutrition'],
 chapterOutline: [
 { title: 'Fitness Basics', description: 'Understanding how the body works', estimatedWords: 2800 },
 { title: 'Creating a Training Plan', description: 'Individual workout program', estimatedWords: 3000 },
 { title: 'Optimizing Nutrition', description: 'Healthy eating habits', estimatedWords: 3000 },
 { title: 'Motivation & Mindset', description: 'Staying mentally strong', estimatedWords: 2800 },
 { title: 'Recovery', description: 'Rest and injury prevention', estimatedWords: 2500 }
 ],
 samplePrompt: 'A comprehensive fitness guide that combines training, nutrition and mindset'
 },
 {
 id: 'finance-investment',
 name: 'Finance & Investment',
 category: 'non-fiction',
 icon: '',
 description: 'Practical guide for financial freedom and wealth building',
 genre: 'Finance',
 targetAudience: 'Adults',
 style: 'Factual and understandable',
 bookType: 'text',
 chapters: 18,
 estimatedWords: 55000,
 tags: ['Money', 'Investment', 'Wealth', 'Finance'],
 chapterOutline: [
 { title: 'Financial Basics', description: 'Basic knowledge about money', estimatedWords: 3000 },
 { title: 'Budget & Savings', description: 'Controlling expenses and saving', estimatedWords: 3000 },
 { title: 'Investment Strategies', description: 'Different types of investments', estimatedWords: 3200 },
 { title: 'Risk Management', description: 'Investing safely', estimatedWords: 3000 },
 { title: 'Passive Income', description: 'Making money work for you', estimatedWords: 3200 }
 ],
 samplePrompt: 'An understandable guide that shows how to become financially independent'
 },
 {
 id: 'tech-guide',
 name: 'Technology Guide',
 category: 'non-fiction',
 icon: '',
 description: 'Introduction to modern technologies clearly explained',
 genre: 'Technology',
 targetAudience: 'Tech Enthusiasts',
 style: 'Technical but accessible',
 bookType: 'text',
 chapters: 20,
 estimatedWords: 50000,
 tags: ['Technology', 'Digital', 'Innovation', 'Learning'],
 chapterOutline: [
 { title: 'Tech Basics', description: 'Understanding basic concepts', estimatedWords: 2500 },
 { title: 'Artificial Intelligence', description: 'AI and Machine Learning', estimatedWords: 2500 },
 { title: 'Blockchain & Crypto', description: 'Decentralized technologies', estimatedWords: 2500 },
 { title: 'Cloud Computing', description: 'The future of IT', estimatedWords: 2500 },
 { title: 'Cybersecurity', description: 'Staying safe in the digital age', estimatedWords: 2500 }
 ],
 samplePrompt: 'An understandable guide through the world of modern technologies for beginners'
 },

  // More Children's Books
 {
 id: 'fairy-tale',
 name: 'Fairy Tales & Fables',
 category: 'children',
 icon: '',
 description: 'Classic fairy tale with magical elements and moral lessons',
 genre: 'Fairy Tale',
 targetAudience: 'Children ages 4-8',
 style: 'Magical and educational',
 bookType: 'picture',
 chapters: 10,
 estimatedWords: 4000,
 tags: ['Magic', 'Moral', 'Fantasy', 'Classic'],
 chapterOutline: [
 { title: 'Once Upon a Time...', description: 'The fairy tale beginning', estimatedWords: 400 },
 { title: 'The Magical Transformation', description: 'Something wonderful happens', estimatedWords: 400 },
 { title: 'The Difficult Task', description: 'A challenge awaits', estimatedWords: 400 },
 { title: 'Help from Unexpected Places', description: 'Magical helpers appear', estimatedWords: 400 },
 { title: 'The Happy Ending', description: 'Everything turns out well', estimatedWords: 400 }
 ],
 samplePrompt: 'A timeless fairy tale about courage, friendship and the power of kindness'
 },
 {
 id: 'abc-learning',
 name: 'ABC Learning Book',
 category: 'children',
 icon: '',
 description: 'Learn the alphabet playfully with colorful pictures',
 genre: 'Learning Book',
 targetAudience: 'Children ages 3-6',
 style: 'Educational and colorful',
 bookType: 'picture',
 chapters: 26,
 estimatedWords: 2600,
 tags: ['Alphabet', 'Learning', 'Education', 'Basics'],
 chapterOutline: [
 { title: 'A is for Apple', description: 'The letter A with examples', estimatedWords: 100 },
 { title: 'B is for Ball', description: 'The letter B with examples', estimatedWords: 100 },
 { title: 'C is for Computer', description: 'The letter C with examples', estimatedWords: 100 },
 { title: 'D is for Dinosaur', description: 'The letter D with examples', estimatedWords: 100 },
 { title: 'E is for Elephant', description: 'The letter E with examples', estimatedWords: 100 }
 ],
 samplePrompt: 'A colorful ABC book that helps children learn letters playfully'
 },
 {
 id: 'animal-stories',
 name: 'Animal Stories',
 category: 'children',
 icon: '',
 description: 'Exciting stories from the animal world with lessons',
 genre: 'Animal Book',
 targetAudience: 'Children ages 5-9',
 style: 'Entertaining and educational',
 bookType: 'picture',
 chapters: 12,
 estimatedWords: 6000,
 tags: ['Animals', 'Nature', 'Friendship', 'Adventure'],
 chapterOutline: [
 { title: 'The Brave Little Lion', description: 'A lion cub learns courage', estimatedWords: 500 },
 { title: 'The Wise Owl', description: 'Wisdom and knowledge', estimatedWords: 500 },
 { title: 'The Fast Cheetah', description: 'Speed isn\'t everything', estimatedWords: 500 },
 { title: 'The Patient Turtle', description: 'Patience is rewarded', estimatedWords: 500 },
 { title: 'The Social Elephant', description: 'Unity in the herd', estimatedWords: 500 }
 ],
 samplePrompt: 'Heartwarming animal stories that teach children important values'
 },

  // More Educational Templates
 {
 id: 'history-students',
 name: 'History for Students',
 category: 'educational',
 icon: '',
 description: 'Important historical periods presented in an engaging way',
 genre: 'History',
 targetAudience: 'Students ages 12-16',
 style: 'Engaging and informative',
 bookType: 'text',
 chapters: 16,
 estimatedWords: 35000,
 tags: ['History', 'Education', 'Periods', 'Learning'],
 chapterOutline: [
 { title: 'Ancient Times', description: 'Greeks and Romans', estimatedWords: 2200 },
 { title: 'The Middle Ages', description: 'Knights and castles', estimatedWords: 2200 },
 { title: 'Renaissance', description: 'Rebirth of the arts', estimatedWords: 2200 },
 { title: 'Industrial Revolution', description: 'Technical progress', estimatedWords: 2200 },
 { title: 'Modern History', description: '20th century', estimatedWords: 2200 }
 ],
 samplePrompt: 'An engaging history book that brings historical periods to life'
 },
 {
 id: 'math-easy',
 name: 'Math Made Easy',
 category: 'educational',
 icon: '',
 description: 'Mathematics clearly explained with practical examples',
 genre: 'Mathematics',
 targetAudience: 'Students ages 10-14',
 style: 'Clear and understandable',
 bookType: 'text',
 chapters: 18,
 estimatedWords: 30000,
 tags: ['Mathematics', 'Learning', 'Exercises', 'Understanding'],
 chapterOutline: [
 { title: 'Basic Arithmetic', description: 'The foundation of mathematics', estimatedWords: 1700 },
 { title: 'Fractions and Decimals', description: 'Parts and decimal numbers', estimatedWords: 1700 },
 { title: 'Percentages', description: 'Working with percentages', estimatedWords: 1700 },
 { title: 'Geometry Basics', description: 'Shapes and areas', estimatedWords: 1700 },
 { title: 'Introduction to Algebra', description: 'Working with variables', estimatedWords: 1700 }
 ],
 samplePrompt: 'A math book that explains complex concepts simply and clearly'
 },
 {
 id: 'programming-beginners',
 name: 'Programming for Beginners',
 category: 'educational',
 icon: '',
 description: 'First steps in the world of programming',
 genre: 'Computer Science',
 targetAudience: 'Teens and Adults',
 style: 'Practical and comprehensible',
 bookType: 'text',
 chapters: 20,
 estimatedWords: 45000,
 tags: ['Programming', 'Code', 'IT', 'Learning'],
 chapterOutline: [
 { title: 'What is Programming?', description: 'Understanding basic concepts', estimatedWords: 2250 },
 { title: 'First Steps', description: 'Setting up development environment', estimatedWords: 2250 },
 { title: 'Variables and Data Types', description: 'Storing and processing data', estimatedWords: 2250 },
 { title: 'Control Structures', description: 'If/Else and loops', estimatedWords: 2250 },
 { title: 'Functions', description: 'Reusing code', estimatedWords: 2250 }
 ],
 samplePrompt: 'A beginner-friendly programming course that teaches the basics step by step'
 }
]

// Helper functions
export function getTemplateById(id: string): BookTemplate | undefined {
 return bookTemplates.find(template => template.id === id)
}

export function getTemplatesByCategory(category: BookTemplate['category']): BookTemplate[] {
 return bookTemplates.filter(template => template.category === category)
}

export function searchTemplates(query: string): BookTemplate[] {
 const lowerQuery = query.toLowerCase()
 return bookTemplates.filter(template =>
 template.name.toLowerCase().includes(lowerQuery) ||
 template.description.toLowerCase().includes(lowerQuery) ||
 template.genre.toLowerCase().includes(lowerQuery) ||
 template.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
 )
}
