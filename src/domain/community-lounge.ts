export type CommunityTopicId = "all" | "job-search" | "career" | "application" | "work-life";

export type CommunityTopic = {
  id: CommunityTopicId;
  label: string;
  description: string;
  href: string;
};

export type CommunityPreviewPost = {
  id: string;
  topic: Exclude<CommunityTopicId, "all">;
  topicLabel: string;
  title: string;
  excerpt: string;
  prompt: string;
};

export const communityTopics: CommunityTopic[] = [
  { id: "all", label: "전체", description: "지금 가장 많이 나오는 고민을 둘러봐요.", href: "/community" },
  { id: "job-search", label: "취업 준비", description: "지원 일정, 첫 취업, 공백기에 대한 고민", href: "/career" },
  { id: "career", label: "직무·진로", description: "내가 오래 해볼 수 있는 일을 찾는 과정", href: "/career/interest" },
  { id: "application", label: "자소서·면접", description: "경험 정리와 지원서 표현에 대한 고민", href: "/" },
  { id: "work-life", label: "회사생활", description: "입사 전후의 일하는 방식과 환경 고민", href: "/career/work-style" },
];

export const communityPreviewPosts: CommunityPreviewPost[] = [
  {
    id: "first-role",
    topic: "career",
    topicLabel: "직무·진로",
    title: "첫 지원 직무를 어떻게 정해야 할지 모르겠어요",
    excerpt: "관심 있는 분야는 여러 개인데, 지금 가진 경험으로 어디부터 지원해야 할지 막막해요.",
    prompt: "내가 해보고 싶은 활동과 지금까지의 경험을 따로 적어 보면, 겹치는 지점이 보일 수 있어요.",
  },
  {
    id: "ordinary-experience",
    topic: "application",
    topicLabel: "자소서·면접",
    title: "자소서에 쓸 경험이 너무 평범한 것 같아요",
    excerpt: "대단한 프로젝트는 없지만, 일하면서 문제를 해결했던 과정은 있어요. 어떻게 꺼내야 할까요?",
    prompt: "결과보다 상황·내 역할·바꾼 점을 먼저 정리해 보면 경험의 밀도가 달라집니다.",
  },
  {
    id: "major-change",
    topic: "job-search",
    topicLabel: "취업 준비",
    title: "전공과 다른 직무로 지원해도 괜찮을까요?",
    excerpt: "관심은 확실하지만 관련 스펙이 많지 않아, 처음부터 포기해야 하나 고민돼요.",
    prompt: "직무에 필요한 업무 방식과 내 경험의 연결점을 하나씩 확인해 보세요.",
  },
  {
    id: "work-fit",
    topic: "work-life",
    topicLabel: "회사생활",
    title: "일은 할 수 있는데, 어떤 환경이 맞는지는 모르겠어요",
    excerpt: "사람과 함께 일하는 건 좋은데 너무 빠른 분위기에서는 지치기도 해요.",
    prompt: "잘하는 일과 오래 해도 덜 소진되는 환경은 다를 수 있어요.",
  },
];