import unittest
from unittest.mock import patch

from fastapi import HTTPException

from app.routers import chat
from app.schemas import ChatRequest
from app.services import weather_service


class ChatTests(unittest.TestCase):
    def setUp(self):
        llm_patch = patch(
            "app.routers.chat.llm_service.generate_reply",
            return_value="Local LLM reply",
        )
        self.generate_reply = llm_patch.start()
        self.addCleanup(llm_patch.stop)
        classification_patch = patch(
            "app.routers.chat.llm_service.classify_message",
            return_value={"intent": "help", "location": None, "hazard": None},
        )
        self.classify_message = classification_patch.start()
        self.addCleanup(classification_patch.stop)
        self.location = {
            "location_id": 1,
            "name": "Kochi",
            "district": "Ernakulam",
            "latitude": 9.93,
            "longitude": 76.27,
        }

    def test_greeting_does_not_query_database(self):
        self.classify_message.return_value = {
            "intent": "greeting",
            "location": None,
            "hazard": None,
        }
        with patch("app.routers.chat.fetch_one") as fetch_one:
            response = chat.chat(ChatRequest(message="Hello"))

        self.assertEqual(response["intent"], "greeting")
        self.assertEqual(response["reply"], "Local LLM reply")
        self.generate_reply.assert_called_once_with("Hello", "greeting", None)
        fetch_one.assert_not_called()

    @patch("app.routers.chat.weather_service.get_weather")
    @patch("app.routers.chat._find_location")
    def test_greeting_prefix_does_not_hide_weather_question(self, find_location, get_weather):
        self.classify_message.return_value = {
            "intent": "weather",
            "location": "Kochi",
            "hazard": None,
        }
        find_location.return_value = self.location
        get_weather.return_value = {
            "condition": "Clear sky",
            "temperature": 29,
            "temperature_unit": "°C",
            "wind_speed": None,
            "wind_speed_unit": "km/h",
        }

        response = chat.chat(ChatRequest(message="Hi, what's the weather in Kochi?"))

        self.assertEqual(response["intent"], "weather")
        self.assertIn("Current weather for Kochi, Ernakulam", response["reply"])
        self.generate_reply.assert_not_called()

    @patch("app.routers.chat.weather_service.get_weather")
    @patch("app.routers.chat.weather_service.geocode_location")
    @patch("app.routers.chat._find_location", return_value=None)
    def test_weather_geocodes_place_not_in_database(
        self, find_location, geocode_location, get_weather
    ):
        self.classify_message.return_value = {
            "intent": "weather",
            "location": "Kochi",
            "hazard": None,
        }
        geocoded_location = {
            "name": "Kochi",
            "district": "Kerala",
            "latitude": 9.93,
            "longitude": 76.27,
        }
        geocode_location.return_value = geocoded_location
        get_weather.return_value = {
            "condition": "Clear sky",
            "temperature": 29,
            "temperature_unit": "°C",
            "wind_speed": 12,
            "wind_speed_unit": "km/h",
        }

        response = chat.chat(ChatRequest(message="Current weather in Kochi"))

        self.assertEqual(response["data"]["source"], "Open-Meteo")
        self.assertEqual(response["data"]["weather"]["temperature"], 29)
        self.assertIn("Current weather for Kochi, Kerala", response["reply"])
        self.assertIn("Temperature: 29°C", response["reply"])
        find_location.assert_called_once_with("Kochi")
        geocode_location.assert_called_once_with("Kochi")
        get_weather.assert_called_once_with(geocoded_location)
        self.generate_reply.assert_not_called()

    @patch("app.routers.chat.weather_service.get_weather")
    @patch("app.routers.chat._find_location")
    def test_weather_response_includes_live_data(self, find_location, get_weather):
        self.classify_message.return_value = {
            "intent": "weather",
            "location": "Kochi",
            "hazard": None,
        }
        find_location.return_value = self.location
        get_weather.return_value = {
            "condition": "Clear sky",
            "temperature": 29,
            "temperature_unit": "°C",
            "wind_speed": 12,
            "wind_speed_unit": "km/h",
        }

        response = chat.chat(ChatRequest(message="Weather in Kochi"))

        self.assertEqual(response["intent"], "weather")
        self.assertEqual(response["data"]["source"], "Open-Meteo")
        self.assertIn("Current weather for Kochi, Ernakulam", response["reply"])
        self.assertIn("Wind: 12 km/h", response["reply"])
        self.generate_reply.assert_not_called()

    @patch("app.routers.chat._find_location", return_value=None)
    def test_weather_without_a_location_asks_a_question(self, find_location):
        self.classify_message.return_value = {
            "intent": "weather",
            "location": None,
            "hazard": None,
        }
        response = chat.chat(ChatRequest(message="What is the weather?"))

        self.assertIsNone(response["data"])
        self.assertEqual(
            response["reply"],
            "Which place or district do you need current weather for?",
        )
        self.generate_reply.assert_not_called()
        find_location.assert_not_called()

    @patch("app.routers.chat.fetch_all", return_value=[])
    @patch("app.routers.chat.fetch_one")
    def test_alerts_are_filtered_to_matched_district(self, find_location, fetch_all):
        self.classify_message.return_value = {
            "intent": "alerts",
            "location": "Kochi",
            "hazard": None,
        }
        find_location.return_value = self.location

        response = chat.chat(ChatRequest(message="Any active alerts in Kochi?"))

        self.assertEqual(response["intent"], "alerts")
        query, params = fetch_all.call_args.args
        self.assertIn("is_active = TRUE", query)
        self.assertIn("LOWER(affected_district) = LOWER(%s)", query)
        self.assertEqual(params, ("Ernakulam", 5))
        self.generate_reply.assert_called_once_with(
            "Any active alerts in Kochi?",
            "alerts",
            [],
        )

    @patch("app.routers.chat.knowledge_service.retrieve", return_value=[])
    @patch("app.routers.chat.fetch_all", return_value=[])
    def test_rain_precautions_are_not_mistaken_for_weather(
        self, fetch_all, retrieve
    ):
        self.classify_message.return_value = {
            "intent": "precautions",
            "location": None,
            "hazard": "rain",
        }
        response = chat.chat(ChatRequest(message="What precautions for heavy rain?"))

        self.assertEqual(response["intent"], "precautions")
        query, params = fetch_all.call_args.args
        self.assertIn("LOWER(hazard_type) LIKE %s", query)
        self.assertEqual(params, ("%rain%", 5))
        self.generate_reply.assert_called_once_with(
            "What precautions for heavy rain?",
            "precautions",
            {"database_precautions": [], "knowledge": []},
        )
        retrieve.assert_called_once_with("What precautions for heavy rain?")

    @patch(
        "app.routers.chat.knowledge_service.retrieve",
        return_value=[
            {
                "reference": "1",
                "title": "Coastal safety guide",
                "section": "Cyclone and severe storm",
                "source": "https://sdma.kerala.gov.in/",
                "updated": "2026-11-11",
                "status": "Draft",
                "content": "Follow official cyclone warnings and evacuation orders.",
            }
        ],
    )
    def test_knowledge_question_uses_retrieved_passages_and_returns_sources(
        self, retrieve
    ):
        self.classify_message.return_value = {
            "intent": "knowledge",
            "location": None,
            "hazard": None,
        }

        response = chat.chat(
            ChatRequest(message="What should I do before a cyclone?")
        )

        self.assertEqual(response["intent"], "knowledge")
        self.assertEqual(response["sources"][0]["reference"], "1")
        self.assertEqual(
            response["sources"][0]["section"],
            "Cyclone and severe storm",
        )
        self.generate_reply.assert_called_once()
        self.assertEqual(
            self.generate_reply.call_args.args[2]["knowledge"][0]["content"],
            "Follow official cyclone warnings and evacuation orders.",
        )
        retrieve.assert_called_once_with("What should I do before a cyclone?")

    def test_chat_reports_local_model_unavailable(self):
        self.classify_message.return_value = {
            "intent": "greeting",
            "location": None,
            "hazard": None,
        }
        self.generate_reply.side_effect = ValueError("Ollama not responding")

        with self.assertRaises(HTTPException) as raised:
            chat.chat(ChatRequest(message="Hello"))

        self.assertEqual(raised.exception.status_code, 503)

    @patch("app.routers.chat.weather_service.get_weather", side_effect=ValueError("bad response"))
    @patch("app.routers.chat._find_location")
    def test_weather_provider_failure_is_reported(self, find_location, get_weather):
        self.classify_message.return_value = {
            "intent": "weather",
            "location": "Kochi",
            "hazard": None,
        }
        find_location.return_value = self.location

        with self.assertRaises(HTTPException) as raised:
            chat.chat(ChatRequest(message="Weather in Kochi"))

        self.assertEqual(raised.exception.status_code, 503)
        get_weather.assert_called_once_with(self.location)

    @patch("app.services.weather_service.httpx.get")
    def test_weather_service_normalizes_provider_response(self, get):
        response = unittest.mock.Mock()
        response.json.return_value = {
            "current": {
                "time": "2026-11-10T12:00",
                "temperature_2m": 29,
                "weather_code": 0,
                "wind_speed_10m": 12,
            },
            "current_units": {
                "temperature_2m": "°C",
                "wind_speed_10m": "km/h",
            },
        }
        get.return_value = response

        result = weather_service.get_weather(self.location)

        get.assert_called_once()
        self.assertEqual(result["condition"], "Clear sky")
        self.assertEqual(result["temperature"], 29)

    @patch("app.services.weather_service.httpx.get")
    def test_geocodes_place_for_live_weather(self, get):
        response = unittest.mock.Mock()
        response.json.return_value = {
            "results": [
                {
                    "name": "Kochi",
                    "admin1": "Kerala",
                    "latitude": 9.93,
                    "longitude": 76.27,
                }
            ]
        }
        get.return_value = response

        location = weather_service.geocode_location("Kochi")

        self.assertEqual(
            location,
            {
                "name": "Kochi",
                "district": "Kerala",
                "latitude": 9.93,
                "longitude": 76.27,
            },
        )
        get.assert_called_once_with(
            weather_service.OPEN_METEO_GEOCODING_URL,
            params={"name": "Kochi", "count": 1, "language": "en", "format": "json"},
            timeout=10.0,
        )


if __name__ == "__main__":
    unittest.main()
