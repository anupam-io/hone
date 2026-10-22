import express from "express";
import { notesRouter } from "./routes/notes";

export const app = express();
app.use(express.json());
app.use("/notes", notesRouter);
