import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const supabaseUrl = 'https://exsjryjrmkvbsezyjgwe.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV4c2pyeWpybWt2YnNlenlqZ3dlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwMTMzOTcsImV4cCI6MjA4ODU4OTM5N30.FU001ydIYLLf2yNB7ruhAl2D5shfVx2QzjI2ZGKMR7k'

export const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        // Bypass Web Locks API to prevent AbortError during Live Server hot-reload.
        // The lock is only needed for multi-tab token-refresh coordination, which is
        // not a concern for this single-tab app.
        lock: (_name, _timeout, fn) => fn()
    }
})
