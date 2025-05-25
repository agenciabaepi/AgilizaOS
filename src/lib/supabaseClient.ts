import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nxamrvfusyrtkcshehfm.supabase.co' as string;
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54YW1ydmZ1c3lydGtjc2hlaGZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc4NjEzMTAsImV4cCI6MjA2MzQzNzMxMH0.CWTKEVlWcMeRTv8kHgsPkk-WzoHxypFDb_QSf-DLPAQ' as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
