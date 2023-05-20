import express from 'express'
export const drawRouter = express.Router();
import { create, launch } from "./../controllers/draw.js";

drawRouter.post("/create", create);
drawRouter.post("/launch", launch);