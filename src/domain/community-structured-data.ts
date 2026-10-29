import { communityPostPath, type CommunityComment, type CommunityPost } from "./community";

type PublicAuthor = Pick<CommunityPost, "isEditorial" | "anonymousAlias">;

export function communityAuthorName(author: PublicAuthor): string {
  return author.isEditorial ? "MOOA Resume 운영팀" : author.anonymousAlias.trim() || "익명";
}

function structuredAuthor(author: PublicAuthor) {
  return {
    "@type": author.isEditorial ? "Organization" as const : "Person" as const,
    name: communityAuthorName(author),
  };
}

/** Only public display fields: never include owner IDs, email or attachment paths. */
export function communityStructuredData(post: CommunityPost, comments: readonly CommunityComment[], siteUrl: string) {
  const url = new URL(communityPostPath(post.id), siteUrl).href;
  return {
    "@context": "https://schema.org",
    "@type": post.isEditorial ? "BlogPosting" : "DiscussionForumPosting",
    headline: post.title,
    ...(post.isEditorial ? { articleBody: post.body } : { text: post.body }),
    author: structuredAuthor(post),
    datePublished: post.createdAt,
    dateModified: post.updatedAt || post.createdAt,
    url,
    mainEntityOfPage: url,
    inLanguage: "ko-KR",
    commentCount: comments.length,
    interactionStatistic: [
      { "@type": "InteractionCounter", interactionType: "https://schema.org/LikeAction", userInteractionCount: post.recommendationCount },
      { "@type": "InteractionCounter", interactionType: "https://schema.org/CommentAction", userInteractionCount: comments.length },
    ],
    comment: comments.map((comment) => ({
      "@type": "Comment", text: comment.body, author: structuredAuthor(comment), datePublished: comment.createdAt,
    })),
  };
}

export function serializeCommunityStructuredData(data: ReturnType<typeof communityStructuredData>): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
