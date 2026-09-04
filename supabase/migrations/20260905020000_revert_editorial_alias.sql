-- 20260905010000_editorial_alias.sql 되돌림.
--
-- 그 마이그레이션은 is_editorial 글·댓글의 별명을 '운영팀'으로 박았습니다.
-- 그런데 이 프로젝트는 이미 앞선 논의에서 "운영팀"이라는 글자 배지 대신
-- 트위터식 체크 표시(BadgeCheck 아이콘)로 가기로 정해 뒀습니다
-- (community-lounge.tsx / community/[postId]/page.tsx의 .editorialBadge).
-- 글자 라벨을 별명 자리에 다시 넣으면 그 결정을 뒤집는 것이라 되돌립니다.
--
-- 앞 마이그레이션이 이미 적용됐든 아니든 안전하게 같은 상태로 수렴하도록
-- create or replace + update로 씁니다.
begin;

create or replace function public.set_community_alias() returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  new.anonymous_alias := '익명 ' || upper(substr(md5(new.owner_user_id::text), 1, 4));
  return new;
end; $$;

-- 앞 마이그레이션이 '운영팀'으로 바꿔 둔 행이 있으면 원래 규칙으로 되돌립니다.
update public.community_posts
   set anonymous_alias = '익명 ' || upper(substr(md5(owner_user_id::text), 1, 4))
 where anonymous_alias = '운영팀';
update public.community_comments
   set anonymous_alias = '익명 ' || upper(substr(md5(owner_user_id::text), 1, 4))
 where anonymous_alias = '운영팀';

commit;
