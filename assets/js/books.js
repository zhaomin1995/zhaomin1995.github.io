/*
 * books.js — Book data for the reading page (reading.html)
 *
 * Each book: { title, author, desc, cat, color, height, pdf }
 *   cat   — must match a BOOK_CATEGORIES id
 *   color — hex color for the book spine
 *   height — spine height in px (110-160)
 *   pdf   — URL to the free/open-access source
 *
 * Sources: Project Gutenberg (gutenberg.org), MIT Classics, Standard Ebooks,
 *          authors' websites, and open textbook initiatives.
 */

const BOOK_CATEGORIES = [
  { id: 'all', en: 'All Books', zh: '全部书籍', icon: 'fas fa-book' },
  { id: 'ai-ml', en: 'AI & Machine Learning', zh: 'AI与机器学习', icon: 'fas fa-brain' },
  { id: 'nlp', en: 'NLP & Language', zh: '自然语言处理', icon: 'fas fa-language' },
  { id: 'algorithms', en: 'Algorithms & Data', zh: '算法与数据', icon: 'fas fa-project-diagram' },
  { id: 'math', en: 'Mathematics', zh: '数学', icon: 'fas fa-square-root-alt' },
  { id: 'programming', en: 'Programming', zh: '编程', icon: 'fas fa-code' },
  { id: 'physics', en: 'Physics & Cosmology', zh: '物理与宇宙', icon: 'fas fa-atom' },
  { id: 'biology', en: 'Biology & Nature', zh: '生物与自然', icon: 'fas fa-dna' },
  { id: 'philosophy', en: 'Philosophy', zh: '哲学', icon: 'fas fa-yin-yang' },
  { id: 'politics', en: 'Politics & Economics', zh: '政治与经济', icon: 'fas fa-balance-scale' },
  { id: 'history', en: 'History', zh: '历史', icon: 'fas fa-landmark' },
  { id: 'psychology', en: 'Psychology', zh: '心理学', icon: 'fas fa-head-side-virus' },
  { id: 'classic-fiction', en: 'Classic Fiction', zh: '经典小说', icon: 'fas fa-feather-alt' },
  { id: 'sci-fi', en: 'Science Fiction', zh: '科幻小说', icon: 'fas fa-rocket' },
  { id: 'mystery', en: 'Mystery & Gothic', zh: '悬疑与哥特', icon: 'fas fa-mask' },
  { id: 'adventure', en: 'Adventure', zh: '冒险', icon: 'fas fa-hiking' },
  { id: 'russian-lit', en: 'Russian Literature', zh: '俄罗斯文学', icon: 'fas fa-snowflake' },
  { id: 'french-lit', en: 'French Literature', zh: '法国文学', icon: 'fas fa-wine-glass-alt' },
  { id: 'poetry', en: 'Poetry & Drama', zh: '诗歌与戏剧', icon: 'fas fa-theater-masks' },
  { id: 'religion', en: 'Religion & Spirituality', zh: '宗教与灵性', icon: 'fas fa-praying-hands' },
  { id: 'children', en: 'Children & Fantasy', zh: '童话与幻想', icon: 'fas fa-hat-wizard' },
];

const BOOKS = [
// ══════════════════════════════════════
// AI & MACHINE LEARNING
// ══════════════════════════════════════
{ title: 'Deep Learning', author: 'Goodfellow, Bengio, Courville', desc: 'The definitive textbook on deep neural networks — CNNs, RNNs, optimization, regularization, and generative models.', cat: 'ai-ml', color: '#2c3e50', height: 150, pdf: 'https://www.deeplearningbook.org/' },
{ title: 'Pattern Recognition & ML', author: 'Christopher Bishop', desc: 'Probability distributions, neural networks, kernel methods, and graphical models. Free from Microsoft Research.', cat: 'ai-ml', color: '#e74c3c', height: 140, pdf: 'https://www.microsoft.com/en-us/research/publication/pattern-recognition-machine-learning/' },
{ title: 'Elements of Statistical Learning', author: 'Hastie, Tibshirani, Friedman', desc: 'Supervised and unsupervised learning, model assessment, ensemble methods. Free from the authors at Stanford.', cat: 'ai-ml', color: '#1a5276', height: 138, pdf: 'https://hastie.su.domains/ElemStatLearn/' },
{ title: 'Reinforcement Learning', author: 'Sutton & Barto', desc: 'The standard RL textbook — MDPs, temporal-difference learning, policy gradients, and function approximation.', cat: 'ai-ml', color: '#6c3483', height: 148, pdf: 'http://incompleteideas.net/book/the-book-2nd.html' },
{ title: 'Neural Networks & Deep Learning', author: 'Michael Nielsen', desc: 'An intuitive, visual introduction to neural networks. Beautifully written free online book.', cat: 'ai-ml', color: '#117864', height: 128, pdf: 'http://neuralnetworksanddeeplearning.com/' },
{ title: 'Information Theory & Learning', author: 'David MacKay', desc: 'Connecting information theory, inference, and machine learning with clarity and rigor.', cat: 'ai-ml', color: '#2e4053', height: 152, pdf: 'https://www.inference.org.uk/itila/book.html' },
{ title: 'Bayesian Reasoning & ML', author: 'David Barber', desc: 'Probabilistic graphical models, inference, and learning from a Bayesian perspective.', cat: 'ai-ml', color: '#7d3c98', height: 145, pdf: 'http://web4.cs.ucl.ac.uk/staff/D.Barber/pmwiki/pmwiki.php?n=Brml.HomePage' },
{ title: 'Math for Machine Learning', author: 'Deisenroth, Faisal, Ong', desc: 'Linear algebra, calculus, probability, and optimization — the mathematical foundations of ML.', cat: 'ai-ml', color: '#1f618d', height: 142, pdf: 'https://mml-book.github.io/' },

// ══════════════════════════════════════
// NLP & LANGUAGE
// ══════════════════════════════════════
{ title: 'Speech & Language Processing', author: 'Jurafsky & Martin', desc: 'The standard NLP textbook — tokenization, transformers, NER, QA, and dialogue systems. Free draft chapters.', cat: 'nlp', color: '#16a085', height: 145, pdf: 'https://web.stanford.edu/~jurafsky/slp3/' },
{ title: 'NLP with Python (NLTK)', author: 'Bird, Klein, Loper', desc: 'Practical NLP with Python and the NLTK toolkit — text classification, parsing, and semantic analysis.', cat: 'nlp', color: '#1e8449', height: 138, pdf: 'https://www.nltk.org/book/' },

// ══════════════════════════════════════
// ALGORITHMS & DATA
// ══════════════════════════════════════
{ title: 'Mining Massive Datasets', author: 'Leskovec, Rajaraman, Ullman', desc: 'MapReduce, similarity search, link analysis, recommendation systems. Free from the authors at Stanford.', cat: 'algorithms', color: '#d35400', height: 135, pdf: 'http://www.mmds.org/' },
{ title: 'Algorithms', author: 'Jeff Erickson', desc: 'A comprehensive algorithms textbook covering recursion, dynamic programming, graphs, and NP-hardness. Free.', cat: 'algorithms', color: '#2874a6', height: 148, pdf: 'http://jeffe.cs.illinois.edu/teaching/algorithms/' },
{ title: 'Open Data Structures', author: 'Pat Morin', desc: 'An open textbook on data structures — arrays, lists, trees, hash tables, and graphs with implementations.', cat: 'algorithms', color: '#6c3483', height: 132, pdf: 'https://opendatastructures.org/' },

// ══════════════════════════════════════
// MATHEMATICS
// ══════════════════════════════════════
{ title: 'Calculus Made Easy', author: 'Silvanus Thompson', desc: 'The classic intuitive introduction to calculus. "What one fool can do, another can." Public domain.', cat: 'math', color: '#b7950b', height: 125, pdf: 'https://www.gutenberg.org/ebooks/33283' },
{ title: 'Linear Algebra Done Right', author: 'Sheldon Axler', desc: 'A proof-based approach to linear algebra focusing on vector spaces and linear maps. Free from Springer.', cat: 'math', color: '#1a5276', height: 135, pdf: 'https://linear.axler.net/' },
{ title: 'Book of Proof', author: 'Richard Hammack', desc: 'An introduction to mathematical proof techniques — logic, sets, functions, relations, and cardinality.', cat: 'math', color: '#7d6608', height: 130, pdf: 'https://www.people.vcu.edu/~rhammack/BookOfProof/' },
{ title: 'Abstract Algebra', author: 'Thomas Judson', desc: 'Groups, rings, fields, and Galois theory. A free, open-source textbook.', cat: 'math', color: '#5b2c6f', height: 140, pdf: 'http://abstract.ups.edu/' },
{ title: 'Probability & Statistics', author: 'DeGroot & Schervish', desc: 'Probability theory, Bayesian inference, and classical statistics.', cat: 'math', color: '#1e8449', height: 142, pdf: 'https://www.statlect.com/' },

// ══════════════════════════════════════
// PROGRAMMING
// ══════════════════════════════════════
{ title: 'Think Python', author: 'Allen Downey', desc: 'Learn Python by thinking like a computer scientist. Clear, concise, and free.', cat: 'programming', color: '#2980b9', height: 130, pdf: 'https://greenteapress.com/wp/think-python-2e/' },
{ title: 'Think Stats', author: 'Allen Downey', desc: 'Probability and statistics for programmers — exploratory data analysis using Python.', cat: 'programming', color: '#27ae60', height: 128, pdf: 'https://greenteapress.com/wp/think-stats-2e/' },
{ title: 'Think Bayes', author: 'Allen Downey', desc: 'Bayesian statistics made simple — practical Bayesian thinking with Python code.', cat: 'programming', color: '#8e44ad', height: 126, pdf: 'https://greenteapress.com/wp/think-bayes/' },
{ title: 'Automate the Boring Stuff', author: 'Al Sweigart', desc: 'Practical Python programming for total beginners — files, web scraping, spreadsheets, and automation.', cat: 'programming', color: '#f39c12', height: 135, pdf: 'https://automatetheboringstuff.com/' },
{ title: 'Pro Git', author: 'Scott Chacon', desc: 'Everything about Git — branching, merging, rebasing, workflows. The official free Git book.', cat: 'programming', color: '#e74c3c', height: 132, pdf: 'https://git-scm.com/book/en/v2' },
{ title: 'The Linux Command Line', author: 'William Shotts', desc: 'A complete introduction to Linux command line — shell scripting, file management, and system administration.', cat: 'programming', color: '#2c3e50', height: 140, pdf: 'https://linuxcommand.org/tlcl.php' },
{ title: 'Structure & Interpretation', author: 'Abelson & Sussman', desc: 'The legendary MIT textbook on programming and computer science using Scheme. SICP.', cat: 'programming', color: '#8b0000', height: 145, pdf: 'https://mitp-content-server.mit.edu/books/content/sectbyfn/books_pres_0/6515/sicp.zip/index.html' },
{ title: 'Eloquent JavaScript', author: 'Marijn Haverbeke', desc: 'A modern introduction to JavaScript — the language, the browser, and Node.js.', cat: 'programming', color: '#f1c40f', height: 138, pdf: 'https://eloquentjavascript.net/' },

// ══════════════════════════════════════
// PHYSICS & COSMOLOGY
// ══════════════════════════════════════
{ title: 'Relativity', author: 'Albert Einstein', desc: 'Einstein explains special and general relativity in his own words, for a general audience. Public domain.', cat: 'physics', color: '#1a1a2e', height: 120, pdf: 'https://www.gutenberg.org/ebooks/5001' },
{ title: 'The Feynman Lectures', author: 'Richard Feynman', desc: 'The legendary Caltech physics lectures — mechanics, electromagnetism, quantum mechanics. Free online.', cat: 'physics', color: '#c0392b', height: 150, pdf: 'https://www.feynmanlectures.caltech.edu/' },
{ title: 'Principia Mathematica', author: 'Isaac Newton', desc: 'The foundational work of classical mechanics — laws of motion and universal gravitation. Public domain.', cat: 'physics', color: '#5b2c6f', height: 155, pdf: 'https://www.gutenberg.org/ebooks/28233' },
{ title: 'Motion Mountain Physics', author: 'Christoph Schiller', desc: 'A free, entertaining physics textbook covering mechanics to quantum gravity in six volumes.', cat: 'physics', color: '#0c2461', height: 142, pdf: 'https://www.motionmountain.net/' },

// ══════════════════════════════════════
// BIOLOGY & NATURE
// ══════════════════════════════════════
{ title: 'On the Origin of Species', author: 'Charles Darwin', desc: 'The book that introduced evolution by natural selection and transformed biology forever. Public domain.', cat: 'biology', color: '#1e8449', height: 140, pdf: 'https://www.gutenberg.org/ebooks/1228' },
{ title: 'The Descent of Man', author: 'Charles Darwin', desc: 'Darwin applies evolutionary theory to human origins, sexual selection, and the expression of emotions.', cat: 'biology', color: '#196f3d', height: 145, pdf: 'https://www.gutenberg.org/ebooks/2300' },
{ title: 'The Voyage of the Beagle', author: 'Charles Darwin', desc: 'Darwin\'s journal of his five-year voyage — the observations that seeded evolutionary theory.', cat: 'biology', color: '#117a65', height: 138, pdf: 'https://www.gutenberg.org/ebooks/944' },
{ title: 'Walden', author: 'Henry David Thoreau', desc: 'Living deliberately in nature — Thoreau\'s experiment in simple living at Walden Pond. Public domain.', cat: 'biology', color: '#2d5a27', height: 125, pdf: 'https://www.gutenberg.org/ebooks/205' },

// ══════════════════════════════════════
// PHILOSOPHY
// ══════════════════════════════════════
{ title: 'Meditations', author: 'Marcus Aurelius', desc: 'A Roman emperor\'s private Stoic journal — timeless wisdom on resilience, duty, and inner peace.', cat: 'philosophy', color: '#795548', height: 118, pdf: 'http://classics.mit.edu/Antoninus/meditations.html' },
{ title: 'The Republic', author: 'Plato', desc: 'Justice, the ideal state, and the allegory of the cave. The foundation of Western political philosophy.', cat: 'philosophy', color: '#4a6fa5', height: 135, pdf: 'http://classics.mit.edu/Plato/republic.html' },
{ title: 'Nicomachean Ethics', author: 'Aristotle', desc: 'Aristotle\'s masterwork on ethics — virtue, happiness, friendship, and the good life.', cat: 'philosophy', color: '#6c5ce7', height: 132, pdf: 'http://classics.mit.edu/Aristotle/nicomachaen.html' },
{ title: 'Politics', author: 'Aristotle', desc: 'The nature of the state, citizenship, constitutions, and the best form of government.', cat: 'philosophy', color: '#4a6fa5', height: 138, pdf: 'http://classics.mit.edu/Aristotle/politics.html' },
{ title: 'Poetics', author: 'Aristotle', desc: 'The foundational text on literary theory — tragedy, epic poetry, and dramatic structure.', cat: 'philosophy', color: '#5d6d7e', height: 112, pdf: 'http://classics.mit.edu/Aristotle/poetics.html' },
{ title: 'Tao Te Ching', author: 'Laozi', desc: 'The Way and its power — ancient Chinese wisdom on simplicity, humility, and harmony with nature.', cat: 'philosophy', color: '#2d5a27', height: 112, pdf: 'https://www.gutenberg.org/ebooks/216' },
{ title: 'The Art of War', author: 'Sun Tzu', desc: 'Strategy and the philosophy of conflict — essential reading for leaders since 500 BC.', cat: 'philosophy', color: '#c0392b', height: 115, pdf: 'http://classics.mit.edu/Tzu/artwar.html' },
{ title: 'The Analects', author: 'Confucius', desc: 'Sayings and ideas of Confucius on ethics, governance, and education. Foundation of East Asian thought.', cat: 'philosophy', color: '#b7950b', height: 120, pdf: 'http://classics.mit.edu/Confucius/analects.html' },
{ title: 'Beyond Good and Evil', author: 'Nietzsche', desc: 'A critique of traditional morality and the pursuit of truth beyond conventional values.', cat: 'philosophy', color: '#2c2c54', height: 128, pdf: 'https://www.gutenberg.org/ebooks/4363' },
{ title: 'Thus Spoke Zarathustra', author: 'Nietzsche', desc: 'The Übermensch, eternal recurrence, and the death of God — Nietzsche\'s philosophical novel.', cat: 'philosophy', color: '#1a1a2e', height: 140, pdf: 'https://www.gutenberg.org/ebooks/1998' },
{ title: 'The Prince', author: 'Niccolò Machiavelli', desc: 'The art of acquiring and maintaining political power. Ruthlessly practical political philosophy.', cat: 'philosophy', color: '#6b3f20', height: 118, pdf: 'https://www.gutenberg.org/ebooks/1232' },
{ title: 'Discourse on Method', author: 'René Descartes', desc: '"I think, therefore I am." Descartes\' foundation of modern philosophy and rationalist inquiry.', cat: 'philosophy', color: '#1a5276', height: 115, pdf: 'https://www.gutenberg.org/ebooks/59' },
{ title: 'Leviathan', author: 'Thomas Hobbes', desc: 'The social contract and the necessity of a strong sovereign to prevent life being "nasty, brutish, and short."', cat: 'philosophy', color: '#2e4053', height: 150, pdf: 'https://www.gutenberg.org/ebooks/3207' },
{ title: 'On Liberty', author: 'John Stuart Mill', desc: 'The classic defense of individual freedom — the harm principle and the tyranny of the majority.', cat: 'philosophy', color: '#1e8449', height: 122, pdf: 'https://www.gutenberg.org/ebooks/34901' },
{ title: 'Utilitarianism', author: 'John Stuart Mill', desc: 'The greatest happiness for the greatest number — Mill\'s refined defense of utilitarian ethics.', cat: 'philosophy', color: '#117864', height: 112, pdf: 'https://www.gutenberg.org/ebooks/11224' },

// ══════════════════════════════════════
// POLITICS & ECONOMICS
// ══════════════════════════════════════
{ title: 'The Wealth of Nations', author: 'Adam Smith', desc: 'The invisible hand, division of labor, and free markets. The foundational text of modern economics.', cat: 'politics', color: '#8B4513', height: 155, pdf: 'https://www.gutenberg.org/ebooks/3300' },
{ title: 'Common Sense', author: 'Thomas Paine', desc: 'The pamphlet that ignited the American Revolution — a fiery case for independence from Britain.', cat: 'politics', color: '#c0392b', height: 112, pdf: 'https://www.gutenberg.org/ebooks/147' },
{ title: 'Two Treatises of Government', author: 'John Locke', desc: 'Natural rights, consent of the governed, and the right to revolution. The philosophical basis of democracy.', cat: 'politics', color: '#2c3e50', height: 135, pdf: 'https://www.gutenberg.org/ebooks/7370' },
{ title: 'The Social Contract', author: 'Jean-Jacques Rousseau', desc: '"Man is born free, and everywhere he is in chains." The foundation of republican political theory.', cat: 'politics', color: '#1a5276', height: 122, pdf: 'https://www.gutenberg.org/ebooks/46333' },
{ title: 'The Communist Manifesto', author: 'Marx & Engels', desc: 'Class struggle, the critique of capitalism, and the call for workers to unite. Public domain.', cat: 'politics', color: '#922b21', height: 110, pdf: 'https://www.gutenberg.org/ebooks/61' },
{ title: 'Democracy in America', author: 'Alexis de Tocqueville', desc: 'A French observer\'s brilliant analysis of American democracy, society, and culture in the 1830s.', cat: 'politics', color: '#2874a6', height: 148, pdf: 'https://www.gutenberg.org/ebooks/815' },
{ title: 'The Federalist Papers', author: 'Hamilton, Madison, Jay', desc: 'The arguments for ratifying the US Constitution — the blueprint of American governance.', cat: 'politics', color: '#1e8449', height: 145, pdf: 'https://www.gutenberg.org/ebooks/1404' },

// ══════════════════════════════════════
// HISTORY
// ══════════════════════════════════════
{ title: 'History of the Peloponnesian War', author: 'Thucydides', desc: 'The first work of political realism — Athens vs. Sparta told with analytical rigor.', cat: 'history', color: '#5d6d7e', height: 148, pdf: 'http://classics.mit.edu/Thucydides/pelopwar.html' },
{ title: 'The Histories', author: 'Herodotus', desc: 'The "Father of History" chronicles the Greco-Persian Wars with vivid storytelling.', cat: 'history', color: '#b7950b', height: 145, pdf: 'http://classics.mit.edu/Herodotus/history.html' },
{ title: 'The Gallic Wars', author: 'Julius Caesar', desc: 'Caesar\'s own account of conquering Gaul — military strategy and political propaganda combined.', cat: 'history', color: '#7b241c', height: 132, pdf: 'http://classics.mit.edu/Caesar/gallic.html' },
{ title: 'Decline and Fall of the Roman Empire', author: 'Edward Gibbon', desc: 'The monumental history of Rome\'s collapse — from the height of empire to the fall of Constantinople.', cat: 'history', color: '#6b3f20', height: 155, pdf: 'https://www.gutenberg.org/ebooks/25717' },
{ title: 'The Autobiography of Benjamin Franklin', author: 'Benjamin Franklin', desc: 'From printer\'s apprentice to founding father — Franklin\'s witty and instructive memoir.', cat: 'history', color: '#1e8449', height: 128, pdf: 'https://www.gutenberg.org/ebooks/20203' },
{ title: 'Narrative of Frederick Douglass', author: 'Frederick Douglass', desc: 'A powerful firsthand account of slavery in America — one of the most important American autobiographies.', cat: 'history', color: '#2c3e50', height: 122, pdf: 'https://www.gutenberg.org/ebooks/23' },

// ══════════════════════════════════════
// PSYCHOLOGY
// ══════════════════════════════════════
{ title: 'The Interpretation of Dreams', author: 'Sigmund Freud', desc: 'Freud\'s groundbreaking work on dream analysis, the unconscious mind, and the foundations of psychoanalysis.', cat: 'psychology', color: '#6c5ce7', height: 142, pdf: 'https://www.gutenberg.org/ebooks/38219' },
{ title: 'Psychology: OpenStax', author: 'OpenStax', desc: 'A comprehensive, peer-reviewed introductory psychology textbook. Completely free.', cat: 'psychology', color: '#2980b9', height: 148, pdf: 'https://openstax.org/details/books/psychology-2e' },

// ══════════════════════════════════════
// CLASSIC FICTION
// ══════════════════════════════════════
{ title: 'Pride and Prejudice', author: 'Jane Austen', desc: 'Elizabeth Bennet and Mr. Darcy navigate class, manners, and misunderstanding in Regency England.', cat: 'classic-fiction', color: '#d4a574', height: 130, pdf: 'https://www.gutenberg.org/ebooks/1342' },
{ title: 'Sense and Sensibility', author: 'Jane Austen', desc: 'Two sisters — one guided by sense, the other by sensibility — navigate love and loss.', cat: 'classic-fiction', color: '#d4a574', height: 128, pdf: 'https://www.gutenberg.org/ebooks/161' },
{ title: 'Emma', author: 'Jane Austen', desc: 'A comedy of matchmaking gone wrong in the English countryside.', cat: 'classic-fiction', color: '#d4a574', height: 132, pdf: 'https://www.gutenberg.org/ebooks/158' },
{ title: 'Jane Eyre', author: 'Charlotte Brontë', desc: 'An orphan governess finds love and independence in Victorian England. A feminist classic.', cat: 'classic-fiction', color: '#5b2c6f', height: 140, pdf: 'https://www.gutenberg.org/ebooks/1260' },
{ title: 'Wuthering Heights', author: 'Emily Brontë', desc: 'The wild, passionate, and destructive love of Heathcliff and Catherine on the Yorkshire moors.', cat: 'classic-fiction', color: '#4a235a', height: 135, pdf: 'https://www.gutenberg.org/ebooks/768' },
{ title: 'Great Expectations', author: 'Charles Dickens', desc: 'Pip\'s journey from humble origins to gentleman — a masterwork on class, ambition, and identity.', cat: 'classic-fiction', color: '#6b3f20', height: 142, pdf: 'https://www.gutenberg.org/ebooks/1400' },
{ title: 'A Tale of Two Cities', author: 'Charles Dickens', desc: '"It was the best of times, it was the worst of times." Love and sacrifice during the French Revolution.', cat: 'classic-fiction', color: '#7b241c', height: 138, pdf: 'https://www.gutenberg.org/ebooks/98' },
{ title: 'Oliver Twist', author: 'Charles Dickens', desc: 'An orphan in Victorian London navigates the criminal underworld — "Please, sir, I want some more."', cat: 'classic-fiction', color: '#5d6d7e', height: 135, pdf: 'https://www.gutenberg.org/ebooks/730' },
{ title: 'David Copperfield', author: 'Charles Dickens', desc: 'Dickens\' most autobiographical novel — a young man\'s journey from hardship to literary success.', cat: 'classic-fiction', color: '#6b3f20', height: 148, pdf: 'https://www.gutenberg.org/ebooks/766' },
{ title: 'Moby Dick', author: 'Herman Melville', desc: 'Captain Ahab\'s obsessive hunt for the white whale — an epic of ambition, nature, and fate.', cat: 'classic-fiction', color: '#1a5276', height: 150, pdf: 'https://www.gutenberg.org/ebooks/2701' },
{ title: 'The Picture of Dorian Gray', author: 'Oscar Wilde', desc: 'A portrait ages while its subject stays young — a gothic tale of beauty, corruption, and morality.', cat: 'classic-fiction', color: '#2c2c54', height: 128, pdf: 'https://www.gutenberg.org/ebooks/174' },
{ title: 'The Great Gatsby', author: 'F. Scott Fitzgerald', desc: 'The American Dream and its discontents in the Jazz Age — wealth, love, and disillusion on Long Island.', cat: 'classic-fiction', color: '#b7950b', height: 118, pdf: 'https://www.gutenberg.org/ebooks/64317' },
{ title: 'Heart of Darkness', author: 'Joseph Conrad', desc: 'A journey up the Congo River into the heart of colonialism and the darkness within humanity.', cat: 'classic-fiction', color: '#1c2833', height: 115, pdf: 'https://www.gutenberg.org/ebooks/219' },
{ title: 'Ulysses', author: 'James Joyce', desc: 'One day in Dublin, June 16, 1904 — a modernist epic that reimagined the novel.', cat: 'classic-fiction', color: '#2c3e50', height: 155, pdf: 'https://www.gutenberg.org/ebooks/4300' },
{ title: 'A Portrait of the Artist', author: 'James Joyce', desc: 'Stephen Dedalus grows up in Ireland, grappling with religion, nationality, and art.', cat: 'classic-fiction', color: '#1e8449', height: 130, pdf: 'https://www.gutenberg.org/ebooks/4217' },
{ title: 'Dubliners', author: 'James Joyce', desc: 'Fifteen short stories of paralysis and epiphany in early 20th-century Dublin.', cat: 'classic-fiction', color: '#5d6d7e', height: 120, pdf: 'https://www.gutenberg.org/ebooks/2814' },
{ title: 'The Metamorphosis', author: 'Franz Kafka', desc: 'Gregor Samsa wakes up as a giant insect — a haunting parable of alienation and family.', cat: 'classic-fiction', color: '#2c2c54', height: 112, pdf: 'https://www.gutenberg.org/ebooks/5200' },
{ title: 'The Trial', author: 'Franz Kafka', desc: 'Josef K. is arrested for an unspecified crime. A nightmarish exploration of bureaucratic absurdity.', cat: 'classic-fiction', color: '#1c2833', height: 130, pdf: 'https://www.gutenberg.org/ebooks/7849' },
{ title: 'Don Quixote', author: 'Miguel de Cervantes', desc: 'The delusional knight and his faithful squire Sancho Panza — the first modern novel.', cat: 'classic-fiction', color: '#b7950b', height: 155, pdf: 'https://www.gutenberg.org/ebooks/996' },
{ title: 'Faust', author: 'Johann Wolfgang von Goethe', desc: 'A scholar sells his soul to the devil in pursuit of knowledge and experience. German literature\'s masterpiece.', cat: 'classic-fiction', color: '#922b21', height: 140, pdf: 'https://www.gutenberg.org/ebooks/14591' },
{ title: 'Siddhartha', author: 'Hermann Hesse', desc: 'A young man\'s spiritual journey in ancient India — seeking enlightenment through experience.', cat: 'classic-fiction', color: '#e67e22', height: 118, pdf: 'https://www.gutenberg.org/ebooks/2500' },

// ══════════════════════════════════════
// SCIENCE FICTION
// ══════════════════════════════════════
{ title: 'The Time Machine', author: 'H.G. Wells', desc: 'A Victorian inventor travels to 802,701 AD and discovers humanity\'s dark evolutionary future.', cat: 'sci-fi', color: '#2e4053', height: 118, pdf: 'https://www.gutenberg.org/ebooks/35' },
{ title: 'The War of the Worlds', author: 'H.G. Wells', desc: 'Martians invade England with devastating heat rays — the original alien invasion story.', cat: 'sci-fi', color: '#922b21', height: 125, pdf: 'https://www.gutenberg.org/ebooks/36' },
{ title: 'The Invisible Man', author: 'H.G. Wells', desc: 'A scientist discovers invisibility but descends into madness and violence. A cautionary tale.', cat: 'sci-fi', color: '#5d6d7e', height: 120, pdf: 'https://www.gutenberg.org/ebooks/5230' },
{ title: 'The Island of Doctor Moreau', author: 'H.G. Wells', desc: 'A shipwrecked man finds an island of human-animal hybrids created by a mad scientist.', cat: 'sci-fi', color: '#1e8449', height: 118, pdf: 'https://www.gutenberg.org/ebooks/159' },
{ title: '20,000 Leagues Under the Sea', author: 'Jules Verne', desc: 'Captain Nemo\'s submarine voyage through the world\'s oceans in the amazing Nautilus.', cat: 'sci-fi', color: '#1a5276', height: 135, pdf: 'https://www.gutenberg.org/ebooks/164' },
{ title: 'Around the World in 80 Days', author: 'Jules Verne', desc: 'Phileas Fogg bets he can circumnavigate the globe in 80 days — adventure and suspense ensue.', cat: 'sci-fi', color: '#b7950b', height: 128, pdf: 'https://www.gutenberg.org/ebooks/103' },
{ title: 'Journey to the Center of the Earth', author: 'Jules Verne', desc: 'A professor and his nephew descend into an Icelandic volcano and find a subterranean world.', cat: 'sci-fi', color: '#6b3f20', height: 130, pdf: 'https://www.gutenberg.org/ebooks/18857' },

// ══════════════════════════════════════
// MYSTERY & GOTHIC
// ══════════════════════════════════════
{ title: 'Frankenstein', author: 'Mary Shelley', desc: 'A scientist creates life and recoils from his creation — the birth of science fiction and gothic horror.', cat: 'mystery', color: '#1c2833', height: 130, pdf: 'https://www.gutenberg.org/ebooks/84' },
{ title: 'Dracula', author: 'Bram Stoker', desc: 'The Transylvanian count comes to England — the definitive vampire novel, told through letters and diaries.', cat: 'mystery', color: '#922b21', height: 140, pdf: 'https://www.gutenberg.org/ebooks/345' },
{ title: 'Sherlock Holmes', author: 'Arthur Conan Doyle', desc: 'The adventures of the world\'s greatest detective and his companion Dr. Watson on Baker Street.', cat: 'mystery', color: '#2c3e50', height: 135, pdf: 'https://www.gutenberg.org/ebooks/1661' },
{ title: 'Dr. Jekyll and Mr. Hyde', author: 'Robert Louis Stevenson', desc: 'A respectable doctor and his murderous alter ego — the duality of human nature.', cat: 'mystery', color: '#4a235a', height: 112, pdf: 'https://www.gutenberg.org/ebooks/43' },
{ title: 'The Phantom of the Opera', author: 'Gaston Leroux', desc: 'A masked genius haunts the Paris Opera House, obsessed with a young soprano.', cat: 'mystery', color: '#1c2833', height: 128, pdf: 'https://www.gutenberg.org/ebooks/175' },
{ title: 'The Hound of the Baskervilles', author: 'Arthur Conan Doyle', desc: 'Holmes investigates a supernatural hound on the misty moors of Dartmoor.', cat: 'mystery', color: '#5d6d7e', height: 125, pdf: 'https://www.gutenberg.org/ebooks/2852' },
{ title: 'The Turn of the Screw', author: 'Henry James', desc: 'A governess sees ghosts — or does she? A masterpiece of psychological ambiguity.', cat: 'mystery', color: '#6c5ce7', height: 112, pdf: 'https://www.gutenberg.org/ebooks/209' },
{ title: 'Tales of Edgar Allan Poe', author: 'Edgar Allan Poe', desc: 'The Raven, The Tell-Tale Heart, The Fall of the House of Usher — master of the macabre.', cat: 'mystery', color: '#2c2c54', height: 132, pdf: 'https://www.gutenberg.org/ebooks/2147' },

// ══════════════════════════════════════
// ADVENTURE
// ══════════════════════════════════════
{ title: 'The Adventures of Tom Sawyer', author: 'Mark Twain', desc: 'A mischievous boy growing up along the Mississippi — treasure hunts, whitewashed fences, and first love.', cat: 'adventure', color: '#e67e22', height: 125, pdf: 'https://www.gutenberg.org/ebooks/74' },
{ title: 'Adventures of Huckleberry Finn', author: 'Mark Twain', desc: 'Huck and Jim raft down the Mississippi, confronting slavery, society, and conscience.', cat: 'adventure', color: '#d35400', height: 132, pdf: 'https://www.gutenberg.org/ebooks/76' },
{ title: 'Treasure Island', author: 'Robert Louis Stevenson', desc: 'Young Jim Hawkins, a treasure map, pirates, and the unforgettable Long John Silver.', cat: 'adventure', color: '#b7950b', height: 128, pdf: 'https://www.gutenberg.org/ebooks/120' },
{ title: 'The Call of the Wild', author: 'Jack London', desc: 'A domesticated dog is thrust into the Yukon wilderness and answers the primal call of nature.', cat: 'adventure', color: '#1e8449', height: 118, pdf: 'https://www.gutenberg.org/ebooks/215' },
{ title: 'White Fang', author: 'Jack London', desc: 'A wild wolf-dog is gradually domesticated — the reverse journey of The Call of the Wild.', cat: 'adventure', color: '#5d6d7e', height: 122, pdf: 'https://www.gutenberg.org/ebooks/910' },
{ title: 'The Count of Monte Cristo', author: 'Alexandre Dumas', desc: 'Wrongly imprisoned, Edmond Dantès escapes and enacts an elaborate revenge. The ultimate adventure.', cat: 'adventure', color: '#1a5276', height: 155, pdf: 'https://www.gutenberg.org/ebooks/1184' },
{ title: 'The Three Musketeers', author: 'Alexandre Dumas', desc: 'All for one and one for all! D\'Artagnan joins the legendary musketeers in swashbuckling 17th-century France.', cat: 'adventure', color: '#c0392b', height: 148, pdf: 'https://www.gutenberg.org/ebooks/1257' },
{ title: 'Robinson Crusoe', author: 'Daniel Defoe', desc: 'Shipwrecked on a desert island for 28 years — the original survival story.', cat: 'adventure', color: '#6b3f20', height: 135, pdf: 'https://www.gutenberg.org/ebooks/521' },
{ title: 'Gulliver\'s Travels', author: 'Jonathan Swift', desc: 'Lilliputians, giants, and talking horses — a savage satire of human nature disguised as adventure.', cat: 'adventure', color: '#2874a6', height: 130, pdf: 'https://www.gutenberg.org/ebooks/829' },
{ title: 'The Odyssey', author: 'Homer', desc: 'Odysseus\' epic ten-year journey home from Troy — monsters, magic, and the longing for home.', cat: 'adventure', color: '#b7950b', height: 140, pdf: 'https://www.gutenberg.org/ebooks/1727' },
{ title: 'The Iliad', author: 'Homer', desc: 'The wrath of Achilles and the siege of Troy — the foundational epic of Western literature.', cat: 'adventure', color: '#922b21', height: 145, pdf: 'https://www.gutenberg.org/ebooks/6130' },

// ══════════════════════════════════════
// RUSSIAN LITERATURE
// ══════════════════════════════════════
{ title: 'Crime and Punishment', author: 'Fyodor Dostoevsky', desc: 'A student murders a pawnbroker and descends into guilt and paranoia. A psychological masterpiece.', cat: 'russian-lit', color: '#2c2c54', height: 142, pdf: 'https://www.gutenberg.org/ebooks/2554' },
{ title: 'The Brothers Karamazov', author: 'Fyodor Dostoevsky', desc: 'Three brothers, a murdered father, and the deepest questions of faith, free will, and morality.', cat: 'russian-lit', color: '#1c2833', height: 155, pdf: 'https://www.gutenberg.org/ebooks/28054' },
{ title: 'Notes from Underground', author: 'Fyodor Dostoevsky', desc: 'The bitter confessions of an alienated man — a precursor to existentialism and modernism.', cat: 'russian-lit', color: '#5d6d7e', height: 115, pdf: 'https://www.gutenberg.org/ebooks/600' },
{ title: 'The Idiot', author: 'Fyodor Dostoevsky', desc: 'A truly good man in a corrupt society — Prince Myshkin\'s tragic attempt to live with pure compassion.', cat: 'russian-lit', color: '#6c5ce7', height: 148, pdf: 'https://www.gutenberg.org/ebooks/2638' },
{ title: 'War and Peace', author: 'Leo Tolstoy', desc: 'Five aristocratic families during the Napoleonic Wars. The greatest novel ever written, many say.', cat: 'russian-lit', color: '#7b241c', height: 160, pdf: 'https://www.gutenberg.org/ebooks/2600' },
{ title: 'Anna Karenina', author: 'Leo Tolstoy', desc: '"Happy families are all alike; every unhappy family is unhappy in its own way." Love, betrayal, and society.', cat: 'russian-lit', color: '#922b21', height: 155, pdf: 'https://www.gutenberg.org/ebooks/1399' },
{ title: 'Dead Souls', author: 'Nikolai Gogol', desc: 'Chichikov buys dead serfs to defraud the government — a satirical epic of Russian bureaucracy.', cat: 'russian-lit', color: '#5b2c6f', height: 140, pdf: 'https://www.gutenberg.org/ebooks/1081' },
{ title: 'Fathers and Sons', author: 'Ivan Turgenev', desc: 'Generational conflict between reformist fathers and nihilist sons in 1860s Russia.', cat: 'russian-lit', color: '#2e4053', height: 125, pdf: 'https://www.gutenberg.org/ebooks/30723' },

// ══════════════════════════════════════
// FRENCH LITERATURE
// ══════════════════════════════════════
{ title: 'Les Misérables', author: 'Victor Hugo', desc: 'Jean Valjean\'s redemption, Inspector Javert\'s pursuit, and revolution in 19th-century Paris.', cat: 'french-lit', color: '#7b241c', height: 160, pdf: 'https://www.gutenberg.org/ebooks/135' },
{ title: 'The Hunchback of Notre-Dame', author: 'Victor Hugo', desc: 'Quasimodo, Esmeralda, and the great cathedral — beauty, cruelty, and obsession in medieval Paris.', cat: 'french-lit', color: '#5d6d7e', height: 148, pdf: 'https://www.gutenberg.org/ebooks/2610' },
{ title: 'Madame Bovary', author: 'Gustave Flaubert', desc: 'A doctor\'s wife seeks passion beyond her provincial life — the novel that defined literary realism.', cat: 'french-lit', color: '#d4a574', height: 132, pdf: 'https://www.gutenberg.org/ebooks/2413' },
{ title: 'The Red and the Black', author: 'Stendhal', desc: 'Julien Sorel\'s ambitious rise through post-Napoleonic French society — politics, love, and hypocrisy.', cat: 'french-lit', color: '#922b21', height: 140, pdf: 'https://www.gutenberg.org/ebooks/44747' },
{ title: 'Germinal', author: 'Émile Zola', desc: 'A coal miners\' strike in northern France — a powerful naturalist depiction of poverty and class struggle.', cat: 'french-lit', color: '#1c2833', height: 138, pdf: 'https://www.gutenberg.org/ebooks/5711' },
{ title: 'Candide', author: 'Voltaire', desc: '"We must cultivate our garden." A devastating satire of optimism through a young man\'s misadventures.', cat: 'french-lit', color: '#b7950b', height: 115, pdf: 'https://www.gutenberg.org/ebooks/19942' },
{ title: 'The Phantom of the Opera', author: 'Gaston Leroux', desc: 'A masked genius haunts the Paris Opera — romance, mystery, and obsession beneath the chandelier.', cat: 'french-lit', color: '#2c2c54', height: 128, pdf: 'https://www.gutenberg.org/ebooks/175' },

// ══════════════════════════════════════
// POETRY & DRAMA
// ══════════════════════════════════════
{ title: 'Complete Works of Shakespeare', author: 'William Shakespeare', desc: 'Hamlet, Macbeth, Romeo and Juliet, King Lear, Othello, The Tempest — the entire canon.', cat: 'poetry', color: '#6b3f20', height: 160, pdf: 'https://www.gutenberg.org/ebooks/100' },
{ title: 'Leaves of Grass', author: 'Walt Whitman', desc: '"I contain multitudes." The great democratic epic of American poetry — celebrating the self and nature.', cat: 'poetry', color: '#1e8449', height: 140, pdf: 'https://www.gutenberg.org/ebooks/1322' },
{ title: 'The Divine Comedy', author: 'Dante Alighieri', desc: 'Inferno, Purgatorio, Paradiso — a soul\'s journey through the afterlife. The pinnacle of Italian literature.', cat: 'poetry', color: '#922b21', height: 148, pdf: 'https://www.gutenberg.org/ebooks/8800' },
{ title: 'Paradise Lost', author: 'John Milton', desc: 'The fall of Satan and the expulsion from Eden — the greatest epic poem in English.', cat: 'poetry', color: '#1c2833', height: 142, pdf: 'https://www.gutenberg.org/ebooks/26' },
{ title: 'The Importance of Being Earnest', author: 'Oscar Wilde', desc: 'A comedy of mistaken identity, double lives, and Victorian hypocrisy. Wilde\'s wittiest play.', cat: 'poetry', color: '#b7950b', height: 112, pdf: 'https://www.gutenberg.org/ebooks/844' },
{ title: 'The Raven and Other Poems', author: 'Edgar Allan Poe', desc: '"Nevermore." Poe\'s haunting poems of loss, death, and the supernatural.', cat: 'poetry', color: '#2c2c54', height: 115, pdf: 'https://www.gutenberg.org/ebooks/17192' },
{ title: 'Metamorphoses', author: 'Ovid', desc: '250 myths of transformation — from chaos to Caesar. The source of classical mythology.', cat: 'poetry', color: '#b7950b', height: 145, pdf: 'http://classics.mit.edu/Ovid/metam.html' },

// ══════════════════════════════════════
// RELIGION & SPIRITUALITY
// ══════════════════════════════════════
{ title: 'The Bhagavad Gita', author: 'Vyasa (tr. Edwin Arnold)', desc: 'Krishna counsels Arjuna on duty, action, and devotion — the heart of Hindu philosophy.', cat: 'religion', color: '#e67e22', height: 118, pdf: 'https://www.gutenberg.org/ebooks/2388' },
{ title: 'The King James Bible', author: 'Various', desc: 'The foundational English translation of the Bible — literature, history, and faith in one volume.', cat: 'religion', color: '#6b3f20', height: 160, pdf: 'https://www.gutenberg.org/ebooks/10' },
{ title: 'The Dhammapada', author: 'Buddha (tr. Müller)', desc: 'Verses of the Dharma — the Buddha\'s essential teachings on the path to enlightenment.', cat: 'religion', color: '#b7950b', height: 112, pdf: 'https://www.gutenberg.org/ebooks/2017' },
{ title: 'Confessions', author: 'Saint Augustine', desc: 'One of the first autobiographies — Augustine\'s spiritual journey from sin to faith.', cat: 'religion', color: '#795548', height: 135, pdf: 'https://www.gutenberg.org/ebooks/3296' },

// ══════════════════════════════════════
// CHILDREN & FANTASY
// ══════════════════════════════════════
{ title: 'Alice in Wonderland', author: 'Lewis Carroll', desc: 'Down the rabbit hole into a world of nonsense, wordplay, and wonderfully mad characters.', cat: 'children', color: '#2980b9', height: 118, pdf: 'https://www.gutenberg.org/ebooks/11' },
{ title: 'Through the Looking-Glass', author: 'Lewis Carroll', desc: 'Alice steps through a mirror into a chess-board world. Jabberwocky, Tweedledee, and more.', cat: 'children', color: '#6c5ce7', height: 115, pdf: 'https://www.gutenberg.org/ebooks/12' },
{ title: 'The Jungle Book', author: 'Rudyard Kipling', desc: 'Mowgli, raised by wolves in the Indian jungle, learns the law of the wild from Baloo and Bagheera.', cat: 'children', color: '#1e8449', height: 122, pdf: 'https://www.gutenberg.org/ebooks/236' },
{ title: 'Peter Pan', author: 'J.M. Barrie', desc: 'The boy who never grows up takes the Darling children to Neverland — pirates, fairies, and adventure.', cat: 'children', color: '#27ae60', height: 125, pdf: 'https://www.gutenberg.org/ebooks/16' },
{ title: 'The Wonderful Wizard of Oz', author: 'L. Frank Baum', desc: 'Dorothy, Toto, and the yellow brick road — a Kansas girl\'s magical journey to the Emerald City.', cat: 'children', color: '#27ae60', height: 120, pdf: 'https://www.gutenberg.org/ebooks/55' },
{ title: 'Grimm\'s Fairy Tales', author: 'Brothers Grimm', desc: 'Cinderella, Rapunzel, Hansel and Gretel, Snow White — the stories that shaped childhood.', cat: 'children', color: '#8e44ad', height: 135, pdf: 'https://www.gutenberg.org/ebooks/2591' },
{ title: 'Aesop\'s Fables', author: 'Aesop', desc: 'The tortoise and the hare, the fox and the grapes — timeless moral tales from ancient Greece.', cat: 'children', color: '#b7950b', height: 118, pdf: 'https://www.gutenberg.org/ebooks/11339' },
{ title: 'The Wind in the Willows', author: 'Kenneth Grahame', desc: 'Mole, Ratty, Badger, and the irrepressible Mr. Toad — a gentle classic of the English countryside.', cat: 'children', color: '#1e8449', height: 122, pdf: 'https://www.gutenberg.org/ebooks/289' },
{ title: 'Anne of Green Gables', author: 'L.M. Montgomery', desc: 'An imaginative orphan girl transforms the lives of everyone on Prince Edward Island.', cat: 'children', color: '#d35400', height: 130, pdf: 'https://www.gutenberg.org/ebooks/45' },
];

// ══════════════════════════════════════
// ADDITIONAL BOOKS TO REACH 200+
// ══════════════════════════════════════
BOOKS.push(
// More Classic Fiction
{ title: 'Middlemarch', author: 'George Eliot', desc: 'Provincial life in Victorian England — idealism, marriage, politics, and reform in a small town.', cat: 'classic-fiction', color: '#5b2c6f', height: 152, pdf: 'https://www.gutenberg.org/ebooks/145' },
{ title: 'Tess of the d\'Urbervilles', author: 'Thomas Hardy', desc: 'A young woman is destroyed by fate, society, and the men who claim to love her.', cat: 'classic-fiction', color: '#7b241c', height: 138, pdf: 'https://www.gutenberg.org/ebooks/110' },
{ title: 'The Scarlet Letter', author: 'Nathaniel Hawthorne', desc: 'Hester Prynne wears the mark of shame in Puritan New England — sin, guilt, and redemption.', cat: 'classic-fiction', color: '#922b21', height: 125, pdf: 'https://www.gutenberg.org/ebooks/25344' },
{ title: 'Little Women', author: 'Louisa May Alcott', desc: 'The four March sisters growing up during the Civil War — Jo, Meg, Beth, and Amy.', cat: 'classic-fiction', color: '#d4a574', height: 135, pdf: 'https://www.gutenberg.org/ebooks/514' },
{ title: 'The Adventures of Tom Sawyer', author: 'Mark Twain', desc: 'A mischievous boy on the Mississippi — treasure, caves, and whitewashed fences.', cat: 'classic-fiction', color: '#e67e22', height: 122, pdf: 'https://www.gutenberg.org/ebooks/74' },
{ title: 'The Age of Innocence', author: 'Edith Wharton', desc: 'Love and convention in 1870s New York high society. Wharton won the Pulitzer Prize.', cat: 'classic-fiction', color: '#d4a574', height: 128, pdf: 'https://www.gutenberg.org/ebooks/541' },
{ title: 'Northanger Abbey', author: 'Jane Austen', desc: 'A young gothic novel enthusiast visits Bath and discovers that real life is stranger than fiction.', cat: 'classic-fiction', color: '#d4a574', height: 122, pdf: 'https://www.gutenberg.org/ebooks/121' },
{ title: 'Persuasion', author: 'Jane Austen', desc: 'Anne Elliot gets a second chance at love eight years after being persuaded to reject Captain Wentworth.', cat: 'classic-fiction', color: '#d4a574', height: 120, pdf: 'https://www.gutenberg.org/ebooks/105' },

// More Adventure
{ title: 'The Scarlet Pimpernel', author: 'Baroness Orczy', desc: 'A seemingly foppish English lord secretly rescues French aristocrats from the guillotine.', cat: 'adventure', color: '#c0392b', height: 125, pdf: 'https://www.gutenberg.org/ebooks/60' },
{ title: 'King Solomon\'s Mines', author: 'H. Rider Haggard', desc: 'Allan Quatermain leads an expedition into uncharted Africa in search of legendary diamond mines.', cat: 'adventure', color: '#b7950b', height: 130, pdf: 'https://www.gutenberg.org/ebooks/2166' },
{ title: 'The Last of the Mohicans', author: 'James Fenimore Cooper', desc: 'Frontier adventure during the French and Indian War — Hawkeye and the Mohican warriors.', cat: 'adventure', color: '#1e8449', height: 135, pdf: 'https://www.gutenberg.org/ebooks/27681' },
{ title: 'Kidnapped', author: 'Robert Louis Stevenson', desc: 'David Balfour is kidnapped and shipwrecked in the Scottish Highlands — a tale of loyalty and adventure.', cat: 'adventure', color: '#2874a6', height: 125, pdf: 'https://www.gutenberg.org/ebooks/421' },

// More Sci-Fi
{ title: 'The First Men in the Moon', author: 'H.G. Wells', desc: 'Two men travel to the Moon and discover an underground civilization of insectoid Selenites.', cat: 'sci-fi', color: '#5d6d7e', height: 122, pdf: 'https://www.gutenberg.org/ebooks/1013' },
{ title: 'From the Earth to the Moon', author: 'Jules Verne', desc: 'Post-Civil War Americans build a giant cannon to shoot a projectile to the Moon.', cat: 'sci-fi', color: '#2c3e50', height: 125, pdf: 'https://www.gutenberg.org/ebooks/83' },
{ title: 'The Sleeper Awakes', author: 'H.G. Wells', desc: 'A man wakes after 200 years to find himself ruler of a dystopian future world.', cat: 'sci-fi', color: '#1c2833', height: 128, pdf: 'https://www.gutenberg.org/ebooks/12163' },

// More Philosophy
{ title: 'Apology', author: 'Plato', desc: 'Socrates defends himself at trial — the examined life, the duty of a philosopher, and choosing death over silence.', cat: 'philosophy', color: '#4a6fa5', height: 110, pdf: 'http://classics.mit.edu/Plato/apology.html' },
{ title: 'Phaedo', author: 'Plato', desc: 'Socrates\' final hours — arguments for the immortality of the soul, told by those who watched him die.', cat: 'philosophy', color: '#4a6fa5', height: 118, pdf: 'http://classics.mit.edu/Plato/phaedo.html' },
{ title: 'Symposium', author: 'Plato', desc: 'A dinner party debate on the nature of love — featuring speeches by Aristophanes, Socrates, and Alcibiades.', cat: 'philosophy', color: '#4a6fa5', height: 115, pdf: 'http://classics.mit.edu/Plato/symposium.html' },
{ title: 'Enchiridion', author: 'Epictetus', desc: 'A Stoic handbook on what is and isn\'t within our control. Practical philosophy for daily life.', cat: 'philosophy', color: '#795548', height: 110, pdf: 'http://classics.mit.edu/Epictetus/epicench.html' },
{ title: 'On the Shortness of Life', author: 'Seneca', desc: 'Life is long enough if you know how to use it. Seneca\'s Stoic wisdom on time and priorities.', cat: 'philosophy', color: '#795548', height: 112, pdf: 'https://www.gutenberg.org/ebooks/56075' },

// More Russian Lit
{ title: 'The Overcoat', author: 'Nikolai Gogol', desc: 'A poor clerk\'s new overcoat briefly transforms his life — then tragedy strikes. Russian realism\'s origin.', cat: 'russian-lit', color: '#5d6d7e', height: 110, pdf: 'https://www.gutenberg.org/ebooks/36238' },
{ title: 'A Hero of Our Time', author: 'Mikhail Lermontov', desc: 'The cynical, magnetic Pechorin drifts through the Caucasus — Russia\'s first psychological novel.', cat: 'russian-lit', color: '#2e4053', height: 125, pdf: 'https://www.gutenberg.org/ebooks/913' },
{ title: 'Eugene Onegin', author: 'Alexander Pushkin', desc: 'A bored aristocrat rejects love and lives to regret it — Russia\'s greatest verse novel.', cat: 'russian-lit', color: '#6c5ce7', height: 130, pdf: 'https://www.gutenberg.org/ebooks/23997' },

// More History
{ title: 'The Prince', author: 'Niccolò Machiavelli', desc: 'How to acquire and maintain power — ruthlessly practical political philosophy from Renaissance Florence.', cat: 'history', color: '#6b3f20', height: 118, pdf: 'https://www.gutenberg.org/ebooks/1232' },
{ title: 'The Annals', author: 'Tacitus', desc: 'Imperial Rome from Tiberius to Nero — political corruption, palace intrigue, and Tacitean prose.', cat: 'history', color: '#7b241c', height: 145, pdf: 'http://classics.mit.edu/Tacitus/annals.html' },

// More Poetry
{ title: 'Songs of Innocence and Experience', author: 'William Blake', desc: 'The Lamb and the Tyger — Blake\'s visionary poems on childhood, nature, and the human condition.', cat: 'poetry', color: '#b7950b', height: 115, pdf: 'https://www.gutenberg.org/ebooks/1934' },
{ title: 'Sonnets', author: 'William Shakespeare', desc: '154 sonnets on love, beauty, mortality, and time — "Shall I compare thee to a summer\'s day?"', cat: 'poetry', color: '#6b3f20', height: 120, pdf: 'https://www.gutenberg.org/ebooks/1041' },
{ title: 'The Rime of the Ancient Mariner', author: 'Samuel Taylor Coleridge', desc: 'An albatross, a cursed voyage, and the price of killing nature — Romantic poetry at its most haunting.', cat: 'poetry', color: '#1a5276', height: 112, pdf: 'https://www.gutenberg.org/ebooks/151' },

// More Children & Fantasy
{ title: 'The Secret Garden', author: 'Frances Hodgson Burnett', desc: 'A spoiled orphan discovers a hidden garden and transforms her life — and the lives around her.', cat: 'children', color: '#1e8449', height: 125, pdf: 'https://www.gutenberg.org/ebooks/113' },
{ title: 'A Little Princess', author: 'Frances Hodgson Burnett', desc: 'Sara Crewe goes from riches to rags in a London boarding school — imagination conquers adversity.', cat: 'children', color: '#d4a574', height: 120, pdf: 'https://www.gutenberg.org/ebooks/146' },
{ title: 'Black Beauty', author: 'Anna Sewell', desc: 'A horse\'s life story — from gentle country lanes to harsh London streets. A plea for animal welfare.', cat: 'children', color: '#1c2833', height: 122, pdf: 'https://www.gutenberg.org/ebooks/271' },
{ title: 'The Adventures of Pinocchio', author: 'Carlo Collodi', desc: 'A wooden puppet dreams of becoming a real boy — lies, donkeys, and a whale along the way.', cat: 'children', color: '#e67e22', height: 125, pdf: 'https://www.gutenberg.org/ebooks/500' },

// More Biology
{ title: 'The Autobiography of Darwin', author: 'Charles Darwin', desc: 'Darwin\'s own account of his life — from beetle-collecting schoolboy to revolutionary scientist.', cat: 'biology', color: '#117a65', height: 122, pdf: 'https://www.gutenberg.org/ebooks/2010' },

// More Programming
{ title: 'How to Think Like a CS', author: 'Allen Downey', desc: 'Programming concepts taught through Python — loops, functions, data structures, and algorithmic thinking.', cat: 'programming', color: '#2980b9', height: 128, pdf: 'https://greenteapress.com/wp/think-python-2e/' },

// More Economics
{ title: 'The Theory of Moral Sentiments', author: 'Adam Smith', desc: 'Before The Wealth of Nations, Smith wrote on sympathy, justice, and the moral foundations of society.', cat: 'politics', color: '#8B4513', height: 142, pdf: 'https://www.gutenberg.org/ebooks/58559' },
);

BOOKS.push(
{ title: 'Mansfield Park', author: 'Jane Austen', desc: 'A poor relation raised by wealthy relatives navigates love, morality, and her place in society.', cat: 'classic-fiction', color: '#d4a574', height: 135, pdf: 'https://www.gutenberg.org/ebooks/141' },
{ title: 'The Woman in White', author: 'Wilkie Collins', desc: 'A mysterious woman, a sinister count, and a conspiracy — the first great mystery novel.', cat: 'mystery', color: '#5d6d7e', height: 145, pdf: 'https://www.gutenberg.org/ebooks/583' },
{ title: 'The Moonstone', author: 'Wilkie Collins', desc: 'A stolen Indian diamond and its curse — the first English detective novel.', cat: 'mystery', color: '#b7950b', height: 140, pdf: 'https://www.gutenberg.org/ebooks/155' },
{ title: 'Erewhon', author: 'Samuel Butler', desc: 'A satirical utopia where machines are banned and illness is a crime. Victorian social commentary.', cat: 'sci-fi', color: '#2e4053', height: 122, pdf: 'https://www.gutenberg.org/ebooks/1906' },
{ title: 'Looking Backward', author: 'Edward Bellamy', desc: 'A man wakes in the year 2000 to find a socialist utopia — hugely influential in its time.', cat: 'sci-fi', color: '#1a5276', height: 125, pdf: 'https://www.gutenberg.org/ebooks/624' },
{ title: 'Nana', author: 'Émile Zola', desc: 'A courtesan rises and falls in Second Empire Paris — naturalism and social critique.', cat: 'french-lit', color: '#922b21', height: 135, pdf: 'https://www.gutenberg.org/ebooks/5250' },
{ title: 'Thérèse Raquin', author: 'Émile Zola', desc: 'Adultery, murder, and guilt destroy two lovers — a dark naturalist psychological study.', cat: 'french-lit', color: '#1c2833', height: 125, pdf: 'https://www.gutenberg.org/ebooks/6626' },
{ title: 'Resurrection', author: 'Leo Tolstoy', desc: 'A nobleman seeks redemption after recognizing a woman he wronged years ago. Tolstoy\'s final novel.', cat: 'russian-lit', color: '#7b241c', height: 142, pdf: 'https://www.gutenberg.org/ebooks/1938' },
{ title: 'Flatland', author: 'Edwin Abbott', desc: 'A square living in a 2D world discovers the third dimension — mathematics, satire, and perception.', cat: 'sci-fi', color: '#6c5ce7', height: 110, pdf: 'https://www.gutenberg.org/ebooks/201' },
{ title: 'The Aeneid', author: 'Virgil', desc: 'Aeneas flees Troy and founds Rome — the Roman national epic, bridging Homer and empire.', cat: 'poetry', color: '#922b21', height: 142, pdf: 'https://www.gutenberg.org/ebooks/228' },
{ title: 'Beowulf', author: 'Anonymous', desc: 'A warrior battles monsters and a dragon in Anglo-Saxon England — the oldest English epic poem.', cat: 'poetry', color: '#5d6d7e', height: 130, pdf: 'https://www.gutenberg.org/ebooks/16328' },
{ title: 'Canterbury Tales', author: 'Geoffrey Chaucer', desc: 'Pilgrims swap stories on the road to Canterbury — bawdy, funny, and profoundly human.', cat: 'poetry', color: '#6b3f20', height: 148, pdf: 'https://www.gutenberg.org/ebooks/2383' },
{ title: 'Oedipus Rex', author: 'Sophocles', desc: 'A king discovers he has killed his father and married his mother — the ultimate Greek tragedy.', cat: 'poetry', color: '#7b241c', height: 112, pdf: 'http://classics.mit.edu/Sophocles/oedipus.html' },
{ title: 'Antigone', author: 'Sophocles', desc: 'A woman defies the king to bury her brother — duty to family vs. duty to the state.', cat: 'poetry', color: '#7b241c', height: 110, pdf: 'http://classics.mit.edu/Sophocles/antigone.html' },
{ title: 'The Pillow Book', author: 'Sei Shōnagon', desc: 'A Japanese court lady\'s observations, lists, and musings from Heian-era Japan. World literature\'s first blog.', cat: 'classic-fiction', color: '#b7950b', height: 128, pdf: 'https://www.gutenberg.org/ebooks/56051' },
{ title: 'Dao De Jing (Legge)', author: 'Laozi (tr. Legge)', desc: 'James Legge\'s scholarly translation of the Tao Te Ching with extensive commentary.', cat: 'philosophy', color: '#2d5a27', height: 115, pdf: 'https://www.gutenberg.org/ebooks/49965' },
{ title: 'Think DSP', author: 'Allen Downey', desc: 'Digital signal processing in Python — spectral analysis, filtering, and audio processing.', cat: 'programming', color: '#8e44ad', height: 125, pdf: 'https://greenteapress.com/wp/think-dsp/' },
{ title: 'Think Complexity', author: 'Allen Downey', desc: 'Complexity science — cellular automata, agent-based models, networks, and evolution.', cat: 'programming', color: '#d35400', height: 128, pdf: 'https://greenteapress.com/wp/think-complexity-2e/' },
{ title: 'Intro to Probability', author: 'Grinstead & Snell', desc: 'A clear, example-driven introduction to probability theory. Free from the AMS.', cat: 'math', color: '#2874a6', height: 140, pdf: 'https://math.dartmouth.edu/~prob/prob/prob.pdf' },
{ title: 'Convex Optimization', author: 'Boyd & Vandenberghe', desc: 'The standard reference on convex optimization — theory, algorithms, and applications. Free from Stanford.', cat: 'math', color: '#1a5276', height: 148, pdf: 'https://web.stanford.edu/~boyd/cvxbook/' },
);
