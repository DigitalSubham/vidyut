import { Router } from "express";
import swaggerUi from "swagger-ui-express";
import { generateOpenApiDocument } from "./openapi";

export const docsRouter = Router();

const document = generateOpenApiDocument();

docsRouter.get("/openapi.json", (_req, res) => {
  res.json(document);
});

docsRouter.use("/docs", swaggerUi.serve, swaggerUi.setup(document));
