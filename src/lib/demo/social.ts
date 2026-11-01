import type { AppNotification, Conversation } from '../types'
import { daysAgo, hoursAgo } from '../utils'

export const demoNotifications: AppNotification[] = [
  { id: 'n1', category: 'followers', actorId: 'u_yuki', text: 'started following you', createdAt: hoursAgo(1), read: false, link: '/profile/yuki_lens' },
  { id: 'n2', category: 'reactions', actorId: 'u_maya', text: 'and 42 others reacted to your comment on “Sunrise over the Bay of Bengal”', createdAt: hoursAgo(2), read: false, link: '/profile/spotter_alex' },
  { id: 'n3', category: 'comments', actorId: 'u_lukas', text: 'replied to your comment: “Frame two is a poster.”', createdAt: hoursAgo(3), read: false, link: '/home' },
  { id: 'n4', category: 'friends', actorId: 'u_ingrid', text: 'sent you a friend request', createdAt: hoursAgo(5), read: false, link: '/profile/ingrid_sim' },
  { id: 'n5', category: 'mentions', actorId: 'u_alex', text: 'mentioned you in a post: “Community question: what made you fall in love with aviation?”', createdAt: hoursAgo(9), read: false, link: '/home' },
  { id: 'n6', category: 'achievements', text: 'You unlocked the badge “Golden Hour” — 10 photos shared in the feed', createdAt: hoursAgo(20), read: true },
  { id: 'n7', category: 'communities', actorId: 'u_alex', text: 'invited you to join European Spotters', createdAt: daysAgo(1), read: true, link: '/communities' },
  { id: 'n8', category: 'challenges', text: 'Golden hour challenge ends in 8 days — you have 2 entries so far', createdAt: daysAgo(1), read: true, link: '/activities' },
  { id: 'n9', category: 'messages', actorId: 'u_sophie', text: 'sent you a message in “Weekend sim night”', createdAt: daysAgo(2), read: true, link: '/messages' },
  { id: 'n10', category: 'reactions', actorId: 'u_james', text: 'and 128 others liked your post about the fence-line viewing holes', createdAt: daysAgo(2), read: true },
  { id: 'n11', category: 'friends', actorId: 'u_james', text: 'accepted your friend request — you are now connected', createdAt: daysAgo(3), read: true, link: '/profile/james_aero' },
  { id: 'n12', category: 'achievements', text: 'You reached Level 4 — Aviator. New profile frame unlocked.', createdAt: daysAgo(4), read: true },
  { id: 'n13', category: 'communities', actorId: 'u_sophie', text: 'pinned a new challenge in Flight Simulation', createdAt: daysAgo(5), read: true, link: '/communities/flight-simulation' },
  { id: 'n14', category: 'followers', actorId: 'u_priya', text: 'started following you', createdAt: daysAgo(6), read: true, link: '/profile/priya_rotor' },
]

export const demoConversations: Conversation[] = [
  {
    id: 'cv_sophie',
    type: 'dm',
    participantIds: ['u_sophie', 'me'],
    unread: 2,
    messages: [
      { id: 'm1', senderId: 'u_sophie', kind: 'text', text: 'Hey! Are you joining the sim night on Friday? We are doing the full Atlantic crossing in the A320.', createdAt: hoursAgo(30) },
      { id: 'm2', senderId: 'me', kind: 'text', text: 'Count me in. Should I bring the weather engine or do you have it covered?', createdAt: hoursAgo(29) },
      { id: 'm3', senderId: 'u_sophie', kind: 'text', text: 'I have it covered — just show up with fuel in the tanks 😄', createdAt: hoursAgo(28) },
      { id: 'm4', senderId: 'u_sophie', kind: 'aircraft', aircraftId: 'a350', text: 'Also look at this beauty I added to my collection.', createdAt: hoursAgo(4) },
      { id: 'm5', senderId: 'u_sophie', kind: 'text', text: 'The new winglet detail in the latest update is unreal.', createdAt: hoursAgo(3.5) },
    ],
  },
  {
    id: 'cv_crew',
    type: 'group',
    name: 'BCN Spotting Crew',
    avatar: 'images/spotting-fence.jpg',
    participantIds: ['u_alex', 'u_yuki', 'u_ingrid', 'me'],
    unread: 3,
    messages: [
      { id: 'm1', senderId: 'u_alex', kind: 'text', text: 'South fence is open again after the resurfacing — light will be perfect around 18:40.', createdAt: hoursAgo(12) },
      { id: 'm2', senderId: 'u_yuki', kind: 'image', image: 'images/a350.jpg', text: 'Yesterday’s reward for waiting 😍', createdAt: hoursAgo(11) },
      { id: 'm3', senderId: 'u_ingrid', kind: 'text', text: 'Jealous. Malmö is all grey rain today.', createdAt: hoursAgo(10) },
      { id: 'm4', senderId: 'u_alex', kind: 'post', postId: 'p_02', text: 'My weekend set if you missed it in the feed.', createdAt: hoursAgo(9) },
      { id: 'm5', senderId: 'u_yuki', kind: 'text', text: 'Frame 2 is the one. Print it.', createdAt: hoursAgo(8) },
      { id: 'm6', senderId: 'u_alex', kind: 'text', text: 'Who is coming Saturday? Meet at the usual spot 16:00.', createdAt: hoursAgo(2) },
      { id: 'm7', senderId: 'u_ingrid', kind: 'text', text: 'I will be there — flying in on the morning rotation.', createdAt: hoursAgo(1.5) },
      { id: 'm8', senderId: 'u_yuki', kind: 'text', text: 'Same. Bringing the 2x this time.', createdAt: hoursAgo(1) },
    ],
  },
  {
    id: 'cv_james',
    type: 'dm',
    participantIds: ['u_james', 'me'],
    unread: 0,
    messages: [
      { id: 'm1', senderId: 'me', kind: 'text', text: 'James, your thread on Concorde’s first flight was fantastic. Which archive did you use?', createdAt: daysAgo(3) },
      { id: 'm2', senderId: 'u_james', kind: 'text', text: 'Mostly the BAC company records plus a few letters held at the Science Museum archive. Happy to share the reading list.', createdAt: daysAgo(3) },
      { id: 'm3', senderId: 'me', kind: 'text', text: 'That would be brilliant, thank you!', createdAt: daysAgo(2.9) },
      { id: 'm4', senderId: 'u_james', kind: 'post', postId: 'p_12', text: 'Start with this one, it links the sources in the comments.', createdAt: daysAgo(2.8) },
    ],
  },
  {
    id: 'cv_euro',
    type: 'community',
    name: 'European Spotters Lounge',
    avatar: 'images/a350.jpg',
    communityId: 'cm_euro',
    participantIds: ['u_alex', 'u_yuki', 'u_ingrid', 'u_sophie', 'me'],
    unread: 0,
    messages: [
      { id: 'm1', senderId: 'u_alex', kind: 'text', text: 'Welcome to the lounge! House rules: be kind, credit photographers, no fence jumping 😄', createdAt: daysAgo(5) },
      { id: 'm2', senderId: 'u_sophie', kind: 'text', text: 'First time here — any recommendations for a quiet airport with good light?', createdAt: daysAgo(4) },
      { id: 'm3', senderId: 'u_ingrid', kind: 'text', text: 'Try Ängelholm or Visby on a weekday. Small, friendly and the light is gorgeous.', createdAt: daysAgo(4) },
      { id: 'm4', senderId: 'u_yuki', kind: 'aircraft', aircraftId: 'gripen', text: 'Speaking of Ängelholm…', createdAt: daysAgo(3.9) },
    ],
  },
]

export const demoReports = [] as unknown[]
