const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  "https://kthfkptbdeqmsvotqumc.supabase.co",
  "sb_publishable_RFHA7Od1hiJzCeY2nT2wrw_tTcwTENs"
);

module.exports = supabase;