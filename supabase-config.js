// supabase-config.js
// Replace with your Supabase project details
const SUPABASE_URL = 'https://jvfdcuvinlimurlttiqy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2ZmRjdXZpbmxpbXVybHR0aXF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0Njk0MTAsImV4cCI6MjA5MTA0NTQxMH0.ipezUsKqsEAbHvRqBLZYhagZj57rFJKG36uQL_4rFSg'; // ⚠️ Replace with real key

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
