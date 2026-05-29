export function truncateText(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, Math.max(maxLength - 1, 1)).trimEnd()}…`;
}

function hashString(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0;
  }

  return Math.abs(hash);
}

export function buildBookCoverGradient(seed: string) {
  const hue = hashString(seed) % 360;
  const secondaryHue = (hue + 42) % 360;
  const thirdHue = (hue + 86) % 360;

  return `linear-gradient(135deg, hsl(${hue} 68% 48%) 0%, hsl(${secondaryHue} 64% 40%) 55%, hsl(${thirdHue} 60% 34%) 100%)`;
}
