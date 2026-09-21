begin;
select plan(6);

select is(
  (select count(*)::integer from pg_policies where schemaname = 'public' and tablename = 'tareas'),
  4,
  'tareas has exactly the four owner-only policies'
);

select is(
  (select count(*)::integer from pg_policies where schemaname = 'public' and tablename = 'tareas' and roles = array['authenticated']),
  4,
  'every tareas policy is scoped to authenticated'
);

select is(
  (select count(*)::integer from pg_policies where schemaname = 'public' and tablename = 'tareas' and cmd = 'select' and qual like '%project.user_id = (select auth.uid())%'),
  1,
  'select policy checks the owner of the related project'
);

select is(
  (select count(*)::integer from pg_policies where schemaname = 'public' and tablename = 'tareas' and cmd = 'insert' and with_check like '%project.user_id = (select auth.uid())%'),
  1,
  'insert policy checks the owner of the related project'
);

select is(
  (select count(*)::integer from pg_policies where schemaname = 'public' and tablename = 'tareas' and cmd = 'update' and qual like '%project.user_id = (select auth.uid())%' and with_check like '%project.user_id = (select auth.uid())%'),
  1,
  'update policy protects both current and resulting ownership'
);

select is(
  (select count(*)::integer from pg_policies where schemaname = 'public' and tablename = 'tareas' and cmd = 'delete' and qual like '%project.user_id = (select auth.uid())%'),
  1,
  'delete policy checks the owner of the related project'
);

select * from finish();
rollback;
