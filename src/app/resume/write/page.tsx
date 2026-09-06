import { redirect } from "next/navigation";

/**
 * 잠깐 이 주소가 도구였습니다.
 *
 * 소개를 `/resume`에, 도구를 여기에 두었다가 되돌렸습니다 — 이력서를 쓰러 온
 * 사람에게 소개를 먼저 읽히는 것이 한 번 더 누르게 만드는 일이었기 때문입니다.
 * 밖에 알린 적 없는 주소라 끊길 링크는 없지만, 이 사이에 즐겨찾기를 해 둔
 * 경우를 위해 남겨 둡니다.
 */
export default function ResumeWriteRedirect() {
  redirect("/resume");
}
