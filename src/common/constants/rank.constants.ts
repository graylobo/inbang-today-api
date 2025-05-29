/**
 * Level system constants
 */

/**
 * Calculates the required points for a given level
 * @param level - The level to calculate points for
 * @returns Required points for the level
 */
export const calculateRequiredPoints = (level: number): number => {
  // Base points required for level 1
  const basePoints = 100;

  // Points increase with level - quadratic growth
  // Level 0: 0 points
  // Level 1: 100 points
  // Level 2: 220 points
  // Level 3: 360 points
  // And so on...
  if (level <= 0) return 0;
  return basePoints * level + 20 * Math.pow(level, 2);
};

/**
 * Calculates the level based on points
 * @param points - The current points
 * @returns The level corresponding to the points
 */
export const calculateLevelFromPoints = (points: number): number => {
  if (points <= 0) return 0;

  // 큰 포인트 값에서도 작동하도록 상한을 충분히 높게 설정
  let low = 0;
  let high = 1000; // 상한을 1000으로 늘림

  // 빠른 초기 체크: 포인트가 매우 높은 경우
  const estimatedLevel = Math.floor(Math.sqrt(points / 20));
  if (estimatedLevel > high) {
    low = high;
    high = estimatedLevel * 2;
  }

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const requiredPoints = calculateRequiredPoints(mid);
    const nextLevelPoints = calculateRequiredPoints(mid + 1);

    if (requiredPoints <= points && nextLevelPoints > points) {
      return mid;
    } else if (requiredPoints > points) {
      high = mid - 1;
    } else {
      low = mid + 1;
    }
  }

  return low;
};

// Level demotion related settings
export const LEVEL_DEMOTION = {
  INACTIVITY_PERIOD: 30, // 30 days
  POINTS_REDUCTION_AMOUNT: 100, // Reduce 100 points every 30 days
  MINIMUM_POINTS: 0, // Minimum points
};
