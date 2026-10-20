import contextlib
import io
import json
import os
from pathlib import Path
import runpy
import tempfile
import unittest
from unittest.mock import Mock, patch

import requests

SCRIPT = Path(__file__).resolve().parents[1] / "ingest.py"


class IngestionTests(unittest.TestCase):
    def run_ingestion(self, payload=None, failure=None):
        with tempfile.TemporaryDirectory(dir=SCRIPT.parent) as directory:
            previous = Path.cwd()
            os.chdir(directory)
            try:
                output = Path("data/ph_stations.json")
                output.parent.mkdir()
                original = '[{"id": "preserved-snapshot"}]'
                output.write_text(original, encoding="utf-8")
                response = Mock()
                response.json.return_value = payload
                response.raise_for_status.side_effect = failure
                log = io.StringIO()
                with patch("requests.get", return_value=response) as get, patch("dotenv.load_dotenv"), patch.dict(os.environ, {"OPENCHARGEMAP_API_KEY": ""}), contextlib.redirect_stdout(log):
                    try:
                        runpy.run_path(str(SCRIPT), run_name="__main__")
                        exit_code = 0
                    except SystemExit as error:
                        exit_code = error.code
                self.assertEqual(get.call_args.kwargs["params"]["maxresults"], 250)
                return exit_code, json.loads(output.read_text(encoding="utf-8")), log.getvalue()
            finally:
                os.chdir(previous)

    def test_http_failure_preserves_previous_dataset(self):
        code, data, _ = self.run_ingestion(failure=requests.HTTPError("503"))
        self.assertEqual(code, 1)
        self.assertEqual(data, [{"id": "preserved-snapshot"}])

    def test_empty_and_unexpected_responses_preserve_previous_dataset(self):
        for payload in ([], {"error": "unexpected response"}):
            with self.subTest(payload=payload):
                code, data, _ = self.run_ingestion(payload)
                self.assertEqual(code, 1)
                self.assertEqual(data, [{"id": "preserved-snapshot"}])

    def test_success_preserves_unknowns_and_rejects_invalid_coordinates(self):
        payload = [{"ID": 1, "AddressInfo": {"Latitude": 14.55, "Longitude": 121.05}, "Connections": [{"PowerKW": 120}]}, {"ID": 2, "AddressInfo": {"Latitude": 120, "Longitude": 121}}]
        code, data, _ = self.run_ingestion(payload)
        self.assertEqual(code, 0)
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]["connections"][0]["title"], "Unknown Plug")
        self.assertTrue(data[0]["is_dc_fast"])

    def test_limit_saturation_warns_about_truncation(self):
        payload = [{"ID": i, "AddressInfo": {"Latitude": 14.55, "Longitude": 121.05}} for i in range(250)]
        code, data, log = self.run_ingestion(payload)
        self.assertEqual(code, 0)
        self.assertEqual(len(data), 250)
        self.assertIn("may be truncated", log)


if __name__ == "__main__":
    unittest.main()
