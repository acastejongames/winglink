import type { Post } from '../types'

export interface TagTrend {
  tag: string
  posts: number
}

/** Most-used hashtags across real posts, most frequent first. */
export function topHashtags(posts: Post[], limit = 8): TagTrend[] {
  const counts = new Map<string, number>()
  for (const p of posts) {
    for (const h of p.hashtags) counts.set(h, (counts.get(h) ?? 0) + 1)
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([tag, n]) => ({ tag, posts: n }))
}

/** Posts ranked by real engagement (likes + comments + shares). */
export function topPostsByEngagement(posts: Post[], limit = 5): Post[] {
  const engagement = (p: Post) => p.likes + p.comments.length * 2 + p.shares * 3
  return [...posts].sort((a, b) => engagement(b) - engagement(a)).slice(0, limit)
}
