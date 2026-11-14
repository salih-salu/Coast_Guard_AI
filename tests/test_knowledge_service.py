import unittest

from app.services import knowledge_service


class KnowledgeServiceTests(unittest.TestCase):
    def test_retrieves_relevant_safety_sections_with_source_metadata(self):
        results = knowledge_service.retrieve(
            "What should I do before a cyclone?", limit=2
        )

        self.assertTrue(results)
        self.assertEqual(results[0]["section"], "Cyclone and severe storm")
        self.assertEqual(results[0]["reference"], "1")
        self.assertEqual(results[0]["source"], "https://sdma.kerala.gov.in/")
        self.assertIn("Draft", results[0]["status"])
        self.assertIn("evacuation", results[0]["content"].casefold())

    def test_returns_no_passages_for_unmatched_query(self):
        self.assertEqual(
            knowledge_service.retrieve("Explain quantum entanglement"),
            [],
        )

    def test_returns_no_passages_for_empty_query_or_nonpositive_limit(self):
        self.assertEqual(knowledge_service.retrieve("the and of"), [])
        self.assertEqual(knowledge_service.retrieve("cyclone", limit=0), [])


if __name__ == "__main__":
    unittest.main()
