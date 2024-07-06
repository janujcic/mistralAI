create or replace function match_obsidian_docs (
  query_embedding vector(1024),
  match_threshold float,
  match_count int
)
returns table (
  id bigint,
  content text,
  document text,
  similarity float
)
language sql stable
as $$
  select
    obsidian_docs.id,
    obsidian_docs.content,
    obsidian_docs.document,
    1 - (obsidian_docs.embedding <=> query_embedding) as similarity
  from obsidian_docs
  where 1 - (obsidian_docs.embedding <=> query_embedding) > match_threshold
  order by (obsidian_docs.embedding <=> query_embedding) asc
  limit match_count;
$$;