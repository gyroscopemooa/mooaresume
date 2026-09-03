-- `document_kind`에 자격·증명서를 더합니다.
--
-- 트랜잭션으로 감싸지 않습니다. `alter type ... add value`는 같은 트랜잭션
-- 안에서 그 값을 다시 쓸 수 없고, 뒤따르는 마이그레이션이 바로 그 값을
-- 씁니다. 파일을 나눠 두면 그 제약에 걸리지 않습니다.
--
-- `if not exists`라 여러 번 실행해도 안전합니다.
alter type public.document_kind add value if not exists 'CERTIFICATE';
