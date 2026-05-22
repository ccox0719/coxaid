do $$
declare
  col record;
begin
  for col in
    select table_schema, table_name, column_name
    from information_schema.columns
    where table_schema = 'public'
      and data_type in ('text', 'character varying', 'character')
  loop
    execute format(
      'update %I.%I set %I = replace(replace(%I, %L, %L), %L, %L) where %I like %L or %I like %L',
      col.table_schema,
      col.table_name,
      col.column_name,
      col.column_name,
      'Ã‚Â·',
      ' - ',
      'Ãƒâ€šÃ‚Â·',
      ' - ',
      col.column_name,
      '%Ã‚Â·%',
      col.column_name,
      '%Ãƒâ€šÃ‚Â·%'
    );
  end loop;
end $$;
