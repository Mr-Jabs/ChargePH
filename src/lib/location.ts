import type { UserLocation } from "./spatial";

/** Browser location is requested only in response to the user's GPS control. */
export function requestUserLocation(
  geolocation: Pick<Geolocation, "getCurrentPosition"> | undefined,
): Promise<UserLocation> {
  if (!geolocation)
    return Promise.reject(
      new Error(
        "This browser does not support location. Search a city or province instead.",
      ),
    );
  return new Promise((resolve, reject) => {
    geolocation.getCurrentPosition(
      ({ coords }) => {
        if (
          !Number.isFinite(coords.latitude) ||
          !Number.isFinite(coords.longitude) ||
          Math.abs(coords.latitude) > 90 ||
          Math.abs(coords.longitude) > 180 ||
          !Number.isFinite(coords.accuracy) ||
          coords.accuracy < 0
        ) {
          reject(
            new Error("Your location could not be read. Please try again."),
          );
          return;
        }
        resolve({
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: coords.accuracy,
        });
      },
      (error) =>
        reject(
          new Error(
            error.code === 1
              ? "Location access denied. Allow location in your browser settings, then try again."
              : error.code === 3
                ? "Location request timed out. Please try again."
                : "Your location is unavailable. Try again or search a city instead.",
          ),
        ),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    );
  });
}
