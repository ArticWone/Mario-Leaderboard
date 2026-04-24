do $$
declare
  fn regprocedure;
begin
  for fn in
    select p.oid::regprocedure
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'submit_score'
  loop
    execute format('alter function %s set search_path = public, pg_temp', fn);
  end loop;
end $$;
