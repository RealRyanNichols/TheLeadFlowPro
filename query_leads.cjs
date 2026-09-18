const { createClient } = require('@supabase/supabase-js');
const url = 'https://hpzpwfymwfgwspaixrxi.supabase.co';
const anonKey = 'eyJhbG...uizA';
const supabase = createClient(url, anonKey);
async function main() {
  const { data, error } = await supabase.from('leads').select('*');
  if (error) { console.log('ERROR:', error.message); process.exit(1); }
  console.log(JSON.stringify(data, null, 2));
}
main();
