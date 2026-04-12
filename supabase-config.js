// supabase-config.js
// Replace with your Supabase project details
const SUPABASE_URL = 'https://jvfdcuvinlimurlttiqy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2ZmRjdXZpbmxpbXVybHR0aXF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0Njk0MTAsImV4cCI6MjA5MTA0NTQxMH0.ipezUsKqsEAbHvRqBLZYhagZj57rFJKG36uQL_4rFSg'; // ⚠️ Replace with real key

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


-- DROP TABLES IF THEY EXIST (run carefully - this will delete existing data)
DROP TABLE IF EXISTS downloads;
DROP TABLE IF EXISTS shares;
DROP TABLE IF EXISTS likes;
DROP TABLE IF EXISTS comments;
DROP TABLE IF EXISTS private_messages;
DROP TABLE IF EXISTS parish_messages;
DROP TABLE IF EXISTS suspensions;
DROP TABLE IF EXISTS quotas;
DROP TABLE IF EXISTS plans;
DROP TABLE IF EXISTS parish_members;
DROP TABLE IF EXISTS parish_groups;
DROP TABLE IF EXISTS posts;
DROP TABLE IF EXISTS profiles;

-- Users table (extends Supabase auth users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  full_name TEXT NOT NULL,
  parish_name TEXT NOT NULL,
  gender TEXT CHECK (gender IN ('male', 'female', 'other')),
  email TEXT NOT NULL,
  profile_image_url TEXT,
  is_exco_parish BOOLEAN DEFAULT false,
  is_exco_archediceanry BOOLEAN DEFAULT false,
  exco_request_status TEXT DEFAULT 'pending' CHECK (exco_request_status IN ('pending', 'approved', 'rejected')),
  is_suspended BOOLEAN DEFAULT false,
  suspension_end_date TIMESTAMP,
  bio TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Parish members table
CREATE TABLE public.parish_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  parish_name TEXT NOT NULL,
  is_president BOOLEAN DEFAULT false,
  joined_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, parish_name)
);

-- Parish messages table
CREATE TABLE public.parish_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parish_name TEXT NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  message TEXT,
  file_url TEXT,
  file_type TEXT,
  reply_to_id UUID REFERENCES public.parish_messages(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Private messages table
CREATE TABLE public.private_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  message TEXT,
  file_url TEXT,
  file_type TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Posts table
CREATE TABLE public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  content TEXT,
  media_url TEXT,
  media_type TEXT CHECK (media_type IN ('image', 'video', 'none')),
  post_type TEXT CHECK (post_type IN ('notice', 'event', 'post', 'meeting_minutes')),
  event_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Comments table
CREATE TABLE public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  parent_comment_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  comment TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Likes table
CREATE TABLE public.likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

-- Shares table
CREATE TABLE public.shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

-- Downloads table
CREATE TABLE public.downloads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

-- Plans table
CREATE TABLE public.plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  year INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Quotas table
CREATE TABLE public.quotas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  president_id UUID REFERENCES public.profiles(id),
  parish_name TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  description TEXT,
  due_date DATE,
  is_paid BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Suspensions table
CREATE TABLE public.suspensions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  parish_name TEXT NOT NULL,
  suspended_by UUID REFERENCES public.profiles(id),
  duration_days INTEGER,
  suspension_end_date TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_profiles_email ON public.profiles(email);
CREATE INDEX idx_parish_messages_parish ON public.parish_messages(parish_name, created_at DESC);
CREATE INDEX idx_private_messages_users ON public.private_messages(sender_id, receiver_id);
CREATE INDEX idx_posts_type ON public.posts(post_type, created_at DESC);
CREATE INDEX idx_comments_post ON public.comments(post_id);
CREATE INDEX idx_likes_post ON public.likes(post_id);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;

-- Create policies for public access
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Posts are viewable by everyone" ON public.posts FOR SELECT USING (true);
CREATE POLICY "Anyone can insert posts" ON public.posts FOR INSERT WITH CHECK (true);
CREATE POLICY "Comments are viewable by everyone" ON public.comments FOR SELECT USING (true);
CREATE POLICY "Authenticated users can comment" ON public.comments FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Likes are viewable by everyone" ON public.likes FOR SELECT USING (true);
CREATE POLICY "Authenticated users can like" ON public.likes FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Users can delete own likes" ON public.likes FOR DELETE USING (auth.uid() = user_id);
