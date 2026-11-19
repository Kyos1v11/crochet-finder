
import { useState } from "react";
import "./App.css";

const categories = [
  { name: "Personnages", emoji: "🧸", description: "Anime, jeux vidéo, dessins animés..." },
  { name: "Animaux", emoji: "🐱", description: "Chats, chiens, animaux fantastiques..." },
  { name: "Fleurs et plantes", emoji: "🌸", description: "Bouquets, cactus, plantes..." },
  { name: "Décorations", emoji: "🏡", description: "Halloween, Noël, décoration..." },
  { name: "Accessoires", emoji: "👜", description: "Sacs, vêtements, bijoux..." },
  { name: "Autres créations", emoji: "🧶", description: "Tout ce qui peut être crocheté !" },
];

function App() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [videos, setVideos] = useState([]);
  const [webResults, setWebResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState("");
  const [webError, setWebError] = useState("");

  async function handleSearch(e) {
    e.preventDefault();

    const query = search.trim();

    if (!query) {
      setError("Écris ce que tu souhaites crocheter !");
      setSearched(false);
      return;
    }

    setLoading(true);
    setSearched(true);
    setError("");
    setWebError("");
    setVideos([]);
    setWebResults([]);

    const encodedQuery = encodeURIComponent(query);

    const [youtubeResult, webResult] = await Promise.allSettled([
      fetch(`/api/search?q=${encodedQuery}`).then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Erreur YouTube.");
        return data.videos || [];
      }),

      fetch(`/api/web-search?q=${encodedQuery}`).then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Erreur Tavily.");
        return data.results || [];
      }),
    ]);

    if (youtubeResult.status === "fulfilled") {
      setVideos(youtubeResult.value);
    } else {
      setError(youtubeResult.reason.message || "Erreur YouTube.");
    }

    if (webResult.status === "fulfilled") {
      setWebResults(webResult.value);
    } else {
      setWebError(webResult.reason.message || "Erreur de recherche Web.");
    }

    if (
      youtubeResult.status === "rejected" &&
      webResult.status === "rejected"
    ) {
      setError("Impossible de récupérer les résultats. Vérifie les clés API.");
    }

    setLoading(false);
  }

  function chooseCategory(name) {
    setCategory(name);
    setSearch(name);
    setSearched(false);
    setVideos([]);
    setWebResults([]);
    setError("");
    setWebError("");

    document.getElementById("recherche")?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }

  function resetSearch() {
    setSearch("");
    setCategory("");
    setVideos([]);
    setWebResults([]);
    setSearched(false);
    setError("");
    setWebError("");
  }

  return (
    <div className="app">
      <header className="navbar">
        <a className="logo" href="#">
          <span className="logo-icon">🧶</span>
          Crochet<span className="logo-accent">Finder</span>
        </a>

        <nav>
          <a href="#recherche">Recherche</a>
          <a href="#categories">Catégories</a>
          <a href="#apropos">À propos</a>
        </nav>

        <a className="favorites-button" href="#categories">
          🧵 <span>Explorer</span>
        </a>
      </header>

      <main>
        <section className="hero" id="recherche">
          <span className="decoration-one">✿</span>
          <span className="decoration-two">❀</span>

          <div className="hero-content">
            <span className="eyebrow">
              LE MONDE DU CROCHET À PORTÉE DE MAIN
            </span>

            <h1>
              Trouve ton prochain
              <br />
              <span>projet crochet.</span>
            </h1>

            <p>
              Un personnage, un animal, une fleur ou une idée originale ?
              Trouve des tutoriels pour donner vie à tes envies.
            </p>

            <form className="search-box" onSubmit={handleSearch}>
              <span className="search-icon">⌕</span>

              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setSearched(false);
                  setVideos([]);
                  setWebResults([]);
                  setError("");
                  setWebError("");
                  setCategory("");
                }}
                placeholder="Ex : Pikachu, petit chat, bouquet de fleurs..."
                aria-label="Que souhaites-tu crocheter ?"
              />

              <button type="submit" disabled={loading}>
                {loading ? "Recherche..." : "Rechercher →"}
              </button>
            </form>

            <div className="popular-searches">
              <span>Idées :</span>

              {["Pikachu", "Chat", "Fleur", "Sac"].map((idea) => (
                <button
                  type="button"
                  key={idea}
                  onClick={() => {
                    setSearch(idea);
                    setCategory("");
                    setSearched(false);
                    setVideos([]);
                    setWebResults([]);
                    setError("");
                    setWebError("");
                  }}
                >
                  {idea}
                </button>
              ))}
            </div>
          </div>

          <div className="hero-art">
            <div className="art-circle"></div>

            <div className="art-card">
              <span className="art-label">FAIT AVEC AMOUR</span>
              <div className="art-emoji">🧸</div>

              <div className="art-caption">
                <span>Une idée, une création</span>
                <span>♡</span>
              </div>
            </div>

            <span className="floating-flower flower-one">✿</span>
            <span className="floating-flower flower-two">❀</span>
          </div>
        </section>

        {searched && (
          <section className="results-section">
            <div className="section-heading">
              <div>
                <span className="eyebrow">TES RÉSULTATS</span>
                <h2>Les tutoriels trouvés</h2>
                <p>
                  Recherche pour : <strong>{search}</strong>
                </p>
              </div>

              <button type="button" onClick={resetSearch}>
                Nouvelle recherche ×
              </button>
            </div>

            {loading && (
              <div className="loading-message">
                <span>🧶</span>
                Recherche des meilleurs tutoriels...
              </div>
            )}

            {!loading && (
              <>
                <div className="result-group">
                  <div className="result-group-heading">
                    <h2>▶ Tutoriels vidéo</h2>
                    <span>YouTube</span>
                  </div>

                  {error && <p className="search-message">{error}</p>}

                  {!error && videos.length === 0 && (
                    <p className="search-message">
                      Aucun tutoriel vidéo trouvé.
                    </p>
                  )}

                  {videos.length > 0 && (
                    <>
                      <p className="results-count">
                        {videos.length} vidéos trouvées
                      </p>

                      <div className="results-grid">
                        {videos.map((video) => (
                          <a
                            className="result-card"
                            key={video.id}
                            href={video.url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <div className="result-thumbnail">
                              <img
                                src={video.thumbnail}
                                alt=""
                                loading="lazy"
                              />
                              <span className="video-play">▶</span>
                            </div>

                            <div className="result-info">
                              <span className="result-platform">▶ YOUTUBE</span>
                              <h3>{video.title}</h3>
                              <p>{video.channel}</p>
                              <span className="result-link">
                                Voir le tutoriel ↗
                              </span>
                            </div>
                          </a>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                <div className="result-group">
                  <div className="result-group-heading">
                    <h2>🌐 Tutoriels sur le Web</h2>
                    <span>Sites et blogs</span>
                  </div>

                  {webError && <p className="search-message">{webError}</p>}

                  {!webError && webResults.length === 0 && (
                    <p className="search-message">
                      Aucun résultat Web trouvé.
                    </p>
                  )}

                  {webResults.length > 0 && (
                    <>
                      <p className="results-count">
                        {webResults.length} pages trouvées
                      </p>

                      <div className="results-grid">
                        {webResults.map((result) => (
                          <a
                            className="result-card web-result-card"
                            key={result.id || result.url}
                            href={result.url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {result.image ? (
                              <div className="result-thumbnail web-result-thumbnail">
                                <img
                                  src={result.image}
                                  alt={result.title || "Image du tutoriel"}
                                  loading="lazy"
                                  referrerPolicy="no-referrer"
                                  onError={(e) => {
                                    e.currentTarget.style.display = "none";
                                    e.currentTarget.parentElement.classList.add(
                                      "image-unavailable"
                                    );
                                  }}
                                />
                              </div>
                            ) : (
                              <div className="result-thumbnail web-image-placeholder">
                                <span>🧶</span>
                              </div>
                            )}

                            <div className="result-info">
                              <span className="result-platform">
                                🌐 TUTORIEL WEB
                              </span>

                              <h3>{result.title}</h3>
                              <p>{result.content}</p>

                              <span className="result-link">
                                Visiter le site ↗
                              </span>
                            </div>
                          </a>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
          </section>
        )}

        <section className="categories-section" id="categories">
          <div className="section-heading">
            <div>
              <span className="eyebrow">
                LAISSE PARLER TON IMAGINATION
              </span>
              <h2>Que veux-tu créer ?</h2>
              <p>Choisis une catégorie pour commencer ton exploration.</p>
            </div>

            <span className="heading-decoration">✿</span>
          </div>

          <div className="category-grid">
            {categories.map((item) => (
              <button
                className={`category-card ${
                  category === item.name ? "selected" : ""
                }`}
                key={item.name}
                onClick={() => chooseCategory(item.name)}
              >
                <span className="category-emoji">{item.emoji}</span>
                <span className="category-name">{item.name}</span>
                <span className="category-description">
                  {item.description}
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="inspiration-section" id="apropos">
          <div className="inspiration-icon">🧶</div>

          <div>
            <span className="eyebrow">LE BON ENDROIT</span>
            <h2>À chaque idée son tutoriel.</h2>
            <p>
              Des personnages aux petites créations du quotidien,
              explore un monde rempli d'inspiration.
            </p>
          </div>
        </section>
      </main>

      <footer>
        <a className="logo footer-logo" href="#">
          🧶 Crochet<span className="logo-accent">Finder</span>
        </a>

        <span>Fait avec ♡ pour les passionnés de crochet.</span>
      </footer>
    </div>
  );
}

export default App;
