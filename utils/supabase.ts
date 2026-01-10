
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rmqusrygunioeywmvjhr.supabase.co'.trim();
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJtcXVzcnlndW5pb2V5d212amhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxODg4NDEsImV4cCI6MjA4MDc2NDg0MX0.G1xF1iD5PU0dKqjj7qCU7S0ayP-myu20_yQDJ1seYrI'.trim();

export const supabase = createClient(supabaseUrl, supabaseKey);
