import dotenv from "dotenv";
dotenv.config();

import "../models/connection.js";

import bcrypt from "bcrypt";
import { faker } from "@faker-js/faker";
import User from "../models/users.js";

console.log("Connected to database");

try {
  const users = [];

  // Créer 2 utilisateurs avec des mots de passe hashés
  for (let i = 0; i < 6; i++) {
    const email = faker.internet.email();
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      console.log(`User already exists: ${email}`);
      users.push(existingUser);
      continue;
    }

    const hash = bcrypt.hashSync("arcana", 10);

    const user = await User.create({
      username: faker.internet.userName(),
      email,
      password: hash,
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      bio: faker.lorem.sentence(),
      avatar: faker.image.avatar(),
      token: faker.string.uuid(),
    });

    users.push(user);
  }

  console.log(`${users.length} user(s) created`);
} catch (err) {
  console.error("Seeding error:", err);
}

process.exit();
