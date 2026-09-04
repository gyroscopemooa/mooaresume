-- 운영팀 글·댓글의 별명을 '운영팀'으로 고정합니다.
--
-- set_community_alias는 owner_user_id의 md5 앞 4자로 '익명 XXXX'를 만듭니다.
-- 계정이 같으면 별명도 항상 같으므로, 자동 글을 한 계정으로 쓰면 (1) 매일 세
-- 글이 같은 별명으로 올라오고 (2) 그 글에 달리는 운영팀 댓글도 같은 별명이라
-- 자기 글에 자기가 댓글 단 모양이 되며 (3) 그 계정 주인이 개인 자격으로 쓴
-- 익명글까지 자동 글과 같은 별명을 달게 됩니다.
--
-- 전용 계정을 새로 파는 방법도 있지만 (3)만 막고 (1)(2)는 그대로입니다.
-- is_editorial이 이미 "이건 운영팀이 쓴 글"이라는 표시이므로, 그 글에는 해시
-- 별명 대신 정체를 그대로 적습니다. 익명 사용자 쪽 동작은 건드리지 않습니다.
begin;

create or replace function public.set_community_alias() returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if new.is_editorial then
    new.anonymous_alias := '운영팀';
  else
    new.anonymous_alias := '익명 ' || upper(substr(md5(new.owner_user_id::text), 1, 4));
  end if;
  return new;
end; $$;

-- 이 마이그레이션 전에 들어간 운영팀 글이 있다면 맞춰 줍니다(보통 0건).
update public.community_posts set anonymous_alias = '운영팀' where is_editorial and anonymous_alias <> '운영팀';
update public.community_comments set anonymous_alias = '운영팀' where is_editorial and anonymous_alias <> '운영팀';

commit;
