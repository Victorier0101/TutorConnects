-- Sample data for TutorConnect development
USE tutorconnect;

-- Insert sample users (passwords are all "password123" hashed with bcrypt)
INSERT INTO users (name, email, password_hash, email_verified, is_active) VALUES
('Sarah Johnson', 'sarah.johnson@email.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6hsHLo9pEy', TRUE, TRUE),
('Michael Chen', 'michael.chen@email.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6hsHLo9pEy', TRUE, TRUE),
('Emily Rodriguez', 'emily.rodriguez@email.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6hsHLo9pEy', TRUE, TRUE),
('David Kim', 'david.kim@email.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6hsHLo9pEy', TRUE, TRUE),
('Jessica Lopez', 'jessica.lopez@email.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6hsHLo9pEy', TRUE, TRUE);

-- Insert user profiles
INSERT INTO user_profiles (user_id, bio, education, experience, subjects, languages, rating, total_reviews) VALUES
(1, 'Mathematics PhD with 8 years of tutoring experience. I specialize in making complex concepts accessible and fun!', 'PhD in Mathematics from Stanford University', '8 years of tutoring experience, former university lecturer', '["Mathematics", "Calculus", "Statistics", "Algebra"]', '["English", "Spanish"]', 4.9, 45),
(2, 'Physics professor who loves helping students understand the beauty of science. Available for all levels!', 'PhD in Physics from MIT', '12 years teaching and tutoring physics', '["Physics", "Chemistry", "Mathematics", "Engineering"]', '["English", "Mandarin"]', 4.8, 38),
(3, 'Bilingual Spanish teacher with native fluency. I make language learning engaging and practical.', 'BA in Spanish Literature, TESOL Certified', '5 years teaching Spanish as a second language', '["Spanish", "Literature", "Writing"]', '["Spanish", "English"]', 4.95, 62),
(4, 'Computer Science student at UC Berkeley. I can help with programming, algorithms, and math.', 'Currently pursuing BS in Computer Science at UC Berkeley', '3 years of peer tutoring', '["Computer Science", "Programming", "Mathematics", "Java", "Python"]', '["English", "Korean"]', 4.7, 23),
(5, 'High school chemistry teacher looking to help students outside of classroom hours.', 'MS in Chemistry Education', '6 years high school teaching experience', '["Chemistry", "Biology", "Mathematics"]', '["English"]', 4.85, 31);

-- Insert sample posts
INSERT INTO posts (user_id, post_type, subject, level, location, format, description, created_at) VALUES
-- Seeking posts
(1, 'seeking', 'Advanced Calculus', 'college', 'San Francisco, CA', 'online', 'Looking for help with multivariable calculus and differential equations. I''m struggling with partial derivatives and need someone who can explain concepts clearly. Flexible schedule, prefer evening sessions.', DATE_SUB(NOW(), INTERVAL 2 HOUR)),

(4, 'seeking', 'Spanish Conversation', 'adult', 'Berkeley, CA', 'both', 'I''m an intermediate Spanish learner looking for conversation practice with a native speaker. Want to improve my fluency before traveling to South America next year. Can meet in-person or online.', DATE_SUB(NOW(), INTERVAL 5 HOUR)),

(2, 'seeking', 'Creative Writing', 'high', 'Palo Alto, CA', 'in-person', 'High school student needs help with creative writing for AP English. Looking for someone who can help with story structure, character development, and improving writing style. Prefer in-person sessions.', DATE_SUB(NOW(), INTERVAL 1 DAY)),

-- Offering posts  
(1, 'offering', 'Mathematics Tutoring', 'college', 'San Francisco, CA', 'both', 'PhD in Mathematics offering tutoring for all college-level math courses. Specializing in calculus, linear algebra, and statistics. 8 years of experience with excellent student feedback. Free consultation available!', DATE_SUB(NOW(), INTERVAL 3 HOUR)),

(2, 'offering', 'Physics & Chemistry', 'high', 'San Jose, CA', 'online', 'Physics professor available for high school and college physics/chemistry tutoring. Can help with homework, test prep, and conceptual understanding. Online sessions with interactive whiteboard.', DATE_SUB(NOW(), INTERVAL 6 HOUR)),

(3, 'offering', 'Spanish Language Lessons', 'adult', 'Los Angeles, CA', 'both', 'Native Spanish speaker offering language lessons for all levels. Conversational practice, grammar, and cultural insights. Flexible scheduling and personalized lesson plans. ¡Vamos a aprender!', DATE_SUB(NOW(), INTERVAL 8 HOUR)),

(4, 'offering', 'Computer Programming', 'college', 'Berkeley, CA', 'online', 'CS student at UC Berkeley offering programming tutoring in Java, Python, C++. Can help with data structures, algorithms, and project assistance. Great for fellow students or beginners.', DATE_SUB(NOW(), INTERVAL 12 HOUR)),

(5, 'offering', 'High School Chemistry', 'high', 'Oakland, CA', 'in-person', 'Experienced chemistry teacher offering after-school tutoring. Specializing in general chemistry, organic chemistry basics, and exam preparation. Lab experiment explanations included!', DATE_SUB(NOW(), INTERVAL 1 DAY)),

(1, 'seeking', 'Piano Lessons', 'adult', 'San Francisco, CA', 'in-person', 'Adult beginner looking for patient piano instructor. Want to learn classical pieces and basic theory. Available weekends and evenings. Previous musical experience: none!', DATE_SUB(NOW(), INTERVAL 2 DAY)),

(3, 'offering', 'English ESL Tutoring', 'adult', 'San Diego, CA', 'online', 'Certified ESL instructor helping non-native speakers improve English skills. Focus on conversation, pronunciation, and business English. Cultural adaptation support included.', DATE_SUB(NOW(), INTERVAL 3 DAY));

-- Initialize post limits for users (so they can create more posts)
INSERT INTO user_post_limits (user_id, posts_today, posts_this_week, posts_this_month, last_post_date, last_reset_date) VALUES
(1, 2, 2, 2, CURDATE(), CURDATE()),
(2, 1, 1, 1, CURDATE(), CURDATE()),  
(3, 2, 2, 2, CURDATE(), CURDATE()),
(4, 1, 1, 1, CURDATE(), CURDATE()),
(5, 1, 1, 1, CURDATE(), CURDATE()); 