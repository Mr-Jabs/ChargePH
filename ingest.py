import json
import os
import requests
from dotenv import load_dotenv
load_dotenv()


# Set API URL for Open Charge Map (Philippine POIs)
API_URL = "https://api.openchargemap.io/v3/poi/"
API_KEY = os.getenv("OPENCHARGEMAP_API_KEY", "")

params = {
    "output": "json",
    "countrycode": "PH",
    "maxresults": 200,
    "compact": "true",
    "verbose": "false",
}

headers = {}
if API_KEY:
    headers["X-API-Key"] = API_KEY

print("Fetching Philippine EV charging station data...")
response = requests.get(API_URL, params=params, headers=headers)

if response.status_code != 200:
    print(f"Failed to fetch data: HTTP {response.status_code}")
    exit(1)

raw_data = response.json()
print(f"Retrieved {len(raw_data)} raw records.")

# Parse and clean station records
processed_stations = []

for item in raw_data:
    address_info = item.get("AddressInfo", {})
    operator_info = item.get("OperatorInfo", {}) or {}
    connections = item.get("Connections", []) or []

    # Format connections/plugs list
    parsed_connections = []
    is_dc_fast = False

    for conn in connections:
        conn_type = conn.get("ConnectionType", {}).get("Title", "Unknown Plug")
        kw_output = conn.get("PowerKW")
        level_info = conn.get("Level", {}).get("Title", "")

        if kw_output and kw_output >= 50:
            is_dc_fast = True

        parsed_connections.append(
            {
                "title": conn_type,
                "power_kw": kw_output,
                "level": level_info,
            }
        )

    station = {
        "id": item.get("ID"),
        "title": address_info.get("Title", "EV Charging Station"),
        "address": address_info.get("AddressLine1", ""),
        "town": address_info.get("Town", "Philippines"),
        "state": address_info.get("StateOrProvince", ""),
        "latitude": address_info.get("Latitude"),
        "longitude": address_info.get("Longitude"),
        "operator": operator_info.get("Title", "Independent / Unknown"),
        "usage_type": item.get("UsageType", {}).get(
            "Title", "Public Access"
        ),
        "is_dc_fast": is_dc_fast,
        "connections": parsed_connections,
    }

    if station["latitude"] and station["longitude"]:
        processed_stations.append(station)

# Create data output directory if it doesn't exist
os.makedirs("data", exist_ok=True)
output_path = "data/ph_stations.json"

with open(output_path, "w", encoding="utf-8") as f:
    json.dump(processed_stations, f, indent=2, ensure_ascii=False)

print(
    f"Successfully processed {len(processed_stations)} stations and saved to '{output_path}'!"
)