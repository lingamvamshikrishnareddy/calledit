// User types
export const UserStatus = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  SUSPENDED: 'suspended'
};

// Prediction types
export const PredictionStatus = {
  OPEN: 'open',
  CLOSED: 'closed',
  RESOLVED: 'resolved'
};

export const PredictionCategory = {
  SPORTS: 'sports',
  POLITICS: 'politics',
  TECHNOLOGY: 'technology',
  ENTERTAINMENT: 'entertainment',
  FINANCE: 'finance',
  WEATHER: 'weather',
  OTHER: 'other'
};

// Vote types
export const VoteType = {
  YES: 'yes',
  NO: 'no'
};

// Leaderboard periods
export const LeaderboardPeriod = {
  DAILY: 'daily',
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
  ALL_TIME: 'all_time'
};

// Activity types
export const ActivityType = {
  PREDICTION_CREATED: 'prediction_created',
  VOTE_CAST: 'vote_cast',
  PREDICTION_WON: 'prediction_won',
  PREDICTION_LOST: 'prediction_lost',
  STREAK_MILESTONE: 'streak_milestone'
};

// Navigation routes
export const Routes = {
  HOME: 'Home',
  SEARCH: 'Search',
  PORTFOLIO: 'Portfolio',
  LEADERBOARD: 'Leaderboard',
  FRIENDS: 'Friends',
  PROFILE: 'Profile',
  LOGIN: 'Login',
  REGISTER: 'Register',
  PREDICTION_DETAIL: 'PredictionDetail'
};