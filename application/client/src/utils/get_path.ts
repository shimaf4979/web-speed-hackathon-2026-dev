export function getImagePath(imageId: string, variant: "full" | "thumb" = "full"): string {
  const suffix = variant === "thumb" ? ".thumb" : "";
  return `/images/${imageId}${suffix}.webp`;
}

export function getMoviePath(movieId: string): string {
  return `/movies/${movieId}.webm`;
}

export function getSoundPath(soundId: string): string {
  return `/sounds/${soundId}.mp3`;
}

export function getProfileImagePath(profileImageId: string): string {
  return `/images/profiles/${profileImageId}.webp`;
}
