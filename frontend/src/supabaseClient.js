import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kzpgsqgegqauhdybspka.supabase.co'; // Replace with your project URL
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt6cGdzcWdlZ3FhdWhkeWJzcGthIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA1NDM4MzksImV4cCI6MjA2NjExOTgzOX0.k9O8Zr9fO7EQ3rxJrydimXQMRRMBRn00-l75eXBg_BQ'; // Replace with your anon/public key

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
