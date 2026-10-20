import json
import os
import sys
import tempfile
import requests
from dotenv import load_dotenv

load_dotenv()

API_URL = "https://api.openchargemap.io/v3/poi/"
API_KEY = os.getenv("OPENCHARGEMAP_API_KEY", "")

headers = {}
if API_KEY:
    headers["X-API-Key"] = API_KEY

params = {
    "output": "json",
    "countrycode": "PH",
    "maxresults": 250,  # Requested snapshot size; not a verified national total
    "compact": "false",
    "verbose": "false",
}

print("Fetching up to 250 Philippine EV charging stations...")

try:
    response = requests.get(API_URL, params=params, headers=headers, timeout=15)
    response.raise_for_status()
    all_raw_data = response.json()
    if not isinstance(all_raw_data, list) or not all_raw_data:
        raise ValueError("Expected a non-empty list of station records")
except (requests.RequestException, ValueError) as e:
    print(f"Ingestion failed ({type(e).__name__}). Existing dataset was not changed.")
    sys.exit(1)

if len(all_raw_data) >= params["maxresults"]:
    print("Warning: response reached the requested limit. The dataset may be truncated; national coverage is not verified.")

processed_stations = []

for item in all_raw_data:
    address_info = item.get("AddressInfo", {}) or {}
    operator_info = item.get("OperatorInfo", {}) or {}
    connections = item.get("Connections", []) or []

    parsed_connections = []
    is_dc_fast = False

    for conn in connections:
        conn_type = (conn.get("ConnectionType") or {}).get("Title") or "Unknown Plug"
        kw_output = conn.get("PowerKW")
        if kw_output and kw_output >= 50:
            is_dc_fast = True
        parsed_connections.append({"title": conn_type, "power_kw": kw_output})

    operator_title = operator_info.get("Title") or "Independent / Unknown"
    if operator_title.lower() in ["(unknown operator)", "unknown operator"]:
        operator_title = "Independent / Unknown"

    station = {
        "id": item.get("ID"),
        "title": address_info.get("Title", "EV Charging Station"),
        "address": address_info.get("AddressLine1", ""),
        "town": address_info.get("Town", "Philippines"),
        "state": address_info.get("StateOrProvince", ""),
        "latitude": address_info.get("Latitude"),
        "longitude": address_info.get("Longitude"),
        "operator": operator_title,
        "is_dc_fast": is_dc_fast,
        "connections": parsed_connections,
    }

    lat, lng = station["latitude"], station["longitude"]
    if (isinstance(lat, (int, float)) and not isinstance(lat, bool)
            and isinstance(lng, (int, float)) and not isinstance(lng, bool)
            and -90 <= lat <= 90 and -180 <= lng <= 180):
        processed_stations.append(station)

if not processed_stations:
    print("Ingestion failed: no valid station coordinates. Existing dataset was not changed.")
    sys.exit(1)

os.makedirs("data", exist_ok=True)
temporary_path = None
try:
    with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", dir="data", suffix=".tmp", delete=False) as f:
        temporary_path = f.name
        json.dump(processed_stations, f, indent=2, ensure_ascii=False, allow_nan=False)
    os.replace(temporary_path, "data/ph_stations.json")
finally:
    if temporary_path and os.path.exists(temporary_path):
        os.remove(temporary_path)

print(f"Done! Saved {len(processed_stations)} charging stations in the current dataset to 'data/ph_stations.json'.")
