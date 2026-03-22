"""
42-Dimension Emotion Taxonomy for the Holographic Spirograph.

Each input (text, image, name) gets scored on all 42 dimensions (0-1).
The scores drive the spirograph's shape, color, and behavior.

Taxonomy:
  Primary (8):      joy, sadness, anger, fear, surprise, disgust, trust, anticipation
  Secondary (12):   nostalgia, awe, serenity, melancholy, tenderness, excitement,
                    tension, playfulness, longing, pride, shame, curiosity
  Relational (10):  love, intimacy, belonging, isolation, empathy, reverence,
                    gratitude, devotion, vulnerability, connection
  Experiential (6): wonder, transcendence, bittersweetness, hope, grief, ecstasy
  Aesthetic (6):    warmth, coldness, complexity, intensity, fragility, grandeur
"""

# Ordered list of all 42 emotion dimensions
EMOTIONS = [
    # Primary (8)
    "joy", "sadness", "anger", "fear", "surprise", "disgust", "trust", "anticipation",
    # Secondary (12)
    "nostalgia", "awe", "serenity", "melancholy", "tenderness", "excitement",
    "tension", "playfulness", "longing", "pride", "shame", "curiosity",
    # Relational (10)
    "love", "intimacy", "belonging", "isolation", "empathy", "reverence",
    "gratitude", "devotion", "vulnerability", "connection",
    # Experiential (6)
    "wonder", "transcendence", "bittersweetness", "hope", "grief", "ecstasy",
    # Aesthetic (6)
    "warmth", "coldness", "complexity", "intensity", "fragility", "grandeur",
]

NUM_EMOTIONS = len(EMOTIONS)  # 42
EMOTION_INDEX = {name: i for i, name in enumerate(EMOTIONS)}

# --- Mapping from GoEmotions (27 labels) to our 42 dimensions ---
# GoEmotions labels: admiration, amusement, anger, annoyance, approval, caring,
# confusion, curiosity, desire, disappointment, disapproval, disgust, embarrassment,
# excitement, fear, gratitude, grief, joy, love, nervousness, optimism, pride,
# realization, relief, remorse, sadness, surprise
#
# Each GoEmotions label maps to one or more of our 42 dims with weights.
# This lets us bootstrap training from the GoEmotions dataset.

GOEMOTIONS_MAP = {
    "admiration":     {"awe": 0.5, "reverence": 0.4, "warmth": 0.3, "trust": 0.2},
    "amusement":      {"joy": 0.5, "playfulness": 0.6, "warmth": 0.2},
    "anger":          {"anger": 0.9, "intensity": 0.5, "tension": 0.4},
    "annoyance":      {"anger": 0.4, "tension": 0.3, "disgust": 0.2},
    "approval":       {"trust": 0.5, "warmth": 0.3, "connection": 0.2},
    "caring":         {"tenderness": 0.6, "empathy": 0.5, "love": 0.3, "warmth": 0.4},
    "confusion":      {"curiosity": 0.3, "tension": 0.2, "complexity": 0.3},
    "curiosity":      {"curiosity": 0.8, "anticipation": 0.3, "wonder": 0.2},
    "desire":         {"longing": 0.6, "anticipation": 0.4, "intensity": 0.3},
    "disappointment": {"sadness": 0.4, "melancholy": 0.3, "trust": -0.2},
    "disapproval":    {"disgust": 0.3, "anger": 0.2, "coldness": 0.3},
    "disgust":        {"disgust": 0.8, "coldness": 0.3, "intensity": 0.2},
    "embarrassment":  {"shame": 0.6, "vulnerability": 0.4, "tension": 0.3},
    "excitement":     {"excitement": 0.8, "joy": 0.3, "anticipation": 0.4, "intensity": 0.3},
    "fear":           {"fear": 0.8, "tension": 0.5, "vulnerability": 0.3},
    "gratitude":      {"gratitude": 0.8, "warmth": 0.4, "trust": 0.3, "connection": 0.3},
    "grief":          {"grief": 0.8, "sadness": 0.6, "vulnerability": 0.4, "fragility": 0.3},
    "joy":            {"joy": 0.8, "warmth": 0.4, "ecstasy": 0.2},
    "love":           {"love": 0.8, "intimacy": 0.4, "warmth": 0.5, "devotion": 0.3, "connection": 0.4},
    "nervousness":    {"fear": 0.3, "tension": 0.5, "anticipation": 0.3, "vulnerability": 0.2},
    "optimism":       {"hope": 0.7, "anticipation": 0.4, "warmth": 0.3, "joy": 0.2},
    "pride":          {"pride": 0.8, "joy": 0.3, "grandeur": 0.2},
    "realization":    {"surprise": 0.4, "wonder": 0.3, "curiosity": 0.2},
    "relief":         {"serenity": 0.5, "joy": 0.3, "trust": 0.2},
    "remorse":        {"shame": 0.4, "sadness": 0.3, "vulnerability": 0.3, "grief": 0.2},
    "sadness":        {"sadness": 0.8, "melancholy": 0.4, "fragility": 0.3},
    "surprise":       {"surprise": 0.8, "wonder": 0.3, "intensity": 0.2},
}

# --- Synthetic expansion for dimensions not covered by GoEmotions ---
# These are keyword-based seed mappings used to generate synthetic training data
# from text corpora (poetry, literature, songs).

SYNTHETIC_SEEDS = {
    "nostalgia":      ["remember", "childhood", "once upon", "used to", "those days",
                       "looking back", "memories", "old photos", "hometown"],
    "serenity":       ["calm", "peace", "still", "quiet", "gentle", "soft breeze",
                       "meditation", "tranquil", "zen"],
    "melancholy":     ["bittersweet", "wistful", "pensive", "cloudy", "autumn",
                       "fading", "twilight", "distant"],
    "tenderness":     ["gentle", "soft", "careful", "delicate", "nurture",
                       "caress", "cradle", "warm embrace"],
    "playfulness":    ["silly", "fun", "giggle", "dance", "skip", "joke",
                       "game", "tickle", "mischief"],
    "longing":        ["miss", "yearn", "ache", "far away", "wish you were",
                       "someday", "reach for", "distant"],
    "belonging":      ["home", "family", "together", "community", "us",
                       "part of", "welcome", "tribe"],
    "isolation":      ["alone", "lonely", "separated", "abandoned", "empty room",
                       "silence", "nobody", "forgotten"],
    "empathy":        ["understand", "feel your", "walk in shoes", "heart goes out",
                       "share your", "I know how", "compassion"],
    "reverence":      ["sacred", "holy", "divine", "worship", "bow", "awe",
                       "magnificent", "eternal"],
    "devotion":       ["always", "forever", "faithful", "dedicate", "commit",
                       "never leave", "loyal", "unwavering"],
    "vulnerability":  ["exposed", "open", "raw", "honest", "bare", "fragile",
                       "trust you", "let you in"],
    "connection":     ["bond", "link", "together", "intertwined", "resonance",
                       "kindred", "chemistry", "sync"],
    "wonder":         ["amazing", "incredible", "magical", "breathtaking",
                       "how is this", "unbelievable", "miraculous"],
    "transcendence":  ["beyond", "infinite", "cosmic", "spiritual", "enlighten",
                       "dissolve", "universe", "oneness"],
    "bittersweetness": ["happy sad", "smile through tears", "joy and pain",
                        "beautiful ache", "letting go", "growth through loss"],
    "hope":           ["someday", "better tomorrow", "light at end", "believe",
                       "possible", "dream", "sunrise"],
    "ecstasy":        ["bliss", "euphoria", "rapture", "overwhelming joy",
                       "peak", "transcendent pleasure"],
    "warmth":         ["warm", "cozy", "sunny", "golden", "fireplace",
                       "embrace", "blanket", "glow"],
    "coldness":       ["cold", "ice", "frost", "distant", "clinical",
                       "sterile", "sharp", "bleak"],
    "complexity":     ["intricate", "layered", "multifaceted", "nuanced",
                       "tangled", "elaborate", "woven"],
    "intensity":      ["fierce", "burning", "overwhelming", "powerful",
                       "explosive", "electric", "consuming"],
    "fragility":      ["delicate", "thin", "brittle", "glass", "whisper",
                       "trembling", "gossamer", "fleeting"],
    "grandeur":       ["vast", "magnificent", "epic", "sweeping", "towering",
                       "monumental", "cathedral", "ocean"],
}


def get_emotion_names():
    """Return the ordered list of all 42 emotion names."""
    return EMOTIONS.copy()


def goemotions_to_42(goemotions_scores: dict) -> list:
    """
    Convert GoEmotions 27-label scores to our 42-dimension vector.

    Args:
        goemotions_scores: dict mapping GoEmotions label names to scores (0-1)

    Returns:
        list of 42 floats, one per emotion dimension
    """
    result = [0.0] * NUM_EMOTIONS

    for ge_label, score in goemotions_scores.items():
        mapping = GOEMOTIONS_MAP.get(ge_label, {})
        for our_dim, weight in mapping.items():
            idx = EMOTION_INDEX.get(our_dim)
            if idx is not None:
                result[idx] += score * weight

    # Clamp to [0, 1]
    result = [max(0.0, min(1.0, v)) for v in result]
    return result
