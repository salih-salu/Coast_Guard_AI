# Coastguard API

This FastAPI application provides coastal safety information backed by PostgreSQL.
Start it with `uvicorn app.main:app --reload` and open `/docs` for the interactive
API documentation. Configure the database with `DB_HOST`, `DB_PORT`, `DB_NAME`,
`DB_USER`, and `DB_PASSWORD` environment variables.

## Chat

Send a message to `POST /chat`:

```json
{
  "message": "What's the weather in Kochi?"
}
```

The response contains a human-readable `reply`, the detected `intent`, and
structured `data`. The chat endpoint answers questions about live weather,
active official alerts, open shelters with available space, safety precautions,
and emergency contacts. It is read-only and uses database records for locations
and safety information. General hazard-preparedness questions can also retrieve
passages from the local safety guide in `knowledge_base/`. For immediate danger,
call 112.

Weather is fetched live from [Open-Meteo](https://open-meteo.com/). The existing
`GET /weather?location_id=<id>` endpoint also uses this service. For chatbot
weather requests, provide a city or district in the message. The chatbot first
uses coordinates from the `locations` table and, if the place is not stored
there, resolves it with Open-Meteo's geocoding service before fetching current
weather. If no place is given, it asks for one; the API does not automatically
access a user's device location.

### Local language model

Chat understanding and replies use Ollama and `gemma3:latest` locally; there is
no hosted LLM API key or per-request API token charge. The model classifies the
question and extracts its topic and location. The API then retrieves relevant
PostgreSQL records (and live weather where requested) and asks the model to
answer database questions using only those results. For disaster-safety
questions, a lightweight BM25 text retriever selects relevant sections from
Markdown files in `knowledge_base/`; Ollama answers using those passages and
the API returns their source metadata in `sources`. This is document-based RAG,
not vector search, and does not require a separate vector database. To add a
guide, create a Markdown file in `knowledge_base/` with metadata and `##`
section headings, for example:

```markdown
---
title: "Local evacuation guide"
source: "https://example.gov/evacuation"
updated: "2026-01-01"
status: "Draft - verify before operational use"
---

## Evacuation steps

Put the guidance for this topic here.
```

The retriever caches documents after first use, so restart the API after
changing them. Review all safety guidance and its sources before using it
operationally. Live weather replies are returned directly from Open-Meteo's
current conditions. Ollama must be running when the API handles a chat request.

Install [Ollama](https://ollama.com/download), then download the default model:

```powershell
ollama pull gemma3:latest
```

By default, the model uses an 8,192-token context window and generates up to 512
tokens per reply. Chat messages are limited to 1,000 characters, and database
lookups return at most five records. These are practical context and output
limits—not hosted API quotas—and can be adjusted with `OLLAMA_NUM_CTX` and
`OLLAMA_NUM_PREDICT`. A model's context window and the computer's available
memory still impose limits; no LLM has unlimited context. To use another model
or Ollama server, set `OLLAMA_MODEL` or `OLLAMA_BASE_URL`. If Ollama is stopped
or the selected model is missing, `POST /chat` returns HTTP 503; no API-key
fallback is configured.
