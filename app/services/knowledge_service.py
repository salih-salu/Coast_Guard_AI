import math
import re
from collections import Counter
from functools import lru_cache
from pathlib import Path

TOKEN_PATTERN = re.compile(r"[a-z0-9]+")
SECTION_PATTERN = re.compile(r"(?m)^##\s+(.+?)\s*$")
FRONT_MATTER_PATTERN = re.compile(r"\A---\r?\n(.*?)\r?\n---\r?\n", re.DOTALL)
STOP_WORDS = {
    "about",
    "and",
    "are",
    "can",
    "could",
    "do",
    "does",
    "for",
    "from",
    "how",
    "in",
    "is",
    "it",
    "me",
    "my",
    "of",
    "on",
    "or",
    "our",
    "should",
    "tell",
    "the",
    "their",
    "there",
    "this",
    "to",
    "what",
    "when",
    "where",
    "with",
    "would",
    "you",
}


def _tokens(text: str) -> list[str]:
    return [
        token
        for token in TOKEN_PATTERN.findall(text.casefold())
        if len(token) > 2 and token not in STOP_WORDS
    ]


def _metadata(front_matter: str) -> dict[str, str]:
    metadata = {}
    for line in front_matter.splitlines():
        key, separator, value = line.partition(":")
        if separator:
            metadata[key.strip()] = value.strip().strip("\"'")
    return metadata


@lru_cache(maxsize=1)
def _load_sections() -> tuple[dict[str, str], ...]:
    knowledge_dir = Path(__file__).resolve().parents[2] / "knowledge_base"
    sections = []
    for path in sorted(knowledge_dir.glob("*.md")):
        content = path.read_text(encoding="utf-8")
        front_matter_match = FRONT_MATTER_PATTERN.match(content)
        metadata = _metadata(front_matter_match.group(1)) if front_matter_match else {}
        body = content[front_matter_match.end() :] if front_matter_match else content
        headings = list(SECTION_PATTERN.finditer(body))
        for index, heading in enumerate(headings):
            section_end = (
                headings[index + 1].start() if index + 1 < len(headings) else len(body)
            )
            text = body[heading.end() : section_end].strip()
            if text:
                sections.append(
                    {
                        "title": metadata.get("title", path.stem),
                        "section": heading.group(1).strip(),
                        "source": metadata.get("source", ""),
                        "updated": metadata.get("updated", ""),
                        "status": metadata.get("status", "draft"),
                        "content": text,
                    }
                )
    return tuple(sections)


def retrieve(query: str, limit: int = 3) -> list[dict[str, str]]:
    query_terms = _tokens(query)
    if not query_terms or limit <= 0:
        return []

    sections = _load_sections()
    if not sections:
        return []

    document_terms = [
        Counter(_tokens(f"{section['section']} {section['content']}"))
        for section in sections
    ]
    document_frequencies = Counter(
        term for terms in document_terms for term in terms.keys()
    )
    average_length = sum(sum(terms.values()) for terms in document_terms) / len(
        document_terms
    )
    query_frequencies = Counter(query_terms)
    ranked = []

    for section, terms in zip(sections, document_terms):
        length = sum(terms.values())
        score = 0.0
        for term, query_frequency in query_frequencies.items():
            frequency = terms.get(term, 0)
            if not frequency:
                continue
            frequency_in_documents = document_frequencies[term]
            inverse_document_frequency = math.log(
                1
                + (len(sections) - frequency_in_documents + 0.5)
                / (frequency_in_documents + 0.5)
            )
            denominator = frequency + 1.5 * (
                1 - 0.75 + 0.75 * length / average_length
            )
            score += (
                query_frequency
                * inverse_document_frequency
                * frequency
                * 2.5
                / denominator
            )
        if score > 0:
            ranked.append((score, section))

    ranked.sort(key=lambda result: result[0], reverse=True)
    return [
        {"reference": str(index), **section}
        for index, (_, section) in enumerate(ranked[:limit], start=1)
    ]
