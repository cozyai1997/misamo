const { createClient } = require('@supabase/supabase-js');
const tus = require('tus-js-client');
window.MisamoCloudLibraries = { createClient, Upload: tus.Upload };
