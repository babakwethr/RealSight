import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

// Simple .env parser
const envContent = fs.readFileSync('.env', 'utf-8');
const env = Object.fromEntries(
    envContent.split('\n')
        .filter(line => line.includes('='))
        .map(line => {
            const [key, ...value] = line.split('=');
            return [key.trim(), value.join('=').replace(/^["']|["']$/g, '').trim()];
        })
);

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
    console.log('Creating storage bucket: project-media...');
    const { data, error } = await supabase.storage.createBucket('project-media', {
        public: true,
        fileSizeLimit: 52428800, // 50MB
    });

    if (error) {
        if (error.message.includes('already exists')) {
            console.log('Bucket "project-media" already exists.');
        } else {
            console.error('Error creating bucket:', error);
        }
    } else {
        console.log('Bucket "project-media" created successfully.');
    }
}

run();
