import { createServer } from "http";
import { staticRoutes } from "./routes/static.routes.js";

export default createServer(staticRoutes);
