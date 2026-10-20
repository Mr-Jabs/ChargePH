import test from "node:test";
import assert from "node:assert/strict";
import {
  distanceKm,
  findNearest,
  formatDistance,
  matchesSearch,
} from "../src/lib/spatial.ts";
import { requestUserLocation } from "../src/lib/location.ts";

const manila = { latitude: 14.5995, longitude: 120.9842 };
const cebu = { latitude: 10.3157, longitude: 123.8854 };
const station = (id, position, text = {}) => ({
  id,
  title: "",
  address: "",
  town: "",
  state: "",
  ...position,
  ...text,
});

test("distance uses great-circle kilometers, handles identical and antipodal points", () => {
  assert.equal(distanceKm(manila, manila), 0);
  assert.ok(distanceKm(manila, cebu) > 560 && distanceKm(manila, cebu) < 580);
  assert.ok(
    Math.abs(distanceKm(manila, cebu) - distanceKm(cebu, manila)) < 0.000001,
  );
  assert.ok(
    Number.isFinite(
      distanceKm(
        { latitude: 0, longitude: 0 },
        { latitude: 0, longitude: 180 },
      ),
    ),
  );
});

test("nearest selection uses the candidate list, not input order, and tolerates no matches", () => {
  const far = station(1, cebu);
  const near = station(2, { latitude: 14.6, longitude: 120.985 });
  assert.equal(findNearest(manila, [far, near]).station.id, 2);
  assert.equal(findNearest(manila, [far]).station.id, 1);
  assert.equal(findNearest(manila, []), null);
});

test("nearest ignores invalid coordinates and has deterministic tie behavior", () => {
  assert.equal(
    findNearest(manila, [station(1, { latitude: NaN, longitude: 120 })]),
    null,
  );
  assert.equal(
    findNearest(manila, [station(2, manila), station(3, manila)]).station.id,
    2,
  );
});

test("search covers name, address, city, province, accents, and local BGC aliases", () => {
  const bgc = station(1, manila, {
    title: "One charging hub",
    address: "Bonifacio Global City",
    town: "Taguig",
    state: "Metro Manila",
  });
  assert.equal(matchesSearch(bgc, " bgc "), true);
  assert.equal(matchesSearch(bgc, "BGC Taguig"), true);
  assert.equal(matchesSearch(bgc, "Cebu"), false);
  assert.equal(
    matchesSearch(station(2, manila, { town: "Parañaque City" }), "paranaque"),
    true,
  );
  assert.equal(
    matchesSearch(
      station(3, manila, { state: "Cebu", title: "Ayala Center" }),
      "cebu ayala",
    ),
    true,
  );
  assert.equal(matchesSearch(bgc, "   "), true);
  assert.equal(
    matchesSearch(station(4, manila, { town: "Taguig" }), "bgc"),
    false,
  );
  assert.equal(
    matchesSearch(
      station(
        5,
        { latitude: 14.553, longitude: 121.053 },
        { town: "Taguig City", title: "Menarco Tower" },
      ),
      "bgc",
    ),
    true,
  );
  assert.equal(
    matchesSearch(
      station(
        6,
        { latitude: 14.51, longitude: 121.05 },
        { town: "Taguig City", title: "Arca South" },
      ),
      "bgc",
    ),
    false,
  );
});

test("distance labels distinguish meters and kilometers", () => {
  assert.equal(formatDistance(0.125), "125 m");
  assert.equal(formatDistance(12.34), "12.3 km");
});

test("GPS success preserves accuracy and finds the closest matching station", async () => {
  let options;
  const location = await requestUserLocation({
    getCurrentPosition(success, error, suppliedOptions) {
      options = suppliedOptions;
      success({ coords: { ...manila, accuracy: 20 } });
    },
  });
  assert.deepEqual(location, { ...manila, accuracy: 20 });
  assert.equal(options.timeout, 15000);
  assert.equal(options.enableHighAccuracy, true);
  assert.equal(
    findNearest(location, [station(1, cebu), station(2, manila)]).station.id,
    2,
  );
});

test("GPS denied, timed out, unsupported, and invalid coordinates report actionable errors", async () => {
  const fail = (code) => ({
    getCurrentPosition(success, error) {
      error({ code });
    },
  });
  await assert.rejects(requestUserLocation(fail(1)), /access denied/);
  await assert.rejects(requestUserLocation(fail(3)), /timed out/);
  await assert.rejects(requestUserLocation(fail(2)), /unavailable/);
  await assert.rejects(requestUserLocation(undefined), /does not support/);
  await assert.rejects(
    requestUserLocation({
      getCurrentPosition(success) {
        success({ coords: { latitude: 100, longitude: 120, accuracy: 20 } });
      },
    }),
    /could not be read/,
  );
});
