const request = require("supertest");
const express = require("express");

// On importe la route à tester
const searchRouter = require("../routes/search");

// On mock les modèles Mongoose pour éviter d'appeler la vraie base de données
jest.mock("../models/collections");
jest.mock("../models/users");
jest.mock("../models/likes");

// On récupère les mocks
const Collection = require("../models/collections");
const User = require("../models/users");
const Like = require("../models/likes");

// On crée une app Express de test
const app = express();
app.use(express.json());
app.use("/search", searchRouter);

// Début des tests
describe("Route GET /search", () => {
  // Cas 1 : aucun paramètre ?q= fourni
  it("renvoie 400 si aucun query n'est fourni", async () => {
    const res = await request(app).get("/search"); // pas de ?q=
    expect(res.statusCode).toBe(400); // on attend un code 400
    expect(res.body.message).toBe("Missing query"); // et un message
  });

  // Cas 2 : un résultat de recherche normal
  it("renvoie des collections et utilisateurs si le query est fourni", async () => {
    // On prépare une fausse collection
    const fakeCollection = {
      _id: "123",
      title: "Ma collection test",
      userId: { username: "jules" },
      toObject: () => ({
        _id: "123",
        title: "Ma collection test",
        userId: { username: "jules" },
      }),
    };

    // On prépare un faux utilisateur
    const fakeUser = { username: "jules" };

    // On simule le comportement des modèles
    Collection.find.mockReturnValue({
      populate: () => ({ limit: () => Promise.resolve([fakeCollection]) }),
    });

    Like.countDocuments.mockResolvedValue(3);
    User.find.mockReturnValue({ limit: () => Promise.resolve([fakeUser]) });

    // On fait la requête avec un query valide
    const res = await request(app).get("/search?q=test");

    expect(res.statusCode).toBe(200); // doit réussir
    expect(res.body.result).toBe(true); // flag true
    expect(res.body.collections[0].likesCount).toBe(3); // nombre de likes
    expect(res.body.users[0].username).toBe("jules"); // utilisateur trouvé
  });
});
