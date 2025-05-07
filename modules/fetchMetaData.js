const axios = require("axios");

// Fonction pour récupérer les infos d’un film depuis l’API TMDB
async function fetchMovieMetadata(query) {
  try {
    const apiKey = process.env.TMDB_API_KEY;

    // Requête vers TMDB pour chercher un film par titre
    const response = await axios.get(
      "https://api.themoviedb.org/3/search/movie",
      {
        params: {
          api_key: apiKey,
          query: query,
        },
      }
    );

    const movies = response.data.results; // Récupère tous les résultats
    if (!movies || movies.length === 0) return null;

    // Retourne un tableau d'objets pour chaque film
    return movies.map((movie) => ({
      title: movie.title,
      description: movie.overview,
      cover: `https://image.tmdb.org/t/p/w500${movie.poster_path}`,
      releaseDate: movie.release_date,
      author: [],
    }));
  } catch (error) {
    console.error("TMDB fetch error:", error.message);
    return null;
  }
}

// Fonction pour récupérer les infos d'une série par titre

async function fetchSerieMetaData(query) {
  try {
    const apiKey = process.env.TMDB_API_KEY;

    // Requête vers TMDB pour chercher une série par titre
    const response = await axios.get("https://api.themoviedb.org/3/search/tv", {
      params: {
        api_key: apiKey,
        query: query,
      },
    });

    const series = response.data.results; // Récupère tous les résultats
    if (!series || series.length === 0) return null;

    // Retourne un tableau d'objets pour chaque série
    return series.map((serie) => ({
      title: serie.name,
      description: serie.overview,
      cover: `https://image.tmdb.org/t/p/w500${serie.poster_path}`,
      releaseDate: serie.first_air_date,
      author: [], //
    }));
  } catch (error) {
    console.error("TMDB fetch error:", error.message);
    return null;
  }
}

// Fonction pour récupérer les infos d’un livre via Google Books
async function fetchBookMetadata(query) {
  try {
    const response = await axios.get(
      "https://www.googleapis.com/books/v1/volumes",
      {
        params: { q: query },
      }
    );

    const books = response.data.items;
    if (!books || books.length === 0) return null;

    // On mappe chaque livre pour extraire les informations
    return books.map((bookItem) => {
      const book = bookItem.volumeInfo;
      return {
        title: book.title,
        description: book.description || "",
        cover: book.imageLinks?.thumbnail || "",
        releaseDate: book.publishedDate || "",
        author: book.authors || [],
      };
    });
  } catch (error) {
    console.error("Google Books fetch error:", error.message);
    return null;
  }
}

// Fonction pour récupérer un album OU un single depuis iTunes
async function fetchMusicMetadata(query) {
  try {
    // Recherche un album
    let response = await axios.get("https://itunes.apple.com/search", {
      params: {
        term: query,
        media: "music",
        entity: "album",
        limit: 10,
      },
    });

    // Si aucun album trouvé, on essaie avec un single
    if (response.data.results.length === 0) {
      response = await axios.get("https://itunes.apple.com/search", {
        params: {
          term: query,
          media: "music",
          entity: "musicTrack",
          limit: 10,
        },
      });
    }

    // Si aucun résultat n'est trouvé pour l'album ou le single
    if (response.data.results.length === 0) return null;

    // Retourner tous les résultats (albums ou singles)
    const items = response.data.results.map((item) => ({
      title: item.collectionName || item.trackName || "Unknown",
      description: item.collectionCensoredName || "",
      cover: item.artworkUrl100
        ? item.artworkUrl100.replace("100x100", "500x500")
        : "",
      releaseDate: item.releaseDate || "",
      author: [item.artistName || "Unknown artist"],
    }));

    return items;
  } catch (error) {
    console.error("iTunes fetch error:", error.message);
    return null;
  }
}

// Fonction pour récupérer les infos d’un jeu vidéo via l’API RAWG.io
async function fetchGameMetadata(query) {
  try {
    const apiKey = process.env.RAWG_API_KEY;

    const response = await axios.get("https://api.rawg.io/api/games", {
      params: {
        key: apiKey,
        search: query,
      },
    });

    // Si aucun jeu trouvé
    if (!response.data.results || response.data.results.length === 0)
      return null;

    // Retourne une liste de jeux
    const games = response.data.results.map((game) => ({
      title: game.name,
      description: game.description || "",
      cover: game.background_image || "",
      releaseDate: game.released || "",
      author: game.developers ? game.developers.map((dev) => dev.name) : [],
    }));

    return games;
  } catch (error) {
    console.error("RAWG fetch error:", error.message);
    return null;
  }
}

module.exports = {
  fetchMovieMetadata,
  fetchBookMetadata,
  fetchMusicMetadata,
  fetchGameMetadata,
  fetchSerieMetaData,
};
