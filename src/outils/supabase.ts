import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// persistSession : la session reste en localStorage → l'utilisateur reste connecté
// après un rechargement, et même si le serveur est injoignable (accès hors-ligne).
// autoRefreshToken : renouvelle le jeton quand le réseau revient.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
