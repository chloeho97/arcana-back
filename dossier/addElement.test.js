const request = require("supertest");
const express = require("express");
const addElement = require("../routes/elements");

// Mock des modèles mongoose
jest.mock("../models/collections");
jest.mock("../models/elements");

// Récupération des mocks
const Collection = require("../models/collections");
const Element = require("../models/elements");

// On crée une app Express de test
const app = express();
app.use(express.json());
app.use("/elements", addElement);

// Début des tests
describe("POST /elements", () => {
  it("renvoie une erreur si un champ est manquant", async () => {
    // Cas 1 : collectionId manquant
    const responseWithoutCollectionId = await request(app)
      .post("/elements")
      .send({
        title: "Films romance des années 2000",
        description:
          "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
        status: "completed",
      });

    expect(responseWithoutCollectionId.status).toBe(400);
    expect(responseWithoutCollectionId.body.result).toBe(false);
    expect(responseWithoutCollectionId.body).toHaveProperty(
      "error",
      "Missing or empty fields"
    );

    // Cas 2 : title manquant
    const responseWithoutTitle = await request(app).post("/elements").send({
      collectionId: "123456",
      description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
      status: "completed",
    });

    expect(responseWithoutTitle.status).toBe(400);
    expect(responseWithoutTitle.body.result).toBe(false);
    expect(responseWithoutTitle.body).toHaveProperty(
      "error",
      "Missing or empty fields"
    );

    // Cas 3 : les deux champs sont manquants
    const responseWithoutBoth = await request(app).post("/elements").send({
      description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
      status: "completed",
    });

    expect(responseWithoutBoth.status).toBe(400);
    expect(responseWithoutBoth.body.result).toBe(false);
    expect(responseWithoutBoth.body).toHaveProperty(
      "error",
      "Missing or empty fields"
    );
  });

  it("renvoie une erreur en cas d'échec de la création de l'élément", async () => {
    // Simulation de l'échec de la création de l'élément
    Element.mockImplementation(() => ({
      save: jest.fn().mockRejectedValue(new Error("Server error")),
    }));

    // Simulation de l'ajout de l'élément à la collection
    Collection.findByIdAndUpdate.mockResolvedValue(true);

    const response = await request(app).post("/elements").send({
      collectionId: "123456",
      type: "book",
      title: "La Vérité sur l'Affaire Harry Quebert",
      description: "Policier incontournable",
      review: "Sortez vos mouchoirs",
      status: "completed",
    });

    expect(response.status).toBe(500);
    expect(response.body.result).toBe(false);
    expect(response.body).toHaveProperty("error", "Server error");
    expect(Collection.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it("met à jour la collection avec l'élément créé", async () => {
    const mockDate = new Date().toJSON();
    // Simulation new Element & .save
    Element.mockImplementation(() => ({
      save: jest.fn().mockResolvedValue({
        _id: "mockElementId",
        collectionId: "123456",
        type: "book",
        title: "La Vérité sur l'Affaire Harry Quebert",
        description: "Policier incontournable",
        review: "Sortez vos mouchoirs",
        status: "completed",
        author: ["Joël Dicker"],
        rating: 5,
        cover:
          "http://books.google.com/books/content?id=169VEAAAQBAJ&printsec=frontcover&img=1&zoom=1&edge=curl&source=gbs_api",
        releaseDate: "2022-03-10T00:00:00.000+00:00",
        favorite: false,
        tags: [],
        createdAt: mockDate,
        updatedAt: mockDate,
      }),
    }));

    Collection.findByIdAndUpdate.mockResolvedValue(true);

    const response = await request(app)
      .post("/elements")
      .send({
        collectionId: "123456",
        type: "book",
        title: "La Vérité sur l'Affaire Harry Quebert",
        description: "Policier incontournable",
        review: "Sortez vos mouchoirs",
        status: "completed",
        author: ["Joël Dicker"],
        rating: 5,
        cover:
          "http://books.google.com/books/content?id=169VEAAAQBAJ&printsec=frontcover&img=1&zoom=1&edge=curl&source=gbs_api",
        releaseDate: "2022-03-10T00:00:00.000+00:00",
        favorite: false,
        tags: [],
      });

    // Vérification que la mise à jour de la collection a bien été appelée
    expect(Collection.findByIdAndUpdate).toHaveBeenCalledWith("123456", {
      $push: { elements: "mockElementId" },
    });

    expect(response.status).toBe(201);
    expect(response.body.result).toBe(true);
    expect(response.body.element).toMatchObject({
      _id: "mockElementId",
      collectionId: "123456",
      type: "book",
      title: "La Vérité sur l'Affaire Harry Quebert",
      description: "Policier incontournable",
      review: "Sortez vos mouchoirs",
      status: "completed",
      author: ["Joël Dicker"],
      rating: 5,
      cover:
        "http://books.google.com/books/content?id=169VEAAAQBAJ&printsec=frontcover&img=1&zoom=1&edge=curl&source=gbs_api",
      releaseDate: "2022-03-10T00:00:00.000+00:00",
      favorite: false,
      tags: [],
      createdAt: mockDate,
      updatedAt: mockDate,
    });
  });
});
