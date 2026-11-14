import unittest
from unittest.mock import Mock, patch

from app import config
from app.services import llm_service


class LLMServiceTests(unittest.TestCase):
    @patch("app.services.llm_service.httpx.post")
    def test_classifies_natural_language_question(self, post):
        response = Mock()
        response.json.return_value = {
            "message": {
                "content": '{"intent":"shelters","location":"Kochi","hazard":null}'
            }
        }
        post.return_value = response

        classification = llm_service.classify_message(
            "My family needs somewhere safe to stay in Kochi."
        )

        self.assertEqual(
            classification,
            {"intent": "shelters", "location": "Kochi", "hazard": None},
        )
        self.assertEqual(
            post.call_args.kwargs["json"]["format"],
            llm_service.CLASSIFICATION_SCHEMA,
        )

    @patch("app.services.llm_service.httpx.post")
    def test_rejects_invalid_classification(self, post):
        response = Mock()
        response.json.return_value = {
            "message": {"content": '{"intent":"make_things_up","location":null}'}
        }
        post.return_value = response

        with self.assertRaises(ValueError):
            llm_service.classify_message("Tell me about things.")

    @patch("app.services.llm_service.httpx.post")
    def test_classifies_general_safety_questions_as_knowledge(self, post):
        response = Mock()
        response.json.return_value = {
            "message": {
                "content": '{"intent":"knowledge","location":null,"hazard":null}'
            }
        }
        post.return_value = response

        classification = llm_service.classify_message(
            "What should I pack before cyclone season?"
        )

        self.assertEqual(classification["intent"], "knowledge")

    @patch("app.services.llm_service.httpx.post")
    def test_generates_reply_with_local_model_and_grounding(self, post):
        response = Mock()
        response.json.return_value = {"message": {"content": "There is a red alert."}}
        post.return_value = response

        reply = llm_service.generate_reply(
            "Any alerts?",
            "alerts",
            [{"title": "Coastal warning", "alert_level": "red"}],
        )

        self.assertEqual(reply, "There is a red alert.")
        args, kwargs = post.call_args
        self.assertEqual(args[0], f"{config.OLLAMA_BASE_URL}/api/chat")
        self.assertEqual(kwargs["json"]["model"], config.OLLAMA_MODEL)
        self.assertFalse(kwargs["json"]["stream"])
        self.assertEqual(
            kwargs["json"]["options"]["num_ctx"],
            config.OLLAMA_NUM_CTX,
        )
        self.assertIn(
            '"alert_level": "red"',
            kwargs["json"]["messages"][1]["content"],
        )

    @patch("app.services.llm_service.httpx.post")
    def test_rejects_empty_model_reply(self, post):
        response = Mock()
        response.json.return_value = {"message": {"content": "  "}}
        post.return_value = response

        with self.assertRaises(ValueError):
            llm_service.generate_reply("Hi", "greeting", None)


if __name__ == "__main__":
    unittest.main()
